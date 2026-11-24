/**
 * Centralized server-side sanitization utilities for HTML email templates and outbound links.
 */

export function escapeHtml(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeCdata(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\]\]>/g, ']]]]><![CDATA[>');
}

export function stripCrlf(value: unknown, maxLength?: number): string {
  const cleaned = String(value ?? '')
    .replace(/[\r\n\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return typeof maxLength === 'number' ? cleaned.slice(0, maxLength) : cleaned;
}

export function stripHtmlTags(value: unknown): string {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeEmailSubject(value: unknown, maxLength = 200): string {
  return stripCrlf(value, maxLength);
}

/**
 * Validates and normalizes outbound URLs so only http: or https: links appear in email href attributes.
 */
export function safeEmailHref(
  url?: string,
  fallback = 'https://ais-pre-kvr65sziiqaqoqlwvajinm-369506879239.asia-southeast1.run.app'
): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('//')) return fallback;
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password) {
      return parsed.toString().replace(/\/+$/, '');
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Escapes strings embedded inside HTML <script type="application/ld+json"> tags to prevent
 * JSON syntax corruption, Unicode line-separator breakage, and </script> tag breakout.
 */
export function escapeJsonLdString(unsafe: unknown): string {
  return String(unsafe ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/[\u0000-\u001F\u007F]/g, '');
}

const SERVER_EMAIL_PATTERN = /^[^\s@<>'"/?&=\\:#%]+@[^\s@<>'"/?&=\\:#%]+\.[^\s@<>'"/?&=\\:#%]{2,}$/;

/**
 * Validates and builds a sanitized mailto: URI for HTML email links and client fallback responses.
 */
export function safeMailtoHref(
  email: unknown,
  options?: {
    subject?: unknown;
    body?: unknown;
    allowEmptyRecipient?: boolean;
    fallbackEmail?: string;
  }
): string {
  const fallback = options?.fallbackEmail || 'mr216873@gmail.com';
  const rawEmail = String(email ?? '').trim();
  const hasForbiddenChars = /[\u0000-\u001F\u007F\s<>]/.test(rawEmail);
  const cleaned = rawEmail.slice(0, 128);

  const hasValidRecipient = !hasForbiddenChars && rawEmail.length <= 128 && SERVER_EMAIL_PATTERN.test(cleaned);
  const recipient = hasValidRecipient
    ? cleaned
    : options?.allowEmptyRecipient
      ? ''
      : fallback;

  const params: string[] = [];
  if (options?.subject !== undefined && options?.subject !== null) {
    const sub = stripCrlf(options.subject, 200);
    if (sub) params.push(`subject=${encodeURIComponent(sub)}`);
  }
  if (options?.body !== undefined && options?.body !== null) {
    const bodyText = String(options.body)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 2000);
    if (bodyText) params.push(`body=${encodeURIComponent(bodyText)}`);
  }

  return `mailto:${recipient ? encodeURIComponent(recipient) : ''}${params.length ? `?${params.join('&')}` : ''}`;
}

/**
 * Builds a strictly encoded HTTPS Gmail Web compose URI.
 */
export function safeGmailComposeHref(
  to: unknown,
  subject?: unknown,
  body?: unknown,
  fallbackEmail = 'mr216873@gmail.com'
): string {
  const rawTo = String(to ?? '').trim();
  const hasForbiddenChars = /[\u0000-\u001F\u007F\s<>]/.test(rawTo);
  const cleanedTo = rawTo.slice(0, 128);
  const recipient =
    !hasForbiddenChars && rawTo.length <= 128 && SERVER_EMAIL_PATTERN.test(cleanedTo)
      ? cleanedTo
      : fallbackEmail;

  const query = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: recipient,
  });
  if (subject !== undefined && subject !== null) {
    const sub = stripCrlf(subject, 200);
    if (sub) query.set('su', sub);
  }
  if (body !== undefined && body !== null) {
    const bodyText = String(body)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 2000);
    if (bodyText) query.set('body', bodyText);
  }

  return `https://mail.google.com/mail/?${query.toString()}`;
}

/**
 * Resolves and normalizes a URL string to its clean HTTP/HTTPS origin (no trailing slash or embedded credentials).
 */
export function resolveOriginUrl(url: unknown, fallback = ''): string {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('//')) return fallback;
  try {
    const parsed = new URL(trimmed);
    if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && !parsed.username && !parsed.password) {
      return parsed.origin;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Validates WGS-84 coordinates and constructs a safe Google Maps lookup URL.
 */
export function safeGoogleMapsHref(lat: unknown, lon: unknown): string {
  const numLat = typeof lat === 'number' || typeof lat === 'string' ? Number(lat) : NaN;
  const numLon = typeof lon === 'number' || typeof lon === 'string' ? Number(lon) : NaN;
  if (!Number.isFinite(numLat) || !Number.isFinite(numLon)) return '';
  if (numLat < -90 || numLat > 90 || numLon < -180 || numLon > 180) return '';
  const queryCoord = encodeURIComponent(`${numLat.toFixed(6)},${numLon.toFixed(6)}`);
  return safeEmailHref(`https://www.google.com/maps?q=${queryCoord}`, '');
}

