import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register Service Worker for robust offline caching in web/PWA mode (production only)
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  try {
    registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('LevelUp PWA update available');
      },
      onOfflineReady() {
        console.log('LevelUp PWA cached for complete offline support');
      },
    });
  } catch (e) {
    // Service worker registration skipped in dev preview
  }
}

async function initStorage() {
  if (Capacitor.isNativePlatform()) {
    try {
      const keysResult = await Preferences.keys();
      for (const key of keysResult.keys) {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      }

      // Proxy localStorage to sync back to Preferences
      const originalSetItem = localStorage.setItem.bind(localStorage);
      const originalRemoveItem = localStorage.removeItem.bind(localStorage);
      const originalClear = localStorage.clear.bind(localStorage);

      localStorage.setItem = function(key, value) {
        originalSetItem(key, value);
        Preferences.set({ key, value });
      };

      localStorage.removeItem = function(key) {
        originalRemoveItem(key);
        Preferences.remove({ key });
      };

      localStorage.clear = function() {
        originalClear();
        Preferences.clear();
      };
    } catch (e) {
      console.error("Storage sync failed", e);
    }
  }
}

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

if (Capacitor.isNativePlatform()) {
  initStorage().then(renderApp);
} else {
  renderApp();
}
