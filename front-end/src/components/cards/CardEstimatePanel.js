import CardArt from './CardArt';

function formatBrl(value) {
  return typeof value === 'number'
    ? `R$ ${value.toFixed(2).replace('.', ',')}`
    : 'Indisponível';
}

function CardEstimatePanel({ result, onSave, saving, authenticated }) {
  if (!result) {
    return null;
  }

  const pricingAvailable = Boolean(result.pricing?.pricingAvailable);
  const hasEstimatedBrl = typeof result.pricing?.estimatedPriceBrl === 'number';
  const displayedBrl = hasEstimatedBrl ? result.pricing.estimatedPriceBrl : result.pricing?.priceBrl;
  const ligaPrice = result.pricing?.liga
    || (result.pricing?.source === 'liga-pokemon' && (
      typeof result.pricing.min === 'number'
      || typeof result.pricing.avg === 'number'
      || typeof result.pricing.max === 'number'
    ) ? result.pricing : null);
  const brlLabel = result.pricing?.source === 'liga-pokemon'
    ? 'BRL (Liga Pokémon)'
    : hasEstimatedBrl
      ? 'Estimado BRL'
      : 'BRL';

  return (
    <div className="page-card result-card">
      <div className="result-grid">
        <CardArt src={result.card.image} alt={result.card.name} className="card-image" />
        <div>
          <p className="eyebrow">Resultado</p>
          <h3>{result.card.name}</h3>
          <p className="muted">{result.card.set?.name || result.card.setName}</p>
          <div className="meta-grid">
            {result.pricing?.source === 'liga-pokemon' ? null : (
              <span>USD {pricingAvailable ? result.pricing.sourceUsdPrice : 'Indisponivel'}</span>
            )}
            {ligaPrice ? (
              <>
                <span>BRL Min: {formatBrl(ligaPrice.min)}</span>
                <span>BRL MED: {formatBrl(ligaPrice.avg)}</span>
                <span>BRL Max: {formatBrl(ligaPrice.max)}</span>
              </>
            ) : (
              <span>{brlLabel} {pricingAvailable ? displayedBrl : 'Indisponivel'}</span>
            )}
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