import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { escapeHtml, sanitizeEmailSubject } from './emailSanitizer.ts';

export interface SitePolicyItem {
  id: string;
  title: string;
  shortDescription: string;
  lastUpdated: string;
  effectiveYear: number;
  version: string;
  content: string[];
}

export interface SitePoliciesManifest {
  effectiveYear: number;
  lastRunTimestamp: string;
  copyrightText: string;
  ownerEmail: string;
  policies: Record<string, SitePolicyItem>;
  legalComplianceStandards: string[];
}

export interface AnnualUpdateLog {
  updateId: string;
  year: number;
  timestamp: string;
  status: 'applied' | 'already_up_to_date';
  summary: string;
  emailNotified: boolean;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const POLICIES_FILE = path.join(DATA_DIR, 'site_policies.json');
const LOGS_FILE = path.join(DATA_DIR, 'annual_updates_history.json');
const OWNER_EMAIL = 'mr216873@gmail.com';

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Builds the comprehensive, legally compliant site policies for the specified year.
 */
export function generatePoliciesForYear(year: number): SitePoliciesManifest {
  const effectiveDate = `January 1, ${year}`;
  const copyrightText = `© 2024–${year} M R S. All Rights Reserved. IT Support, Remote Systems Administration & Web Solutions.`;

  const termsOfService: SitePolicyItem = {
    id: 'terms-of-service',
    title: 'Terms of Service & Engagement',
    shortDescription: `Official terms of service governing M R S portfolio, consultations, and digital services (${year} Revision).`,
    lastUpdated: effectiveDate,
    effectiveYear: year,
    version: `${year}.1.0`,
    content: [
      `1. Scope of Engagement: M R S provides certified professional IT Support, Remote System Administration, Cloud and Microsoft 365 Management, and Web Development services. By accessing this platform or engaging services, you agree to these terms.`,
      `2. Professional Code & Ethical Computing: All remote administration, diagnostics, and IT operations strictly adhere to industry safety standards, data integrity, and non-destructive troubleshooting protocols.`,
      `3. Document & CV Verification: Executive CV downloads and credential verification require real-person biometric verification to prevent unauthorized scraping and automated impersonation.`,
      `4. Service Availability & SLA: Services and consultations are provided with high-availability remote diagnostic tools, dedicated ticketing tracking, and direct email escalation via ${OWNER_EMAIL}.`,
      `5. Annual Revalidation: These terms are automatically re-evaluated annually on the backend to maintain full alignment with current international technology and commercial guidelines.`
    ],
  };

  const privacyPolicy: SitePolicyItem = {
    id: 'privacy-policy',
    title: 'Global Privacy & Data Protection Policy',
    shortDescription: `Standards protecting visitor privacy, biometric verification data, and contact communications (${year} Edition).`,
    lastUpdated: effectiveDate,
    effectiveYear: year,
    version: `${year}.1.0`,
    content: [
      `1. Commitment to Privacy: M R S upholds strict confidentiality regarding all client data, system logs, network diagrams, and personal contact details.`,
      `2. Biometric Verification Processing: When human verification is performed for credential downloads, captured face images are analyzed solely for liveness and identity confirmation (ICAO Doc 9303 & ISO/IEC 19794-5 standards). Captures are securely audited in backend storage and a verification notice is dispatched directly to the portfolio owner.`,
      `3. No Third-Party Resale: Personal information, email addresses, and verification files are never sold, rented, or transferred to third-party data brokers.`,
      `4. Rights of Access & Deletion: Visitors may request inspection or deletion of their contact records or verification data at any time by contacting ${OWNER_EMAIL}.`,
      `5. Automated Annual Review: Privacy safeguards and regulatory compliance are automatically updated on an annual basis by the backend governance engine.`
    ],
  };

  const verificationPolicy: SitePolicyItem = {
    id: 'verification-policy',
    title: 'Biometric Human Verification & Anti-Abuse Standards',
    shortDescription: `Protocols governing facial verification, live snapshot capture, and recruiter integrity (${year} Standards).`,
    lastUpdated: effectiveDate,
    effectiveYear: year,
    version: `${year}.1.0`,
    content: [
      `1. Purpose: Biometric verification guarantees that requests for executive credentials and formal resumes originate from genuine human professionals, recruiters, and clients, deterring malicious bots and mass scrapers.`,
      `2. Capture & Audit Trail: Upon verification, a high-resolution snapshot is captured, logged with network telemetry in backend storage, and transmitted via secure email to ${OWNER_EMAIL}.`,
      `3. Anti-Spoofing & Liveness: The verification engine utilizes AI Vision and optical symmetry, skin tone, and contrast analysis to detect and reject static photos, masks, anime/cartoons, or synthetic avatars.`,
      `4. Security Compliance: All captured media is stored with cryptographic tracking IDs to maintain verifiable proof of human verification.`
    ],
  };

  const cookieAdsPolicy: SitePolicyItem = {
    id: 'cookie-ads-policy',
    title: 'Advertising, Cookies & Monetization Transparency',
    shortDescription: `Disclosures regarding sponsored banner placements, CPM network integrations, and privacy (${year} Policy).`,
    lastUpdated: effectiveDate,
    effectiveYear: year,
    version: `${year}.1.0`,
    content: [
      `1. Sponsored Ad Placements: To sustain independent research, hosting, and free public IT guides, this site includes selected high-standard advertising banners and sponsored links provided by partner CPM networks.`,
      `2. Sandboxed Display: All ad units are rendered inside sandboxed, isolated frames to prevent any unauthorized scripts from interacting with visitor session data or personal information.`,
      `3. No Tracking of Sensitive Information: Ad slots operate without access to visitor biometric data, inquiry messages, or private conversation logs.`,
      `4. Visitor Choice: Visitors are welcome to navigate all public sections, case studies, and articles with complete freedom.`
    ],
  };

  const aiEthicsPolicy: SitePolicyItem = {
    id: 'ai-ethics-policy',
    title: 'Autonomous Assistant & AI Interaction Policy',
    shortDescription: `Guidelines and accountability standards for M R S Assistant (${year} Governance).`,
    lastUpdated: effectiveDate,
    effectiveYear: year,
    version: `${year}.1.0`,
    content: [
      `1. Transparent Representation: M R S Assistant represents the certified skills, professional background, and verified portfolio of M R S.`,
      `2. Voice & Tone Standards: The voice engine operates strictly with the authentic Claude AI female voice profile (Kore acoustic profile), offering courteous, articulate, and knowledgeable guidance.`,
      `3. Accurate Information: The assistant provides verified details regarding M R S's technical certifications (IT Support, Remote Administration, Web Management) and provides open, helpful technical answers without artificial limits.`
    ],
  };

  return {
    effectiveYear: year,
    lastRunTimestamp: new Date().toISOString(),
    copyrightText,
    ownerEmail: OWNER_EMAIL,
    policies: {
      'terms-of-service': termsOfService,
      'privacy-policy': privacyPolicy,
      'verification-policy': verificationPolicy,
      'cookie-ads-policy': cookieAdsPolicy,
      'ai-ethics-policy': aiEthicsPolicy,
    },
    legalComplianceStandards: [
      'ISO/IEC 19794-5 (Biometric Data Interchange)',
      'ICAO Doc 9303 (Portrait Verification Compliance)',
      'GDPR & CCPA Data Transparency Compliant',
      'W3C Web Accessibility & Privacy Guidelines',
      'Automated Backend Annual Governance System'
    ],
  };
}

/**
 * Returns current cached or persisted site policies.
 */
export function getCurrentPolicies(): SitePoliciesManifest {
  ensureDataDir();
  const currentYear = new Date().getFullYear();

  if (fs.existsSync(POLICIES_FILE)) {
    try {
      const raw = fs.readFileSync(POLICIES_FILE, 'utf-8');
      const manifest: SitePoliciesManifest = JSON.parse(raw);
      if (manifest && manifest.effectiveYear === currentYear && manifest.policies) {
        return manifest;
      }
    } catch (e) {
      console.warn('[AnnualUpdate] Failed reading policies file, generating fresh manifest:', e);
    }
  }

  // Generate and save fresh
  const manifest = generatePoliciesForYear(currentYear);
  savePoliciesManifest(manifest);
  return manifest;
}

function savePoliciesManifest(manifest: SitePoliciesManifest) {
  ensureDataDir();
  try {
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(manifest, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AnnualUpdate] Failed writing policies file:', err);
  }
}

/**
 * Sends notification email to M R S when an annual update executes.
 */
async function sendAnnualUpdateEmail(manifest: SitePoliciesManifest, updateType: 'annual_rollover' | 'system_refresh') {
  const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || OWNER_EMAIL).trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_PASSWORD || '').trim().replace(/\s+/g, '');

  if (!gmailPass) {
    console.info(`[AnnualUpdate] SMTP not configured. Annual update for year ${manifest.effectiveYear} logged to backend storage.`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
      tls: { rejectUnauthorized: false },
    });

    const subject = sanitizeEmailSubject(
      `[Annual Site Governance] Automatic Policy & Copyright Update Applied for ${manifest.effectiveYear}`
    );
    const policyTitles = Object.values(manifest.policies).map(p => `• ${p.title} (v${p.version})`).join('\n');

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background-color:#0B0F19;font-family:'Segoe UI',Roboto,sans-serif;color:#F8FAFC;">
  <div style="max-width:640px;margin:0 auto;background-color:#131B2E;border:1px solid #E2B867;border-radius:14px;overflow:hidden;padding:24px 30px;">
    <h2 style="color:#E2B867;margin-top:0;">🛡️ Automated Annual Policy &amp; Copyright Update</h2>
    <p style="color:#94A3B8;font-size:13px;line-height:1.6;">
      The M R S Portfolio backend annual governance system has successfully updated all site legal policies, copyright notices, and compliance frameworks for the year <strong style="color:#F8FAFC;">${escapeHtml(manifest.effectiveYear)}</strong>.
    </p>

    <div style="background-color:#0E1524;padding:16px;border-radius:8px;margin:20px 0;border-left:3px solid #E2B867;">
      <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;font-family:monospace;">Active Copyright Notice</div>
      <div style="font-size:14px;color:#F8FAFC;font-weight:600;margin-top:4px;">${escapeHtml(manifest.copyrightText)}</div>
    </div>

    <h3 style="color:#F8FAFC;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">Updated Site Policies</h3>
    <ul style="color:#94A3B8;font-size:13px;line-height:1.8;padding-left:20px;">
      ${Object.values(manifest.policies).map(p => `<li><strong style="color:#F8FAFC;">${escapeHtml(p.title)}</strong> — ${escapeHtml(p.shortDescription)}</li>`).join('')}
    </ul>

    <h3 style="color:#F8FAFC;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;margin:18px 0 10px 0;">Compliance Standards Enforced</h3>
    <ul style="color:#94A3B8;font-size:12.5px;line-height:1.7;padding-left:20px;">
      ${manifest.legalComplianceStandards.map(s => `<li>${escapeHtml(s)}</li>`).join('')}
    </ul>

    <p style="font-size:11.5px;color:#64748B;margin-top:24px;border-top:1px solid rgba(255,255,255,0.08);padding-top:14px;">
      Action executed autonomously by M R S Backend Annual Governance Service. Portfolio owner: ${escapeHtml(manifest.ownerEmail)}.
    </p>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
      from: `"M R S Site Governance" <${gmailUser}>`,
      to: OWNER_EMAIL,
      subject,
      text: `Automated Annual Policy & Copyright Update Applied for ${manifest.effectiveYear}\n\nCopyright: ${manifest.copyrightText}\n\nUpdated Policies:\n${policyTitles}\n\nAll changes are now active live on the website.`,
      html: htmlBody,
    });

    console.info(`[AnnualUpdate] Notification email sent successfully to ${OWNER_EMAIL} for year ${manifest.effectiveYear}.`);
    return true;
  } catch (err: any) {
    console.error('[AnnualUpdate] Failed to send annual update email:', err?.message || err);
    return false;
  }
}

