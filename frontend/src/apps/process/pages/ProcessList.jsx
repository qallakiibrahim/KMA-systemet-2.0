import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { getProcesses, createProcess, updateProcess, deleteProcess } from '../api/process';
import { useAuth } from '../../../shared/api/AuthContext';
import { supabase } from '../../../supabase';
import { Plus, Edit2, Trash2, X, Activity, CheckCircle, Clock, Search, ChevronRight, Layout, ArrowLeft, ChevronLeft, Save, MousePointer2, Settings, PlusCircle, AlertOctagon } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSearch } from '../../../shared/context/SearchContext';
import { useHeaderActions } from '../../../shared/context/HeaderActionsContext';
import ProcessVisualizer from '../components/ProcessVisualizer';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/ProcessList.css';

// Custom Node for the Process Map
const MapNode = ({ data }) => (
  <div className={`map-node ${data.category || 'core'}`}>
    <Handle type="target" position={Position.Left} />
    <div className="map-node-content">
      <div className="map-node-title">{data.label}</div>
      {data.description && <div className="map-node-desc">{data.description}</div>}
    </div>
    <Handle type="source" position={Position.Right} />
  </div>
);

const nodeTypes = {
  mapNode: MapNode,
};

const EMPTY_ARRAY = [];

const ProcessListContent = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(-1); // Fetch all processes for the map view to ensure root map is found
  const [isEditMode, setIsEditMode] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, title: '', type: 'process' });
  
  const [rfInstance, setRfInstance] = useState(null);
  const [defaultViewport, setDefaultViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showMobileAddMenu, setShowMobileAddMenu] = useState(false);
  
  const { currentUser, userProfile } = useAuth();
  const { searchQuery } = useSearch();
  const { getViewport, getNodes, getEdges, setViewport } = useReactFlow();

  // Register header actions
  const headerActions = useMemo(() => {
    if (isMobile) return null;
    
    if (!isEditMode) {
      if (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') {
        return (
          <button className="btn btn-secondary btn-sm" onClick={() => { setIsEditMode(true); setSelectedNode(null); }}>
            <Edit2 size={16} />
            <span>Redigera karta</span>
          </button>
        );
      }
      return null;
    }

    return (
      <div className="flex gap-2">
        <button className="btn btn-secondary btn-sm" onClick={() => { setIsEditMode(false); setSelectedNode(null); }}>
          <X size={16} />
          <span>Avbryt</span>
        </button>
        <button className="btn btn-primary btn-sm" onClick={saveMap} disabled={isSaving}>
          <Save size={16} />
          <span>{isSaving ? 'Sparar...' : 'Spara karta'}</span>
        </button>
      </div>
    );
  }, [isMobile, isEditMode, userProfile, isSaving, saveMap]);

  useHeaderActions(headerActions);

  // TanStack Query for data fetching
  const { data: processesData, isLoading: loading, isError, error } = useQuery({
    queryKey: ['processes', page, pageSize],
    queryFn: () => getProcesses(page, pageSize),
    placeholderData: (previousData) => previousData,
  });

  const processes = useMemo(() => processesData?.data || (Array.isArray(processesData) ? processesData : EMPTY_ARRAY), [processesData]);
  const totalCount = processesData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (processes.length > 0 && !isEditMode) {
      // Look for the Root Map by specific title
      const rootMap = processes.find(p => p.title === 'Huvudprocesskarta');
      
      if (rootMap && rootMap.steps && Array.isArray(rootMap.steps.nodes)) {
        setNodes(rootMap.steps.nodes || []);
        setEdges(rootMap.steps.edges || []);
        if (rootMap.steps.viewport) {
          setDefaultViewport(rootMap.steps.viewport);
          // Also explicitly set the viewport if the flow is ready
          if (rfInstance) {
            rfInstance.setViewport(rootMap.steps.viewport);
          }
        }
      }
    }
  }, [processes, isEditMode, rfInstance]);

  // Helper to remove non-serializable data (functions) before saving
  const cleanNodesForStorage = (nodesToClean) => {
    return nodesToClean.map(node => ({
      id: node.id,
      type: node.type,
      position: { 
        x: typeof node.position?.x === 'number' ? node.position.x : 0, 
        y: typeof node.position?.y === 'number' ? node.position.y : 0 
      },
      data: Object.keys(node.data || {}).reduce((acc, key) => {
        if (typeof node.data[key] !== 'function') {
          acc[key] = node.data[key];
        }
        return acc;
      }, {}),
      width: node.width,
      height: node.height,
      parentId: node.parentId,
      extent: node.extent,
    }));
  };

  const cleanEdgesForStorage = (edgesToClean) => {
    return edgesToClean.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      label: edge.label,
      data: Object.keys(edge.data || {}).reduce((acc, key) => {
        if (typeof edge.data[key] !== 'function') {
          acc[key] = edge.data[key];
        }
        return acc;
      }, {}),
      animated: edge.animated,
      markerEnd: edge.markerEnd,
    }));
  };

  useEffect(() => {
    const processId = searchParams.get('id');
    if (processId && processes.length > 0) {
      console.log('URL has processId:', processId);
      const processToOpen = processes.find(p => String(p.id) === String(processId));
      if (processToOpen) {
        console.log('Found process from URL:', processToOpen.title);
        setNavigationStack([processToOpen]);
        // Remove the id from the URL so it doesn't keep reopening when closed
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('id');
        setSearchParams(newParams, { replace: true });
      } else {
        // If not found in list, try fetching directly
        console.log('Process not found in list, fetching directly...');
        import('../api/process').then(({ getProcessById }) => {
          getProcessById(processId).then(fetchedProc => {
            if (fetchedProc) {
              console.log('Fetched process directly:', fetchedProc.title);
              setNavigationStack([fetchedProc]);
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('id');
              setSearchParams(newParams, { replace: true });
            }
          }).catch(err => console.error('Failed to fetch process from URL', err));
        });
      }
    }
  }, [searchParams, processes, setSearchParams]);

  const onInit = useCallback((instance) => {
    setRfInstance(instance);
    const rootMap = processes.find(p => p.title === 'Huvudprocesskarta');
    if (rootMap?.steps?.viewport) {
      instance.setViewport(rootMap.steps.viewport);
    }
  }, [processes]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeDragStop = useCallback((event, node) => {
    console.log('Node drag stopped:', node.id, node.position);
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed }
    }, eds)),
    []
  );

  const onNodeClick = useCallback((event, node) => {
    if (isEditMode) {
      setSelectedNode(node);
    } else {
      // Drill down to the process
      const processId = node.data?.processId || node.id;
      const process = processes.find(p => String(p.id) === String(processId));
      if (process) {
        setNavigationStack([process]);
      }
    }
  }, [isEditMode, processes]);

  const handleDrillDown = useCallback((subProcessId, subProcessObject) => {
    const subProcess = subProcessObject || processes.find(p => p.id === subProcessId);
    if (subProcess) {
      setNavigationStack(prev => [...prev, subProcess]);
    } else {
      // Fallback: fetch directly if not found in state
      import('../api/process').then(({ getProcessById }) => {
        getProcessById(subProcessId).then(fetchedProc => {
          if (fetchedProc) {
            setNavigationStack(prev => [...prev, fetchedProc]);
          }
        }).catch(err => console.error('Failed to fetch sub-process', err));
      });
    }
  }, [processes]);

  const handleGoBack = useCallback(() => {
    setNavigationStack(prev => {
      const newStack = [...prev];
      newStack.pop();
      return newStack;
    });
  }, []);

  const addProcessNode = useCallback(async (category) => {
    const title = prompt(`Ange namn på ny ${category === 'management' ? 'ledningsprocess' : category === 'core' ? 'huvudprocess' : 'stödprocess'}:`);
    if (!title) return;

    if (!userProfile?.company_id && userProfile?.role !== 'superadmin') {
      toast.error('Du måste vara kopplad till ett företag för att skapa en process. Kontakta en administratör.');
      return;
    }

    try {
      // Ensure we have a company_id if the user is a superadmin but not linked yet
      let companyId = userProfile?.company_id;
      
      if (!companyId && userProfile?.role === 'superadmin') {
        const { data: companies } = await supabase.from('companies').select('id').eq('name', 'SafeQMS').limit(1);
        if (companies && companies.length > 0) {
          companyId = companies[0].id;
        }
      }

      const newProcess = await createProcess({
        title,
        description: '',
        status: 'active',
        created_by: currentUser?.id,
        company_id: companyId,
        is_template: userProfile?.role === 'superadmin',
        is_global: userProfile?.role === 'superadmin'
      });

      const newNode = {
        id: newProcess.id,
        type: 'mapNode',
        data: { 
          label: title, 
          category,
          processId: newProcess.id 
        },
        position: { 
          x: 250, 
          y: category === 'management' ? 100 : category === 'core' ? 300 : 500 
        },
      };

      setNodes((nds) => nds.concat(newNode));
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success('Process skapad och tillagd i kartan');
    } catch (error) {
      console.error('Failed to create process node', error);
      toast.error('Kunde inte skapa process');
    }
  }, [currentUser?.id, queryClient, userProfile]);

  const saveMap = useCallback(async () => {
    setIsSaving(true);
    try {
      if (!userProfile?.company_id && userProfile?.role !== 'superadmin') {
        toast.error('Du måste vara kopplad till ett företag för att spara processkartan. Kontakta en administratör.');
        setIsSaving(false);
        return;
      }

      // Find or create the root map process by title
      let rootMap = processes.find(p => p.title === 'Huvudprocesskarta');
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const viewport = getViewport();
      
      const mapData = { 
        steps: { 
          nodes: cleanNodesForStorage(currentNodes), 
          edges: cleanEdgesForStorage(currentEdges), 
          viewport 
        }, 
        title: 'Huvudprocesskarta'
      };

      console.log('Saving root map with latest positions:', mapData);
      if (rootMap) {
        await updateProcess(rootMap.id, mapData);
      } else {
        await createProcess({
          description: 'Systemets övergripande processkarta',
          status: 'active',
          created_by: currentUser?.id,
          company_id: userProfile?.company_id || null,
          is_template: userProfile?.role === 'superadmin',
          is_global: userProfile?.role === 'superadmin',
          ...mapData
        });
      }
      console.log('Root map saved successfully');
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      toast.success('Processkartan sparad!');
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save map', error);
      const errorMsg = error.message || (typeof error === 'string' ? error : 'Okänt fel');
      toast.error(`Kunde inte spara kartan: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  }, [currentUser?.id, getEdges, getNodes, getViewport, processes, queryClient, userProfile]);

  const handleDeleteProcess = async (id, title) => {
    setDeleteConfirm({ isOpen: true, id, title, type: 'process' });
  };

  const confirmDelete = async () => {
    const { id, title, type } = deleteConfirm;
    setDeleteConfirm({ ...deleteConfirm, isOpen: false });

    try {
      if (type === 'rootMap') {
        const rootMap = processes.find(p => p.title === 'Huvudprocesskarta');
        if (!rootMap) return;
        setIsSaving(true);
        await deleteProcess(rootMap.id);
        toast.success('Huvudprocesskartan har tagits bort');
        queryClient.invalidateQueries({ queryKey: ['processes'] });
        setNodes([]);
        setEdges([]);
        setIsSaving(false);
        return;
      }

      await deleteProcess(id);
      toast.success('Processen har tagits bort');
      
      // Update root map if it exists
      const rootMap = processes.find(p => p.title === 'Huvudprocesskarta');
      if (rootMap) {
        const updatedNodes = (rootMap.steps?.nodes || []).filter(n => String(n.data?.processId || n.id) !== String(id));
        const updatedSteps = { ...rootMap.steps, nodes: updatedNodes };
        try {
          await updateProcess(rootMap.id, { steps: updatedSteps });
          setNodes(updatedNodes);
        } catch (err) {
          console.error('Failed to update root map after deletion', err);
        }
      } else {
        // Just update local state if root map doesn't exist yet
        setNodes(nds => nds.filter(n => String(n.data?.processId || n.id) !== String(id)));
      }
      
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      if (selectedNode && (selectedNode.data?.processId === id || selectedNode.id === id)) {
        setSelectedNode(null);
      }
    } catch (error) {
      console.error('Failed to delete process:', error);
      toast.error('Kunde inte ta bort processen');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFromVisualizer = useCallback(async (deletedId) => {
    // 1. Go back
    handleGoBack();
    
    // 2. Refresh data
    queryClient.invalidateQueries({ queryKey: ['processes'] });
    
    // 3. Update parent (either root map or a parent process)
    if (navigationStack.length === 1) {
      // Parent is the Root Map
      const rootMap = processes.find(p => p.title === 'Huvudprocesskarta');
      if (rootMap) {
        const updatedNodes = (rootMap.steps?.nodes || []).filter(n => String(n.data?.processId || n.id) !== String(deletedId));
        const updatedSteps = { ...rootMap.steps, nodes: updatedNodes };
        try {
          await updateProcess(rootMap.id, { steps: updatedSteps });
          setNodes(updatedNodes);
        } catch (err) {
          console.error('Failed to update root map', err);
        }
      } else {
        // Just update local state if root map doesn't exist yet
        setNodes(nds => nds.filter(n => String(n.data?.processId || n.id) !== String(deletedId)));
      }
    } else if (navigationStack.length > 1) {
      // Parent is another process
      const parent = navigationStack[navigationStack.length - 2];
      const updatedNodes = (parent.steps?.nodes || []).filter(n => String(n.data?.subProcessId) !== String(deletedId));
      const updatedSteps = { ...parent.steps, nodes: updatedNodes };
      
      try {
        await updateProcess(parent.id, { steps: updatedSteps });
        // Update the parent in the stack too
        setNavigationStack(prev => prev.map(p => p.id === parent.id ? { ...p, steps: updatedSteps } : p));
      } catch (err) {
        console.error('Failed to update parent process', err);
      }
    }
  }, [handleGoBack, navigationStack, processes, queryClient]);

  const handleDeleteRootMap = async () => {
    setDeleteConfirm({ isOpen: true, id: 'root', title: 'Huvudprocesskartan', type: 'rootMap' });
  };

  if (isError) {
    return (
      <div className="error-state">
        <AlertOctagon size={48} className="text-level-high" />
        <h2>Ett fel uppstod vid hämtning av processer</h2>
        <p>{error?.message || 'Kunde inte ansluta till databasen'}</p>
        <button className="btn btn-primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['processes'] })}>
          Försök igen
        </button>
      </div>
    );
  }

  if (loading) return <div className="loading-spinner">Laddar processer...</div>;

  const activeProcess = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;

  const handleUpdateProcess = useCallback((updated, newProcess) => {
    queryClient.invalidateQueries({ queryKey: ['processes'] });
    setNavigationStack(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, [queryClient]);

  if (activeProcess) {
    return (
      <ProcessVisualizer 
        process={activeProcess} 
        onBack={handleGoBack}
        onUpdate={handleUpdateProcess}
        onDelete={handleDeleteFromVisualizer}
        onDrillDown={handleDrillDown}
      />
    );
  }

  // Mobile List View Component
  const MobileListView = () => {
    const categories = [
      { id: 'management', label: 'Ledningsprocesser', icon: <Settings size={18} /> },
      { id: 'core', label: 'Huvudprocesser', icon: <Activity size={18} /> },
      { id: 'support', label: 'Stödprocesser', icon: <PlusCircle size={18} /> }
    ];

    return (
      <div className="mobile-process-list">
        {categories.map(cat => {
          const catNodes = nodes.filter(n => n.data?.category === cat.id);
          if (catNodes.length === 0) return null;

          return (
            <div key={cat.id} className="mobile-category-section">
              <div className={`mobile-category-header ${cat.id}`}>
                {cat.icon}
                <span>{cat.label}</span>
              </div>
              <div className="mobile-nodes-grid">
                {catNodes.map(node => (
                  <div 
                    key={node.id} 
                    className={`mobile-node-card ${cat.id}`}
                    onClick={() => {
                      const processId = node.data?.processId || node.id;
                      const process = processes.find(p => String(p.id) === String(processId));
                      if (process) setNavigationStack([process]);
                    }}
                  >
                    <div className="mobile-node-info">
                      <div className="mobile-node-title">{node.data?.label}</div>
                      {node.data?.description && (
                        <div className="mobile-node-desc">{node.data.description}</div>
                      )}
                    </div>
                    <div className="mobile-node-actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="btn-icon text-red-500" 
                        onClick={() => handleDeleteProcess(node.data?.processId || node.id, node.data?.label)}
                        title="Ta bort"
                      >
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={20} className="mobile-node-arrow" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {nodes.length === 0 && (
          <div className="empty-state">
            <Layout size={48} />
            <p>Inga processer har lagts till i kartan än.</p>
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-btn" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="pagination-info">Sida {page} av {totalPages}</span>
            <button 
              className="pagination-btn" 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`process-dashboard ${isMobile ? 'mobile-view' : 'desktop-view'}`}>
      <div className="dashboard-header">
        <div>
          <h1>Processkarta</h1>
          <p className="subtitle">
            {isMobile ? 'Välj en process för att se detaljer' : 'Övergripande vy över verksamhetens processer'}
          </p>
        </div>
      </div>

      <ConfirmModal 
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === 'rootMap' ? 'Ta bort processkarta?' : 'Ta bort process?'}
        message={deleteConfirm.type === 'rootMap' 
          ? 'Är du säker på att du vill ta bort huvudprocesskartan? Detta tar bort hela vyn men inte de enskilda processerna.'
          : `Är du säker på att du vill ta bort processen "${deleteConfirm.title}"? Detta går inte att ångra.`
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
      />

      {showMobileAddMenu && (
        <div className="mobile-add-overlay" onClick={() => setShowMobileAddMenu(false)}>
          <div className="mobile-add-menu" onClick={e => e.stopPropagation()}>
            <h3>Lägg till ny process</h3>
            <button className="tool-btn management" onClick={() => { addProcessNode('management'); setShowMobileAddMenu(false); }}>
              <Plus size={18} />
              <span>Ledningsprocess</span>
            </button>
            <button className="tool-btn core" onClick={() => { addProcessNode('core'); setShowMobileAddMenu(false); }}>
              <Plus size={18} />
              <span>Huvudprocess</span>
            </button>
            <button className="tool-btn support" onClick={() => { addProcessNode('support'); setShowMobileAddMenu(false); }}>
              <Plus size={18} />
              <span>Stödprocess</span>
            </button>
          </div>
        </div>
      )}

      <div className="map-wrapper">
        <div className="map-container">
          {isMobile ? (
            <MobileListView />
          ) : (
            <>
              <div className="swimlanes-bg">
                <div className="swimlane management">
                  <div className="swimlane-label">Ledningsprocesser</div>
                </div>
                <div className="swimlane core">
                  <div className="swimlane-label">Huvudprocesser</div>
                </div>
                <div className="swimlane support">
                  <div className="swimlane-label">Stödprocesser</div>
                </div>
              </div>
              
              <ReactFlow
                nodes={nodes.map(node => ({
                  ...node,
                  style: {
                    ...node.style,
                    opacity: searchQuery === '' || node.data?.label?.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.2
                  }
                }))}
                edges={edges.map(edge => ({
                  ...edge,
                  style: {
                    ...edge.style,
                    opacity: searchQuery === '' ? 1 : 0.2
                  }
                }))}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onInit={onInit}
                nodeTypes={nodeTypes}
                defaultViewport={defaultViewport}
                nodesDraggable={isEditMode}
                nodesConnectable={isEditMode}
                elementsSelectable={true}
                panOnDrag={isEditMode}
                zoomOnScroll={isEditMode}
                zoomOnPinch={isEditMode}
                zoomOnDoubleClick={isEditMode}
                panOnScroll={isEditMode}
                preventScrolling={false}
              >
                {isEditMode && <Background />}
                {isEditMode && <Controls />}
              </ReactFlow>
            </>
          )}
        </div>

        {isEditMode && !isMobile && (
          <div className="map-toolbar">
            <h4>Lägg till objekt</h4>
            <button className="tool-btn management" onClick={() => addProcessNode('management')}>
              <Plus size={16} />
              <span>Ledningsprocess</span>
            </button>
            <button className="tool-btn core" onClick={() => addProcessNode('core')}>
              <Plus size={16} />
              <span>Huvudprocess</span>
            </button>
            <button className="tool-btn support" onClick={() => addProcessNode('support')}>
              <Plus size={16} />
              <span>Stödprocess</span>
            </button>
            <hr />
            <div className="toolbar-actions">
              <button 
                className="tool-btn text-red-500 hover:bg-red-50" 
                onClick={() => {
                  if (selectedNode) {
                    handleDeleteProcess(selectedNode.data?.processId || selectedNode.id, selectedNode.data?.label);
                  }
                }}
                disabled={!selectedNode}
                title="Ta bort markerad process"
              >
                <Trash2 size={16} />
                <span>Ta bort vald</span>
              </button>
              
              {processes.some(p => p.title === 'Huvudprocesskarta') && (
                <button 
                  className="tool-btn text-red-500 hover:bg-red-50 mt-2" 
                  onClick={handleDeleteRootMap}
                  title="Ta bort hela processkartan"
                >
                  <Trash2 size={16} />
                  <span>Ta bort karta</span>
                </button>
              )}
            </div>
            <p className="hint">Dra noder för att flytta. Dra mellan noder för att koppla.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProcessList = () => (
  <ReactFlowProvider>
    <ProcessListContent />
  </ReactFlowProvider>
);

export default ProcessList;
