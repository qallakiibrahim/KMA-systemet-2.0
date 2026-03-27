import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Underline } from '@tiptap/extension-underline';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { 
  Save, X, Paperclip, Link as LinkIcon, Trash2, 
  ChevronRight, ChevronLeft, Globe, Lock, FileText,
  Bold, Italic, List, ListOrdered, Table as TableIcon,
  Undo, Redo, Eraser, ExternalLink, Download, Plus,
  Heading1, Heading2, Heading3, Underline as UnderlineIcon,
  Strikethrough, Quote, Code
} from 'lucide-react';
import { toast } from 'react-toastify';
import { saveDocument, uploadAttachment, deleteAttachment } from '../api/documentService';
import { useAuth } from '../../../shared/api/AuthContext';
import '../styles/DocumentEditor.css';

const MenuBar = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="editor-menubar">
      <div className="menubar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'active' : ''}
          title="Rubrik 1"
        >
          <Heading1 size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'active' : ''}
          title="Rubrik 2"
        >
          <Heading2 size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'active' : ''}
          title="Rubrik 3"
        >
          <Heading3 size={18} />
        </button>
      </div>

      <div className="menubar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'active' : ''}
          title="Fetstil"
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'active' : ''}
          title="Kursiv"
        >
          <Italic size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={editor.isActive('underline') ? 'active' : ''}
          title="Understruken"
        >
          <UnderlineIcon size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'active' : ''}
          title="Genomstruken"
        >
          <Strikethrough size={18} />
        </button>
      </div>

      <div className="menubar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'active' : ''}
          title="Citat"
        >
          <Quote size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'active' : ''}
          title="Kodblock"
        >
          <Code size={18} />
        </button>
      </div>

      <div className="menubar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'active' : ''}
          title="Punktlista"
        >
          <List size={18} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'active' : ''}
          title="Numrerad lista"
        >
          <ListOrdered size={18} />
        </button>
      </div>

      <div className="menubar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Infoga tabell"
        >
          <TableIcon size={18} />
        </button>
      </div>

      <div className="menubar-group">
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Rensa formatering"
        >
          <Eraser size={18} />
        </button>
      </div>

      <div className="menubar-group ml-auto">
        <button type="button" onClick={() => editor.chain().focus().undo().run()} title="Ångra">
          <Undo size={18} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} title="Gör om">
          <Redo size={18} />
        </button>
      </div>
    </div>
  );
};

