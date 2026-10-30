import { useRef, useState } from 'react';
import { request } from '../config/api';
import { useAuth } from '../context/AuthContext';
import CardEstimatePanel from '../components/cards/CardEstimatePanel';
import CardSearchForm from '../components/cards/CardSearchForm';
import CardSuggestionsGrid from '../components/cards/CardSuggestionsGrid';
import ToastContainer from '../components/ToastContainer';

function CardsPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [ligaUrl, setLigaUrl] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastCounterRef = useRef(0);

  function dismissToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  function pushToast(message, type = 'info', durationMs = 2600) {
    const id = `${Date.now()}-${toastCounterRef.current++}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (durationMs > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, durationMs);
    }

    return id;
  }

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedCard(null);
    const loadingToastId = pushToast('Aguarde, buscando cartas...', 'loading', 0);

    try {
      const enteredQuery = query.trim();
      const enteredLigaUrl = ligaUrl.trim();
      const linkValue = enteredLigaUrl || (
        /^https?:\/\/(?:www\.)?ligapokemon\.com\.br\//i.test(enteredQuery)
          ? enteredQuery
          : ''
      );
      const params = new URLSearchParams();
      if (enteredQuery && enteredQuery !== linkValue) params.set('query', enteredQuery);
      if (linkValue) params.set('ligaUrl', linkValue);
      if (!params.toString()) {
        throw new Error('Informe o nome, número ou link da carta na Liga Pokémon.');
      }
      const response = await request(`/cards/search?${params.toString()}`);
      setSuggestions(response || []);
      if ((response || []).length) {
        pushToast(`Busca concluida: ${(response || []).length} carta(s) encontrada(s).`, 'success');
      } else {
        pushToast('Nenhuma carta encontrada para essa busca.', 'info');
      }
    } catch (requestError) {
      setError(requestError.message);
      setSuggestions([]);
      pushToast(requestError.message || 'Erro ao buscar cartas.', 'error');
    } finally {
      dismissToast(loadingToastId);
      setLoading(false);
    }
  }

  async function handleSelectCard(card) {
    setSelectedCard(card);
    setEstimating(true);
    setError('');
    const loadingToastId = pushToast('Carregando previa da carta...', 'loading', 0);

    try {
      const params = new URLSearchParams({
        cardId: card.id,
        source: card.source || 'tcgdex',
        name: card.name || '',
        image: card.image || '',
        setName: card.set?.name || '',
        number: card.localId || card.number || '',
        rarity: card.rarity || '',
        ligaUrl: card.ligaUrl || '',
        editionCode: card.editionCode || '',
      });
      const response = await request(`/cards/estimate?${params.toString()}`);
      setResult(response);
      pushToast('Previa carregada com sucesso.', 'success');
    } catch (requestError) {
      setError(requestError.message);
      setResult(null);
      pushToast(requestError.message || 'Erro ao carregar previa da carta.', 'error');
    } finally {
      dismissToast(loadingToastId);
      setEstimating(false);
    }
  }

  async function handleSave() {
    if (!result || !selectedCard) {
      return;
    }

    setSaving(true);
    setError('');
    const loadingToastId = pushToast('Salvando carta, aguarde...', 'loading', 0);

    try {
      const response = await request('/cards/search-and-save', {
        method: 'POST',
        body: {
          cardId: selectedCard.id,
          source: selectedCard.source || 'tcgdex',
          name: selectedCard.name,
          image: selectedCard.image,
          setName: selectedCard.set?.name,
          number: selectedCard.localId || selectedCard.number,
          rarity: selectedCard.rarity,
          ligaUrl: selectedCard.ligaUrl,
          editionCode: result.pricing?.liga?.editionCode || selectedCard.editionCode,
          ligaCardName: result.pricing?.liga?.name,
          ligaCardNumber: result.pricing?.liga?.number,
          ligaPrintedTotal: result.pricing?.liga?.printedTotal,
          ligaCardReference: result.pricing?.liga?.reference,
        },
      });

      if (token) {
        await request('/collections', {
          method: 'POST',
          token,
          body: {
            cardId: response.saved?.card?.id,
            amount: 1,
          },
        });
      }

      setResult(response);
      pushToast('Carta salva com sucesso.', 'success');
    } catch (requestError) {
      setError(requestError.message);
      pushToast(requestError.message || 'Erro ao salvar carta.', 'error');
    } finally {
      dismissToast(loadingToastId);
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="page-card">
        <p className="eyebrow">Busca de cartas</p>
        <h2>Pesquisar, escolher e salvar</h2>
        <CardSearchForm
          query={query}
          onQueryChange={setQuery}
          ligaUrl={ligaUrl}
          onLigaUrlChange={setLigaUrl}
          onSubmit={handleSearch}
          loading={loading}
        />
        {error ? <div className="alert error">{error}</div> : null}
      </div>

      <CardSuggestionsGrid suggestions={suggestions} selectedCardId={selectedCard?.id} onSelect={handleSelectCard} />

      {estimating ? <div className="page-card">Calculando o valor da carta escolhida...</div> : null}

      <CardEstimatePanel result={result} onSave={handleSave} saving={saving} authenticated={Boolean(token)} />
    </section>
  );
}

export default CardsPage;