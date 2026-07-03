import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <h1>Coleção TCG Pokemon</h1>
        </div>

        <nav className="nav-list">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Início</NavLink>
          <NavLink to="/cards" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Buscar cartas</NavLink>
          <NavLink to="/collection" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Minha coleção</NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>Perfil</NavLink>
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div>
                <span className="muted">Logado como </span>
                <strong>{user?.name || user?.email}</strong>
              </div>
              <button className="button secondary" type="button" onClick={handleLogout}>
                Sair
              </button>
            </>
          ) : (
            <div className="auth-shortcuts">
              <NavLink to="/login" className="button secondary">Entrar</NavLink>
              <NavLink to="/register" className="button">Criar conta</NavLink>
            </div>
          )}
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;