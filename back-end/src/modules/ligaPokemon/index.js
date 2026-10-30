const { getPrices } = require('./ligaPokemon.controller');
const {
  extractCardsEditions,
  extractPrices,
  extractCardImage,
  getCardPrice,
  getCardData,
  parseLigaCardUrl,
  getCardPricesForNames,
  getLigaCardReference,
  findLigaReferenceBySearch,
} = require('./ligaPokemon.service');

module.exports = {
  getPrices,
  extractCardsEditions,
  extractPrices,
  extractCardImage,
  getCardPrice,
  getCardData,
  parseLigaCardUrl,
  getCardPricesForNames,
  getLigaCardReference,
  findLigaReferenceBySearch,
};
