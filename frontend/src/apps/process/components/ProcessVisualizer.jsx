import React, { useState, useCallback, useEffect, useMemo } from 'react';
import ReactFlow, { 
  addEdge, 
  updateEdge,
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
import { X, Save, FileText, Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown, Settings, ExternalLink, PlusCircle, Edit2, Layout, File, FileImage, FileVideo, FileAudio, FileArchive, FileSpreadsheet, FileCode } from 'lucide-react';
import { getDokuments } from '../../dokument/api/dokument';
import { updateProcess, getProcesses, createProcess, deleteProcess } from '../api/process';
import { useAuth } from '../../../shared/api/AuthContext';
import { toast } from 'react-toastify';
import { useSearch } from '../../../shared/context/SearchContext';
import { useRegisterHeaderActions, useRegisterCenterTools, useRegisterRightPanel } from '../../../shared/context/HeaderActionsContext';
import ConfirmModal from './ConfirmModal';
import '../styles/ProcessVisualizer.css';

const FileIcon = ({ type, size = 16 }) => {
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

// Custom Node Types
const StartEndNode = ({ id, data }) => (
  <div className="custom-node start-end">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />
    
    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div 
          className="node-badge docs clickable" 
          title={`${data.docs.length} dokument - Klicka för att se`}
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('docs', data.docs, id);
          }}
        >
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
      {data.subProcessId && (
        <div 
          className="node-badge sub-process clickable" 
          title="Klicka för att öppna underprocess"
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('sub-process', data.subProcessId, id);
          }}
        >
          <ExternalLink size={10} />
        </div>
      )}
    </div>
  </div>
);

const StepNode = ({ id, data }) => (
  <div className="custom-node step">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div 
          className="node-badge docs clickable" 
          title={`${data.docs.length} dokument - Klicka för att se`}
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('docs', data.docs, id);
          }}
        >
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
      {data.subProcessId && (
        <div 
          className="node-badge sub-process clickable" 
          title="Klicka för att öppna underprocess"
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('sub-process', data.subProcessId, id);
          }}
        >
          <ExternalLink size={10} />
        </div>
      )}
    </div>
  </div>
);

const DecisionNode = ({ id, data }) => (
  <div className="custom-node decision">
    <Handle type="target" position={Position.Top} style={{ top: -10, left: '35%' }} id="t-top" />
    <Handle type="source" position={Position.Top} style={{ top: -10, left: '65%' }} id="s-top" />
    
    <Handle type="target" position={Position.Bottom} style={{ bottom: -10, left: '35%' }} id="t-bottom" />
    <Handle type="source" position={Position.Bottom} style={{ bottom: -10, left: '65%' }} id="s-bottom" />
    
    <Handle type="target" position={Position.Left} style={{ left: -10, top: '35%' }} id="t-left" />
    <Handle type="source" position={Position.Left} style={{ left: -10, top: '65%' }} id="s-left" />
    
    <Handle type="target" position={Position.Right} style={{ right: -10, top: '35%' }} id="t-right" />
    <Handle type="source" position={Position.Right} style={{ right: -10, top: '65%' }} id="s-right" />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div 
          className="node-badge docs clickable" 
          title={`${data.docs.length} dokument - Klicka för att se`}
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('docs', data.docs, id);
          }}
        >
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
      {data.subProcessId && (
        <div 
          className="node-badge sub-process clickable" 
          title="Klicka för att öppna underprocess"
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('sub-process', data.subProcessId, id);
          }}
        >
          <ExternalLink size={10} />
        </div>
      )}
    </div>
  </div>
);

const DocumentNode = ({ id, data }) => (
  <div className="custom-node document">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div 
          className="node-badge docs clickable" 
          title={`${data.docs.length} dokument - Klicka för att se`}
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('docs', data.docs, id);
          }}
        >
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
    </div>
  </div>
);

