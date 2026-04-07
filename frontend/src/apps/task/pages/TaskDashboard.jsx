import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTasks, createTask, updateTask, deleteTask } from '../api/tasksApi';
import { createNotification } from '../../notification/api/notification';
import { sendEmailNotification } from '../../../shared/api/sendEmailNotification';
import { useAuth } from '../../../shared/api/AuthContext';
import { useSearch } from '../../../shared/context/SearchContext';
import { useHeaderActions } from '../../../shared/context/HeaderActionsContext';
import { Plus, Clock, CheckCircle, Circle, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, AlertOctagon } from 'lucide-react';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { toast } from 'react-toastify';
import '../styles/TaskDashboard.css';

const TaskDashboard = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const location = useLocation();
  const { currentUser, userProfile } = useAuth();
  const { searchQuery } = useSearch();

  // Register header actions
  useHeaderActions(
    <button className="btn btn-primary btn-sm" onClick={() => setIsAdding(true)}>
      <Plus size={16} />
      <span>Ny uppgift</span>
    </button>
  );

  const [isAdding, setIsAdding] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', dueDate: '', status: 'todo', priority: 'Medium' });

  // TanStack Query for data fetching
  const { data: tasksData, isLoading: loading, isError, error } = useQuery({
    queryKey: ['tasks', page, pageSize],
    queryFn: () => getTasks(page, pageSize),
    placeholderData: (previousData) => previousData,
  });

  const tasks = tasksData?.data || (Array.isArray(tasksData) ? tasksData : []);
  
  const filteredTasks = tasks.filter(task => 
    searchQuery === '' || 
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalCount = tasksData?.count || (Array.isArray(tasksData) ? tasksData.length : 0);
  const totalPages = Math.ceil(totalCount / pageSize);

  useEffect(() => {
    if (!loading && location.state?.openId) {
      const taskToOpen = tasks.find(t => t.id === location.state.openId);
      if (taskToOpen) {
        openEditModal(taskToOpen);
      }
    }
  }, [loading, location.state, tasks]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: async (created) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success("Uppgift tillagd!");
      
      // Create in-app notification
      try {
        await createNotification({
          title: `Ny uppgift skapad: ${created.title}`,
          message: `Du har skapat en ny uppgift: ${created.title}`,
          user_id: currentUser.id,
          is_read: false
        });

        if (currentUser.email) {
          sendEmailNotification(
            currentUser.email,
            `Ny uppgift skapad: ${created.title}`,
            `<h3>Du har skapat en ny uppgift</h3>
             <p><strong>Titel:</strong> ${created.title}</p>
             <p><strong>Beskrivning:</strong> ${created.description || 'Ingen beskrivning'}</p>
             <p><strong>Förfallodatum:</strong> ${created.dueDate ? new Date(created.dueDate).toLocaleDateString('sv-SE') : 'Inget datum satt'}</p>`
          );
        }
      } catch (err) {
        console.error("Failed to send notification:", err);
      }
    },
    onError: (err) => {
      console.error("Create task error:", err);
      toast.error("Kunde inte lägga till uppgift");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateTask(id, data),
    onSuccess: async (updated, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      if (variables.data.status === 'done') {
        toast.success("Uppgift slutförd!");
        
        try {
          // Create in-app notification
          await createNotification({
            title: `Uppgift slutförd: ${updated.title}`,
            message: `Bra jobbat! Du har markerat uppgiften ${updated.title} som klar.`,
            user_id: currentUser.id,
            is_read: false
          });

          if (currentUser.email) {
            sendEmailNotification(
              currentUser.email,
              `Uppgift slutförd: ${updated.title}`,
              `<h3>Bra jobbat!</h3>
               <p>Du har markerat uppgiften <strong>${updated.title}</strong> som klar.</p>`
            );
          }
        } catch (err) {
          console.error("Failed to send notification:", err);
        }
      } else {
        toast.info("Uppgift uppdaterad");
      }
    },
    onError: (err) => {
      console.error("Update task error:", err);
      toast.error("Kunde inte uppdatera uppgift");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.info("Uppgift borttagen");
    },
    onError: (err) => {
      console.error("Delete task error:", err);
      toast.error("Kunde inte ta bort uppgift");
    }
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    
    if (editingTask) {
      updateMutation.mutate({
        id: editingTask.id,
        data: {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
          status: newTask.status,
          priority: newTask.priority
        }
      });
    } else {
      createMutation.mutate({
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        status: newTask.status,
        priority: newTask.priority,
        created_by: currentUser.id,
        company_id: userProfile?.company_id
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

  if (isError) {
    return (
      <div className="error-state">
        <AlertOctagon size={48} className="text-level-high" />
        <h2>Ett fel uppstod vid hämtning av uppgifter</h2>
        <p>{error?.message || 'Kunde inte ansluta till databasen'}</p>
        <button className="btn btn-primary" onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}>
          Försök igen
        </button>
      </div>
    );
  }

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {col.icon}
                <h3>{col.title}</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {!isMobile && (
                  <button 
                    className="btn-icon-mini" 
                    onClick={() => {
                      setNewTask({...newTask, status: col.id});
                      setIsAdding(true);
                    }}
                    title={`Lägg till i ${col.title}`}
                  >
                    <Plus size={16} />
                  </button>
                )}
                <span className="task-count">
                  {filteredTasks.filter(t => t.status === col.id).length}
                </span>
              </div>
            </div>
            <div className="column-content">
              {filteredTasks.filter(t => t.status === col.id).map(renderTaskCard)}
              {filteredTasks.filter(t => t.status === col.id).length === 0 && (
                <div className="empty-column-msg">
                  {searchQuery ? 'Inga träffar' : 'Inga uppgifter'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
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

export default TaskDashboard;
