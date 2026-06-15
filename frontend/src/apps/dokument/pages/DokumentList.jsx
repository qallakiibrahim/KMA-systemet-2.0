import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDokuments, createDokument, updateDokument, deleteDokument, uploadDocument, getDokumentById, getGlobalTemplates } from '../api/dokument';
import { getProcesses, createProcess, getGlobalProcesses } from '../../process/api/process';
import { useAuth } from '../../../shared/api/AuthContext';
import { useSearch } from '../../../shared/context/SearchContext';
import { useRegisterHeaderActions } from '../../../shared/context/HeaderActionsContext';
import { db } from '../../../firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import DocumentEditor from '../components/DocumentEditor';
import { 
  Plus, Edit2, Trash2, X, FileText, Download, ExternalLink, 
  File, UploadCloud, Loader, Search, Filter, Grid, List as ListIcon,
  FileCode, FileImage, FileAudio, FileVideo, FileArchive, FileSpreadsheet,
  PlusCircle, Activity, ChevronLeft, ChevronRight, AlertOctagon
} from 'lucide-react';
import { toast } from 'react-toastify';
import CreateDocumentModal from '../components/CreateDocumentModal';
import { parseSafeDate } from '../../../shared/utils/dateUtils';
import '../styles/DokumentList.css';

const FileIcon = ({ type, size = 24 }) => {
  if (!type) return <File size={size} />;
  if (type.includes('pdf')) return <FileText size={size} className="text-red-500" />;
  if (type.includes('image')) return <FileImage size={size} className="text-blue-500" />;
  if (type.includes('video')) return <FileVideo size={size} className="text-purple-500" />;
  if (type.includes('audio')) return <FileAudio size={size} className="text-pink-500" />;
  if (type.includes('zip') || type.includes('archive')) return <FileArchive size={size} className="text-yellow-600" />;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet size={size} className="text-green-600" />;
  if (type.includes('javascript') || type.includes('json') || type.includes('html') || type.includes('css')) return <FileCode size={size} className="text-orange-500" />;
  return <File size={size} />;
};