const DataNode = ({ id, data }) => (
  <div className="custom-node data">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div 
          className="node-badge docs clickable" 
          title={`${data.docs.length} dokument - Klicka för att se`}
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('docs', data.docs, id);
          }}
        >
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
    </div>
  </div>
);

const DatabaseNode = ({ id, data }) => (
  <div className="custom-node database">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div 
          className="node-badge docs clickable" 
          title={`${data.docs.length} dokument - Klicka för att se`}
          onClick={(e) => {
            e.stopPropagation();
            data.onQuickAction?.('docs', data.docs, id);
          }}
        >
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
    </div>
  </div>
);

const ManualInputNode = ({ id, data }) => (
  <div className="custom-node manual-input">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />
    <div className="node-label">{data.label}</div>
  </div>
);

const DelayNode = ({ id, data }) => (
  <div className="custom-node delay">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />
    <div className="node-label">{data.label}</div>
  </div>
);

const DisplayNode = ({ id, data }) => (
  <div className="custom-node display">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />
    <div className="node-label">{data.label}</div>
  </div>
);

const PreparationNode = ({ id, data }) => (
  <div className="custom-node preparation">
    <Handle type="target" position={Position.Top} id="t-top" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Top} id="s-top" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Bottom} id="t-bottom" style={{ left: '35%' }} />
    <Handle type="source" position={Position.Bottom} id="s-bottom" style={{ left: '65%' }} />
    <Handle type="target" position={Position.Left} id="t-left" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Left} id="s-left" style={{ top: '65%' }} />
    <Handle type="target" position={Position.Right} id="t-right" style={{ top: '35%' }} />
    <Handle type="source" position={Position.Right} id="s-right" style={{ top: '65%' }} />
    <div className="node-label">{data.label}</div>
  </div>
);

const nodeTypes = {
  startEnd: StartEndNode,
  step: StepNode,
  decision: DecisionNode,
  document: DocumentNode,
  data: DataNode,
  database: DatabaseNode,
  manualInput: ManualInputNode,
  delay: DelayNode,
  display: DisplayNode,
  preparation: PreparationNode,
};

