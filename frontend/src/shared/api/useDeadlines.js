import { useState, useEffect } from 'react';
import { getTasks } from '../../apps/task/api/tasksApi';
import { getRisker } from '../../apps/risk/api/risk';
import { getAvvikelser } from '../../apps/avvikelse/api/avvikelse';
import { createNotification } from '../../apps/notification/api/notification';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

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

      const notify = async (id, type, title, message, daysLeft, link) => {
        // Skapa en unik nyckel för denna specifika notifikation (typ, id och hur många dagar kvar)
        // Detta förhindrar att vi skickar samma notifikation flera gånger
        const notificationState = daysLeft < 0 ? 'overdue' : daysLeft;
        const storageKey = `notified_${type}_${id}_${notificationState}`;
        
        if (localStorage.getItem(storageKey)) {
          return; // Redan notifierad för denna status
        }

        await createNotification({
          title,
          message,
          user_id: user.id,
          is_read: false,
          created_at: new Date().toISOString()
        });
        
        if (daysLeft < 0) {
          toast.error(title);
        } else if (daysLeft <= 1) {
          toast.warning(title);
        } else {
          toast.info(title);
        }

        // Markera som notifierad
        localStorage.setItem(storageKey, 'true');
      };

      const checkItem = async (item, type, titleField, dateField, linkPrefix) => {
        if ((item.status === 'done' || item.status === 'closed') || !item[dateField]) return;

        const deadline = startOfDay(parseISO(item[dateField]));
        const daysLeft = differenceInCalendarDays(deadline, today);
        const title = item[titleField];
        const link = `/${linkPrefix}`;

        // Bästa praxis för notifikationsfrekvens:
        // 1. Försenad (daysLeft < 0)
        // 2. Mycket brådskande (daysLeft === 1)
        // 3. Påminnelse (daysLeft === 3)
        
        if (daysLeft < 0) {
          await notify(
            item.id, type, 
            `Försenad: ${title}`, 
            `Deadline för ${title} passerades för ${Math.abs(daysLeft)} dagar sedan (${item[dateField]}).`,
            daysLeft, link
          );
        } else if (daysLeft === 1) {
          await notify(
            item.id, type, 
            `Brådskande: ${title}`, 
            `Deadline för ${title} är imorgon!`,
            daysLeft, link
          );
        } else if (daysLeft === 3) {
          await notify(
            item.id, type, 
            `Påminnelse: ${title}`, 
            `Det är 3 dagar kvar till deadline för ${title}.`,
            daysLeft, link
          );
        }
      };

      // Check Tasks
      for (const task of tasks) {
        await checkItem(task, 'task', 'title', 'dueDate', 'tasks');
      }

      // Check Risks
      for (const risk of risker) {
        await checkItem(risk, 'risk', 'title', 'deadline', 'risker');
      }

      // Check Deviations
      for (const a of avvikelser) {
        await checkItem(a, 'avvikelse', 'titel', 'deadline', 'avvikelser');
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
