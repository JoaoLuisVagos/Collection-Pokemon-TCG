import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await updateProfile({
        name,
        email,
        password: password || undefined,
      });
      setPassword('');
      setMessage('Perfil atualizado com sucesso.');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="page-card auth-card">
      <p className="eyebrow">Perfil</p>
      <h2>Dados do usuário</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Nome
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Nova senha
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        {error ? <div className="alert error">{error}</div> : null}
        {message ? <div className="alert success">{message}</div> : null}

        <button className="button" type="submit">Salvar alterações</button>
      </form>
    </section>
  );
}

export default ProfilePage;