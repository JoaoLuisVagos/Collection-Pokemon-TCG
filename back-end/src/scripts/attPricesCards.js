require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
async function executar() {
  try {

    console.log('Iniciando script...');

    const { updateCardPrices } = require('../modules/cards/cards.service');
    await updateCardPrices();

    console.log('Script finalizado com sucesso!');
    process.exit(0);
  } catch (erro) {
    console.error('Erro ao rodar script:', erro);
    process.exit(1);
  }
}

executar();