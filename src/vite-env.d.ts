/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:firebase-config' {
  const config: {
    projectId?: string;
    appId?: string;
    apiKey?: string;
    authDomain?: string;
    firestoreDatabaseId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    measurementId?: string;
    oAuthClientId?: string;
    recaptchaSiteKey?: string;
  };
  export default config;
}
