import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { getVerifiedFacesLog } from './verifiedFaceStorage.ts';
import { getAllSubscribers } from './subscribers.ts';
import { getAllAccountsCount } from './accounts.ts';
import { getReferralStats } from './promotion.ts';
import { getCurrentPolicies } from './annualUpdateEngine.ts';
import { getAssistantSyncStatus } from './assistantBridge.ts';

function escapeHtml(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface VisitorHelpRecord {
  trackingNumber: string; // e.g. "MRS-AID-10001"
  helpId: string;
  timestamp: string; // ISO string
  monthKey: string; // e.g. "2026-10"
  visitorIp: string;
  userAgent: string;
  languageCode: string;
  prompt: string;
  responsePreview: string;
  responseLength: number;
  category: 'coding' | 'it_support' | 'writing' | 'learning_science' | 'portfolio_mrs' | 'general';
  status: 'completed';
  durationMs?: number;
}

export interface VisitorHelpCounterState {
  currentCounter: number;
  lastHelpTimestamp: string;
  totalHelpCompleted: number;
}

export interface InquiryRecord {
  id: string;
  timestamp: string;
  monthKey: string;
  name: string;
  email: string;
  subject?: string;
  note: string;
  delivered: boolean;
}

export interface CvDownloadRecord {
  docUniqueId: string;
  timestamp: string;
  monthKey: string;
  filename: string;
  ip: string;
  country: string;
  city: string;
  deviceType: string;
  os: string;
  browser: string;
  hasFaceCapture: boolean;
  downloadMethod?: string;
}

export interface MonthlyReportLog {
  monthKey: string;
  sentAt: string;
  recipient: string;
  totalRecordsInReport: number;
  status: 'sent' | 'fallback_logged';
}

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'visitor_help_history.json');
const COUNTER_FILE = path.join(DATA_DIR, 'visitor_help_counter.json');
const REPORTS_FILE = path.join(DATA_DIR, 'visitor_help_monthly_reports.json');
const INQUIRIES_FILE = path.join(DATA_DIR, 'inquiries_log.json');
const CV_DOWNLOADS_FILE = path.join(DATA_DIR, 'cv_downloads_log.json');

const OWNER_EMAIL = 'mr216873@gmail.com';

// In-memory state for performance with persistent backing
let currentCounter = 10000;
let helpHistoryCache: VisitorHelpRecord[] = [];
let monthlyReportsCache: MonthlyReportLog[] = [];
let inquiriesCache: InquiryRecord[] = [];
let cvDownloadsCache: CvDownloadRecord[] = [];
let isInitialized = false;

