import React from 'react';
import { useAuth } from '../../../shared/api/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

const Register = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await login();
      // Firebase OAuth usually redirects or handles state, AuthContext handles navigation if needed
    } catch (error) {
      console.error('Registration failed', error);
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
