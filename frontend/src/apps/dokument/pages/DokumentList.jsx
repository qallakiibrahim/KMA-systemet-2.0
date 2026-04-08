import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDokuments, createDokument, updateDokument, deleteDokument, uploadDocument, getDokumentById, getGlobalTemplates } from '../api/dokument';
import { getProcesses, createProcess, getGlobalProcesses } from '../../process/api/process';
import { useAuth } from '../../../shared/api/AuthContext';
import { useSearch } from '../../../shared/context/SearchContext';
import { useRegisterHeaderActions } from '../../../shared/context/HeaderActionsContext';
import { supabase } from '../../../supabase';
import DocumentEditor from '../components/DocumentEditor';
import { 
  Plus, Edit2, Trash2, X, FileText, Download, ExternalLink, 
  File, UploadCloud, Loader, Search, Filter, Grid, List as ListIcon,
  FileCode, FileImage, FileAudio, FileVideo, FileArchive, FileSpreadsheet,
  PlusCircle, Activity, ChevronLeft, ChevronRight, AlertOctagon
} from 'lucide-react';
import { toast } from 'react-toastify';
import CreateDocumentModal from '../components/CreateDocumentModal';
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
  const [isDragging, setIsDragging] = useState(false);
  const { searchQuery, setSearchQuery } = useSearch();
  
  const [formData, setFormData] = useState({ 
    title: '', 
    description: '', 
    file_url: '', 
    category: 'general',
    iso_chapter: '',
    status: 'utkast',
    file_type: '',
    file_size: 0,
    is_template: false
  });
  const { currentUser, userProfile } = useAuth();

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
    queryKey: ['documents', page, pageSize],
    queryFn: () => getDokuments(page, pageSize),
    placeholderData: (previousData) => previousData,
  });

  // TanStack Query for processes (fetch all for now to merge)
  const { data: processesData, isLoading: processesLoading } = useQuery({
    queryKey: ['processes', 1, -1],
    queryFn: () => getProcesses(1, -1),
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

  const dokumentsList = docsData?.data || (Array.isArray(docsData) ? docsData : []);
  const totalCount = docsData?.count || (Array.isArray(docsData) ? docsData.length : 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  const processesList = processesData?.data || (Array.isArray(processesData) ? processesData : []);
  const globalDocs = globalDocsData || [];
  const globalProcesses = globalProcessesData || [];

  // Merge items
  const [mergedDokuments, setMergedDokuments] = useState([]);
  const [mergedProcesses, setMergedProcesses] = useState([]);

  useEffect(() => {
    // Merge global items if they are not already in the list
    const mergedD = [...dokumentsList];
    globalDocs.forEach(gd => {
      if (!mergedD.find(d => d.id === gd.id)) mergedD.push(gd);
    });
    
    const mergedP = [...processesList];
    globalProcesses.forEach(gp => {
      if (!mergedP.find(p => p.id === gp.id)) mergedP.push(gp);
    });

    setMergedDokuments(mergedD);
    setMergedProcesses(mergedP);
  }, [dokumentsList, processesList, globalDocs, globalProcesses]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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

  const openModal = (doc = null) => {
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
        file_type: doc.file_type || '',
        file_size: doc.file_size || 0,
        is_template: doc.is_template || false
      });
    } else {
      setEditingDokument(null);
      setFormData({ 
        title: '', 
        description: '', 
        file_url: '', 
        category: 'general',
        iso_chapter: '',
        status: 'utkast',
        file_type: '',
        file_size: 0,
        is_template: false
      });
    }
    setIsModalOpen(true);
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
        const { data: companies } = await supabase.from('companies').select('id').eq('name', 'SafeQMS').limit(1);
        if (companies && companies.length > 0) {
          companyId = companies[0].id;
        }
      }

      if (editingDokument) {
        await updateDokument(editingDokument.id, { ...formData, company_id: companyId }, currentUser);
        queryClient.invalidateQueries({ queryKey: ['documents'] });
        toast.success('Dokument uppdaterat!');
      } else {
        const newDoc = {
          ...formData,
          creator_uid: currentUser?.id || null,
          company_id: companyId,
          is_global: userProfile?.role === 'superadmin' && formData.is_template
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
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || 
                           item.category === categoryFilter || 
                           (item.is_process && categoryFilter === 'process');
    
    return matchesSearch && matchesCategory;
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

  if (loading) return <div className="loading-spinner">Laddar dokument...</div>;

  const handleCreateNewClick = () => {
    console.log('Button clicked, setting isCreateModalOpen to true');
    setIsCreateModalOpen(true);
  };

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

      <div className="library-controls">
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
      </div>

      <div className={`dokument-container ${viewMode}`}>
        {filteredItems.length === 0 ? (
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
                      <span className="date">📅 {new Date(d.created_at || new Date()).toLocaleDateString('sv-SE')}</span>
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
                    <td data-label="Datum">{new Date(d.created_at || new Date()).toLocaleDateString('sv-SE')}</td>
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
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="pagination-info" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Sida {page} av {totalPages}</span>
          <button 
            className="pagination-btn" 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingDokument ? 'Redigera dokument' : 'Ladda upp nytt dokument'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="dokument-form">
              <div className="modal-body">
                <div 
                  className={`drop-zone ${isDragging ? 'dragging' : ''} ${formData.file_url ? 'has-file' : ''}`}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  {isUploading ? (
                    <div className="upload-status">
                      <Loader className="spin" size={32} />
                      <p>Laddar upp fil...</p>
                    </div>
                  ) : formData.file_url ? (
                    <div className="upload-status success">
                      <FileIcon type={formData.file_type} size={32} />
                      <p>Fil klar: {formData.title}</p>
                      <button type="button" className="btn-text" onClick={() => setFormData({...formData, file_url: '', file_type: '', file_size: 0})}>
                        Byt fil
                      </button>
                    </div>
                  ) : (
                    <div className="upload-prompt">
                      <UploadCloud size={32} />
                      <p>Dra och släpp fil här eller klicka för att välja</p>
                      <input type="file" onChange={handleFileChange} className="file-input" />
                    </div>
                  )}
                </div>

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
                
                <div className="form-row">
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

                  <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="utkast">Utkast</option>
                      <option value="granskning">Granskning</option>
                      <option value="godkänd">Godkänd</option>
                      <option value="arkiverad">Arkiverad</option>
                    </select>
                  </div>
                </div>

                <div className="form-group mt-4 pt-4 border-t">
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
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Avbryt
                </button>
                <button type="submit" className="btn-primary" disabled={!formData.file_url || isUploading}>
                  {editingDokument ? 'Spara ändringar' : 'Ladda upp till bibliotek'}
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
