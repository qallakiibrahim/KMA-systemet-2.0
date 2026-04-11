import React, { useEffect, useState } from 'react';
import { Users, Building, Activity, Plus, Search, MoreVertical, Shield, CheckCircle, Clock, XCircle, Eye, Edit2, CheckSquare, Archive, X, Info, Trash2, Key, Bot } from 'lucide-react';
import { getUsers, updateUser, getPendingInvitations, inviteUser, deleteInvitation } from '../api/users';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../../company/api/company';
import { useAuth } from '../../../shared/api/AuthContext';
import { toast } from 'react-toastify';
import '../styles/AdminPanel.css';

const AdminPanel = ({ isEmbedded = false }) => {
  const { currentUser, userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newInvite, setNewInvite] = useState({ email: '', company_id: '', role: 'user' });
  
  const onboardingSteps = [
    {
      title: '1. Skapa Företag',
      description: 'Gå till fliken "Företag" och klicka på "Nytt Företag". Ange namn, organisationsnummer och välj en licensplan.',
      icon: <Building size={20} />
    },
    {
      title: '2. Bjud in Användare',
      description: 'Be användaren logga in med sitt Google-konto på inloggningssidan. Systemet skapar automatiskt en profil för dem vid första inloggningen.',
      icon: <Users size={20} />
    },
    {
      title: '3. Koppla Användare till Företag',
      description: 'Gå till fliken "Användare". Hitta den nya användaren i listan, klicka på "Hantera" och välj rätt företag i rullistan.',
      icon: <CheckCircle size={20} />
    },
    {
      title: '4. Sätt Behörigheter',
      description: 'I samma "Hantera"-vy, välj roll (Företagsadmin eller Användare) och bocka i de granulära behörigheter användaren ska ha.',
      icon: <Shield size={20} />
    }
  ];
  
  // Modal state
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [newCompany, setNewCompany] = useState({ 
    name: '', 
    org_nr: '', 
    plan: 'Trial', 
    status: 'active',
    address: '',
    city: '',
    zip_code: '',
    country: 'Sverige',
    phone: '',
    email: '',
    website: ''
  });
  
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersData, companiesData, invitesData] = await Promise.all([
          getUsers(),
          getCompanies(),
          getPendingInvitations()
        ]);
        setUsers(usersData);
        setCompanies(companiesData);
        setInvitations(invitesData);
      } catch (error) {
        console.error('Failed to fetch admin data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!newInvite.email || !newInvite.company_id) {
      toast.error('Fyll i alla obligatoriska fält');
      return;
    }
    try {
      await inviteUser(newInvite, currentUser);
      toast.success('Inbjudan skickad!');
      setIsInviteModalOpen(false);
      setNewInvite({ email: '', company_id: '', role: 'user' });
      // Refresh data
      const [usersData, companiesData, invitesData] = await Promise.all([
        getUsers(),
        getCompanies(),
        getPendingInvitations()
      ]);
      setUsers(usersData);
      setCompanies(companiesData);
      setInvitations(invitesData);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error(`Kunde inte skicka inbjudan: ${error.message || 'Okänt fel'}`);
    }
  };

  const handleDeleteInvite = async (id) => {
    if (!window.confirm('Är du säker på att du vill ta bort denna inbjudan?')) return;
    try {
      await deleteInvitation(id, currentUser);
      toast.success('Inbjudan borttagen');
      // Refresh data
      const invitesData = await getPendingInvitations();
      setInvitations(invitesData);
    } catch (error) {
      console.error('Error deleting invitation:', error);
      toast.error('Kunde inte ta bort inbjudan');
    }
  };

  const handleDeleteCompany = async (id, name) => {
    if (name === 'SafeQMS') {
      toast.error('Systemets huvudföretag kan inte tas bort.');
      return;
    }
    
    if (!window.confirm(`Är du säker på att du vill ta bort företaget "${name}"? Detta kommer även att påverka alla användare och data kopplat till företaget.`)) return;
    
    try {
      await deleteCompany(id, currentUser);
      toast.success('Företaget har tagits bort');
      // Refresh data
      const companiesData = await getCompanies();
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error(`Kunde inte ta bort företaget: ${error.message || 'Okänt fel'}`);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.org_nr || '').includes(searchTerm)
  );

  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="loading-spinner">Laddar adminpanel...</div>;

  if (userProfile?.role !== 'superadmin' && userProfile?.role !== 'admin') {
    return (
      <div className="admin-access-denied">
        <Shield size={48} className="text-danger" />
        <h1>Åtkomst nekad</h1>
        <p>Du har inte behörighet att se denna sida. Din roll är: {userProfile?.role || 'okänd'}</p>
        <button className="btn btn-primary" onClick={() => window.location.href = '/'}>Tillbaka till start</button>
      </div>
    );
  }

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
      }, currentUser);
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
      org_nr: company.org_nr || '',
      plan: company.plan || 'Basic',
      status: company.status || 'active',
      address: company.address || '',
      city: company.city || '',
      zip_code: company.zip_code || '',
      country: company.country || 'Sverige',
      phone: company.phone || '',
      email: company.email || '',
      website: company.website || ''
    });
    setIsCompanyModalOpen(true);
  };

  const handleCreateOrUpdateCompany = async () => {
    if (!newCompany.name) return alert('Företagsnamn är obligatoriskt');
    
    const companyData = {
      name: newCompany.name,
      org_nr: newCompany.org_nr,
      plan: newCompany.plan,
      status: newCompany.status,
      address: newCompany.address,
      city: newCompany.city,
      zip_code: newCompany.zip_code,
      country: newCompany.country,
      phone: newCompany.phone,
      email: newCompany.email,
      website: newCompany.website
    };
    
    try {
      if (editingCompany) {
        const updated = await updateCompany(editingCompany.id, companyData, currentUser);
        setCompanies(companies.map(c => c.id === editingCompany.id ? updated : c));
        toast.success('Företag uppdaterat');
      } else {
        // Om det är en trial, sätt utgångsdatum till 14 dagar framåt
        const expiresAt = newCompany.plan === 'Trial' 
          ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() 
          : null;

        const created = await createCompany({
          ...companyData,
          status: newCompany.plan === 'Trial' ? 'trial' : 'active',
          expires_at: expiresAt
        }, currentUser);
        
        setCompanies([...companies, created]);
        toast.success('Företag skapat');
      }
      
      setIsCompanyModalOpen(false);
      setEditingCompany(null);
      setNewCompany({ 
        name: '', 
        org_nr: '', 
        plan: 'Trial', 
        status: 'active',
        address: '',
        city: '',
        zip_code: '',
        country: 'Sverige',
        phone: '',
        email: '',
        website: ''
      });
    } catch (error) {
      console.error('Failed to save company', error);
      alert('Kunde inte spara företaget.');
    }
  };

  return (
    <div className={isEmbedded ? "admin-panel-embedded" : "admin-panel-container"}>
      {!isEmbedded && (
        <div className="admin-header">
          <div>
            <h1>Superadmin Portal</h1>
            <p>Hantera systemet, företag och licenser</p>
          </div>
          <div className="admin-actions">
            {isMobile && activeTab === 'companies' && (
              <button className="btn btn-primary" onClick={() => setIsCompanyModalOpen(true)}>
                <Plus size={18} /> Nytt Företag
              </button>
            )}
            {isMobile && activeTab === 'users' && (
              <button className="btn btn-primary" onClick={() => setIsUserInfoModalOpen(true)}>
                <Plus size={18} /> Ny Användare
              </button>
            )}
          </div>
        </div>
      )}

      {isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', gap: '1rem' }}>
          {activeTab === 'companies' && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsCompanyModalOpen(true)}>
              <Plus size={16} /> Nytt Företag
            </button>
          )}
          {activeTab === 'users' && (
            <button className="btn btn-primary btn-sm" onClick={() => setIsUserInfoModalOpen(true)}>
              <Plus size={16} /> Ny Användare
            </button>
          )}
        </div>
      )}

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
        <button 
          className={`tab-btn ${activeTab === 'invites' ? 'active' : ''}`}
          onClick={() => setActiveTab('invites')}
        >
          <Plus size={18} /> Inbjudningar
        </button>
        <button 
          className={`tab-btn ${activeTab === 'onboarding' ? 'active' : ''}`}
          onClick={() => setActiveTab('onboarding')}
        >
          <Info size={18} /> Onboarding Guide
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
                  <p className="kpi-value">{users.length}</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
              <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Sök på företagsnamn eller org.nr..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {!isMobile && (
                <button className="btn btn-primary" onClick={() => setIsCompanyModalOpen(true)}>
                  <Plus size={18} /> Nytt Företag
                </button>
              )}
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
                  {filteredCompanies.map(company => (
                    <tr key={company.id}>
                      <td className="font-medium">
                        {company.name}
                        {company.name === 'SafeQMS' && (
                          <span className="system-owner-badge" title="Systemägare">
                            <Shield size={12} /> Systemägare
                          </span>
                        )}
                      </td>
                      <td className="text-muted">{company.org_nr || '-'}</td>
                      <td>{company.plan || 'Basic'}</td>
                      <td>{renderStatusBadge(company.status || 'active')}</td>
                      <td>-</td>
                      <td className="text-muted">{company.expires_at ? new Date(company.expires_at).toLocaleDateString() : '-'}</td>
                      <td className="actions-cell">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditCompanyModal(company)}>Redigera</button>
                        <button 
                          className="btn btn-danger btn-sm ml-2" 
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          disabled={company.name === 'SafeQMS'}
                          title={company.name === 'SafeQMS' ? "Systemägaren kan inte tas bort" : "Ta bort företag"}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCompanies.length === 0 && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
              <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                <Search size={18} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Sök på namn eller e-post..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {!isMobile && (
                <button className="btn btn-primary" onClick={() => setIsUserInfoModalOpen(true)}>
                  <Plus size={18} /> Ny Användare
                </button>
              )}
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
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-medium">{u.display_name || u.username || u.email.split('@')[0]}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{u.email}</div>
                      </td>
                      <td className="text-muted">
                        {u.companies?.name || u.company_name || 'Inget företag'}
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
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(u)}>Hantera</button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">Inga användare hittades</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'onboarding' && (
          <div className="onboarding-guide">
            <div className="onboarding-header">
              <h2>Onboarding Guide</h2>
              <p>Följ dessa steg för att sätta upp ett nytt företag och deras användare i SafeQMS.</p>
            </div>
            
            <div className="onboarding-steps-grid">
              {onboardingSteps.map((step, index) => (
                <div key={index} className="onboarding-step-card">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-icon">{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>

            <div className="info-card mt-4">
              <h3><Shield size={20} /> Viktigt om Säkerhet</h3>
              <p>Användare kan inte se någon data förrän de har blivit kopplade till ett företag. Som Superadmin kan du se all data för alla företag för att kunna ge support, men vanliga användare är strikt isolerade till sitt eget <code>company_id</code>.</p>
              <p className="mt-2"><strong>Tips:</strong> Du tillhör nu företaget <strong>SafeQMS</strong>, vilket gör att du kan skapa standardmallar som sedan kan importeras av andra företag via Biblioteket.</p>
            </div>
          </div>
        )}
      </div>

      {activeTab === 'invites' && (
        <div className="admin-content">
          <div className="content-header">
            <h2>Hantering av Inbjudningar</h2>
            <button className="btn btn-primary" onClick={() => setIsInviteModalOpen(true)}>
              <Plus size={18} />
              <span>Bjud in Användare</span>
            </button>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>E-post</th>
                  <th>Företag</th>
                  <th>Roll</th>
                  <th>Skapad</th>
                  <th className="actions-cell">Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">Inga väntande inbjudningar</td>
                  </tr>
                ) : (
                  invitations.map((invite) => (
                    <tr key={invite.id}>
                      <td className="font-medium">{invite.email}</td>
                      <td>{invite.companies?.name || 'Inget företag'}</td>
                      <td>
                        <span className={`role-badge ${invite.role}`}>
                          {invite.role === 'admin' ? 'Administratör' : 'Användare'}
                        </span>
                      </td>
                      <td className="text-muted">{new Date(invite.created_at).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button className="action-btn delete" onClick={() => handleDeleteInvite(invite.id)} title="Ta bort inbjudan">
                          <XCircle size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Bjud in ny användare</h3>
              <button className="icon-btn" onClick={() => setIsInviteModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleInviteUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>E-postadress</label>
                  <input 
                    type="email" 
                    className="form-control"
                    value={newInvite.email}
                    onChange={(e) => setNewInvite({...newInvite, email: e.target.value})}
                    placeholder="anvandare@foretag.se"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Företag</label>
                  <select 
                    className="form-control"
                    value={newInvite.company_id}
                    onChange={(e) => setNewInvite({...newInvite, company_id: e.target.value})}
                    required
                  >
                    <option value="">Välj företag...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Roll</label>
                  <select 
                    className="form-control"
                    value={newInvite.role}
                    onChange={(e) => setNewInvite({...newInvite, role: e.target.value})}
                  >
                    <option value="user">Användare</option>
                    <option value="admin">Administratör</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsInviteModalOpen(false)}>Avbryt</button>
                <button type="submit" className="btn btn-primary">Skicka Inbjudan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {isModalOpen && editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
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
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Avbryt</button>
              <button className="btn btn-primary" onClick={handleSaveUser}>Spara ändringar</button>
            </div>
          </div>
        </div>
      )}

      {isCompanyModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingCompany ? 'Redigera Företag' : 'Skapa Nytt Företag'}</h2>
              <button className="icon-btn" onClick={() => { setIsCompanyModalOpen(false); setEditingCompany(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
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
                <div className="form-group">
                  <label>Organisationsnummer</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newCompany.org_nr}
                    onChange={(e) => setNewCompany({...newCompany, org_nr: e.target.value})}
                    placeholder="XXXXXX-XXXX"
                  />
                </div>
                <div className="form-group">
                  <label>E-post</label>
                  <input 
                    type="email" 
                    className="form-control" 
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                    placeholder="info@foretag.se"
                  />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input 
                    type="tel" 
                    className="form-control" 
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                    placeholder="08-123 45 67"
                  />
                </div>
                <div className="form-group col-span-2">
                  <label>Webbplats</label>
                  <input 
                    type="url" 
                    className="form-control" 
                    value={newCompany.website}
                    onChange={(e) => setNewCompany({...newCompany, website: e.target.value})}
                    placeholder="https://www.foretag.se"
                  />
                </div>
                <div className="form-group col-span-2">
                  <label>Gatuadress</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newCompany.address}
                    onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
                    placeholder="Storgatan 1"
                  />
                </div>
                <div className="form-group">
                  <label>Postnummer</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newCompany.zip_code}
                    onChange={(e) => setNewCompany({...newCompany, zip_code: e.target.value})}
                    placeholder="123 45"
                  />
                </div>
                <div className="form-group">
                  <label>Ort</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newCompany.city}
                    onChange={(e) => setNewCompany({...newCompany, city: e.target.value})}
                    placeholder="Stockholm"
                  />
                </div>
                <div className="form-group">
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
                  <div className="form-group">
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
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => { setIsCompanyModalOpen(false); setEditingCompany(null); }}>Avbryt</button>
              <button className="save-btn" onClick={handleCreateOrUpdateCompany}>
                {editingCompany ? 'Spara ändringar' : 'Skapa Företag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Info Modal */}
      {isUserInfoModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Lägg till Användare</h2>
              <button className="icon-btn" onClick={() => setIsUserInfoModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="info-card">
                <h3>
                  <Info size={20} /> Hur användare läggs till
                </h3>
                <p>Av säkerhetsskäl skapas användare automatiskt första gången de loggar in i systemet med sitt Google-konto.</p>
                <ol className="checkbox-list" style={{ paddingLeft: '1.5rem', marginTop: '1rem', color: 'var(--text-secondary)', listStyleType: 'decimal' }}>
                  <li style={{ marginBottom: '0.5rem' }}>Be användaren gå till systemets inloggningssida och logga in.</li>
                  <li style={{ marginBottom: '0.5rem' }}>När de loggat in dyker de upp i listan här bakom.</li>
                  <li>Klicka på <strong>Hantera</strong> för att koppla dem till rätt företag och ge dem rätt behörigheter.</li>
                </ol>
              </div>
            </div>
            <div className="modal-footer">
              <button className="save-btn" onClick={() => setIsUserInfoModalOpen(false)}>Jag förstår</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
