import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../api/AuthContext';
import { useTheme } from '../api/ThemeContext';
import { Home, AlertTriangle, Shield, FileText, Settings, LogOut, Moon, Sun, Calendar, CheckSquare, BarChart, X, Building, Activity, Bot, Library, Menu } from 'lucide-react';
import '../styles/Sidebar.css';

const Sidebar = ({ isExpanded, onToggle }) => {
  const { logout, userProfile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  console.log('DEBUG: Sidebar userProfile:', userProfile);
  console.log('DEBUG: Sidebar company_logo:', userProfile?.company_logo);

  return (
    <aside className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        {userProfile?.company_logo ? (
          <img src={userProfile.company_logo} alt="Company Logo" className="logo" />
        ) : (
          <img src="/logo.png" alt="Logo" className="logo" />
        )}
        {isExpanded && (
          <div style={{ fontSize: '10px', wordBreak: 'break-all', color: 'red', marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span>Logo: {userProfile?.company_logo ? 'YES' : 'NO'}</span>
            <span>Name: {userProfile?.company_name || 'NO'}</span>
            <span>ID: {userProfile?.company_id || 'NO'}</span>
            <span>Type: {typeof userProfile?.company_logo}</span>
            <button onClick={() => refreshProfile && refreshProfile()} style={{ padding: '2px 4px', background: '#eee', border: '1px solid #ccc', cursor: 'pointer' }}>
              Refresh Profile
            </button>
          </div>
        )}
      </div>
      <nav className="sidebar-nav">
        <Link to="/process"><Activity /> {isExpanded && <span>Processer</span>}</Link>
        <Link to="/avvikelse"><AlertTriangle /> {isExpanded && <span>Avvikelser</span>}</Link>
        <Link to="/risk"><Shield /> {isExpanded && <span>Risker</span>}</Link>
        <Link to="/dokument"><FileText /> {isExpanded && <span>Dokument</span>}</Link>
        <Link to="/calendar"><Calendar /> {isExpanded && <span>Kalender</span>}</Link>
        <Link to="/tasks"><CheckSquare /> {isExpanded && <span>Uppgifter</span>}</Link>
        <Link to="/statistik"><BarChart /> {isExpanded && <span>Statistik</span>}</Link>
        <Link to="/library"><Library /> {isExpanded && <span>Bibliotek</span>}</Link>
        <Link to="/ai"><Bot /> {isExpanded && <span>AI Assistent</span>}</Link>
      </nav>
      <div className="sidebar-footer">
        <button onClick={toggleTheme}>
          {theme === 'light' ? <Moon /> : <Sun />}
        </button>
        <button onClick={logout}><LogOut /></button>
      </div>
    </aside>
  );
};

export default Sidebar;
