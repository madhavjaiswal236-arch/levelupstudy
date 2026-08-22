import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { HAPTIC_PATTERNS, vibrate } from './haptics';

export interface InAppToast {
  id: string;
  title: string;
  body: string;
  type: 'task' | 'motivation' | 'study_block' | 'streak' | 'general';
  timestamp: number;
}

type ToastListener = (toast: InAppToast) => void;
const toastListeners = new Set<ToastListener>();

export function subscribeInAppNotifications(listener: ToastListener) {
  toastListeners.add(listener);
  return () => {
    toastListeners.delete(listener);
  };
}

function notifyInAppSubscribers(title: string, body: string, type: InAppToast['type'] = 'general') {
  const toast: InAppToast = {
    id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title,
    body,
    type,
    timestamp: Date.now()
  };
  toastListeners.forEach(listener => {
    try {
      listener(toast);
    } catch (e) {
      console.error('In-app toast listener error:', e);
    }
  });
}

export function getChromeNotificationPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

// Web Audio API Synthesizer with singleton AudioContext
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch (e) {
    return null;
  }
}

export function playNotificationChime(type: InAppToast['type'] = 'general') {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'streak') {
      // Urgent double high pitch chime
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'motivation' || type === 'study_block') {
      // Uplifting arpeggio chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Gentle subtle ping
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch (e) {
    // AudioContext blocked or restricted
  }
}

export async function checkNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perms = await LocalNotifications.checkPermissions();
      return perms.display === 'granted';
    } catch (e) {
      return false;
    }
  } else {
    return 'Notification' in window && Notification.permission === 'granted';
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const perms = await LocalNotifications.requestPermissions();
      return perms.display === 'granted';
    } catch (e) {
      console.error('Failed to request Capacitor notification permissions', e);
      return false;
    }
  } else {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (e) {
      console.error('Failed to request Web notification permissions', e);
      return false;
    }
  }
}

export interface NotificationOptions {
  body?: string;
  type?: 'task' | 'motivation' | 'study_block' | 'streak' | 'general';
  sound?: boolean;
  tag?: string;
  data?: any;
  icon?: string;
  silent?: boolean;
}

export async function sendNotification(title: string, options: NotificationOptions = {}) {
  const { body = '', type = 'general', sound = true } = options;

  // Always emit to in-app subscribers first
  notifyInAppSubscribers(title, body, type);

  // Play audio chime & haptic feedback
  if (sound && !options.silent) {
    playNotificationChime(type);
    if (type === 'streak') {
      vibrate(HAPTIC_PATTERNS.WARNING);
    } else if (type === 'motivation' || type === 'study_block') {
      vibrate(HAPTIC_PATTERNS.SUCCESS);
    } else {
      vibrate(HAPTIC_PATTERNS.TAP);
    }
  }

  // Handle OS-level / Push-level / Chrome Web Notifications
  if (Capacitor.isNativePlatform()) {
    try {
      const perms = await LocalNotifications.checkPermissions();
      let isGranted = perms.display === 'granted';
      if (!isGranted) {
        const req = await LocalNotifications.requestPermissions();
        isGranted = req.display === 'granted';
      }
      if (isGranted) {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 1000000) + 1,
              schedule: { at: new Date(Date.now() + 500) },
              sound: sound ? 'res://platform_default' : undefined,
              actionTypeId: 'OPEN_APP'
            }
          ]
        });
      }
    } catch (e) {
      console.error('LocalNotifications schedule error:', e);
    }
  } else {
    // Chrome / Edge / Web Browser standard Notification API
    if ('Notification' in window) {
      const showWebNotification = () => {
        try {
          const notif = new Notification(title, {
            body,
            icon: options.icon || '/favicon.ico',
            tag: options.tag || type,
            silent: !sound,
            requireInteraction: type === 'streak' // Require user close for streak warnings
          });
          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch (e) {
          console.error('Chrome Web Notification creation error:', e);
        }
      };

      if (Notification.permission === 'granted') {
        showWebNotification();
      } else if (Notification.permission === 'default') {
        // Try requesting permission if default
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            showWebNotification();
          }
        });
      }
    }
  }
}

