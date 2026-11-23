import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { formatFirebaseAuthError } from './firebaseAuthErrors';
import {
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeEmailInput,
  sanitizeSafeHref,
  sanitizeSingleLineText,
} from '../utils/inputSanitization';

const VALID_UID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
export const AUTH_STORAGE_KEY = 'mrs_auth_user';

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  receivePlatformUpdates?: boolean;
  receiveBlogUpdates?: boolean;
  isServerAccount?: boolean;
}

export function normalizeAuthSessionUser(candidate: unknown): AuthSessionUser | null {
  if (!candidate || typeof candidate !== 'object') return null;
  const raw = candidate as Record<string, unknown>;

  if (typeof raw.uid !== 'string') return null;
  const uid = raw.uid.trim();
  if (!VALID_UID_PATTERN.test(uid)) return null;

  let email: string | null = null;
  if (raw.email !== null && raw.email !== undefined) {
    if (typeof raw.email !== 'string') return null;
    const cleanEmail = sanitizeEmailInput(raw.email, INPUT_LIMITS.EMAIL_MAX);
    if (cleanEmail) {
      if (!isValidEmailAddress(cleanEmail)) return null;
      email = cleanEmail;
    }
  }

  const isServerAccount = Boolean(raw.isServerAccount);
  if (isServerAccount && !email) {
    return null;
  }

  const displayName =
    typeof raw.displayName === 'string'
      ? sanitizeSingleLineText(raw.displayName, INPUT_LIMITS.NAME_MAX) || null
      : null;

  const photoURL =
    typeof raw.photoURL === 'string'
      ? sanitizeSafeHref(raw.photoURL) || null
      : null;

  return {
    uid,
    email,
    displayName,
    photoURL,
    emailVerified: Boolean(raw.emailVerified),
    receivePlatformUpdates:
      raw.receivePlatformUpdates !== undefined ? Boolean(raw.receivePlatformUpdates) : undefined,
    receiveBlogUpdates:
      raw.receiveBlogUpdates !== undefined ? Boolean(raw.receiveBlogUpdates) : undefined,
    isServerAccount,
  };
}

export function parseStoredAuthUser(raw: string | null): AuthSessionUser | null {
  if (!raw || typeof raw !== 'string') return null;
  if (raw.length > 8192) return null;
  try {
    const parsed = JSON.parse(raw);
    return normalizeAuthSessionUser(parsed);
  } catch {
    return null;
  }
}

export function clearStoredAuthUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {}
}

export function readStoredAuthUser(): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseStoredAuthUser(raw);
    if (!parsed) {
      clearStoredAuthUser();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredAuthUser(candidate: unknown): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  if (!candidate) {
    clearStoredAuthUser();
    return null;
  }
  const normalized = normalizeAuthSessionUser(candidate);
  if (!normalized) return null;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
  } catch {}
  return normalized;
}

export function isAuthStorageSyncEvent(event: StorageEvent): boolean {
  return event.key === AUTH_STORAGE_KEY;
}

const app = initializeApp(firebaseConfig);
/* CRITICAL: The app will break without this line */
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export type AuthPersistenceMode = 'local' | 'session' | 'memory' | 'default';

export async function ensureAuthPersistence(): Promise<{
  mode: AuthPersistenceMode;
  error: string | null;
}> {
  if (typeof window === 'undefined') {
    return { mode: 'memory', error: null };
  }

  try {
    await setPersistence(auth, browserLocalPersistence);
    return { mode: 'local', error: null };
  } catch (localErr) {
    try {
      await setPersistence(auth, browserSessionPersistence);
      return {
        mode: 'session',
        error: null,
      };
    } catch {
      try {
        await setPersistence(auth, inMemoryPersistence);
      } catch {
        // Ignore final fallback failure
      }
      return {
        mode: 'memory',
        error: formatFirebaseAuthError(
          localErr,
          'Browser storage is restricted; active sessions use memory persistence.'
        ),
      };
    }
  }
}

export const authPersistencePromise =
  typeof window !== 'undefined'
    ? ensureAuthPersistence()
    : Promise.resolve({ mode: 'memory' as AuthPersistenceMode, error: null });

// Connection validation as mandated by Firebase skill - non-blocking with graceful timeout
export async function testFirestoreConnection() {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection check timeout')), 2500)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
  } catch (error) {
    // Firestore operates in seamless offline mode if backend is unreachable or latency is high
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes('Connection check timeout')) {
      console.debug('Firestore operates in offline/local cache mode:', msg);
    }
  }
}

// Test connection on boot gracefully in background
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirestoreConnection().catch(() => {});
  }, 1000);
}

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
