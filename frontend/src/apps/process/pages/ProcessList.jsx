import React, { useEffect, useState } from 'react';
import { getProcesses, createProcess, updateProcess, deleteProcess } from '../api/process';
import { useAuth } from '../../../shared/api/AuthContext';
import { Plus, Trash2, X, Activity, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-toastify';
import '../styles/ProcessList.css';

const ProcessList = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    status: 'active'
  });
  const { currentUser } = useAuth();

  const fetchProcesses = async () => {
    try {
      const data = await getProcesses();
      setProcesses(data);
    } catch (error) {
      console.error('Failed to fetch processes', error);
      toast.error('Kunde inte hämta processer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const newProcess = {
        ...formData,
        owner: currentUser?.id || 'anonymous'
      };
      const created = await createProcess(newProcess);
      setProcesses([created, ...processes]);
      setIsModalOpen(false);
      setFormData({ title: '', description: '', status: 'active' });
      toast.success('Process skapad!');
    } catch (error) {
      console.error('Failed to create process', error);
      toast.error('Kunde inte skapa process');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const updated = await updateProcess(id, { status: newStatus });
      setProcesses(processes.map(p => p.id === id ? updated : p));
      toast.success('Status uppdaterad');
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Kunde inte uppdatera status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill radera denna process?')) {
      try {
        await deleteProcess(id);
        setProcesses(processes.filter(p => p.id !== id));
        toast.success('Process raderad');
      } catch (error) {
        console.error('Failed to delete process', error);
        toast.error('Kunde inte radera process');
      }
    }
  };

  if (loading) return <div className="loading-spinner">Laddar processer...</div>;

  return (
    <div className="process-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Processer</h1>
          <p className="subtitle">Hantera och övervaka verksamhetens processer</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          <span>Ny Process</span>
        </button>
      </div>

      <div className="process-grid">
        {processes.length === 0 ? (
          <div className="empty-state">
            <Activity size={48} className="empty-icon" />
            <h3>Inga processer hittades</h3>
            <p>Det finns inga registrerade processer för tillfället.</p>
          </div>
        ) : (
          processes.map((p) => (
            <div key={p.id} className={`process-card status-${p.status}`}>
              <div className="card-header">
                <div className="card-title-group">
                  <div className="process-icon">
                    <Activity size={24} />
                  </div>
                  <div>
                    <h3 className="card-title">{p.title}</h3>
                    <select 
                      className={`status-badge ${p.status}`}
                      value={p.status}
                      onChange={(e) => handleStatusChange(p.id, e.target.value)}
                    >
                      <option value="active">Aktiv</option>
                      <option value="paused">Pausad</option>
                      <option value="completed">Avslutad</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="card-body">
                <p className="card-description">{p.description || 'Ingen beskrivning.'}</p>
              </div>
              
              <div className="card-footer">
                <div className="card-meta">
                  <span className="date">Skapad {new Date(p.created_at || new Date()).toLocaleDateString('sv-SE')}</span>
                </div>
                <div className="card-actions">
                  <button className="btn-icon delete" onClick={() => handleDelete(p.id)} title="Radera">
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
              <h2>Skapa ny process</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="process-form">
              <div className="form-group">
                <label htmlFor="title">Titel *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Processens namn"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Aktiv</option>
                  <option value="paused">Pausad</option>
                  <option value="completed">Avslutad</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="description">Beskrivning</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="Beskriv processens syfte och flöde..."
                ></textarea>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Avbryt
                </button>
                <button type="submit" className="btn-primary">
                  Spara Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessList;
