import React from 'react';
import { useAuth } from '../../../shared/api/AuthContext';
import { User, Mail, Shield, Building, Calendar, CheckCircle, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/Profile.css';

const Profile = () => {
  const { user, userProfile, loading } = useAuth();

  if (loading) return <div className="loading">Laddar profil...</div>;
  if (!userProfile) return <div className="loading">Kunde inte ladda profil. Försök logga ut och in igen.</div>;

  const canManageCompany = userProfile.role === 'admin' || userProfile.role === 'superadmin';

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

      <div className="profile-grid">
        <div className="profile-card">
          <h3><User size={20} /> Personlig Information</h3>
          <div className="info-list">
            <div className="info-item">
              <span className="label">E-post:</span>
              <span className="value">{user?.email}</span>
            </div>
            <div className="info-item">
              <span className="label">Användarnamn:</span>
              <span className="value">{userProfile.username || '-'}</span>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <div className="card-header-flex">
            <h3><Building size={20} /> Företagsinformation</h3>
            {canManageCompany && (
              <Link to="/company" className="btn-settings-link">
                <Settings size={16} /> Inställningar
              </Link>
            )}
          </div>
          <div className="info-list">
            <div className="info-item">
              <span className="label">Företag:</span>
              <span className="value">{userProfile.company_name || userProfile.company || 'Ej kopplad till företag'}</span>
            </div>
            <div className="info-item">
              <span className="label">Roll:</span>
              <span className="value">{userProfile.role === 'superadmin' ? 'Superadmin' : userProfile.role === 'admin' ? 'Admin' : 'Användare'}</span>
            </div>
            <div className="info-item">
              <span className="label">Behörigheter:</span>
              <span className="value">{renderPermissions(userProfile.permissions)}</span>
            </div>
          </div>
        </div>

        <div className="profile-card full-width">
          <h3><CheckCircle size={20} /> Systemstatus</h3>
          <p>Ditt konto är aktivt och du har tillgång till systemets moduler baserat på dina behörigheter.</p>
          {userProfile.role === 'superadmin' && (
            <div className="admin-notice">
              <Shield size={16} />
              <span>Du har Superadmin-rättigheter och kan hantera hela systemet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
