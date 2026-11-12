import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { request } from '../config/api';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('authToken') || '');
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('authUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));
  const profileRequestRef = useRef(null);

  useEffect(() => {
    if (!token) {
      profileRequestRef.current = null;
      setUser(null);
      setLoading(false);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      return;
    }

    localStorage.setItem('authToken', token);
    if (user) {
      localStorage.setItem('authUser', JSON.stringify(user));
    }
  }, [token, user]);

  useEffect(() => {
    async function loadProfile() {
      if (!token) {
        return;
      }
      if (profileRequestRef.current === token) {
        return;
      }

      profileRequestRef.current = token;
      try {
        const response = await request('/users/me', { token });
        setUser(response.user);
      } catch (error) {
        profileRequestRef.current = null;
        setToken('');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [token]);

  const login = useCallback(async (credentials) => {
    const response = await request('/users/login', {
      method: 'POST',
      body: credentials,
    });

    setToken(response.token);
    setUser(response.user);
    return response;
  }, []);

  const register = useCallback(async (payload) => {
    const response = await request('/users/register', {
      method: 'POST',
      body: payload,
    });

    setToken(response.token);
    setUser(response.user);
    return response;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const response = await request('/users/me', {
      method: 'PUT',
      token,
      body: payload,
    });

    setUser(response.user);
    return response;
  }, [token]);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token),
    login,
    register,
    updateProfile,
    logout,
  }), [loading, token, user, login, register, updateProfile, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}

export { AuthProvider, useAuth };