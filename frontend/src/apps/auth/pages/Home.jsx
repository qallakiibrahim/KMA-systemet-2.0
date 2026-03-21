import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  return (
    <div className="home-container">
      <h1>Välkommen till Ledningssystemet</h1>
      <div className="card-grid">
        <Link to="/avvikelse" className="card">
          <h2>Avvikelser</h2>
          <p>Hantera och följ upp avvikelser.</p>
        </Link>
        <Link to="/risk" className="card">
          <h2>Risker</h2>
          <p>Identifiera och bedöm risker.</p>
        </Link>
        <Link to="/dokument" className="card">
          <h2>Dokument</h2>
          <p>Visa och ladda upp dokument.</p>
        </Link>
        <Link to="/statistik" className="card">
          <h2>Statistik</h2>
          <p>Se KPI:er och rapporter.</p>
        </Link>
      </div>
    </div>
  );
};

export default Home;