// Extensive Motivational Quotes Pool
export const MOTIVATIONAL_NOTIFICATIONS = [
  {
    title: "⚡ Rival Activity Alert",
    body: "Your competitors are solving PYQs right now. Don't leave your rank to chance!"
  },
  {
    title: "🔥 Discipline Equals Freedom",
    body: "The pain of discipline lasts minutes. The pain of regret lasts a lifetime. Lock in!"
  },
  {
    title: "🎯 IIT JEE Mindset",
    body: "Every 45-minute deep focus block brings you closer to your dream college percentile."
  },
  {
    title: "💪 Level Up Challenge",
    body: "Solve 5 more practice questions right now to boost your daily XP and conquer today's target!"
  },
  {
    title: "🧠 Deep Focus Protocol",
    body: "Silence social media, clear your desk, and dedicate the next 30 minutes to pure problem solving."
  },
  {
    title: "🏆 Compound Consistency",
    body: "Consistency is not about perfection. It is about showing up daily when you least feel like it."
  },
  {
    title: "🚀 Zero Excuses Zone",
    body: "The best time to master this concept was yesterday. The second best time is RIGHT NOW!"
  },
  {
    title: "🛡️ Protect Your Streak",
    body: "Don't break the momentum you worked so hard to build. Complete a study session today!"
  },
  {
    title: "🔥 Unstoppable Drive",
    body: "Winners do what is required, even when they don't feel like it. Start your next study block!"
  },
  {
    title: "⚡ High Velocity Focus",
    body: "Action precedes motivation. Open your book first—the focus will follow automatically."
  }
];

export function getRandomMotivation() {
  const index = Math.floor(Math.random() * MOTIVATIONAL_NOTIFICATIONS.length);
  return MOTIVATIONAL_NOTIFICATIONS[index];
}

export function triggerMotivationNotification() {
  const item = getRandomMotivation();
  sendNotification(item.title, {
    body: item.body,
    type: 'motivation'
  });
}

export function triggerTaskReminder(taskName: string, pendingCount?: number) {
  if (pendingCount && pendingCount > 1) {
    sendNotification(`📋 ${pendingCount} Tasks Pending Today`, {
      body: `Current priority: "${taskName}". Clear your list to claim massive XP!`,
      type: 'task'
    });
  } else {
    sendNotification(`⏰ Task Reminder: ${taskName}`, {
      body: `Stay on schedule! Tackle "${taskName}" now to keep your study velocity high.`,
      type: 'task'
    });
  }
}

export function triggerStudyBlockNotification(subject: string, phase: 'start' | 'midway' | 'end') {
  if (phase === 'start') {
    sendNotification(`📚 Study Block Launch: ${subject}`, {
      body: `Your ${subject} focus block is starting now! Switch to Deep Focus mode.`,
      type: 'study_block'
    });
  } else if (phase === 'midway') {
    sendNotification(`⏳ Block Halfway Point: ${subject}`, {
      body: `You are 25 minutes into your session. Maintain maximum focus and problem speed!`,
      type: 'study_block'
    });
  } else if (phase === 'end') {
    sendNotification(`🔔 Study Block Finishing!`, {
      body: `5 minutes left in your ${subject} block. Wrap up your notes and prepare to log your XP.`,
      type: 'study_block'
    });
  }
}

export function triggerStreakProtectionAlert(streakDays: number, hoursStudied: number) {
  if (hoursStudied < 0.5) {
    sendNotification(`🚨 Urgent: Streak Shield Warning!`, {
      body: `You have ${streakDays} days on the line and < 0.5 hrs logged today. Complete a session before midnight!`,
      type: 'streak'
    });
  } else {
    sendNotification(`🔥 Streak Active: ${streakDays} Days!`, {
      body: `Great work showing up today! Keep pushing to reach today's total XP goal.`,
      type: 'streak'
    });
  }
}

