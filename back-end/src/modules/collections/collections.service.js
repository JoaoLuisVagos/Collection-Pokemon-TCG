const { getPool } = require('../../config/db');
const { isDatabaseConfigured } = require('../../config/env');

function assertDatabaseReady() {
  if (!isDatabaseConfigured()) {
    const error = new Error('Banco de dados nao configurado.');
    error.statusCode = 503;
    throw error;
  }
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

function normalizeAcquisitionDate(value) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function parsePagination(params = {}) {
  const page = toPositiveInteger(params.page, 1);
  const limit = Math.min(toPositiveInteger(params.limit, 10), 100);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

function mapCollectionRow(row) {
  return {
    id: row.collection_id,
    amount: row.amount_card_collection,
    acquisitionDate: row.acquisition_date_card_collection,
    card: {
      id: row.card_id,
      tcgdexId: row.tcgdex_id,
      name: row.name_card,
      setName: row.set_name_card,
      rarity: row.rarity_card,
      image: row.image_card,
      priceUsd: row.price_usd_card,
      priceBrl: row.price_brl_card,
      estimatedPriceBrl: row.amount__price_card,
      discountPercent: row.discount_percent_card,
      createdAt: row.card_created_at,
    },
  };
}

async function addCardToCollection(userId, { cardId, amount, acquisitionDate } = {}) {
  assertDatabaseReady();

  const normalizedUserId = Number(userId);
  const normalizedCardId = Number(cardId);
  const normalizedAmount = toPositiveInteger(amount, 1);
  const normalizedAcquisitionDate = normalizeAcquisitionDate(acquisitionDate);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    const error = new Error('Usuario invalido.');
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(normalizedCardId) || normalizedCardId <= 0) {
    const error = new Error('Informe o cardId da carta.');
    error.statusCode = 400;
    throw error;
  }

  const pool = getPool();
  const [cards] = await pool.execute('SELECT id FROM cards WHERE id = ? LIMIT 1', [normalizedCardId]);

  if (!cards.length) {
    const error = new Error('Carta nao encontrada.');
    error.statusCode = 404;
    throw error;
  }

  const [result] = await pool.execute(
    `INSERT INTO collection (
      user_id,
      card_id,
      amount_card_collection,
      acquisition_date_card_collection
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      amount_card_collection = amount_card_collection + VALUES(amount_card_collection),
      acquisition_date_card_collection = COALESCE(VALUES(acquisition_date_card_collection), acquisition_date_card_collection)`,
    [normalizedUserId, normalizedCardId, normalizedAmount, normalizedAcquisitionDate]
  );

  const [rows] = await pool.execute(
    `SELECT
      collection.id AS collection_id,
      collection.amount_card_collection,
      collection.acquisition_date_card_collection,
      cards.id AS card_id,
      cards.tcgdex_id,
      cards.name_card,
      cards.set_name_card,
      cards.rarity_card,
      cards.image_card,
      cards.amount__price_card,
      cards.price_usd_card,
      cards.price_brl_card,
      cards.discount_percent_card,
      cards.created_at AS card_created_at
    FROM collection
    INNER JOIN cards ON cards.id = collection.card_id
    WHERE collection.user_id = ? AND collection.card_id = ?
    LIMIT 1`,
    [normalizedUserId, normalizedCardId]
  );

  return {
    operation: result.affectedRows > 1 ? 'updated' : 'saved',
    item: rows[0] ? mapCollectionRow(rows[0]) : null,
  };
}

async function listUserCollection(userId, params = {}) {
  assertDatabaseReady();

  const normalizedUserId = Number(userId);

  if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
    const error = new Error('Usuario invalido.');
    error.statusCode = 400;
    throw error;
  }

  const { page, limit, offset } = parsePagination(params);
  const pool = getPool();

  const [[countRow]] = await pool.execute(
    'SELECT COUNT(*) AS total FROM collection WHERE user_id = ?',
    [normalizedUserId]
  );

  const [rows] = await pool.execute(
    `SELECT
      collection.id AS collection_id,
      collection.amount_card_collection,
      collection.acquisition_date_card_collection,
      cards.id AS card_id,
      cards.tcgdex_id,
      cards.name_card,
      cards.set_name_card,
      cards.rarity_card,
      cards.image_card,
      cards.amount__price_card,
      cards.price_usd_card,
      cards.price_brl_card,
      cards.discount_percent_card,
      cards.created_at AS card_created_at
    FROM collection
    INNER JOIN cards ON cards.id = collection.card_id
    WHERE collection.user_id = ?
    ORDER BY collection.id DESC
    LIMIT ? OFFSET ?`,
    [normalizedUserId, limit, offset]
  );

  const totalItems = Number(countRow?.total || 0);

  return {
    data: rows.map(mapCollectionRow),
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    },
  };
}

module.exports = {
  addCardToCollection,
  listUserCollection,
};