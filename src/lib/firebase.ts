import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signInWithCredential, getRedirectResult } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  memoryLocalCache, 
  memoryLruGarbageCollector,
  setLogLevel,
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  getDocFromCache, 
  getDocFromServer,
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { firebaseAppletConfig } from './firebaseConfig';

const metaEnv = (import.meta as any).env || {};

const mergedFirebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey || "",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain || "",
  databaseURL: metaEnv.VITE_FIREBASE_DATABASE_URL || (firebaseAppletConfig.projectId ? `https://${firebaseAppletConfig.projectId}-default-rtdb.firebaseio.com` : ""),
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId || "",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket || "",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId || "",
  appId: metaEnv.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId || "",
  measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID || firebaseAppletConfig.measurementId || "",
};

export const firestoreDatabaseId: string =
  metaEnv.VITE_FIREBASE_DATABASE_ID ||
  firebaseAppletConfig.firestoreDatabaseId ||
  "(default)";

const app = getApps().length > 0 ? getApp() : initializeApp(mergedFirebaseConfig);
export const auth = getAuth(app);

// Suppress internal lease warnings
if (typeof window !== 'undefined') {
  try {
    setLogLevel('error');
  } catch (e) {}
}

let dbInstance;
if (typeof window !== 'undefined') {
  try {
    // Robust in-memory caching to eliminate multi-tab lease contentions and IndexedDB batchId desyncs
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache({
        garbageCollector: memoryLruGarbageCollector(),
      }),
    }, firestoreDatabaseId);
  } catch (e) {
    dbInstance = getFirestore(app, firestoreDatabaseId);
  }
} else {
  dbInstance = getFirestore(app, firestoreDatabaseId);
}
export const db = dbInstance;

// Test connection to Firestore on initialization
export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Connected successfully to database:', firestoreDatabaseId);
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firestore] Client is offline or waiting for network connection.");
    } else {
      console.log('[Firestore] Connection verification completed.');
    }
    return false;
  }
}
testFirestoreConnection();

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
  if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
    return null;
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
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
    if (value !== undefined && typeof value !== 'function' && typeof value !== 'symbol') {
      if (key === 'xp') {
        cleaned[key] = Math.max(0, Number(value) || 0);
      } else if (key === 'level') {
        cleaned[key] = Math.max(1, Number(value) || 1);
      } else if (key === 'streakDays') {
        cleaned[key] = Math.max(0, Number(value) || 0);
      } else {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
  }
  return cleaned;
}

const userSaveTimers = new Map<string, any>();
const pendingSaveDataMap = new Map<string, any>();
const activeSaveWorkersMap = new Map<string, Promise<boolean>>();
const lastWriteTimestampMap = new Map<string, number>();
const consecutiveFailuresMap = new Map<string, number>();

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

      const failures = consecutiveFailuresMap.get(userId) || 0;
      // Exponential backoff only if previous failures occurred
      const baseDelay = failures > 0 ? Math.min(10000, 1000 * Math.pow(2, failures - 1)) : 0;

      const lastWrite = lastWriteTimestampMap.get(userId) || 0;
      const timeSinceLastWrite = Date.now() - lastWrite;
      if (timeSinceLastWrite < baseDelay) {
        await new Promise((r) => setTimeout(r, baseDelay - timeSinceLastWrite));
      }

      // Grab the latest aggregated state snapshot and clear queue
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
        consecutiveFailuresMap.set(userId, 0); // reset backoff on success
        console.log(`[Firestore] Successfully saved user data to users/${userId}`);
      } catch (err: any) {
        success = false;
        const failureCount = (consecutiveFailuresMap.get(userId) || 0) + 1;
        consecutiveFailuresMap.set(userId, failureCount);

        // Put the data back in the pending map so it gets saved on next attempt
        if (!pendingSaveDataMap.has(userId)) {
          pendingSaveDataMap.set(userId, targetData);
        }

        const isOfflineOrThrottled =
          err?.code === 'resource-exhausted' ||
          err?.code === 'unavailable' ||
          err?.message?.includes('exhausted') ||
          err?.message?.includes('offline') ||
          err?.message?.includes('backend') ||
          err?.message?.includes('Could not reach') ||
          err?.message?.includes('INTERNAL ASSERTION FAILED') ||
          err?.message?.includes('Unexpected state');

        if (isOfflineOrThrottled) {
          console.warn(`[Firestore Queue] Network/SDK transient state (attempt ${failureCount}). Backing off:`, err?.message || err);
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
  // Always aggregate incoming state so intermediate rapid bursts (XP gains, task toggles) collapse into 1 payload
  const existingPending = pendingSaveDataMap.get(userId) || {};
  pendingSaveDataMap.set(userId, { ...existingPending, ...data });

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
    }, 400);
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
      } else {
        return { __docExists: false };
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

// Force fetch directly from Firestore for manual restore
export const fetchUserDataDirectlyFromFirestore = async (userId: string): Promise<{ success: boolean; exists: boolean; data?: any; error?: string }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return { success: true, exists: true, data: snap.data() };
    } else {
      return { success: true, exists: false, error: "No document found for this user in Firestore." };
    }
  } catch (err: any) {
    console.error("fetchUserDataDirectlyFromFirestore error:", err);
    return { success: false, exists: false, error: err?.message || String(err) };
  }
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

