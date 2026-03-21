import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/NotFound.css';

const NotFound = () => {
  return (
    <div className="notfound-container">
      <h1>404</h1>
      <p>Sidan kunde inte hittas.</p>
      <Link to="/home" className="back-btn">Gå tillbaka hem</Link>
    </div>
  );
};

export default NotFound;
