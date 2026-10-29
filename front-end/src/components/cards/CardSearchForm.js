function CardSearchForm({ query, onQueryChange, ligaUrl, onLigaUrlChange, onSubmit, loading }) {
  return (
    <form className="form-grid compact" onSubmit={onSubmit}>
      <label>
        Nome ou número
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Ex: Tarsila, Lacey ou 210/190"
        />
      </label>
      <label>
        Link da carta na Liga Pokémon
        <input
          value={ligaUrl}
          onChange={(event) => onLigaUrlChange(event.target.value)}
          placeholder="Cole aqui o link da carta"
        />
      </label>
      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Buscando...' : 'Buscar'}
      </button>
    </form>
  );
}

export default CardSearchForm;