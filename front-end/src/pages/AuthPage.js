import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initialForm = { name: '', email: '', password: '' };

function AuthPage() {
  const { pathname } = useLocation();
  const isRegister = pathname === '/register';
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await register(form);
      } else {
        await login({ email: form.email, password: form.password });
      }

      navigate('/');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-card auth-card">
      <p className="eyebrow">{isRegister ? 'Criar conta' : 'Entrar'}</p>
      <h2>{isRegister ? 'Abra sua coleção' : 'Acesse sua conta'}</h2>

      <form className="form-grid" onSubmit={handleSubmit}>
        {isRegister && (
          <label>
            Nome
            <input name="name" value={form.name} onChange={handleChange} placeholder="Seu nome" />
          </label>
        )}

        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="voce@email.com" />
        </label>

        <label>
          Senha
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Sua senha" />
        </label>

        {error ? <div className="alert error">{error}</div> : null}

        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Enviando...' : isRegister ? 'Criar conta' : 'Entrar'}
        </button>
      </form>

      <p className="muted inline-link">
        {isRegister ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
        <Link to={isRegister ? '/login' : '/register'}>{isRegister ? 'Entrar' : 'Criar agora'}</Link>
      </p>
    </section>
  );
}

export default AuthPage;