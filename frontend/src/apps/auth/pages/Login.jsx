import React, { useEffect } from 'react';
import { useAuth } from '../../../shared/api/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/process');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      alert('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
      return;
    }

    try {
      await login();
      // Supabase OAuth redirects, so we don't navigate here
    } catch (error) {
      console.error('Login failed', error);
      alert('Inloggning misslyckades. Kontrollera att Supabase är korrekt konfigurerat.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1>Logga in</h1>
        <p>Vänligen logga in med ditt Google-konto.</p>
        <button onClick={handleLogin} className="google-btn">
          Logga in med Google
        </button>
      </div>
    </div>
  );
};

export default Login;
