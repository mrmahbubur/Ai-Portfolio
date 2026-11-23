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

export function parseStoredAuthUser(raw: string | null): AuthSessionUser | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.uid !== 'string' || !parsed.uid.trim()) return null;
    if (parsed.email !== null && parsed.email !== undefined && typeof parsed.email !== 'string') {
      return null;
    }
    return {
      uid: parsed.uid.trim().slice(0, 128),
      email: typeof parsed.email === 'string' ? parsed.email.trim().slice(0, 128) : null,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName.slice(0, 100) : null,
      photoURL: typeof parsed.photoURL === 'string' ? parsed.photoURL : null,
      emailVerified: Boolean(parsed.emailVerified),
      receivePlatformUpdates:
        parsed.receivePlatformUpdates !== undefined ? Boolean(parsed.receivePlatformUpdates) : undefined,
      receiveBlogUpdates:
        parsed.receiveBlogUpdates !== undefined ? Boolean(parsed.receiveBlogUpdates) : undefined,
      isServerAccount: Boolean(parsed.isServerAccount),
    };
  } catch {
    return null;
  }
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
