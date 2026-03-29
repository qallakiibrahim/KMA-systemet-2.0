import React, { useState } from 'react';
import { useAuth } from '../../../shared/api/AuthContext';
import { User, Mail, Shield, Building, Calendar, CheckCircle, Settings, CreditCard, Globe, MapPin, Phone, Save, Activity, Edit2, X } from 'lucide-react';
import CompanyList from '../../company/pages/CompanyList';
import AdminPanel from '../../admin/pages/AdminPanel';
import { toast } from 'react-toastify';
import '../styles/Profile.css';

const Profile = () => {
  const { user, userProfile, loading, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    display_name: '',
    username: ''
  });

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
