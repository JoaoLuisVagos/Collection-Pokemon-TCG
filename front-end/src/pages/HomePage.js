import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-layout">
      <section className="page-card hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Coleção de cartas</p>
          <h1>{isAuthenticated ? `Olá, ${user?.name || 'treinador'}.` : 'Sua coleção começa aqui.'}</h1>
          <p className="lead">Pesquise cartas, veja uma estimativa de preço e mantenha sua coleção organizada.</p>
          <div className="action-row">
            <Link className="button" to="/cards">Pesquisar cartas <span>→</span></Link>
            <Link className="text-link" to="/collection">Ver minha coleção <span>↗</span></Link>
          </div>
        </div>
        <div className="hero-index">TCG<br /><strong>01</strong></div>
        <div className="hero-card-stack" aria-hidden="true">
          <div className="mini-card mini-card-back" />
          <div className="mini-card mini-card-front"><span>COLLECTION</span><b>TCG</b><i>✦</i></div>
        </div>
      </section>

      <aside className="home-aside">
        <div className="aside-label">Como funciona</div>
        <div className="stat-block"><strong>01</strong><span>Pesquise pelo nome ou número da carta.</span></div>
        <div className="stat-block"><strong>02</strong><span>Confira os preços mínimo, médio e máximo.</span></div>
        <div className="aside-note"><span>03</span><p>Salve as cartas que você já tem e ajuste a quantidade quando precisar.</p></div>
      </aside>

      <section className="home-strip">
        <span className="strip-number">DICA</span>
        <div><strong>Não encontrou pelo nome?</strong><p>Você também pode colar o link da carta na Liga Pokémon.</p></div>
        <Link to="/cards" aria-label="Ir para busca de cartas">↗</Link>
      </section>
    </div>
  );
}

export default HomePage;