let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt: number = 0;
let cachedRefreshToken: string | null = null;

interface BackendOAuthConfig {
  configured: boolean;
  clientId: string | null;
  redirectUri: string | null;
  offlineSupported: boolean;
}

const TARGET_GOOGLE_OAUTH_CLIENT_ID =
  firebaseAppletConfig.oAuthClientId ||
  '807015900608-gagaqm29c2ol637rvqp0a0p14ovft8po.apps.googleusercontent.com';

const KNOWN_OFFLINE_REDIRECT_URIS: Record<string, string> = {
  'https://levelupstudy.vercel.app': 'https://levelupstudy.vercel.app',
  'https://ais-dev-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app':
    'https://ais-dev-2euhcrau4rvk3hkgfjrppb-413884331750.asia-southeast1.run.app/api/auth/callback',
};

let cachedBackendOAuthConfig: BackendOAuthConfig | null = null;
let configFetchPromise: Promise<BackendOAuthConfig | null> | null = null;

const getEffectiveOfflineOAuthConfig = (): BackendOAuthConfig | null => {
  if (
    cachedBackendOAuthConfig?.configured &&
    cachedBackendOAuthConfig?.offlineSupported &&
    cachedBackendOAuthConfig?.clientId &&
    cachedBackendOAuthConfig?.redirectUri
  ) {
    return cachedBackendOAuthConfig;
  }
  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    const cleanOrigin = window.location.origin.replace(/\/+$/, '');
    const knownRedirect = KNOWN_OFFLINE_REDIRECT_URIS[cleanOrigin];
    if (knownRedirect) {
      return {
        configured: true,
        clientId: TARGET_GOOGLE_OAUTH_CLIENT_ID,
        redirectUri: knownRedirect,
        offlineSupported: true,
      };
    }
  }
  return cachedBackendOAuthConfig;
};

export const prefetchGoogleAuthConfig = async (): Promise<BackendOAuthConfig | null> => {
  if (typeof window === 'undefined' || Capacitor.isNativePlatform()) return null;
  if (cachedBackendOAuthConfig) return cachedBackendOAuthConfig;
  if (configFetchPromise) return configFetchPromise;

  configFetchPromise = (async () => {
    try {
      const url = `/api/auth/google/config?origin=${encodeURIComponent(window.location.origin)}`;
      const res = await fetch(url);
      if (res.ok) {
        const cfg = await res.json();
        cachedBackendOAuthConfig = {
          configured: Boolean(cfg?.configured),
          clientId: cfg?.clientId || TARGET_GOOGLE_OAUTH_CLIENT_ID,
          redirectUri: cfg?.redirectUri || null,
          offlineSupported: Boolean(cfg?.offlineSupported),
        };
        return cachedBackendOAuthConfig;
      }
    } catch (e) {
      // Backend OAuth endpoint unavailable; Firebase popup will be used
    } finally {
      configFetchPromise = null;
    }
    return null;
  })();

  return configFetchPromise;
};

