const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const MIN_REQUEST_INTERVAL_MS = 1200;
let lastRequestAt = 0;
let requestQueue = Promise.resolve();

function getUrlTemplate() {
  const template = process.env.LIGA_POKEMON_URL_TEMPLATE;

  if (!template || !template.includes('{card_name}')) {
    throw new Error('Defina LIGA_POKEMON_URL_TEMPLATE com o marcador {card_name}.');
  }

  return template;
}

function extractCardsEditions(html) {
  const match = html.match(/var\s+cards_editions\s*=\s*(\[.*?\])\s*;/s);

  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    try {
      const cleaned = match[1]
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*.*?\*\//gs, '');

      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

function parsePrice(value) {
  const number = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isNaN(number) ? 0 : number;
}

function extractPrices(cardsEditions, edition = null) {
  const prices = {};
  const normalizedEdition = edition ? edition.toUpperCase() : null;

  for (const cardEdition of cardsEditions) {
    const code = String(cardEdition.code || '').toUpperCase();
    if (!code || (normalizedEdition && code !== normalizedEdition) || prices[code]) continue;

    const price = cardEdition.price;
    const normalPrice = Array.isArray(price) ? price[0] : price?.['0'];
    if (!normalPrice) continue;

    const parsedPrice = {
      min: parsePrice(normalPrice.p),
      avg: parsePrice(normalPrice.m),
      max: parsePrice(normalPrice.g),
    };
    if (parsedPrice.min || parsedPrice.avg || parsedPrice.max) prices[code] = parsedPrice;
  }

  return prices;
}

function extractCardImage(cardsEditions, edition = null) {
  const normalizedEdition = edition ? edition.toUpperCase() : null;
  const cardEdition = cardsEditions.find((item) => {
    const code = String(item.code || '').toUpperCase();
    return code && (!normalizedEdition || code === normalizedEdition) && item.img;
  });

  if (!cardEdition?.img) return null;
  return cardEdition.img.startsWith('//') ? `https:${cardEdition.img}` : cardEdition.img;
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#039;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&ndash;/g, '-');
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function findLigaReferenceBySearch(name, number, printedTotal = null) {
  const url = new URL(getUrlTemplate().replace('{card_name}', encodeURIComponent(name)));
  url.searchParams.set('view', 'cards/search');
  url.searchParams.set('card', name);
  url.searchParams.delete('ed');
  url.searchParams.delete('num');

  const html = await scheduleCardPageRequest(url.toString());
  const links = [...html.matchAll(/href=["']([^"']*view=cards\/card[^"']*)["']/gi)];
  const normalizedNumber = String(number).replace(/^0+/, '');
  const normalizedTotal = printedTotal ? String(printedTotal).replace(/^0+/, '') : null;
  const normalizedName = normalizeSearchText(name);

  const candidates = [];

  for (const link of links) {
    const candidateUrl = new URL(decodeHtml(link[1]), url.origin);
    const candidateCard = candidateUrl.searchParams.get('card') || '';
    const candidateNumber = (candidateUrl.searchParams.get('num') || '').replace(/^0+/, '');
    const numberMatch = candidateCard.match(/\(([^/\s]+)\s*\/\s*([^)]+)\)/);
    const candidateName = candidateCard.replace(/\s*\([^/]+\s*\/\s*[^)]+\)\s*$/, '');
    const candidateTotal = numberMatch?.[2]?.replace(/^0+/, '') || null;

    const matchesNumber =
      candidateNumber === normalizedNumber
      || numberMatch?.[1].replace(/^0+/, '') === normalizedNumber;
    const matchesName =
      !normalizedName || normalizeSearchText(candidateName) === normalizedName;
    const matchesTotal = !normalizedTotal || candidateTotal === normalizedTotal;

    if (matchesNumber) {
      candidates.push({
        reference: candidateCard,
        editionCode: candidateUrl.searchParams.get('ed') || null,
        matchesName,
        matchesTotal,
      });
    }
  }

  return candidates.find((candidate) => candidate.matchesName && candidate.matchesTotal)
    || candidates.find((candidate) => candidate.matchesTotal)
    || (candidates.length === 1 ? candidates[0] : null);
}

async function fetchCardPage(url) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });

    if (response.status === 429) {
      if (attempt === 0) {
        await sleep(5000);
        continue;
      }

      throw new Error('A Liga Pokémon recusou a requisição (HTTP 429) após uma nova tentativa.');
    }

    if (!response.ok) {
      throw new Error(`A Liga Pokémon respondeu com HTTP ${response.status}.`);
    }

    return response.text();
  }

  throw new Error('Não foi possível consultar a Liga Pokémon.');
}

