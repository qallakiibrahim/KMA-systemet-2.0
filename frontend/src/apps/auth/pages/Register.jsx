import React from 'react';
import { useAuth } from '../../../shared/api/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async () => {
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      alert('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
      return;
    }

    try {
      await login();
      // Supabase OAuth redirects, so we don't navigate here
    } catch (error) {
      console.error('Registration failed', error);
      alert('Registrering misslyckades. Kontrollera att Supabase är korrekt konfigurerat.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Registrera dig</h1>
        <p>Skapa ett konto med ditt Google-konto.</p>
        <button onClick={handleRegister} className="google-btn">
          Registrera med Google
        </button>
      </div>
    </div>
  );
};

export default Register;
