import React, { useState, useCallback, useEffect } from 'react';
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
import { X, Save, FileText, Plus, Trash2, ChevronLeft, ChevronRight, Settings, ExternalLink, PlusCircle, Edit2, Layout, File, FileImage, FileVideo, FileAudio, FileArchive, FileSpreadsheet, FileCode } from 'lucide-react';
import { getDokuments } from '../../dokument/api/dokument';
import { updateProcess, getProcesses, createProcess } from '../api/process';
import { useAuth } from '../../../shared/api/AuthContext';
import { toast } from 'react-toastify';
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
const StartEndNode = ({ data }) => (
  <div className="custom-node start-end">
    <Handle type="target" position={Position.Top} id="t-top" />
    <Handle type="source" position={Position.Top} id="s-top" />
    <Handle type="target" position={Position.Bottom} id="t-bottom" />
    <Handle type="source" position={Position.Bottom} id="s-bottom" />
    <Handle type="target" position={Position.Left} id="t-left" />
    <Handle type="source" position={Position.Left} id="s-left" />
    <Handle type="target" position={Position.Right} id="t-right" />
    <Handle type="source" position={Position.Right} id="s-right" />
    
    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div className="node-badge docs" title={`${data.docs.length} dokument`}>
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
      {data.subProcessId && (
        <div className="node-badge sub-process" title="Har underprocess">
          <ExternalLink size={10} />
        </div>
      )}
    </div>
  </div>
);

const StepNode = ({ data }) => (
  <div className="custom-node step">
    <Handle type="target" position={Position.Top} id="t-top" />
    <Handle type="source" position={Position.Top} id="s-top" />
    <Handle type="target" position={Position.Bottom} id="t-bottom" />
    <Handle type="source" position={Position.Bottom} id="s-bottom" />
    <Handle type="target" position={Position.Left} id="t-left" />
    <Handle type="source" position={Position.Left} id="s-left" />
    <Handle type="target" position={Position.Right} id="t-right" />
    <Handle type="source" position={Position.Right} id="s-right" />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div className="node-badge docs" title={`${data.docs.length} dokument`}>
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
      {data.subProcessId && (
        <div className="node-badge sub-process" title="Har underprocess">
          <ExternalLink size={10} />
        </div>
      )}
    </div>
  </div>
);

const DecisionNode = ({ data }) => (
  <div className="custom-node decision">
    <Handle type="target" position={Position.Top} style={{ top: -10, left: '50%' }} id="t-top" />
    <Handle type="source" position={Position.Top} style={{ top: -10, left: '50%' }} id="s-top" />
    
    <Handle type="target" position={Position.Bottom} style={{ bottom: -10, left: '50%' }} id="t-bottom" />
    <Handle type="source" position={Position.Bottom} style={{ bottom: -10, left: '50%' }} id="s-bottom" />
    
    <Handle type="target" position={Position.Left} style={{ left: -10, top: '50%' }} id="t-left" />
    <Handle type="source" position={Position.Left} style={{ left: -10, top: '50%' }} id="s-left" />
    
    <Handle type="target" position={Position.Right} style={{ right: -10, top: '50%' }} id="t-right" />
    <Handle type="source" position={Position.Right} style={{ right: -10, top: '50%' }} id="s-right" />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div className="node-badge docs" title={`${data.docs.length} dokument`}>
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
      {data.subProcessId && (
        <div className="node-badge sub-process" title="Har underprocess">
          <ExternalLink size={10} />
        </div>
      )}
    </div>
  </div>
);

const DocumentNode = ({ data }) => (
  <div className="custom-node document">
    <Handle type="target" position={Position.Top} id="t-top" />
    <Handle type="source" position={Position.Top} id="s-top" />
    <Handle type="target" position={Position.Bottom} id="t-bottom" />
    <Handle type="source" position={Position.Bottom} id="s-bottom" />
    <Handle type="target" position={Position.Left} id="t-left" />
    <Handle type="source" position={Position.Left} id="s-left" />
    <Handle type="target" position={Position.Right} id="t-right" />
    <Handle type="source" position={Position.Right} id="s-right" />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div className="node-badge docs" title={`${data.docs.length} dokument`}>
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
    </div>
  </div>
);

