export const INPUT_LIMITS = {
  NAME_MIN: 1,
  NAME_MAX: 100,
  EMAIL_MIN: 3,
  EMAIL_MAX: 128,
  SUBJECT_MIN: 1,
  SUBJECT_MAX: 200,
  MESSAGE_MIN: 1,
  MESSAGE_MAX: 2000,
  PASSWORD_MIN: 6,
  PASSWORD_MAX: 128,
} as const;

export const EMAIL_PATTERN = /^[^\s@<>'"/?&=\\:#%]+@[^\s@<>'"/?&=\\:#%]+\.[^\s@<>'"/?&=\\:#%]{2,}$/;

const CONTROL_CHARS_INLINE = /[\u0000-\u001F\u007F]/g;
const CONTROL_CHARS_MULTILINE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Strips HTML tags, dangerous URI schemes, and ASCII control characters from single-line inputs
 * such as names, titles, and subjects, while preserving normal Unicode text.
 */
export function sanitizeSingleLineText(value: unknown, maxLength: number = INPUT_LIMITS.NAME_MAX): string {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(CONTROL_CHARS_INLINE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Strips HTML tags and control characters from multiline inquiry notes while preserving newlines.
 */
export function sanitizeMultilineText(value: unknown, maxLength: number = INPUT_LIMITS.MESSAGE_MAX): string {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(CONTROL_CHARS_MULTILINE, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Normalizes and sanitizes email address inputs.
 */
export function sanitizeEmailInput(value: unknown, maxLength: number = INPUT_LIMITS.EMAIL_MAX): string {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(CONTROL_CHARS_INLINE, '')
    .replace(/\s+/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that an email meets structural & blueprint length bounds.
 */
export function isValidEmailAddress(email: string): boolean {
  const normalized = sanitizeEmailInput(email, INPUT_LIMITS.EMAIL_MAX);
  return (
    normalized.length >= INPUT_LIMITS.EMAIL_MIN &&
    normalized.length <= INPUT_LIMITS.EMAIL_MAX &&
    EMAIL_PATTERN.test(normalized)
  );
}

/**
 * Validates external anchor hrefs to strictly permit http/https (and sanitized mailto: when enabled).
 */
export function sanitizeSafeHref(url?: string, allowMailto = false): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (allowMailto && /^mailto:/i.test(trimmed)) {
    const withoutScheme = trimmed.slice(7);
    const qIdx = withoutScheme.indexOf('?');
    const rawAddr = qIdx >= 0 ? withoutScheme.slice(0, qIdx) : withoutScheme;
    const rawQuery = qIdx >= 0 ? withoutScheme.slice(qIdx + 1) : '';

    let decodedAddr = rawAddr;
    try {
      decodedAddr = decodeURIComponent(rawAddr);
    } catch {}

    const cleanAddr = sanitizeEmailInput(decodedAddr, INPUT_LIMITS.EMAIL_MAX);
    if (!isValidEmailAddress(cleanAddr)) return undefined;

    if (!rawQuery) {
      return `mailto:${encodeURIComponent(cleanAddr)}`;
    }

    try {
      const params = new URLSearchParams(rawQuery);
      return sanitizeMailtoHref(
        cleanAddr,
        params.get('subject') || undefined,
        params.get('body') || undefined
      );
    } catch {
      return `mailto:${encodeURIComponent(cleanAddr)}`;
    }
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Strips non-dialable characters from phone numbers for tel: links.
 */
export function sanitizePhoneHref(phone?: string, fallback = '+8809611056361'): string {
  const cleaned = String(phone ?? '').replace(/[^\d+()-]/g, '').slice(0, 24);
  return cleaned.length >= 6 ? cleaned : fallback;
}

/**
 * Builds a sanitized mailto: URI from a validated email address and optional subject/body.
 */
export function sanitizeMailtoHref(
  email?: string,
  subject?: string,
  body?: string,
  fallbackEmail = 'mr216873@gmail.com'
): string {
  const cleanEmail = sanitizeEmailInput(email || '', INPUT_LIMITS.EMAIL_MAX);
  const safeRecipient = isValidEmailAddress(cleanEmail)
    ? cleanEmail
    : isValidEmailAddress(fallbackEmail)
      ? sanitizeEmailInput(fallbackEmail, INPUT_LIMITS.EMAIL_MAX)
      : 'mr216873@gmail.com';
  const params: string[] = [];
  if (subject) {
    const cleanSub = sanitizeSingleLineText(subject, INPUT_LIMITS.SUBJECT_MAX);
    if (cleanSub) params.push(`subject=${encodeURIComponent(cleanSub)}`);
  }
  if (body) {
    const cleanBody = sanitizeMultilineText(body, INPUT_LIMITS.MESSAGE_MAX);
    if (cleanBody) params.push(`body=${encodeURIComponent(cleanBody)}`);
  }
  return `mailto:${encodeURIComponent(safeRecipient)}${params.length ? `?${params.join('&')}` : ''}`;
}

/**
 * Builds or validates a safe HTTPS Gmail Web compose link.
 */
export function sanitizeGmailComposeHref(options: {
  url?: string;
  to?: string;
  subject?: string;
  body?: string;
  fallbackTo?: string;
}): string {
  const fallbackRecipient = isValidEmailAddress(options.fallbackTo || '')
    ? sanitizeEmailInput(options.fallbackTo, INPUT_LIMITS.EMAIL_MAX)
    : 'mr216873@gmail.com';

  let recipient = isValidEmailAddress(options.to || '')
    ? sanitizeEmailInput(options.to, INPUT_LIMITS.EMAIL_MAX)
    : fallbackRecipient;
  let subjectText = options.subject ? sanitizeSingleLineText(options.subject, INPUT_LIMITS.SUBJECT_MAX) : '';
  let bodyText = options.body ? sanitizeMultilineText(options.body, INPUT_LIMITS.MESSAGE_MAX) : '';

  if (options.url) {
    try {
      const parsed = new URL(options.url);
      if (
        parsed.protocol === 'https:' &&
        parsed.hostname === 'mail.google.com' &&
        /^\/mail(\/u\/\d+)?\/?$/i.test(parsed.pathname)
      ) {
        const paramTo = parsed.searchParams.get('to');
        const paramSu = parsed.searchParams.get('su');
        const paramBody = parsed.searchParams.get('body');
        if (paramTo && isValidEmailAddress(paramTo)) {
          recipient = sanitizeEmailInput(paramTo, INPUT_LIMITS.EMAIL_MAX);
        }
        if (paramSu) subjectText = sanitizeSingleLineText(paramSu, INPUT_LIMITS.SUBJECT_MAX);
        if (paramBody) bodyText = sanitizeMultilineText(paramBody, INPUT_LIMITS.MESSAGE_MAX);
      }
    } catch {
      // Ignore malformed candidate and build clean URL from validated parameters
    }
  }

  const query = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: recipient,
  });
  if (subjectText) query.set('su', subjectText);
  if (bodyText) query.set('body', bodyText);
  return `https://mail.google.com/mail/?${query.toString()}`;
}

