import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';

const ADMIN_OWNER_EMAIL = 'mr216873@gmail.com';

// In-Memory IP Sliding Window Rate Limiter
interface RateBucket {
  count: number;
  resetAt: number;
}

const generalRateLimitStore = new Map<string, RateBucket>();
const sensitiveActionRateLimitStore = new Map<string, RateBucket>();
const submissionRateLimitStore = new Map<string, RateBucket>();

// Clean expired buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of generalRateLimitStore.entries()) {
    if (now > bucket.resetAt) generalRateLimitStore.delete(ip);
  }
  for (const [ip, bucket] of sensitiveActionRateLimitStore.entries()) {
    if (now > bucket.resetAt) sensitiveActionRateLimitStore.delete(ip);
  }
  for (const [ip, bucket] of submissionRateLimitStore.entries()) {
    if (now > bucket.resetAt) submissionRateLimitStore.delete(ip);
  }
}, 5 * 60 * 1000);

export function extractClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') return realIp.trim();
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp.trim();
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * 1. Security Headers Middleware (OWASP & Industry Standard Hardening)
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Conceal server stack
  res.removeHeader('X-Powered-By');

  // Protection against MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Cross-Site Scripting (XSS) filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Clickjacking defense: Allow legitimate same-origin framing (and allow Blogspot embed when needed)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Device & API Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()');

  // Cross-Origin Opener Policy
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

  next();
}

/**
 * 2. Malicious Bot & Vulnerability Probe Defense Guard
 */
const SUSPICIOUS_PATHS = [
  '/.env',
  '/.git',
  '/.svn',
  '/.htaccess',
  '/.ds_store',
  '/wp-admin',
  '/wp-login',
  '/xmlrpc.php',
  '/phpmyadmin',
  '/pma',
  '/actuator',
  '/eval-stdin',
  '/cgi-bin',
  '/etc/passwd',
  '/win.ini',
  '/.aws',
];

const MALICIOUS_USER_AGENTS = [
  'sqlmap',
  'nikto',
  'acunetix',
  'nmap',
  'masscan',
  'zgrab',
  'havij',
  'dirbuster',
  'gobuster',
];

export function maliciousRequestGuard(req: Request, res: Response, next: NextFunction) {
  const urlLower = req.originalUrl.toLowerCase();
  const userAgent = String(req.headers['user-agent'] || '').toLowerCase();

  // Block directory traversal attempts
  if (urlLower.includes('..') || urlLower.includes('%2e%2e') || urlLower.includes('\\')) {
    return res.status(403).json({ error: 'Illegal request pattern' });
  }

  // Block known vulnerability probes
  if (SUSPICIOUS_PATHS.some((path) => urlLower.includes(path))) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Block automated malicious vulnerability scanners
  if (MALICIOUS_USER_AGENTS.some((bot) => userAgent.includes(bot))) {
    return res.status(403).json({ error: 'Access forbidden for automated security scanners' });
  }

  next();
}

/**
 * 3. Adaptive In-Memory Rate Limiter Middleware
 */
function normalizeRequestPath(rawPath: string): string {
  const collapsed = (rawPath || '/').toLowerCase().replace(/\/{2,}/g, '/').replace(/\/+$/, '');
  return collapsed || '/';
}

export function adaptiveRateLimiter(req: Request, res: Response, next: NextFunction) {
  const normalizedPath = normalizeRequestPath(req.path);
  if (normalizedPath === '/health' || normalizedPath === '/api/health' || normalizedPath === '/ready') {
    return next();
  }

  const ip = extractClientIp(req);
  const now = Date.now();

  // Route Classification
  const isSubmission =
    normalizedPath.startsWith('/api/inquiries') ||
    normalizedPath.startsWith('/api/subscribe');
  const isSensitiveVerification =
    normalizedPath.startsWith('/api/verify-human-face') ||
    normalizedPath.startsWith('/api/generate-cv-pdf') ||
    normalizedPath.startsWith('/api/notify-cv-download');

  if (isSubmission) {
    const bucket = submissionRateLimitStore.get(ip) || { count: 0, resetAt: now + 5 * 60 * 1000 };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + 5 * 60 * 1000;
    }
    bucket.count++;
    submissionRateLimitStore.set(ip, bucket);

    if (bucket.count > 10) {
      return res.status(429).json({
        error: 'Too many submissions. Please wait 5 minutes before trying again.',
      });
    }
  } else if (isSensitiveVerification) {
    const bucket = sensitiveActionRateLimitStore.get(ip) || { count: 0, resetAt: now + 60 * 1000 };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + 60 * 1000;
    }
    bucket.count++;
    sensitiveActionRateLimitStore.set(ip, bucket);

    if (bucket.count > 20) {
      return res.status(429).json({
        error: 'Verification rate limit exceeded. Please wait a moment before trying again.',
      });
    }
  } else if (normalizedPath === '/api' || normalizedPath.startsWith('/api/')) {
    const bucket = generalRateLimitStore.get(ip) || { count: 0, resetAt: now + 60 * 1000 };
    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + 60 * 1000;
    }
    bucket.count++;
    generalRateLimitStore.set(ip, bucket);

    if (bucket.count > 200) {
      return res.status(429).json({
        error: 'Rate limit reached. Please slow down requests.',
      });
    }
  }

  next();
}

/**
 * 4. Administrative Authorization Guard
 * Accepts configured environment secrets or a verified Firebase Admin ID token belonging to the owner email.
 */
export async function requireAdminAuthorization(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const adminKeyHeader =
    req.headers['x-admin-key'] ||
    req.headers['x-admin-secret'] ||
    req.headers['x-api-key'];

  let providedToken = '';
  if (typeof adminKeyHeader === 'string') {
    providedToken = adminKeyHeader.trim();
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    providedToken = authHeader.substring(7).trim();
  }

  const allowedKeys = [
    process.env.ADMIN_SECRET,
    process.env.ADMIN_KEY,
    process.env.GMAIL_APP_PASSWORD,
  ]
    .map((k) => (k || '').trim())
    .filter(Boolean);

  if (providedToken && allowedKeys.includes(providedToken)) {
    return next();
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.substring(7).trim();
    if (idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        if (decoded.email === ADMIN_OWNER_EMAIL && decoded.email_verified === true) {
          return next();
        }
      } catch {
        // Fall through to 403
      }
    }
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied. Administrative authorization required to view confidential records.',
  });
}

/**
 * 5. Recursive Input Sanitization
 */
function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    // Strip script tags and control characters from textual payloads
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\0/g, '');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      sanitizedObj[k] = sanitizeValue(v);
    }
    return sanitizedObj;
  }
  return val;
}

export function payloadSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  next();
}