const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const DokumentList = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDokument, setEditingDokument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  const { searchQuery, setSearchQuery } = useSearch();
  
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    file_url: '', 
    category: 'general',
    iso_chapter: '',
    status: 'utkast',
    version: '1.0',
    file_type: '',
    file_size: 0,
    is_template: false
  });
  const [activeTab, setActiveTab] = useState('info'); // 'info' or 'history'
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const { currentUser, userProfile } = useAuth();

  const [isApprovalFormOpen, setIsApprovalFormOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [signatureType, setSignatureType] = useState('formal');
  const [nextReviewDate, setNextReviewDate] = useState(() => {
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    return oneYearLater.toISOString().split('T')[0];
  });
  const [approvalVersionBump, setApprovalVersionBump] = useState('minor');

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Register header actions
  const headerActions = useMemo(() => (
    <div className="flex gap-2">
      <button className="btn btn-secondary btn-sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
        {viewMode === 'grid' ? <ListIcon size={16} /> : <Grid size={16} />}
        <span className="hide-on-mobile">{viewMode === 'grid' ? 'Lista' : 'Rutnät'}</span>
      </button>
      {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && (
        <button className="btn btn-primary btn-sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} />
          <span>Nytt dokument</span>
        </button>
      )}
    </div>
  ), [viewMode, userProfile]);

  useRegisterHeaderActions(headerActions);

  useEffect(() => {
    // No-op, removed local searchTerm
  }, []);

  // TanStack Query for documents
  const { data: docsData, isLoading: docsLoading, isError: docsError, error: docsErr } = useQuery({
    queryKey: ['documents', userProfile?.company_id, page, pageSize],
    queryFn: () => getDokuments(userProfile?.company_id, page, pageSize),
    placeholderData: (previousData) => previousData,
    enabled: !!userProfile?.company_id || userProfile?.role === 'superadmin',
  });

  // TanStack Query for processes (fetch all for now to merge)
  const { data: processesData, isLoading: processesLoading } = useQuery({
    queryKey: ['processes', userProfile?.company_id, 1, -1],
    queryFn: () => getProcesses(userProfile?.company_id, 1, -1),
    enabled: !!userProfile?.company_id || userProfile?.role === 'superadmin',
  });

  // TanStack Query for global templates
  const { data: globalDocsData, isLoading: globalDocsLoading } = useQuery({
    queryKey: ['globalDocuments'],
    queryFn: getGlobalTemplates,
  });

  // TanStack Query for global processes
  const { data: globalProcessesData, isLoading: globalProcessesLoading } = useQuery({
    queryKey: ['globalProcesses'],
    queryFn: getGlobalProcesses,
  });

  const dokumentsList = useMemo(() => docsData?.data || (Array.isArray(docsData) ? docsData : []), [docsData]);
  const totalCount = docsData?.count || (Array.isArray(docsData) ? (docsData.length || 0) : 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  const processesList = useMemo(() => processesData?.data || (Array.isArray(processesData) ? processesData : []), [processesData]);
  const globalDocs = useMemo(() => globalDocsData || [], [globalDocsData]);
  const globalProcesses = useMemo(() => globalProcessesData || [], [globalProcessesData]);

  // Merge items using useMemo instead of state + useEffect to avoid infinite loops
  const mergedDokuments = useMemo(() => {
    const merged = [...dokumentsList];
    globalDocs.forEach(gd => {
      if (!merged.find(d => d.id === gd.id)) merged.push(gd);
    });
    return merged;
  }, [dokumentsList, globalDocs]);

  const mergedProcesses = useMemo(() => {
    const merged = [...processesList];
    globalProcesses.forEach(gp => {
      if (!merged.find(p => p.id === gp.id)) merged.push(gp);
    });
    return merged;
  }, [processesList, globalProcesses]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const docId = searchParams.get('id');
    if (docId && !isEditorOpen && mergedDokuments.length > 0) {
      const docToOpen = mergedDokuments.find(d => String(d.id) === String(docId));
      
      if (docToOpen) {
        if (!docToOpen.file_url) {
          setEditingDokument(docToOpen);
          setIsEditorOpen(true);
          searchParams.delete('id');
          setSearchParams(searchParams, { replace: true });
        } else if (docToOpen.file_url) {
          openModal(docToOpen);
          searchParams.delete('id');
          setSearchParams(searchParams, { replace: true });
        }
      }
    }
  }, [searchParams, mergedDokuments, isEditorOpen, setSearchParams]);

  const loading = docsLoading || processesLoading || globalDocsLoading || globalProcessesLoading;

  useEffect(() => {
    if (isModalOpen) {
      const scrollY = window.pageYOffset;
      document.body.dataset.scrollY = scrollY.toString();
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add('modal-open-lock');
    } else {
      const scrollY = document.body.dataset.scrollY;
      document.body.classList.remove('modal-open-lock');
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0'));
      }
    }
    return () => {
      document.body.classList.remove('modal-open-lock');
      document.body.style.top = '';
    };
  }, [isModalOpen]);

  // Handle background scroll for CreateDocumentModal too
  useEffect(() => {
    if (isCreateModalOpen) {
      const scrollY = window.pageYOffset;
      document.body.dataset.scrollY = scrollY.toString();
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add('modal-open-lock');
    } else if (!isModalOpen) { // Only remove if main modal is not also open
      const scrollY = document.body.dataset.scrollY;
      document.body.classList.remove('modal-open-lock');
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0'));
      }
    }
  }, [isCreateModalOpen, isModalOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleApprove = async () => {
    if (!editingDokument) return;
    if (approvalComment.trim().length < 3) {
      toast.warning('Vänligen fyll i en granskarkommentar (minst 3 tecken) för att godkänna dokumentet.');
      return;
    }
    try {
      // Calculate bumped version
      let currentVersion = parseFloat(editingDokument.version || '1.0') || 1.0;
      let nextVersion = editingDokument.version || '1.0';
      if (approvalVersionBump === 'minor') {
        nextVersion = (currentVersion + 0.1).toFixed(1);
      } else if (approvalVersionBump === 'major') {
        nextVersion = (Math.floor(currentVersion) + 1).toFixed(1);
      }

      const existingRevisions = editingDokument.revisions || [];
      const newRevision = {
        version: nextVersion,
        approved_at: new Date().toISOString(),
        approved_by: userProfile?.name || currentUser.email,
        approved_by_email: currentUser.email,
        comment: approvalComment,
        signature_type: signatureType,
        file_url: formData.file_url || editingDokument.file_url || ''
      };

      const updates = { 
        status: 'godkänd',
        version: nextVersion,
        approved_by: currentUser.uid,
        approved_by_email: currentUser.email,
        approved_by_name: userProfile?.name || currentUser.email,
        approved_at: new Date().toISOString(),
        next_review_date: nextReviewDate,
        approval_comment: approvalComment,
        signature_type: signatureType,
        revisions: [...existingRevisions, newRevision]
      };
      
      await updateDokument(editingDokument.id, updates, currentUser);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Dokumentet har godkänts officiellt (version ${nextVersion})!`);
      
      // Reset approval states
      setIsApprovalFormOpen(false);
      setIsModalOpen(false);
      setApprovalComment('');
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Kunde inte godkänna dokumentet');
    }
  };
  const handleFileChange = async (e) => {
    const file = e.target.files ? e.target.files[0] : e;
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      setFormData(prev => ({ 
        ...prev, 
        file_url: result.url,
        title: prev.title || result.name,
        file_type: result.type,
        file_size: result.size
      }));
      toast.success('Fil uppladdad!');
    } catch (error) {
      console.error('Upload failed', error);
      toast.error('Kunde inte ladda upp fil: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const fetchAuditLogs = async (docId) => {
    setIsLogsLoading(true);
    try {
      const { getAuditLogs } = await import('../../../shared/api/auditLog');
      const logsResponse = await getAuditLogs(1, 50, { 
        entity_type: 'DOCUMENT', 
        entity_id: docId 
      });
      setAuditLogs(logsResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch audit logs', error);
    } finally {
      setIsLogsLoading(false);
    }
  };

  const openModal = (doc = null) => {
    setIsApprovalFormOpen(false);
    setApprovalComment('');
    setSignatureType('formal');
    setApprovalVersionBump('minor');
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    setNextReviewDate(oneYearLater.toISOString().split('T')[0]);

    if (doc) {
      // If it has no file_url, it's a created document
      if (!doc.file_url) {
        setEditingDokument(doc);
        setIsEditorOpen(true);
        return;
      }
      setEditingDokument(doc);
      setFormData({
        title: doc.title || '',
        description: doc.description || '',
        file_url: doc.file_url || '',
        category: doc.category || 'general',
        iso_chapter: doc.iso_chapter || '',
        status: doc.status || 'utkast',
        version: doc.version || '1.0',
        file_type: doc.file_type || '',
        file_size: doc.file_size || 0,
        is_template: doc.is_template || false
      });
      setActiveTab('info');
      fetchAuditLogs(doc.id);
    } else {
      setEditingDokument(null);
      setFormData({ 
        title: '', 
        description: '', 
        file_url: '', 
        category: 'general',
        iso_chapter: '',
        status: 'utkast',
        version: '1.0',
        file_type: '',
        file_size: 0,
        is_template: false
      });
      setActiveTab('info');
      setAuditLogs([]);
    }
    setIsModalOpen(true);
  };

  const translateKey = (key) => {
    const translations = {
      title: 'Titel',
      description: 'Beskrivning',
      category: 'Kategori',
      iso_chapter: 'ISO-kapitel',
      status: 'Status',
      version: 'Version',
      file_url: 'Fil-URL',
      is_template: 'Mall',
      file_type: 'Filtyp',
      file_size: 'Filstorlek'
    };
    return translations[key] || key;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!editingDokument && !userProfile?.company_id && userProfile?.role !== 'superadmin') {
        toast.error('Du måste vara kopplad till ett företag för att ladda upp ett dokument. Kontakta en administratör.');
        return;
      }

      // Ensure we have a company_id if the user is a superadmin but not linked yet
      let companyId = userProfile?.company_id;
      
      if (!companyId && userProfile?.role === 'superadmin') {
        const companiesRef = collection(db, 'companies');
        const qComp = query(companiesRef, where('name', '==', 'SafeQMS'), limit(1));
        const companiesSnap = await getDocs(qComp);
        if (!companiesSnap.empty) {
          companyId = companiesSnap.docs[0].id;
        }
      }

      if (editingDokument) {
        let finalForm = { ...formData, company_id: companyId };
        if (editingDokument.status === 'godkänd' && formData.status === 'godkänd') {
          finalForm.status = 'utkast';
          toast.info('Ändring av ett godkänt dokument återställer status till "Utkast" för ny granskning.');
        }
        await updateDokument(editingDokument.id, finalForm, currentUser);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        toast.success('Dokument uppdaterat!');
      } else {
        const newDoc = {
          ...formData,
          creator_uid: currentUser?.uid || null,
          company_id: companyId,
          is_global: userProfile?.role === 'superadmin' && formData.is_template,
          file_url: formData.file_url || '' // Ensure file_url is present
        };
        await createDokument(newDoc, currentUser);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        toast.success('Dokument tillagt!');
      }
      setIsModalOpen(false);
      setEditingDokument(null);
      setFormData({ 
        title: '', 
        description: '', 
        file_url: '', 
        category: 'general',
        iso_chapter: '',
        status: 'utkast',
        version: '1.0',
        file_type: '',
        file_size: 0,
        is_template: false
      });
    } catch (error) {
      console.error('Failed to save dokument', error);
      toast.error('Kunde inte spara dokument');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Är du säker på att du vill radera detta dokument?')) {
      try {
        await deleteDokument(id, currentUser);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        toast.success('Dokument raderat');
      } catch (error) {
        console.error('Failed to delete dokument', error);
        toast.error('Kunde inte radera dokument');
      }
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'godkänd': return { label: 'Godkänd', className: 'status-approved' };
      case 'granskning': return { label: 'Granskning', className: 'status-review' };
      case 'arkiverad': return { label: 'Arkiverad', className: 'status-archived' };
      default: return { label: 'Utkast', className: 'status-draft' };
    }
  };

  const filteredItems = [...mergedDokuments, ...mergedProcesses.map(p => ({ ...p, is_process: true }))].filter(item => {
    const queryTerm = (searchQuery || searchTerm || '').toLowerCase();
    const matchesSearch = 
      item.title.toLowerCase().includes(queryTerm) ||
      item.description?.toLowerCase().includes(queryTerm);
    
    const matchesCategory = categoryFilter === 'all' || 
                           item.category === categoryFilter || 
                           (item.is_process && categoryFilter === 'process');
    
    const itemStatus = item.status || 'utkast';
    const matchesStatus = statusFilter === 'all' || 
                          (item.is_process ? (statusFilter === 'godkänd') : itemStatus === statusFilter);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (docsError) {
    return (
      <div className="error-state">
        <AlertOctagon size={48} className="text-level-high" />
        <h2>Ett fel uppstod vid hämtning av dokument</h2>
        <p>{docsErr?.message || 'Kunde inte ansluta till databasen'}</p>
        <button className="btn btn-primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['documents'] })}>
          Försök igen
        </button>
      </div>
    );
  }

  const handleOpenItem = (item) => {
    if (item.is_process) {
      navigate(`/process?id=${item.id}`);
      return;
    }

    if (item.file_url) {
      window.open(item.file_url, '_blank');
    } else {
      setEditingDokument(item);
      setIsEditorOpen(true);
    }
  };

  console.log('DokumentList render, isCreateModalOpen:', isCreateModalOpen);
  return (
    <div className="dokument-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dokumentbibliotek</h1>
          <p className="subtitle">Centralt arkiv för verksamhetens styrande dokument, manualer och processer</p>
        </div>
      </div>

      <div className="library-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            Alla
          </button>
          <button 
            className={`filter-tab ${categoryFilter === 'process' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('process')}
          >
            Processer
          </button>
          <button 
            className={`filter-tab ${categoryFilter === 'policy' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('policy')}
          >
            Policy
          </button>
          <button 
            className={`filter-tab ${categoryFilter === 'manual' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('manual')}
          >
            Manualer
          </button>
          <button 
            className={`filter-tab ${categoryFilter === 'contract' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('contract')}
          >
            Avtal
          </button>
          <button 
            className={`filter-tab ${categoryFilter === 'report' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('report')}
          >
            Rapporter
          </button>
        </div>

        <div className="status-filter-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 1.5rem 0.5rem 0.75rem',
              borderRadius: '0.625rem',
              fontSize: '0.85rem',
              fontWeight: '500',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '130px'
            }}
          >
            <option value="all">Alla statusar</option>
            <option value="utkast">Utkast</option>
            <option value="granskning">Under granskning</option>
            <option value="godkänd">Aktiv / Godkänd</option>
            <option value="arkiverad">Arkiverad</option>
          </select>
        </div>
      </div>

      <div className={`dokument-container ${viewMode}`}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl w-full">
            <Loader className="spin text-primary-color mb-4" size={40} />
            <p className="text-gray-500 font-medium">Uppdaterar biblioteket...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <h3>Inga dokument hittades</h3>
            <p>{searchTerm ? 'Inga dokument matchar din sökning.' : 'Det finns inga uppladdade dokument i denna kategori.'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="dokument-grid">
            {filteredItems.map((d) => {
              const statusInfo = getStatusBadge(d.status);
              return (
                <div key={`${d.is_process ? 'p' : 'd'}-${d.id}`} className={`dokument-card ${d.is_process ? 'process-card' : ''}`}>
                  <div className="card-header">
                    <div className="card-top">
                      <span className={`status-badge-mini ${statusInfo.className}`}>{statusInfo.label}</span>
                      <div className="card-actions-top">
                        {!d.is_process && (
                          <button className="btn-icon-small" onClick={() => openModal(d)} title="Redigera">
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button className="btn-icon-small delete" onClick={() => handleDelete(d.id)} title="Radera">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="card-title-group">
                      <div className="dokument-icon-wrapper">
                        {d.is_process ? <Activity size={18} className="text-blue-500" /> : <FileIcon type={d.file_type} size={18} />}
                      </div>
                      <div className="title-container">
                        <h3 className="card-title" title={d.title}>{d.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="dokument-category-badge">{d.is_process ? 'Process' : d.category}</span>
                          {d.iso_chapter && <span className="dokument-category-badge iso-badge">ISO: {d.iso_chapter}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card-body">
                    <p className="card-description">{d.description || 'Ingen beskrivning tillgänglig.'}</p>
                  </div>
                  
                  <div className="card-footer">
                    <div className="card-meta">
                      <span className="date">📅 {parseSafeDate(d.created_at).toLocaleDateString('sv-SE')}</span>
                      {d.file_size > 0 && <span className="size"> • 📦 {formatSize(d.file_size)}</span>}
                    </div>
                    <button onClick={() => handleOpenItem(d)} className="btn-open-doc">
                      <ExternalLink size={16} />
                      <span>Öppna</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="dokument-list-view">
            <table className="dokument-table">
              <thead>
                <tr>
                  <th>Namn</th>
                  <th>Kategori</th>
                  <th>ISO-kapitel</th>
                  <th>Status</th>
                  <th>Storlek</th>
                  <th>Datum</th>
                  <th>Åtgärder</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((d) => (
                  <tr key={`${d.is_process ? 'p' : 'd'}-${d.id}`}>
                    <td data-label="Namn">
                      <div className="table-cell-title">
                        {d.is_process ? <Activity size={18} className="text-blue-500" /> : <FileIcon type={d.file_type} size={18} />}
                        <span>{d.title}</span>
                      </div>
                    </td>
                    <td data-label="Kategori"><span className="dokument-category capitalize">{d.is_process ? 'Process' : d.category}</span></td>
                    <td data-label="ISO-kapitel">{d.iso_chapter || '-'}</td>
                    <td data-label="Status">
                      <span className={`status-badge-mini ${getStatusBadge(d.status).className}`}>
                        {getStatusBadge(d.status).label}
                      </span>
                    </td>
                    <td data-label="Storlek">{d.file_size ? formatSize(d.file_size) : '-'}</td>
                    <td data-label="Datum">{parseSafeDate(d.created_at).toLocaleDateString('sv-SE')}</td>
                    <td data-label="Åtgärder">
                      <div className="card-actions">
                        {!d.is_process && (
                          <button className="btn-icon" onClick={() => openModal(d)} title="Redigera">
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button onClick={() => handleOpenItem(d)} className="btn-icon" title="Öppna">
                          <ExternalLink size={16} />
                        </button>
                        <button className="btn-icon delete" onClick={() => handleDelete(d.id)} title="Radera">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <button 
            className="pagination-btn" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '0.5rem', borderRadius: '0.625rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="pagination-info" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Sida {page} av {totalPages}</span>
          <button 
            className="pagination-btn" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '0.5rem', borderRadius: '0.625rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {isCreateModalOpen && (
        <CreateDocumentModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          templates={mergedDokuments}
          processTemplates={mergedProcesses}
          onCreated={(newDoc) => {
            console.log('Document created, opening editor:', newDoc);
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setEditingDokument(newDoc);
            setIsEditorOpen(true);
          }}
        />
      )}

      {isEditorOpen && (
        <DocumentEditor 
          document={editingDokument} 
          onClose={() => {
            setIsEditorOpen(false);
            setEditingDokument(null);
          }}
          onSave={(savedDoc) => {
            queryClient.invalidateQueries({ queryKey: ['documents'] });
            setIsEditorOpen(false);
            setEditingDokument(null);
          }}
        />
      )}

      {isModalOpen && (
        <div className="doc-list-modal-overlay">
          <div className="doc-list-modal-content">
            <div className="doc-list-modal-header">
              <div className="doc-list-modal-tabs">
                <button 
                  className={`doc-list-modal-tab ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  {editingDokument ? 'Redigera dokument' : 'Ladda upp nytt dokument'}
                </button>
                {editingDokument && (
                  <button 
                    className={`doc-list-modal-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                  >
                    Historik
                  </button>
                )}
              </div>
              <button className="doc-list-close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>

            {activeTab === 'info' ? (
              isApprovalFormOpen ? (
                <div className="doc-list-dokument-form">
                  <div className="doc-list-modal-body p-6 space-y-4">
                    <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800/80 mb-4">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg flex items-center justify-center shrink-0">
                        <Activity size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 m-0">Signera & Godkänn Ledningsdokument</h3>
                        <p className="text-[11px] text-slate-400 m-0">Skapar formell revisionsspårbarhet enligt ISO 9001/27001-krav</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="doc-list-form-group">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Signaturtyp (Godkännandegrad) *</label>
                        <select 
                          value={signatureType} 
                          onChange={(e) => setSignatureType(e.target.value)}
                          className="w-full text-xs border border-slate-200 dark:border-slate-700/80 rounded-[0.625rem] p-2.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="formal">Formellt ISO-godkännande (Ny version/publikation)</option>
                          <option value="review">Periodisk översyn (Årlig kontroll utan ändringar)</option>
                          <option value="editorial">Mindre korrigering (Tryckfel/Redaktionellt utkast)</option>
                        </select>
                      </div>

                      <div className="doc-list-form-group">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Nästa schemalagda granskning *</label>
                        <input 
                          type="date" 
                          value={nextReviewDate} 
                          onChange={(e) => setNextReviewDate(e.target.value)}
                          className="w-full text-xs border border-slate-200 dark:border-slate-700/80 rounded-[0.625rem] p-2.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          required
                        />
                        <span className="text-[10px] text-slate-400 block mt-0.5">ISO-krav: Ledningsdokument bör omprövas inom 12 månader.</span>
                      </div>
                    </div>

                    <div className="doc-list-form-group bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[0.625rem] border border-slate-200/60 dark:border-slate-800/60 my-2">
                      <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Revisionsnivå (Automatiskt versionsnummer)</label>
                      <div className="flex flex-col gap-2 mt-2">
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input 
                            type="radio" 
                            name="versionBump" 
                            value="minor" 
                            checked={approvalVersionBump === 'minor'} 
                            onChange={() => setApprovalVersionBump('minor')} 
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Minor bump (+0.1: t.ex. {editingDokument?.version || '1.0'} → {(parseFloat(editingDokument?.version || '1.0') + 0.1).toFixed(1)}) — Rekommenderas för mindre ändringar</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input 
                            type="radio" 
                            name="versionBump" 
                            value="major" 
                            checked={approvalVersionBump === 'major'} 
                            onChange={() => setApprovalVersionBump('major')} 
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Major bump (+1.0: t.ex. {editingDokument?.version || '1.0'} → {(Math.floor(parseFloat(editingDokument?.version || '1.0')) + 1).toFixed(1)}) — För helt nya dokument eller större revideringar</span>
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                          <input 
                            type="radio" 
                            name="versionBump" 
                            value="none" 
                            checked={approvalVersionBump === 'none'} 
                            onChange={() => setApprovalVersionBump('none')} 
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Ingen höjning (behåll nuvarande version {editingDokument?.version || '1.0'})</span>
                        </label>
                      </div>
                    </div>

                    <div className="doc-list-form-group">
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Granskarkommentar / Justificering * (Minst 3 tecken)</label>
                      <textarea 
                        rows="3"
                        value={approvalComment} 
                        onChange={(e) => setApprovalComment(e.target.value)}
                        placeholder="t.ex. Granskad och godkänd i linje med kraven på kvalitetspolicyn i ISO 9001:2015. Inga avvikelser funna."
                        className="w-full text-xs border border-slate-200 dark:border-slate-700/80 rounded-[0.625rem] p-2.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        required
                      ></textarea>
                    </div>
                  </div>

                  <div className="doc-list-form-actions">
                    <button 
                      type="button" 
                      className="doc-list-btn-secondary" 
                      onClick={() => setIsApprovalFormOpen(false)}
                      style={{ borderRadius: '0.625rem' }}
                    >
                      Tillbaka till detaljer
                    </button>
                    <button 
                      type="button" 
                      className="doc-list-btn-success" 
                      onClick={handleApprove}
                      disabled={approvalComment.trim().length < 3}
                      style={{ borderRadius: '0.625rem', backgroundColor: 'var(--success-color, #10b981)', color: 'white' }}
                    >
                      Slutför, signera & godkänn
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="doc-list-dokument-form">
                  <div className="doc-list-modal-body">
                    <div 
                      className={`doc-list-drop-zone ${isDragging ? 'dragging' : ''} ${formData.file_url ? 'has-file' : ''}`}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                    >
                      {isUploading ? (
                        <div className="doc-list-upload-status">
                          <Loader className="spin" size={32} />
                          <p>Laddar upp fil...</p>
                        </div>
                      ) : formData.file_url ? (
                        <div className="doc-list-upload-status success">
                          <FileIcon type={formData.file_type} size={32} />
                          <p>Fil klar: {formData.title}</p>
                          <button type="button" className="doc-list-btn-text" onClick={() => setFormData({...formData, file_url: '', file_type: '', file_size: 0})}>
                            Byt fil
                          </button>
                        </div>
                      ) : (
                        <div className="doc-list-upload-prompt">
                          <UploadCloud size={32} />
                          <p>Dra och släpp fil här eller klicka för att välja</p>
                          <input type="file" onChange={handleFileChange} className="doc-list-file-input" />
                        </div>
                      )}
                    </div>

                    <div className="doc-list-form-group">
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
                    
                    <div className="doc-list-form-row">
                      <div className="doc-list-form-group">
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

                      <div className="doc-list-form-group">
                        <label htmlFor="iso_chapter">ISO-kapitel</label>
                        <select
                          id="iso_chapter"
                          name="iso_chapter"
                          value={formData.iso_chapter}
                          onChange={handleInputChange}
                        >
                          <option value="">Välj ISO-kapitel...</option>
                          <optgroup label="4. Organisationens förutsättningar">
                            <option value="4. Organisationens förutsättningar">4. Huvudkapitel</option>
                            <option value="4.1 Förståelse för organisationen">4.1 Förståelse för organisationen</option>
                            <option value="4.2 Intressenters behov">4.2 Intressenters behov</option>
                            <option value="4.3 Avgränsning">4.3 Avgränsning</option>
                            <option value="4.4 Ledningssystemet">4.4 Ledningssystemet</option>
                          </optgroup>
                          <optgroup label="5. Ledarskap">
                            <option value="5. Ledarskap">5. Huvudkapitel</option>
                            <option value="5.1 Ledarskap och åtagande">5.1 Ledarskap och åtagande</option>
                            <option value="5.2 Policy">5.2 Policy</option>
                            <option value="5.3 Roller och ansvar">5.3 Roller och ansvar</option>
                          </optgroup>
                          <optgroup label="6. Planering">
                            <option value="6. Planering">6. Huvudkapitel</option>
                            <option value="6.1 Risker och möjligheter">6.1 Risker och möjligheter</option>
                            <option value="6.2 Mål och planering">6.2 Mål och planering</option>
                            <option value="6.3 Planering av ändringar">6.3 Planering av ändringar</option>
                          </optgroup>
                          <optgroup label="7. Stöd">
                            <option value="7. Stöd">7. Huvudkapitel</option>
                            <option value="7.1 Resurser">7.1 Resurser</option>
                            <option value="7.2 Kompetens">7.2 Kompetens</option>
                            <option value="7.3 Medvetenhet">7.3 Medvetenhet</option>
                            <option value="7.4 Kommunikation">7.4 Kommunikation</option>
                            <option value="7.5 Dokumenterad information">7.5 Dokumenterad information</option>
                          </optgroup>
                          <optgroup label="8. Verksamhet">
                            <option value="8. Verksamhet">8. Huvudkapitel</option>
                            <option value="8.1 Verksamhetsplanering">8.1 Verksamhetsplanering</option>
                            <option value="8.2 Krav på produkter/tjänster">8.2 Krav på produkter/tjänster</option>
                            <option value="8.3 Konstruktion och utveckling">8.3 Konstruktion och utveckling</option>
                            <option value="8.4 Externt tillhandahållna processer">8.4 Externt tillhandahållna processer</option>
                            <option value="8.5 Produktion och tjänsteleverans">8.5 Produktion och tjänsteleverans</option>
                            <option value="8.6 Frisläppande">8.6 Frisläppande</option>
                            <option value="8.7 Avvikande utdata">8.7 Avvikande utdata</option>
                          </optgroup>
                          <optgroup label="9. Utvärdering av prestanda">
                            <option value="9. Utvärdering av prestanda">9. Huvudkapitel</option>
                            <option value="9.1 Övervakning och mätning">9.1 Övervakning och mätning</option>
                            <option value="9.2 Internrevision">9.2 Internrevision</option>
                            <option value="9.3 Ledningens genomgång">9.3 Ledningens genomgång</option>
                          </optgroup>
                          <optgroup label="10. Förbättring">
                            <option value="10. Förbättring">10. Huvudkapitel</option>
                            <option value="10.1 Allmänt">10.1 Allmänt</option>
                            <option value="10.2 Avvikelse och korrigerande åtgärd">10.2 Avvikelse och korrigerande åtgärd</option>
                            <option value="10.3 Ständig förbättring">10.3 Ständig förbättring</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="doc-list-form-group">
                        <label htmlFor="status">Status</label>
                        <select
                          id="status"
                          name="status"
                          value={formData.status}
                          onChange={handleInputChange}
                        >
                          <option value="utkast">Utkast</option>
                          <option value="granskning">Granskning</option>
                          <option value="godkänd" disabled={userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin'}>
                            Godkänd {userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin' && '(Endast Admin)'}
                          </option>
                          <option value="arkiverad" disabled={userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin'}>
                            Arkiverad {userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin' && '(Endast Admin)'}
                          </option>
                        </select>
                      </div>

                      <div className="doc-list-form-group">
                        <label htmlFor="version" className="flex justify-between items-center w-full">
                          <span>Version</span>
                          {editingDokument && (
                            <span className="text-[10px] text-slate-400 font-normal">Nuvarande: {editingDokument.version || '1.0'}</span>
                          )}
                        </label>
                        <input
                          type="text"
                          id="version"
                          name="version"
                          value={formData.version}
                          onChange={handleInputChange}
                          placeholder="t.ex. 1.1"
                          className="mb-1"
                        />
                        {editingDokument && (
                          <div className="flex gap-1.5 mt-1">
                            <button
                              type="button"
                              className="bg-slate-50 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-medium py-1 px-2.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                              onClick={() => {
                                const curr = parseFloat(editingDokument.version || '1.0') || 1.0;
                                setFormData({ ...formData, version: (curr + 0.1).toFixed(1) });
                              }}
                              style={{ borderRadius: '0.625rem' }}
                            >
                              Minor bump (+0.1)
                            </button>
                            <button
                              type="button"
                              className="bg-slate-50 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 font-medium py-1 px-2.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                              onClick={() => {
                                const curr = parseFloat(editingDokument.version || '1.0') || 1.0;
                                setFormData({ ...formData, version: (Math.floor(curr) + 1).toFixed(1) });
                              }}
                              style={{ borderRadius: '0.625rem' }}
                            >
                              Major bump (+1.0)
                            </button>
                          </div>
                        )}
                      </div>

                      {editingDokument && editingDokument.status === 'godkänd' && (
                        <div className="col-span-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 rounded-lg p-3 text-xs flex flex-col gap-1 mt-2">
                          <strong className="font-semibold">⚠️ Publicerat Dokument</strong>
                          <p className="m-0 leading-relaxed text-slate-600 dark:text-slate-300 text-[11px]">
                            Detta dokument är aktivt godkänt. Sparade ändringar återställer dess status till <strong>Utkast</strong> för att granskas och godkännas på nytt. Det rekommenderas att du höjer versionsnumret ovan.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="doc-list-form-group mt-4 pt-4 border-t">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="is_template"
                          checked={formData.is_template}
                          onChange={(e) => setFormData({...formData, is_template: e.target.checked})}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm font-medium">Gör till mall</span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1 ml-6">
                        Dokumentet kommer att visas i mallbiblioteket så att andra kan använda det.
                      </p>
                    </div>

                    <div className="doc-list-form-group">
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
                  </div>

                  <div className="doc-list-form-actions">
                    <button 
                      type="button" 
                      className="doc-list-btn-secondary" 
                      onClick={() => setIsModalOpen(false)}
                      style={{ borderRadius: '0.625rem' }}
                    >
                      Avbryt
                    </button>
                    {editingDokument && formData.status === 'granskning' && (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && (
                      <button 
                        type="button" 
                        className="doc-list-btn-success" 
                        onClick={() => setIsApprovalFormOpen(true)}
                        style={{ borderRadius: '0.625rem', backgroundColor: '#10b981', color: 'white' }}
                      >
                        Godkänn dokument
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="doc-list-btn-primary" 
                      disabled={!formData.file_url || isUploading}
                      style={{ borderRadius: '0.625rem' }}
                    >
                      {editingDokument ? 'Spara ändringar' : 'Ladda upp till bibliotek'}
                    </button>
                  </div>
                </form>
              )
            ) : (
              <div className="doc-list-history-tab-content p-6 space-y-6">
                {/* Certified Active ISO Seal */}
                {editingDokument?.status === 'godkänd' && (
                  <div className="p-4 rounded-[0.625rem] bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 flex gap-4 items-start shadow-sm mb-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/35 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Activity size={22} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded uppercase tracking-wider">Aktiv Kvalitetsrevisionsstämpel</span>
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Utgåva v{editingDokument.version || '1.0'}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 m-0 leading-relaxed">
                        <strong>Godkänd av:</strong> {editingDokument.approved_by_name || editingDokument.approved_by_email || 'Kvalitetsansvarig'} ({editingDokument.approved_by_email || 'aktivt certifierad'}) <br />
                        <strong>Godkännandedatum:</strong> {editingDokument.approved_at ? parseSafeDate(editingDokument.approved_at).toLocaleString('sv-SE') : 'n/a'} <br />
                        <strong>Signaturtyp:</strong> {editingDokument.signature_type === 'formal' ? 'Formellt ISO-godkännande' : editingDokument.signature_type === 'review' ? 'Periodisk översyn' : 'Mindre ändring'} <br />
                        <strong>Kommentar:</strong> "{editingDokument.approval_comment || 'Godkänt utan kommentar.'}"
                      </p>
                      {editingDokument.next_review_date && (
                        <div className="text-xs mt-1.5 font-bold pt-1.5 border-t border-emerald-200/40 dark:border-emerald-800/40">
                          <span className="text-slate-400 font-medium">Nästa schemalagda granskning:</span> {editingDokument.next_review_date}{' '}
                          {(() => {
                            const daysLeft = Math.ceil((new Date(editingDokument.next_review_date) - new Date()) / (1000 * 60 * 60 * 24));
                            if (daysLeft < 0) {
                              return <span className="text-rose-500 font-extrabold ml-1">⚠️ KRÄVER REGULATIONSSKÄRPNING - FÖRFALLEN MED {Math.abs(daysLeft)} DAGAR!</span>;
                            } else if (daysLeft < 30) {
                              return <span className="text-amber-500 font-extrabold ml-1">🕒 ÖVERSYN KRÄVS SNART (om {daysLeft} dagar!)</span>;
                            } else {
                              return <span className="text-emerald-600 dark:text-emerald-400 font-extrabold ml-1">✓ Aktivt godkänd (granskas om {daysLeft} dagar)</span>;
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Historic Releases list */}
                {editingDokument?.revisions && editingDokument.revisions.length > 0 && (
                  <div className="p-4 rounded-[0.625rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 space-y-3 mb-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider m-0">Dokumentets Revisionshistorik (Signerade Utgåvor)</h4>
                    <div className="space-y-2.5">
                      {editingDokument.revisions.slice().reverse().map((rev, index) => (
                        <div key={index} className="p-3 rounded-lg dark:bg-slate-800/30 bg-white border border-slate-200/70 dark:border-slate-800/70 text-xs flex justify-between items-start gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 dark:text-slate-100">Utgåva v{rev.version}</span>
                              <span className="text-[10px] text-slate-400">{rev.approved_at ? parseSafeDate(rev.approved_at).toLocaleDateString('sv-SE') : ''}</span>
                            </div>
                            <p className="m-0 text-slate-500 dark:text-slate-400 italic">"{rev.comment || 'Mindre uppdatering'}"</p>
                            <p className="m-0 text-[10px] text-slate-400">Signerad av: {rev.approved_by} ({rev.approved_by_email || 'n/a'})</p>
                          </div>
                          {rev.file_url && (
                            <a href={rev.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0">
                              <Download size={13} /> Hämta v{rev.version}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Operationslogg (Audit Trail)</h4>
                {isLogsLoading ? (
                  <div className="doc-list-loading-logs">Laddar historik...</div>
                ) : auditLogs.length === 0 ? (
                  <div className="doc-list-empty-logs text-center py-8">
                    <p className="text-gray-500">Ingen historik hittades för detta dokument.</p>
                    <p className="text-xs text-gray-400 mt-2">Loggning påbörjades 2026-04-08.</p>
                  </div>
                ) : (
                  <div className="doc-list-audit-timeline space-y-4">
                    {auditLogs.map(log => (
                      <div key={log.id} className="doc-list-audit-item flex gap-4 border-l-2 border-gray-100 dark:border-slate-700 pl-4 relative">
                        <div className="doc-list-audit-dot absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary-color border-4 border-white dark:border-slate-800"></div>
                        <div className="doc-list-audit-content flex-1">
                          <div className="doc-list-audit-header flex justify-between items-center mb-1">
                            <span className="doc-list-audit-action text-xs font-bold uppercase tracking-wider text-primary-color">
                              {log.action === 'CREATE' ? 'Skapad' : log.action === 'UPDATE' ? 'Uppdaterad' : 'Raderad'}
                            </span>
                            <span className="doc-list-audit-time text-xs text-gray-400">
                              {parseSafeDate(log.created_at).toLocaleString('sv-SE')}
                            </span>
                          </div>
                          <div className="doc-list-audit-user text-sm font-medium mb-2">
                            {log.user_email}
                            <span className="text-[10px] text-gray-400 ml-2">ID: {log.user_id?.substring(0, 8)}...</span>
                          </div>
                          {log.action === 'UPDATE' && log.changes && log.changes.old && log.changes.new && (
                            <div className="doc-list-audit-changes bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs space-y-1">
                              {Object.keys(log.changes.new).map(key => {
                                if (JSON.stringify(log.changes.old[key]) !== JSON.stringify(log.changes.new[key]) && 
                                    !['updated_at', 'company_id', 'creator_uid', 'id', 'created_at'].includes(key)) {
                                  return (
                                    <div key={key} className="change-item flex items-center gap-2">
                                      <span className="change-key font-semibold text-gray-500">{translateKey(key)}:</span>
                                      <span className="change-old text-red-500 line-through opacity-70">{String(log.changes.old[key] || 'n/a')}</span>
                                      <ChevronRight size={10} className="text-gray-400" />
                                      <span className="change-new text-green-600">{String(log.changes.new[key] || 'n/a')}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                          {log.action === 'CREATE' && log.changes && log.changes.new && (
                            <div className="doc-list-audit-changes bg-gray-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs space-y-1">
                              <div className="text-[10px] text-gray-400 mb-1">Initiala data:</div>
                              {Object.keys(log.changes.new).map(key => {
                                if (!['updated_at', 'company_id', 'creator_uid', 'id', 'created_at'].includes(key) && log.changes.new[key]) {
                                  return (
                                    <div key={key} className="change-item flex items-center gap-2">
                                      <span className="change-key font-semibold text-gray-500">{translateKey(key)}:</span>
                                      <span className="change-new text-green-600">{String(log.changes.new[key])}</span>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DokumentList;
