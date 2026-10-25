const { getCachedCardPrices } = require('./cardPrices.service');

const MAX_CARD_NAME_LENGTH = 255;

async function getPrices(req, res) {
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  const edition = typeof req.query.edition === 'string' ? req.query.edition.trim() : null;

  if (!name || name.length > MAX_CARD_NAME_LENGTH) {
    return res.status(400).json({
      error: `Informe um nome de carta entre 1 e ${MAX_CARD_NAME_LENGTH} caracteres.`,
    });
  }

  try {
    return res.json(await getCachedCardPrices(name, edition || null));
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message });
  }
}

module.exports = {
  getPrices,
};
