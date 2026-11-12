import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import CardArt from '../components/cards/CardArt';

function formatBrl(value) {
  return Number.isFinite(Number(value))
    ? `R$ ${Number(value).toFixed(2).replace('.', ',')}`
    : 'N/A';
}

function CollectionPage() {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 0, totalItems: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalValueBrl, setTotalValueBrl] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [removingOne, setRemovingOne] = useState(false);
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
      const response = await request(`/collections?page=${page}&limit=20`, { token });
      setTotalValueBrl(response.totalValueBrl || 0);
      setItems(response.data || []);
      setPagination(response.pagination || { page, limit: 20, totalPages: 0, totalItems: 0 });
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

  const handleRemoveOne = useCallback(async () => {
    if (!selectedItem || removingOne) return;

    setRemovingOne(true);
    setError('');

    try {
      const response = await request(`/collections/${selectedItem.card.id}/decrement`, {
        method: 'PATCH',
        token,
      });
      collectionRequestRef.current = null;
      if (response.remainingAmount === 0) {
        setSelectedItem(null);
      } else {
        setSelectedItem((currentItem) => (
          currentItem ? { ...currentItem, amount: response.remainingAmount } : currentItem
        ));
      }
      await loadCollection(pagination.page);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setRemovingOne(false);
    }
  }, [loadCollection, pagination.page, removingOne, selectedItem, token]);

  useEffect(() => {
    loadCollection(1);
  }, [loadCollection]);

  useEffect(() => {
    if (!selectedItem) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') setSelectedItem(null);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

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
              <button
                className="card-preview-trigger"
                type="button"
                onClick={() => setSelectedItem(item)}
                aria-label={`Abrir preview de ${item.card.name}`}
              >
                <CardArt src={item.card.image} alt={item.card.name} className="card-image" />
                <span className="card-tile-details">
                  <strong>{item.card.name}</strong>
                  <span>{item.card.setName}</span>
                  <span>Quantidade: {item.amount}</span>
                </span>
              </button>
              <div className="card-tile-actions">
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
                  <span className="sr-only">Excluir todas as unidades</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {selectedItem ? (
        <div className="card-preview-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedItem(null);
        }}>
          <section className="card-preview-modal" role="dialog" aria-modal="true" aria-labelledby="card-preview-title">
            <button className="card-preview-close" type="button" onClick={() => setSelectedItem(null)} aria-label="Fechar preview">×</button>
            <CardArt src={selectedItem.card.image} alt={selectedItem.card.name} className="card-preview-image" />
            <div className="card-preview-content">
              <p className="eyebrow">Preview da carta</p>
              <h2 id="card-preview-title">{selectedItem.card.name}</h2>
              <p className="muted">{selectedItem.card.setName}</p>
              <p className="card-preview-quantity">Você possui <strong>{selectedItem.amount}</strong> unidade(s).</p>
              <div className="card-preview-prices" aria-label="Valores estimados da carta">
                <span><small>Mínimo</small><strong>{formatBrl(selectedItem.card.ligaPriceMin)}</strong></span>
                <span><small>Médio</small><strong>{formatBrl(selectedItem.card.ligaPriceAvg ?? selectedItem.card.priceBrl)}</strong></span>
                <span><small>Máximo</small><strong>{formatBrl(selectedItem.card.ligaPriceMax)}</strong></span>
              </div>
              <div className="card-preview-actions">
                <button className="button secondary" type="button" onClick={handleRemoveOne} disabled={removingOne}>
                  {removingOne ? 'Retirando...' : '− 1 unidade'}
                </button>
                <button className="button" type="button" onClick={() => setSelectedItem(null)}>Fechar</button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

export default CollectionPage;