import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
          <img src="/logo.png" alt="Logo" className="logo" />
          <h1 style={{ textAlign: 'center' }}>Coleção TCG</h1>
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
                <br />
                <strong>{user?.email}</strong>
              </div>
              <button className="button secondary" type="button" onClick={handleLogout}>
                <FontAwesomeIcon icon={faRightFromBracket} /> Sair
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