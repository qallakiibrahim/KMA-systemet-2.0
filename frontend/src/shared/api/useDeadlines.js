import { useState, useEffect } from 'react';
import { getTasks } from '../../apps/task/api/tasksApi';
import { getRisker } from '../../apps/risk/api/risk';
import { getAvvikelser } from '../../apps/avvikelse/api/avvikelse';
import { createNotification } from '../../apps/notification/api/notification';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { isBefore, addDays, parseISO, startOfDay } from 'date-fns';

export const useDeadlines = () => {
  const { user } = useAuth();
  const [lastCheck, setLastCheck] = useState(null);

  const checkDeadlines = async () => {
    if (!user) return;

    try {
      const [tasks, risker, avvikelser] = await Promise.all([
        getTasks(),
        getRisker(),
        getAvvikelser()
      ]);

      const today = startOfDay(new Date());
      const threeDaysFromNow = addDays(today, 3);

      const notify = async (title, message) => {
        await createNotification({
          title,
          message,
          user_id: user.id,
          is_read: false,
          created_at: new Date().toISOString()
        });
        toast.warning(title);
      };

      // Check Tasks
      for (const task of tasks) {
        if (task.status !== 'done' && task.dueDate) {
          const dueDate = parseISO(task.dueDate);
          if (isBefore(dueDate, threeDaysFromNow) && isBefore(today, dueDate)) {
             // Only notify once per session/day if possible, but for now just notify
             // In a real app, we'd track if we already notified for this specific deadline
          }
        }
      }

      // Check Risks
      for (const risk of risker) {
        if (risk.status !== 'closed' && risk.deadline) {
          const deadline = parseISO(risk.deadline);
          if (isBefore(deadline, threeDaysFromNow) && isBefore(today, deadline)) {
            await notify(`Risk-deadline närmar sig: ${risk.title}`, `Deadline för risk "${risk.title}" är ${risk.deadline}`);
          }
        }
      }

      // Check Deviations
      for (const a of avvikelser) {
        if (a.status !== 'closed' && a.deadline) {
          const deadline = parseISO(a.deadline);
          if (isBefore(deadline, threeDaysFromNow) && isBefore(today, deadline)) {
            await notify(`Avvikelse-deadline närmar sig: ${a.titel}`, `Deadline för avvikelse "${a.titel}" är ${a.deadline}`);
          }
        }
      }

      setLastCheck(new Date());
    } catch (error) {
      console.error("Error checking deadlines:", error);
    }
  };

  useEffect(() => {
    if (user) {
      checkDeadlines();
      // Check every hour
      const interval = setInterval(checkDeadlines, 3600000);
      return () => clearInterval(interval);
    }
  }, [user]);

  return { checkDeadlines, lastCheck };
};
