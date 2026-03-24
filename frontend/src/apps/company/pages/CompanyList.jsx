import React, { useEffect, useState } from 'react';
import { getCompanies, updateCompany } from '../api/company';
import { Building, Mail, Phone, Globe, MapPin, Save, Shield, CreditCard, Upload, X } from 'lucide-react';
import { useAuth } from '../../../shared/api/AuthContext';
import { supabase } from '../../../supabase';
import { toast } from 'react-toastify';
import '../styles/CompanyList.css';

const CompanyList = ({ isEmbedded = false }) => {
  const { userProfile, refreshProfile } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    org_nr: '', 
    address: '', 
    city: '', 
    zip_code: '', 
    country: '',
    phone: '',
    email: '',
    website: '',
    logo_url: ''
  });

  useEffect(() => {
    const fetchCompany = async () => {
      if (!userProfile?.company_id) {
        setLoading(false);
        return;
      }
      try {
        const allCompanies = await getCompanies();
        const myCompany = allCompanies.find(c => c.id === userProfile.company_id);
        if (myCompany) {
          setCompany(myCompany);
          setFormData({
            name: myCompany.name || '',
            org_nr: myCompany.org_nr || myCompany.org_number || '',
            address: myCompany.address || '',
            city: myCompany.city || '',
            zip_code: myCompany.zip_code || '',
            country: myCompany.country || '',
            phone: myCompany.phone || '',
            email: myCompany.email || '',
            website: myCompany.website || '',
            logo_url: myCompany.logo_url || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch company', error);
        toast.error('Kunde inte hämta företagsinformation');
      } finally {
        setLoading(false);
      }
    };

    fetchCompany();
  }, [userProfile]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Vänligen ladda upp en bildfil (PNG, JPG, etc)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Bilden är för stor. Max 2MB tillåts.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `company-${company.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Sparar direkt i roten av 'logos'-bucketen

      // Upload the file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase upload error details:', uploadError);
        if (uploadError.message?.toLowerCase().includes('bucket not found') || uploadError.error === 'Bucket not found') {
          throw new Error('Mappen "logos" saknas i Supabase Storage.');
        }
        if (uploadError.message?.toLowerCase().includes('row level security') || uploadError.statusCode === 403) {
          throw new Error('Behörighet saknas (RLS). Kör SQL-skriptet för policies i Supabase.');
        }
        throw new Error(`Uppladdningsfel: ${uploadError.message}`);
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      toast.success('Logotyp uppladdad!');
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error(error.message || 'Uppladdning misslyckades');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create a copy of formData and handle the org_nr/org_number mapping
      const dataToSave = { ...formData };
      
      // If the database uses org_number instead of org_nr, we need to map it
      if (company.org_number !== undefined && !company.org_nr) {
        dataToSave.org_number = dataToSave.org_nr;
        delete dataToSave.org_nr;
      }

      const updated = await updateCompany(company.id, dataToSave);
      setCompany(updated);
      setIsEditing(false);
      
      // Refresh the user profile to update the logo in the sidebar
      if (refreshProfile) {
        await refreshProfile();
      }
      
      toast.success('Företagsinställningar uppdaterade!');
    } catch (error) {
      console.error('Failed to save company', error);
      toast.error('Kunde inte spara ändringar');
    }
  };

  if (loading) return <div className="loading-spinner">Laddar inställningar...</div>;

  if (!company) {
    return (
      <div className={isEmbedded ? "" : "company-dashboard"}>
        <div className="empty-state">
          <Building size={48} className="empty-icon" />
          <h3>Inget företag kopplat</h3>
          <p>Ditt konto är inte kopplat till något företag ännu.</p>
        </div>
      </div>
    );
  }

  if (userProfile.role !== 'admin' && userProfile.role !== 'superadmin') {
    return (
      <div className={isEmbedded ? "" : "company-dashboard"}>
        <div className="empty-state">
          <Shield size={48} className="empty-icon text-danger" />
          <h3>Åtkomst nekad</h3>
          <p>Du har inte behörighet att ändra företagsinställningar.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={isEmbedded ? "company-embedded" : "company-dashboard"}>
      {!isEmbedded && (
        <div className="dashboard-header">
          <div>
            <h1>Företagsinställningar</h1>
            <p className="subtitle">Hantera information för {company.name}</p>
          </div>
          {!isEditing && (
            <button className="btn-primary" onClick={() => setIsEditing(true)}>
              Redigera profil
            </button>
          )}
        </div>
      )}

      {isEmbedded && !isEditing && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button className="btn-primary btn-sm" onClick={() => setIsEditing(true)}>
            Redigera Företagsinfo
          </button>
        </div>
      )}

      <div className="settings-container" style={{ 
        display: 'grid', 
        gridTemplateColumns: isEmbedded ? '1fr' : '1fr 350px', 
        gap: '2rem', 
        marginTop: isEmbedded ? '0' : '2rem' 
      }}>
        <div className="settings-main">
          {isEditing ? (
            <div className="card shadow-sm p-4 bg-white rounded-lg">
              <form onSubmit={handleSubmit} className="company-form">
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>Företagsnamn *</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Organisationsnummer</label>
                    <input type="text" name="org_nr" value={formData.org_nr} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>
                
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>E-post</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Telefon</label>
                    <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>

                <div className="form-group mb-3">
                  <label>Webbplats</label>
                  <input type="url" name="website" value={formData.website} onChange={handleInputChange} className="form-control" />
                </div>

                <div className="form-group mb-3">
                  <label>Företagslogotyp</label>
                  <div className="logo-upload-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                    <div className="logo-preview" style={{ 
                      width: '64px', 
                      height: '64px', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-secondary)'
                    }}>
                      {formData.logo_url ? (
                        <img 
                          src={formData.logo_url} 
                          alt="Preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                          onError={(e) => {
                            console.error('Logo preview failed to load:', formData.logo_url);
                            e.target.src = 'https://via.placeholder.com/64?text=Error';
                          }}
                        />
                      ) : (
                        <Building size={24} className="text-muted" />
                      )}
                    </div>
                    <div className="upload-actions">
                      <input 
                        type="file" 
                        id="logo-upload" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        style={{ display: 'none' }} 
                        disabled={uploading}
                      />
                      <label htmlFor="logo-upload" className="btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} /> {uploading ? 'Laddar upp...' : 'Ladda upp logga'}
                      </label>
                      {formData.logo_url && (
                        <button 
                          type="button" 
                          className="btn-text btn-sm text-danger" 
                          onClick={() => setFormData(prev => ({ ...prev, logo_url: '' }))}
                          style={{ marginLeft: '0.5rem' }}
                        >
                          Ta bort
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted mt-1">Rekommenderad storlek: 200x200px. Max 2MB.</p>
                </div>

                <div className="form-group mb-3">
                  <label>Gatuadress</label>
                  <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="form-control" />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                  <div className="form-group">
                    <label>Postnummer</label>
                    <input type="text" name="zip_code" value={formData.zip_code} onChange={handleInputChange} className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Ort</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="form-control" />
                  </div>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Avbryt</button>
                  <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Save size={18} /> Spara ändringar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="company-profile-view">
              <div className="profile-card bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center overflow-hidden">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Building size={32} />
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
                      <p className="text-gray-500">Org.nr: {company.org_nr || company.org_number || 'Ej angivet'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Kontaktinformation</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-gray-600">
                        <Mail size={18} className="text-gray-400" />
                        <span>{company.email || 'Ingen e-post angiven'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Phone size={18} className="text-gray-400" />
                        <span>{company.phone || 'Inget telefonnummer angivet'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-600">
                        <Globe size={18} className="text-gray-400" />
                        <span>{company.website || 'Ingen webbplats angiven'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Adress</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 text-gray-600">
                        <MapPin size={18} className="text-gray-400 mt-1" />
                        <div>
                          <p>{company.address || 'Ingen adress angiven'}</p>
                          <p>{company.zip_code} {company.city}</p>
                          <p>{company.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="settings-sidebar space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Licens & Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <CreditCard size={18} />
                  <span>Plan</span>
                </div>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded uppercase">{company.plan}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-600">
                  <Shield size={18} />
                  <span>Status</span>
                </div>
                <span className={`px-2 py-1 text-xs font-bold rounded uppercase ${
                  company.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                }`}>
                  {company.status === 'active' ? 'Aktiv' : company.status}
                </span>
              </div>
            </div>
          </div>

          {!isEmbedded && (
            <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Behöver du hjälp?</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Om du behöver ändra din licensplan eller har frågor om ditt konto, vänligen kontakta SafeQMS support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyList;
