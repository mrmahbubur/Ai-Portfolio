import fs from 'fs';
import path from 'path';

export interface RemoteAssistantSyncPayload {
  syncId: string;
  timestamp: string;
  sourceAppletId: string;
  sourceUrl: string;
  targetAssistantUrl: string;
  status: 'synchronized' | 'pending' | 'standalone_active';
  sharedData: {
    portfolioOwner: string;
    ownerEmail: string;
    totalVisitorHelpCount: number;
    activeSessionId?: string;
    lastHelpQuery?: string;
    lastHelpCategory?: string;
    recentVerifiedPersonsCount: number;
    currentYear: number;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const SYNC_LOG_FILE = path.join(DATA_DIR, 'assistant_cross_sync.json');
export const CAMELLIA_ASSISTANT_URL = 'https://camellia-assistant.ai.studio/';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Builds the real-time shared data package to synchronize with https://camellia-assistant.ai.studio/
 */
export function buildRealtimeAssistantPayload(extraContext?: {
  visitorIp?: string;
  query?: string;
  category?: string;
}): RemoteAssistantSyncPayload {
  ensureDataDir();

  let helpStats = { currentCounter: 10000, totalHelpCompleted: 0 };
  try {
    const statsFile = path.join(DATA_DIR, 'visitor_help_stats.json');
    if (fs.existsSync(statsFile)) {
      helpStats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
    }
  } catch (_) {}

  let verifiedFacesCount = 0;
  try {
    const facesFile = path.join(DATA_DIR, 'verified_faces_log.json');
    if (fs.existsSync(facesFile)) {
      const faces = JSON.parse(fs.readFileSync(facesFile, 'utf-8'));
      if (Array.isArray(faces)) verifiedFacesCount = faces.length;
    }
  } catch (_) {}

  const payload: RemoteAssistantSyncPayload = {
    syncId: `SYNC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    sourceAppletId: 'a6510147-723b-4cac-bedf-157fd3baa6a1',
    sourceUrl: 'https://ais-dev-kvr65sziiqaqoqlwvajinm-369506879239.asia-southeast1.run.app',
    targetAssistantUrl: CAMELLIA_ASSISTANT_URL,
    status: 'synchronized',
    sharedData: {
      portfolioOwner: 'M R S',
      ownerEmail: 'mr216873@gmail.com',
      totalVisitorHelpCount: helpStats.totalHelpCompleted || 0,
      activeSessionId: extraContext?.visitorIp ? `sess-${Buffer.from(extraContext.visitorIp).toString('hex').slice(0, 10)}` : undefined,
      lastHelpQuery: extraContext?.query,
      lastHelpCategory: extraContext?.category,
      recentVerifiedPersonsCount: verifiedFacesCount,
      currentYear: new Date().getFullYear(),
    },
  };

  try {
    fs.writeFileSync(SYNC_LOG_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AssistantBridge] Failed to write local sync log:', err);
  }

  return payload;
}

/**
 * Dispatches real-time synchronization to the remote Camellia AI assistant backend
 */
export async function syncUserDataWithRemoteAssistant(context?: {
  visitorIp?: string;
  query?: string;
  category?: string;
}): Promise<{ success: boolean; payload: RemoteAssistantSyncPayload; remoteResponded: boolean }> {
  const payload = buildRealtimeAssistantPayload(context);

  let remoteResponded = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(`${CAMELLIA_ASSISTANT_URL}api/cross-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Origin-Applet': 'mrs-portfolio',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);
    if (response && response.ok) {
      remoteResponded = true;
    }
  } catch (err) {
    // If remote service is sleeping or network restricted, fallback state is preserved locally
  }

  return {
    success: true,
    payload,
    remoteResponded,
  };
}

/**
 * Returns the current live sync status between this site and https://camellia-assistant.ai.studio/
 */
export function getAssistantSyncStatus(): {
  targetAssistantUrl: string;
  isLinked: boolean;
  lastSync: RemoteAssistantSyncPayload | null;
} {
  ensureDataDir();
  let lastSync: RemoteAssistantSyncPayload | null = null;
  try {
    if (fs.existsSync(SYNC_LOG_FILE)) {
      lastSync = JSON.parse(fs.readFileSync(SYNC_LOG_FILE, 'utf-8'));
    }
  } catch (_) {}

  return {
    targetAssistantUrl: CAMELLIA_ASSISTANT_URL,
    isLinked: true,
    lastSync,
  };
}

/**
 * Builds the comprehensive shared knowledge and live backend state across both sites
 */
export function getFullSharedBackendState(cachedProfile?: any): Record<string, any> {
  ensureDataDir();

  let helpStats = {};
  try {
    const statsFile = path.join(DATA_DIR, 'visitor_help_stats.json');
    if (fs.existsSync(statsFile)) {
      helpStats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'));
    }
  } catch (_) {}

  let verifiedFacesCount = 0;
  try {
    const facesFile = path.join(DATA_DIR, 'verified_faces_log.json');
    if (fs.existsSync(facesFile)) {
      const faces = JSON.parse(fs.readFileSync(facesFile, 'utf-8'));
      if (Array.isArray(faces)) verifiedFacesCount = faces.length;
    }
  } catch (_) {}

  return {
    success: true,
    targetAssistantUrl: CAMELLIA_ASSISTANT_URL,
    syncedAt: new Date().toISOString(),
    profile: {
      ownerName: cachedProfile?.ownerName || 'M R S',
      fullName: cachedProfile?.personalDetails?.fullName || 'MAHBUBUR RAHMAN SHAHIN',
      displayName: cachedProfile?.displayName || 'M R S',
      roleTitle: cachedProfile?.roleTitle || 'Certified IT Support Professional & Web Manager',
      location: cachedProfile?.location || 'Global / Remote',
      email: cachedProfile?.socials?.email || 'mr216873@gmail.com',
      phone: cachedProfile?.socials?.phone || '+880 961 105 6361',
      linkedinUrl: cachedProfile?.socials?.linkedinUrl || 'https://www.linkedin.com/in/mrmahbubur',
      gravatarUrl: cachedProfile?.socials?.gravatarUrl || 'https://gravatar.com/mrxshahin',
      skills: cachedProfile?.skillsList || [
        'IT Troubleshooting (Windows, Android, WiFi)',
        'Document Management & Professional Formatting',
        'Microsoft Office 365 Administration',
        'Remote Client & Systems Support',
        'Web Management & Digital Operations',
      ],
      projects: cachedProfile?.projects || [],
      verifiedAccounts: cachedProfile?.verifiedAccounts || [],
    },
    analytics: {
      helpStats,
      verifiedFacesCount,
      annualGovernanceYear: new Date().getFullYear(),
    },
  };
}
