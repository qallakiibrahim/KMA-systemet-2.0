import { useState, useEffect } from 'react';
import { getTasks, createTask, updateTask as apiUpdateTask, deleteTask as apiDeleteTask } from '../../apps/task/api/tasksApi';
import { createNotification } from '../../apps/notification/api/notification';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { sendEmailNotification } from './sendEmailNotification';

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, userProfile } = useAuth();

  const fetchTasks = async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getTasks();
      // Filter tasks by user if needed, or assume backend handles it
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Kunde inte hämta uppgifter");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const addTask = async (taskData) => {
    if (!user) return;
    if (!userProfile?.company_id && userProfile?.role !== 'superadmin') {
      toast.error('Du måste vara kopplad till ett företag för att skapa en uppgift. Kontakta en administratör.');
      return;
    }
    try {
      // Ensure we have a company_id if the user is a superadmin but not linked yet
      let companyId = userProfile?.company_id;
      
      if (!companyId && userProfile?.role === 'superadmin') {
        // Try to find SafeQMS company ID
        const { data: companies } = await supabase.from('companies').select('id').eq('name', 'SafeQMS').limit(1);
        if (companies && companies.length > 0) {
          companyId = companies[0].id;
        }
      }

      const newTask = {
        ...taskData,
        created_by: user.id,
        company_id: companyId,
        status: taskData.status || 'todo'
      };
      const created = await createTask(newTask);
      setTasks([...tasks, created]);
      toast.success("Uppgift tillagd!");

      // Create in-app notification
      await createNotification({
        title: `Ny uppgift skapad: ${taskData.title}`,
        message: `Du har skapat en ny uppgift: ${taskData.title}`,
        user_id: user.id,
        is_read: false
      });

      if (user.email) {
        sendEmailNotification(
          user.email,
          `Ny uppgift skapad: ${taskData.title}`,
          `<h3>Du har skapat en ny uppgift</h3>
           <p><strong>Titel:</strong> ${taskData.title}</p>
           <p><strong>Beskrivning:</strong> ${taskData.description || 'Ingen beskrivning'}</p>
           <p><strong>Förfallodatum:</strong> ${taskData.dueDate ? new Date(taskData.dueDate).toLocaleDateString('sv-SE') : 'Inget datum satt'}</p>`
        );
      }
    } catch (error) {
      console.error("Error adding task:", error);
      toast.error("Kunde inte lägga till uppgift");
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const updated = await apiUpdateTask(taskId, updates);
      setTasks(tasks.map(t => t.id === taskId ? updated : t));
      
      const task = tasks.find(t => t.id === taskId);
      
      if (updates.status === 'done') {
        toast.success("Uppgift slutförd!");
        
        if (user && task) {
          // Create in-app notification
          await createNotification({
            title: `Uppgift slutförd: ${task.title}`,
            message: `Bra jobbat! Du har markerat uppgiften ${task.title} som klar.`,
            user_id: user.id,
            is_read: false
          });

          if (user.email) {
            sendEmailNotification(
              user.email,
              `Uppgift slutförd: ${task.title}`,
              `<h3>Bra jobbat!</h3>
               <p>Du har markerat uppgiften <strong>${task.title}</strong> som klar.</p>`
            );
          }
        }
      } else {
        toast.info("Uppgift uppdaterad");
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Kunde inte uppdatera uppgift");
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await apiDeleteTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.info("Uppgift borttagen");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Kunde inte ta bort uppgift");
    }
  };

  return { tasks, loading, addTask, updateTask, deleteTask };
};
