const axios = require('axios');

const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';

async function getUsdToBrlRate() {
  const response = await axios.get(EXCHANGE_RATE_URL);
  const rate = response.data?.rates?.BRL;

  if (!rate) {
    throw new Error('Nao foi possivel obter a cotacao USD para BRL.');
  }

  return rate;
}

module.exports = {
  getUsdToBrlRate,
};