const axios = require('axios');
const { env, isDatabaseConfigured } = require('../../config/env');
const { getPool } = require('../../config/db');
const { getUsdToBrlRate } = require('../prices/prices.service');

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/pt-br';
const POKEMON_TCG_BASE_URL = 'https://api.pokemontcg.io/v2';
const TCGDEX_CACHE_TTL_MS = 15 * 60 * 1000;
const CARD_SEARCH_ALIASES = {
  tarsila: ['lacey'],
  lacey: ['tarsila'],
};

let tcgdexCardsCache = null;
let tcgdexCardsCacheFetchedAt = 0;

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeCardNumber(value) {
  return String(value || '').trim().replace(/^0+/, '');
}

function formatCardNumber(value) {
  const normalized = normalizeCardNumber(value);
  return normalized ? normalized.padStart(3, '0') : '';
}

function extractQueryNumber(value) {
  const match = String(value || '').match(/\d{1,3}(?:\/\d{1,3})?/);
  if (!match) {
    return null;
  }

  return normalizeCardNumber(match[0].split('/')[0]);
}

function getSearchVariants(query) {
  const normalizedQuery = normalizeText(query);
  const variants = new Set([normalizedQuery]);

  for (const alias of CARD_SEARCH_ALIASES[normalizedQuery] || []) {
    variants.add(normalizeText(alias));
  }

  return Array.from(variants).filter(Boolean);
}

async function getAllTcgdexCards() {
  const cacheIsFresh = tcgdexCardsCache && (Date.now() - tcgdexCardsCacheFetchedAt) < TCGDEX_CACHE_TTL_MS;

  if (cacheIsFresh) {
    return tcgdexCardsCache;
  }

  const response = await axios.get(`${TCGDEX_BASE_URL}/cards`);
  const cards = Array.isArray(response.data) ? response.data : response.data?.cards || [];

  tcgdexCardsCache = cards;
  tcgdexCardsCacheFetchedAt = Date.now();

  return cards;
}

function mapSuggestionCard(card) {
  return {
    id: card.id,
    name: card.name || null,
    localId: formatCardNumber(card.localId || null),
    set: card.set
      ? {
          id: card.set.id || null,
          name: card.set.name || null,
        }
      : null,
    rarity: card.rarity || null,
    image: card.image || card.images?.small || card.images?.large || null,
    number: formatCardNumber(card.localId || null),
    source: 'tcgdex',
  };
}

function mapMarketSuggestionCard(card) {
  return {
    id: card.id,
    name: card.name || null,
    localId: card.number ? formatCardNumber(card.number) : formatCardNumber(card.localId || null),
    set: card.set
      ? {
          id: card.set.id || null,
          name: card.set.name || null,
        }
      : null,
    rarity: card.rarity || null,
    image: card.images?.large || card.images?.small || null,
    number: card.number ? formatCardNumber(card.number) : formatCardNumber(card.localId || null),
    source: 'market',
  };
}

function calculateEstimatedPrice(priceUsd, usdToBrlRate, discountPercent) {
  const convertedToBrl = priceUsd * usdToBrlRate;
  const discounted = convertedToBrl * (1 - discountPercent / 100);

  return Number(discounted.toFixed(2));
}
function pickPortugueseCard(cards, query) {
  const normalizedName = normalizeText(query);
  const queryNumber = extractQueryNumber(query);

  const exactNameMatch = cards.find((card) => normalizeText(card.name) === normalizedName);
  if (exactNameMatch) {
    return exactNameMatch;
  }

  if (queryNumber) {
    const numberMatch = cards.find((card) => normalizeCardNumber(card.localId) === queryNumber);
    if (numberMatch) {
      return numberMatch;
    }
  }

  return cards[0] || null;
}

async function searchCardInTcgdex(query) {
  const queryNumber = extractQueryNumber(query);
  const variants = getSearchVariants(query);
  const cards = await getAllTcgdexCards();

  const matches = cards.filter((card) => {
    const cardName = normalizeText(card.name);
    const cardSetName = normalizeText(card.set?.name);
    const cardNumber = normalizeCardNumber(card.localId);

    if (queryNumber && cardNumber === queryNumber) {
      return true;
    }

    return variants.some((variant) => {
      const normalizedVariant = normalizeText(variant);
      const variantNumber = normalizeCardNumber(variant);

      return (
        cardName === normalizedVariant ||
        cardName.includes(normalizedVariant) ||
        cardSetName.includes(normalizedVariant) ||
        cardNumber === variantNumber ||
        cardNumber.includes(variantNumber)
      );
    });
  });

  if (matches.length) {
    return matches;
  }

  if (queryNumber) {
    return cards.filter((card) => normalizeCardNumber(card.localId) === queryNumber);
  }

  const normalizedQuery = normalizeText(query);
  if (normalizedQuery) {
    return cards.filter((card) => normalizeText(card.name).includes(normalizedQuery));
  }

  return [];
}

