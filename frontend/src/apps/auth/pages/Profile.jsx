import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/api/AuthContext';
import { User, Mail, Shield, Building, Calendar, CheckCircle, Settings, CreditCard, Globe, MapPin, Phone, Save, Activity, Edit2, X, History, Bell, Trash2, Clock, ChevronRight, Eye } from 'lucide-react';
import CompanyList from '../../company/pages/CompanyList';
import AdminPanel from '../../admin/pages/AdminPanel';
import { toast } from 'react-toastify';
import { getAuditLogs } from '../../../shared/api/auditLog';
import { getNotifications, deleteNotification, updateNotification } from '../../notification/api/notification';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import '../styles/Profile.css';

const Profile = () => {
  const { user, userProfile, loading, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [editData, setEditData] = useState({
    display_name: '',
    username: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logPageSize] = useState(20);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [logEntityFilter, setLogEntityFilter] = useState('');
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'history') {
      fetchUserLogs();
    }
  }, [activeTab, logPage, showAllLogs, logEntityFilter]);

  const fetchNotifications = async () => {
    setIsLoadingNotifs(true);
    try {
      const data = await getNotifications();
      const userNotifs = data.filter(n => n.user_id === user?.id);
      setNotifications(userNotifs);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  const fetchUserLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const filters = showAllLogs ? {} : { user_id: user?.id };
      if (logEntityFilter) {
        filters.entity_type = logEntityFilter;
      }
      const data = await getAuditLogs(logPage, logPageSize, filters);
      setAuditLogs(data.data || []);
      setTotalLogs(data.count || 0);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleClearNotification = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success('Notis borttagen');
    } catch (error) {
      toast.error('Kunde inte ta bort notis');
    }
  };

  const handleClearAllNotifications = async () => {
    if (!window.confirm('Är du säker på att du vill rensa alla notiser?')) return;
    try {
      for (const n of notifications) {
        await deleteNotification(n.id);
      }
      setNotifications([]);
      toast.success('Alla notiser rensade');
    } catch (error) {
      toast.error('Kunde inte rensa alla notiser');
    }
  };

  if (loading) return <div className="loading">Laddar profil...</div>;
  if (!userProfile) return <div className="loading">Kunde inte ladda profil. Försök logga ut och in igen.</div>;

  const canManageCompany = userProfile.role === 'admin' || userProfile.role === 'superadmin';
  const isSuperAdmin = userProfile.role === 'superadmin';

  const handleEditClick = () => {
    setEditData({
      display_name: userProfile.display_name || '',
      username: userProfile.username || ''
    });
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        display_name: editData.display_name,
        username: editData.username
      });
      toast.success('Profilen har uppdaterats');
      setIsEditing(false);
    } catch (error) {
      toast.error('Kunde inte uppdatera profilen');
    }
  };

  const renderPermissions = (permissions) => {
    if (!permissions || permissions.length === 0) return 'Inga specifika behörigheter';
    return permissions.map(p => {
      switch(p) {
        case 'viewer': return 'Endast läsa';
        case 'read_write': return 'Läsa & Skriva';
        case 'approve': return 'Godkänna';
        case 'archive': return 'Arkivera';
        default: return p;
      }
    }).join(', ');
  };

  const fieldTranslations = {
    title: 'Titel',
    description: 'Beskrivning',
    status: 'Status',
    priority: 'Prioritet',
    due_date: 'Förfallodatum',
    dueDate: 'Förfallodatum',
    assigned_to: 'Tilldelad till',
    category: 'Kategori',
    severity: 'Allvarlighetsgrad',
    probability: 'Sannolikhet',
    impact: 'Konsekvens',
    mitigation_plan: 'Åtgärdsplan',
    version: 'Version',
    content: 'Innehåll',
    is_template: 'Är mall',
    process_id: 'Process-ID',
    parent_id: 'Förälder-ID',
    display_name: 'Visningsnamn',
    username: 'Användarnamn',
    role: 'Roll',
    company_name: 'Företagsnamn',
    todo: 'Att göra',
    'in-progress': 'Pågående',
    done: 'Klar',
    Low: 'Låg',
    Medium: 'Medium',
    High: 'Hög',
    Critical: 'Kritisk',
    likelihood: 'Sannolikhet',
    risk_score: 'Riskpoäng',
    responsible_name: 'Ansvarig',
    deadline: 'Deadline',
    start_date: 'Startdatum',
    end_date: 'Slutdatum',
    all_day: 'Heldag',
    recurrence: 'Upprepning',
    iso_chapter: 'ISO-kapitel',
    file_url: 'Fil-URL',
    type: 'Typ',
    name: 'Namn',
    address: 'Adress',
    org_nr: 'Org.nr',
    phone: 'Telefon',
    email: 'E-post',
    website: 'Webbplats',
    is_global: 'Global',
    creator_uid: 'Skapad av (ID)',
    created_at: 'Skapad den',
    updated_at: 'Uppdaterad den',
    RISK: 'Risk',
    AVVIKELSE: 'Avvikelse',
    PROCESS: 'Process',
    DOCUMENT: 'Dokument',
    TASK: 'Uppgift',
    USER_PROFILE: 'Användarprofil',
    COMPANY: 'Företag',
    CALENDAR_EVENT: 'Kalenderhändelse',
    INVITATION: 'Inbjudan',
    USER_ROLE: 'Användarroll'
  };

  const translateEntityType = (type) => fieldTranslations[type] || type;
  const translateField = (field) => fieldTranslations[field] || field;
  const translateValue = (value) => {
    if (value === null || value === undefined) return 'n/a';
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
    return fieldTranslations[value] || String(value);
  };

  const getActionText = (action) => {
    switch (action) {
      case 'CREATE': return 'Skapade';
      case 'UPDATE': return 'Uppdaterade';
      case 'DELETE': return 'Tog bort';
      default: return action;
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          {userProfile.display_name ? userProfile.display_name.charAt(0).toUpperCase() : <User size={48} />}
        </div>
        <div className="profile-title">
          <h1>{userProfile.display_name || userProfile.username || 'Användare'}</h1>
          <p className="text-muted">{userProfile.role === 'superadmin' ? 'Systemägare' : userProfile.role === 'admin' ? 'Företagsadministratör' : 'Användare'}</p>
        </div>
      </div>

      <div className="profile-tabs">
        <button 
          className={`profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <User size={18} /> Personlig Info
        </button>
        <button 
          className={`profile-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} /> Notiser
        </button>
        <button 
          className={`profile-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} /> {canManageCompany ? 'Händelselogg' : 'Min Historik'}
        </button>
        {canManageCompany && (
          <button 
            className={`profile-tab-btn ${activeTab === 'company' ? 'active' : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <Building size={18} /> Företagsinställningar
          </button>
        )}
        {isSuperAdmin && (
          <button 
            className={`profile-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Settings size={18} /> Admin Portal
          </button>
        )}
      </div>

      <div className="profile-tab-content">
        {activeTab === 'notifications' && (
          <div className="profile-notifications-section">
            <div className="profile-card full-width">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3><Bell size={20} /> Dina Notifikationer</h3>
                {notifications.length > 0 && (
                  <button className="btn-secondary btn-sm" onClick={handleClearAllNotifications}>
                    Rensa alla
                  </button>
                )}
              </div>
              
              {isLoadingNotifs ? (
                <div className="loading-inline">Laddar notiser...</div>
              ) : notifications.length === 0 ? (
                <div className="empty-state-simple">
                  <Bell size={40} className="text-muted" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Du har inga nya notiser</p>
                </div>
              ) : (
                <div className="notifications-list">
                  {notifications.map(n => (
                    <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                      <div className="notification-icon">
                        <Bell size={16} />
                      </div>
                      <div className="notification-content">
                        <p className="notification-text">{n.message}</p>
                        <span className="notification-time">
                          {format(new Date(n.created_at), 'yyyy-MM-dd HH:mm', { locale: sv })}
                        </span>
                      </div>
                      <button className="btn-icon-mini delete" onClick={() => handleClearNotification(n.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="profile-history-section">
            <div className="profile-card full-width">
              <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div className="history-title">
                  <h3><History size={20} /> {showAllLogs ? 'Systemets Händelselogg' : 'Din Händelsehistorik'}</h3>
                  <p className="text-muted">
                    {showAllLogs 
                      ? 'Här visas alla aktiviteter i systemet (Admin-vy).' 
                      : 'Här ser du dina senaste aktiviteter i systemet.'}
                  </p>
                </div>
                {canManageCompany && (
                  <div className="flex gap-2 items-center history-controls">
                    <select 
                      className="form-control btn-sm" 
                      style={{ width: 'auto', minWidth: '150px', height: '36px', fontSize: '0.85rem' }}
                      value={logEntityFilter}
                      onChange={(e) => { setLogEntityFilter(e.target.value); setLogPage(1); }}
                    >
                      <option value="">Alla typer</option>
                      <option value="AVVIKELSE">Avvikelser</option>
                      <option value="RISK">Risker</option>
                      <option value="PROCESS">Processer</option>
                      <option value="DOCUMENT">Dokument</option>
                      <option value="TASK">Uppgifter</option>
                      <option value="USER_PROFILE">Användarprofiler</option>
                      <option value="COMPANY">Företag</option>
                      <option value="CALENDAR_EVENT">Kalender</option>
                    </select>
                    <div className="flex gap-1" style={{ marginLeft: '0.5rem' }}>
                      <button 
                        className={`btn ${!showAllLogs ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => { setShowAllLogs(false); setLogPage(1); }}
                      >
                        Min historik
                      </button>
                      <button 
                        className={`btn ${showAllLogs ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => { setShowAllLogs(true); setLogPage(1); }}
                      >
                        Visa alla
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {isLoadingLogs ? (
                <div className="loading-inline">Laddar historik...</div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state-simple">
                  <History size={40} className="text-muted" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Ingen historik hittades</p>
                </div>
              ) : (
                <>
                  <div className="audit-timeline profile-timeline">
                    {auditLogs.map(log => (
                      <div key={log.id} className="audit-item">
                        <div className="audit-dot"></div>
                        <div className="audit-content">
                          <div className="audit-header">
                            <span className={`audit-action-badge ${log.action.toLowerCase()}`}>
                              {log.action}
                            </span>
                            <span className="audit-time">
                              {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm', { locale: sv })}
                            </span>
                          </div>
                          <div className="audit-entity" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className={`entity-badge ${log.entity_type?.toLowerCase()}`} style={{ 
                              fontSize: '0.65rem', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              border: '1px solid #e2e8f0'
                            }}>
                              {translateEntityType(log.entity_type)}
                            </span>
                            <span style={{ fontWeight: '500' }}>{log.entity_name}</span>
                            {showAllLogs && (
                              <span className="audit-user-info" style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#666' }}>
                                • {log.user_email}
                              </span>
                            )}
                          </div>
                          <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                              {log.action === 'UPDATE' && log.changes && log.changes.old && log.changes.new && (
                                <div className="audit-changes-mini">
                                  {Object.keys(log.changes.new).map(key => {
                                    if (JSON.stringify(log.changes.old[key]) !== JSON.stringify(log.changes.new[key]) && 
                                        !['updated_at', 'company_id', 'creator_uid', 'id'].includes(key)) {
                                      return (
                                        <div key={key} className="change-row-mini">
                                          <span className="key">{translateField(key)}:</span>
                                          <span className="old">{translateValue(log.changes.old[key])}</span>
                                          <ChevronRight size={10} />
                                          <span className="new">{translateValue(log.changes.new[key])}</span>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                              {log.action === 'CREATE' && (
                                <div className="audit-changes-mini">
                                  <span className="text-success" style={{ fontSize: '0.75rem', fontWeight: 500 }}>Nytt objekt skapat</span>
                                </div>
                              )}
                            </div>
                            <button 
                              className="btn-icon-mini eye-btn" 
                              onClick={() => {
                                console.log('Opening log:', log.id);
                                setSelectedLog(log);
                              }}
                              title="Visa detaljer"
                              style={{ 
                                marginLeft: '1rem',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'var(--primary-color)',
                                color: 'white',
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {totalLogs > logPageSize && (
                    <div className="pagination-simple" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                      <button 
                        className="btn-secondary btn-sm" 
                        disabled={logPage === 1}
                        onClick={() => setLogPage(p => p - 1)}
                      >
                        Föregående
                      </button>
                      <span style={{ fontSize: '0.9rem' }}>Sida {logPage} av {Math.ceil(totalLogs / logPageSize)}</span>
                      <button 
                        className="btn-secondary btn-sm" 
                        disabled={logPage >= Math.ceil(totalLogs / logPageSize)}
                        onClick={() => setLogPage(p => p + 1)}
                      >
                        Nästa
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {activeTab === 'personal' && (
          <div className="profile-grid">
            <div className="profile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3><User size={20} /> Personlig Information</h3>
                {!isEditing && (
                  <button className="btn-icon-mini" onClick={handleEditClick} title="Redigera profil">
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div className="edit-profile-form">
                  <div className="form-group">
                    <label>Visningsnamn</label>
                    <input 
                      type="text" 
                      value={editData.display_name} 
                      onChange={(e) => setEditData({...editData, display_name: e.target.value})}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Användarnamn</label>
                    <input 
                      type="text" 
                      value={editData.username} 
                      onChange={(e) => setEditData({...editData, username: e.target.value})}
                      className="form-control"
                    />
                  </div>
                  <div className="form-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn-primary" onClick={handleSaveProfile}>Spara</button>
                    <button className="btn-secondary" onClick={() => setIsEditing(false)}>Avbryt</button>
                  </div>
                </div>
              ) : (
                <div className="info-list">
                  <div className="info-item">
                    <span className="label">Namn:</span>
                    <span className="value">{userProfile.display_name || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">E-post:</span>
                    <span className="value">{user?.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Användarnamn:</span>
                    <span className="value">{userProfile.username || '-'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="profile-card">
              <h3><Shield size={20} /> Roll & Behörigheter</h3>
              <div className="info-list">
                <div className="info-item">
                  <span className="label">Roll:</span>
                  <span className="value">{userProfile.role === 'superadmin' ? 'Superadmin' : userProfile.role === 'admin' ? 'Admin' : 'Användare'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Behörigheter:</span>
                  <span className="value">{renderPermissions(userProfile.permissions)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Företag:</span>
                  <span className="value">{userProfile.company_name || userProfile.company || 'Ej kopplad'}</span>
                </div>
              </div>
            </div>

            <div className="profile-card full-width">
              <h3><CheckCircle size={20} /> Systemstatus</h3>
              <p>Ditt konto är aktivt och du har tillgång till systemets moduler baserat på dina behörigheter.</p>
              {userProfile.role === 'superadmin' && (
                <div className="admin-notice">
                  <Shield size={16} />
                  <span>Du har Superadmin-rättigheter och kan hantera hela systemet via Admin-tabben ovan.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'company' && canManageCompany && (
          <div className="profile-company-section">
            <CompanyList isEmbedded={true} />
          </div>
        )}

        {activeTab === 'admin' && isSuperAdmin && (
          <div className="profile-admin-section">
            <AdminPanel isEmbedded={true} />
          </div>
        )}
      </div>
      {selectedLog && (
        <div className="fixed-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="profile-modal" onClick={e => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h3><History size={20} /> Händelsedetaljer</h3>
              <button onClick={() => setSelectedLog(null)} className="btn-icon-mini" style={{ width: '40px', height: '40px' }}>
                <X size={24} />
              </button>
            </div>
            <div className="profile-modal-body">
              <div className="iso-audit-grid">
                <div className="iso-audit-item">
                  <label>Vem</label>
                  <div className="value">
                    <User size={14} />
                    <span>{selectedLog.user_email || 'Systemet / Okänd'}</span>
                    <span className="text-xs text-muted" style={{ marginLeft: '0.5rem' }}>
                      (ID: {selectedLog.user_id?.substring(0, 8) || 'N/A'})
                    </span>
                  </div>
                </div>
                <div className="iso-audit-item">
                  <label>När</label>
                  <div className="value">
                    <Clock size={14} />
                    <span>{selectedLog.created_at ? format(new Date(selectedLog.created_at), 'PPPP p', { locale: sv }) : 'Okänt datum'}</span>
                  </div>
                </div>
                <div className="iso-audit-item">
                  <label>Handling</label>
                  <div className="value">
                    <span className={`audit-action-badge ${(selectedLog.action || 'UPDATE').toLowerCase()}`}>
                      {getActionText(selectedLog.action)}
                    </span>
                  </div>
                </div>
                <div className="iso-audit-item">
                  <label>Objekt-typ</label>
                  <div className="value">
                    <span className="entity-badge-large" style={{ 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      backgroundColor: 'var(--primary-color)', 
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {translateEntityType(selectedLog.entity_type)}
                    </span>
                  </div>
                </div>
                <div className="iso-audit-item">
                  <label>Objekt-namn</label>
                  <div className="value">
                    <strong>{selectedLog.entity_name || 'Okänt objekt'}</strong>
                  </div>
                </div>
              </div>

              <div className="iso-audit-summary" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid var(--primary-color)' }}>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155' }}>
                  <strong>Händelse:</strong> {selectedLog.user_email || 'Systemet'} {(getActionText(selectedLog.action) || '').toLowerCase()} {(translateEntityType(selectedLog.entity_type) || 'objektet').toLowerCase()} <em>"{selectedLog.entity_name || 'Okänt'}"</em> den {selectedLog.created_at ? format(new Date(selectedLog.created_at), 'd MMMM yyyy', { locale: sv }) : 'okänt datum'}.
                </p>
              </div>

              <div className="iso-changes-section">
                <h4>Ändringshistorik</h4>
                {selectedLog.changes && selectedLog.changes.old && selectedLog.changes.new ? (
                  <div className="iso-changes-table">
                    <div className="iso-changes-header">
                      <span>Fält</span>
                      <span>Före</span>
                      <span>Efter</span>
                    </div>
                    {Object.keys(selectedLog.changes.new).map(key => {
                      const oldVal = selectedLog.changes.old[key];
                      const newVal = selectedLog.changes.new[key];
                      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) return null;
                      if (['updated_at', 'company_id', 'creator_uid', 'id'].includes(key)) return null;

                      return (
                        <div key={key} className="iso-change-row">
                          <span className="field-name">{translateField(key)}</span>
                          <span className="old-value">{translateValue(oldVal)}</span>
                          <span className="new-value">{translateValue(newVal)}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="iso-no-changes">
                    <pre>{JSON.stringify(selectedLog.changes, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
            <div className="profile-modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedLog(null)}>Stäng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
