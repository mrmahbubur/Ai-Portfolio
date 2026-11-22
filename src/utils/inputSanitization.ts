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

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
 * Validates external anchor hrefs to strictly permit http/https/mailto protocols.
 */
export function sanitizeSafeHref(url?: string, allowMailto = false): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  if (allowMailto && trimmed.toLowerCase().startsWith('mailto:')) {
    const addr = sanitizeEmailInput(trimmed.slice(7));
    return isValidEmailAddress(addr) ? `mailto:${addr}` : undefined;
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
