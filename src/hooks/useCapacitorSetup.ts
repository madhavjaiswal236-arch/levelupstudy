import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { vibrate, HAPTIC_PATTERNS } from '../lib/haptics';

export const useCapacitorSetup = () => {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Configure Status Bar
      StatusBar.setStyle({ style: Style.Dark }).catch(console.error);
      StatusBar.setBackgroundColor({ color: '#0a0f16' }).catch(console.error);
      
      // Hide Splash Screen after React has loaded
      setTimeout(() => {
        SplashScreen.hide().catch(console.error);
      }, 1000);

      // Request push notification permissions
      const requestPushPermissions = async () => {
        try {
          const permStatus = await PushNotifications.requestPermissions();
          if (permStatus.receive === 'granted') {
            await PushNotifications.register();
          }
        } catch (e) {
          console.error('Push notification registration failed', e);
        }
      };

      requestPushPermissions();

      let isMounted = true;
      let pushReceivedHandle: any = null;
      let pushActionHandle: any = null;

      PushNotifications.addListener('pushNotificationReceived', () => {
        vibrate(HAPTIC_PATTERNS.SUCCESS);
      }).then(handle => { 
        if (isMounted) {
          pushReceivedHandle = handle;
        } else {
          handle.remove();
        }
      }).catch(() => {});

      PushNotifications.addListener('pushNotificationActionPerformed', () => {
        // Handle action, e.g. deep linking
      }).then(handle => { 
        if (isMounted) {
          pushActionHandle = handle;
        } else {
          handle.remove();
        }
      }).catch(() => {});

      return () => {
        isMounted = false;
        pushReceivedHandle?.remove();
        pushActionHandle?.remove();
      };
    }
  }, []);
};
