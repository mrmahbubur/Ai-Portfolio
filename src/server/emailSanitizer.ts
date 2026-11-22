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
  if (!trimmed) return fallback;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString().replace(/\/+$/, '');
    }
    return fallback;
  } catch {
    return fallback;
  }
}
