const { buildCardEstimate, saveCardToDatabase } = require('./cards.service');

async function searchCard(req, res) {
  try {
    const name = req.query.name;

    if (!name) {
      return res.status(400).json({ error: 'Informe o nome da carta.' });
    }

    const result = await buildCardEstimate(name, {
      discountPercent: req.query.discountPercent,
    });

    return res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

async function searchAndSaveCard(req, res) {
  try {
    const { name, discountPercent } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Informe o nome da carta.' });
    }

    const result = await buildCardEstimate(name, { discountPercent });
    const saved = await saveCardToDatabase(result.card, result.pricing);

    return res.status(201).json({
      ...result,
      saved,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

module.exports = {
  searchCard,
  searchAndSaveCard,
};