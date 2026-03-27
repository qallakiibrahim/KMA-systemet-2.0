import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoutes from './routes';
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import DeadlineChecker from './shared/components/DeadlineChecker';
import KeySelectionOverlay from './shared/components/KeySelectionOverlay';
import { useAuth } from './shared/api/AuthContext';
import './App.css';

function App() {
  const { user } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true); // Default to true to avoid flicker

  // Check if the user has selected an API key (from Coach App logic)
  const checkApiKey = async () => {
    if (window.aistudio?.hasSelectedApiKey) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      } catch (error) {
        console.error('Error checking API key:', error);
        setHasApiKey(true); // Fallback to true if check fails
      }
    } else {
      // If we are not in AI Studio environment (e.g. local development)
      setHasApiKey(true);
    }
  };

  useEffect(() => {
    if (user) {
      checkApiKey();
    }
  }, [user]);

  return (
    <Router>
      <div className="app-container">
        {user && !hasApiKey && <KeySelectionOverlay onKeySelected={checkApiKey} />}
        {user && <Sidebar isExpanded={isSidebarExpanded} onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)} />}
        {user && isSidebarExpanded && <div className="sidebar-overlay open" onClick={() => setIsSidebarExpanded(false)}></div>}
        <div className={`${user ? 'main-wrapper' : 'full-wrapper'} ${isSidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
          {user && <Header onMenuClick={() => setIsSidebarExpanded(!isSidebarExpanded)} />}
          <main className="main-content">
            <AppRoutes />
          </main>
        </div>
        {user && <DeadlineChecker />}
      </div>
      <ToastContainer position="bottom-left" />
    </Router>
  );
}

export default App;
