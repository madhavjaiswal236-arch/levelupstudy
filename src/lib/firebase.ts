import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signInWithCredential } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

let isSigningIn = false;
let cachedAccessToken: string | null = sessionStorage.getItem('google_access_token');

export const initAuth = (
 onAuthChange?: (user: User | null, token: string | null) => void
) => {
 if (!Capacitor.isNativePlatform()) {
  import('firebase/auth').then(({ getRedirectResult }) => {
    getRedirectResult(auth).then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          sessionStorage.setItem('google_access_token', cachedAccessToken);
          const expiresAt = new Date().getTime() + 3500 * 1000;
          sessionStorage.setItem('google_access_token_expires_at', expiresAt.toString());
        }
      }
    }).catch(console.error);
  });
 }

 return onAuthStateChanged(auth, async (user: User | null) => {
 if (user) {
 if (onAuthChange) onAuthChange(user, cachedAccessToken);
 } else {
 cachedAccessToken = null;
 sessionStorage.removeItem('google_access_token');
 sessionStorage.removeItem('google_access_token_expires_at');
 if (onAuthChange) onAuthChange(null, null);
 }
 });
};

const getProvider = () => {
 const provider = new GoogleAuthProvider();
 provider.addScope('https://www.googleapis.com/auth/calendar');
 provider.addScope('https://www.googleapis.com/auth/tasks');
 provider.setCustomParameters({
 prompt: 'consent'
 });
 return provider;
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
 try {
 isSigningIn = true;

 if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle({
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/tasks'],
    });
    
    if (!result.credential) {
      throw new Error('No credential returned from native sign in');
    }
    
    const credential = GoogleAuthProvider.credential(result.credential.idToken, result.credential.accessToken);
    const fbResult = await signInWithCredential(auth, credential);
    
    if (result.credential.accessToken) {
      cachedAccessToken = result.credential.accessToken;
      sessionStorage.setItem('google_access_token', cachedAccessToken);
      const expiresAt = new Date().getTime() + 3500 * 1000;
      sessionStorage.setItem('google_access_token_expires_at', expiresAt.toString());
    }

    return { user: fbResult.user, accessToken: cachedAccessToken || '' };
 }

 const result = await signInWithPopup(auth, getProvider());
 const credential = GoogleAuthProvider.credentialFromResult(result);
 if (!credential?.accessToken) {
 throw new Error('Failed to get access token from Firebase Auth');
 }

 cachedAccessToken = credential.accessToken;
 sessionStorage.setItem('google_access_token', cachedAccessToken);
 
 // Set expiration time to 3500 seconds (slightly under 1 hour to have a buffer)
 const expiresAt = new Date().getTime() + 3500 * 1000;
 sessionStorage.setItem('google_access_token_expires_at', expiresAt.toString());

 return { user: result.user, accessToken: cachedAccessToken };
 } catch (error: any) {
 console.error('Sign in error:', error);
 if (!Capacitor.isNativePlatform() && (error.code === 'auth/popup-blocked' || error.message?.toLowerCase().includes('popup'))) {
   console.log('Popup blocked, using redirect...');
   import('firebase/auth').then(({ signInWithRedirect }) => {
     signInWithRedirect(auth, getProvider());
   });
   return new Promise(() => {}); // Wait forever for redirect
 }
 throw error;
 } finally {
 isSigningIn = false;
 }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    const expiresAtStr = sessionStorage.getItem('google_access_token_expires_at');
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr) : 0;
    // adding a 5 minute buffer for token expiration
    if (Date.now() + 5 * 60 * 1000 > expiresAt) {
      console.log("Access token expired (or expiring soon). Returning null to force re-auth.");
      return null;
    }
  }
  return cachedAccessToken;
};

let refreshPromise: Promise<string | null> | null = null;

export const refreshGoogleToken = async (): Promise<string | null> => {
 if (!auth.currentUser) return null;
 
 if (refreshPromise) {
 console.log("Token refresh already in progress, waiting...");
 return refreshPromise;
 }

 refreshPromise = (async () => {
    try {
      const expiresAtStr = sessionStorage.getItem('google_access_token_expires_at');
      const expiresAt = expiresAtStr ? parseInt(expiresAtStr) : 0;
      if (Date.now() < expiresAt && cachedAccessToken) {
        return cachedAccessToken;
      }
      console.warn('OAuth token expired. Re-authentication required.');

      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle({
          scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/tasks'],
        });
        if (result.credential?.accessToken) {
          cachedAccessToken = result.credential.accessToken;
          sessionStorage.setItem('google_access_token', cachedAccessToken);
          const expiresAt = new Date().getTime() + 3500 * 1000;
          sessionStorage.setItem('google_access_token_expires_at', expiresAt.toString());
          return cachedAccessToken;
        }
        return null;
      }

      const result = await signInWithPopup(auth, getProvider());
 const credential = GoogleAuthProvider.credentialFromResult(result);
 if (credential?.accessToken) {
 cachedAccessToken = credential.accessToken;
 sessionStorage.setItem('google_access_token', cachedAccessToken);
 const expiresAt = new Date().getTime() + 3500 * 1000;
 sessionStorage.setItem('google_access_token_expires_at', expiresAt.toString());
 return cachedAccessToken;
 }
 } catch (error) {
 console.error("Failed to refresh token:", error);
 }
 return null;
 })();

 try {
 return await refreshPromise;
 } finally {
 refreshPromise = null;
 }
};

export const logout = async () => {
 if (Capacitor.isNativePlatform()) {
   try {
     await FirebaseAuthentication.signOut();
   } catch(e) {}
 }
 await auth.signOut();
 cachedAccessToken = null;
 sessionStorage.removeItem('google_access_token');
 sessionStorage.removeItem('google_access_token_expires_at');
};
