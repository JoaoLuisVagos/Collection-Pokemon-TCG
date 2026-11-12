function CardSearchForm({ query, onQueryChange, onSubmit, loading }) {
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
      <button className="button" type="submit" disabled={loading}>
        {loading ? 'Buscando...' : 'Buscar'}
      </button>
    </form>
  );
}

export default CardSearchForm;