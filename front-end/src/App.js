import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import CardsPage from './pages/CardsPage';
import CollectionPage from './pages/CollectionPage';
import ProfilePage from './pages/ProfilePage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/collection" element={<CollectionPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
