import { useCallback, useEffect, useState } from 'react';
import { request } from '../config/api';
import { useAuth } from '../context/AuthContext';

function CollectionPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0, totalItems: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadCollection = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const response = await request(`/collections?page=${page}&limit=10`, { token });
      setItems(response.data || []);
      setPagination(response.pagination || { page, limit: 10, totalPages: 0, totalItems: 0 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCollection(1);
  }, [loadCollection]);

  return (
    <section className="page-stack">
      <div className="page-card">
        <p className="eyebrow">Minha coleção</p>
        <h2>Cartas salvas da API</h2>
        <p className="muted">Total de itens: {pagination.totalItems}</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {loading ? <div className="page-card">Carregando coleção...</div> : null}

      {!loading && items.length === 0 ? (
        <div className="page-card">Nenhuma carta salva ainda.</div>
      ) : null}

      <div className="collection-grid">
        {items.map((item) => (
          <article className="card-tile" key={item.id}>
            <img src={item.card.image} alt={item.card.name} />
            <div>
              <h3>{item.card.name}</h3>
              <p>{item.card.setName}</p>
              <p>Quantidade: {item.amount}</p>
              <p>BRL: {item.card.priceBrl ?? 'N/A'}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="pagination-bar">
        <button className="button secondary" type="button" onClick={() => loadCollection(Math.max(1, pagination.page - 1))} disabled={pagination.page <= 1}>
          Anterior
        </button>
        <span>
          Página {pagination.page} de {pagination.totalPages || 1}
        </span>
        <button className="button secondary" type="button" onClick={() => loadCollection(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
          Próxima
        </button>
      </div>
    </section>
  );
}

export default CollectionPage;