import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getRisker, createRisk, updateRisk, deleteRisk } from '../api/risk';
import { sendEmailNotification } from '../../../shared/api/sendEmailNotification';
import { useAuth } from '../../../shared/api/AuthContext';
import { Plus, Trash2, X, AlertOctagon, ShieldAlert, Activity, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/RiskList.css';

const RiskList = () => {
  const [risker, setRisker] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    likelihood: 1, 
    impact: 1, 
    status: 'open', 
    category: 'general',
    deadline: ''
  });
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();

  const fetchRisker = async () => {
    try {
      const data = await getRisker();
      setRisker(data);
    } catch (error) {
      console.error('Failed to fetch risker', error);
      toast.error('Kunde inte hämta risker');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisker();
  }, []);

  useEffect(() => {
    if (!loading && location.state?.openId) {
      const riskToOpen = risker.find(r => r.id === location.state.openId);
      if (riskToOpen) {
        handleEdit(riskToOpen);
      }
    }
  }, [loading, location.state, risker]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!userProfile?.company_id && userProfile?.role !== 'superadmin') {
        toast.error('Du måste vara kopplad till ett företag för att skapa en risk. Kontakta en administratör.');
        return;
      }

      // Ensure we have a company_id if the user is a superadmin but not linked yet
      let companyId = userProfile?.company_id;
      
      if (!companyId && userProfile?.role === 'superadmin') {
        const { data: companies } = await supabase.from('companies').select('id').eq('name', 'SafeQMS').limit(1);
        if (companies && companies.length > 0) {
          companyId = companies[0].id;
        }
      }

      const riskData = {
        ...formData,
        likelihood: parseInt(formData.likelihood),
        impact: parseInt(formData.impact),
        risk_score: parseInt(formData.likelihood) * parseInt(formData.impact),
        deadline: formData.deadline || null,
        responsible_uid: currentUser?.id || null,
        company_id: companyId,
        is_template: userProfile?.role === 'superadmin',
        is_global: userProfile?.role === 'superadmin'
      };
      
      if (selectedRisk) {
        const updated = await updateRisk(selectedRisk.id, riskData);
        setRisker(risker.map(r => r.id === selectedRisk.id ? updated : r));
        toast.success('Risk uppdaterad!');
      } else {
        const created = await createRisk(riskData);
        setRisker([created, ...risker]);
        toast.success('Risk skapad!');

        // Send email notification if user has an email
        if (currentUser?.email) {
          const subject = `Ny Risk Registrerad: ${created.title}`;
          const htmlContent = `
            <h2>En ny risk har registrerats i systemet</h2>
            <p><strong>Titel:</strong> ${created.title}</p>
            <p><strong>Kategori:</strong> ${created.category}</p>
            <p><strong>Sannolikhet:</strong> ${created.likelihood}</p>
            <p><strong>Konsekvens:</strong> ${created.impact}</p>
            <p><strong>Riskpoäng:</strong> ${created.likelihood * created.impact}</p>
            <p><strong>Beskrivning:</strong></p>
            <p>${created.description}</p>
            <p><br/>Logga in i systemet för att hantera denna risk.</p>
          `;
          await sendEmailNotification(currentUser.email, subject, htmlContent);
        }
      }
      
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save risk:', error);
      const errorMsg = error.message || error.details || 'Okänt fel vid sparning';
      toast.error(`Kunde inte spara risk: ${errorMsg}`);
      
      if (errorMsg.includes('relation "risker" does not exist')) {
        toast.info('Tabellen "risker" saknas i databasen. Kör SQL-skriptet i Supabase SQL Editor.');
      }
    }
  };

  const handleEdit = (risk) => {
    setSelectedRisk(risk);
    setFormData({
      title: risk.title,
      description: risk.description || '',
      likelihood: risk.likelihood,
      impact: risk.impact,
      status: risk.status,
      category: risk.category,
      deadline: risk.deadline || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRisk(null);
    setFormData({ title: '', description: '', likelihood: 1, impact: 1, status: 'open', category: 'general', deadline: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill radera denna risk?')) {
      try {
        await deleteRisk(id);
        setRisker(risker.filter(r => r.id !== id));
        toast.success('Risk raderad');
      } catch (error) {
        console.error('Failed to delete risk', error);
        toast.error('Kunde inte radera risk');
      }
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updated = await updateRisk(id, { status: newStatus });
      setRisker(risker.map(r => r.id === id ? updated : r));
      toast.success('Status uppdaterad');
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Kunde inte uppdatera status');
    }
  };

  const getRiskLevel = (score) => {
    if (score >= 15) return { label: 'Kritisk', className: 'level-critical' };
    if (score >= 10) return { label: 'Hög', className: 'level-high' };
    if (score >= 5) return { label: 'Medium', className: 'level-medium' };
    return { label: 'Låg', className: 'level-low' };
  };

  const columns = [
    { id: 'open', title: 'Öppen', icon: <AlertOctagon size={18} className="text-level-high" /> },
    { id: 'mitigated', title: 'Åtgärdat', icon: <Activity size={18} className="text-level-medium" /> },
    { id: 'closed', title: 'Stängt', icon: <CheckCircle size={18} className="text-level-low" /> }
  ];

  if (loading) return <div className="loading-spinner">Laddar risker...</div>;

  return (
    <div className="risk-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Riskhantering</h1>
          <p className="subtitle">Identifiera, analysera och hantera risker</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          <span>Registrera Risk</span>
        </button>
      </div>

      <div className="kanban-board">
        {columns.map(column => (
          <div key={column.id} className="kanban-column">
            <div className="column-header">
              <div className="column-title">
                {column.icon}
                <h2>{column.title}</h2>
              </div>
              <span className="column-count">
                {risker.filter(r => r.status === column.id).length}
              </span>
            </div>

            <div className="column-content">
              {risker
                .filter(r => r.status === column.id)
                .map((r) => {
                  const score = r.likelihood * r.impact;
                  const riskLevel = getRiskLevel(score);
                  return (
                    <div 
                      key={r.id} 
                      className={`risk-card-mini border-${riskLevel.className}`}
                      onClick={() => handleEdit(r)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 className="card-title-mini" title={r.title}>{r.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          {r.deadline && <span className="deadline-mini" style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>📅 {new Date(r.deadline).toLocaleDateString('sv-SE')}</span>}
                          <button 
                            className="btn-icon-mini delete" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }} 
                            title="Radera"
                            style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="card-meta-row">
                        <div className="card-meta-left">
                          <span className="kanban-card-id">#{r.id.substring(0, 4).toUpperCase()}</span>
                          <span className={`risk-badge-mini ${riskLevel.className}`}>{score}</span>
                          <span className="category-mini">{r.category}</span>
                        </div>
                        <div className="card-meta-right">
                          <select 
                            className={`status-select-mini status-${r.status}`}
                            value={r.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(r.id, e.target.value)}
                            style={{ borderRadius: '4px' }}
                          >
                            <option value="open">Öppen</option>
                            <option value="mitigated">Åtgärdad</option>
                            <option value="closed">Stängd</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              
              {risker.filter(r => r.status === column.id).length === 0 && (
                <div className="empty-column-state">
                  <p>Inga risker</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedRisk ? 'Redigera risk' : 'Registrera ny risk'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="risk-form">
              <div className="form-group">
                <label htmlFor="title">Titel</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Kort sammanfattning av risken"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Kategori</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                  >
                    <option value="general">Allmän</option>
                    <option value="financial">Finansiell</option>
                    <option value="operational">Operationell</option>
                    <option value="strategic">Strategisk</option>
                    <option value="compliance">Efterlevnad</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="open">Öppen</option>
                    <option value="mitigated">Åtgärdad</option>
                    <option value="closed">Stängd</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="likelihood">Sannolikhet (1-5)</label>
                  <input
                    type="number"
                    id="likelihood"
                    name="likelihood"
                    min="1"
                    max="5"
                    value={formData.likelihood}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="impact">Konsekvens (1-5)</label>
                  <input
                    type="number"
                    id="impact"
                    name="impact"
                    min="1"
                    max="5"
                    value={formData.impact}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="risk-score-preview">
                <strong>Beräknad Riskpoäng: </strong>
                <span className={`risk-badge ${getRiskLevel(formData.likelihood * formData.impact).className}`}>
                  {formData.likelihood * formData.impact} - {getRiskLevel(formData.likelihood * formData.impact).label}
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="deadline">Deadline</label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Beskriv risken i detalj..."
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Avbryt
                </button>
                <button type="submit" className="btn-primary">
                  {selectedRisk ? 'Uppdatera Risk' : 'Spara Risk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskList;
