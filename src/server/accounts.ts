import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserAccountRecord {
  uid: string;
  email: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
  receivePlatformUpdates: boolean;
  receiveBlogUpdates: boolean;
  emailVerified: boolean;
}

export interface PublicUserAccount {
  uid: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  receivePlatformUpdates: boolean;
  receiveBlogUpdates: boolean;
  emailVerified: boolean;
}

export interface AccountSuccessResult {
  success: true;
  user: PublicUserAccount;
  error?: undefined;
}

export interface AccountErrorResult {
  success: false;
  error: string;
  user?: undefined;
}

export type AccountResult = AccountSuccessResult | AccountErrorResult;

const ACCOUNTS_FILE = path.join(process.cwd(), 'data', 'accounts.json');

let accountsCache: UserAccountRecord[] = [];

// Initialize data directory and load existing accounts
function ensureAccountsFile() {
  try {
    const dataDir = path.dirname(ACCOUNTS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(ACCOUNTS_FILE)) {
      const content = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
      accountsCache = JSON.parse(content);
    } else {
      accountsCache = [];
      fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Accounts] Could not read accounts.json, using in-memory cache:', err);
  }
}

ensureAccountsFile();

function persistAccounts() {
  try {
    const dataDir = path.dirname(ACCOUNTS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accountsCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Accounts] Failed to write accounts.json to disk:', err);
  }
}

// Password hashing helper
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computedHash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
}

export function toPublicUser(account: UserAccountRecord): PublicUserAccount {
  return {
    uid: account.uid,
    email: account.email,
    displayName: account.displayName,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
    receivePlatformUpdates: account.receivePlatformUpdates,
    receiveBlogUpdates: account.receiveBlogUpdates,
    emailVerified: account.emailVerified,
  };
}

export function findAccountByEmail(email: string): UserAccountRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return accountsCache.find((acc) => acc.email.toLowerCase() === normalized);
}

export function findAccountByUid(uid: string): UserAccountRecord | undefined {
  return accountsCache.find((acc) => acc.uid === uid);
}

export function createAccount(params: {
  email: string;
  password: string;
  displayName?: string;
  receivePlatformUpdates?: boolean;
  receiveBlogUpdates?: boolean;
}): AccountResult {
  const normalizedEmail = params.email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { success: false, error: 'A valid email address is required.' };
  }

  if (!params.password || params.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' };
  }

  if (findAccountByEmail(normalizedEmail)) {
    return { success: false, error: 'An account with this email address already exists. Please sign in instead.' };
  }

  const { hash, salt } = hashPassword(params.password);
  const uid = 'usr_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();

  const newAccount: UserAccountRecord = {
    uid,
    email: normalizedEmail,
    displayName: (params.displayName && params.displayName.trim()) || normalizedEmail.split('@')[0],
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now,
    receivePlatformUpdates: params.receivePlatformUpdates ?? true,
    receiveBlogUpdates: params.receiveBlogUpdates ?? true,
    emailVerified: false,
  };

  accountsCache.push(newAccount);
  persistAccounts();

  return { success: true, user: toPublicUser(newAccount) };
}

export function authenticateAccount(
  email: string,
  password: string
): AccountResult {
  const normalizedEmail = email.trim().toLowerCase();
  const account = findAccountByEmail(normalizedEmail);

  if (!account) {
    return {
      success: false,
      error: 'Invalid email or password. If you have not created an account yet, please switch to Sign Up.',
    };
  }

  const isValid = verifyPassword(password, account.passwordHash, account.passwordSalt);
  if (!isValid) {
    return {
      success: false,
      error: 'Invalid email or password. Please verify your password or reset it.',
    };
  }

  return { success: true, user: toPublicUser(account) };
}

export function updateAccountProfile(
  uid: string,
  updates: {
    displayName?: string;
    receivePlatformUpdates?: boolean;
    receiveBlogUpdates?: boolean;
  }
): AccountResult {
  const account = findAccountByUid(uid);
  if (!account) {
    return { success: false, error: 'User account not found.' };
  }

  if (updates.displayName !== undefined) {
    account.displayName = updates.displayName.trim() || account.displayName;
  }
  if (updates.receivePlatformUpdates !== undefined) {
    account.receivePlatformUpdates = updates.receivePlatformUpdates;
  }
  if (updates.receiveBlogUpdates !== undefined) {
    account.receiveBlogUpdates = updates.receiveBlogUpdates;
  }
  account.updatedAt = new Date().toISOString();

  persistAccounts();
  return { success: true, user: toPublicUser(account) };
}

export function getAllAccountsCount(): number {
  return accountsCache.length;
}
