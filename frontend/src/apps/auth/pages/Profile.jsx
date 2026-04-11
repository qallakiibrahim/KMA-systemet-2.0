import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../shared/api/AuthContext';
import { User, Mail, Shield, Building, Calendar, CheckCircle, Settings, CreditCard, Globe, MapPin, Phone, Save, Activity, Edit2, X, History, Bell, Trash2, Clock, ChevronRight } from 'lucide-react';
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
  const [editData, setEditData] = useState({
    display_name: '',
    username: ''
  });
  const [notifications, setNotifications] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);

  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    } else if (activeTab === 'history') {
      fetchUserLogs();
    }
  }, [activeTab]);

  const fetchNotifications = async () => {
    setIsLoadingNotifs(true);
    try {
      const data = await getNotifications();
      // Filter for current user if needed, but getNotifications might already be scoped or we filter here
      // Assuming getNotifications returns all for now, we should filter by user_id if the API doesn't
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
      const data = await getAuditLogs(1, 50, { user_id: user?.id });
      setAuditLogs(data.data || []);
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
          <History size={18} /> Min Historik
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
              <h3><History size={20} /> Din Händelsehistorik</h3>
              <p className="text-muted mb-4">Här ser du dina senaste aktiviteter i systemet.</p>
              
              {isLoadingLogs ? (
                <div className="loading-inline">Laddar historik...</div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state-simple">
                  <History size={40} className="text-muted" style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Ingen historik hittades</p>
                </div>
              ) : (
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
                        <div className="audit-entity">
                          <strong>{log.entity_type}:</strong> {log.entity_name}
                        </div>
                        {log.action === 'UPDATE' && log.changes && log.changes.old && log.changes.new && (
                          <div className="audit-changes-mini">
                            {Object.keys(log.changes.new).map(key => {
                              if (JSON.stringify(log.changes.old[key]) !== JSON.stringify(log.changes.new[key]) && 
                                  !['updated_at', 'company_id', 'creator_uid'].includes(key)) {
                                return (
                                  <div key={key} className="change-row-mini">
                                    <span className="key">{key}:</span>
                                    <span className="old">{String(log.changes.old[key] || 'n/a')}</span>
                                    <ChevronRight size={10} />
                                    <span className="new">{String(log.changes.new[key] || 'n/a')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
    </div>
  );
};

export default Profile;
