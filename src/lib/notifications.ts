import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export async function sendNotification(title: string, options: any) {
  if (Capacitor.isNativePlatform()) {
    try {
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body: options.body || '',
              id: new Date().getTime(),
              schedule: { at: new Date(Date.now() + 1000) }
            }
          ]
        });
      }
    } catch (e) {
      console.error(e);
    }
  } else {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
}
