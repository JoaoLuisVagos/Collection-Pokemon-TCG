import { useState } from 'react';
import { request } from '../config/api';
import { useAuth } from '../context/AuthContext';
import CardEstimatePanel from '../components/cards/CardEstimatePanel';
import CardSearchForm from '../components/cards/CardSearchForm';
import CardSuggestionsGrid from '../components/cards/CardSuggestionsGrid';

function CardsPage() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSearch(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedCard(null);

    try {
      const response = await request(`/cards/search?query=${encodeURIComponent(query)}`);
      setSuggestions(response || []);
    } catch (requestError) {
      setError(requestError.message);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectCard(card) {
    setSelectedCard(card);
    setEstimating(true);
    setError('');

    try {
      const response = await request(`/cards/estimate?cardId=${encodeURIComponent(card.id)}&source=${encodeURIComponent(card.source || 'tcgdex')}`);
      setResult(response);
    } catch (requestError) {
      setError(requestError.message);
      setResult(null);
    } finally {
      setEstimating(false);
    }
  }

  async function handleSave() {
    if (!result || !selectedCard) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await request('/cards/search-and-save', {
        method: 'POST',
        body: { cardId: selectedCard.id, source: selectedCard.source || 'tcgdex' },
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
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-card">
        <p className="eyebrow">Busca de cartas</p>
        <h2>Pesquisar, escolher e salvar</h2>
        <CardSearchForm query={query} onQueryChange={setQuery} onSubmit={handleSearch} loading={loading} />
        {error ? <div className="alert error">{error}</div> : null}
      </div>

      <CardSuggestionsGrid suggestions={suggestions} selectedCardId={selectedCard?.id} onSelect={handleSelectCard} />

      {estimating ? <div className="page-card">Calculando o valor da carta escolhida...</div> : null}

      <CardEstimatePanel result={result} onSave={handleSave} saving={saving} authenticated={Boolean(token)} />
    </section>
  );
}

export default CardsPage;