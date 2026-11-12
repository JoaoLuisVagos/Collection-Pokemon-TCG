import CardArt from './CardArt';

function CardSuggestionsGrid({ suggestions, selectedCardId, onSelect }) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="page-card">
      <p className="eyebrow">Prévia das cartas</p>
      <h3>Escolha a carta correta</h3>
      <div className="collection-grid">
        {suggestions.map((card) => (
          <button
            key={card.id}
            className={selectedCardId === card.id ? 'card-tile selected-card' : 'card-tile'}
            type="button"
            onClick={() => onSelect(card)}
          >
            <CardArt src={card.image} alt={card.name} className="card-image card-image-small" />
            <div>
              <h3>{card.name}</h3>
              <p>{card.set?.name || 'Sem set'}</p>
              <p>Número: {card.localId || 'N/A'}</p>
              <p>Origem: {card.source === 'market' ? 'Mercado' : 'TCGdex'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CardSuggestionsGrid;