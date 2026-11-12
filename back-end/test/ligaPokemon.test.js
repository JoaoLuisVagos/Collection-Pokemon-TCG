const test = require('node:test');
const assert = require('node:assert/strict');
const { extractCardsEditions, extractPrices } = require('../src/modules/ligaPokemon');

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
