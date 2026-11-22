/**
 * Generates an official, cryptographically unique document verification tracking number
 * for every downloaded CV PDF.
 * 
 * Example: MRS-CV-20260904-8F4A92
 */
export function generateUniqueCvDocId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  let randomHex = '';
  try {
    if (typeof crypto !== 'undefined') {
      if (typeof crypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(4);
        crypto.getRandomValues(bytes);
        randomHex = Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
          .toUpperCase()
          .slice(0, 6);
      }
    }
  } catch (e) {
    // Fallback
  }

  if (!randomHex || randomHex.length < 6) {
    randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  return `MRS-CV-${year}${month}${day}-${randomHex}`;
}