if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
  prefetchGoogleAuthConfig();
}

export const persistRefreshToken = async (token: string | null) => {
  cachedRefreshToken = token;
  try {
    if (token) {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'google_refresh_token', value: token });
      } else {
        localStorage.setItem('google_refresh_token', token);
      }
    } else {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: 'google_refresh_token' });
      } else {
        localStorage.removeItem('google_refresh_token');
      }
    }
  } catch (e) {
    console.warn('Refresh token persistence error:', e);
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  if (cachedRefreshToken) return cachedRefreshToken;
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await Preferences.get({ key: 'google_refresh_token' });
      cachedRefreshToken = res.value;
    } else {
      cachedRefreshToken = localStorage.getItem('google_refresh_token');
    }
  } catch (e) {
    console.warn('Failed to hydrate refresh token:', e);
  }
  return cachedRefreshToken;
};

let pendingSignInPromise: Promise<{ user: User; accessToken: string } | null> | null = null;

const persistOAuthToken = async (token: string | null, expiresAt: number) => {
  cachedAccessToken = token;
  cachedTokenExpiresAt = expiresAt;
  try {
    if (token) {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'google_access_token', value: token });
        await Preferences.set({ key: 'google_token_expires_at', value: String(expiresAt) });
      } else {
        localStorage.setItem('google_access_token', token);
        localStorage.setItem('google_token_expires_at', String(expiresAt));
        sessionStorage.setItem('google_access_token', token);
        sessionStorage.setItem('google_token_expires_at', String(expiresAt));
      }
    } else {
      if (Capacitor.isNativePlatform()) {
        await Preferences.remove({ key: 'google_access_token' });
        await Preferences.remove({ key: 'google_token_expires_at' });
      } else {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_token_expires_at');
        sessionStorage.removeItem('google_access_token');
        sessionStorage.removeItem('google_token_expires_at');
      }
    }
  } catch (e) {
    console.warn('Token persistence error:', e);
  }
};

export const invalidateOAuthToken = async () => {
  await persistOAuthToken(null, 0);
  await persistRefreshToken(null);
  try {
    localStorage.removeItem('google_oauth_client_id');
    sessionStorage.removeItem('google_access_token');
    sessionStorage.removeItem('google_token_expires_at');
  } catch (e) {}
};

const hydratePersistedToken = async (): Promise<string | null> => {
  try {
    let tokenVal: string | null = null;
    let expVal: string | null = null;
    if (Capacitor.isNativePlatform()) {
      const [tokenRes, expRes] = await Promise.all([
        Preferences.get({ key: 'google_access_token' }),
        Preferences.get({ key: 'google_token_expires_at' }),
      ]);
      tokenVal = tokenRes.value;
      expVal = expRes.value;
    } else {
      tokenVal = localStorage.getItem('google_access_token') || sessionStorage.getItem('google_access_token');
      expVal = localStorage.getItem('google_token_expires_at') || sessionStorage.getItem('google_token_expires_at');
    }
    if (tokenVal) {
      const exp = expVal ? parseInt(expVal, 10) : 0;
      if (exp > Date.now() + 60 * 1000) {
        cachedAccessToken = tokenVal;
        cachedTokenExpiresAt = exp;
        return cachedAccessToken;
      }
    }
  } catch (e) {
    console.warn('Failed to hydrate persisted OAuth token:', e);
  }
  return null;
};

let urlCallbackHandled = false;

