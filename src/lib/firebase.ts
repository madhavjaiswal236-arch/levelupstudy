import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, User, signInWithCredential, getRedirectResult } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let isSigningIn = false;
let cachedAccessToken: string | null = sessionStorage.getItem('google_access_token');
let pendingSignInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

export const initAuth = (
 onAuthChange?: (user: User | null, token: string | null) => void
) => {
 if (!Capacitor.isNativePlatform()) {
    getRedirectResult(auth).then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          sessionStorage.setItem('google_access_token', cachedAccessToken);
          const expiresAt = new Date().getTime() + 3500 * 1000;
          sessionStorage.setItem('google_access_token_expires_at', expiresAt.toString());
          if (onAuthChange) onAuthChange(result.user, cachedAccessToken);
        }
      }
    }).catch(console.error);
 }

 return onAuthStateChanged(auth, async (user: User | null) => {
   if (user) {
     if (!cachedAccessToken) {
       cachedAccessToken = sessionStorage.getItem('google_access_token');
     }
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

export const googleSignIn = async (useRedirectIfBlocked: boolean = true): Promise<{ user: User; accessToken: string } | null> => {
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

      // Try Popup first
      try {
        const result = await signInWithPopup(auth, getProvider());
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.accessToken) {
          throw new Error('Failed to get access token from Firebase Auth');
        }

        cachedAccessToken = credential.accessToken;
        sessionStorage.setItem('google_access_token', cachedAccessToken);
        const expiresAt = new Date().getTime() + 3500 * 1000;
        sessionStorage.setItem('google_access_token_expires_at', expiresAt.toString());

        return { user: result.user, accessToken: cachedAccessToken };
      } catch (popupErr: any) {
        console.warn('signInWithPopup failed:', popupErr);
        
        // Check if popup was blocked or iframe restriction triggered
        if (useRedirectIfBlocked && !Capacitor.isNativePlatform()) {
          console.log('Attempting fallback signInWithRedirect...');
          await signInWithRedirect(auth, getProvider());
          return null;
        }
        
        throw popupErr;
      }
    } catch (error: any) {
      console.error('Sign in error details:', error);
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

export const getAccessTokenSync = (): string | null => {
  if (cachedAccessToken) {
    const expiresAtStr = sessionStorage.getItem('google_access_token_expires_at');
    const expiresAt = expiresAtStr ? parseInt(expiresAtStr) : 0;
    if (expiresAt > 0 && Date.now() + 5 * 60 * 1000 > expiresAt) {
      console.log("Access token expired (or expiring soon). Returning null.");
      cachedAccessToken = null;
      sessionStorage.removeItem('google_access_token');
      sessionStorage.removeItem('google_access_token_expires_at');
      return null;
    }
  } else {
    cachedAccessToken = sessionStorage.getItem('google_access_token');
  }
  return cachedAccessToken;
};

export const getAccessToken = async (): Promise<string | null> => {
  return getAccessTokenSync();
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
