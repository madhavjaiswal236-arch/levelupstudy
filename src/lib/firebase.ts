import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signInWithCredential } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

let isSigningIn = false;
let cachedAccessToken: string | null = sessionStorage.getItem('google_access_token');
let pendingSignInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

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
  if (pendingSignInPromise) {
    console.log('Sign-in already in progress, returning existing promise...');
    return pendingSignInPromise;
  }

  pendingSignInPromise = (async () => {
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
      console.error('Sign in error details:', error);

      if (!Capacitor.isNativePlatform() && (
        error.code === 'auth/popup-blocked' || 
        error.code === 'auth/cancelled-popup-request' || 
        error.message?.toLowerCase().includes('popup') ||
        error.message?.toLowerCase().includes('cancelled')
      )) {
        const friendlyError = new Error(
          "Popups are blocked or restricted by your browser. Since the app is running in an iframe inside the AI Studio preview, please click the 'Open in New Tab' button (top-right corner of the preview) to log in, or allow popups in your browser settings."
        );
        (friendlyError as any).code = error.code;
        throw friendlyError;
      }
      throw error;
    } finally {
      isSigningIn = false;
    }
  })();

  try {
    return await pendingSignInPromise;
  } finally {
    pendingSignInPromise = null;
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