const processRedirectAuthCodeIfPresent = async (
  onAuthChange?: (user: User | null, token: string | null) => void
) => {
  if (urlCallbackHandled || typeof window === 'undefined' || Capacitor.isNativePlatform()) return;
  urlCallbackHandled = true;

  try {
    const params = new URLSearchParams(window.location.search);
    const googleAuthCode = params.get('google_auth_code');
    const oauthDirectCode = params.get('state') === 'google_offline_auth' ? params.get('code') : null;
    const code = googleAuthCode || oauthDirectCode;
    const authError = params.get('google_auth_error') || (params.get('state') === 'google_offline_auth' ? params.get('error') : null);

    if (!code && !authError) return;

    // Clean URL immediately so reloads don't re-submit a single-use code
    const cleanUrl = new URL(window.location.href);
    ['google_auth_code', 'google_auth_error', 'code', 'scope', 'authuser', 'prompt', 'state', 'error'].forEach((k) =>
      cleanUrl.searchParams.delete(k)
    );
    window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

    if (authError) {
      console.warn('Google OAuth redirect returned error:', authError);
      return;
    }

    if (code) {
      const storedRedirectUri =
        sessionStorage.getItem('google_offline_redirect_uri') ||
        (oauthDirectCode ? window.location.origin : `${window.location.origin}/api/auth/google/callback`);
      const storedClientId = sessionStorage.getItem('google_offline_client_id') || undefined;
      sessionStorage.removeItem('google_offline_redirect_uri');
      sessionStorage.removeItem('google_offline_client_id');

      const result = await connectGoogleCalendarOffline(code, storedRedirectUri, storedClientId);
      if (result && onAuthChange) {
        onAuthChange(result.user || auth.currentUser, result.accessToken || cachedAccessToken);
      }
    }
  } catch (err) {
    console.warn('Failed to complete redirect OAuth code exchange:', err);
  }
};

export const initAuth = (
  onAuthChange?: (user: User | null, token: string | null) => void
) => {
  prefetchGoogleAuthConfig();
  processRedirectAuthCodeIfPresent(onAuthChange);

  if (!Capacitor.isNativePlatform() && sessionStorage.getItem('auth_redirect_in_progress') === 'true') {
    getRedirectResult(auth).then((result) => {
      sessionStorage.removeItem('auth_redirect_in_progress');
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          const exp = Date.now() + 3500 * 1000;
          persistOAuthToken(credential.accessToken, exp);
          if (onAuthChange) onAuthChange(result.user, credential.accessToken);
        } else if (onAuthChange) {
          onAuthChange(result.user, cachedAccessToken);
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
        await hydratePersistedToken();
      }
      if (onAuthChange) onAuthChange(user, cachedAccessToken);

      // Silently refresh expired Google Calendar token in background if refresh token exists
      if (!cachedAccessToken) {
        const rt = await getRefreshToken();
        if (rt) {
          refreshGoogleToken().then((refreshed) => {
            if (refreshed && onAuthChange && auth.currentUser?.uid === user.uid) {
              onAuthChange(auth.currentUser, refreshed);
            }
          }).catch(() => {});
        }
      }
    } else {
      await persistOAuthToken(null, 0);
      if (onAuthChange) onAuthChange(null, null);
    }
  });
};

const getProvider = (includeCalendarScopes: boolean = true) => {
  const provider = new GoogleAuthProvider();
  if (includeCalendarScopes) {
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/tasks');
  }
  provider.setCustomParameters({
    prompt: 'select_account',
  });
  return provider;
};

