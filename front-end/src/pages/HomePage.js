import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home-layout">
      <section className="page-card hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Arquivo de colecionador / 01</p>
          <h1>{isAuthenticated ? `Olá, ${user?.name || 'treinador'}.` : 'Sua coleção começa aqui.'}</h1>
          <p className="lead">Encontre cartas, compare referências de mercado e mantenha cada aquisição no seu próprio ritmo.</p>
          <div className="action-row">
            <Link className="button" to="/cards">Encontrar uma carta <span>→</span></Link>
            <Link className="text-link" to="/collection">Abrir meu acervo <span>↗</span></Link>
          </div>
        </div>
        <div className="hero-index">TCG<br /><strong>001</strong></div>
        <div className="hero-card-stack" aria-hidden="true">
          <div className="mini-card mini-card-back" />
          <div className="mini-card mini-card-front"><span>COLLECTION</span><b>TCG</b><i>✦</i></div>
        </div>
      </section>

      <aside className="home-aside">
        <div className="aside-label">Leitura rápida</div>
        <div className="stat-block"><strong>—</strong><span>cartas catalogadas</span></div>
        <div className="stat-block"><strong>BRL</strong><span>valor atualizado sob demanda</span></div>
        <div className="aside-note"><span>02</span><p>Pesquise pelo nome, número ou link da Liga Pokémon.</p></div>
      </aside>

      <section className="home-strip">
        <span className="strip-number">A / 2026</span>
        <div><strong>Um acervo mais claro começa por uma boa busca.</strong><p>Salve a carta certa hoje. Organize o restante quando quiser.</p></div>
        <Link to="/cards" aria-label="Ir para busca de cartas">↗</Link>
      </section>
    </div>
  );
}

export default HomePage;