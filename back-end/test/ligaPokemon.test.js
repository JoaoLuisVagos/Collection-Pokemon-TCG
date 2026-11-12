const test = require('node:test');
const assert = require('node:assert/strict');
const {
  extractCardsEditions,
  extractPrices,
  findLigaReferenceBySearch,
} = require('../src/modules/ligaPokemon');

const html = 'var cards_editions = [{"code":"ABC","price":{"0":{"p":"1,50","m":"2,00","g":"3,25"}}}];';

test('extrai cards_editions do HTML da Liga Pokémon', () => {
  assert.deepEqual(extractCardsEditions(html), [
    { code: 'ABC', price: { 0: { p: '1,50', m: '2,00', g: '3,25' } } },
  ]);
});

test('converte os preços da edição para números', () => {
  assert.deepEqual(extractPrices(extractCardsEditions(html)), {
    ABC: { min: 1.5, avg: 2, max: 3.25 },
  });
});

test('prioriza a edição brasileira quando a busca retorna mais de uma edição', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    text: async () => `
      <a href="/?view=cards/card&card=Pikachu%20(25%2F25)&num=25&ed=JPN">japonesa</a>
      <a href="/?view=cards/card&card=Pikachu%20(25%2F25)&num=25&ed=BR">brasileira</a>
    `,
  });

  try {
    const result = await findLigaReferenceBySearch('Pikachu', '25', '25', 'BR');
    assert.equal(result.editionCode, 'BR');
  } finally {
    global.fetch = originalFetch;
  }
});