export const googleSignIn = async (_useRedirectIfBlocked: boolean = false): Promise<{ user: User; accessToken: string } | null> => {
  if (pendingSignInPromise) {
    console.log('Sign-in already in progress, returning existing promise...');
    return pendingSignInPromise;
  }

  pendingSignInPromise = (async () => {
    try {
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
          const exp = Date.now() + 3500 * 1000;
          await persistOAuthToken(result.credential.accessToken, exp);
        }

        return { user: fbResult.user, accessToken: cachedAccessToken || '' };
      }

      // Synchronous check first so browser user-gesture is preserved if interactive login is needed
      if (auth.currentUser) {
        const syncToken = getAccessTokenSync();
        if (syncToken) {
          return { user: auth.currentUser, accessToken: syncToken };
        }
        const storedExp = parseInt(localStorage.getItem('google_token_expires_at') || '0', 10);
        const storedTok = localStorage.getItem('google_access_token');
        if (storedTok && storedExp > Date.now() + 60 * 1000) {
          cachedAccessToken = storedTok;
          cachedTokenExpiresAt = storedExp;
          return { user: auth.currentUser, accessToken: storedTok };
        }
        const hasStoredRt = cachedRefreshToken || localStorage.getItem('google_refresh_token');
        if (hasStoredRt) {
          const refreshed = await refreshGoogleToken();
          if (refreshed) {
            return { user: auth.currentUser, accessToken: refreshed };
          }
        }
      }

      // Path 1: Unified 1-Popup Offline OAuth + Firebase Auth (gives Firebase user + access_token + permanent refresh_token)
      const backendCfg = getEffectiveOfflineOAuthConfig();
      if (backendCfg?.configured && backendCfg?.offlineSupported && backendCfg?.clientId && backendCfg?.redirectUri) {
        const offlineResult = await startGoogleOfflineAuthFlow(backendCfg.clientId, backendCfg.redirectUri);
        if (offlineResult?.user) {
          return { user: offlineResult.user, accessToken: offlineResult.accessToken || cachedAccessToken || '' };
        }
        if (auth.currentUser) {
          return { user: auth.currentUser, accessToken: offlineResult?.accessToken || cachedAccessToken || '' };
        }
        return null;
      }

      // Path 2: Firebase Auth signInWithPopup (uses firebaseapp.com/__/auth/handler — never calls broken signInWithRedirect)
      const result = await signInWithPopup(auth, getProvider(true));
      const credential = GoogleAuthProvider.credentialFromResult(result);

      if (credential?.accessToken) {
        const exp = Date.now() + 3500 * 1000;
        await persistOAuthToken(credential.accessToken, exp);
      }

      return { user: result.user, accessToken: credential?.accessToken || cachedAccessToken || '' };
    } catch (error: any) {
      console.error('Sign in error details:', error);
      throw error;
    }
  })();

  try {
    return await pendingSignInPromise;
  } finally {
    pendingSignInPromise = null;
  }
};

export const formatAuthError = (err: any): string => {
  const code = String(err?.code || '');
  const msg = String(err?.message || '');
  const lower = `${code} ${msg}`.toLowerCase();

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request' || lower.includes('window was closed')) {
    return 'Sign-in window was closed before completing. Click again to sign in.';
  }
  if (lower.includes('google oauth backend is not configured')) {
    return 'Server OAuth secret is missing on this deployment. Add GOOGLE_CLIENT_SECRET (or paste your Google OAuth JSON) in Vercel Environment Variables and redeploy.';
  }
  if (lower.includes('redirect_uri_mismatch')) {
    return 'OAuth redirect URI mismatch in Google Cloud Console for this URL. Ensure this domain callback URI is in Authorized redirect URIs.';
  }
  if (lower.includes('invalid_client') || lower.includes('provided client secret is invalid')) {
    return 'Google OAuth client secret mismatch. Ensure your server GOOGLE_CLIENT_SECRET (and Firebase Console → Authentication → Google → Web SDK configuration) uses your active client secret.';
  }
  if (code === 'auth/unauthorized-domain' || lower.includes('unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
    return `Domain not authorized in Firebase Auth: ${host}. Add it in Firebase Console → Authentication → Settings → Authorized domains.`;
  }
  if (code === 'auth/popup-blocked' || lower.includes('popup')) {
    return 'Pop-up was blocked by the browser. Please allow pop-ups or open the app in a new tab.';
  }
  return msg ? `Login failed: ${msg}` : 'Login failed. Please try again.';
};

export const getAccessTokenSync = (): string | null => {
  if (cachedAccessToken) {
    if (cachedTokenExpiresAt > 0 && Date.now() >= cachedTokenExpiresAt - 5 * 60 * 1000) {
      console.log("Access token expired (or expiring soon). Returning null.");
      cachedAccessToken = null;
      cachedTokenExpiresAt = 0;
      return null;
    }
  }
  return cachedAccessToken;
};

export const getAccessToken = async (): Promise<string | null> => {
  const syncToken = getAccessTokenSync();
  if (syncToken) return syncToken;
  return await hydratePersistedToken();
};

