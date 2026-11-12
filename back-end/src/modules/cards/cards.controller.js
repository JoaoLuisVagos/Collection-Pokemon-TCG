const { buildCardEstimate, buildCardEstimateById, saveCardToDatabase, searchCardSuggestions } = require('./cards.service');

async function searchCard(req, res) {
  try {
    const query = req.query.query || req.query.name;

    if (!query) {
      return res.status(400).json({ error: 'Informe o nome ou numero da carta.' });
    }

    const result = await searchCardSuggestions(query);

    return res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

async function estimateCard(req, res) {
  try {
    const { cardId, source } = req.query;

    if (!cardId) {
      return res.status(400).json({ error: 'Informe o cardId da carta escolhida.' });
    }

    const result = await buildCardEstimateById(cardId, { source });

    return res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

async function searchAndSaveCard(req, res) {
  try {
    const { cardId, name, source } = req.body || {};

    if (!cardId && !name) {
      return res.status(400).json({ error: 'Informe o nome ou o cardId da carta.' });
    }

    const result = cardId
      ? await buildCardEstimateById(cardId, { source })
      : await buildCardEstimate(name);
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
  estimateCard,
  searchAndSaveCard,
};