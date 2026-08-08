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

      let pushReceivedHandle: any = null;
      let pushActionHandle: any = null;

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        vibrate(HAPTIC_PATTERNS.SUCCESS);
      }).then(handle => { pushReceivedHandle = handle; });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        // Handle action, e.g. deep linking
      }).then(handle => { pushActionHandle = handle; });

      return () => {
        pushReceivedHandle?.remove();
        pushActionHandle?.remove();
      };
    }
  }, []);
};