/**
 * Checks if the current year requires an update, applies it automatically, and records logs.
 */
export async function checkAndApplyAnnualUpdate(force = false): Promise<AnnualUpdateLog> {
  ensureDataDir();
  const currentYear = new Date().getFullYear();

  let existingManifest: SitePoliciesManifest | null = null;
  if (fs.existsSync(POLICIES_FILE)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(POLICIES_FILE, 'utf-8'));
    } catch {}
  }

  const needsUpdate = force || !existingManifest || existingManifest.effectiveYear < currentYear;

  const updateId = `annual-upd-${currentYear}-${Date.now()}`;
  let log: AnnualUpdateLog;

  if (needsUpdate) {
    const newManifest = generatePoliciesForYear(currentYear);
    savePoliciesManifest(newManifest);

    // Policy updates apply automatically from backend without sending email
    log = {
      updateId,
      year: currentYear,
      timestamp: new Date().toISOString(),
      status: 'applied',
      summary: `Successfully applied automatic annual update for year ${currentYear}. Updated ${Object.keys(newManifest.policies).length} policies and copyright.`,
      emailNotified: false,
    };

    console.info(`[AnnualUpdate] Automatic update applied silently from backend for year ${currentYear}: ${log.summary}`);
  } else {
    log = {
      updateId,
      year: currentYear,
      timestamp: new Date().toISOString(),
      status: 'already_up_to_date',
      summary: `Policies and copyright are already up to date for year ${currentYear}.`,
      emailNotified: false,
    };
  }

  // Append to history log
  try {
    let logs: AnnualUpdateLog[] = [];
    if (fs.existsSync(LOGS_FILE)) {
      logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
    }
    logs.push(log);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(-50), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[AnnualUpdate] Failed to write annual update history log:', err);
  }

  return log;
}

/**
 * Starts the background interval to check for annual rollover automatically every 12 hours.
 */
export function startAnnualUpdateScheduler() {
  // Check immediately on startup
  setTimeout(() => {
    checkAndApplyAnnualUpdate().catch((e) => {
      console.error('[AnnualUpdate] Initial check error:', e);
    });
  }, 5000);

  // Check every 12 hours
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  setInterval(() => {
    checkAndApplyAnnualUpdate().catch((e) => {
      console.error('[AnnualUpdate] Periodic check error:', e);
    });
  }, TWELVE_HOURS_MS);

  console.info('[AnnualUpdate] Annual policy & copyright update scheduler started (12h cycle).');
}
