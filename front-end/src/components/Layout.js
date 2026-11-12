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
        <div className="brand-lockup">
          <div className="brand-mark"><img src="/logo.png" alt="" className="logo" /></div>
          <div>
            <p className="brand-name">Coleção TCG</p>
            <p className="brand-caption">Minha coleção</p>
          </div>
        </div>

        <p className="nav-kicker">Menu</p>
        <nav className="nav-list">
          <NavLink to="/" end onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>01</span><b>Início</b><i>↗</i></NavLink>
          <NavLink to="/cards" onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>02</span><b>Pesquisar cartas</b><i>↗</i></NavLink>
          <NavLink to="/collection" onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>03</span><b>Minha coleção</b><i>↗</i></NavLink>
          <NavLink to="/profile" onClick={closeMenu} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}><span>04</span><b>Meu perfil</b><i>↗</i></NavLink>
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <>
              <div className="account-chip">
                <span className="account-avatar">{(user?.name || user?.email || 'T')[0].toUpperCase()}</span>
                <span>
                  <small>Conta ativa</small>
                  <strong>{user?.name || user?.email}</strong>
                </span>
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
        <div className="content-rail">
          <span>POKÉMON TCG / <strong>MINHA COLEÇÃO</strong></span>
          <span className="rail-status"><i /> Online</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;