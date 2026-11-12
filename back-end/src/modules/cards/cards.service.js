const axios = require('axios');
const { env, isDatabaseConfigured } = require('../../config/env');
const { getPool } = require('../../config/db');
const { getUsdToBrlRate } = require('../prices/prices.service');

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/pt-br';
const POKEMON_TCG_BASE_URL = 'https://api.pokemontcg.io/v2';

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function pickPortugueseCard(cards, name) {
  const normalizedName = normalizeText(name);
  const exactMatch = cards.find((card) => normalizeText(card.name) === normalizedName);

  return exactMatch || cards[0] || null;
}

async function searchCardInTcgdex(name) {
  const response = await axios.get(`${TCGDEX_BASE_URL}/cards`, {
    params: { name },
  });

  return response.data;
}

async function getCardDetailsInTcgdex(cardId) {
  const response = await axios.get(`${TCGDEX_BASE_URL}/cards/${encodeURIComponent(cardId)}`);
  return response.data;
}

async function getMarketCard(card) {
  const exactQuery = `name:${card.name} set.id:${card.set?.id} number:${card.localId}`;
  const fallbackQuery = `name:${card.name}`;

  const exactResponse = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
    params: { q: exactQuery },
  });

  const exactMatch = exactResponse.data?.data?.find((item) => normalizeText(item.name) === normalizeText(card.name));
  if (exactMatch) {
    return exactMatch;
  }

  const fallbackResponse = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
    params: { q: fallbackQuery },
  });

  return fallbackResponse.data?.data?.find((item) => normalizeText(item.name) === normalizeText(card.name)) || null;
}

function getMarketPriceUsd(marketCard) {
  const tcgplayerPrices = marketCard?.tcgplayer?.prices || {};
  const holofoil = tcgplayerPrices.holofoil || {};
  const normal = tcgplayerPrices.normal || {};

  return (
    holofoil.market ||
    normal.market ||
    holofoil.mid ||
    normal.mid ||
    marketCard?.cardmarket?.prices?.trendPrice ||
    marketCard?.cardmarket?.prices?.averageSellPrice ||
    null
  );
}

function getCardImageUrl(cardDetails, marketCard) {
  return (
    marketCard?.images?.large ||
    marketCard?.images?.small ||
    cardDetails?.image ||
    null
  );
}

function getCardImageMeta(cardDetails, marketCard, imageUrl) {
  const isEnglishFallback = Boolean(imageUrl && imageUrl.startsWith('https://images.pokemontcg.io/'));

  return {
    imageUrl,
    imageLanguage: isEnglishFallback ? 'en' : 'pt-BR',
    imageFallbackUsed: isEnglishFallback,
    imageLanguageLabel: isEnglishFallback ? 'ingles' : 'portugues',
    imageMessage: isEnglishFallback
      ? 'Imagem sem versao em portugues disponivel; usando fallback em ingles.'
      : 'Imagem em portugues disponivel.',
  };
}

function calculateEstimatedPrice(priceUsd, usdToBrlRate, discountPercent) {
  const convertedToBrl = priceUsd * usdToBrlRate;
  const discounted = convertedToBrl * (1 - discountPercent / 100);

  return Number(discounted.toFixed(2));
}

async function buildCardEstimate(name, options = {}) {
  const discountPercent = Number.isFinite(Number(options.discountPercent))
    ? Number(options.discountPercent)
    : env.languageDiscountPercent;

  const cardCandidates = await searchCardInTcgdex(name);
  const orderedCandidates = [];
  const selectedCard = pickPortugueseCard(cardCandidates, name);

  if (selectedCard) {
    orderedCandidates.push(selectedCard);
  }

  for (const candidate of cardCandidates) {
    if (!orderedCandidates.find((card) => card.id === candidate.id)) {
      orderedCandidates.push(candidate);
    }
  }

  let cardDetails = null;
  let marketCard = null;
  let priceUsd = null;

  for (const candidate of orderedCandidates) {
    const candidateDetails = await getCardDetailsInTcgdex(candidate.id);
    const candidateMarketCard = await getMarketCard(candidateDetails);
    const candidatePriceUsd = getMarketPriceUsd(candidateMarketCard);

    if (candidatePriceUsd) {
      cardDetails = candidateDetails;
      marketCard = candidateMarketCard;
      priceUsd = candidatePriceUsd;
      break;
    }
  }

  if (!cardDetails || !marketCard || !priceUsd) {
    const error = new Error('Nao foi possivel localizar um preco de mercado para esta carta.');
    error.statusCode = 404;
    throw error;
  }

  const usdToBrlRate = await getUsdToBrlRate();
  const imageUrl = getCardImageUrl(cardDetails, marketCard);
  const imageMeta = getCardImageMeta(cardDetails, marketCard, imageUrl);

  const priceBrl = Number((priceUsd * usdToBrlRate).toFixed(2));
  const estimatedPriceBrl = calculateEstimatedPrice(priceUsd, usdToBrlRate, discountPercent);

  return {
    card: {
      ...cardDetails,
      image: imageUrl,
    },
    pricing: {
      sourceUsdPrice: Number(priceUsd.toFixed(2)),
      usdToBrlRate: Number(usdToBrlRate.toFixed(4)),
      priceBrl,
      discountPercent,
      estimatedPriceBrl,
      ...imageMeta,
    },
  };
}

async function saveCardToDatabase(card, pricing) {
  if (!isDatabaseConfigured()) {
    const error = new Error('Banco de dados nao configurado.');
    error.statusCode = 503;
    throw error;
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    const [result] = await connection.execute(
      `INSERT INTO cards (
        tcgdex_id,
        name_card,
        set_name_card,
        rarity_card,
        image_card,
        amount__price_card,
        price_usd_card,
        price_brl_card,
        discount_percent_card
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name_card = VALUES(name_card),
        set_name_card = VALUES(set_name_card),
        rarity_card = VALUES(rarity_card),
        image_card = VALUES(image_card),
        amount__price_card = VALUES(amount__price_card),
        price_usd_card = VALUES(price_usd_card),
        price_brl_card = VALUES(price_brl_card),
        discount_percent_card = VALUES(discount_percent_card)`,
      [
        card.id,
        card.name || null,
        card.set?.name || null,
        card.rarity || null,
        pricing.imageUrl || card.image || null,
        pricing.estimatedPriceBrl,
        pricing.sourceUsdPrice,
        pricing.priceBrl,
        pricing.discountPercent,
      ]
    );

    const [rows] = await connection.execute('SELECT * FROM cards WHERE tcgdex_id = ?', [card.id]);

    return {
      operation: result.affectedRows > 0 ? 'saved' : 'updated',
      card: rows[0] || null,
    };
  } finally {
    connection.release();
  }
}

module.exports = {
  buildCardEstimate,
  saveCardToDatabase,
};