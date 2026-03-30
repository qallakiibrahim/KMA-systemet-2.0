import React, { useState } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import AppRoutes from './routes';
import Sidebar from './shared/components/Sidebar';
import Header from './shared/components/Header';
import DeadlineChecker from './shared/components/DeadlineChecker';
import { useAuth } from './shared/api/AuthContext';
import './App.css';

function App() {
  const { user } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
