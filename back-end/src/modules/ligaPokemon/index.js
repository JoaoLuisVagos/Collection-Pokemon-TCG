const { getPrices } = require('./ligaPokemon.controller');
const {
  extractCardsEditions,
  extractPrices,
  extractCardImage,
  getCardPrice,
  getCardData,
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
  getCardPricesForNames,
  getLigaCardReference,
  findLigaReferenceBySearch,
};
