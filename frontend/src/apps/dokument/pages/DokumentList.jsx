import React, { useEffect, useState } from 'react';
import { getDokuments, createDokument, deleteDokument } from '../api/dokument';
import { useAuth } from '../../../shared/api/AuthContext';
import { Plus, Trash2, X, FileText, Download, ExternalLink, File } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/DokumentList.css';

const DokumentList = () => {
  const [dokuments, setDokuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    file_url: '', 
    category: 'general'
  });
  const { currentUser } = useAuth();

  const fetchDokuments = async () => {
    try {
      const data = await getDokuments();
      setDokuments(data);
    } catch (error) {
      console.error('Failed to fetch dokuments', error);
      toast.error('Kunde inte hämta dokument');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDokuments();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newDoc = {
        ...formData,
        uploaded_by: currentUser?.id || 'anonymous'
      };
      const created = await createDokument(newDoc);
      setDokuments([created, ...dokuments]);
      setIsModalOpen(false);
      setFormData({ title: '', description: '', file_url: '', category: 'general' });
      toast.success('Dokument tillagt!');
    } catch (error) {
      console.error('Failed to add dokument', error);
      toast.error('Kunde inte lägga till dokument');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill radera detta dokument?')) {
      try {
        await deleteDokument(id);
        setDokuments(dokuments.filter(d => d.id !== id));
        toast.success('Dokument raderat');
      } catch (error) {
        console.error('Failed to delete dokument', error);
        toast.error('Kunde inte radera dokument');
      }
    }
  };

  if (loading) return <div className="loading-spinner">Laddar dokument...</div>;

  return (
    <div className="dokument-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dokument</h1>
          <p className="subtitle">Hantera och dela viktiga filer och dokument</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          <span>Lägg till Dokument</span>
        </button>
      </div>

      <div className="dokument-grid">
        {dokuments.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <h3>Inga dokument hittades</h3>
            <p>Det finns inga uppladdade dokument för tillfället.</p>
          </div>
        ) : (
          dokuments.map((d) => (
            <div key={d.id} className="dokument-card">
              <div className="card-header">
                <div className="card-title-group">
                  <div className="dokument-icon">
                    <File size={24} />
                  </div>
                  <div>
                    <h3 className="card-title">{d.title}</h3>
                    <span className="dokument-category capitalize">{d.category}</span>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <p className="card-description">{d.description || 'Ingen beskrivning.'}</p>
              </div>
              
              <div className="card-footer">
                <div className="card-meta">
                  <span className="date">{new Date(d.created_at || new Date()).toLocaleDateString('sv-SE')}</span>
                </div>
                <div className="card-actions">
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Öppna länk">
                      <ExternalLink size={18} />
                    </a>
                  )}
                  <button className="btn-icon delete" onClick={() => handleDelete(d.id)} title="Radera">
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
              <h2>Lägg till nytt dokument</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="dokument-form">
              <div className="form-group">
                <label htmlFor="title">Titel *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Dokumentets namn"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="category">Kategori</label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                >
                  <option value="general">Allmänt</option>
                  <option value="policy">Policy</option>
                  <option value="manual">Manual</option>
                  <option value="contract">Avtal</option>
                  <option value="report">Rapport</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="file_url">Länk till dokument (URL)</label>
                <input
                  type="url"
                  id="file_url"
                  name="file_url"
                  value={formData.file_url}
                  onChange={handleInputChange}
                  placeholder="https://länk-till-dokument.pdf"
                />
                <small className="form-hint">Klistra in en länk till dokumentet (t.ex. Google Drive, SharePoint).</small>
              </div>

              <div className="form-group">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Kort beskrivning av dokumentet..."
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Avbryt
                </button>
                <button type="submit" className="btn-primary">
                  Spara Dokument
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DokumentList;
