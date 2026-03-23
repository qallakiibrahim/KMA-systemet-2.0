import React, { useState, useEffect } from 'react';
import { Library, Search, Download, FileText, Activity, Shield, AlertTriangle, Plus, Filter } from 'lucide-react';
import { getProcesses, createProcess } from '../../process/api/process';
import { getDokuments, createDokument } from '../../dokument/api/dokument';
import { getRisker, createRisk } from '../../risk/api/risk';
import { useAuth } from '../../../shared/api/AuthContext';
import { toast } from 'react-toastify';
import '../styles/Library.css';

const LibraryList = () => {
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
      const [processes, documents, risks] = await Promise.all([
        getProcesses(),
        getDokuments(),
        getRisker()
      ]);

      // Filter for templates
      // Note: We assume is_template column exists. If not, we'll filter by title or just show all for now
      // but ideally we filter by is_template === true
      setTemplates({
        processes: processes.filter(p => p.is_template || p.title.toLowerCase().includes('mall')),
        documents: documents.filter(d => d.is_template || d.title.toLowerCase().includes('mall')),
        risks: risks.filter(r => r.is_template || r.title.toLowerCase().includes('mall'))
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

    try {
      const { id, created_at, updated_at, ...itemData } = item;
      const newItem = {
        ...itemData,
        company_id: userProfile.company_id,
        is_template: false,
        is_global: false,
        title: `${item.title} (Kopia)`,
        created_by: currentUser.id
      };

      if (type === 'process') {
        await createProcess(newItem);
      } else if (type === 'document') {
        await createDokument(newItem);
      } else if (type === 'risk') {
        await createRisk(newItem);
      }

      toast.success(`${item.title} har importerats till ditt företag!`);
    } catch (error) {
      console.error('Import failed', error);
      toast.error('Kunde inte importera mallen');
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
          <button className="btn-secondary btn-sm" onClick={() => handleImport(item, type)}>
            <Download size={14} /> Importera
          </button>
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
          <div className="tab-group">
            <button className={activeTab === 'all' ? 'active' : ''} onClick={() => setActiveTab('all')}>Alla</button>
            <button className={activeTab === 'process' ? 'active' : ''} onClick={() => setActiveTab('process')}>Processer</button>
            <button className={activeTab === 'document' ? 'active' : ''} onClick={() => setActiveTab('document')}>Dokument</button>
            <button className={activeTab === 'risk' ? 'active' : ''} onClick={() => setActiveTab('risk')}>Risker</button>
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
