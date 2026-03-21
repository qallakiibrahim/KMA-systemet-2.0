import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTasks } from '../../../shared/api/useTasks';
import { Plus, Clock, CheckCircle, Circle, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import '../styles/TaskDashboard.css';

const TaskDashboard = () => {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const location = useLocation();
  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', status: 'todo', priority: 'Medium' });

  useEffect(() => {
    if (!loading && location.state?.openId) {
      const taskToOpen = tasks.find(t => t.id === location.state.openId);
      if (taskToOpen) {
        openEditModal(taskToOpen);
      }
    }
  }, [loading, location.state, tasks]);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    if (editingTask) {
      updateTask(editingTask.id, {
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        status: newTask.status,
        priority: newTask.priority
      });
    } else {
      addTask({
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        status: newTask.status,
        priority: newTask.priority
      });
    }
    
    setNewTask({ title: '', description: '', dueDate: '', status: 'todo', priority: 'Medium' });
    setIsAdding(false);
    setEditingTask(null);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      status: task.status,
      priority: task.priority || 'Medium'
    });
    setIsAdding(true);
  };

  const renderTaskCard = (task) => {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';
    
    return (
      <div key={task.id} className={`task-card ${isOverdue ? 'overdue' : ''}`} onClick={() => openEditModal(task)}>
        <div className="task-header">
          <div className="task-title-group">
            <span className={`priority-dot ${task.priority?.toLowerCase() || 'medium'}`} title={`Prioritet: ${task.priority || 'Medium'}`}></span>
            <h4 title={task.title}>{task.title}</h4>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {task.dueDate && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: isOverdue ? 'var(--danger-color)' : 'var(--text-secondary)', fontWeight: isOverdue ? 500 : 'normal' }}>
                <CalendarIcon size={12} />
                {format(new Date(task.dueDate), 'd MMM', { locale: sv })}
              </span>
            )}
            <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="delete-btn" title="Ta bort">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="task-meta-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          {task.description ? (
            <p className="task-desc-mini" title={task.description} style={{ flex: 1, marginRight: '0.5rem' }}>
              {task.description}
            </p>
          ) : (
            <div style={{ flex: 1 }}></div>
          )}
          <div className="task-meta-right" style={{ flexShrink: 0 }}>
            <select 
              value={task.status} 
              onChange={(e) => { e.stopPropagation(); updateTask(task.id, { status: e.target.value }); }}
              className={`status-select ${task.status}`}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="todo">Att göra</option>
              <option value="in-progress">Pågår</option>
              <option value="done">Klar</option>
            </select>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading">Laddar uppgifter...</div>;

  const columns = [
    { id: 'todo', title: 'Att göra', icon: <Circle size={18} /> },
    { id: 'in-progress', title: 'Pågår', icon: <Clock size={18} /> },
    { id: 'done', title: 'Klar', icon: <CheckCircle size={18} /> }
  ];

  return (
    <div className="task-dashboard-container">
      <div className="dashboard-header">
        <h1>Uppgifter</h1>
        <button className="add-task-btn" onClick={() => setIsAdding(true)}>
          <Plus size={20} /> Ny uppgift
        </button>
      </div>

      {isAdding && (
        <div className="add-task-modal">
          <div className="modal-content">
            <h2>{editingTask ? 'Redigera uppgift' : 'Skapa ny uppgift'}</h2>
            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label>Titel</label>
                <input 
                  type="text" 
                  value={newTask.title} 
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                  required 
                  placeholder="Vad behöver göras?"
                />
              </div>
              <div className="form-group">
                <label>Beskrivning</label>
                <textarea 
                  value={newTask.description} 
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Detaljer..."
                />
              </div>
              <div className="form-group">
                <label>Förfallodatum</label>
                <input 
                  type="date" 
                  value={newTask.dueDate} 
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Prioritet</label>
                <select 
                  value={newTask.priority} 
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                >
                  <option value="Low">Låg</option>
                  <option value="Medium">Medium</option>
                  <option value="High">Hög</option>
                  <option value="Critical">Kritisk</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select 
                  value={newTask.status} 
                  onChange={(e) => setNewTask({...newTask, status: e.target.value})}
                >
                  <option value="todo">Att göra</option>
                  <option value="in-progress">Pågår</option>
                  <option value="done">Klar</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => { setIsAdding(false); setEditingTask(null); }}>Avbryt</button>
                <button type="submit" className="save-btn">{editingTask ? 'Uppdatera' : 'Spara'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="kanban-board">
        {columns.map(col => (
          <div key={col.id} className="kanban-column">
            <div className="column-header">
              {col.icon}
              <h3>{col.title}</h3>
              <span className="task-count">
                {tasks.filter(t => t.status === col.id).length}
              </span>
            </div>
            <div className="column-content">
              {tasks.filter(t => t.status === col.id).map(renderTaskCard)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskDashboard;
