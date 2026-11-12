const { getPool } = require('../../config/db');
const { isDatabaseConfigured } = require('../../config/env');
const { getCardData } = require('./ligaPokemon.service');

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function normalizeCardName(name) {
  return String(name).trim().toLowerCase();
}

function assertDatabaseReady() {
  if (!isDatabaseConfigured()) {
    const error = new Error('Banco de dados nao configurado.');
    error.statusCode = 503;
    throw error;
  }
}

function isStale(updatedAt) {
  return !updatedAt || Date.now() - new Date(updatedAt).getTime() > CACHE_MAX_AGE_MS;
}

function mapPriceRow(row) {
  return {
    code: row.edition_code,
    price: {
      min: Number(row.price_min || 0),
      avg: Number(row.price_avg || 0),
      max: Number(row.price_max || 0),
    },
    updatedAt: new Date(row.updated_at).toISOString(),
    imageUrl: row.image_url || null,
  };
}

async function findCachedPrices(cardName, edition) {
  const pool = getPool();
  const query = edition
    ? 'SELECT edition_code, price_min, price_avg, price_max, updated_at, image_url FROM card_prices WHERE card_name = ? AND edition_code = ?'
    : 'SELECT edition_code, price_min, price_avg, price_max, updated_at, image_url FROM card_prices WHERE card_name = ?';
  const params = edition ? [cardName, edition.toUpperCase()] : [cardName];
  const [rows] = await pool.execute(query, params);

  return rows;
}

async function savePrices(cardName, prices, imageUrl) {
  const pool = getPool();

  for (const [editionCode, price] of Object.entries(prices)) {
    await pool.execute(
      `INSERT INTO card_prices (
        card_name, edition_code, price_min, price_avg, price_max, image_url
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        price_min = VALUES(price_min),
        price_avg = VALUES(price_avg),
        price_max = VALUES(price_max),
        updated_at = CURRENT_TIMESTAMP,
        image_url = VALUES(image_url)`,
      [cardName, editionCode, price.min, price.avg, price.max, imageUrl || null]
    );

    await pool.execute(
      `UPDATE card_prices AS price
       INNER JOIN cards AS card
         ON LOWER(TRIM(card.name_card)) = LOWER(TRIM(price.card_name))
        AND UPPER(card.edition_code) = UPPER(price.edition_code)
       SET price.card_id = card.id
       WHERE price.card_name = ? AND price.edition_code = ?`,
      [cardName, editionCode]
    );
  }
}

function buildResult(cardName, rows, stale) {
  const prices = {};

  for (const row of rows) {
    const mapped = mapPriceRow(row);
    prices[mapped.code] = {
      ...mapped.price,
      updatedAt: mapped.updatedAt,
    };
  }

  return {
    name: cardName,
    prices,
    stale,
    imageUrl: rows.find((row) => row.image_url)?.image_url || null,
  };
}

async function getCachedCardPrices(name, edition = null, lookupName = name) {
  assertDatabaseReady();

  const cardName = normalizeCardName(name);
  const normalizedEdition = edition ? String(edition).trim().toUpperCase() : null;
  let cachedRows = await findCachedPrices(cardName, normalizedEdition);
  const shouldRefresh = cachedRows.length === 0
    || cachedRows.some((row) => isStale(row.updated_at) || !row.image_url);

  if (!shouldRefresh) {
    return buildResult(cardName, cachedRows, false);
  }

  let fetchedPrices;

  try {
    fetchedPrices = await getCardData(lookupName, normalizedEdition);
  } catch (error) {
    if (cachedRows.length > 0) {
      return buildResult(cardName, cachedRows, true);
    }

    error.statusCode = 502;
    throw error;
  }

  await savePrices(cardName, fetchedPrices.prices, fetchedPrices.imageUrl);
  cachedRows = await findCachedPrices(cardName, normalizedEdition);

  if (Object.keys(fetchedPrices.prices).length === 0) {
    if (cachedRows.length > 0) {
      return buildResult(cardName, cachedRows, true);
    }

    const error = new Error('Nenhum preço encontrado para a carta informada.');
    error.statusCode = 404;
    throw error;
  }

  if (cachedRows.length > 0) {
    const result = buildResult(cardName, cachedRows, false);
    return { ...result, imageUrl: fetchedPrices.imageUrl || result.imageUrl };
  }

  const error = new Error('Nenhum preço encontrado para a carta informada.');
  error.statusCode = 404;
  throw error;
}

module.exports = {
  getCachedCardPrices,
  normalizeCardName,
};
