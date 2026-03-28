import React, { useState, useMemo } from 'react';
import { 
  X, FileText, Layout, Building2, Globe, Search, 
  ChevronRight, Plus, Image as ImageIcon, File
} from 'lucide-react';
import { useAuth } from '../../../shared/api/AuthContext';
import { createDokument } from '../api/dokument';
import { toast } from 'react-toastify';
import './CreateDocumentModal.css';

const CreateDocumentModal = ({ isOpen, onClose, onCreated, templates = [] }) => {
  const { userProfile, currentUser } = useAuth();
  const [activeCategory, setActiveCategory] = useState('new'); // 'new', 'company', 'global'
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Safety check for templates
  const safeTemplates = Array.isArray(templates) ? templates : [];

  if (!isOpen) return null;

  const companyTemplates = useMemo(() => 
    safeTemplates.filter(t => t.is_template && t.company_id === userProfile?.company_id && !t.is_global),
    [safeTemplates, userProfile]
  );

  const globalTemplates = useMemo(() => 
    safeTemplates.filter(t => t.is_global && t.is_template),
    [safeTemplates]
  );

  const filteredTemplates = useMemo(() => {
    const list = activeCategory === 'company' ? companyTemplates : globalTemplates;
    if (!searchTerm) return list;
    return list.filter(t => 
      t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeCategory, companyTemplates, globalTemplates, searchTerm]);

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
        company_id: userProfile?.company_id,
        creator_uid: currentUser?.id,
        is_template: false,
        is_global: false
      };

      const created = await createDokument(newDoc);
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
    try {
      const { id, created_at, updated_at, ...templateData } = template;
      const newDoc = {
        ...templateData,
        title: `${template.title} (Kopia)`,
        company_id: userProfile?.company_id,
        creator_uid: currentUser?.id,
        is_template: false,
        is_global: false,
        status: 'utkast'
      };

      const created = await createDokument(newDoc);
      onCreated(created);
      onClose();
      toast.success('Mall importerad!');
    } catch (error) {
      console.error('Failed to use template:', error);
      toast.error('Kunde inte använda mallen');
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
              <span>SafeQMS Mallar</span>
              <span className="count">{globalTemplates.length}</span>
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
              </h2>
              <p>
                {activeCategory === 'new' && 'Börja från grunden med ett tomt dokument.'}
                {activeCategory === 'company' && 'Använd en mall som skapats inom din organisation.'}
                {activeCategory === 'global' && 'Färdiga mallar och standarder från SafeQMS.'}
              </p>
            </div>
            <button className="close-btn" onClick={onClose}>
              <X size={24} />
            </button>
          </header>

          <div className="main-content">
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

                <div className="template-grid">
                  {filteredTemplates.map(template => (
                    <div 
                      key={template.id} 
                      className="template-card"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <div className="template-preview">
                        <FileText size={32} />
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
};

export default CreateDocumentModal;
