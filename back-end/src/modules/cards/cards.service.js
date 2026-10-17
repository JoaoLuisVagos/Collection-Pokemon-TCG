const axios = require('axios');
const { env, isDatabaseConfigured } = require('../../config/env');
const { getPool } = require('../../config/db');
const { getUsdToBrlRate } = require('../prices/prices.service');

const TCGDEX_BASE_URL = 'https://api.tcgdex.net/v2/pt-br';
const POKEMON_TCG_BASE_URL = 'https://api.pokemontcg.io/v2';
const CARD_SEARCH_ALIASES = {
  tarsila: ['lacey'],
  lacey: ['tarsila'],
  'salamance ex': ['salamence ex'],
  'salamence ex': ['salamance ex'],
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

function extractQuerySetTotal(value) {
  const match = String(value || '').match(/\d{1,3}\s*\/\s*(\d{1,3})/);
  return match ? normalizeCardNumber(match[1]) : null;
}

function normalizeCardSetTotal(card) {
  return normalizeCardNumber(
    card.set?.cardCount?.total ||
      card.set?.cardCount?.official ||
      card.set?.printedTotal ||
      card.set?.total ||
      card.cardCount?.total ||
      card.cardCount?.official ||
      card.printedTotal
  );
}

function cardNameMatchesVariants(card, variants) {
  const cardName = normalizeText(card.name);

  return variants.some((variant) => {
    const words = normalizeText(variant).split(/\s+/).filter(Boolean);
    return words.length > 0 && words.every((word) => cardName.includes(word));
  });
}

function cardSetTotalMatches(card, querySetTotal) {
  if (!querySetTotal) {
    return true;
  }

  const cardSetTotal = normalizeCardSetTotal(card);
  return !cardSetTotal || cardSetTotal === querySetTotal;
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
  const querySetTotal = extractQuerySetTotal(query);
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

  if (querySetTotal && normalizeCardSetTotal(card) === querySetTotal) {
    score += 80;
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

async function fetchTcgdexSet(setId) {
  try {
    const response = await axios.get(`${TCGDEX_BASE_URL}/sets/${encodeURIComponent(setId)}`, {
      timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data || null;
  } catch (error) {
    return null;
  }
}

async function fetchMarketCards(params) {
  const cards = [];

  try {
    const pageSize = 250;
    let page = 1;

    while (page <= 20) {
      const response = await axios.get(`${POKEMON_TCG_BASE_URL}/cards`, {
        params: { ...params, page, pageSize },
        timeout: REQUEST_TIMEOUT_MS,
      });
      const pageCards = response.data?.data || [];
      cards.push(...pageCards);

      if (
        !pageCards.length ||
        pageCards.length < pageSize ||
        cards.length >= Number(response.data?.totalCount || cards.length)
      ) {
        break;
      }
      page += 1;
    }

    return cards;
  } catch (error) {
    return cards;
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
  const querySetTotal = extractQuerySetTotal(query);
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

  if (querySetTotal) {
    const setIds = new Set(
      cards
        .map((card) => String(card.id || '').split('-')[0])
        .filter(Boolean)
    );
    const sets = new Map(
      await Promise.all(
        Array.from(setIds).map(async (setId) => [setId, await fetchTcgdexSet(setId)])
      )
    );

    for (const card of cards) {
      const setId = String(card.id || '').split('-')[0];
      const set = sets.get(setId);
      if (set) {
        card.set = {
          ...(card.set || {}),
          id: set.id || setId,
          name: set.name || card.set?.name,
          cardCount: set.cardCount,
        };
      }
    }
  }

  const matches = cards.filter((card) => {
    const cardName = normalizeText(card.name);
    const cardSetName = normalizeText(card.set?.name);
    const cardNumber = normalizeCardNumber(card.localId);
    const hasNameAndNumber = Boolean(queryName && queryNumber);
    const nameMatch = cardNameMatchesVariants(card, variants);

    if (hasNameAndNumber) {
      return (
        nameMatch &&
        cardNumber === queryNumber &&
        cardSetTotalMatches(card, querySetTotal)
      );
    }

    if (queryNumber && cardNumber === queryNumber) {
      return cardSetTotalMatches(card, querySetTotal);
    }

    return variants.some((variant) => {
      const normalizedVariant = normalizeText(variant);
      const variantNumber = normalizeCardNumber(variant);

      return (
        cardNameMatchesVariants(card, [variant]) ||
        cardSetName.includes(normalizedVariant) ||
        cardNumber === variantNumber ||
        cardNumber.includes(variantNumber)
      );
    });
  });

  if (matches.length) {
    return matches;
  }

  if (queryNumber && !queryName && !querySetTotal) {
    return cards.filter((card) => normalizeCardNumber(card.localId) === queryNumber);
  }

  return [];
}

async function searchCardInMarket(query) {
  const cards = [];
  const cardsById = new Map();
  const variants = getSearchVariants(query);
  const queryNumber = extractQueryNumber(query);
  const querySetTotal = extractQuerySetTotal(query);
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
    return cards.filter((card) => {
      const cardName = normalizeText(card.name);
      const cardNumber = normalizeCardNumber(card.number || card.localId);
      return (
        cardNameMatchesVariants(card, variants) &&
        cardNumber === queryNumber &&
        cardSetTotalMatches(card, querySetTotal)
      );
    });
  }

  if (queryNumber && querySetTotal) {
    return cards.filter((card) => {
      return (
        normalizeCardNumber(card.number || card.localId) === queryNumber &&
        cardSetTotalMatches(card, querySetTotal)
      );
    });
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
  const cardNumber = normalizeCardNumber(card.localId || card.number);
  const exactQuery = `name:"${escapeMarketQueryValue(card.name)}" number:${cardNumber}`;
  const exactResponse = await fetchMarketCards({ q: exactQuery });
  const exactMatch = exactResponse.find(
    (item) =>
      normalizeText(item.name) === normalizeText(card.name) &&
      normalizeCardNumber(item.number || item.localId) === cardNumber
  );
  if (exactMatch) {
    return exactMatch;
  }

  const fallbackResponse = await fetchMarketCards({
    q: `name:"${escapeMarketQueryValue(card.name)}"`,
  });
  return (
    fallbackResponse.find(
      (item) =>
        normalizeText(item.name) === normalizeText(card.name) &&
        normalizeCardNumber(item.number || item.localId) === cardNumber
    ) || null
  );
}

function getMarketPriceUsd(marketCard, cardDetails) {
  const tcgplayerPrices = marketCard?.tcgplayer?.prices || {};
  const holofoil = tcgplayerPrices.holofoil || {};
  const normal = tcgplayerPrices.normal || {};
  const tcgdexPricing = cardDetails?.pricing || {};
  const tcgdexTcgplayer = tcgdexPricing.tcgplayer || {};
  const tcgdexCardmarket = tcgdexPricing.cardmarket || {};

  return (
    holofoil.market ||
    holofoil.marketPrice ||
    normal.market ||
    normal.marketPrice ||
    holofoil.mid ||
    holofoil.midPrice ||
    normal.mid ||
    normal.midPrice ||
    marketCard?.cardmarket?.prices?.trendPrice ||
    marketCard?.cardmarket?.prices?.averageSellPrice ||
    tcgdexTcgplayer.marketPrice ||
    tcgdexTcgplayer.market ||
    tcgdexTcgplayer.holofoil?.marketPrice ||
    tcgdexTcgplayer.normal?.marketPrice ||
    tcgdexTcgplayer.prices?.holofoil?.marketPrice ||
    tcgdexTcgplayer.prices?.normal?.marketPrice ||
    tcgdexTcgplayer.prices?.holofoil?.market ||
    tcgdexTcgplayer.prices?.normal?.market ||
    tcgdexCardmarket.trendPrice ||
    tcgdexCardmarket.averageSellPrice ||
    tcgdexCardmarket.trend ||
    tcgdexCardmarket.avg ||
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

  return orderedCards;
}

async function getMarketCardById(cardId) {
  try {
    const response = await axios.get(`${POKEMON_TCG_BASE_URL}/cards/${encodeURIComponent(cardId)}`, {
      timeout: REQUEST_TIMEOUT_MS,
    });
    return response.data?.data || null;
  } catch (error) {
    console.warn(`Preco de mercado indisponivel para ${cardId}: ${error.message}`);
    return null;
  }
}

function normalizeMarketCard(card, fallbackCard = null) {
  if (!card) {
    if (!fallbackCard?.name) {
      return null;
    }

    return {
      id: fallbackCard.id,
      name: fallbackCard.name,
      localId: fallbackCard.number || null,
      set: fallbackCard.setName ? { name: fallbackCard.setName } : null,
      image: fallbackCard.image || null,
      source: 'market',
    };
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
    cardDetails = normalizeMarketCard(marketCard, options.fallbackCard);
    if (!cardDetails || !getMarketPriceUsd(marketCard, cardDetails)) {
      try {
        const tcgdexDetails = await getCardDetailsInTcgdex(cardId);
        cardDetails = tcgdexDetails;
      } catch (error) {
        console.warn(`Detalhes TCGdex indisponiveis para ${cardId}: ${error.message}`);
      }
    }
  } else {
    try {
      cardDetails = await getCardDetailsInTcgdex(cardId);
      try {
        marketCard = await getMarketCard(cardDetails);
      } catch (error) {
        console.warn(`Preco de mercado indisponivel para ${cardId}: ${error.message}`);
        marketCard = null;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        console.warn(`Nao encontrado na TCGdex, tentando fonte de mercado: ${cardId}`);
        source = 'market';
        marketCard = await getMarketCardById(cardId);
        cardDetails = normalizeMarketCard(marketCard, options.fallbackCard);
      } else if (options.fallbackCard?.name) {
        console.warn(`Detalhes indisponiveis para ${cardId}; usando dados da busca.`);
        cardDetails = normalizeMarketCard(null, options.fallbackCard);
        try {
          marketCard = await getMarketCard(cardDetails);
        } catch (marketError) {
          console.warn(`Preco de mercado indisponivel para ${cardId}: ${marketError.message}`);
          marketCard = null;
        }
      } else {
        throw error;
      }
    }
  }

  const priceUsd = getMarketPriceUsd(marketCard, cardDetails);
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

  if (priceUsd) {
    try {
      usdToBrlRate = await getUsdToBrlRate();
      priceBrl = Number((priceUsd * usdToBrlRate).toFixed(2));
      estimatedPriceBrl = calculateEstimatedPrice(priceUsd, usdToBrlRate, discountPercent);
      pricingMessage = 'Preco de mercado localizado.';
    } catch (error) {
      pricingMessage = 'Preco USD localizado, mas a cotacao BRL esta indisponivel.';
      console.warn(`Cotacao USD/BRL indisponivel: ${error.message}`);
    }
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
      pricingAvailable: Boolean(priceUsd),
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

async function saveCardToDatabase(card, pricing = {}, options = {}) {
  if (!isDatabaseConfigured()) {
    const error = new Error('Banco de dados nao configurado.');
    error.statusCode = 503;
    throw error;
  }

  const effectiveBrlPrice = Number.isFinite(Number(pricing.estimatedPriceBrl))
    ? Number(pricing.estimatedPriceBrl)
    : Number.isFinite(Number(pricing.priceBrl))
      ? Number(pricing.priceBrl)
      : null;
  const imageUrl = pricing.imageUrl || card.image || null;

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
        image_card = COALESCE(VALUES(image_card), image_card),
        amount__price_card = COALESCE(VALUES(amount__price_card), amount__price_card),
        price_usd_card = COALESCE(VALUES(price_usd_card), price_usd_card),
        price_brl_card = COALESCE(VALUES(price_brl_card), price_brl_card),
        discount_percent_card = COALESCE(VALUES(discount_percent_card), discount_percent_card)`,
      [
        options.databaseId || card.id,
        card.name || null,
        card.set?.name || null,
        card.rarity || null,
        imageUrl,
        effectiveBrlPrice,
        pricing.sourceUsdPrice ?? null,
        effectiveBrlPrice,
        pricing.discountPercent ?? null,
      ]
    );

    const [rows] = await connection.execute('SELECT * FROM cards WHERE tcgdex_id = ?', [
      options.databaseId || card.id,
    ]);

    return {
      operation: result.affectedRows > 0 ? 'saved' : 'updated',
      card: rows[0] || null,
    };
  } finally {
    connection.release();
  }
}

function getLikelyCurrentCardIds(cardId) {
  const match = String(cardId || '').match(/^([a-z]+)(\d+)(.*)-(.+)$/i);
  if (!match || match[2].length >= 2) {
    return [cardId];
  }

  return [cardId, `${match[1]}${match[2].padStart(2, '0')}${match[3]}-${match[4]}`];
}

async function findCardForPriceUpdate(card) {
  for (const candidateId of getLikelyCurrentCardIds(card.tcgdex_id)) {
    try {
      const details = await getCardDetailsInTcgdex(candidateId);
      if (details) {
        return details;
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.warn(`Falha ao consultar ${candidateId}: ${error.message}`);
      }
    }
  }

  if (!card.name_card) {
    return null;
  }

  try {
    const response = await axios.get(`${TCGDEX_BASE_URL.replace('/pt-br', '/en')}/cards`, {
      params: { name: card.name_card },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const candidates = Array.isArray(response.data) ? response.data : response.data?.cards || [];
    return (
      candidates.find(
        (candidate) =>
          normalizeText(candidate.name) === normalizeText(card.name_card) &&
          (!card.tcgdex_id.includes('-') ||
            normalizeCardNumber(candidate.localId) === normalizeCardNumber(card.tcgdex_id.split('-').pop()))
      ) || null
    );
  } catch (error) {
    console.warn(`Falha ao buscar ${card.name_card}: ${error.message}`);
    return null;
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
        const sourceCard = await findCardForPriceUpdate(card);
        if (!sourceCard) {
          throw new Error('Carta nao encontrada por ID ou nome.');
        }

        const estimate = await buildCardEstimateById(sourceCard.id, { source: 'tcgdex' });
        await saveCardToDatabase(estimate.card, estimate.pricing, {
          databaseId: card.tcgdex_id,
        });
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