function scheduleCardPageRequest(url) {
  const request = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestAt;

    if (lastRequestAt && elapsed < MIN_REQUEST_INTERVAL_MS) {
      await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    }

    lastRequestAt = Date.now();
    return fetchCardPage(url);
  });

  requestQueue = request.catch(() => {});
  return request;
}

async function getCardPrice(name, edition = null) {
  const result = await getCardData(name, edition);
  return result.prices;
}

async function getCardData(name, edition = null) {
  let url = getUrlTemplate().replace('{card_name}', encodeURIComponent(name));

  if (edition) {
    url += `${url.includes('?') ? '&' : '?'}ed=${encodeURIComponent(edition)}`;
  }

  const html = await scheduleCardPageRequest(url);
  const editions = extractCardsEditions(html);

  if (!editions) {
    throw new Error('cards_editions não encontrado na página da Liga Pokémon.');
  }

  return {
    prices: extractPrices(editions, edition),
    imageUrl: extractCardImage(editions, edition),
  };
}

async function getCardPricesForNames(names, edition = null) {
  const results = [];

  for (const name of names) {
    if (results.length > 0) {
      await sleep(MIN_REQUEST_INTERVAL_MS);
    }

    results.push({
      name,
      prices: await getCardPrice(name, edition),
    });
  }

  return results;
}

async function getLigaCardReference(cardId, fallbackName = null) {
  let card;
  const sources = [
    `https://api.pokemontcg.io/v2/cards/${encodeURIComponent(cardId)}`,
    `https://api.tcgdex.net/v2/en/cards/${encodeURIComponent(cardId)}`,
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) continue;
      const body = await response.json();
      card = body.data || body;
      if (card?.name || fallbackName) break;
    } catch {
      // Tenta a próxima fonte de metadados.
    }
  }

  const name = card?.name || fallbackName;
  const number = card?.number
    || card?.localId
    || String(cardId).match(/-(\d+)$/)?.[1];
  const printedTotal =
    card?.set?.printedTotal ||
    card?.set?.cardCount?.official ||
    card?.set?.cardCount?.total ||
    card?.cardCount?.official ||
    card?.cardCount?.total;

  if (!name || !number) {
    throw new Error(`Dados incompletos para montar a referência da Liga para ${cardId}.`);
  }

  const searched = await findLigaReferenceBySearch(name, number, printedTotal);
  if (searched) {
    return {
      ...searched,
      name,
      number: String(number),
      printedTotal: searched.reference.match(/\/(\d+)\)/)?.[1] || null,
    };
  }

  if (!printedTotal) {
    throw new Error(`Total impresso não encontrado para ${cardId}.`);
  }

  return {
    reference: `${name} (${number}/${String(printedTotal).padStart(3, '0')})`,
    editionCode: card?.set?.ptcgoCode || null,
    name,
    number: String(number),
    printedTotal: String(printedTotal),
  };
}

module.exports = {
  extractCardsEditions,
  extractPrices,
  extractCardImage,
  getCardPrice,
  getCardData,
  getCardPricesForNames,
  getLigaCardReference,
  findLigaReferenceBySearch,
};
