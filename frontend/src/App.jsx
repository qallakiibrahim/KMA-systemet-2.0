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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <Router>
      <div className="app-container">
        {user && <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />}
        <div className={`${user ? 'main-wrapper' : 'full-wrapper'} ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {user && <Header onMenuClick={() => setIsSidebarOpen(true)} />}
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
