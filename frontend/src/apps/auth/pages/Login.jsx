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
    console.log('Login attempt started');
    console.log('Supabase URL present:', !!import.meta.env.VITE_SUPABASE_URL);
    console.log('Current Origin:', window.location.origin);

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      alert('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
      return;
    }

    try {
      await login();
      console.log('Login function called successfully');
    } catch (error) {
      console.error('Login failed', error);
      alert('Inloggning misslyckades. Kontrollera att Supabase är korrekt konfigurerat.');
    }
  };

  const handleManualRefresh = () => {
    window.location.reload();
  };

  const checkSessionManually = async () => {
    console.log('Manual session check triggered');
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('Session found manually:', session.user.email);
      alert('Inloggning hittades! Laddar om...');
      window.location.reload();
    } else {
      console.log('No session found manually');
      alert('Ingen aktiv inloggning hittades. Prova att logga in igen.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1>Logga in</h1>
        <p>Vänligen logga in med ditt Google-konto.</p>
        <div className="auth-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={handleLogin} className="google-btn">
            Logga in med Google
          </button>
          <button onClick={checkSessionManually} className="check-btn" style={{ padding: '0.5rem', background: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
            Kontrollera inloggning manuellt
          </button>
          <button onClick={handleManualRefresh} className="refresh-btn" style={{ fontSize: '0.8rem', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Ladda om hela sidan
          </button>
        </div>
        <div className="debug-info" style={{ marginTop: '2rem', fontSize: '0.7rem', color: '#666', background: '#f9f9f9', padding: '1rem', borderRadius: '8px', textAlign: 'left' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Konfiguration för Supabase:</p>
          <p style={{ marginBottom: '0.5rem' }}>Lägg till denna URL i "Redirect URLs" i Supabase Dashboard:</p>
          <code style={{ display: 'block', background: '#eee', padding: '0.5rem', borderRadius: '4px', wordBreak: 'break-all' }}>
            {window.location.origin}/api/auth/callback
          </code>
          <p style={{ marginTop: '0.5rem' }}>Origin: {window.location.origin}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
