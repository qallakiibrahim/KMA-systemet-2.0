import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { useTheme } from '../api/ThemeContext';
import { Home, AlertTriangle, Shield, FileText, Settings, LogOut, Moon, Sun, Calendar, CheckSquare, BarChart, X, Building, Activity, Bot, Library } from 'lucide-react';
import '../styles/Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.png" alt="Logo" className="logo" />
          <button className="close-sidebar-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>
        <nav className="sidebar-nav">
          <Link to="/process" onClick={onClose}><Activity /> <span>Processer</span></Link>
          <Link to="/avvikelse" onClick={onClose}><AlertTriangle /> <span>Avvikelser</span></Link>
          <Link to="/risk" onClick={onClose}><Shield /> <span>Risker</span></Link>
          <Link to="/dokument" onClick={onClose}><FileText /> <span>Dokument</span></Link>
          <Link to="/calendar" onClick={onClose}><Calendar /> <span>Kalender</span></Link>
          <Link to="/tasks" onClick={onClose}><CheckSquare /> <span>Uppgifter</span></Link>
          <Link to="/statistik" onClick={onClose}><BarChart /> <span>Statistik</span></Link>
          <Link to="/library" onClick={onClose}><Library /> <span>Bibliotek</span></Link>
          <Link to="/ai" onClick={onClose}><Bot /> <span>AI Assistent</span></Link>
        </nav>
        <div className="sidebar-footer">
          <button onClick={toggleTheme}>
            {theme === 'light' ? <Moon /> : <Sun />}
          </button>
          <button onClick={logout}><LogOut /></button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