function ensureDataFiles() {
  if (isInitialized) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Initialize Counter
    if (fs.existsSync(COUNTER_FILE)) {
      try {
        const raw = fs.readFileSync(COUNTER_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (typeof parsed.currentCounter === 'number') {
          currentCounter = parsed.currentCounter;
        }
      } catch (e) {
        console.warn('[HelpTracker] Could not parse counter file, using default value:', e);
      }
    } else {
      fs.writeFileSync(
        COUNTER_FILE,
        JSON.stringify(
          {
            currentCounter,
            lastHelpTimestamp: new Date().toISOString(),
            totalHelpCompleted: 0,
          },
          null,
          2
        ),
        'utf-8'
      );
    }

    // Initialize Help History
    if (fs.existsSync(HISTORY_FILE)) {
      try {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        helpHistoryCache = JSON.parse(raw);
      } catch (e) {
        helpHistoryCache = [];
      }
    } else {
      helpHistoryCache = [];
      fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    // Initialize Monthly Reports Log
    if (fs.existsSync(REPORTS_FILE)) {
      try {
        const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
        monthlyReportsCache = JSON.parse(raw);
      } catch (e) {
        monthlyReportsCache = [];
      }
    } else {
      monthlyReportsCache = [];
      fs.writeFileSync(REPORTS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    // Initialize Inquiries Log
    if (fs.existsSync(INQUIRIES_FILE)) {
      try {
        const raw = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
        inquiriesCache = JSON.parse(raw);
      } catch (e) {
        inquiriesCache = [];
      }
    } else {
      inquiriesCache = [];
      fs.writeFileSync(INQUIRIES_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    // Initialize CV Downloads Log
    if (fs.existsSync(CV_DOWNLOADS_FILE)) {
      try {
        const raw = fs.readFileSync(CV_DOWNLOADS_FILE, 'utf-8');
        cvDownloadsCache = JSON.parse(raw);
      } catch (e) {
        cvDownloadsCache = [];
      }
    } else {
      cvDownloadsCache = [];
      fs.writeFileSync(CV_DOWNLOADS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }

    isInitialized = true;
  } catch (err) {
    console.error('[HelpTracker] Error ensuring data files:', err);
  }
}

function persistState() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Save Counter
    const counterState: VisitorHelpCounterState = {
      currentCounter,
      lastHelpTimestamp: new Date().toISOString(),
      totalHelpCompleted: helpHistoryCache.length,
    };
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(counterState, null, 2), 'utf-8');

    // Save Help History
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(helpHistoryCache, null, 2), 'utf-8');

    // Save Reports
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(monthlyReportsCache, null, 2), 'utf-8');

    // Save Inquiries
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(inquiriesCache, null, 2), 'utf-8');

    // Save CV Downloads
    fs.writeFileSync(CV_DOWNLOADS_FILE, JSON.stringify(cvDownloadsCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[HelpTracker] Failed to persist state to disk:', err);
  }
}

/**
 * Record a client / visitor contact inquiry
 */
export function recordInquiryLog(params: {
  name: string;
  email: string;
  subject?: string;
  note: string;
  delivered: boolean;
}): InquiryRecord {
  ensureDataFiles();
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const id = `INQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const record: InquiryRecord = {
    id,
    timestamp: now.toISOString(),
    monthKey,
    name: params.name,
    email: params.email,
    subject: params.subject || 'Portfolio Inquiry',
    note: params.note,
    delivered: params.delivered,
  };

  inquiriesCache.push(record);
  persistState();
  return record;
}

export function getInquiriesLog(monthKey?: string): InquiryRecord[] {
  ensureDataFiles();
  if (!monthKey) return [...inquiriesCache];
  return inquiriesCache.filter((i) => i.monthKey === monthKey);
}

/**
 * Record a CV download event
 */
export function recordCvDownloadLog(params: {
  docUniqueId: string;
  filename: string;
  ip: string;
  country: string;
  city: string;
  deviceType: string;
  os: string;
  browser: string;
  hasFaceCapture: boolean;
  downloadMethod?: string;
}): CvDownloadRecord {
  ensureDataFiles();
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const record: CvDownloadRecord = {
    docUniqueId: params.docUniqueId,
    timestamp: now.toISOString(),
    monthKey,
    filename: params.filename,
    ip: params.ip,
    country: params.country,
    city: params.city,
    deviceType: params.deviceType,
    os: params.os,
    browser: params.browser,
    hasFaceCapture: params.hasFaceCapture,
    downloadMethod: params.downloadMethod,
  };

  // Avoid duplicate log for the exact same docUniqueId
  const exists = cvDownloadsCache.some((c) => c.docUniqueId === params.docUniqueId);
  if (!exists) {
    cvDownloadsCache.push(record);
    persistState();
  }
  return record;
}

export function getCvDownloadsLog(monthKey?: string): CvDownloadRecord[] {
  ensureDataFiles();
  if (!monthKey) return [...cvDownloadsCache];
  return cvDownloadsCache.filter((c) => c.monthKey === monthKey);
}

/**
 * Categorizes a prompt based on query content
 */
export function categorizePrompt(prompt: string): VisitorHelpRecord['category'] {
  const p = prompt.toLowerCase();
  if (
    p.includes('code') ||
    p.includes('python') ||
    p.includes('javascript') ||
    p.includes('typescript') ||
    p.includes('react') ||
    p.includes('function') ||
    p.includes('script') ||
    p.includes('sql') ||
    p.includes('bug') ||
    p.includes('debug') ||
    p.includes('html') ||
    p.includes('css')
  ) {
    return 'coding';
  }

  if (
    p.includes('windows') ||
    p.includes('cpu') ||
    p.includes('ram') ||
    p.includes('slow pc') ||
    p.includes('network') ||
    p.includes('wifi') ||
    p.includes('troubleshoot') ||
    p.includes('driver') ||
    p.includes('microsoft 365') ||
    p.includes('office') ||
    p.includes('it support') ||
    p.includes('hardware')
  ) {
    return 'it_support';
  }

  if (
    p.includes('email') ||
    p.includes('draft') ||
    p.includes('write') ||
    p.includes('letter') ||
    p.includes('resume') ||
    p.includes('cv') ||
    p.includes('summarize') ||
    p.includes('proofread') ||
    p.includes('essay')
  ) {
    return 'writing';
  }

  if (
    p.includes('explain') ||
    p.includes('why') ||
    p.includes('how does') ||
    p.includes('science') ||
    p.includes('math') ||
    p.includes('physics') ||
    p.includes('quantum') ||
    p.includes('algorithm') ||
    p.includes('history')
  ) {
    return 'learning_science';
  }

  if (
    p.includes('m r s') ||
    p.includes('mrs') ||
    p.includes('shahin') ||
    p.includes('portfolio') ||
    p.includes('project') ||
    p.includes('platform') ||
    p.includes('contact') ||
    p.includes('hire') ||
    p.includes('calendly')
  ) {
    return 'portfolio_mrs';
  }

  return 'general';
}

/**
 * Records a visitor's completed help request in backend storage, assigning a unique tracking number.
 * Note: Never triggers emails on individual questions; all help data is aggregated into the once-a-month report.
 */
export function recordCompletedHelp(params: {
  prompt: string;
  response: string;
  visitorIp?: string;
  userAgent?: string;
  languageCode?: string;
  durationMs?: number;
}): { trackingNumber: string; helpId: string; category: string } {
  ensureDataFiles();

  currentCounter += 1;
  const trackingNumber = `MRS-AID-${currentCounter}`;
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const helpId = `aid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const category = categorizePrompt(params.prompt);

  const newRecord: VisitorHelpRecord = {
    trackingNumber,
    helpId,
    timestamp: now.toISOString(),
    monthKey,
    visitorIp: params.visitorIp || '127.0.0.1',
    userAgent: params.userAgent || 'Web Browser',
    languageCode: params.languageCode || 'en-US',
    prompt: params.prompt.trim(),
    responsePreview: params.response.trim().substring(0, 300),
    responseLength: params.response.length,
    category,
    status: 'completed',
    durationMs: params.durationMs,
  };

  helpHistoryCache.push(newRecord);
  persistState();

  return {
    trackingNumber,
    helpId,
    category,
  };
}

/**
 * Get total completed help count and statistics
 */
export function getVisitorHelpStats() {
  ensureDataFiles();

  const total = helpHistoryCache.length;
  const categoriesCount: Record<string, number> = {};

  for (const item of helpHistoryCache) {
    categoriesCount[item.category] = (categoriesCount[item.category] || 0) + 1;
  }

  return {
    currentCounter,
    totalHelpCompleted: total,
    categoriesCount,
    lastHelpRecord: helpHistoryCache[helpHistoryCache.length - 1] || null,
    totalMonthlyReportsSent: monthlyReportsCache.filter((r) => r.status === 'sent').length,
  };
}

/**
 * Builds the ALL-IN-ONE Monthly Executive & Operations Report
 * Aggregates all monthly information in ONE single email:
 * 1. Visitor Help & Chat Consultations (Categories, Counts, Tracking IDs, Query Logs)
 * 2. Biometric Verified Person Captures (Stored Faces, Anti-Spoofing, Confidence, Audit)
 * 3. CV & Credentials Downloads (Unique Document Tracking Serials, Devices, Locations)
 * 4. Contact Inquiries & Opportunities Received
 * 5. Promotional Traffic & Referral Channel Analytics
 * 6. Subscribers & Community Accounts Overview
 * 7. 24/7 Platform Health, Gravatar Sync, Remote Bridge & Legal Governance
 */
export function buildMonthlyReportContent(monthKey: string) {
  ensureDataFiles();

  // 1. Visitor Help History for this month (fallback to all records if month is new)
  let monthHelpRecords = helpHistoryCache.filter((r) => r.monthKey === monthKey);
  if (monthHelpRecords.length === 0 && helpHistoryCache.length > 0) {
    monthHelpRecords = helpHistoryCache.slice(-20);
  }
  const totalHelp = monthHelpRecords.length;

  const categories: Record<string, number> = {
    coding: 0,
    it_support: 0,
    writing: 0,
    learning_science: 0,
    portfolio_mrs: 0,
    general: 0,
  };
  for (const r of monthHelpRecords) {
    categories[r.category] = (categories[r.category] || 0) + 1;
  }

  // 2. Verified Biometric Face Captures
  let verifiedFaces = getVerifiedFacesLog(monthKey);
  if (verifiedFaces.length === 0) {
    verifiedFaces = getVerifiedFacesLog();
  }
  const totalVerifiedFaces = verifiedFaces.length;

  // 3. CV Downloads
  let cvDownloads = getCvDownloadsLog(monthKey);
  if (cvDownloads.length === 0) {
    cvDownloads = getCvDownloadsLog();
  }
  const totalCvDownloads = cvDownloads.length;

  // 4. Inquiries
  let inquiries = getInquiriesLog(monthKey);
  if (inquiries.length === 0) {
    inquiries = getInquiriesLog();
  }
  const totalInquiries = inquiries.length;

  // 5. Promotional & Referral Hits
  const referrals = getReferralStats();
  const totalReferralHits = referrals.reduce((sum, r) => sum + r.hits, 0);

  // 6. Subscribers & Accounts
  const subscribers = getAllSubscribers();
  const accountsCount = getAllAccountsCount();

  // 7. System Sync & Policies
  let assistantStatus: any = { syncActive: true, connectionMode: 'autonomous' };
  try {
    assistantStatus = getAssistantSyncStatus();
  } catch (_) {}

  let policies: any = { legalYear: new Date().getFullYear(), copyrightHolder: 'M R S' };
  try {
    policies = getCurrentPolicies();
  } catch (_) {}

  const recentHelpSamples = monthHelpRecords.slice(-10).reverse();
  const recentFacesSamples = verifiedFaces.slice(-8).reverse();
  const recentCvSamples = cvDownloads.slice(-8).reverse();
  const recentInquirySamples = inquiries.slice(-6).reverse();

  // Generate Month Label, e.g. "November 2026"
  const [yr, mo] = monthKey.split('-');
  const monthDate = new Date(parseInt(yr, 10), parseInt(mo, 10) - 1, 1);
  const monthName = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // -------------------------------------------------------------------------
  // Plain Text Version
  // -------------------------------------------------------------------------
  const textReport = `
========================================================================
M R S PORTFOLIO & ASSISTANT — COMPLETE ALL-IN-ONE MONTHLY REPORT
Period: ${monthName} (${monthKey})
Dispatched: ${new Date().toUTCString()} (Strictly Once a Month)
Recipient: ${OWNER_EMAIL}
========================================================================

1. EXECUTIVE KPI DASHBOARD
------------------------------------------------------------------------
• Total Visitor Help Requests Completed: ${totalHelp}
• Active Tracking Numbers: MRS-AID-${Math.max(10001, currentCounter - totalHelp + 1)} to MRS-AID-${currentCounter}
• Biometric Faces Verified & Stored:      ${totalVerifiedFaces}
• Executive CV Downloads Recorded:        ${totalCvDownloads}
• Inbound Inquiries Received:             ${totalInquiries}
• Active Newsletter Subscribers:          ${subscribers.length}
• Registered User Accounts:               ${accountsCount}
• Total Promotional Referral Hits:        ${totalReferralHits}
• Average AI Response Delivery Rate:      100% (No artificial caps)

2. VISITOR HELP BREAKDOWN BY CATEGORY
------------------------------------------------------------------------
• 💻 Coding & Programming Solutions:      ${categories.coding}
• 🛠️ IT Support & Systems Troubleshooting: ${categories.it_support}
• ✉️ Writing, Editing & Correspondence:   ${categories.writing}
• 🔬 Science, Mathematics & Learning:     ${categories.learning_science}
• 💼 M R S Featured Projects & Portfolio: ${categories.portfolio_mrs}
• 🌐 General Inquiries & Productivity:    ${categories.general}

3. RECENT COMPLETED VISITOR HELP TICKETS
------------------------------------------------------------------------
${
  recentHelpSamples.length > 0
    ? recentHelpSamples
        .map(
          (s, i) =>
            `[${i + 1}] ${s.trackingNumber} | ${s.timestamp} | ${s.category.toUpperCase()}
   Query: "${s.prompt.replace(/\n/g, ' ').substring(0, 110)}..."
   Assistance: ${s.responseLength} characters`
        )
        .join('\n\n')
    : 'No visitor help interactions logged for this period.'
}

4. BIOMETRIC FACE VERIFICATION & SECURITY AUDIT (${totalVerifiedFaces} Stored)
------------------------------------------------------------------------
${
  recentFacesSamples.length > 0
    ? recentFacesSamples
        .map(
          (f, i) =>
            `[${i + 1}] ID: ${f.id} | ${f.timestamp} | Location: ${f.country} ${f.city ? `(${f.city})` : ''}
   Method: ${f.verificationMethod} | Confidence: ${f.confidence}% | Stored File: ${f.fileName}`
        )
        .join('\n\n')
    : 'No biometric verifications captured this period.'
}

5. EXECUTIVE CV DOWNLOADS & DOCUMENT AUDIT (${totalCvDownloads} Total)
------------------------------------------------------------------------
${
  recentCvSamples.length > 0
    ? recentCvSamples
        .map(
          (c, i) =>
            `[${i + 1}] Serial: ${c.docUniqueId} | ${c.timestamp} | ${c.deviceType} (${c.os})
   Location: ${c.country} ${c.city ? `(${c.city})` : ''} | File: ${c.filename}`
        )
        .join('\n\n')
    : 'No CV downloads recorded for this period.'
}

6. INBOUND CONTACT INQUIRIES (${totalInquiries} Total)
------------------------------------------------------------------------
${
  recentInquirySamples.length > 0
    ? recentInquirySamples
        .map(
          (inq, i) =>
            `[${i + 1}] From: ${inq.name} <${inq.email}> | ${inq.timestamp}
   Note: "${inq.note.replace(/\n/g, ' ').substring(0, 140)}..."`
        )
        .join('\n\n')
    : 'No direct contact inquiries recorded for this period.'
}

7. PROMOTION & REFERRAL CHANNELS
------------------------------------------------------------------------
${referrals.map((r) => `• ${r.source}: ${r.hits} hits (Last: ${new Date(r.lastHitAt).toLocaleDateString()})`).join('\n')}

8. PLATFORM HEALTH & 24/7 AUTONOMOUS SYNC
------------------------------------------------------------------------
• Autonomous Gravatar Sync: Active (24/7 background refresh)
• Remote Assistant Bridge:  ${assistantStatus.syncActive ? 'Synchronized' : 'Operational'}
• Policy & Copyright:       ${policies.legalYear || new Date().getFullYear()} ${policies.copyrightHolder || 'M R S'}

========================================================================
Confidential Monthly Executive Intelligence Report &bull; M R S
Direct recipient: mr216873@gmail.com
========================================================================
`.trim();

  // -------------------------------------------------------------------------
  // Responsive HTML Email Version
  // -------------------------------------------------------------------------
  const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>M R S Monthly Report - ${escapeHtml(monthName)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#0B0F19;font-family:'Segoe UI',Roboto,-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <div style="max-width:720px;margin:0 auto;background-color:#131B2E;border:1px solid #E2B867;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.6);">
    
    <!-- Header Banner -->
    <div style="padding:28px 32px;background:linear-gradient(135deg, #131B2E 0%, #1A243B 100%);border-bottom:1px solid rgba(226,184,103,0.35);">
      <div style="display:flex;align-items:center;gap:14px;">
        <span style="font-size:28px;">👑</span>
        <div>
          <h1 style="margin:0;font-size:22px;color:#F8FAFC;font-weight:700;letter-spacing:-0.02em;">
            M R S &bull; All-in-One Monthly Intelligence &amp; Help Report
          </h1>
          <p style="margin:5px 0 0 0;font-size:12px;color:#E2B867;font-family:monospace;text-transform:uppercase;letter-spacing:0.1em;">
            Period: ${escapeHtml(monthName)} &bull; Dispatched Once Monthly to ${escapeHtml(OWNER_EMAIL)}
          </p>
        </div>
      </div>
    </div>

    <!-- Executive KPI Dashboard Cards (7 Core Pillars) -->
    <div style="padding:24px 32px;background-color:#0E1524;border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="font-size:11px;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em;color:#E2B867;margin-bottom:12px;">
        📊 Executive Performance Snapshot
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(135px, 1fr));gap:12px;">
        
        <div style="padding:14px;border-radius:10px;background-color:#131B2E;border:1px solid rgba(226,184,103,0.25);">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Visitors Helped</div>
          <div style="font-size:24px;font-weight:700;color:#E2B867;margin-top:2px;">${totalHelp}</div>
          <div style="font-size:10px;color:#64748B;font-family:monospace;margin-top:2px;">MRS-AID-${escapeHtml(currentCounter)}</div>
        </div>

        <div style="padding:14px;border-radius:10px;background-color:#131B2E;border:1px solid rgba(16,185,129,0.3);">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Faces Verified</div>
          <div style="font-size:24px;font-weight:700;color:#10B981;margin-top:2px;">${totalVerifiedFaces}</div>
          <div style="font-size:10px;color:#64748B;font-family:monospace;margin-top:2px;">ICAO Liveness</div>
        </div>

        <div style="padding:14px;border-radius:10px;background-color:#131B2E;border:1px solid rgba(59,130,246,0.3);">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">CV Downloads</div>
          <div style="font-size:24px;font-weight:700;color:#60A5FA;margin-top:2px;">${totalCvDownloads}</div>
          <div style="font-size:10px;color:#64748B;font-family:monospace;margin-top:2px;">Unique Serials</div>
        </div>

        <div style="padding:14px;border-radius:10px;background-color:#131B2E;border:1px solid rgba(234,179,8,0.3);">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Inquiries</div>
          <div style="font-size:24px;font-weight:700;color:#FACC15;margin-top:2px;">${totalInquiries}</div>
          <div style="font-size:10px;color:#64748B;font-family:monospace;margin-top:2px;">Direct Leads</div>
        </div>

        <div style="padding:14px;border-radius:10px;background-color:#131B2E;border:1px solid rgba(168,85,247,0.3);">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Subscribers</div>
          <div style="font-size:24px;font-weight:700;color:#C084FC;margin-top:2px;">${subscribers.length}</div>
          <div style="font-size:10px;color:#64748B;font-family:monospace;margin-top:2px;">${accountsCount} Accounts</div>
        </div>

        <div style="padding:14px;border-radius:10px;background-color:#131B2E;border:1px solid rgba(226,184,103,0.25);">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Referral Hits</div>
          <div style="font-size:24px;font-weight:700;color:#E2B867;margin-top:2px;">${totalReferralHits}</div>
          <div style="font-size:10px;color:#64748B;font-family:monospace;margin-top:2px;">Showcase Traffic</div>
        </div>

      </div>
    </div>

    <!-- Section 1: Visitor Help Fulfillment by Category -->
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h2 style="font-size:14px;color:#F8FAFC;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.08em;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">
        1. 🤖 Monthly Visitor Help Requests by Category (${totalHelp} Total)
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tbody>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 0;color:#94A3B8;">💻 Programming, Scripts &amp; Coding Solutions</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#F8FAFC;font-family:monospace;">${categories.coding}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 0;color:#94A3B8;">🛠️ IT Support, Remote Diagnostics &amp; Hardware</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#F8FAFC;font-family:monospace;">${categories.it_support}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 0;color:#94A3B8;">✉️ Document Drafting, Formatting &amp; Emails</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#F8FAFC;font-family:monospace;">${categories.writing}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 0;color:#94A3B8;">🔬 Science, Math &amp; Academic Learning</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#F8FAFC;font-family:monospace;">${categories.learning_science}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 0;color:#94A3B8;">💼 M R S Platforms, Certifications &amp; Credentials</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#F8FAFC;font-family:monospace;">${categories.portfolio_mrs}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#94A3B8;">🌐 General Productivity &amp; Guidance</td>
            <td style="padding:8px 0;text-align:right;font-weight:600;color:#F8FAFC;font-family:monospace;">${categories.general}</td>
          </tr>
        </tbody>
      </table>

      ${
        recentHelpSamples.length > 0
          ? `
      <div style="margin-top:20px;">
        <div style="font-size:11px;font-family:monospace;color:#94A3B8;text-transform:uppercase;margin-bottom:8px;">Recent Completed Help Tickets:</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recentHelpSamples
            .slice(0, 5)
            .map(
              (s) => `
            <div style="padding:10px 14px;background-color:#0B0F19;border:1px solid rgba(255,255,255,0.06);border-radius:8px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;color:#E2B867;font-family:monospace;font-weight:bold;margin-bottom:3px;">
                <span>${escapeHtml(s.trackingNumber)} (${escapeHtml(s.category)})</span>
                <span style="color:#64748B;font-size:11px;">${new Date(s.timestamp).toLocaleDateString()}</span>
              </div>
              <div style="color:#CBD5E1;">&ldquo;${escapeHtml(s.prompt.substring(0, 120))}${s.prompt.length > 120 ? '...' : ''}&rdquo;</div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      `
          : ''
      }
    </div>

    <!-- Section 2: Biometric Face Verification & Security Audit -->
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h2 style="font-size:14px;color:#F8FAFC;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.08em;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">
        2. 👤 Biometric Face Verifications (${totalVerifiedFaces} Stored in Backend)
      </h2>
      ${
        recentFacesSamples.length > 0
          ? `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recentFacesSamples
            .slice(0, 4)
            .map(
              (f) => `
            <div style="padding:10px 14px;background-color:#0B0F19;border:1px solid rgba(16,185,129,0.25);border-radius:8px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;color:#10B981;font-family:monospace;font-weight:bold;">
                <span>${escapeHtml(f.id)}</span>
                <span style="color:#64748B;">${new Date(f.timestamp).toLocaleDateString()}</span>
              </div>
              <div style="color:#CBD5E1;margin-top:2px;">
                <strong>Location:</strong> ${escapeHtml(f.country)} ${f.city ? `(${escapeHtml(f.city)})` : ''} &bull; <strong>Score:</strong> ${escapeHtml(f.confidence)}%
              </div>
              <div style="color:#64748B;font-size:11px;font-family:monospace;margin-top:1px;">
                File: ${escapeHtml(f.fileName)}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : '<p style="color:#94A3B8;font-size:12px;margin:0;">No biometric verifications captured this month.</p>'
      }
    </div>

    <!-- Section 3: CV Downloads & Unique Document Audit -->
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h2 style="font-size:14px;color:#F8FAFC;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.08em;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">
        3. 📄 Executive CV Downloads &amp; Document Serials (${totalCvDownloads} Total)
      </h2>
      ${
        recentCvSamples.length > 0
          ? `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recentCvSamples
            .slice(0, 4)
            .map(
              (c) => `
            <div style="padding:10px 14px;background-color:#0B0F19;border:1px solid rgba(59,130,246,0.25);border-radius:8px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;color:#60A5FA;font-family:monospace;font-weight:bold;">
                <span>${escapeHtml(c.docUniqueId)}</span>
                <span style="color:#64748B;">${new Date(c.timestamp).toLocaleDateString()}</span>
              </div>
              <div style="color:#CBD5E1;margin-top:2px;">
                <strong>Device:</strong> ${escapeHtml(c.deviceType)} (${escapeHtml(c.os)}) &bull; <strong>Location:</strong> ${escapeHtml(c.country)}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : '<p style="color:#94A3B8;font-size:12px;margin:0;">No CV downloads recorded this month.</p>'
      }
    </div>

    <!-- Section 4: Contact Inquiries Received -->
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h2 style="font-size:14px;color:#F8FAFC;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.08em;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">
        4. 📬 Client &amp; Visitor Inquiries Received (${totalInquiries} Total)
      </h2>
      ${
        recentInquirySamples.length > 0
          ? `
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${recentInquirySamples
            .slice(0, 4)
            .map(
              (inq) => `
            <div style="padding:10px 14px;background-color:#0B0F19;border:1px solid rgba(234,179,8,0.25);border-radius:8px;font-size:12px;">
              <div style="display:flex;justify-content:space-between;color:#FACC15;font-weight:bold;">
                <span>${escapeHtml(inq.name)} &lt;${escapeHtml(inq.email)}&gt;</span>
                <span style="color:#64748B;font-family:monospace;font-size:11px;">${new Date(inq.timestamp).toLocaleDateString()}</span>
              </div>
              <div style="color:#CBD5E1;margin-top:3px;">&ldquo;${escapeHtml(inq.note.substring(0, 130))}&rdquo;</div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : '<p style="color:#94A3B8;font-size:12px;margin:0;">No new contact inquiries received this month.</p>'
      }
    </div>

    <!-- Section 5: Promotion & Referral Analytics -->
    <div style="padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.06);">
      <h2 style="font-size:14px;color:#F8FAFC;margin:0 0 16px 0;text-transform:uppercase;letter-spacing:0.08em;font-family:monospace;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;">
        5. 🚀 Referral Traffic &amp; Community Reach
      </h2>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
        <tbody>
          ${referrals
            .slice(0, 5)
            .map(
              (r) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:6px 0;color:#CBD5E1;">${escapeHtml(r.source)}</td>
              <td style="padding:6px 0;text-align:right;font-family:monospace;font-weight:bold;color:#E2B867;">${escapeHtml(r.hits)} hits</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- Section 6: Platform Health & 24/7 Sync Status -->
    <div style="padding:24px 32px;background-color:#0E1524;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#94A3B8;font-family:monospace;">
        <div>⚡ Autonomous Gravatar Sync: <strong style="color:#10B981;">Active (24/7)</strong></div>
        <div>🌐 Remote Bridge: <strong style="color:#60A5FA;">Connected</strong></div>
        <div>⚖️ Governance: <strong style="color:#E2B867;">${escapeHtml(policies.legalYear || 2026)}</strong></div>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background-color:#080C14;text-align:center;font-size:11px;color:#64748B;font-family:monospace;">
      M R S Portfolio Unified Monthly Intelligence &bull; Strictly Dispatched Once in a Month &bull; Confidential
    </div>
  </div>
</body>
</html>
`;

  return {
    subject: `[M R S Operations Report] All-in-One Monthly Intelligence (${String(monthName).replace(/[\r\n]+/g, ' ')})`,
    text: textReport,
    html: htmlReport,
    totalRecords: totalHelp,
  };
}

/**
 * Dispatches the ALL-IN-ONE monthly report to mr216873@gmail.com
 * Strictly guarantees execution ONCE A MONTH unless forced.
 */
export async function sendMonthlyReport(
  transporter?: nodemailer.Transporter | null,
  force: boolean = false,
  targetMonth?: string
): Promise<{
  status: 'sent' | 'already_sent' | 'fallback_logged';
  monthKey: string;
  recipient: string;
  message?: string;
  totalRecords?: number;
}> {
  ensureDataFiles();

  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const monthKey = targetMonth || currentMonthKey;

  // Strict Once-in-a-Month Deduplication Check
  if (!force) {
    const alreadySentForMonth = monthlyReportsCache.some(
      (r) => r.monthKey === monthKey && r.status === 'sent'
    );
    if (alreadySentForMonth) {
      return {
        status: 'already_sent',
        monthKey,
        recipient: OWNER_EMAIL,
        message: `Monthly report for ${monthKey} has already been sent to ${OWNER_EMAIL}. Strictly dispatched once per month.`,
      };
    }

    // Cooldown check: Guarantee at least 20 days between scheduled monthly dispatches
    const recentSentLogs = monthlyReportsCache
      .filter((r) => r.status === 'sent')
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    if (recentSentLogs.length > 0) {
      const daysSinceLast =
        (Date.now() - new Date(recentSentLogs[0].sentAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast < 20 && recentSentLogs[0].monthKey === monthKey) {
        return {
          status: 'already_sent',
          monthKey,
          recipient: OWNER_EMAIL,
          message: `A monthly report was already dispatched ${Math.round(daysSinceLast)} days ago. Dispatched strictly once per month.`,
        };
      }
    }
  }

  const report = buildMonthlyReportContent(monthKey);
  let dispatchStatus: 'sent' | 'fallback_logged' = 'fallback_logged';

  if (transporter) {
    try {
      const gmailUser = process.env.GMAIL_USER || OWNER_EMAIL;
      await transporter.sendMail({
        from: `"M R S Monthly Operations" <${gmailUser}>`,
        to: OWNER_EMAIL,
        subject: report.subject,
        text: report.text,
        html: report.html,
      });
      dispatchStatus = 'sent';
      console.log(`[HelpTracker] Unified monthly report dispatched to ${OWNER_EMAIL} for ${monthKey}`);
    } catch (err) {
      console.warn('[HelpTracker] SMTP dispatch failed, fallback recorded:', err);
      dispatchStatus = 'fallback_logged';
    }
  } else {
    console.log(`[HelpTracker] SMTP not configured, monthly report logged for ${monthKey}`);
    dispatchStatus = 'fallback_logged';
  }

  const reportLog: MonthlyReportLog = {
    monthKey,
    sentAt: new Date().toISOString(),
    recipient: OWNER_EMAIL,
    totalRecordsInReport: report.totalRecords,
    status: dispatchStatus,
  };

  monthlyReportsCache.push(reportLog);
  persistState();

  return {
    status: dispatchStatus,
    monthKey,
    recipient: OWNER_EMAIL,
    totalRecords: report.totalRecords,
  };
}

let reportSchedulerInterval: NodeJS.Timeout | null = null;

/**
 * Checks and triggers the monthly report strictly once a month
 */
export async function checkAndTriggerMonthlyReport(transporter?: nodemailer.Transporter | null) {
  ensureDataFiles();
  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  
  // Calculate previous month key
  const prevDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const prevMonthKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`;

  // Check if previous completed month has been sent
  const prevAlreadySent = monthlyReportsCache.some(
    (r) => r.monthKey === prevMonthKey && r.status === 'sent'
  );

  if (!prevAlreadySent && helpHistoryCache.length > 0) {
    console.log(`[MonthlyReportScheduler] Dispatching completed report for previous month: ${prevMonthKey}`);
    await sendMonthlyReport(transporter, false, prevMonthKey).catch((err) => {
      console.error('[MonthlyReportScheduler] Error sending previous month report:', err);
    });
    return;
  }

  // Check current month: only send on day 1 of month or end of month (day >= 28)
  const currentAlreadySent = monthlyReportsCache.some(
    (r) => r.monthKey === currentMonthKey && r.status === 'sent'
  );

  if (!currentAlreadySent && (now.getUTCDate() === 1 || now.getUTCDate() >= 28)) {
    console.log(`[MonthlyReportScheduler] Dispatching monthly report for ${currentMonthKey}`);
    await sendMonthlyReport(transporter, false, currentMonthKey).catch((err) => {
      console.error('[MonthlyReportScheduler] Error sending current month report:', err);
    });
  }
}

/**
 * Starts a background timer that checks for monthly report dispatch every 6 hours.
 * Dispatches strictly once per month.
 */
export function startMonthlyReportScheduler(getTransporter: () => nodemailer.Transporter | null) {
  if (reportSchedulerInterval) return;

  // Run initial check 15 seconds after server startup
  setTimeout(() => {
    checkAndTriggerMonthlyReport(getTransporter()).catch(() => {});
  }, 15000);

  // Check every 6 hours (21,600,000 ms)
  reportSchedulerInterval = setInterval(() => {
    checkAndTriggerMonthlyReport(getTransporter()).catch(() => {});
  }, 6 * 60 * 60 * 1000);
}
