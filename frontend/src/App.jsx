import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoutes from './routes';
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import DeadlineChecker from './shared/components/DeadlineChecker';
import { useAuth } from './shared/api/AuthContext';
import { hasApiKey, ensureApiKey } from './shared/utils/aiUtils';
import './App.css';

function App() {
  const { user } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Ensure AI key is prompted for on the first user interaction if missing
  useEffect(() => {
    if (!user) return;

    const handleFirstInteraction = async () => {
      try {
        const available = await hasApiKey();
        if (!available) {
          await ensureApiKey();
        }
      } catch (error) {
        console.error('Error in AI auto-connect:', error);
      }
      // Remove listener after first attempt (success or failure)
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [user]);

  return (
    <Router>
      <div className="app-container">
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
