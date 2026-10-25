import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';

function Layout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <div className={`shell ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

      <button
        className="toggle-btn"
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-controls="main-navigation"
        aria-label={isOpen ? 'Fechar menu principal' : 'Abrir menu principal'}
      >
        {isOpen ? '✖ Fechar' : '☰ Menu'}
      </button>

      <button className="sidebar-backdrop" type="button" onClick={closeMenu} aria-label="Fechar menu" />

      <aside id="main-navigation" className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div>
          <img src="/logo.png" alt="Logo" className="logo" />
          <p className="brand-name">Coleção TCG</p>
          <p className="brand-caption">Seu acervo, seu ritmo.</p>
        </div>

        <nav className="nav-list">
          <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>01</span>Início</NavLink>
          <NavLink to="/cards" onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>02</span>Buscar cartas</NavLink>
          <NavLink to="/collection" onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>03</span>Minha coleção</NavLink>
          <NavLink to="/profile" onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>04</span>Perfil</NavLink>
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div>
                <span className="muted">TREINADOR</span>
                <strong>{user?.email}</strong>
              </div>
              <button className="button secondary" type="button" onClick={handleLogout}>
                <FontAwesomeIcon icon={faRightFromBracket} /> Sair
              </button>
            </>
          ) : (
            <div className="auth-shortcuts">
              <NavLink to="/login" onClick={closeMenu} className="button secondary">Entrar</NavLink>
              <NavLink to="/register" onClick={closeMenu} className="button">Criar conta</NavLink>
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