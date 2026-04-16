import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, FileText, Layout, Building2, Globe, Search, 
  ChevronRight, Plus, Image as ImageIcon, File, Activity
} from 'lucide-react';
import { useAuth } from '../../../shared/api/AuthContext';
import { createDokument } from '../api/dokument';
import { createProcess } from '../../process/api/process';
import { toast } from 'react-toastify';
import './CreateDocumentModal.css';

const CreateDocumentModal = ({ isOpen, onClose, onCreated, templates = [], processTemplates = [] }) => {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState('new'); // 'new', 'company', 'global', 'process'
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Prevent background scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  // Safety check for templates
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const safeProcessTemplates = Array.isArray(processTemplates) ? processTemplates : [];

  const companyTemplates = useMemo(() => 
    safeTemplates.filter(t => (t.is_template || t.title?.toLowerCase().includes('mall')) && t.company_id === userProfile?.company_id && !t.is_global),
    [safeTemplates, userProfile]
  );

  const globalTemplates = useMemo(() => 
    safeTemplates.filter(t => t.is_global || !t.company_id || t.is_template),
    [safeTemplates]
  );

  const companyProcessTemplates = useMemo(() => 
    safeProcessTemplates.filter(t => (t.is_template || t.title?.toLowerCase().includes('mall')) && t.company_id === userProfile?.company_id && !t.is_global),
    [safeProcessTemplates, userProfile]
  );

  const globalProcessTemplates = useMemo(() => 
    safeProcessTemplates.filter(t => (t.is_global || !t.company_id) && (t.is_template || t.title?.toLowerCase().includes('mall'))),
    [safeProcessTemplates]
  );

  const filteredTemplates = useMemo(() => {
    let list = [];
    if (activeCategory === 'company') list = companyTemplates;
    else if (activeCategory === 'global') list = globalTemplates;
    else if (activeCategory === 'process') list = [...companyProcessTemplates, ...globalProcessTemplates];
    
    if (!searchTerm) return list;
    return list.filter(t => 
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeCategory, companyTemplates, globalTemplates, companyProcessTemplates, globalProcessTemplates, searchTerm]);

  if (!isOpen) return null;

  try {
    console.log('CreateDocumentModal open. Active category:', activeCategory);
    console.log('Templates count:', {
      company: companyTemplates.length,
      global: globalTemplates.length,
      companyProcess: companyProcessTemplates.length,
      globalProcess: globalProcessTemplates.length
    });

  const handleCreateNew = async (visual = false) => {
    setIsCreating(true);
    try {
      const newDoc = {
        title: visual ? 'Nytt Visuellt Dokument' : 'Nytt Dokument',
        description: visual ? 'Ett dokument med fokus på bilder och media.' : 'Ett standard textdokument.',
        content: visual ? {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Nytt Visuellt Dokument' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Börja bygga ditt visuella dokument här...' }] }
          ]
        } : {
          type: 'doc',
          content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Nytt Dokument' }] }
          ]
        },
        category: 'general',
        status: 'utkast',
        version: '1.0',
        company_id: userProfile?.company_id,
        creator_uid: currentUser?.id,
        is_template: false,
        is_global: false,
        file_url: '' // Ensure file_url is present to satisfy not-null constraint
      };

      const created = await createDokument(newDoc, currentUser);
      onCreated(created);
      onClose();
    } catch (error) {
      console.error('Failed to create document:', error);
      toast.error('Kunde inte skapa dokumentet');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUseTemplate = async (template) => {
    setIsCreating(true);
    console.log('Using template:', template.title, 'Category:', activeCategory);
    try {
      // Strip out metadata and relationship fields that shouldn't be inserted
      const { 
        id, 
        created_at, 
        updated_at, 
        attachments, 
        creator_uid: oldCreator, 
        company_id: oldCompany,
        ...templateData 
      } = template;
      
      const isProcess = activeCategory === 'process' || template.type === 'process';
      
      const newItem = {
        ...templateData,
        title: `${template.title} (Kopia)`,
        company_id: userProfile?.company_id,
        is_template: false,
        is_global: false,
        status: 'utkast',
        file_url: template.file_url || '' // Ensure file_url is present
      };

      if (isProcess) {
        // Processes use 'created_by'
        newItem.created_by = currentUser?.id;
        console.log('Creating process from template...', newItem);
        const created = await createProcess(newItem, currentUser);
        toast.success('Processmall importerad!');
        onClose();
        navigate(`/process?id=${created.id}`);
      } else {
        // Documents use 'creator_uid'
        newItem.creator_uid = currentUser?.id;
        console.log('Creating document from template...', newItem);
        const created = await createDokument(newItem, currentUser);
        onCreated(created);
        onClose();
        toast.success('Dokumentmall importerad!');
      }
    } catch (error) {
      console.error('Failed to use template:', error);
      toast.error('Kunde inte använda mallen: ' + (error.message || 'Okänt fel'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-doc-modal-overlay" onClick={onClose}>
      <div className="create-doc-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-sidebar">
          <div className="sidebar-header">
            <h3>Skapa Nytt</h3>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeCategory === 'new' ? 'active' : ''}`}
              onClick={() => setActiveCategory('new')}
            >
              <Plus size={20} />
              <span>Nytt Dokument</span>
            </button>
            <button 
              className={`nav-item ${activeCategory === 'company' ? 'active' : ''}`}
              onClick={() => setActiveCategory('company')}
            >
              <Building2 size={20} />
              <span>Företagets Mallar</span>
              <span className="count">{companyTemplates.length}</span>
            </button>
            <button 
              className={`nav-item ${activeCategory === 'global' ? 'active' : ''}`}
              onClick={() => setActiveCategory('global')}
            >
              <Globe size={20} />
              <span>SafeQMS Dokument</span>
              <span className="count">{globalTemplates.length}</span>
            </button>
            <button 
              className={`nav-item ${activeCategory === 'process' ? 'active' : ''}`}
              onClick={() => setActiveCategory('process')}
            >
              <Activity size={20} />
              <span>Processmallar</span>
              <span className="count">{companyProcessTemplates.length + globalProcessTemplates.length}</span>
            </button>
          </nav>
        </div>

        <div className="modal-main">
          <header className="main-header">
            <div className="header-info">
              <h2>
                {activeCategory === 'new' && 'Välj dokumenttyp'}
                {activeCategory === 'company' && 'Välj från företagets mallar'}
                {activeCategory === 'global' && 'Välj från SafeQMS bibliotek'}
                {activeCategory === 'process' && 'Välj processmall'}
              </h2>
              <p>
                {activeCategory === 'new' && 'Börja från grunden med ett tomt dokument.'}
                {activeCategory === 'company' && 'Använd en mall som skapats inom din organisation.'}
                {activeCategory === 'global' && 'Färdiga mallar och standarder från SafeQMS.'}
                {activeCategory === 'process' && 'Skapa en ny process baserat på en mall.'}
              </p>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </header>

          <div className="main-content" key={activeCategory}>
            {activeCategory === 'new' ? (
              <div className="creation-options">
                <div className="option-card" onClick={() => handleCreateNew(false)}>
                  <div className="option-icon standard">
                    <File size={32} />
                  </div>
                  <div className="option-info">
                    <h4>Vanligt Dokument</h4>
                    <p>Standard textdokument för policyer, manualer och rapporter.</p>
                  </div>
                  <ChevronRight size={20} className="arrow" />
                </div>

                <div className="option-card" onClick={() => handleCreateNew(true)}>
                  <div className="option-icon visual">
                    <ImageIcon size={32} />
                  </div>
                  <div className="option-info">
                    <h4>Visuellt Dokument</h4>
                    <p>Fokus på bilder, media och en luftigare layout.</p>
                  </div>
                  <ChevronRight size={20} className="arrow" />
                </div>
              </div>
            ) : (
              <div className="template-selection">
                <div className="template-search">
                  <Search size={18} />
                  <input 
                    type="text" 
                    placeholder="Sök bland mallar..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="template-grid" key={`${activeCategory}-grid`}>
                  {filteredTemplates.map(template => (
                    <div 
                      key={template.id} 
                      className="template-card"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <div className="template-preview">
                        {activeCategory === 'process' ? <Activity size={32} /> : <FileText size={32} />}
                      </div>
                      <div className="template-info">
                        <h4>{template.title}</h4>
                        <p>{template.description || 'Ingen beskrivning.'}</p>
                      </div>
                    </div>
                  ))}
                  {filteredTemplates.length === 0 && (
                    <div className="empty-templates">
                      <Layout size={48} />
                      <p>Inga mallar hittades i denna kategori.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isCreating && (
        <div className="creating-overlay">
          <div className="loader"></div>
          <p>Skapar dokument...</p>
        </div>
      )}
    </div>
  );
} catch (error) {
  console.error('Error rendering CreateDocumentModal:', error);
  return null;
}
};

export default CreateDocumentModal;
