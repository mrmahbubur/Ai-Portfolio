import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { escapeHtml, sanitizeEmailSubject } from './emailSanitizer.ts';

export interface VerifiedFaceRecord {
  id: string;
  timestamp: string;
  monthKey: string;
  fileName: string;
  filePath: string;
  fileSizeBytes: number;
  verificationMethod: string;
  confidence: number;
  ip: string;
  country: string;
  city: string;
  userAgent: string;
  deviceType: string;
  emailNotified: boolean;
  docUniqueId?: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FACES_DIR = path.join(DATA_DIR, 'verified_faces');
const FACES_LOG_FILE = path.join(DATA_DIR, 'verified_faces_log.json');
const OWNER_EMAIL = 'mr216873@gmail.com';

function ensureFacesDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(FACES_DIR)) {
    fs.mkdirSync(FACES_DIR, { recursive: true });
  }
}

/**
 * Stores the captured portrait of a verified person in backend storage, logs metadata, and dispatches email copy.
 */
export async function storeAndEmailVerifiedPerson(params: {
  faceCapture: string; // Base64 data URL
  verificationMethod?: string;
  confidence?: number;
  ip?: string;
  userAgent?: string;
  geo?: {
    country?: string;
    city?: string;
    regionName?: string;
    isp?: string;
    lat?: number;
    lon?: number;
  };
  deviceType?: string;
  docUniqueId?: string;
  skipEmail?: boolean;
}): Promise<VerifiedFaceRecord> {
  ensureFacesDir();

  const id = `VF-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  // Parse image
  const match = params.faceCapture.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
  let ext = 'jpg';
  let buffer: Buffer;

  if (match) {
    const mime = match[1].toLowerCase();
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    buffer = Buffer.from(match[2], 'base64');
  } else {
    // Treat raw base64 or binary
    buffer = Buffer.from(params.faceCapture.replace(/\s+/g, ''), 'base64');
  }

  const fileName = `face_${Date.now()}_${id}.${ext}`;
  const filePath = path.join(FACES_DIR, fileName);

  // Save image file to backend disk
  fs.writeFileSync(filePath, buffer);

  const record: VerifiedFaceRecord = {
    id,
    timestamp: now.toISOString(),
    monthKey,
    fileName,
    filePath,
    fileSizeBytes: buffer.length,
    verificationMethod: params.verificationMethod || 'live_webcam_face_scan',
    confidence: Math.round(params.confidence ?? 95),
    ip: params.ip || '127.0.0.1',
    country: params.geo?.country || 'Unknown Location',
    city: params.geo?.city || '',
    userAgent: params.userAgent || 'Web Browser',
    deviceType: params.deviceType || 'Web Client',
    emailNotified: false,
    docUniqueId: params.docUniqueId,
  };

  // Append to persistent log file
  try {
    let logs: VerifiedFaceRecord[] = [];
    if (fs.existsSync(FACES_LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(FACES_LOG_FILE, 'utf-8'));
    }
    logs.push(record);
    fs.writeFileSync(FACES_LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (err) {
    console.error('[VerifiedFaceStorage] Failed to update face log:', err);
  }

  // Send an immediate email copy to mr216873@gmail.com with the captured photo attached and embedded
  // (Skipped when called as part of CV download flow so only one unified email with image is dispatched)
  if (!params.skipEmail) {
    const emailSent = await sendVerificationNotificationEmail(record, buffer, ext, params.geo);
    record.emailNotified = emailSent;
  }

  return record;
}

/**
 * Sends immediate notification email to M R S with the verified person's captured photo attached.
 */
async function sendVerificationNotificationEmail(
  record: VerifiedFaceRecord,
  photoBuffer: Buffer,
  ext: string,
  geo?: { country?: string; city?: string; regionName?: string; isp?: string; lat?: number; lon?: number }
): Promise<boolean> {
  const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || OWNER_EMAIL).trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_PASSWORD || '').trim().replace(/\s+/g, '');

  if (!gmailPass) {
    console.info(`[VerifiedFaceStorage] Face capture saved on backend (${record.fileName}). SMTP not configured, skipping email dispatch.`);
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

    const cid = `captured_face_${record.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const subject = sanitizeEmailSubject(
      `[Person Verified] Face Photo Captured & Stored (${record.country || 'Visitor'} · ID: ${record.id})`
    );

    const safeId = escapeHtml(record.id);
    const safeMethod = escapeHtml(record.verificationMethod);
    const safeConfidence = escapeHtml(record.confidence);
    const safeFileName = escapeHtml(record.fileName);
    const safeTimestamp = escapeHtml(new Date(record.timestamp).toUTCString());
    const safeIp = escapeHtml(record.ip);
    const safeCountry = escapeHtml(record.country);
    const safeCity = record.city ? escapeHtml(record.city) : '';
    const safeIsp = geo?.isp ? escapeHtml(geo.isp) : '';
    const safeDevice = escapeHtml(record.deviceType);
    const safeUa = escapeHtml(record.userAgent);

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background-color:#0B0F19;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#F8FAFC;">
  <div style="max-width:620px;margin:0 auto;background-color:#131B2E;border:2px solid #E2B867;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.6);">
    
    <!-- Header -->
    <div style="padding:24px 28px;background:linear-gradient(135deg, #131B2E 0%, #1A243B 100%);border-bottom:1px solid rgba(226,184,103,0.3);">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:11px;font-family:monospace;color:#E2B867;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">
          🛡️ M R S Biometric Verification System
        </span>
        <span style="background:#065F46;color:#34D399;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;text-transform:uppercase;letter-spacing:0.05em;">
          ✓ Human Verified
        </span>
      </div>
      <h2 style="margin:10px 0 4px 0;color:#F8FAFC;font-size:20px;font-weight:700;">
        Verified Person Photo Captured &amp; Stored
      </h2>
      <p style="margin:0;color:#94A3B8;font-size:13px;">
        Tracking ID: <strong style="color:#60A5FA;font-family:monospace;">${safeId}</strong> &bull; Method: <strong style="color:#E2B867;">${safeMethod}</strong>
      </p>
    </div>

    <!-- Verified Person Photo Display -->
    <div style="padding:24px 28px;background-color:#0E1524;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
      <div style="display:inline-block;padding:8px;background-color:#131B2E;border:2px solid #E2B867;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.5);">
        <img src="cid:${cid}" alt="Verified Person Face" style="max-width:340px;width:100%;height:auto;border-radius:10px;display:block;" />
      </div>
      <div style="margin-top:12px;font-size:12px;color:#94A3B8;">
        Confidence Score: <strong style="color:#10B981;">${safeConfidence}%</strong> &bull; Stored File: <span style="font-family:monospace;color:#CBD5E1;">${safeFileName}</span>
      </div>
    </div>

    <!-- Metadata Details Table -->
    <div style="padding:24px 28px;">
      <h3 style="margin:0 0 14px 0;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;color:#E2B867;font-family:monospace;">
        Visitor &amp; Hardware Profile
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tbody>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:7px 0;color:#94A3B8;width:140px;">Timestamp:</td>
            <td style="padding:7px 0;color:#F8FAFC;font-family:monospace;">${safeTimestamp}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:7px 0;color:#94A3B8;">IP Address:</td>
            <td style="padding:7px 0;color:#60A5FA;font-family:monospace;font-weight:600;">${safeIp}</td>
          </tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:7px 0;color:#94A3B8;">Location:</td>
            <td style="padding:7px 0;color:#F8FAFC;"><strong>${safeCountry}</strong> ${safeCity ? `(${safeCity})` : ''}</td>
          </tr>
          ${safeIsp ? `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:7px 0;color:#94A3B8;">ISP / Network:</td>
            <td style="padding:7px 0;color:#CBD5E1;">${safeIsp}</td>
          </tr>` : ''}
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
            <td style="padding:7px 0;color:#94A3B8;">Device Type:</td>
            <td style="padding:7px 0;color:#10B981;font-weight:600;">${safeDevice}</td>
          </tr>
          <tr>
            <td style="padding:7px 0;color:#94A3B8;">User Agent:</td>
            <td style="padding:7px 0;color:#94A3B8;font-size:11px;font-family:monospace;word-break:break-all;">${safeUa}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;background-color:#0B0F19;border-top:1px solid rgba(255,255,255,0.08);font-size:11.5px;color:#64748B;">
      Captured autonomously according to M R S Verification Governance. Stored securely on backend storage at <code>data/verified_faces/${safeFileName}</code>.
    </div>
  </div>
</body>
</html>
`;

    await transporter.sendMail({
      from: `"M R S Verification System" <${gmailUser}>`,
      to: OWNER_EMAIL,
      subject,
      text: `[Person Verified] Face Photo Captured & Stored\n\nID: ${record.id}\nTimestamp: ${record.timestamp}\nIP: ${record.ip}\nLocation: ${record.country}\nConfidence: ${record.confidence}%\n\nThe captured photo is attached to this email and saved in backend storage.`,
      html: htmlBody,
      attachments: [
        {
          filename: `verified_person_${record.id}.${ext}`,
          content: photoBuffer,
          cid,
        },
      ],
    });

    console.info(`[VerifiedFaceStorage] Email notification sent successfully to ${OWNER_EMAIL} for verified person ${record.id}.`);
    return true;
  } catch (err: any) {
    console.error('[VerifiedFaceStorage] Error sending verification email:', err?.message || err);
    return false;
  }
}

/**
 * Returns face records for a given month or all time.
 */
export function getVerifiedFacesLog(monthKey?: string): VerifiedFaceRecord[] {
  ensureFacesDir();
  if (!fs.existsSync(FACES_LOG_FILE)) return [];
  try {
    const raw = fs.readFileSync(FACES_LOG_FILE, 'utf-8');
    const logs: VerifiedFaceRecord[] = JSON.parse(raw);
    if (!monthKey) return logs;
    return logs.filter((l) => l.monthKey === monthKey);
  } catch {
    return [];
  }
}
