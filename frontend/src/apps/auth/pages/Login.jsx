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
    try {
      await login();
    } catch (error) {
      console.error('Login failed', error);
      // toast is already used inside AuthContext.login, but we can add a local alert or just let toast handle it.
      // Since Login component doesn't import toast, let's just use alert for now or import toast if wanted.
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <img src="/logo.png" alt="Logo" className="auth-logo" />
        <h1>Logga in</h1>
        <p>Vänligen logga in med ditt Google-konto.</p>
        <div className="auth-actions">
          <button onClick={handleLogin} className="google-btn">
            Logga in med Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
