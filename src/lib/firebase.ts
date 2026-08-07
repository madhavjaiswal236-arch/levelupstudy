import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, User, signInWithCredential, getRedirectResult } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import firebaseConfig from '../../firebase-applet-config.json';

const metaEnv = (import.meta as any).env || {};

const mergedFirebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || (firebaseConfig as any).apiKey || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || (firebaseConfig as any).authDomain || "",
  databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || (firebaseConfig as any).databaseURL || "",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || (firebaseConfig as any).projectId || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || (firebaseConfig as any).storageBucket || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || (firebaseConfig as any).messagingSenderId || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || (firebaseConfig as any).appId || "",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || (firebaseConfig as any).measurementId || "",
};

const app = getApps().length > 0 ? getApp() : initializeApp(mergedFirebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Save user data to Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

let saveTimer: any = null;
let pendingSaveData: { userId: string; data: any } | null = null;

export const saveUserDataToCloud = (userId: string, data: any, immediate: boolean = false) => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return;
  pendingSaveData = { userId, data };

  if (immediate) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!pendingSaveData) return;
    const { userId: targetUserId, data: targetData } = pendingSaveData;
    pendingSaveData = null;

    if (!auth.currentUser || auth.currentUser.uid !== targetUserId) return;
    const path = `users/${targetUserId}`;
    try {
      const userRef = doc(db, 'users', targetUserId);
      setDoc(userRef, {
        ...targetData,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch((err: any) => {
        if (err?.code === 'permission-denied' || err?.code === 'resource-exhausted' || err?.message?.includes('permission') || err?.message?.includes('exhausted')) {
          console.warn('Firestore write throttled or waiting for connection:', err?.message || err);
          return;
        }
        handleFirestoreError(err, OperationType.WRITE, path);
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
    return;
  }

  if (saveTimer) return;

  saveTimer = setTimeout(async () => {
    saveTimer = null;
    if (!pendingSaveData) return;
    const { userId: targetUserId, data: targetData } = pendingSaveData;
    pendingSaveData = null;

    if (!auth.currentUser || auth.currentUser.uid !== targetUserId) return;
    const path = `users/${targetUserId}`;
    try {
      const userRef = doc(db, 'users', targetUserId);
      await setDoc(userRef, {
        ...targetData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      if (err?.code === 'permission-denied' || err?.code === 'resource-exhausted' || err?.message?.includes('permission') || err?.message?.includes('exhausted')) {
        console.warn('Firestore write throttled or waiting for connection:', err?.message || err);
        return;
      }
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }, 15000); // 15s debounce for background auto-saves
};

// Load user data from Firestore
export const loadUserDataFromCloud = async (userId: string) => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return null;
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('Firestore read waiting for security rules propagation or auth context refresh.');
      return null;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
};

// Listen to real-time changes from Firestore across devices
export const subscribeToCloudUserData = (userId: string, callback: (data: any) => void) => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return () => {};
  const path = `users/${userId}`;
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data());
    }
  }, (err: any) => {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission')) {
      console.warn('Firestore listener waiting for security rules propagation or auth context refresh.');
      return;
    }
    handleFirestoreError(err, OperationType.GET, path);
  });
};

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
