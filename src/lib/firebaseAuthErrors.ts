/**
 * Translates Firebase Auth SDK error codes into clear, user-friendly guidance
 * without exposing raw internal codes or stack strings.
 */
export function formatFirebaseAuthError(error: unknown, fallbackMessage?: string): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  const normalizedCode = code.toLowerCase();

  switch (normalizedCode) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Double-check your credentials or use Forgot Password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address format.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In or reset your password.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose at least 6 characters with letters or numbers.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact mr216873@gmail.com for assistance.';
    case 'auth/too-many-requests':
      return 'Too many attempts in a short period. Please wait a few minutes before trying again.';
    case 'auth/network-request-failed':
      return 'Network error while contacting authentication servers. Please check your connection and retry.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled. Try Google sign-in or email/password.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in popup was interrupted by another request. Please try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists for this email using a different sign-in provider. Sign in with your original method.';
    case 'auth/requires-recent-login':
      return 'Please sign out and sign back in recently before performing this sensitive update.';
    case 'auth/unauthorized-domain':
      return 'This host domain is not currently authorized for OAuth popups in Firebase Authentication.';
    case 'auth/expired-action-code':
    case 'auth/invalid-action-code':
      return 'That verification or password reset link has expired or has already been used.';
    case 'auth/quota-exceeded':
      return 'Authentication service quota temporarily reached. Please try again shortly.';
    default: {
      if (rawMessage && !rawMessage.includes('Firebase: Error')) {
        return rawMessage;
      }
      return fallbackMessage || 'Authentication could not be completed. Please try again.';
    }
  }
}

export function isTransientPopupClose(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '').toLowerCase()
      : '';
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}
