import CardArt from './CardArt';

function CardEstimatePanel({ result, onSave, saving, authenticated }) {
  if (!result) {
    return null;
  }

  const pricingAvailable = Boolean(result.pricing?.pricingAvailable);

  return (
    <div className="page-card result-card">
      <div className="result-grid">
        <CardArt src={result.card.image} alt={result.card.name} className="card-image" />
        <div>
          <p className="eyebrow">Resultado</p>
          <h3>{result.card.name}</h3>
          <p className="muted">{result.card.set?.name || result.card.setName}</p>
          <div className="meta-grid">
            <span>USD {pricingAvailable ? result.pricing.sourceUsdPrice : 'Indisponivel'}</span>
            <span>BRL {pricingAvailable ? result.pricing.priceBrl : 'Indisponivel'}</span>
            <span>Estimado BRL {pricingAvailable ? result.pricing.estimatedPriceBrl : 'Indisponivel'}</span>
            <span>{result.pricing.imageMessage}</span>
            <span>{result.pricing.pricingMessage}</span>
          </div>
          <button className="button secondary" type="button" onClick={onSave} disabled={saving || !authenticated}>
            {saving ? 'Salvando...' : 'Salvar na base'}
          </button>
          {!authenticated ? <p className="muted">Faça login para salvar a carta na coleção.</p> : null}
        </div>
      </div>
    </div>
  );
}

export default CardEstimatePanel;