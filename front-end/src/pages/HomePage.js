import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <section className="page-card hero-card">
      <p className="eyebrow">Dashboard</p>
      <h2>{isAuthenticated ? `Bem-vindo, ${user?.name || 'treinador'}.` : 'Comece sua coleção agora.'}</h2>
      <p className="lead">
        Use a busca de cartas para localizar a carta na API, salvar no banco local e depois acompanhar a coleção com paginação.
      </p>
      <div className="action-row">
        <Link className="button" to="/cards">Buscar cartas</Link>
        <Link className="button secondary" to="/collection">Ver coleção</Link>
      </div>
    </section>
  );
}

export default HomePage;