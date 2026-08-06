import { useEffect, useRef } from 'react';
import { NotificationSettings, Todo } from '../context/AppContext';
import {
  triggerMotivationNotification,
  triggerTaskReminder,
  triggerStudyBlockNotification,
  triggerStreakProtectionAlert
} from '../lib/notifications';

interface UseNotificationSchedulerProps {
  notificationSettings: NotificationSettings;
  todos: Todo[];
  streakDays: number;
  hoursStudiedToday: number;
  dailyTarget: number;
  isLoaded: boolean;
}

export function useNotificationScheduler({
  notificationSettings,
  todos,
  streakDays,
  hoursStudiedToday,
  dailyTarget,
  isLoaded
}: UseNotificationSchedulerProps) {
  const lastMotivationRef = useRef<number>(Date.now() - 1000 * 60 * 15); // seed to trigger shortly after start if enabled
  const lastTaskReminderRef = useRef<number>(0);
  const lastStreakAlertRef = useRef<number>(0);
  const notifiedBlocksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isLoaded) return;

    const checkAndTrigger = () => {
      const now = Date.now();
      const currentDate = new Date();
      const currentHour = currentDate.getHours();

      // 1. Motivational Notifications
      if (notificationSettings.motivationalAlerts) {
        let minIntervalMs = 25 * 60 * 1000; // default 'high' (25 mins)
        if (notificationSettings.frequency === 'balanced') {
          minIntervalMs = 50 * 60 * 1000;
        } else if (notificationSettings.frequency === 'gentle') {
          minIntervalMs = 120 * 60 * 1000;
        }

        if (now - lastMotivationRef.current >= minIntervalMs) {
          lastMotivationRef.current = now;
          triggerMotivationNotification();
        }
      }

      // 2. Task Reminders
      if (notificationSettings.taskReminders) {
        const pending = todos.filter(t => !t.completed);
        const taskReminderIntervalMs = notificationSettings.frequency === 'high' ? 20 * 60 * 1000 : 45 * 60 * 1000;

        if (pending.length > 0 && now - lastTaskReminderRef.current >= taskReminderIntervalMs) {
          // Find high priority task or upcoming scheduled task
          const urgentTask = pending.find(t => t.priority === 'High') || pending[0];
          lastTaskReminderRef.current = now;
          triggerTaskReminder(urgentTask.text, pending.length);
        }
      }

      // 3. Scheduled Study Block Reminders
      if (notificationSettings.studyBlockReminders) {
        todos.forEach(task => {
          if (task.completed || !task.startTime) return;
          const startMs = new Date(task.startTime).getTime();
          const endMs = task.endTime ? new Date(task.endTime).getTime() : startMs + 45 * 60 * 1000;

          const blockId = `${task.id}_${task.startTime}`;

          // Starting soon (within 5 mins)
          if (now >= startMs - 5 * 60 * 1000 && now <= startMs + 2 * 60 * 1000) {
            if (!notifiedBlocksRef.current.has(`${blockId}_start`)) {
              notifiedBlocksRef.current.add(`${blockId}_start`);
              triggerStudyBlockNotification(task.subject || task.text, 'start');
            }
          }

          // Ending soon (within 5 mins of end)
          if (now >= endMs - 5 * 60 * 1000 && now <= endMs + 2 * 60 * 1000) {
            if (!notifiedBlocksRef.current.has(`${blockId}_end`)) {
              notifiedBlocksRef.current.add(`${blockId}_end`);
              triggerStudyBlockNotification(task.subject || task.text, 'end');
            }
          }
        });
      }

      // 4. Streak Protection Alerts at crucial times (2 PM, 6 PM, 9 PM, 11 PM)
      if (notificationSettings.streakProtectionAlerts) {
        const streakAlertHours = [14, 18, 21, 23];
        if (streakAlertHours.includes(currentHour) && hoursStudiedToday < 0.5) {
          const alertKey = `streak_alert_${currentDate.toDateString()}_${currentHour}`;
          if (!notifiedBlocksRef.current.has(alertKey)) {
            notifiedBlocksRef.current.add(alertKey);
            triggerStreakProtectionAlert(streakDays, hoursStudiedToday);
          }
        }
      }
    };

    // Initial check after 3 seconds on mount
    const initialTimeout = setTimeout(checkAndTrigger, 3000);

    // Periodic check every 30 seconds
    const interval = setInterval(checkAndTrigger, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [
    isLoaded,
    notificationSettings,
    todos,
    streakDays,
    hoursStudiedToday,
    dailyTarget
  ]);
}
