import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import App from './App.tsx';
import './index.css';

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

initStorage().then(() => {
  createRoot(document.getElementById('root')!).render(
   <StrictMode>
   <App />
   </StrictMode>,
  );
});