const DataNode = ({ data }) => (
  <div className="custom-node data">
    <Handle type="target" position={Position.Top} id="t-top" />
    <Handle type="source" position={Position.Top} id="s-top" />
    <Handle type="target" position={Position.Bottom} id="t-bottom" />
    <Handle type="source" position={Position.Bottom} id="s-bottom" />
    <Handle type="target" position={Position.Left} id="t-left" />
    <Handle type="source" position={Position.Left} id="s-left" />
    <Handle type="target" position={Position.Right} id="t-right" />
    <Handle type="source" position={Position.Right} id="s-right" />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div className="node-badge docs" title={`${data.docs.length} dokument`}>
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
    </div>
  </div>
);

const DatabaseNode = ({ data }) => (
  <div className="custom-node database">
    <Handle type="target" position={Position.Top} id="t-top" />
    <Handle type="source" position={Position.Top} id="s-top" />
    <Handle type="target" position={Position.Bottom} id="t-bottom" />
    <Handle type="source" position={Position.Bottom} id="s-bottom" />
    <Handle type="target" position={Position.Left} id="t-left" />
    <Handle type="source" position={Position.Left} id="s-left" />
    <Handle type="target" position={Position.Right} id="t-right" />
    <Handle type="source" position={Position.Right} id="s-right" />

    <div className="node-label">{data.label}</div>
    <div className="node-badges">
      {data.docs && data.docs.length > 0 && (
        <div className="node-badge docs" title={`${data.docs.length} dokument`}>
          <FileText size={10} /> {data.docs.length}
        </div>
      )}
    </div>
  </div>
);

const nodeTypes = {
  startEnd: StartEndNode,
  step: StepNode,
  decision: DecisionNode,
  document: DocumentNode,
  data: DataNode,
  database: DatabaseNode,
};