const ProcessVisualizerContent = ({ process, onBack, onUpdate, onDelete, onDrillDown }) => {
  const { currentUser, userProfile } = useAuth();
  const { searchQuery } = useSearch();
  const { getViewport, getNodes, getEdges, setViewport } = useReactFlow();

  const [isEditMode, setIsEditMode] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rfInstance, setRfInstance] = useState(null);
  const [defaultViewport, setDefaultViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [dokuments, setDokuments] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: 'process', title: '', nodeId: null });
  const [showShapesDropdown, setShowShapesDropdown] = useState(false);

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
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
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
    const handleQuickAction = (type, payload, nodeId) => {
      if (type === 'sub-process') {
        const subProcess = allProcesses.find(p => p.id === payload);
        onDrillDown(payload, subProcess);
      } else if (type === 'docs') {
        const node = getNode(nodeId);
        if (node) setSelectedNode(node);
      }
    };

    if (process.steps && Array.isArray(process.steps.nodes)) {
      const nodesWithActions = process.steps.nodes.map(node => ({
        ...node,
        data: { ...node.data, onQuickAction: handleQuickAction }
      }));
      setNodes(nodesWithActions);
      setEdges(process.steps.edges || []);
      if (process.steps.viewport) {
        setDefaultViewport(process.steps.viewport);
        // Explicitly set the viewport if the flow is ready
        if (rfInstance) {
          rfInstance.setViewport(process.steps.viewport);
        }
      }
    } else if (nodes.length === 0) {
      // Default nodes if none exist and we haven't initialized yet
      setNodes([
        { 
          id: 'start', 
          type: 'startEnd', 
          data: { label: 'Start', onQuickAction: handleQuickAction }, 
          position: { x: 250, y: 50 } 
        }
      ]);
      setEdges([]);
    }

    const fetchData = async () => {
      try {
        const [docsData, procsData] = await Promise.all([
          getDokuments(1, -1),
          getProcesses(1, -1)
        ]);
        const docs = docsData?.data || (Array.isArray(docsData) ? docsData : []);
        const procs = procsData?.data || (Array.isArray(procsData) ? procsData : []);
        setDokuments(docs);
        setAllProcesses(procs.filter(p => p.id !== process.id));
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };
    fetchData();
  }, [process.id]); // Re-run only if process ID changes

  const onInit = useCallback((instance) => {
    setRfInstance(instance);
    if (process.steps?.viewport) {
      instance.setViewport(process.steps.viewport);
    }
  }, [process.id]);

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
    (params) => {
      // Prevent duplicate edges between same handles
      const isDuplicate = edges.some(
        (e) => 
          e.source === params.source && 
          e.target === params.target && 
          e.sourceHandle === params.sourceHandle && 
          e.targetHandle === params.targetHandle
      );
      
      if (isDuplicate) return;

      setEdges((eds) => addEdge({ 
        ...params, 
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed }
      }, eds));
    },
    [edges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedEdge(null);
    if (isEditMode) {
      setSelectedNode(node);
    } else {
      if (node.data?.subProcessId && onDrillDown) {
        onDrillDown(node.data.subProcessId);
      } else {
        // In view mode, clicking a node shows its properties (documents)
        setSelectedNode(node);
      }
    }
  }, [isEditMode, onDrillDown]);

  const onEdgeClick = useCallback((event, edge) => {
    if (isEditMode) {
      setSelectedEdge(edge);
      setSelectedNode(null);
    }
  }, [isEditMode]);

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)),
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const addNode = useCallback((type) => {
    const id = `node_${Date.now()}`;
    const newNode = {
      id,
      type,
      data: { label: `Ny ${type}`, docs: [] },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, []);

  const updateNodeLabel = useCallback((label) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, data: { ...node.data, label } };
        }
        return node;
      })
    );
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label } });
  }, [selectedNode]);

  const toggleDoc = useCallback((docId) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          const currentDocs = node.data.docs || [];
          const newDocs = currentDocs.includes(docId)
            ? currentDocs.filter((id) => id !== docId)
            : [...currentDocs, docId];
          return { ...node, data: { ...node.data, docs: newDocs } };
        }
        return node;
      })
    );
    
    const currentDocs = selectedNode.data.docs || [];
    const newDocs = currentDocs.includes(docId)
      ? currentDocs.filter((id) => id !== docId)
      : [...currentDocs, docId];
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, docs: newDocs } });
  }, [selectedNode]);

  const setSubProcess = useCallback((subProcessId) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, data: { ...node.data, subProcessId: subProcessId || null } };
        }
        return node;
      })
    );
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, subProcessId: subProcessId || null } });
  }, [selectedNode]);

  const handleDrillDown = useCallback(() => {
    const subProcessId = selectedNode?.data?.subProcessId;
    if (subProcessId && onDrillDown) {
      const subProcess = allProcesses.find(p => p.id === subProcessId);
      onDrillDown(subProcessId, subProcess);
    }
  }, [allProcesses, onDrillDown, selectedNode?.data?.subProcessId]);

  const handleCreateSubProcess = useCallback(async () => {
    if (!selectedNode) return;
    
    const title = prompt('Ange namn på den nya underprocessen:', `${selectedNode.data.label} - Detaljer`);
    if (!title) return;

    setIsSaving(true);
    try {
      const newSubProcess = {
        title,
        description: `Underprocess till ${process.title} (${selectedNode.data.label})`,
        status: 'active',
        parent_id: process.id,
        created_by: currentUser?.id,
        company_id: userProfile?.company_id || null,
        is_template: userProfile?.role === 'superadmin',
        is_global: userProfile?.role === 'superadmin'
      };
      
      console.log('Creating sub-process:', newSubProcess);
      const created = await createProcess(newSubProcess);
      console.log('Sub-process created:', created);
      setAllProcesses(prev => [...prev, created]);
      
      // Update local nodes state
      const updatedNodes = nodes.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, data: { ...node.data, subProcessId: created.id } };
        }
        return node;
      });
      
      setNodes(updatedNodes);
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, subProcessId: created.id } });
      
      // Automatically save the parent process to persist the link
      const viewport = getViewport();
      const steps = { 
        nodes: cleanNodesForStorage(updatedNodes), 
        edges: cleanEdgesForStorage(edges), 
        viewport 
      };
      console.log('Auto-saving parent process with sub-process link:', steps);
      const updatedParent = await updateProcess(process.id, { steps }, currentUser);
      onUpdate(updatedParent, created);
      
      toast.success(`Underprocess "${title}" skapad och kopplad!`);
    } catch (error) {
      console.error('Failed to create sub-process', error);
      toast.error('Kunde inte skapa underprocess');
    } finally {
      setIsSaving(false);
    }
  }, [currentUser?.id, edges, getViewport, nodes, onUpdate, process, selectedNode, userProfile?.company_id, userProfile?.role]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedEdge) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
      setSelectedEdge(null);
      return;
    }

    if (!selectedNode) return;
    
    // If it's a sub-process node, ask if they want to delete the sub-process too
    if (selectedNode.data?.subProcessId) {
      const subProc = allProcesses.find(p => p.id === selectedNode.data.subProcessId);
      setDeleteConfirm({ 
        isOpen: true, 
        type: 'node-with-process', 
        title: subProc?.title || selectedNode.data.label,
        nodeId: selectedNode.id
      });
      return;
    }

    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  }, [allProcesses, selectedEdge, selectedNode]);

  const confirmDelete = async () => {
    const { type, nodeId } = deleteConfirm;
    setDeleteConfirm({ ...deleteConfirm, isOpen: false });

    try {
      setIsSaving(true);
      if (type === 'process') {
        await deleteProcess(process.id);
        toast.success('Processen har tagits bort');
        if (onDelete) {
          onDelete(process.id);
        } else {
          onBack();
        }
      } else if (type === 'node-with-process') {
        const node = nodes.find(n => n.id === nodeId);
        if (node?.data?.subProcessId) {
          await deleteProcess(node.data.subProcessId);
          toast.success('Underprocessen har tagits bort');
        }
        setNodes((nds) => nds.filter((n) => n.id !== nodeId));
        setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
        setSelectedNode(null);
        // We should also save the current process to persist the removal of the node
        setTimeout(() => saveProcess(), 100);
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Kunde inte slutföra borttagningen');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleteConfirm({ isOpen: true, type: 'process', title: process.title, nodeId: null });
  };

  const saveProcess = useCallback(async () => {
    setIsSaving(true);
    try {
      const currentNodes = getNodes();
      const currentEdges = getEdges();
      const viewport = getViewport();
      
      const steps = { 
        nodes: cleanNodesForStorage(currentNodes), 
        edges: cleanEdgesForStorage(currentEdges), 
        viewport 
      };
      
      console.log('Saving process map with latest positions:', steps);
      const updated = await updateProcess(process.id, { steps }, currentUser);
      console.log('Process map saved successfully:', updated);
      onUpdate(updated);
      toast.success('Process sparad!');
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to save process', error);
      const errorMsg = error.message || (typeof error === 'string' ? error : 'Okänt fel');
      toast.error(`Kunde inte spara process: ${errorMsg}`);
    } finally {
      setIsSaving(false);
    }
  }, [getEdges, getNodes, getViewport, onUpdate, process.id]);

  // Register header actions and tools
  const headerActions = useMemo(() => (
    <div className="flex gap-2">
      <button className="btn btn-secondary btn-sm" onClick={onBack}>
        <ChevronLeft size={16} />
        <span>Tillbaka</span>
      </button>
      {(userProfile?.role === 'admin' || userProfile?.role === 'superadmin') && (
        <>
          {!isEditMode ? (
            <button className="btn btn-secondary btn-sm" onClick={() => setIsEditMode(true)}>
              <Edit2 size={16} />
              <span>Redigera</span>
            </button>
          ) : (
            <>
              <button className="btn btn-secondary btn-sm" onClick={() => { setIsEditMode(false); setSelectedNode(null); setSelectedEdge(null); }}>
                <X size={16} />
                <span>Avbryt</span>
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveProcess} disabled={isSaving}>
                <Save size={16} />
                <span>{isSaving ? 'Sparar...' : 'Spara'}</span>
              </button>
            </>
          )}
          {(selectedNode || selectedEdge) && isEditMode && (
            <button className="btn btn-danger btn-sm" onClick={() => setDeleteConfirm({ isOpen: true, id: selectedNode?.id || selectedEdge?.id, title: selectedNode?.data?.label || 'denna koppling', type: selectedNode ? 'steg' : 'koppling' })}>
              <Trash2 size={16} />
              <span>Ta bort vald</span>
            </button>
          )}
        </>
      )}
    </div>
  ), [onBack, userProfile, isEditMode, isSaving, saveProcess, selectedNode, selectedEdge]);

  const centerTools = useMemo(() => {
    if (!isEditMode) return null;

    return (
      <div className="relative">
        <button 
          className={`btn btn-primary btn-sm ${showShapesDropdown ? 'active' : ''}`} 
          onClick={() => setShowShapesDropdown(!showShapesDropdown)}
          style={{ borderRadius: '0.625rem', gap: '0.5rem', padding: '0.5rem 1.25rem' }}
        >
          <PlusCircle size={18} />
          <span>Lägg till objekt</span>
          <ChevronDown size={14} className={`transition-transform ${showShapesDropdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showShapesDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowShapesDropdown(false)}></div>
            <div className="shapes-dropdown-card">
              <div className="shapes-grid">
                <button className="shape-item" onClick={() => { addNode('startEnd'); setShowShapesDropdown(false); }}>
                  <div className="shape oval"></div>
                  <span>Start/Slut</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('step'); setShowShapesDropdown(false); }}>
                  <div className="shape rect"></div>
                  <span>Process-steg</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('decision'); setShowShapesDropdown(false); }}>
                  <div className="shape diamond"></div>
                  <span>Beslut</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('document'); setShowShapesDropdown(false); }}>
                  <div className="shape doc"></div>
                  <span>Dokument</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('data'); setShowShapesDropdown(false); }}>
                  <div className="shape parallelogram"></div>
                  <span>Data</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('database'); setShowShapesDropdown(false); }}>
                  <div className="shape cylinder"></div>
                  <span>Databas</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('manualInput'); setShowShapesDropdown(false); }}>
                  <div className="shape trapezoid"></div>
                  <span>Manuell</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('delay'); setShowShapesDropdown(false); }}>
                  <div className="shape delay-shape"></div>
                  <span>Fördröjning</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('display'); setShowShapesDropdown(false); }}>
                  <div className="shape bullet"></div>
                  <span>Visa/Display</span>
                </button>
                <button className="shape-item" onClick={() => { addNode('preparation'); setShowShapesDropdown(false); }}>
                  <div className="shape hexagon"></div>
                  <span>Förberedelse</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }, [isEditMode, addNode, showShapesDropdown]);

  const rightPanelContent = useMemo(() => {
    if (!selectedNode) return null;

    return (
      <div className="property-panel">
        <div className="panel-header">
          <h3>{isEditMode ? 'Egenskaper' : 'Information'}</h3>
          <button className="close-btn" onClick={() => setSelectedNode(null)}><X size={18} /></button>
        </div>
        
        <div className="panel-body">
          <div className="form-group">
            <label>Namn</label>
            {isEditMode ? (
              <input 
                type="text" 
                value={selectedNode.data.label} 
                onChange={(e) => updateNodeLabel(e.target.value)}
              />
            ) : (
              <div className="read-only-value">{selectedNode.data.label}</div>
            )}
          </div>

          <div className="form-group">
            <label>Kopplad Underprocess</label>
            {isEditMode ? (
              <div className="sub-process-edit-group">
                <select 
                  value={selectedNode.data.subProcessId || ''} 
                  onChange={(e) => setSubProcess(e.target.value)}
                  className="sub-process-select"
                >
                  <option value="">Ingen koppling</option>
                  {allProcesses.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
                <button 
                  className="btn-primary btn-sm btn-full mt-2" 
                  onClick={handleCreateSubProcess}
                  disabled={isSaving}
                >
                  <PlusCircle size={16} />
                  <span>Skapa ny underprocess</span>
                </button>
              </div>
            ) : (
              <div className="read-only-value">
                {allProcesses.find(p => p.id === selectedNode.data.subProcessId)?.title || (selectedNode.data.subProcessId ? 'Laddar...' : 'Ingen koppling')}
              </div>
            )}
            {selectedNode.data.subProcessId && (
              <button className="btn-primary btn-full mt-2" onClick={handleDrillDown}>
                <ExternalLink size={16} />
                <span>Öppna underprocess</span>
              </button>
            )}
          </div>

          <div className="form-group">
            <label>Kopplade Dokument</label>
            <div className="doc-list">
              {isEditMode ? (
                dokuments.map(doc => (
                  <label key={doc.id} className="doc-item">
                    <input 
                      type="checkbox" 
                      checked={(selectedNode.data.docs || []).includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      className="mr-2"
                    />
                    <FileIcon type={doc.file_type} size={20} />
                    <div className="doc-info">
                      <span className="doc-name">{doc.title}</span>
                      <span className="doc-meta">{doc.file_type?.split('/')[1]?.toUpperCase() || 'FIL'}</span>
                    </div>
                  </label>
                ))
              ) : (
                (selectedNode.data.docs || []).length > 0 ? (
                  selectedNode.data.docs.map(docId => {
                    const doc = dokuments.find(d => d.id === docId);
                    if (!doc) return null;
                    return (
                      <a 
                        key={doc.id} 
                        href={doc.file_url || `/dokument?id=${doc.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="doc-item"
                      >
                        <FileIcon type={doc.file_type} size={20} />
                        <div className="doc-info">
                          <span className="doc-name">{doc.title}</span>
                          <span className="doc-meta">{doc.file_type?.split('/')[1]?.toUpperCase() || 'FIL'}</span>
                        </div>
                        <ExternalLink size={14} className="ml-auto text-muted" />
                      </a>
                    );
                  })
                ) : (
                  <p className="text-muted p-2">Inga dokument kopplade</p>
                )
              )}
            </div>
          </div>

          {isEditMode && (
            <button className="btn-danger btn-full mt-4" onClick={deleteSelectedNode}>
              <Trash2 size={16} />
              <span>Ta bort nod</span>
            </button>
          )}
        </div>
      </div>
    );
  }, [selectedNode, isEditMode, allProcesses, dokuments, isSaving, handleCreateSubProcess, handleDrillDown, updateNodeLabel, setSubProcess, toggleDoc, deleteSelectedNode]);

  useRegisterHeaderActions(headerActions);
  useRegisterCenterTools(centerTools);
  useRegisterRightPanel(rightPanelContent);

  return (
    <div className="process-visualizer">
      <div className="visualizer-content">
        <div className="flow-container">
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
                opacity: searchQuery === '' ? 1 : 0.2,
                stroke: selectedEdge?.id === edge.id ? 'var(--danger-color)' : edge.style?.stroke,
                strokeWidth: selectedEdge?.id === edge.id ? 3 : edge.style?.strokeWidth,
              }
            }))}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onEdgeUpdate={onEdgeUpdate}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
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
            {isEditMode && <MiniMap />}
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

const ProcessVisualizer = (props) => (
  <ReactFlowProvider>
    <ProcessVisualizerContent {...props} />
  </ReactFlowProvider>
);

export default ProcessVisualizer;
