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
import { hasApiKey as checkHasApiKey, ensureApiKey } from './shared/utils/aiUtils';
import './App.css';

function App() {
  const { user } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(true); // Default to true to avoid flicker

  // Check if the user has selected an API key (from Coach App logic)
  const checkApiKey = async (retries = 3) => {
    if (window.aistudio?.hasSelectedApiKey) {
      try {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        
        if (!hasKey) {
          setHasApiKey(false);
          return;
        }

        // Even if the platform says it has a key, we check if we can actually access it
        const keyAvailable = await checkHasApiKey();
        
        console.log('AI Key Check:', { hasKey, keyAvailable, retries });
        
        if (hasKey && !keyAvailable && retries > 0) {
          // Small delay and retry to handle race condition in key injection
          setTimeout(() => checkApiKey(retries - 1), 1000);
          return;
        }
        
        setHasApiKey(hasKey && keyAvailable);
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
