import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAvvikelser, createAvvikelse, updateAvvikelse, deleteAvvikelse, uploadAttachment } from '../api/avvikelse';
import { getAuditLogs } from '../../../shared/api/auditLog';
import { sendEmailNotification } from '../../../shared/api/sendEmailNotification';
import { useAuth } from '../../../shared/api/AuthContext';
import { useSearch } from '../../../shared/context/SearchContext';
import { useRegisterHeaderActions } from '../../../shared/context/HeaderActionsContext';
import { Plus, Edit2, Trash2, X, AlertTriangle, CheckCircle, Clock, Lock, Bot, Paperclip, FileText, Image as ImageIcon, UploadCloud, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { GoogleGenAI } from '@google/genai';
import { getAiInstance } from '../../../shared/utils/aiUtils';
import '../styles/AvvikelseList.css';

const AvvikelseList = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [selectedAvvikelse, setSelectedAvvikelse] = useState(null);
  const [activeStep, setActiveStep] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({ 
    titel: '', 
    priority: 'Medium', 
    severity: 1,
    probability: 1,
    status: 'open',
    vem: '',
    vad: '',
    nar: '',
    var: '',
    varfor: '',
    hur: '',
    hur_mycket: '',
    beskrivning: '',
    problemdefinition: '',
    deadline: '',
    attachments: []
  });
  const [followUpData, setFollowUpData] = useState({
    kortsiktiga: '',
    rotorsak: '',
    varfor1: '',
    varfor2: '',
    varfor3: '',
    varfor4: '',
    varfor5: '',
    langsiktiga: '',
    godkand: false
  });
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'history'
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const followUpFileInputRef = useRef(null);

  const { currentUser, userProfile } = useAuth();
  const { searchQuery } = useSearch();
  const location = useLocation();

  // Register header actions
  const headerActions = useMemo(() => (
    <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
      <Plus size={16} />
      <span>Rapportera Avvikelse</span>
    </button>
  ), []);

  useRegisterHeaderActions(headerActions);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // TanStack Query for data fetching
  const { data: avvikelserData, isLoading: loading, isError, error } = useQuery({
    queryKey: ['avvikelser', page, pageSize],
    queryFn: () => getAvvikelser(page, pageSize),
    placeholderData: (previousData) => previousData,
  });

  const avvikelser = avvikelserData?.data || (Array.isArray(avvikelserData) ? avvikelserData : []);
  
  const filteredAvvikelser = avvikelser.filter(a => 
    searchQuery === '' || 
    a.titel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.beskrivning && a.beskrivning.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalCount = avvikelserData?.count || (Array.isArray(avvikelserData) ? avvikelserData.length : 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  if (isError) {
    return (
      <div className="error-state">
        <AlertTriangle size={48} className="text-level-high" />
        <h2>Ett fel uppstod vid hämtning av data</h2>
        <p>{error?.message || 'Kunde inte ansluta till databasen'}</p>
        <button className="btn btn-primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['avvikelser'] })}>
          Försök igen
        </button>
      </div>
    );
  }

  // Mutations
  const resetForm = () => {
    setFormData({
      titel: '',
      beskrivning: '',
      plats: '',
      kategori: 'Arbetsmiljö',
      severity: 1,
      probability: 1,
      deadline: ''
    });
    setAttachments([]);
  };

  const createMutation = useMutation({
    mutationFn: (data) => createAvvikelse(data, currentUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avvikelser'] });
      toast.success('Avvikelse skapad!');
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error('Kunde inte skapa avvikelse');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateAvvikelse(id, data, currentUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avvikelser'] });
      toast.success('Avvikelse uppdaterad!');
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Kunde inte uppdatera avvikelse');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAvvikelse(id, currentUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avvikelser'] });
      toast.success('Avvikelse raderad');
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Kunde inte radera avvikelse');
    }
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!loading && location.state?.openId) {
      const avvikelseToOpen = avvikelser.find(a => a.id === location.state.openId);
      if (avvikelseToOpen) {
        openFollowUp(avvikelseToOpen);
      }
    }
  }, [loading, location.state, avvikelser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    setIsUploading(true);
    try {
      const uploadedAttachments = await Promise.all(
        files.map(file => uploadAttachment(file))
      );
      
      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...uploadedAttachments]
      }));
      toast.success('Bilaga uppladdad!');
    } catch (error) {
      console.error('Failed to upload attachment', error);
      toast.error(error.message || 'Kunde inte ladda upp bilaga');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleFollowUpFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length || !selectedAvvikelse) return;
    
    setIsUploading(true);
    try {
      const uploadedAttachments = await Promise.all(
        files.map(file => uploadAttachment(file))
      );
      
      const existingAttachments = selectedAvvikelse.attachments || [];
      const newAttachments = [...existingAttachments, ...uploadedAttachments];
      
      const updated = await updateAvvikelse(selectedAvvikelse.id, { attachments: newAttachments });
      setAvvikelser(avvikelser.map(a => a.id === selectedAvvikelse.id ? updated : a));
      setSelectedAvvikelse(updated);
      toast.success('Bilaga tillagd!');
    } catch (error) {
      console.error('Failed to upload attachment', error);
      toast.error(error.message || 'Kunde inte ladda upp bilaga');
    } finally {
      setIsUploading(false);
    }
  };

  const generateBeskrivning = async () => {
    const { vem, vad, nar, var: varField, varfor, hur, hur_mycket } = formData;
    if (!vem && !vad && !nar && !varField && !varfor && !hur && !hur_mycket) {
      toast.error('Fyll i åtminstone några 5W2H-fält först');
      return;
    }
    
    setIsGenerating(true);
    try {
      const ai = await getAiInstance();
      if (!ai) {
        toast.error('AI-tjänsten saknar API-nyckel. Anslut en nyckel i inställningarna. Om du nyss har anslutit den, prova att ladda om sidan.');
        return;
      }
      
      const prompt = `Skriv en professionell, sammanhängande och tydlig problembeskrivning baserat på följande 5W2H-fakta. Gör det till en löpande text som är lätt att läsa för ledningen. Svara på svenska.\n\nVem: ${vem}\nVad: ${vad}\nNär: ${nar}\nVar: ${varField}\nVarför: ${varfor}\nHur: ${hur}\nHur mycket: ${hur_mycket}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      if (response && response.text) {
        setFormData(prev => ({ ...prev, beskrivning: response.text }));
        toast.success('Problembeskrivning genererad!');
      } else {
        throw new Error('Inget text-svar från AI-modellen');
      }
    } catch (error) {
      console.error('AI Error (Beskrivning):', error);
      toast.error(`AI-fel: ${error.message || 'Kunde inte generera text'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateRotorsak = async () => {
    const { varfor1, varfor2, varfor3, varfor4, varfor5 } = followUpData;
    if (!varfor1) {
      toast.error('Fyll i åtminstone det första "Varför"-fältet');
      return;
    }
    
    setIsGenerating(true);
    try {
      const ai = await getAiInstance();
      if (!ai) {
        toast.error('AI-tjänsten saknar API-nyckel. Anslut en nyckel i inställningarna. Om du nyss har anslutit den, prova att ladda om sidan.');
        return;
      }

      const prompt = `Analysera följande "5 Varför"-svar gällande en avvikelse och sammanfatta den underliggande rotorsaken på ett professionellt och tydligt sätt (max 3-4 meningar). Svara på svenska.\n\nProblem: ${selectedAvvikelse?.titel || 'Okänt problem'}\n\n1. Varför? ${varfor1}\n2. Varför? ${varfor2 || '-'}\n3. Varför? ${varfor3 || '-'}\n4. Varför? ${varfor4 || '-'}\n5. Varför? ${varfor5 || '-'}`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      
      if (response && response.text) {
        setFollowUpData(prev => ({ ...prev, rotorsak: response.text }));
        toast.success('Rotorsak genererad!');
      } else {
        throw new Error('Inget text-svar från AI-modellen');
      }
    } catch (error) {
      console.error('AI Error (Rotorsak):', error);
      toast.error(`AI-fel: ${error.message || 'Kunde inte generera text'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (!userProfile?.company_id && userProfile?.role !== 'superadmin') {
        toast.error('Du måste vara kopplad till ett företag för att skapa en avvikelse. Kontakta en administratör.');
        setIsSaving(false);
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

      const problemdefinition = `Vem: ${formData.vem}\nVad: ${formData.vad}\nNär: ${formData.nar}\nVar: ${formData.var}\nVarför: ${formData.varfor}\nHur: ${formData.hur}\nHur mycket: ${formData.hur_mycket}`;

      const newAvvikelse = {
        titel: formData.titel,
        beskrivning: formData.beskrivning,
        problemdefinition: problemdefinition,
        priority: formData.priority,
        severity: parseInt(formData.severity) || 1,
        probability: parseInt(formData.probability) || 1,
        status: 'open',
        author_uid: currentUser?.id || null,
        company_id: companyId,
        deadline: formData.deadline || null,
        attachments: formData.attachments || []
      };
      
      createMutation.mutate(newAvvikelse);
    } catch (error) {
      console.error('Failed to create avvikelse:', error);
      const errorMsg = error.message || error.details || 'Okänt fel vid sparning';
      toast.error(`Kunde inte skapa avvikelse: ${errorMsg}`);
      
      if (errorMsg.includes('relation "avvikelser" does not exist')) {
        toast.info('Tabellen "avvikelser" saknas i databasen. Kör SQL-skriptet i Supabase SQL Editor.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill radera denna avvikelse?')) {
      deleteMutation.mutate(id);
    }
  };

  const openFollowUp = async (avvikelse) => {
    setSelectedAvvikelse(avvikelse);
    setIsFollowUpModalOpen(true);
    setActiveTab('info');
    
    // Fetch logs in background
    setIsLogsLoading(true);
    try {
      const logsResponse = await getAuditLogs(1, 50, { 
        entity_type: 'ISSUE', 
        entity_id: avvikelse.id 
      });
      setAuditLogs(logsResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setIsLogsLoading(false);
    }
    
    // Parse problemdefinition to populate 5W2H fields if possible
    const pd = avvikelse.problemdefinition || '';
    const vemMatch = pd.match(/Vem: (.*)/);
    const vadMatch = pd.match(/Vad: (.*)/);
    const narMatch = pd.match(/När: (.*)/);
    const varMatch = pd.match(/Var: (.*)/);
    const varforMatch = pd.match(/Varför: (.*)/);
    const hurMatch = pd.match(/Hur: (.*)/);
    const hurMycketMatch = pd.match(/Hur mycket: (.*)/);

    setFormData({
      titel: avvikelse.titel || '',
      priority: avvikelse.priority || 'Medium',
      severity: avvikelse.severity || 1,
      probability: avvikelse.probability || 1,
      status: avvikelse.status || 'open',
      vem: vemMatch ? vemMatch[1] : '',
      vad: vadMatch ? vadMatch[1] : '',
      nar: narMatch ? narMatch[1] : '',
      var: varMatch ? varMatch[1] : '',
      varfor: varforMatch ? varforMatch[1] : '',
      hur: hurMatch ? hurMatch[1] : '',
      hur_mycket: hurMycketMatch ? hurMycketMatch[1] : '',
      beskrivning: avvikelse.beskrivning || '',
      deadline: avvikelse.deadline || '',
      attachments: avvikelse.attachments || []
    });

    let u = avvikelse.uppfoljning || {};
    if (typeof u === 'string') {
      try { u = JSON.parse(u); } catch (e) { u = {}; }
    }

    setFollowUpData({
      kortsiktiga: u.kortsiktiga || '',
      rotorsak: u.rotorsak || '',
      varfor1: u.varfor1 || '',
      varfor2: u.varfor2 || '',
      varfor3: u.varfor3 || '',
      varfor4: u.varfor4 || '',
      varfor5: u.varfor5 || '',
      langsiktiga: u.langsiktiga || '',
      godkand: u.godkand || false
    });
    
    let step = 2;
    if (u.kortsiktiga) step = 3;
    if (u.kortsiktiga && u.rotorsak) step = 4;
    if (u.kortsiktiga && u.rotorsak && u.langsiktiga) step = 5;
    if (u.godkand) step = 6;
    
    setActiveStep(step);
    setIsFollowUpModalOpen(true);
  };

  const handleSaveStep = async (stepNumber) => {
    console.log(`Saving step ${stepNumber} for avvikelse ${selectedAvvikelse?.id}`);
    try {
      const currentUppfoljning = { ...followUpData };
      
      if (stepNumber === 5) {
        currentUppfoljning.godkand = true;
      }
      
      const updates = { 
        uppfoljning: currentUppfoljning,
        status: stepNumber === 5 ? 'closed' : 'in-progress'
      };
      
      console.log('Sending updates to Supabase:', updates);
      updateMutation.mutate({ id: selectedAvvikelse.id, data: updates });
      
      if (stepNumber < 5) {
        setActiveStep(stepNumber + 1);
      } else {
        setIsFollowUpModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to save step:', error);
      toast.error('Kunde inte spara: ' + (error.message || 'Okänt fel'));
    }
  };

  const handleUpdateMainInfo = async () => {
    setIsSaving(true);
    try {
      const problemdefinition = `Vem: ${formData.vem}\nVad: ${formData.vad}\nNär: ${formData.nar}\nVar: ${formData.var}\nVarför: ${formData.varfor}\nHur: ${formData.hur}\nHur mycket: ${formData.hur_mycket}`;
      
      const updates = {
        titel: formData.titel,
        priority: formData.priority,
        severity: parseInt(formData.severity) || 1,
        probability: parseInt(formData.probability) || 1,
        beskrivning: formData.beskrivning,
        problemdefinition: problemdefinition,
        deadline: formData.deadline || null,
      };
      
      updateMutation.mutate({ id: selectedAvvikelse.id, data: updates });
    } catch (error) {
      console.error('Failed to update avvikelse', error);
      toast.error('Kunde inte uppdatera');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      updateMutation.mutate({ id, data: { status: newStatus } });
      
      // Send email notification on status change
      if (currentUser?.email) {
        const subject = `Avvikelse Uppdaterad: ${selectedAvvikelse?.titel || 'System'}`;
        const htmlContent = `
          <h2>Status för avvikelse har ändrats</h2>
          <p><strong>Titel:</strong> ${selectedAvvikelse?.titel || 'System'}</p>
          <p><strong>Ny Status:</strong> ${newStatus}</p>
          <p><br/>Logga in i systemet för mer information.</p>
        `;
        await sendEmailNotification(currentUser.email, subject, htmlContent);
      }
    } catch (error) {
      console.error('Failed to update status', error);
      toast.error('Kunde inte uppdatera status');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <AlertTriangle className="status-icon open" />;
      case 'in-progress': return <Clock className="status-icon in-progress" />;
      case 'closed': return <CheckCircle className="status-icon closed" />;
      default: return <AlertTriangle className="status-icon open" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open': return 'Öppen';
      case 'in-progress': return 'Pågår';
      case 'closed': return 'Stängd';
      default: return status;
    }
  };

  const getRiskLevel = (score) => {
    if (score >= 15) return { label: 'Kritisk', className: 'level-critical' };
    if (score >= 10) return { label: 'Hög', className: 'level-high' };
    if (score >= 5) return { label: 'Medium', className: 'level-medium' };
    return { label: 'Låg', className: 'level-low' };
  };

  const getFollowUpProgress = (uppfoljning) => {
    if (!uppfoljning) return 1;
    let steps = 1;
    if (uppfoljning.kortsiktiga?.trim()) steps++;
    if (uppfoljning.rotorsak?.trim()) steps++;
    if (uppfoljning.langsiktiga?.trim()) steps++;
    if (uppfoljning.godkand) steps++;
    return steps;
  };

  const getAvvikelseStep = (a) => {
    if (!a) return 1;
    let u = a.uppfoljning || {};
    if (typeof u === 'string') {
      try { u = JSON.parse(u); } catch (e) { u = {}; }
    }
    
    // Check both boolean and string "true" just in case
    if (u.godkand === true || u.godkand === 'true' || a.status === 'closed') return 5;
    if (u.langsiktiga && u.langsiktiga.trim().length > 0) return 4;
    if (u.rotorsak && u.rotorsak.trim().length > 0) return 3;
    if (u.kortsiktiga && u.kortsiktiga.trim().length > 0) return 2;
    return 1;
  };

  const kanbanColumns = [
    { id: 1, title: '1. Registrerad' },
    { id: 2, title: '2. Kortsiktiga åtgärder' },
    { id: 3, title: '3. Rotorsak' },
    { id: 4, title: '4. Långsiktiga åtgärder' },
    { id: 5, title: '5. Godkänd & Avslutad' }
  ];

  if (loading) return <div className="loading-spinner">Laddar avvikelser...</div>;

  return (
    <div className="avvikelse-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Avvikelser & Incidenter</h1>
          <p className="subtitle">Hantera och följ upp avvikelser i verksamheten</p>
        </div>
      </div>

      <div className="kanban-board">
        {kanbanColumns.map(col => {
          const columnAvvikelser = filteredAvvikelser.filter(a => getAvvikelseStep(a) === col.id);
          return (
            <div key={col.id} className="kanban-column">
              <div className="kanban-column-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3>{col.title}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!isMobile && col.id === 1 && (
                    <button 
                      className="btn-icon-mini" 
                      onClick={() => setIsModalOpen(true)}
                      title="Rapportera ny avvikelse"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                  <span className="kanban-count">{columnAvvikelser.length}</span>
                </div>
              </div>
              <div className="kanban-cards">
                {columnAvvikelser.map(a => {
                  const score = (a.severity || 1) * (a.probability || 1);
                  const riskLevel = getRiskLevel(score);
                  return (
                    <div key={a.id} className={`kanban-card border-${riskLevel.className}`} onClick={() => openFollowUp(a)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 className="kanban-card-title truncate" title={a.titel} style={{ flex: 1 }}>{a.titel}</h4>
                        {a.deadline && (
                          <span className="deadline-badge-mini" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            📅 {new Date(a.deadline).toLocaleDateString('sv-SE')}
                          </span>
                        )}
                      </div>
                      
                      <div className="kanban-card-meta" style={{ marginTop: '0.25rem' }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <span className="kanban-card-id">#{a.id.substring(0, 4).toUpperCase()}</span>
                          <span className="kanban-card-date" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {new Date(a.created_at).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {a.severity && a.probability && (
                            <span className={`risk-badge-mini ${riskLevel.className}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>
                              {score}
                            </span>
                          )}
                          {a.attachments && a.attachments.length > 0 && (
                            <span className="attachment-badge">
                              <Paperclip size={10} /> {a.attachments.length}
                            </span>
                          )}
                        </div>
                        <span className="priority-badge">
                          {a.priority || 'Medium'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
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
              <h2>Rapportera ny avvikelse</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="avvikelse-form">
              <div className="form-group">
                <label htmlFor="titel">Titel</label>
                <input
                  type="text"
                  id="titel"
                  name="titel"
                  value={formData.titel}
                  onChange={handleInputChange}
                  required
                  placeholder="Kort sammanfattning av avvikelsen"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="severity">Allvarlighetsgrad (1-5)</label>
                  <select id="severity" name="severity" value={formData.severity} onChange={handleInputChange}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="probability">Sannolikhet för upprepning (1-5)</label>
                  <select id="probability" name="probability" value={formData.probability} onChange={handleInputChange}>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="priority">Prioritet</label>
                  <select
                    id="priority"
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                  >
                    <option value="Low">Låg</option>
                    <option value="Medium">Medium</option>
                    <option value="High">Hög</option>
                    <option value="Critical">Kritisk</option>
                  </select>
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
              </div>

              <div className="form-section-title" style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Fakta (5W2H)</h3>
                <p className="text-muted" style={{fontSize: '0.75rem', marginBottom: '1rem'}}>Fyll i fälten nedan för att ge en strukturerad bild av problemet.</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="vem">Vem (Who)</label>
                  <input type="text" id="vem" name="vem" value={formData.vem} onChange={handleInputChange} placeholder="Vem upptäckte eller är drabbad?" />
                </div>
                <div className="form-group">
                  <label htmlFor="vad">Vad (What)</label>
                  <input type="text" id="vad" name="vad" value={formData.vad} onChange={handleInputChange} placeholder="Vad är problemet?" />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nar">När (When)</label>
                  <input type="text" id="nar" name="nar" value={formData.nar} onChange={handleInputChange} placeholder="När inträffade det?" />
                </div>
                <div className="form-group">
                  <label htmlFor="var">Var (Where)</label>
                  <input type="text" id="var" name="var" value={formData.var} onChange={handleInputChange} placeholder="Var uppstod problemet?" />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="varfor">Varför (Why)</label>
                <textarea id="varfor" name="varfor" value={formData.varfor} onChange={handleInputChange} rows="2" placeholder="Varför är det ett problem?"></textarea>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="hur">Hur (How)</label>
                  <textarea id="hur" name="hur" value={formData.hur} onChange={handleInputChange} rows="2" placeholder="Hur upptäcktes det?"></textarea>
                </div>
                <div className="form-group">
                  <label htmlFor="hur_mycket">Hur mycket (How much)</label>
                  <textarea id="hur_mycket" name="hur_mycket" value={formData.hur_mycket} onChange={handleInputChange} rows="2" placeholder="Hur stor är omfattningen/kostnaden?"></textarea>
                </div>
              </div>

              <div className="form-section-title" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Problembeskrivning</h3>
                  <p className="text-muted" style={{fontSize: '0.75rem'}}>AI-genererad sammanfattning baserad på 5W2H.</p>
                </div>
                <button type="button" className="btn-secondary btn-sm" onClick={generateBeskrivning} disabled={isGenerating}>
                  <Bot size={16} style={{marginRight: '4px'}}/> {isGenerating ? 'Genererar...' : 'Generera med AI'}
                </button>
              </div>

              <div className="form-group">
                <textarea
                  id="beskrivning"
                  name="beskrivning"
                  value={formData.beskrivning}
                  onChange={handleInputChange}
                  rows="6"
                  placeholder="Problembeskrivningen genereras här..."
                ></textarea>
              </div>

              <div className="form-section-title" style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' }}>Bilagor</h3>
                <p className="text-muted" style={{fontSize: '0.75rem', marginBottom: '0.5rem'}}>Bifoga bilder eller dokument relaterade till avvikelsen.</p>
              </div>
              
              <div className="file-upload-container">
                <input 
                  type="file" 
                  multiple 
                  onChange={handleFileChange} 
                  ref={fileInputRef}
                  style={{ display: 'none' }} 
                />
                <div 
                  className="file-dropzone" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud size={24} color="var(--text-muted)" />
                  <span>Klicka för att ladda upp filer</span>
                </div>
                
                {(formData.attachments?.length > 0 || isUploading) && (
                  <div className="attachments-grid">
                    {formData.attachments?.map((file, index) => (
                      file.type.startsWith('image/') ? (
                        <div key={index} style={{position: 'relative'}}>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" title={file.name}>
                            <img src={file.url} alt={file.name} className="attachment-thumbnail" />
                          </a>
                          <button type="button" className="remove-file-btn" onClick={() => removeFile(index)}>
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div key={index} style={{position: 'relative'}}>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="attachment-doc" title={file.name}>
                            <FileText size={24} color="var(--primary-color)" />
                            <span className="file-name">{file.name}</span>
                          </a>
                          <button type="button" className="remove-file-btn" onClick={() => removeFile(index)}>
                            <X size={14} />
                          </button>
                        </div>
                      )
                    ))}
                    {isUploading && (
                       <div className="attachment-doc" style={{opacity: 0.7}}>
                          <Loader className="spin" size={24} color="var(--text-muted)" />
                          <span className="file-name">Laddar upp...</span>
                       </div>
                    )}
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving || isUploading}>
                  Avbryt
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving || isUploading}>
                  {isSaving ? <Loader className="spin" size={16} style={{marginRight: '8px'}} /> : null}
                  {isSaving ? 'Sparar...' : 'Spara Avvikelse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isFollowUpModalOpen && selectedAvvikelse && (
        <div className="modal-overlay">
          <div className="modal-content follow-up-modal">
            <div className="modal-header">
              <h2>Åtgärda Avvikelse</h2>
              <div className="modal-header-actions">
                <button className="btn-icon delete" onClick={() => {
                  handleDelete(selectedAvvikelse.id);
                  setIsFollowUpModalOpen(false);
                }} title="Radera">
                  <Trash2 size={20} />
                </button>
                <button className="close-btn" onClick={() => setIsFollowUpModalOpen(false)}>
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="follow-up-container">
              {/* Vänster: Info / Historik */}
              <div className="avvikelse-info-panel">
                <div className="panel-tabs">
                  <button 
                    className={`panel-tab ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                  >
                    Information
                  </button>
                  <button 
                    className={`panel-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    Historik
                  </button>
                </div>

                {activeTab === 'info' ? (
                  <>
                    <div className="info-header">
                      <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                        <select 
                          name="priority" 
                          value={formData.priority} 
                          onChange={handleInputChange}
                          className={`priority-badge priority-${(formData.priority || 'Medium').toLowerCase()}`}
                          style={{ border: 'none', cursor: 'pointer', appearance: 'none', padding: '0.1rem 0.4rem' }}
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Critical">Critical</option>
                        </select>
                        
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <select name="severity" value={formData.severity} onChange={handleInputChange} className="risk-badge-mini" style={{ padding: '0 2px', fontSize: '0.65rem' }}>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                          <span style={{ fontSize: '0.65rem' }}>×</span>
                          <select name="probability" value={formData.probability} onChange={handleInputChange} className="risk-badge-mini" style={{ padding: '0 2px', fontSize: '0.65rem' }}>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      </div>
                      {getStatusIcon(selectedAvvikelse.status)}
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <input 
                        type="text" 
                        name="titel" 
                        value={formData.titel} 
                        onChange={handleInputChange}
                        style={{ fontWeight: '600', fontSize: '1rem', padding: '0.25rem 0.5rem' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deadline:</label>
                      <input 
                        type="date" 
                        name="deadline" 
                        value={formData.deadline} 
                        onChange={handleInputChange}
                        style={{ width: '100%', border: 'none', borderBottom: '1px solid var(--line)', padding: '2px', fontSize: '0.875rem' }}
                      />
                    </div>

                    <p className="info-date">Rapporterad: {new Date(selectedAvvikelse.skapad_datum || selectedAvvikelse.created_at || new Date()).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    
                    <div className="info-desc">
                      <strong>Beskrivning:</strong>
                      <textarea 
                        name="beskrivning" 
                        value={formData.beskrivning} 
                        onChange={handleInputChange}
                        rows="4"
                        style={{ width: '100%', border: 'none', fontSize: '0.875rem', resize: 'none', padding: 0 }}
                      />
                    </div>

                    <div className="info-desc" style={{marginTop: '1rem'}}>
                      <strong>Fakta (5W2H):</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '60px' }}>Vem:</span>
                          <input type="text" name="vem" value={formData.vem} onChange={handleInputChange} style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--line)', padding: '2px', fontSize: '0.875rem' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '60px' }}>Vad:</span>
                          <input type="text" name="vad" value={formData.vad} onChange={handleInputChange} style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--line)', padding: '2px', fontSize: '0.875rem' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '60px' }}>När:</span>
                          <input type="text" name="nar" value={formData.nar} onChange={handleInputChange} style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--line)', padding: '2px', fontSize: '0.875rem' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', width: '60px' }}>Var:</span>
                          <input type="text" name="var" value={formData.var} onChange={handleInputChange} style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--line)', padding: '2px', fontSize: '0.875rem' }} />
                        </div>
                      </div>
                    </div>

                    <div className="info-desc" style={{marginTop: '1.5rem'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                        <strong style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <Paperclip size={16} /> Bilagor
                        </strong>
                        <button 
                          className="btn-secondary btn-sm" 
                          onClick={() => followUpFileInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          {isUploading ? <Loader className="spin" size={14} style={{marginRight: '4px'}}/> : <Plus size={14} style={{marginRight: '4px'}}/>}
                          {isUploading ? 'Laddar upp...' : 'Lägg till'}
                        </button>
                        <input 
                          type="file" 
                          multiple 
                          onChange={handleFollowUpFileUpload} 
                          ref={followUpFileInputRef}
                          style={{ display: 'none' }} 
                        />
                      </div>
                      
                      {(!selectedAvvikelse.attachments || selectedAvvikelse.attachments.length === 0) && !isUploading ? (
                        <p className="text-muted" style={{fontSize: '0.875rem', fontStyle: 'italic'}}>Inga bilagor uppladdade.</p>
                      ) : (
                        <div className="attachments-grid">
                          {selectedAvvikelse.attachments?.map((file, index) => (
                            file.type.startsWith('image/') ? (
                              <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" title={file.name}>
                                <img src={file.url} alt={file.name} className="attachment-thumbnail" />
                              </a>
                            ) : (
                              <a key={index} href={file.url} target="_blank" rel="noopener noreferrer" className="attachment-doc" title={file.name}>
                                <FileText size={24} color="var(--primary-color)" />
                                <span className="file-name">{file.name}</span>
                              </a>
                            )
                          ))}
                          {isUploading && (
                             <div className="attachment-doc" style={{opacity: 0.7}}>
                                <Loader className="spin" size={24} color="var(--text-muted)" />
                                <span className="file-name">Laddar upp...</span>
                             </div>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="audit-history">
                    <h3>Händelsehistorik</h3>
                    {isLogsLoading ? (
                      <div className="loading-logs">
                        <Loader className="spin" size={20} />
                        <span>Hämtar historik...</span>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <p className="no-logs">Ingen historik tillgänglig för detta ärende.</p>
                    ) : (
                      <div className="audit-timeline">
                        {auditLogs.map((log) => (
                          <div key={log.id} className="audit-item">
                            <div className="audit-dot"></div>
                            <div className="audit-content">
                              <div className="audit-header">
                                <span className="audit-action">
                                  {log.action === 'CREATE' ? 'Skapad' : log.action === 'UPDATE' ? 'Uppdaterad' : 'Raderad'}
                                </span>
                                <span className="audit-time">
                                  {new Date(log.created_at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}
                                </span>
                              </div>
                              <div className="audit-user">
                                {log.user_email || 'System'}
                              </div>
                              {log.action === 'UPDATE' && log.changes && log.changes.old && log.changes.new && (
                                <div className="audit-changes">
                                  {Object.keys(log.changes.new).map(key => {
                                    if (JSON.stringify(log.changes.old[key]) === JSON.stringify(log.changes.new[key])) return null;
                                    if (['updated_at', 'attachments', 'problemdefinition'].includes(key)) return null;
                                    
                                    if (key === 'uppfoljning') {
                                      const oldU = log.changes.old[key] || {};
                                      const newU = log.changes.new[key] || {};
                                      return Object.keys(newU).map(uKey => {
                                        if (JSON.stringify(oldU[uKey]) !== JSON.stringify(newU[uKey])) {
                                          return (
                                            <div key={`${key}-${uKey}`} className="change-item">
                                              <span className="change-key">{uKey}:</span>
                                              <span className="change-old">{String(oldU[uKey] || 'n/a')}</span>
                                              <span className="change-arrow">→</span>
                                              <span className="change-new">{String(newU[uKey] || 'n/a')}</span>
                                            </div>
                                          );
                                        }
                                        return null;
                                      });
                                    }

                                    return (
                                      <div key={key} className="change-item">
                                        <span className="change-key">{key}:</span>
                                        <span className="change-old">{String(log.changes.old[key] || 'n/a')}</span>
                                        <span className="change-arrow">→</span>
                                        <span className="change-new">{String(log.changes.new[key] || 'n/a')}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Höger: Tidslinje/Steg */}
              <div className="timeline-panel">
                <div className="timeline">
                  {/* Steg 1 */}
                  <div className="timeline-item completed">
                    <div className="timeline-marker"><CheckCircle size={16} /></div>
                    <div className="timeline-content">
                      <h4>1. Registrerad</h4>
                      <p className="text-muted">Avvikelsen skapades {new Date(selectedAvvikelse.skapad_datum || selectedAvvikelse.created_at || new Date()).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>

                  {/* Steg 2 */}
                  <div className={`timeline-item ${activeStep > 2 ? 'completed' : activeStep === 2 ? 'active' : 'disabled'}`}>
                    <div className="timeline-marker">{activeStep > 2 ? <CheckCircle size={16}/> : activeStep === 2 ? '2' : <Lock size={14}/>}</div>
                    <div className="timeline-content">
                      <h4>2. Kortsiktiga åtgärder</h4>
                      {activeStep === 2 ? (
                        <div className="step-edit">
                          <textarea 
                            value={followUpData.kortsiktiga} 
                            onChange={(e) => setFollowUpData({...followUpData, kortsiktiga: e.target.value})}
                            placeholder="Vad gjordes direkt för att lösa problemet?"
                            rows="3"
                          />
                          <button className="btn-primary btn-sm" onClick={() => handleSaveStep(2)}>Spara & Gå vidare</button>
                        </div>
                      ) : activeStep > 2 ? (
                        <div className="step-view">
                          <p>{followUpData.kortsiktiga}</p>
                          <button className="btn-text" onClick={() => setActiveStep(2)}>Ändra</button>
                        </div>
                      ) : (
                        <p className="text-muted">Låst tills föregående steg är klart</p>
                      )}
                    </div>
                  </div>

                  {/* Steg 3 */}
                  <div className={`timeline-item ${activeStep > 3 ? 'completed' : activeStep === 3 ? 'active' : 'disabled'}`}>
                    <div className="timeline-marker">{activeStep > 3 ? <CheckCircle size={16}/> : activeStep === 3 ? '3' : <Lock size={14}/>}</div>
                    <div className="timeline-content">
                      <h4>3. Rotorsaksanalys (5 Varför)</h4>
                      {activeStep === 3 ? (
                        <div className="step-edit">
                          <p className="text-muted mb-3" style={{fontSize: '0.875rem'}}>Fråga "Varför?" upprepade gånger för att hitta grundorsaken till problemet.</p>
                          <div className="five-whys-container">
                            <input type="text" placeholder="1. Varför hände det?" value={followUpData.varfor1} onChange={(e) => setFollowUpData({...followUpData, varfor1: e.target.value})} />
                            <input type="text" placeholder="2. Varför (orsak till svar 1)?" value={followUpData.varfor2} onChange={(e) => setFollowUpData({...followUpData, varfor2: e.target.value})} />
                            <input type="text" placeholder="3. Varför (orsak till svar 2)?" value={followUpData.varfor3} onChange={(e) => setFollowUpData({...followUpData, varfor3: e.target.value})} />
                            <input type="text" placeholder="4. Varför (orsak till svar 3)?" value={followUpData.varfor4} onChange={(e) => setFollowUpData({...followUpData, varfor4: e.target.value})} />
                            <input type="text" placeholder="5. Varför (orsak till svar 4)?" value={followUpData.varfor5} onChange={(e) => setFollowUpData({...followUpData, varfor5: e.target.value})} />
                          </div>
                          
                          <div className="form-section-title" style={{ marginTop: '1rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h5 style={{ fontSize: '0.875rem', fontWeight: '600' }}>Fastställd Rotorsak</h5>
                            <button className="btn-secondary btn-sm" onClick={generateRotorsak} disabled={isGenerating}>
                              <Bot size={14} style={{marginRight: '4px'}}/> AI-Sammanfattning
                            </button>
                          </div>
                          <textarea 
                            value={followUpData.rotorsak} 
                            onChange={(e) => setFollowUpData({...followUpData, rotorsak: e.target.value})}
                            placeholder="Sammanfatta den slutgiltiga rotorsaken här..."
                            rows="3"
                          />
                          <button className="btn-primary btn-sm" onClick={() => handleSaveStep(3)}>Spara & Gå vidare</button>
                        </div>
                      ) : activeStep > 3 ? (
                        <div className="step-view">
                          <p><strong>Fastställd Rotorsak:</strong></p>
                          <p>{followUpData.rotorsak}</p>
                          <button className="btn-text" onClick={() => setActiveStep(3)}>Ändra</button>
                        </div>
                      ) : (
                        <p className="text-muted">Låst tills föregående steg är klart</p>
                      )}
                    </div>
                  </div>

                  {/* Steg 4 */}
                  <div className={`timeline-item ${activeStep > 4 ? 'completed' : activeStep === 4 ? 'active' : 'disabled'}`}>
                    <div className="timeline-marker">{activeStep > 4 ? <CheckCircle size={16}/> : activeStep === 4 ? '4' : <Lock size={14}/>}</div>
                    <div className="timeline-content">
                      <h4>4. Långsiktiga åtgärder</h4>
                      {activeStep === 4 ? (
                        <div className="step-edit">
                          <textarea 
                            value={followUpData.langsiktiga} 
                            onChange={(e) => setFollowUpData({...followUpData, langsiktiga: e.target.value})}
                            placeholder="Vad görs för att det inte ska hända igen?"
                            rows="3"
                          />
                          <button className="btn-primary btn-sm" onClick={() => handleSaveStep(4)}>Spara & Gå vidare</button>
                        </div>
                      ) : activeStep > 4 ? (
                        <div className="step-view">
                          <p>{followUpData.langsiktiga}</p>
                          <button className="btn-text" onClick={() => setActiveStep(4)}>Ändra</button>
                        </div>
                      ) : (
                        <p className="text-muted">Låst tills föregående steg är klart</p>
                      )}
                    </div>
                  </div>

                  {/* Steg 5 */}
                  <div className={`timeline-item ${activeStep > 5 ? 'completed' : activeStep === 5 ? 'active' : 'disabled'}`}>
                    <div className="timeline-marker">{activeStep > 5 ? <CheckCircle size={16}/> : activeStep === 5 ? '5' : <Lock size={14}/>}</div>
                    <div className="timeline-content">
                      <h4>5. Godkänn och avsluta</h4>
                      {activeStep === 5 ? (
                        <div className="step-edit">
                          <p className="mb-3">Är alla åtgärder genomförda och verifierade?</p>
                          <button className="btn-success" onClick={() => handleSaveStep(5)}>
                            <CheckCircle size={18} /> Godkänn och Stäng Avvikelse
                          </button>
                        </div>
                      ) : activeStep > 5 ? (
                        <div className="step-view">
                          <p className="text-success font-medium">Avvikelsen är granskad och avslutad.</p>
                          <button className="btn-text" onClick={() => setActiveStep(5)}>Ångra</button>
                        </div>
                      ) : (
                        <p className="text-muted">Låst tills föregående steg är klart</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
            <div className="form-actions" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--line)', marginTop: 0 }}>
              <button type="button" className="btn-secondary" onClick={() => setIsFollowUpModalOpen(false)}>
                Avbryt
              </button>
              <button type="button" className="btn-primary" onClick={handleUpdateMainInfo} disabled={isSaving}>
                {isSaving ? <Loader className="spin" size={16} style={{marginRight: '8px'}} /> : null}
                Uppdatera Information
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvvikelseList;
