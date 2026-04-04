import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRisker, createRisk, updateRisk, deleteRisk } from '../api/risk';
import { sendEmailNotification } from '../../../shared/api/sendEmailNotification';
import { useAuth } from '../../../shared/api/AuthContext';
import { Plus, Trash2, X, AlertOctagon, ShieldAlert, Activity, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/RiskList.css';

const RiskList = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    likelihood: 1, 
    impact: 1, 
    status: 'open', 
    category: 'general',
    deadline: '',
    responsible_name: ''
  });
  const { currentUser, userProfile } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // TanStack Query for data fetching
  const { data: riskerData, isLoading: loading, isError } = useQuery({
    queryKey: ['risker', page, pageSize],
    queryFn: () => getRisker(page, pageSize),
    keepPreviousData: true,
  });

  const risker = riskerData?.data || [];
  const totalCount = riskerData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createRisk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risker'] });
      toast.success('Risk skapad!');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error('Kunde inte skapa risk');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateRisk(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risker'] });
      toast.success('Risk uppdaterad!');
      handleCloseModal();
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Kunde inte uppdatera risk');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRisk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risker'] });
      toast.success('Risk raderad');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Kunde inte radera risk');
    }
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!loading && location.state?.openId) {
      const riskToOpen = risker.find(r => String(r.id) === String(location.state.openId));
      if (riskToOpen) {
        handleEdit(riskToOpen);
      }
    }
  }, [loading, location.state, risker]);

  useEffect(() => {
    const riskId = searchParams.get('id');
    if (riskId && risker.length > 0) {
      const riskToOpen = risker.find(r => String(r.id) === String(riskId));
      if (riskToOpen) {
        handleEdit(riskToOpen);
        // Remove the id from the URL so it doesn't keep reopening when closed
        searchParams.delete('id');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, risker, setSearchParams]);

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
        creator_uid: currentUser?.id || null,
        responsible_name: formData.responsible_name || userProfile?.full_name || currentUser?.email || 'Okänd',
        company_id: companyId,
        is_template: userProfile?.role === 'superadmin',
        is_global: userProfile?.role === 'superadmin'
      };
      
      if (selectedRisk) {
        updateMutation.mutate({ id: selectedRisk.id, data: riskData });
      } else {
        createMutation.mutate(riskData);
      }
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
      deadline: risk.deadline || '',
      responsible_name: risk.responsible_name || ''
    });
    setIsModalOpen(true);
  };

  const canEdit = !selectedRisk?.is_global || userProfile?.role === 'superadmin';

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRisk(null);
    setFormData({ title: '', description: '', likelihood: 1, impact: 1, status: 'open', category: 'general', deadline: '', responsible_name: '' });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill radera denna risk?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    updateMutation.mutate({ id, data: { status: newStatus } });
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
        <div className="header-actions">
          {isMobile && (
            <button className="btn btn-primary btn-responsive" onClick={() => setIsModalOpen(true)}>
              <Plus size={20} />
              <span>Registrera Risk</span>
            </button>
          )}
        </div>
      </div>

      <div className="kanban-board">
        {columns.map(column => (
          <div key={column.id} className="kanban-column">
            <div className="column-header">
              <div className="column-title">
                {column.icon}
                <h2>{column.title}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!isMobile && (
                  <button 
                    className="btn-icon-mini" 
                    onClick={() => {
                      setFormData({...formData, status: column.id});
                      setIsModalOpen(true);
                    }}
                    title={`Lägg till i ${column.title}`}
                  >
                    <Plus size={16} />
                  </button>
                )}
                <span className="column-count">
                  {risker.filter(r => r.status === column.id).length}
                </span>
              </div>
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

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn" 
            disabled={page === 1} 
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="pagination-info">
            Sida {page} av {totalPages}
          </span>
          <button 
            className="pagination-btn" 
            disabled={page === totalPages} 
            onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedRisk ? (canEdit ? 'Redigera risk' : 'Visa risk') : 'Registrera ny risk'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="risk-form">
              <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0 }}>
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
                <label htmlFor="responsible_name">Ansvarig</label>
                <input
                  type="text"
                  id="responsible_name"
                  name="responsible_name"
                  value={formData.responsible_name}
                  onChange={handleInputChange}
                  placeholder="Namn på ansvarig person"
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
                <button type="button" className="btn-secondary" onClick={handleCloseModal} disabled={false}>
                  Avbryt
                </button>
                {canEdit && (
                  <button type="submit" className="btn-primary">
                    {selectedRisk ? 'Uppdatera Risk' : 'Spara Risk'}
                  </button>
                )}
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskList;
