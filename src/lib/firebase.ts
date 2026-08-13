import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, signInWithRedirect, GoogleAuthProvider, onAuthStateChanged, User, signInWithCredential, getRedirectResult } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromCache, onSnapshot, serverTimestamp, enableIndexedDbPersistence } from 'firebase/firestore';
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

if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed-precondition: multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence unimplemented in this browser environment.');
    }
  });
}

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

export function sanitizeForFirestore(val: any): any {
  if (val === undefined) {
    return null;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }

  // Preserve Special objects like Firestore FieldValue (e.g. serverTimestamp) or Date objects
  if (val.constructor && val.constructor.name !== 'Object' && val.constructor.name !== 'Array') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item) => (item === undefined ? null : sanitizeForFirestore(item)));
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(val)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned;
}

const userSaveTimers = new Map<string, any>();
const pendingSaveDataMap = new Map<string, any>();
const activeSaveWorkersMap = new Map<string, Promise<boolean>>();
const lastWriteTimestampMap = new Map<string, number>();

const processSaveQueue = async (userId: string): Promise<boolean> => {
  if (activeSaveWorkersMap.has(userId)) {
    return activeSaveWorkersMap.get(userId)!;
  }

  const workerPromise = (async () => {
    let success = true;
    while (pendingSaveDataMap.has(userId)) {
      if (!auth.currentUser || auth.currentUser.uid !== userId) {
        pendingSaveDataMap.delete(userId);
        break;
      }

      // Enforce minimum 1200ms spacing between consecutive network writes to prevent rate limiting & queue overflow
      const lastWrite = lastWriteTimestampMap.get(userId) || 0;
      const timeSinceLastWrite = Date.now() - lastWrite;
      if (timeSinceLastWrite < 1200) {
        await new Promise((r) => setTimeout(r, 1200 - timeSinceLastWrite));
      }

      const targetData = pendingSaveDataMap.get(userId);
      pendingSaveDataMap.delete(userId);
      if (!targetData) break;

      const path = `users/${userId}`;
      try {
        const userRef = doc(db, 'users', userId);
        const sanitizedData = sanitizeForFirestore(targetData);
        await setDoc(userRef, {
          ...sanitizedData,
          updatedAt: serverTimestamp()
        }, { merge: true });
        lastWriteTimestampMap.set(userId, Date.now());
      } catch (err: any) {
        success = false;
        const isOfflineOrThrottled =
          err?.code === 'permission-denied' ||
          err?.code === 'resource-exhausted' ||
          err?.code === 'unavailable' ||
          err?.message?.includes('permission') ||
          err?.message?.includes('exhausted') ||
          err?.message?.includes('offline') ||
          err?.message?.includes('backend') ||
          err?.message?.includes('Could not reach');

        if (isOfflineOrThrottled) {
          console.warn('Firestore write queued or waiting for network/auth connection:', err?.message || err);
        } else {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
        break;
      }
    }
    activeSaveWorkersMap.delete(userId);
    return success;
  })();

  activeSaveWorkersMap.set(userId, workerPromise);
  return workerPromise;
};

export const saveUserDataToCloud = async (userId: string, data: any, immediate: boolean = false): Promise<boolean> => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return false;
  pendingSaveDataMap.set(userId, data);

  if (immediate) {
    if (userSaveTimers.has(userId)) {
      clearTimeout(userSaveTimers.get(userId));
      userSaveTimers.delete(userId);
    }
    return processSaveQueue(userId);
  }

  if (userSaveTimers.has(userId)) {
    clearTimeout(userSaveTimers.get(userId));
  }

  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      userSaveTimers.delete(userId);
      const result = await processSaveQueue(userId);
      resolve(result);
    }, 1500);
    userSaveTimers.set(userId, timer);
  });
};

// Load user data from Firestore
export const loadUserDataFromCloud = async (userId: string) => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return null;
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data();
      }
    } catch (readErr: any) {
      const isOfflineErr =
        readErr?.code === 'unavailable' ||
        readErr?.message?.includes('offline') ||
        readErr?.message?.includes('backend') ||
        readErr?.message?.includes('Could not reach');

      if (isOfflineErr) {
        console.warn('Firestore client is offline or backend unreachable. Attempting cache read.');
        try {
          const cacheSnap = await getDocFromCache(userRef);
          if (cacheSnap.exists()) {
            return cacheSnap.data();
          }
        } catch (cacheErr) {
          console.warn('No cached data found for user doc in offline mode.');
        }
        return null;
      }
      throw readErr;
    }
  } catch (err: any) {
    if (
      err?.code === 'permission-denied' ||
      err?.message?.includes('permission') ||
      err?.code === 'unavailable' ||
      err?.message?.includes('offline') ||
      err?.message?.includes('backend')
    ) {
      console.warn('Firestore read operating in offline mode or waiting for auth.');
      return null;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
  return null;
};

// Listen to real-time changes from Firestore across devices
export const subscribeToCloudUserData = (userId: string, callback: (data: any, metadata?: { hasPendingWrites: boolean }) => void) => {
  if (!auth.currentUser || auth.currentUser.uid !== userId) return () => {};
  const path = `users/${userId}`;
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data(), { hasPendingWrites: snap.metadata.hasPendingWrites });
    }
  }, (err: any) => {
    if (
      err?.code === 'permission-denied' ||
      err?.code === 'unavailable' ||
      err?.message?.includes('permission') ||
      err?.message?.includes('offline') ||
      err?.message?.includes('backend')
    ) {
      console.warn('Firestore listener operating in offline mode or waiting for auth context.');
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
 if (!Capacitor.isNativePlatform() && sessionStorage.getItem('auth_redirect_in_progress') === 'true') {
    getRedirectResult(auth).then((result) => {
      sessionStorage.removeItem('auth_redirect_in_progress');
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
    }).catch((err) => {
      sessionStorage.removeItem('auth_redirect_in_progress');
      console.error(err);
    });
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
          sessionStorage.setItem('auth_redirect_in_progress', 'true');
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
    if (expiresAt > 0 && Date.now() >= expiresAt - 5 * 60 * 1000) {
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
