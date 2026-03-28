import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDokuments, createDokument, updateDokument, deleteDokument, uploadDocument, getDokumentById, getGlobalTemplates } from '../api/dokument';
import { getProcesses, createProcess, getGlobalProcesses } from '../../process/api/process';
import { useAuth } from '../../../shared/api/AuthContext';
import { supabase } from '../../../supabase';
import DocumentEditor from '../components/DocumentEditor';
import { 
  Plus, Edit2, Trash2, X, FileText, Download, ExternalLink, 
  File, UploadCloud, Loader, Search, Filter, Grid, List as ListIcon,
  FileCode, FileImage, FileAudio, FileVideo, FileArchive, FileSpreadsheet,
  PlusCircle
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [dokuments, setDokuments] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDokument, setEditingDokument] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isDragging, setIsDragging] = useState(false);
  
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

  const fetchDokuments = async () => {
    try {
      const results = await Promise.allSettled([
        getDokuments(),
        getProcesses(),
        getGlobalTemplates(),
        getGlobalProcesses()
      ]);
      
      const docsData = results[0].status === 'fulfilled' ? results[0].value : [];
      const processesData = results[1].status === 'fulfilled' ? results[1].value : [];
      const globalDocs = results[2].status === 'fulfilled' ? results[2].value : [];
      const globalProcs = results[3].status === 'fulfilled' ? results[3].value : [];

      if (results.some(r => r.status === 'rejected')) {
        console.warn('Some data fetches failed:', results.filter(r => r.status === 'rejected'));
      }
      
      // Merge global items if they are not already in the list
      const mergedDocs = [...docsData];
      globalDocs.forEach(gd => {
        if (!mergedDocs.find(d => d.id === gd.id)) mergedDocs.push(gd);
      });
      
      const mergedProcs = [...processesData];
      globalProcs.forEach(gp => {
        if (!mergedProcs.find(p => p.id === gp.id)) mergedProcs.push(gp);
      });

      setDokuments(mergedDocs);
      setProcesses(mergedProcs);
    } catch (error) {
      console.error('Failed to fetch data', error);
      toast.error('Kunde inte hämta data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDokuments();
  }, []);

  useEffect(() => {
    const docId = searchParams.get('id');
    console.log('URL docId:', docId, 'dokuments.length:', dokuments.length, 'isEditorOpen:', isEditorOpen);
    
    if (docId && !isEditorOpen) {
      const docToOpen = dokuments.find(d => String(d.id) === String(docId));
      
      if (docToOpen) {
        console.log('Found document in list:', docToOpen.title);
        // If it has no file_url, it's a created document
        if (!docToOpen.file_url) {
          setEditingDokument(docToOpen);
          setIsEditorOpen(true);
          // Remove the id from the URL so it doesn't keep reopening when closed
          searchParams.delete('id');
          setSearchParams(searchParams, { replace: true });
        } else if (docToOpen.file_url) {
          // If it's an uploaded file, open the modal to edit metadata
          openModal(docToOpen);
          // Remove the id from the URL so it doesn't keep opening
          searchParams.delete('id');
          setSearchParams(searchParams, { replace: true });
        }
      } else if (dokuments.length > 0) {
        // If not found in current list but we have a list, try fetching it specifically
        // This is useful for global templates or documents not in the current company view
        console.log('Document not in list, fetching specifically:', docId);
        const fetchAndOpen = async () => {
          try {
            const doc = await getDokumentById(docId);
            if (doc) {
              console.log('Fetched document specifically:', doc.title);
              if (!doc.file_url) {
                setEditingDokument(doc);
                setIsEditorOpen(true);
              } else {
                openModal(doc);
              }
              searchParams.delete('id');
              setSearchParams(searchParams, { replace: true });
            }
          } catch (error) {
            console.error('Failed to fetch document by id', error);
          }
        };
        fetchAndOpen();
      }
    }
  }, [searchParams, dokuments, isEditorOpen, setSearchParams]);

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
        const updated = await updateDokument(editingDokument.id, { ...formData, company_id: companyId });
        setDokuments(dokuments.map(d => d.id === editingDokument.id ? updated : d));
        toast.success('Dokument uppdaterat!');
      } else {
        const newDoc = {
          ...formData,
          creator_uid: currentUser?.id || null,
          company_id: companyId,
          is_global: userProfile?.role === 'superadmin' && formData.is_template
        };
        const created = await createDokument(newDoc);
        setDokuments([created, ...dokuments]);
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
        await deleteDokument(id);
        setDokuments(dokuments.filter(d => d.id !== id));
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

  const filteredDokuments = dokuments.filter(d => {
    const matchesSearch = 
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  console.log('DokumentList render, loading:', loading, 'isCreateModalOpen:', isCreateModalOpen);
  if (loading) return <div className="loading-spinner">Laddar dokument...</div>;

  const handleCreateNewClick = () => {
    console.log('Button clicked, setting isCreateModalOpen to true');
    setIsCreateModalOpen(true);
  };

  console.log('DokumentList render, isCreateModalOpen:', isCreateModalOpen);
  return (
    <div className="dokument-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dokumentbibliotek</h1>
          <p className="subtitle">Centralt arkiv för verksamhetens styrande dokument och manualer</p>
        </div>
        <div className="header-actions">
          <div className="search-bar">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Sök i biblioteket..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleCreateNewClick}>
              <PlusCircle size={20} />
              <span>Nytt Levande Dokument</span>
            </button>
            <button className="btn-primary" onClick={() => openModal()}>
              <Plus size={20} />
              <span>Ladda upp Fil</span>
            </button>
          </div>
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
        
        <div className="view-toggle">
          <button 
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Rutnät"
          >
            <Grid size={18} />
          </button>
          <button 
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="Lista"
          >
            <ListIcon size={18} />
          </button>
        </div>
      </div>

      <div className={`dokument-container ${viewMode}`}>
        {filteredDokuments.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <h3>Inga dokument hittades</h3>
            <p>{searchTerm ? 'Inga dokument matchar din sökning.' : 'Det finns inga uppladdade dokument i denna kategori.'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="dokument-grid">
            {filteredDokuments.map((d) => {
              const statusInfo = getStatusBadge(d.status);
              return (
                <div key={d.id} className="dokument-card">
                  <div className="card-header">
                    <div className="card-top">
                      <span className={`status-badge-mini ${statusInfo.className}`}>{statusInfo.label}</span>
                      <div className="card-actions-top">
                        <button className="btn-icon-small" onClick={() => openModal(d)} title="Redigera">
                          <Edit2 size={14} />
                        </button>
                        <button className="btn-icon-small delete" onClick={() => handleDelete(d.id)} title="Radera">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="card-title-group">
                      <div className="dokument-icon-wrapper">
                        <FileIcon type={d.file_type} size={18} />
                      </div>
                      <div className="title-container">
                        <h3 className="card-title" title={d.title}>{d.title}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="dokument-category-badge">{d.category}</span>
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
                    {d.file_url ? (
                      <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn-open-doc">
                        <ExternalLink size={16} />
                        <span>Öppna</span>
                      </a>
                    ) : (
                      <button onClick={() => {
                        setEditingDokument(d);
                        setIsEditorOpen(true);
                      }} className="btn-open-doc">
                        <ExternalLink size={16} />
                        <span>Öppna</span>
                      </button>
                    )}
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
                {filteredDokuments.map((d) => (
                  <tr key={d.id}>
                    <td data-label="Namn">
                      <div className="table-cell-title">
                        <FileIcon type={d.file_type} size={18} />
                        <span>{d.title}</span>
                      </div>
                    </td>
                    <td data-label="Kategori"><span className="dokument-category capitalize">{d.category}</span></td>
                    <td data-label="ISO-kapitel">{d.iso_chapter || '-'}</td>
                    <td data-label="Status">
                      <span className={`status-badge-mini ${getStatusBadge(d.status).className}`}>
                        {getStatusBadge(d.status).label}
                      </span>
                    </td>
                    <td data-label="Storlek">{formatSize(d.file_size)}</td>
                    <td data-label="Datum">{new Date(d.created_at || new Date()).toLocaleDateString('sv-SE')}</td>
                    <td data-label="Åtgärder">
                      <div className="card-actions">
                        <button className="btn-icon" onClick={() => openModal(d)} title="Redigera">
                          <Edit2 size={16} />
                        </button>
                        {d.file_url ? (
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Öppna">
                            <ExternalLink size={16} />
                          </a>
                        ) : (
                          <button onClick={() => {
                            setEditingDokument(d);
                            setIsEditorOpen(true);
                          }} className="btn-icon" title="Öppna">
                            <ExternalLink size={16} />
                          </button>
                        )}
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

      {isCreateModalOpen && (
        <CreateDocumentModal 
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          templates={dokuments}
          processTemplates={processes}
          onCreated={(newDoc) => {
            setDokuments([newDoc, ...dokuments]);
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
            if (editingDokument) {
              setDokuments(dokuments.map(d => d.id === savedDoc.id ? savedDoc : d));
            } else {
              setDokuments([savedDoc, ...dokuments]);
            }
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
