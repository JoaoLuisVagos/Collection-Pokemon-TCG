const { buildCardEstimate, buildCardEstimateById, saveCardToDatabase, searchCardSuggestions } = require('./cards.service');
const { parseLigaCardUrl } = require('../ligaPokemon');

async function searchCard(req, res) {
  try {
    const rawLigaUrl = req.query.ligaUrl || '';
    const rawQuery = req.query.query || req.query.name || '';
    const ligaUrl = String(rawLigaUrl).trim();
    const query = String(rawQuery).trim();

    if (!query && !ligaUrl) {
      return res.status(400).json({ error: 'Informe o nome ou numero da carta.' });
    }

    const ligaCard = ligaUrl ? parseLigaCardUrl(ligaUrl) : null;
    const result = await searchCardSuggestions(ligaCard?.name || query);
    const suggestions = ligaCard
      ? result.map((card) => ({
          ...card,
          ligaUrl: ligaCard.url,
          editionCode: ligaCard.editionCode || card.editionCode,
          ligaCardNumber: ligaCard.number,
          ligaPrintedTotal: ligaCard.printedTotal,
        }))
      : result;

    return res.json(suggestions);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

async function estimateCard(req, res) {
  try {
    const { cardId, source, name, image, setName, number, rarity, ligaUrl, editionCode } = req.query;

    if (!cardId) {
      return res.status(400).json({ error: 'Informe o cardId da carta escolhida.' });
    }

    const result = await buildCardEstimateById(cardId, {
      source,
      editionCode,
      ligaUrl,
      fallbackCard: { id: cardId, name, image, setName, number, rarity },
    });

    return res.json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
}

async function searchAndSaveCard(req, res) {
  try {
    const {
      cardId,
      name,
      source,
      image,
      setName,
      number,
      rarity,
      editionCode,
      ligaCardName,
      ligaCardNumber,
      ligaPrintedTotal,
      ligaCardReference,
      ligaUrl,
    } = req.body || {};

    if (!cardId && !name) {
      return res.status(400).json({ error: 'Informe o nome ou o cardId da carta.' });
    }

    const result = cardId
      ? await buildCardEstimateById(cardId, {
          source,
          editionCode,
          ligaUrl,
          fallbackCard: { id: cardId, name, image, setName, number, rarity },
        })
      : await buildCardEstimate(name);
    const saved = await saveCardToDatabase(result.card, result.pricing, {
      rarity,
      editionCode,
      ligaCardName,
      ligaCardNumber,
      ligaPrintedTotal,
      ligaCardReference,
    });

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