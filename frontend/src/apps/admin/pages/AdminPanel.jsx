import React, { useEffect, useState } from 'react';
import { Users, Building, Activity, Plus, Search, MoreVertical, Shield, CheckCircle, Clock, XCircle, Eye, Edit2, CheckSquare, Archive, X, Info } from 'lucide-react';
import { getUsers, updateUser } from '../api/users';
import { getCompanies, createCompany, updateCompany } from '../../company/api/company';
import { useAuth } from '../../../shared/api/AuthContext';
import '../styles/AdminPanel.css';

const AdminPanel = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal state
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [newCompany, setNewCompany] = useState({ name: '', org_nr: '', plan: 'Trial', status: 'active' });
  
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, companiesData] = await Promise.all([
          getUsers(),
          getCompanies()
        ]);
        setUsers(usersData);
        setCompanies(companiesData);
      } catch (error) {
        console.error('Failed to fetch admin data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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

  const renderPermissions = (permissions) => {
    const perms = permissions || [];
    if (perms.length === 0) {
      return <span className="text-muted" style={{ fontSize: '0.75rem' }}>Inga behörigheter</span>;
    }
    
    return (
      <div className="permission-tags">
        {perms.includes('viewer') && <span className="perm-tag"><Eye size={12} /> Viewer</span>}
        {perms.includes('read_write') && <span className="perm-tag"><Edit2 size={12} /> Read/Write</span>}
        {perms.includes('approve') && <span className="perm-tag approve"><CheckSquare size={12} /> Approve</span>}
        {perms.includes('archive') && <span className="perm-tag archive"><Archive size={12} /> Archive</span>}
      </div>
    );
  };

  const openEditModal = (user) => {
    setEditingUser({ ...user, permissions: user.permissions || ['read_write'] });
    setIsModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      await updateUser(editingUser.id, { 
        role: editingUser.role,
        permissions: editingUser.permissions,
        company_id: editingUser.company_id
      });
      // Update local state
      setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update user', error);
      alert('Kunde inte uppdatera användaren.');
    }
  };

  const togglePermission = (perm) => {
    const current = editingUser.permissions || [];
    if (current.includes(perm)) {
      setEditingUser({ ...editingUser, permissions: current.filter(p => p !== perm) });
    } else {
      setEditingUser({ ...editingUser, permissions: [...current, perm] });
    }
  };

  const openEditCompanyModal = (company) => {
    setEditingCompany(company);
    setNewCompany({
      name: company.name || '',
      org_nr: company.org_nr || company.org_number || '',
      plan: company.plan || 'Basic',
      status: company.status || 'active'
    });
    setIsCompanyModalOpen(true);
  };

  const handleCreateOrUpdateCompany = async () => {
    if (!newCompany.name) return alert('Företagsnamn är obligatoriskt');
    
    try {
      if (editingCompany) {
        const updated = await updateCompany(editingCompany.id, {
          name: newCompany.name,
          org_nr: newCompany.org_nr,
          plan: newCompany.plan,
          status: newCompany.status
        });
        setCompanies(companies.map(c => c.id === editingCompany.id ? updated : c));
        toast.success('Företag uppdaterat');
      } else {
        // Om det är en trial, sätt utgångsdatum till 14 dagar framåt
        const expiresAt = newCompany.plan === 'Trial' 
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() 
          : null;

        const created = await createCompany({
          name: newCompany.name,
          org_nr: newCompany.org_nr,
          plan: newCompany.plan,
          status: newCompany.plan === 'Trial' ? 'trial' : 'active',
          expires_at: expiresAt
        });
        
        setCompanies([...companies, created]);
        toast.success('Företag skapat');
      }
      
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      setNewCompany({ name: '', org_nr: '', plan: 'Trial', status: 'active' });
    } catch (error) {
      console.error('Failed to save company', error);
      alert('Kunde inte spara företaget.');
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
            <button className="btn-primary" onClick={() => setIsCompanyModalOpen(true)}>
              <Plus size={18} /> Nytt Företag
            </button>
          )}
          {activeTab === 'users' && (
            <button className="btn-primary" onClick={() => setIsUserInfoModalOpen(true)}>
              <Plus size={18} /> Ny Användare
            </button>
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
                  <p className="kpi-value">{companies.length}</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon task-icon"><CheckCircle size={24} /></div>
                <div className="kpi-content">
                  <h3>Aktiva Kunder</h3>
                  <p className="kpi-value">{companies.filter(c => c.status === 'active').length}</p>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-icon avvikelse-icon"><Clock size={24} /></div>
                <div className="kpi-content">
                  <h3>Pågående Testperioder</h3>
                  <p className="kpi-value">{companies.filter(c => c.status === 'trial').length}</p>
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
              <p>Härifrån hanterar du systemets kunder och användare. Databasen är nu uppdaterad för att stödja flera företag (multi-tenancy) och granulära behörigheter.</p>
              <p><strong>Tips:</strong> Gå till fliken "Användare & Roller" för att testa att ändra behörigheter på en användare!</p>
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
                  {companies.map(company => (
                    <tr key={company.id}>
                      <td className="font-medium">{company.name}</td>
                      <td className="text-muted">{company.org_nr || '-'}</td>
                      <td>{company.plan || 'Basic'}</td>
                      <td>{renderStatusBadge(company.status || 'active')}</td>
                      <td>-</td>
                      <td className="text-muted">{company.expires_at ? new Date(company.expires_at).toLocaleDateString() : '-'}</td>
                      <td className="actions-cell">
                        <button className="btn-secondary btn-sm" onClick={() => openEditCompanyModal(company)}>Redigera</button>
                      </td>
                    </tr>
                  ))}
                  {companies.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">Inga företag hittades. Skapa ett nytt!</td>
                    </tr>
                  )}
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
                    <th>Företag</th>
                    <th>Huvudroll</th>
                    <th>Behörigheter</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium">{u.username || 'Okänd'}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{u.email}</div>
                      </td>
                      <td className="text-muted">
                        {companies.find(c => c.id === u.company_id)?.name || 'Inget företag'}
                      </td>
                      <td>
                        <span className={`role-badge ${u.role === 'admin' || u.role === 'superadmin' ? 'admin' : 'user'}`}>
                          {u.role === 'admin' || u.role === 'superadmin' ? <Shield size={12} /> : null}
                          {u.role === 'superadmin' ? 'Superadmin' : u.role === 'admin' ? 'Företagsadmin' : 'Användare'}
                        </span>
                      </td>
                      <td>
                        {renderPermissions(u.permissions)}
                      </td>
                      <td className="actions-cell">
                        <button className="btn-secondary btn-sm" onClick={() => openEditModal(u)}>Hantera</button>
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

      {/* Edit User Modal */}
      {isModalOpen && editingUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Hantera Användare</h2>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Namn</label>
                <input type="text" value={editingUser.display_name || editingUser.username || ''} disabled className="form-control" />
              </div>
              <div className="form-group">
                <label>Huvudroll</label>
                <select 
                  className="form-control" 
                  value={editingUser.role} 
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                >
                  <option value="user">Användare</option>
                  <option value="admin">Företagsadmin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </div>
              
              <div className="form-group mt-4">
                <label>Koppla till Företag</label>
                <select 
                  className="form-control" 
                  value={editingUser.company_id || ''} 
                  onChange={(e) => setEditingUser({...editingUser, company_id: e.target.value || null})}
                >
                  <option value="">-- Inget företag valt --</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group mt-4">
                <label>Granulära Behörigheter</label>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Välj vilka specifika åtgärder användaren får göra i systemet.</p>
                
                <div className="checkbox-list">
                  <label className="checkbox-item">
                    <input type="checkbox" checked={editingUser.permissions?.includes('viewer')} onChange={() => togglePermission('viewer')} />
                    <span><strong>Viewer:</strong> Kan endast läsa data</span>
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={editingUser.permissions?.includes('read_write')} onChange={() => togglePermission('read_write')} />
                    <span><strong>Read/Write:</strong> Kan skapa och redigera data</span>
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={editingUser.permissions?.includes('approve')} onChange={() => togglePermission('approve')} />
                    <span><strong>Approve:</strong> Kan godkänna och utreda (t.ex. avvikelser)</span>
                  </label>
                  <label className="checkbox-item">
                    <input type="checkbox" checked={editingUser.permissions?.includes('archive')} onChange={() => togglePermission('archive')} />
                    <span><strong>Archive:</strong> Kan stänga och arkivera ärenden</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Avbryt</button>
              <button className="btn-primary" onClick={handleSaveUser}>Spara ändringar</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Company Modal */}
      {isCompanyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingCompany ? 'Redigera Företag' : 'Skapa Nytt Företag'}</h2>
              <button className="icon-btn" onClick={() => { setIsCompanyModalOpen(false); setEditingCompany(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Företagsnamn *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  placeholder="T.ex. Acme Corp AB"
                />
              </div>
              <div className="form-group mt-3">
                <label>Organisationsnummer</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCompany.org_nr}
                  onChange={(e) => setNewCompany({...newCompany, org_nr: e.target.value})}
                  placeholder="XXXXXX-XXXX"
                />
              </div>
              <div className="form-group mt-3">
                <label>Licensplan</label>
                <select 
                  className="form-control" 
                  value={newCompany.plan}
                  onChange={(e) => setNewCompany({...newCompany, plan: e.target.value})}
                >
                  <option value="Trial">Testversion (14 dagar)</option>
                  <option value="Basic">Basic</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              {editingCompany && (
                <div className="form-group mt-3">
                  <label>Status</label>
                  <select 
                    className="form-control" 
                    value={newCompany.status}
                    onChange={(e) => setNewCompany({...newCompany, status: e.target.value})}
                  >
                    <option value="active">Aktiv</option>
                    <option value="trial">Testperiod</option>
                    <option value="expired">Utgången</option>
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { setIsCompanyModalOpen(false); setEditingCompany(null); }}>Avbryt</button>
              <button className="btn-primary" onClick={handleCreateOrUpdateCompany}>
                {editingCompany ? 'Spara ändringar' : 'Skapa Företag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {isUserInfoModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Lägg till Användare</h2>
              <button className="icon-btn" onClick={() => setIsUserInfoModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="info-card" style={{ marginTop: 0 }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={20} /> Hur användare läggs till
                </h3>
                <p>Av säkerhetsskäl skapas användare automatiskt första gången de loggar in i systemet med sitt Google-konto.</p>
                <ol style={{ paddingLeft: '1.5rem', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                  <li style={{ marginBottom: '0.5rem' }}>Be användaren gå till systemets inloggningssida och logga in.</li>
                  <li style={{ marginBottom: '0.5rem' }}>När de loggat in dyker de upp i listan här bakom.</li>
                  <li>Klicka på <strong>Hantera</strong> för att koppla dem till rätt företag och ge dem rätt behörigheter.</li>
                </ol>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setIsUserInfoModalOpen(false)}>Jag förstår</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