async function searchCardInMarket(query) {
  const cards = [];
  const cardsById = new Map();
  const variants = getSearchVariants(query);
  const queryNumber = extractQueryNumber(query);

  for (const variant of variants) {
    try {
      const response = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
        params: { q: `name:${variant}` },
      });
      const resultCards = response.data?.data || [];

      for (const card of resultCards) {
        if (card?.id && !cardsById.has(card.id)) {
          cardsById.set(card.id, card);
        }
      }
    } catch (error) {
      // Ignora a variante que falhou e segue para a próxima.
    }
  }

  if (queryNumber) {
    try {
      const response = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
        params: { q: `number:${queryNumber}` },
      });
      const resultCards = response.data?.data || [];

      for (const card of resultCards) {
        if (card?.id && !cardsById.has(card.id)) {
          cardsById.set(card.id, card);
        }
      }
    } catch (error) {
      // Ignora a busca por número quando a API falhar.
    }
  }

  for (const card of cardsById.values()) {
    cards.push(card);
  }

  return cards;
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

function calculateEstimatedPrice(priceUsd, usdToBrlRate, discountPercent) {
  const convertedToBrl = priceUsd * usdToBrlRate;
  const discounted = convertedToBrl * (1 - discountPercent / 100);

  return Number(discounted.toFixed(2));
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

async function searchCardSuggestions(query) {
  const tcgdexCards = await searchCardInTcgdex(query);
  const marketCards = await searchCardInMarket(query);
  const orderedCards = [];
  const selectedCard = pickPortugueseCard(tcgdexCards, query) || tcgdexCards[0] || null;

  if (selectedCard) {
    orderedCards.push(mapSuggestionCard(selectedCard));
  }

  for (const candidate of tcgdexCards) {
    const mapped = mapSuggestionCard(candidate);
    if (!orderedCards.find((card) => card.source === mapped.source && card.id === mapped.id)) {
      orderedCards.push(mapped);
    }
  }

  for (const candidate of marketCards) {
    const mapped = mapMarketSuggestionCard(candidate);
    if (!orderedCards.find((card) => card.source === mapped.source && card.id === mapped.id)) {
      orderedCards.push(mapped);
    }
  }

  return orderedCards.slice(0, 12);
}

async function getMarketCardById(cardId) {
  const response = await axios.get(`${POKEMON_TCG_BASE_URL}/cards/${encodeURIComponent(cardId)}`);
  return response.data;
}

function normalizeMarketCard(card) {
  if (!card) {
    return null;
  }

  return {
    id: card.id,
    name: card.name || null,
    localId: card.number || null,
    set: card.set
      ? {
          id: card.set.id || null,
          name: card.set.name || null,
        }
      : null,
    rarity: card.rarity || null,
    image: card.images?.large || card.images?.small || null,
    source: 'market',
  };
}

async function buildCardEstimateById(cardId, options = {}) {
  const discountPercent = Number.isFinite(Number(options.discountPercent))
    ? Number(options.discountPercent)
    : env.languageDiscountPercent;
  const source = options.source || 'tcgdex';

  let cardDetails;
  let marketCard;

  if (source === 'market') {
    marketCard = await getMarketCardById(cardId);
    cardDetails = normalizeMarketCard(marketCard);
  } else {
    cardDetails = await getCardDetailsInTcgdex(cardId);
    marketCard = await getMarketCard(cardDetails);
  }

  const priceUsd = getMarketPriceUsd(marketCard);

  const imageUrl = getCardImageUrl(cardDetails, marketCard);
  const imageMeta = getCardImageMeta(cardDetails, marketCard, imageUrl);

  if (!cardDetails) {
    const error = new Error('Nao foi possivel localizar os dados desta carta.');
    error.statusCode = 404;
    throw error;
  }

  let usdToBrlRate = null;
  let priceBrl = null;
  let estimatedPriceBrl = null;
  let pricingMessage = 'Preco indisponivel para esta carta.';

  if (marketCard && priceUsd) {
    usdToBrlRate = await getUsdToBrlRate();
    priceBrl = Number((priceUsd * usdToBrlRate).toFixed(2));
    estimatedPriceBrl = calculateEstimatedPrice(priceUsd, usdToBrlRate, discountPercent);
    pricingMessage = 'Preco de mercado localizado.';
  }

  return {
    card: {
      ...cardDetails,
      image: imageUrl,
      source,
    },
    pricing: {
      sourceUsdPrice: priceUsd ? Number(priceUsd.toFixed(2)) : null,
      usdToBrlRate: usdToBrlRate ? Number(usdToBrlRate.toFixed(4)) : null,
      priceBrl,
      discountPercent,
      estimatedPriceBrl,
      pricingAvailable: Boolean(marketCard && priceUsd),
      pricingMessage,
      ...imageMeta,
    },
  };
}

async function buildCardEstimate(query, options = {}) {
  const suggestions = await searchCardSuggestions(query);

  if (!suggestions.length) {
    const error = new Error('Nenhuma carta encontrada para esta busca.');
    error.statusCode = 404;
    throw error;
  }

  return buildCardEstimateById(suggestions[0].id, {
    ...options,
    source: suggestions[0].source,
  });
}

async function saveCardToDatabase(card, pricing = {}) {
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
        pricing.estimatedPriceBrl ?? null,
        pricing.sourceUsdPrice ?? null,
        pricing.priceBrl ?? null,
        pricing.discountPercent ?? null,
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
  buildCardEstimateById,
  buildCardEstimate,
  searchCardSuggestions,
  saveCardToDatabase,
};