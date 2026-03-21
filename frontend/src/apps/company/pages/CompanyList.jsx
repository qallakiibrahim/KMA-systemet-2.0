import React, { useEffect, useState } from 'react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '../api/company';
import { Plus, Trash2, X, Building, Mail, Phone, Globe, MapPin } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/CompanyList.css';

const CompanyList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: '', 
    org_number: '', 
    address: '', 
    city: '', 
    zip_code: '', 
    country: '',
    phone: '',
    email: '',
    website: ''
  });

  const fetchCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Failed to fetch companies', error);
      toast.error('Kunde inte hämta företag');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const created = await createCompany(formData);
      setCompanies([created, ...companies]);
      setIsModalOpen(false);
      setFormData({ 
        name: '', org_number: '', address: '', city: '', zip_code: '', 
        country: '', phone: '', email: '', website: '' 
      });
      toast.success('Företag skapat!');
    } catch (error) {
      console.error('Failed to create company', error);
      toast.error('Kunde inte skapa företag');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill radera detta företag?')) {
      try {
        await deleteCompany(id);
        setCompanies(companies.filter(c => c.id !== id));
        toast.success('Företag raderat');
      } catch (error) {
        console.error('Failed to delete company', error);
        toast.error('Kunde inte radera företag');
      }
    }
  };

  if (loading) return <div className="loading-spinner">Laddar företag...</div>;

  return (
    <div className="company-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Företag</h1>
          <p className="subtitle">Hantera företag och organisationer</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          <span>Lägg till Företag</span>
        </button>
      </div>

      <div className="company-grid">
        {companies.length === 0 ? (
          <div className="empty-state">
            <Building size={48} className="empty-icon" />
            <h3>Inga företag hittades</h3>
            <p>Det finns inga registrerade företag för tillfället.</p>
          </div>
        ) : (
          companies.map((c) => (
            <div key={c.id} className="company-card">
              <div className="card-header">
                <div className="card-title-group">
                  <div className="company-avatar">
                    <Building size={24} />
                  </div>
                  <div>
                    <h3 className="card-title">{c.name}</h3>
                    {c.org_number && <span className="org-number">Org.nr: {c.org_number}</span>}
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <div className="contact-info">
                  {c.email && (
                    <div className="info-row">
                      <Mail size={16} />
                      <a href={`mailto:${c.email}`}>{c.email}</a>
                    </div>
                  )}
                  {c.phone && (
                    <div className="info-row">
                      <Phone size={16} />
                      <a href={`tel:${c.phone}`}>{c.phone}</a>
                    </div>
                  )}
                  {c.website && (
                    <div className="info-row">
                      <Globe size={16} />
                      <a href={c.website} target="_blank" rel="noopener noreferrer">{c.website}</a>
                    </div>
                  )}
                  {(c.address || c.city) && (
                    <div className="info-row">
                      <MapPin size={16} />
                      <span>{c.address}{c.city ? `, ${c.city}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card-footer">
                <div className="card-meta">
                  <span className="date">Tillagd {new Date(c.created_at || new Date()).toLocaleDateString('sv-SE')}</span>
                </div>
                <div className="card-actions">
                  <button className="btn-icon delete" onClick={() => handleDelete(c.id)} title="Radera">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Lägg till nytt företag</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="company-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Företagsnamn *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="Företag AB"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="org_number">Organisationsnummer</label>
                  <input
                    type="text"
                    id="org_number"
                    name="org_number"
                    value={formData.org_number}
                    onChange={handleInputChange}
                    placeholder="555555-5555"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">E-post</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="info@foretag.se"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phone">Telefon</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="08-123 45 67"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="website">Webbplats</label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://www.foretag.se"
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Gatuadress</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Storgatan 1"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="zip_code">Postnummer</label>
                  <input
                    type="text"
                    id="zip_code"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    placeholder="123 45"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="city">Ort</label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Stockholm"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Avbryt
                </button>
                <button type="submit" className="btn-primary">
                  Spara Företag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyList;