let refreshPromise: Promise<string | null> | null = null;

export const refreshGoogleToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    console.log("Token refresh already in progress, waiting...");
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      // 1. If in-memory token is still fresh, return it immediately
      if (Date.now() < cachedTokenExpiresAt && cachedAccessToken) {
        return cachedAccessToken;
      }

      // 2. Native Android / iOS platform (Capacitor)
      if (Capacitor.isNativePlatform()) {
        try {
          const result = await FirebaseAuthentication.signInWithGoogle({
            scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/tasks'],
          });
          if (result.credential?.accessToken) {
            const exp = Date.now() + 3500 * 1000;
            await persistOAuthToken(result.credential.accessToken, exp);
            return cachedAccessToken;
          }
        } catch (nativeErr) {
          console.warn('Native Google re-auth failed, attempting stored refresh_token:', nativeErr);
        }
      }

      // 3. Web & Offline-to-Online Silent Refresh
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const storedClientId = typeof window !== 'undefined' ? localStorage.getItem('google_oauth_client_id') : null;
          const res = await fetch('/api/auth/google/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              refresh_token: refreshToken,
              ...(storedClientId ? { client_id: storedClientId } : {}),
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.access_token) {
              const exp = Date.now() + (data.expires_in || 3500) * 1000;
              await persistOAuthToken(data.access_token, exp);
              console.log('Successfully refreshed Google Calendar access token silently!');
              return data.access_token;
            }
          } else {
            const errData = await res.json().catch(() => ({}));
            console.warn('Backend refresh returned non-ok status:', res.status, errData);
            if (errData?.details?.includes('invalid_grant') || errData?.error?.includes('invalid_grant')) {
              console.warn('Google refresh token revoked or expired. User re-consent required.');
              await persistRefreshToken(null);
            }
          }
        } catch (fetchErr) {
          console.warn('Network error during background token refresh:', fetchErr);
        }
      }

      console.warn('OAuth token expired and no valid refresh token found.');
      return null;
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return null;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};


/**
 * Exchanges authorization code for access_token, refresh_token, AND id_token,
 * then signs the user into Firebase Auth so one single login handles everything.
 */
export const connectGoogleCalendarOffline = async (
  code: string,
  redirectUri?: string,
  clientId?: string
): Promise<{ user: User | null; accessToken: string; refreshToken?: string } | null> => {
  try {
    const res = await fetch('/api/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
        ...(clientId ? { client_id: clientId } : {}),
      }),
    });
    if (!res.ok) {
      const rawText = await res.text().catch(() => '');
      let errorData: any = {};
      try {
        errorData = rawText ? JSON.parse(rawText) : {};
      } catch {
        errorData = {};
      }
      const fallbackMsg = rawText
        ? `Exchange failed (HTTP ${res.status}): ${rawText.slice(0, 140)}`
        : `Failed to exchange authorization code (HTTP ${res.status})`;
      throw new Error(errorData.details || errorData.error || fallbackMsg);
    }
    const data = await res.json();
    if (data.access_token) {
      const exp = Date.now() + (data.expires_in || 3500) * 1000;
      await persistOAuthToken(data.access_token, exp);
      if (data.refresh_token) {
        await persistRefreshToken(data.refresh_token);
      }
      if (data.client_id && typeof window !== 'undefined') {
        try {
          localStorage.setItem('google_oauth_client_id', data.client_id);
        } catch (e) {}
      }

      let fbUser: User | null = auth.currentUser;
      if (data.id_token) {
        try {
          const credential = GoogleAuthProvider.credential(data.id_token, data.access_token);
          const fbResult = await signInWithCredential(auth, credential);
          fbUser = fbResult.user;
        } catch (credErr) {
          try {
            const idOnlyCredential = GoogleAuthProvider.credential(data.id_token);
            const fbResult = await signInWithCredential(auth, idOnlyCredential);
            fbUser = fbResult.user;
          } catch (fallbackErr) {
            console.warn('Firebase signInWithCredential note:', credErr, fallbackErr);
          }
        }
      }

      return {
        user: fbUser,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    }
    return null;
  } catch (err) {
    console.error('Failed to connect Google offline:', err);
    throw err;
  }
};