const ProcessVisualizerContent = ({ process, onBack, onUpdate, onDrillDown }) => {
  const { currentUser, userProfile } = useAuth();
  const { getViewport } = useReactFlow();
  const [isEditMode, setIsEditMode] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [defaultViewport, setDefaultViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [dokuments, setDokuments] = useState([]);
  const [allProcesses, setAllProcesses] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (process.steps && process.steps.nodes) {
      setNodes(process.steps.nodes);
      setEdges(process.steps.edges || []);
      if (process.steps.viewport) {
        setDefaultViewport(process.steps.viewport);
      }
    } else if (nodes.length === 0) {
      // Default nodes if none exist and we haven't initialized yet
      setNodes([
        { 
          id: 'start', 
          type: 'startEnd', 
          data: { label: 'Start' }, 
          position: { x: 250, y: 50 } 
        }
      ]);
      setEdges([]);
    }

    const fetchData = async () => {
      try {
        const [docs, procs] = await Promise.all([
          getDokuments(),
          getProcesses()
        ]);
        setDokuments(docs);
        setAllProcesses(procs.filter(p => p.id !== process.id));
      } catch (error) {
        console.error('Failed to fetch data', error);
      }
    };
    fetchData();
  }, [process.id]); // Only re-run if the process ID changes

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
      if (node.data?.subProcessId && onDrillDown) {
        onDrillDown(node.data.subProcessId);
      } else {
        // In view mode, clicking a node shows its properties (documents)
        setSelectedNode(node);
      }
    }
  }, [isEditMode, onDrillDown]);

  const addNode = (type) => {
    const id = `node_${Date.now()}`;
    const newNode = {
      id,
      type,
      data: { label: `Ny ${type}`, docs: [] },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const updateNodeLabel = (label) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, data: { ...node.data, label } };
        }
        return node;
      })
    );
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label } });
  };

  const toggleDoc = (docId) => {
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
  };

  const setSubProcess = (subProcessId) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, data: { ...node.data, subProcessId: subProcessId || null } };
        }
        return node;
      })
    );
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, subProcessId: subProcessId || null } });
  };

  const handleDrillDown = () => {
    if (selectedNode?.data?.subProcessId && onDrillDown) {
      onDrillDown(selectedNode.data.subProcessId);
    }
  };

  const handleCreateSubProcess = async () => {
    const title = prompt('Ange namn på den nya underprocessen:', `${selectedNode.data.label} - Detaljer`);
    if (!title) return;

    try {
      const newSubProcess = {
        title,
        description: `Underprocess till ${process.title} (${selectedNode.data.label})`,
        status: 'active',
        parent_id: process.id,
        created_by: currentUser?.id
      };
      
      const created = await createProcess(newSubProcess);
      setAllProcesses([...allProcesses, created]);
      setSubProcess(created.id);
      toast.success(`Underprocess "${title}" skapad och kopplad!`);
    } catch (error) {
      console.error('Failed to create sub-process', error);
      toast.error('Kunde inte skapa underprocess');
    }
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const saveProcess = async () => {
    setIsSaving(true);
    try {
      const viewport = getViewport();
      const steps = { nodes, edges, viewport };
      const updated = await updateProcess(process.id, { steps });
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
  };

  return (
    <div className="process-visualizer">
      <div className="visualizer-header">
        <div className="header-title-group">
          <button className="btn-secondary" onClick={onBack}>
            <ChevronLeft size={18} />
            <span className="hide-on-mobile">Tillbaka</span>
          </button>
          <h2>{process.title}</h2>
        </div>
        <div className="header-actions">
          {(!process.is_global || userProfile?.role === 'superadmin') && (
            !isEditMode ? (
              <button className="btn-secondary" onClick={() => setIsEditMode(true)}>
                <Edit2 size={18} />
                <span>Redigera</span>
              </button>
            ) : (
              <>
                <button className="btn-secondary" onClick={() => setIsEditMode(false)}>
                  <X size={18} />
                  <span>Avbryt</span>
                </button>
                <button className="btn-primary" onClick={saveProcess} disabled={isSaving}>
                  <Save size={18} />
                  <span>{isSaving ? 'Sparar...' : 'Spara'}</span>
                </button>
              </>
            )
          )}
        </div>
      </div>

      <div className="visualizer-content">
        {isEditMode && (
          <div className="toolbar">
            <h3>Verktyg</h3>
            <button className="tool-btn" onClick={() => addNode('startEnd')}>
              <div className="shape oval"></div>
              <span>Start/Slut</span>
            </button>
            <button className="tool-btn" onClick={() => addNode('step')}>
              <div className="shape rect"></div>
              <span>Process-steg</span>
            </button>
            <button className="tool-btn" onClick={() => addNode('decision')}>
              <div className="shape diamond"></div>
              <span>Beslut</span>
            </button>
            <button className="tool-btn" onClick={() => addNode('document')}>
              <div className="shape doc"></div>
              <span>Dokument</span>
            </button>
            <button className="tool-btn" onClick={() => addNode('data')}>
              <div className="shape parallelogram"></div>
              <span>Data</span>
            </button>
            <button className="tool-btn" onClick={() => addNode('database')}>
              <div className="shape cylinder"></div>
              <span>Databas</span>
            </button>
            <hr />
            <p className="hint">Dra mellan noder för att skapa kopplingar</p>
          </div>
        )}

        <div className="flow-container">
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
            {isEditMode && <MiniMap />}
          </ReactFlow>
        </div>

        {selectedNode && (
          <div className="properties-panel">
            <div className="panel-header">
              <h3>{isEditMode ? 'Egenskaper' : 'Information'}</h3>
              <button className="close-btn" onClick={() => setSelectedNode(null)}>
                <X size={18} />
              </button>
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
                  <div className="flex-row gap-2">
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
                      className="btn-icon-small" 
                      title="Skapa ny underprocess"
                      onClick={handleCreateSubProcess}
                    >
                      <PlusCircle size={20} />
                    </button>
                  </div>
                ) : (
                  selectedNode.data.subProcessId ? (
                    <div className="read-only-value">
                      {allProcesses.find(p => p.id === selectedNode.data.subProcessId)?.title || 'Kopplad underprocess'}
                    </div>
                  ) : (
                    <div className="read-only-value text-muted">Ingen koppling</div>
                  )
                )}
                {selectedNode.data.subProcessId && (
                  <button className="btn-secondary btn-full mt-2" onClick={handleDrillDown}>
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
                        />
                        <FileIcon type={doc.file_type} size={16} />
                        <span>{doc.title}</span>
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
                            className="doc-link-item"
                          >
                            <FileIcon type={doc.file_type} size={16} />
                            <span>{doc.title}</span>
                            <ExternalLink size={14} className="ml-auto" />
                          </a>
                        );
                      })
                    ) : (
                      <p className="text-muted p-2">Inga dokument kopplade</p>
                    )
                  )}
                  {isEditMode && dokuments.length === 0 && <p className="text-muted p-2">Inga dokument tillgängliga</p>}
                </div>
              </div>

              {isEditMode && (
                <button className="btn-danger btn-full" onClick={deleteSelectedNode}>
                  <Trash2 size={16} />
                  <span>Ta bort nod</span>
                </button>
              )}
            </div>
          </div>
        )}
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
