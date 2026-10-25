import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import CardArt from '../components/cards/CardArt';

function CollectionPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 0, totalItems: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalValueBrl, setTotalValueBrl] = useState(0);
  const collectionRequestRef = useRef(null);

  const loadCollection = useCallback(async (page = 1) => {
    const requestKey = `${token || 'anonymous'}:${page}`;
    if (collectionRequestRef.current === requestKey) {
      return;
    }

    collectionRequestRef.current = requestKey;
    setLoading(true);
    setError('');

    try {
      const response = await request(`/collections?page=${page}&limit=18`, { token });
      setTotalValueBrl(response.totalValueBrl || 0);
      setItems(response.data || []);
      setPagination(response.pagination || { page, limit: 18, totalPages: 0, totalItems: 0 });
    } catch (requestError) {
      collectionRequestRef.current = null;
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const handleDeleteCard = useCallback(async (cardId) => {
    setLoading(true);
    setError('');

    try {
      await request(`/collections/${cardId}`, { method: 'DELETE', token });
      collectionRequestRef.current = null;
      loadCollection(pagination.page);
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setLoading(false);
    }
  }, [token, loadCollection, pagination.page]);

  useEffect(() => {
    loadCollection(1);
  }, [loadCollection]);

  return (
    <section className="page-stack">
      <div className="page-card">
        <h2>Minha coleção</h2>
        <p className="muted">Total de itens: {pagination.totalItems}</p>
        <p className="muted">Valor total (BRL): {totalValueBrl?.toFixed(2) || '0.00'}</p>
      </div>

      {error ? <div className="alert error">{error}</div> : null}

      {!loading && items.length === 0 ? (
        <div className="page-card">Nenhuma carta salva ainda.</div>
      ) : null}

      <div className="pagination-bar">
        <button
          className="button secondary pagination-button"
          type="button"
          onClick={() => loadCollection(Math.max(1, pagination.page - 1))}
          disabled={pagination.page <= 1}
          aria-label="Página anterior"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <button
          className="button secondary pagination-button"
          type="button"
          onClick={() => loadCollection(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          aria-label="Próxima página"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {loading ? <div className="page-card">Carregando coleção...</div> : null}

      {!loading ? (
        <div className="collection-grid">
          {items.map((item) => (
            <article className="card-tile" key={item.id}>
              <CardArt src={item.card.image} alt={item.card.name} className="card-image" />
              <div>
                <h3>{item.card.name}</h3>
                <p>{item.card.setName}</p>
                <p>Quantidade: {item.amount}</p>
                {item.card.ligaPriceMin != null ? (
                    <>
                      <p style={{ color: 'green' }}>BRL Min: {Number(item.card.ligaPriceMin).toFixed(2)}</p>
                    </>
                ) : null}
                <p style={{ color: 'yellow' }}>
                  BRL MED: {Number.isFinite(Number(item.card.ligaPriceAvg ?? item.card.priceBrl))
                    ? Number(item.card.ligaPriceAvg ?? item.card.priceBrl).toFixed(2)
                    : 'N/A'}
                </p>
                {item.card.ligaPriceMax != null ? (
                    <>
                      <p style={{ color: 'red' }}>BRL Max: {Number(item.card.ligaPriceMax).toFixed(2)}</p>
                    </>
                ) : null}
                <button
                  className="button secondary"
                  type="button"
                  onClick={async () => {
                    if (window.confirm(`Tem certeza que deseja remover ${item.card.name} da sua coleção?`)) {
                      await handleDeleteCard(item.card.id);
                    }
                  }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default CollectionPage;