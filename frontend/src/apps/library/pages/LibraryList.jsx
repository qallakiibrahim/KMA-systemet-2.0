import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Library, Search, Download, FileText, Activity, Shield, AlertTriangle, Plus, Filter, ExternalLink } from 'lucide-react';
import { getProcesses, createProcess, getGlobalProcesses } from '../../process/api/process';
import { getDokuments, createDokument, getGlobalTemplates } from '../../dokument/api/dokument';
import { getRisker, createRisk, getGlobalRisks } from '../../risk/api/risk';
import { useAuth } from '../../../shared/api/AuthContext';
import { toast } from 'react-toastify';
import '../styles/Library.css';

const LibraryList = () => {
  const navigate = useNavigate();
  const { userProfile, currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [filterType, setFilterType] = useState('all'); // all, global, company
  
  const [templates, setTemplates] = useState({
    processes: [],
    documents: [],
    risks: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getProcesses(1, -1),
        getDokuments(1, -1),
        getRisker(1, -1),
        getGlobalProcesses(),
        getGlobalTemplates(),
        getGlobalRisks()
      ]);

      const processes = results[0].status === 'fulfilled' ? (results[0].value?.data || (Array.isArray(results[0].value) ? results[0].value : [])) : [];
      const documents = results[1].status === 'fulfilled' ? (results[1].value?.data || (Array.isArray(results[1].value) ? results[1].value : [])) : [];
      const risks = results[2].status === 'fulfilled' ? (results[2].value?.data || (Array.isArray(results[2].value) ? results[2].value : [])) : [];
      const globalProcesses = results[3].status === 'fulfilled' ? results[3].value : [];
      const globalDocuments = results[4].status === 'fulfilled' ? results[4].value : [];
      const globalRisks = results[5].status === 'fulfilled' ? results[5].value : [];

      // Merge and filter for templates
      const mergeAndFilter = (local, global) => {
        const merged = [...local];
        global.forEach(g => {
          if (!merged.find(l => l.id === g.id)) merged.push(g);
        });
        return merged.filter(item => 
          item.is_template === true || 
          item.is_global === true || 
          !item.company_id ||
          item.title?.toLowerCase().includes('mall')
        );
      };

      setTemplates({
        processes: mergeAndFilter(processes, globalProcesses),
        documents: mergeAndFilter(documents, globalDocuments),
        risks: mergeAndFilter(risks, globalRisks)
      });
    } catch (error) {
      console.error('Failed to fetch library data', error);
      toast.error('Kunde inte hämta biblioteksdata');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImport = async (item, type) => {
    if (!userProfile?.company_id) {
      return toast.error('Du måste vara kopplad till ett företag för att importera mallar.');
    }

    console.log('Importing item:', item.title, 'Type:', type);
    try {
      // Strip out metadata and relationship fields that shouldn't be inserted
      const { 
        id, 
        created_at, 
        updated_at, 
        attachments, 
        creator_uid: oldCreator, 
        created_by: oldCreatedBy,
        company_id: oldCompany,
        ...itemData 
      } = item;

      const newItem = {
        ...itemData,
        company_id: userProfile.company_id,
        is_template: false,
        is_global: false,
        title: `${item.title} (Kopia)`,
        status: 'utkast'
      };

      // Set correct user ID field based on type
      if (type === 'document') {
        newItem.creator_uid = currentUser?.id;
      } else {
        newItem.created_by = currentUser?.id;
      }

      let createdItem;
      if (type === 'process') {
        createdItem = await createProcess(newItem);
      } else if (type === 'document') {
        createdItem = await createDokument(newItem);
      } else if (type === 'risk') {
        createdItem = await createRisk(newItem);
      }

      toast.success(`${item.title} har importerats till ditt företag!`);
      
      // Redirect to the new item so they can edit it
      if (createdItem && createdItem.id) {
        const route = type === 'document' ? 'dokument' : type;
        navigate(`/${route}?id=${createdItem.id}`);
      }
    } catch (error) {
      console.error('Import failed', error);
      toast.error('Kunde inte importera mallen: ' + (error.message || 'Okänt fel'));
    }
  };

  const renderItem = (item, type) => {
    const Icon = type === 'process' ? Activity : type === 'document' ? FileText : Shield;
    
    return (
      <div key={item.id} className="library-card">
        <div className="library-card-header">
          <div className={`library-icon-wrapper ${type}`}>
            <Icon size={24} />
          </div>
          <div className="library-card-info">
            <h4>{item.title}</h4>
            <p className="text-muted">{type === 'process' ? 'Processmall' : type === 'document' ? 'Dokumentmall' : 'Riskmall'}</p>
          </div>
        </div>
        <div className="library-card-body">
          <p>{item.description || 'Ingen beskrivning tillgänglig.'}</p>
          <div className="library-tags">
            {item.is_global && <span className="tag global">SafeQMS Global</span>}
            {!item.is_global && item.is_template && <span className="tag company">Företagsmall</span>}
          </div>
        </div>
        <div className="library-card-footer">
          <button className="btn btn-secondary btn-sm" onClick={() => handleImport(item, type)}>
            <Download size={14} /> Importera
          </button>
          <a href={item.file_url || `/${type === 'document' ? 'dokument' : type}?id=${item.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
            <ExternalLink size={14} /> Öppna
          </a>
        </div>
      </div>
    );
  };

  const allItems = [
    ...templates.processes.map(p => ({ ...p, type: 'process' })),
    ...templates.documents.map(d => ({ ...d, type: 'document' })),
    ...templates.risks.map(r => ({ ...r, type: 'risk' }))
  ].filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'global' && item.is_global) || 
                         (filterType === 'company' && !item.is_global);

    return matchesSearch && matchesTab && matchesFilter;
  });

  return (
    <div className="library-container">
      <div className="library-header">
        <div>
          <h1>Mall-bibliotek</h1>
          <p>Hitta och använd färdiga mallar från SafeQMS eller ditt eget företag</p>
        </div>
        <div className="library-stats">
          <div className="stat-item">
            <span className="stat-value">{allItems.length}</span>
            <span className="stat-label">Tillgängliga mallar</span>
          </div>
        </div>
      </div>

      <div className="library-controls">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Sök mallar..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <div className="filter-tabs">
            <button className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Alla</button>
            <button className={`filter-tab ${activeTab === 'process' ? 'active' : ''}`} onClick={() => setActiveTab('process')}>Processer</button>
            <button className={`filter-tab ${activeTab === 'document' ? 'active' : ''}`} onClick={() => setActiveTab('document')}>Dokument</button>
            <button className={`filter-tab ${activeTab === 'risk' ? 'active' : ''}`} onClick={() => setActiveTab('risk')}>Risker</button>
          </div>
          
          <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">Alla källor</option>
            <option value="global">SafeQMS Bibliotek</option>
            <option value="company">Mitt Företags Bibliotek</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Laddar bibliotek...</div>
      ) : (
        <div className="library-grid">
          {allItems.map(item => renderItem(item, item.type))}
          {allItems.length === 0 && (
            <div className="empty-state">
              <Library size={48} />
              <h3>Inga mallar hittades</h3>
              <p>Försök med en annan sökning eller filter.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LibraryList;