/**
 * Opens a Google OAuth consent popup requesting OpenID + Calendar + Tasks with offline access (refresh_token).
 * Signs into Firebase AND stores persistent Calendar refresh token in one click.
 */
export const startGoogleOfflineAuthFlow = async (
  customClientId?: string,
  customRedirectUri?: string
): Promise<{ user: User | null; accessToken: string; refreshToken?: string } | null> => {
  if (typeof window === 'undefined') return null;

  const effectiveCfg = getEffectiveOfflineOAuthConfig();
  let clientId = customClientId || effectiveCfg?.clientId || '';
  let redirectUri = customRedirectUri || effectiveCfg?.redirectUri || '';

  if (!clientId || !redirectUri) {
    const cfg = await prefetchGoogleAuthConfig();
    if (!clientId && cfg?.clientId) clientId = cfg.clientId;
    if (!redirectUri && cfg?.redirectUri) redirectUri = cfg.redirectUri;
  }

  if (!clientId) {
    clientId = TARGET_GOOGLE_OAUTH_CLIENT_ID;
  }
  if (!redirectUri) {
    const cleanOrigin = window.location.origin.replace(/\/+$/, '');
    redirectUri = KNOWN_OFFLINE_REDIRECT_URIS[cleanOrigin] || `${cleanOrigin}/api/auth/google/callback`;
  }

  if (!clientId) {
    throw new Error('Google OAuth Client ID is not configured.');
  }

  try {
    sessionStorage.setItem('google_offline_redirect_uri', redirectUri);
    sessionStorage.setItem('google_offline_client_id', clientId);
  } catch (e) {}

  const hasStoredRefresh = Boolean(localStorage.getItem('google_refresh_token'));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks',
    access_type: 'offline',
    prompt: hasStoredRefresh ? 'select_account' : 'consent select_account',
    include_granted_scopes: 'true',
    state: 'google_offline_auth',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  const width = 500;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    authUrl,
    'google_offline_auth',
    `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,location=0,menubar=0`
  );

  if (!popup) {
    window.location.href = authUrl;
    return null;
  }

  return new Promise((resolve, reject) => {
    let resolved = false;
    let bc: BroadcastChannel | null = null;

    const cleanup = () => {
      window.removeEventListener('message', messageHandler);
      clearInterval(checkTimer);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };

    const handlePayload = async (data: any) => {
      if (resolved || !data || data.type !== 'GOOGLE_AUTH_CALLBACK') return;
      resolved = true;
      cleanup();

      if (data.error) {
        return reject(new Error(data.error));
      }

      if (data.code) {
        try {
          const finalRedirectUri = data.redirectUri || redirectUri;
          const result = await connectGoogleCalendarOffline(data.code, finalRedirectUri, clientId);
          return resolve(result);
        } catch (err) {
          return reject(err);
        }
      }
      reject(new Error('No authorization code received from Google.'));
    };

    const messageHandler = (event: MessageEvent) => {
      handlePayload(event.data);
    };

    window.addEventListener('message', messageHandler);

    try {
      bc = new BroadcastChannel('levelup_google_auth');
      bc.onmessage = (event) => handlePayload(event.data);
    } catch (e) {}

    const checkTimer = setInterval(() => {
      if (popup.closed) {
        // Brief grace period for BroadcastChannel/postMessage delivery before concluding user closed popup
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            reject(new Error('Google authentication window was closed.'));
          }
        }, 350);
      }
    }, 500);
  });
};

export const logout = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch (e) {}
  }
  await auth.signOut();
  await invalidateOAuthToken();
};

export const deleteUserAccountAndCloudData = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (user) {
      const uid = user.uid;
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (err) {
        console.warn('Could not delete user Firestore document:', err);
      }
      try {
        await user.delete();
      } catch (err) {
        console.warn('Could not delete user auth record:', err);
      }
    }
    await logout();
    return true;
  } catch (error) {
    console.error('Error during full account deletion:', error);
    return false;
  }
};