const DocumentEditor = ({ document, onSave, onClose }) => {
  const { currentUser, userProfile } = useAuth();
  const [title, setTitle] = useState(document?.title || '');
  const [category, setCategory] = useState(document?.category || 'general');
  const [isoChapter, setIsoChapter] = useState(document?.iso_chapter || '');
  const [status, setStatus] = useState(document?.status || 'utkast');
  const [attachments, setAttachments] = useState(document?.attachments || []);
  const [externalLinks, setExternalLinks] = useState(document?.external_links || []);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Börja skriva ditt dokument här...' }),
    ],
    content: document?.content || '',
  });

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Dokumentet måste ha en rubrik');
      return;
    }

    setIsSaving(true);
    try {
      const docData = {
        id: document?.id,
        title,
        content: editor.getJSON(),
        description: editor.getText().substring(0, 200),
        category,
        iso_chapter: isoChapter,
        status,
        external_links: externalLinks,
        company_id: userProfile?.company_id,
        creator_uid: currentUser?.id,
      };

      const savedDoc = await saveDocument(docData);
      toast.success('Dokument sparat!');
      if (onSave) onSave(savedDoc);
    } catch (error) {
      console.error('Save error:', error);
      toast.error(`Kunde inte spara dokumentet: ${error.message || 'Okänt fel'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !document?.id) {
      if (!document?.id) toast.info('Spara dokumentet först innan du laddar upp bilagor');
      return;
    }

    setIsUploading(true);
    try {
      const newAttachment = await uploadAttachment(file, document.id, currentUser.id);
      setAttachments([...attachments, newAttachment]);
      toast.success('Bilaga uppladdad');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Kunde inte ladda upp bilaga');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async (attachment) => {
    setShowConfirmDelete(attachment);
  };

  const confirmDeleteAttachment = async () => {
    const attachment = showConfirmDelete;
    if (!attachment) return;

    try {
      const filePath = attachment.file_url.split('/').pop();
      await deleteAttachment(attachment.id, `attachments/${document.id}/${filePath}`);
      setAttachments(attachments.filter(a => a.id !== attachment.id));
      toast.success('Bilaga borttagen');
    } catch (error) {
      console.error('Delete attachment error:', error);
      toast.error('Kunde inte ta bort bilaga');
    } finally {
      setShowConfirmDelete(null);
    }
  };

  const addExternalLink = () => {
    setShowLinkModal(true);
  };

  const handleAddLink = () => {
    if (newLinkLabel && newLinkUrl) {
      setExternalLinks([...externalLinks, { label: newLinkLabel, url: newLinkUrl }]);
      setNewLinkLabel('');
      setNewLinkUrl('');
      setShowLinkModal(false);
    }
  };

  const removeExternalLink = (index) => {
    setExternalLinks(externalLinks.filter((_, i) => i !== index));
  };

  return (
    <div className="document-editor-container">
      <header className="editor-header">
        <div className="header-left">
          <button className="btn-icon" onClick={onClose} title="Stäng">
            <X size={20} />
          </button>
          <div className="title-input-wrapper">
            <input
              type="text"
              className="title-input"
              placeholder="Dokumentrubrik..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>
        <div className="header-right">
          <div className="status-toggle">
            <button 
              className={`status-btn ${status === 'utkast' ? 'active' : ''}`}
              onClick={() => setStatus('utkast')}
            >
              Utkast
            </button>
            <button 
              className={`status-btn ${status === 'godkänd' ? 'active' : ''}`}
              onClick={() => setStatus('godkänd')}
            >
              Publicerad
            </button>
          </div>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving}>
            <Save size={18} />
            <span>{isSaving ? 'Sparar...' : 'Spara'}</span>
          </button>
          <button className="btn-icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </header>

      <div className="editor-main">
        <div className="editor-content-wrapper">
          <MenuBar editor={editor} />
          <div className="editor-scroller">
            <div className="editor-paper">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {isSidebarOpen && (
          <>
            <div className="sidebar-overlay" onClick={() => window.innerWidth <= 768 && setIsSidebarOpen(false)}></div>
            <aside className="editor-sidebar">
              <div className="sidebar-header-mobile">
                <h3><Globe size={16} /> Metadata & Bilagor</h3>
                <button className="btn-icon" onClick={() => setIsSidebarOpen(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="sidebar-section">
                <h3><Globe size={16} /> Kategori & ISO</h3>
              <div className="form-group">
                <label>Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="general">Allmänt</option>
                  <option value="policy">Policy</option>
                  <option value="manual">Manual</option>
                  <option value="contract">Avtal</option>
                  <option value="report">Rapport</option>
                </select>
              </div>
              <div className="form-group">
                <label>ISO-kapitel</label>
                <select 
                  value={isoChapter} 
                  onChange={(e) => setIsoChapter(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
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
              <div className="metadata-info">
                <p><strong>Skapad:</strong> {new Date(document?.created_at || new Date()).toLocaleDateString()}</p>
                <p><strong>Ägare:</strong> {userProfile?.display_name}</p>
              </div>
            </div>

            <div className="sidebar-section">
              <div className="section-header">
                <h3><Paperclip size={16} /> Bilagor</h3>
                <label className="btn-add-small">
                  <Plus size={14} />
                  <input type="file" onChange={handleFileUpload} hidden disabled={isUploading} />
                </label>
              </div>
              <ul className="attachment-list">
                {attachments.map((a) => (
                  <li key={a.id} className="attachment-item">
                    <div className="attachment-info">
                      <FileText size={14} />
                      <span title={a.file_name}>{a.file_name}</span>
                    </div>
                    <div className="attachment-actions">
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" title="Ladda ner">
                        <Download size={14} />
                      </a>
                      <button onClick={() => handleRemoveAttachment(a)} title="Ta bort">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
                {attachments.length === 0 && <p className="empty-text">Inga bilagor</p>}
              </ul>
            </div>

            <div className="sidebar-section">
              <div className="section-header">
                <h3><LinkIcon size={16} /> Externa Länkar</h3>
                <button className="btn-add-small" onClick={addExternalLink}>
                  <Plus size={14} />
                </button>
              </div>
              <ul className="link-list">
                {externalLinks.map((link, i) => (
                  <li key={i} className="link-item">
                    <div className="link-info">
                      <ExternalLink size={14} />
                      <a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a>
                    </div>
                    <button onClick={() => removeExternalLink(i)} title="Ta bort">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
                {externalLinks.length === 0 && <p className="empty-text">Inga länkar</p>}
              </ul>
            </div>
          </aside>
          </>
        )}
      </div>

      {showLinkModal && (
        <div className="editor-modal-overlay">
          <div className="editor-modal">
            <h4>Lägg till extern länk</h4>
            <div className="form-group">
              <label>Etikett</label>
              <input 
                type="text" 
                value={newLinkLabel} 
                onChange={(e) => setNewLinkLabel(e.target.value)}
                placeholder="t.ex. Referensmaterial"
              />
            </div>
            <div className="form-group">
              <label>URL</label>
              <input 
                type="text" 
                value={newLinkUrl} 
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="editor-modal-actions">
              <button className="btn-cancel" onClick={() => setShowLinkModal(false)}>Avbryt</button>
              <button className="btn-confirm" onClick={handleAddLink}>Lägg till</button>
            </div>
          </div>
        </div>
      )}

      {showConfirmDelete && (
        <div className="editor-modal-overlay">
          <div className="editor-modal">
            <h4>Ta bort bilaga</h4>
            <p>Är du säker på att du vill ta bort bilagan "{showConfirmDelete.file_name}"?</p>
            <div className="editor-modal-actions">
              <button className="btn-cancel" onClick={() => setShowConfirmDelete(null)}>Avbryt</button>
              <button className="btn-confirm" onClick={confirmDeleteAttachment}>Ta bort</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;
