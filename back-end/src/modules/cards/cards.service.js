const axios = require('axios');
const { env, isDatabaseConfigured } = require('../../config/env');
const { getPool } = require('../../config/db');
const { getUsdToBrlRate } = require('../prices/prices.service');

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/pt-br';
const POKEMON_TCG_BASE_URL = 'https://api.pokemontcg.io/v2';
const CARD_SEARCH_ALIASES = {
  tarsila: ['lacey'],
  lacey: ['tarsila'],
};
const REQUEST_TIMEOUT_MS = 8000;

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

function extractQueryName(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/\d{1,3}\s*\/\s*\d{1,3}/g, ' ')
    .replace(/\d+/g, ' ')
    .replace(/[()\[\]{}\-_/.,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeMarketQueryValue(value) {
  return String(value || '').replace(/"/g, '\\"');
}

function getSearchVariants(query) {
  const normalizedQuery = normalizeText(query);
  const queryName = extractQueryName(query);
  const variants = new Set();

  if (queryName) {
    variants.add(queryName);
  }

  if (normalizedQuery && normalizedQuery === queryName) {
    variants.add(normalizedQuery);
  }

  if (!variants.size && normalizedQuery) {
    variants.add(normalizedQuery);
  }

  for (const variant of Array.from(variants)) {
    for (const alias of CARD_SEARCH_ALIASES[variant] || []) {
      variants.add(normalizeText(alias));
    }
  }

  return Array.from(variants).filter(Boolean);
}

function getCardRelevanceScore(card, query) {
  const queryNumber = extractQueryNumber(query);
  const queryName = extractQueryName(query);
  const variants = getSearchVariants(query);
  const cardName = normalizeText(card.name);
  const cardSetName = normalizeText(card.set?.name);
  const cardNumber = normalizeCardNumber(card.localId || card.number);
  const hasNameAndNumber = Boolean(queryName && queryNumber);

  let score = 0;

  if (queryName) {
    if (cardName === queryName) {
      score += 150;
    } else if (cardName.includes(queryName)) {
      score += 110;
    }
  }

  if (queryNumber && cardNumber === queryNumber) {
    score += 100;
  }

  if (hasNameAndNumber && cardName.includes(queryName) && cardNumber === queryNumber) {
    score += 240;
  }

  for (const variant of variants) {
    const normalizedVariant = normalizeText(variant);
    if (!normalizedVariant) {
      continue;
    }

    if (cardName.includes(normalizedVariant)) {
      score += 35;
    }

    if (cardSetName.includes(normalizedVariant)) {
      score += 10;
    }
  }

  if (card.source === 'tcgdex') {
    score += 5;
  }

  return score;
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

async function fetchTcgdexCards(params) {
  try {
    const response = await axios.get(`${TCGDEX_BASE_URL}/cards`, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
    });

    return Array.isArray(response.data) ? response.data : response.data?.cards || [];
  } catch (error) {
    return [];
  }
}

async function fetchMarketCards(params) {
  try {
    const response = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
      params,
      timeout: REQUEST_TIMEOUT_MS,
    });

    return response.data?.data || [];
  } catch (error) {
    return [];
  }
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
  const queryName = extractQueryName(query);
  const variants = getSearchVariants(query);
  const cardsById = new Map();

  const requests = variants.map((variant) => fetchTcgdexCards({ name: variant }));

  if (queryNumber) {
    requests.push(fetchTcgdexCards({ localId: formatCardNumber(queryNumber) }));
  }

  const responses = await Promise.all(requests);

  for (const cards of responses) {
    for (const card of cards) {
      if (card?.id && !cardsById.has(card.id)) {
        cardsById.set(card.id, card);
      }
    }
  }

  const cards = Array.from(cardsById.values());

  if (!cards.length) {
    return [];
  }

  const matches = cards.filter((card) => {
    const cardName = normalizeText(card.name);
    const cardSetName = normalizeText(card.set?.name);
    const cardNumber = normalizeCardNumber(card.localId);
    const hasNameAndNumber = Boolean(queryName && queryNumber);
    const nameMatch = queryName
      ? cardName === queryName || cardName.includes(queryName)
      : variants.some((variant) => {
          const normalizedVariant = normalizeText(variant);
          return normalizedVariant && (cardName === normalizedVariant || cardName.includes(normalizedVariant));
        });

    if (hasNameAndNumber) {
      return nameMatch && cardNumber === queryNumber;
    }

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
  const queryName = extractQueryName(query);

  if (queryName && queryNumber) {
    const combinedQuery = `name:"${escapeMarketQueryValue(queryName)}" number:${queryNumber}`;
    const resultCards = await fetchMarketCards({ q: combinedQuery });

    for (const card of resultCards) {
      if (card?.id && !cardsById.has(card.id)) {
        cardsById.set(card.id, card);
      }
    }
  }

  for (const variant of variants) {
    const resultCards = await fetchMarketCards({ q: `name:"${escapeMarketQueryValue(variant)}"` });

    for (const card of resultCards) {
      if (card?.id && !cardsById.has(card.id)) {
        cardsById.set(card.id, card);
      }
    }
  }

  if (queryNumber) {
    const resultCards = await fetchMarketCards({ q: `number:${queryNumber}` });

    for (const card of resultCards) {
      if (card?.id && !cardsById.has(card.id)) {
        cardsById.set(card.id, card);
      }
    }
  }

  for (const card of cardsById.values()) {
    cards.push(card);
  }

  if (!cards.length) {
    return cards;
  }

  const hasNameAndNumber = Boolean(queryName && queryNumber);

  if (hasNameAndNumber) {
    const strictMatches = cards.filter((card) => {
      const cardName = normalizeText(card.name);
      const cardNumber = normalizeCardNumber(card.number || card.localId);
      return cardName.includes(queryName) && cardNumber === queryNumber;
    });

    if (strictMatches.length) {
      return strictMatches;
    }
  }

  return cards;
}

async function getCardDetailsInTcgdex(cardId) {
  try {
    const response = await axios.get(`${TCGDEX_BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
      timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(`Carta ${cardId} nao encontrada em pt-br, tentando en...`);
      const fallbackUrl = TCGDEX_BASE_URL.replace('/pt-br', '/en');
      const response = await axios.get(`${fallbackUrl}/cards/${encodeURIComponent(cardId)}`, {
        timeout: REQUEST_TIMEOUT_MS,
      });
      return response.data;
    }
    throw error;
  }
}

async function getMarketCard(card) {
  const exactQuery = `name:${card.name} set.id:${card.set?.id} number:${card.localId}`;
  const fallbackQuery = `name:${card.name}`;

  const exactResponse = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
    params: { q: exactQuery },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const exactMatch = exactResponse.data?.data?.find((item) => normalizeText(item.name) === normalizeText(card.name));
  if (exactMatch) {
    return exactMatch;
  }

  const fallbackResponse = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
    params: { q: fallbackQuery },
    timeout: REQUEST_TIMEOUT_MS,
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

  orderedCards.sort((a, b) => {
    const scoreA = getCardRelevanceScore(a, query);
    const scoreB = getCardRelevanceScore(b, query);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return normalizeText(a.name).localeCompare(normalizeText(b.name));
  });

  return orderedCards.slice(0, 12);
}

async function getMarketCardById(cardId) {
  const response = await axios.get(`${POKEMON_TCG_BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
    timeout: REQUEST_TIMEOUT_MS,
  });
  return response.data?.data || null;
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
  let source = options.source || 'tcgdex';

  let cardDetails;
  let marketCard;

  if (source === 'market') {
    marketCard = await getMarketCardById(cardId);
    cardDetails = normalizeMarketCard(marketCard);
  } else {
    try {
      cardDetails = await getCardDetailsInTcgdex(cardId);
      marketCard = await getMarketCard(cardDetails);
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`Nao encontrado na TCGdex, tentando fonte de mercado: ${cardId}`);
        source = 'market';
        marketCard = await getMarketCardById(cardId);
        cardDetails = normalizeMarketCard(marketCard);
      } else {
        throw error;
      }
    }
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

  const effectiveBrlPrice = pricing.estimatedPriceBrl ?? pricing.priceBrl ?? null;

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
        effectiveBrlPrice,
        pricing.sourceUsdPrice ?? null,
        effectiveBrlPrice,
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

async function updateCardPrices() {
  const pool = getPool();
  const connection = await pool.getConnection();
  const notFound = [];
  const updated = [];

  try {
    const [cards] = await connection.execute('SELECT * FROM cards');

    for (const card of cards) {
      try {
        let estimate;
        try {
          estimate = await buildCardEstimateById(card.tcgdex_id);
        } catch (error) {
          if (error.response?.status === 404 || error.statusCode === 404) {
            console.warn(`Nao encontrado na TCGdex, tentando fonte de mercado: ${card.tcgdex_id}`);
            estimate = await buildCardEstimateById(card.tcgdex_id, { source: 'market' });
          } else {
            throw error;
          }
        }

        await saveCardToDatabase(estimate.card, estimate.pricing);
        updated.push(card.tcgdex_id);
        console.log(`✔ Atualizado: ${card.name_card} (${card.tcgdex_id})`);
      } catch (error) {
        notFound.push(card.tcgdex_id);
        console.error(`✖ Nao encontrado em nenhuma fonte: ${card.name_card} (${card.tcgdex_id})`);
      }
    }
  } finally {
    connection.release();
    console.log(`\nResumo: ${updated.length} atualizadas, ${notFound.length} nao encontradas`);
    if (notFound.length) console.log('IDs nao encontrados:', notFound.join(', '));
  }
}

module.exports = {
  buildCardEstimateById,
  buildCardEstimate,
  searchCardSuggestions,
  saveCardToDatabase,
  updateCardPrices,
};