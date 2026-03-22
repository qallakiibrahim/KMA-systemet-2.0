import React, { useEffect, useState } from 'react';
import { Users, Building, Activity, Plus, Search, MoreVertical, Shield, CheckCircle, Clock, XCircle } from 'lucide-react';
import { getUsers } from '../api/users';
import '../styles/AdminPanel.css';

// Mock data for companies to show the concept
const MOCK_COMPANIES = [
  { id: 1, name: 'Acme Corp AB', orgNr: '556123-4567', plan: 'Premium', status: 'active', users: 45, expiresAt: null },
  { id: 2, name: 'TechStart Sweden', orgNr: '556987-6543', plan: 'Trial', status: 'trial', users: 12, expiresAt: '2026-04-05' },
  { id: 3, name: 'Bygg & Konstruktion', orgNr: '556111-2222', plan: 'Basic', status: 'active', users: 8, expiresAt: null },
  { id: 4, name: 'Testbolaget AB', orgNr: '556999-8888', plan: 'Trial', status: 'expired', users: 3, expiresAt: '2026-03-10' },
];

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        setUsers(data);
      } catch (error) {
        console.error('Failed to fetch users', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <div className="loading-spinner">Laddar adminpanel...</div>;

  const renderStatusBadge = (status) => {
    switch(status) {
      case 'active': return <span className="status-badge success"><CheckCircle size={14} /> Aktiv</span>;
      case 'trial': return <span className="status-badge warning"><Clock size={14} /> Testperiod</span>;
      case 'expired': return <span className="status-badge danger"><XCircle size={14} /> Utgången</span>;
      default: return <span className="status-badge neutral">{status}</span>;
    }
  };

  return (
    <div className="admin-panel-container">
      <div className="admin-header">
        <div>
          <h1>Superadmin Portal</h1>
          <p>Hantera systemet, företag och licenser</p>
        </div>
        <div className="admin-actions">
          {activeTab === 'companies' && (
            <button className="btn-primary"><Plus size={18} /> Nytt Företag</button>
          )}
          {activeTab === 'users' && (
            <button className="btn-primary"><Plus size={18} /> Ny Användare</button>
          )}
        </div>
      </div>

      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <Activity size={18} /> Översikt
        </button>
        <button 
          className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
          onClick={() => setActiveTab('companies')}
        >
          <Building size={18} /> Företag & Licenser
        </button>
        <button 
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} /> Användare & Roller
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon doc-icon"><Building size={24} /></div>
                <div className="kpi-content">
                  <h3>Totalt Företag</h3>
                  <p className="kpi-value">{MOCK_COMPANIES.length}</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon task-icon"><CheckCircle size={24} /></div>
                <div className="kpi-content">
                  <h3>Aktiva Kunder</h3>
                  <p className="kpi-value">{MOCK_COMPANIES.filter(c => c.status === 'active').length}</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon avvikelse-icon"><Clock size={24} /></div>
                <div className="kpi-content">
                  <h3>Pågående Testperioder</h3>
                  <p className="kpi-value">{MOCK_COMPANIES.filter(c => c.status === 'trial').length}</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon risk-icon"><Users size={24} /></div>
                <div className="kpi-content">
                  <h3>Totalt Användare</h3>
                  <p className="kpi-value">{users.length || 68}</p>
                </div>
              </div>
            </div>

            <div className="info-card mt-4">
              <h3>Välkommen till Superadmin-portalen</h3>
              <p>Detta är en förhandsvisning av hur du som systemägare kommer att kunna hantera dina kunder. Härifrån kommer du kunna lägga upp nya företag, ge dem testperioder och hantera deras licenser.</p>
              <p><strong>Observera:</strong> Företagslistan just nu är bara exempeldata för att visa konceptet. Vi kan koppla detta till databasen när du känner dig redo.</p>
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="companies-tab">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Sök på företagsnamn eller org.nr..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Företag</th>
                    <th>Org.nr</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Användare</th>
                    <th>Utgår</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_COMPANIES.map(company => (
                    <tr key={company.id}>
                      <td className="font-medium">{company.name}</td>
                      <td className="text-muted">{company.orgNr}</td>
                      <td>{company.plan}</td>
                      <td>{renderStatusBadge(company.status)}</td>
                      <td>{company.users} st</td>
                      <td className="text-muted">{company.expiresAt || '-'}</td>
                      <td className="actions-cell">
                        <button className="icon-btn"><MoreVertical size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="users-tab">
            <div className="search-bar">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Sök på namn eller e-post..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Användare</th>
                    <th>E-post</th>
                    <th>Företag</th>
                    <th>Roll</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium">{u.username || 'Okänd'}</td>
                      <td>{u.email}</td>
                      <td className="text-muted">Acme Corp AB</td>
                      <td>
                        <span className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                          {u.role === 'admin' ? <Shield size={12} /> : null}
                          {u.role}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="btn-secondary btn-sm">Redigera</button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">Inga användare hittades</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
