import React, { useEffect, useState, useCallback } from 'react';
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
import { Plus, Edit2, Trash2, X, Activity, CheckCircle, Clock, Search, ChevronRight, Layout, ArrowLeft, ChevronLeft, Save, MousePointer2, Settings, PlusCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import ProcessVisualizer from '../components/ProcessVisualizer';
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

const ProcessListContent = () => {
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [defaultViewport, setDefaultViewport] = useState({ x: 0, y: 0, zoom: 1 });
  
  const { currentUser, userProfile } = useAuth();
  const { getViewport } = useReactFlow();

  const fetchProcesses = async () => {
    try {
      const data = await getProcesses();
      setProcesses(data);
      
      // Look for the Root Map by specific title
      const rootMap = data.find(p => p.title === 'Huvudprocesskarta');
      
      if (rootMap && rootMap.steps) {
        setNodes(rootMap.steps.nodes || []);
        setEdges(rootMap.steps.edges || []);
        if (rootMap.steps.viewport) {
          setDefaultViewport(rootMap.steps.viewport);
        }
      }
    } catch (error) {
      console.error('Failed to fetch processes', error);
      toast.error('Kunde inte hämta processer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onNodeDragStop = useCallback((event, node) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === node.id) {
          return {
            ...n,
            position: node.position,
          };
        }
        return n;
      })
    );
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

  const handleDrillDown = (subProcessId) => {
    const subProcess = processes.find(p => p.id === subProcessId);
    if (subProcess) {
      setNavigationStack(prev => [...prev, subProcess]);
    }
  };

  const handleGoBack = () => {
    setNavigationStack(prev => {
      const newStack = [...prev];
      newStack.pop();
      return newStack;
    });
  };

  const addProcessNode = async (category) => {
    const title = prompt(`Ange namn på ny ${category === 'management' ? 'ledningsprocess' : category === 'core' ? 'huvudprocess' : 'stödprocess'}:`);
    if (!title) return;

    if (!userProfile?.company_id) {
      toast.error('Du måste vara kopplad till ett företag för att skapa en process. Kontakta en administratör.');
      return;
    }

    try {
      const newProcess = await createProcess({
        title,
        description: '',
        status: 'active',
        created_by: currentUser?.id,
        company_id: userProfile?.company_id || null
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
      setProcesses([newProcess, ...processes]);
      toast.success('Process skapad och tillagd i kartan');
    } catch (error) {
      console.error('Failed to create process node', error);
      toast.error('Kunde inte skapa process');
    }
  };

  const saveMap = async () => {
    setIsSaving(true);
    try {
      if (!userProfile?.company_id) {
        toast.error('Du måste vara kopplad till ett företag för att spara processkartan. Kontakta en administratör.');
        setIsSaving(false);
        return;
      }

      // Find or create the root map process by title
      let rootMap = processes.find(p => p.title === 'Huvudprocesskarta');
      const viewport = getViewport();
      const mapData = { 
        steps: { nodes, edges, viewport }, 
        title: 'Huvudprocesskarta'
      };

      if (rootMap) {
        const updated = await updateProcess(rootMap.id, mapData);
        setProcesses(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await createProcess({
          description: 'Systemets övergripande processkarta',
          status: 'active',
          created_by: currentUser?.id,
          company_id: userProfile?.company_id || null,
          ...mapData
        });
        setProcesses([created, ...processes]);
      }
      toast.success('Processkartan sparad!');
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save map', error);
      toast.error('Kunde inte spara kartan. Kontrollera anslutningen.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="loading-spinner">Laddar processer...</div>;

  const activeProcess = navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;

  if (activeProcess) {
    return (
      <ProcessVisualizer 
        process={activeProcess} 
        onBack={handleGoBack}
        onUpdate={(updated) => {
          setProcesses(prev => prev.map(p => p.id === updated.id ? updated : p));
          setNavigationStack(prev => prev.map(p => p.id === updated.id ? updated : p));
        }}
        onDrillDown={handleDrillDown}
      />
    );
  }

  return (
    <div className="process-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Processkarta</h1>
          <p className="subtitle">Övergripande vy över verksamhetens processer</p>
        </div>
        <div className="header-actions">
          {!isEditMode ? (
            <button className="btn-secondary" onClick={() => setIsEditMode(true)}>
              <Edit2 size={18} />
              <span>Redigera karta</span>
            </button>
          ) : (
            <>
              <button className="btn-secondary" onClick={() => setIsEditMode(false)}>
                <X size={18} />
                <span>Avbryt</span>
              </button>
              <button className="btn-primary" onClick={saveMap} disabled={isSaving}>
                <Save size={18} />
                <span>{isSaving ? 'Sparar...' : 'Spara karta'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="map-wrapper">
        {isEditMode && (
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
            <p className="hint">Dra noder för att flytta. Dra mellan noder för att koppla.</p>
          </div>
        )}

        <div className="map-container">
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
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
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
            <Background />
            {isEditMode && <Controls />}
          </ReactFlow>
        </div>
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
