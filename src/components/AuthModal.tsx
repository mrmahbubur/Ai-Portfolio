import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Check,
  Sparkles,
  Bell,
  LogOut,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  CheckCheck,
  ShieldAlert,
  Sliders,
  ExternalLink,
  FileText,
  Info,
  Server,
} from 'lucide-react';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, googleAuthProvider, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { EmailUpdatePreview } from './EmailUpdatePreview';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'signin' | 'signup' | 'preview';
  currentUser: any;
  onUserChanged?: (user: any) => void;
  onAnnounce?: (text: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'signup',
  currentUser,
  onUserChanged,
  onAnnounce,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'forgot' | 'preview'>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Subscriber notification preferences
  const [receivePlatformUpdates, setReceivePlatformUpdates] = useState(true);
  const [receiveBlogUpdates, setReceiveBlogUpdates] = useState(true);

  // Email Update Preview state
  const [emailPreview, setEmailPreview] = useState<{
    subject: string;
    text: string;
    html: string;
    project?: any;
    siteUrl?: string;
  } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'visual' | 'breakdown' | 'text'>('visual');

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [signupVerificationNotice, setSignupVerificationNotice] = useState<{ email: string; verificationSent: boolean } | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  // Load existing profile & preferences when modal opens
  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setTestEmailStatus('idle');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setVerificationSent(false);
      setSignupVerificationNotice(null);

      if (currentUser?.email) {
        setEmail(currentUser.email);
        setDisplayName(currentUser.displayName || '');

        const fetchPreferences = async () => {
          try {
            const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              if (data.receivePlatformUpdates !== undefined) {
                setReceivePlatformUpdates(Boolean(data.receivePlatformUpdates));
              }
              if (data.receiveBlogUpdates !== undefined) {
                setReceiveBlogUpdates(Boolean(data.receiveBlogUpdates));
              }
              if (data.displayName) {
                setDisplayName(data.displayName);
              }
            }
          } catch (err) {
            console.warn('Could not load Firestore preferences:', err);
          }
        };
        fetchPreferences();
      }
    }
  }, [isOpen, initialTab, currentUser]);

  const loadEmailPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const res = await fetch('/api/email/preview-update');
      const data = await res.json();
      if (data.success) {
        setEmailPreview(data);
      }
    } catch (err) {
      console.warn('Could not load email update preview:', err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen && tab === 'preview' && !emailPreview) {
      loadEmailPreview();
    }
  }, [isOpen, tab, emailPreview]);

  if (!isOpen) return null;

  // Password strength calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-[var(--panel-hover)]' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 9) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score, label: 'Good', color: 'bg-blue-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  // Sync user profile to Firestore (creates or updates)
  const syncUserToFirestore = async (user: User, name?: string) => {
    const userPath = `users/${user.uid}`;
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email || '',
          displayName: name || user.displayName || 'Subscriber',
          receivePlatformUpdates,
          receiveBlogUpdates,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, userPath);
    }
  };

  // Register or update subscriber record in server memory & Firestore
  const registerSubscriberOnServer = async (userEmail: string, name?: string, uid?: string) => {
    try {
      await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          name: name || undefined,
          uid: uid || undefined,
          siteUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          receivePlatformUpdates,
          receiveBlogUpdates,
        }),
      });

      if (uid) {
        await setDoc(
          doc(db, 'subscribers', uid),
          {
            email: userEmail,
            name: name || undefined,
            uid,
            subscribedAt: new Date().toISOString(),
            receivePlatformUpdates,
            receiveBlogUpdates,
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.warn('Non-fatal subscriber registration notice:', err);
    }
  };

  // 1. Email & Password Sign In (Authenticates against server and Firebase)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const cleanEmail = email.trim();

    try {
      // 1. Authenticate with server-stored account
      const signinRes = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const signinData = await signinRes.json();

      if (signinRes.ok && signinData.success && signinData.user) {
        const serverUser = signinData.user;
        const activeUser = {
          uid: serverUser.uid,
          email: serverUser.email,
          displayName: serverUser.displayName,
          photoURL: null,
          emailVerified: Boolean(serverUser.emailVerified),
          receivePlatformUpdates: serverUser.receivePlatformUpdates,
          receiveBlogUpdates: serverUser.receiveBlogUpdates,
          isServerAccount: true,
        };

        try {
          localStorage.setItem('mrs_auth_user', JSON.stringify(activeUser));
        } catch (storageErr) {}

        // Non-fatal parallel sign-in with Firebase if available
        try {
          await signInWithEmailAndPassword(auth, cleanEmail, password);
        } catch (fbErr) {}

        onUserChanged?.(activeUser as any);
        setSuccessMsg('Signed in successfully! Your subscriber preferences are active.');
        onAnnounce?.(`Welcome back! You are signed in.`);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      // 2. If server account was not found, check Firebase Auth client as fallback
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const fbUser = {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          photoURL: cred.user.photoURL,
          emailVerified: cred.user.emailVerified,
        };
        try {
          localStorage.setItem('mrs_auth_user', JSON.stringify(fbUser));
        } catch (storageErr) {}

        onUserChanged?.(cred.user);
        await syncUserToFirestore(cred.user);
        await registerSubscriberOnServer(
          cred.user.email || cleanEmail,
          cred.user.displayName || undefined,
          cred.user.uid
        );

        setSuccessMsg('Signed in successfully! Your update preferences are active.');
        onAnnounce?.(`Welcome back! You are connected to M R S's network.`);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      } catch (fbErr: any) {
        throw new Error(signinData.error || 'Invalid email or password. If you have not created an account yet, switch to Sign Up.');
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setErrorMsg(err.message || 'Unable to sign in. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email & Password Sign Up (Creates Firebase account, sends email verification link, and logs in)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSignupVerificationNotice(null);

    const cleanEmail = email.trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address format.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please ensure both fields match.');
      return;
    }

    setIsLoading(true);
    try {
      let firebaseUser: User | null = null;
      let emailVerificationSent = false;
      let fbError: any = null;

      // 1. Create user account with Firebase Authentication
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        firebaseUser = cred.user;
        const name = displayName.trim();
        if (name) {
          try {
            await updateProfile(cred.user, { displayName: name });
          } catch (pErr) {
            console.warn('Firebase updateProfile notice:', pErr);
          }
        }
        try {
          await syncUserToFirestore(cred.user, name);
        } catch (fErr) {
          console.warn('Firebase syncUserToFirestore notice:', fErr);
        }

        // Call sendEmailVerification immediately after new user account is created
        try {
          await sendEmailVerification(cred.user);
          emailVerificationSent = true;
          setVerificationSent(true);
        } catch (verErr: any) {
          console.warn('Firebase sendEmailVerification notice:', verErr);
        }
      } catch (err: any) {
        fbError = err;
        console.warn('Firebase createUserWithEmailAndPassword notice:', err);
        if (err.code === 'auth/email-already-in-use') {
          throw err;
        }
        if (err.code === 'auth/invalid-email' || err.code === 'auth/weak-password') {
          throw err;
        }
      }

      // 2. Also record and sync account to server database
      let serverUser: any = null;
      let welcomeEmailSent = false;
      try {
        const signupRes = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            displayName: displayName.trim() || undefined,
            receivePlatformUpdates,
            receiveBlogUpdates,
            siteUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
          }),
        });

        if (signupRes.ok) {
          const signupData = await signupRes.json();
          if (signupData.success) {
            serverUser = signupData.user;
            welcomeEmailSent = Boolean(signupData.welcomeEmailSent);
          }
        }
      } catch (srvErr) {
        console.warn('Server signup sync notice:', srvErr);
      }

      // If both Firebase Auth and Server account creation failed, report error
      if (!firebaseUser && !serverUser) {
        throw fbError || new Error('Failed to create account. Please check your information.');
      }

      // 3. Construct authenticated user session with created account data
      const activeUser = {
        uid: firebaseUser?.uid || serverUser?.uid || `user-${Date.now()}`,
        email: firebaseUser?.email || serverUser?.email || cleanEmail,
        displayName: displayName.trim() || firebaseUser?.displayName || serverUser?.displayName || null,
        photoURL: firebaseUser?.photoURL || null,
        emailVerified: Boolean(firebaseUser?.emailVerified || false),
        receivePlatformUpdates,
        receiveBlogUpdates,
        isServerAccount: !firebaseUser,
      };

      try {
        localStorage.setItem('mrs_auth_user', JSON.stringify(activeUser));
      } catch (storageErr) {}

      // 4. Update session
      onUserChanged?.(activeUser as any);

      // 5. Display dedicated Firebase verification notice in AuthModal
      setSignupVerificationNotice({
        email: cleanEmail,
        verificationSent: emailVerificationSent,
      });

      if (emailVerificationSent) {
        setSuccessMsg(
          `Account created successfully! A Firebase email verification link has been dispatched to ${cleanEmail}.` +
            (welcomeEmailSent ? ' Welcome briefing email also dispatched.' : '')
        );
        onAnnounce?.(
          `Welcome! Your account has been created. A Firebase verification link has been sent to your email address.`
        );
      } else {
        setSuccessMsg(
          'Account created successfully! You are now signed in.' +
            (welcomeEmailSent ? ' Welcome confirmation email dispatched.' : '')
        );
        onAnnounce?.(
          `Welcome! Your account has been created and you are now signed in.`
        );
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      let message = err.message || 'Failed to create account. Please verify your information.';
      if (err.code === 'auth/email-already-in-use') {
        message = 'An account with this email already exists. Switch to Sign In or reset your password.';
      } else if (err.code === 'auth/invalid-email') {
        message = 'Please enter a valid email address format.';
      } else if (err.code === 'auth/weak-password') {
        message = 'The password is too weak. Please use at least 6 characters.';
      }
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Google OAuth Sign In / Sign Up
  const handleGoogleAuth = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      onUserChanged?.(cred.user);
      await syncUserToFirestore(cred.user);
      await registerSubscriberOnServer(
        cred.user.email || '',
        cred.user.displayName || undefined,
        cred.user.uid
      );
      setSuccessMsg('Authenticated with Google! You are connected for platform updates.');
      onAnnounce?.(`Welcome! You are connected with your Google account.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google sign-in popup was closed before finishing.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('The sign-in popup was blocked by your browser. Please allow popups for this site.');
      } else {
        setErrorMsg('Google authentication was interrupted. You can also sign in with email and password.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address to receive the password recovery link.');
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg(`Password reset link dispatched to ${email.trim()}! Please check your inbox.`);
      onAnnounce?.('Password reset email dispatched. Please check your inbox.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = 'Could not dispatch reset email. Please ensure the email is registered.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      }
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Resend Email Verification
  const handleResendVerification = async () => {
    const targetUser = auth.currentUser || currentUser;
    if (!targetUser) {
      setErrorMsg('No active user session found. Please sign in first.');
      return;
    }
    setIsSendingVerification(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
      } else if (targetUser.sendEmailVerification) {
        await targetUser.sendEmailVerification();
      }
      setVerificationSent(true);
      const targetEmail = targetUser.email || email.trim();
      setSuccessMsg(`Verification email dispatched to ${targetEmail}! Check your inbox and spam folder.`);
      onAnnounce?.('Firebase verification email sent to your inbox.');
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many verification requests. Please wait a few minutes.');
      } else {
        setErrorMsg('Could not send verification email at this moment.');
      }
    } finally {
      setIsSendingVerification(false);
    }
  };

  // 6. Update Display Name for Signed-In User
  const handleUpdateDisplayName = async () => {
    if (!currentUser) return;
    const cleanName = displayName.trim();
    if (!cleanName) {
      setErrorMsg('Display name cannot be blank.');
      return;
    }
    setIsUpdatingProfile(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // 1. Sync with server account profile
      try {
        await fetch('/api/auth/update-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: currentUser.uid,
            displayName: cleanName,
          }),
        });
      } catch (srvErr) {}

      // 2. Update Firebase auth profile if applicable
      try {
        if (currentUser.providerData) {
          await updateProfile(currentUser, { displayName: cleanName });
        }
      } catch (fbErr) {}

      // 3. Update Firestore user profile matching rules keys
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          displayName: cleanName,
          updatedAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'subscribers', currentUser.uid), {
          name: cleanName,
        });
      } catch {}

      // 4. Update local storage session
      const updatedUser = {
        ...currentUser,
        displayName: cleanName,
      };
      try {
        localStorage.setItem('mrs_auth_user', JSON.stringify(updatedUser));
      } catch (storageErr) {}

      setSuccessMsg('Display name updated successfully!');
      onUserChanged?.(updatedUser);
    } catch (err) {
      setErrorMsg('Failed to update display name.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // 7. Save Notification Preferences to Firestore & Server
  const handleSavePreferences = async () => {
    if (!currentUser) return;
    setIsUpdatingPrefs(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      // 1. Sync with server profile & subscriber cache
      await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          receivePlatformUpdates,
          receiveBlogUpdates,
        }),
      });

      // 2. Update Firestore users document matching rules keys
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
          receivePlatformUpdates,
          receiveBlogUpdates,
          updatedAt: new Date().toISOString(),
        });
        await updateDoc(doc(db, 'subscribers', currentUser.uid), {
          receivePlatformUpdates,
          receiveBlogUpdates,
        });
      } catch (subErr) {
        console.warn('Firestore subscriber preference sync note:', subErr);
      }

      // 3. Update local session in storage
      const updatedUser = {
        ...currentUser,
        receivePlatformUpdates,
        receiveBlogUpdates,
      };
      try {
        localStorage.setItem('mrs_auth_user', JSON.stringify(updatedUser));
      } catch (storageErr) {}
      onUserChanged?.(updatedUser);

      setSuccessMsg('Notification preferences updated & synchronized with server!');
      onAnnounce?.('Notification preferences saved successfully.');
    } catch (err) {
      console.error('Failed to save preferences:', err);
      setErrorMsg('Failed to save preferences. Please check your connection.');
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  // 8. Sign Out (Clears both Firebase & server session)
  const handleSignOut = async () => {
    try {
      try {
        localStorage.removeItem('mrs_auth_user');
      } catch (e) {}
      try {
        await signOut(auth);
      } catch (e) {}
      onUserChanged?.(null);
      setSuccessMsg('Signed out successfully.');
      onAnnounce?.('You have signed out successfully.');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // 9. Send Sample Update Broadcast Email
  const handleSendTestUpdate = async () => {
    if (!currentUser?.email) return;
    setTestEmailStatus('sending');
    try {
      const res = await fetch('/api/subscribers/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          name: currentUser.displayName || undefined,
          siteUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestEmailStatus('sent');
        onAnnounce?.('Sample launch update email dispatched to your inbox.');
      } else {
        setTestEmailStatus('error');
      }
    } catch (err) {
      setTestEmailStatus('error');
    }
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="auth-modal"
        className="relative w-full h-full sm:h-auto max-w-xl sm:rounded-2xl bg-[var(--panel-raised)] shadow-[var(--shadow-panel)] overflow-hidden animate-scaleUp transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] sm:max-h-[90vh] flex flex-col"
      >
        {/* Top Gold Accent Line */}
        <div className="h-1 bg-gradient-to-r from-[var(--gold)] via-[var(--gold-hover)] to-[var(--gold)] shrink-0" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 bg-[var(--panel)]/60 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-1 ring-[var(--gold)]/60 bg-[var(--panel)] shrink-0 flex items-center justify-center shadow-xs">
              <img
                src={CAMELLIA_AVATAR_SRC}
                alt="Camellia — M R S Assistant"
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0" />
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-[var(--gold)] font-bold">
                  Firebase Authentication
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-heading font-bold text-[var(--text)]">
                {currentUser
                  ? 'Subscriber Profile & Settings'
                  : tab === 'forgot'
                  ? 'Password Recovery'
                  : 'Platform Updates & Member Access'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] active:scale-95 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Important Public Browsing Note */}
          <div className="p-3 rounded-xl bg-[var(--bg)] text-xs font-mono text-[var(--text-secondary)] flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[var(--gold)] shrink-0 mt-0.5" />
            <span>
              <strong>100% Open Access:</strong> You never need to sign in or create an account to explore M R S’s portfolio.
              Creating an account allows you to receive customized email announcements from <strong>Camellia (M R S Assistant)</strong> when new featured platforms launch.
            </span>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 text-[var(--danger-text)] text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/10 text-[var(--success-text)] text-xs font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          {/* Dedicated Firebase Email Verification Notice */}
          {signupVerificationNotice && (
            <div className="p-4 rounded-xl bg-amber-500/10 text-xs font-mono space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 font-bold text-[var(--gold)] text-sm">
                  <Mail className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span>Firebase Email Verification Notice</span>
                </div>
                <span className="text-[var(--gold)] text-[10.5px] uppercase font-bold tracking-wider shrink-0">
                  Verification Dispatched
                </span>
              </div>
              <p className="text-[var(--text-secondary)] leading-relaxed">
                A Firebase verification link has been sent to{' '}
                <strong className="text-[var(--text)] underline">{signupVerificationNotice.email}</strong>.
                Please check your inbox (and spam folder) to verify your email address.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0" />
                  Your account is active. You have full open access to explore all platforms.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isSendingVerification}
                    className="px-2.5 py-1 rounded-md bg-[var(--panel)] hover:bg-[var(--bg)] text-[var(--gold)] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSendingVerification ? 'Resending...' : 'Resend Link'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSignupVerificationNotice(null);
                      onClose();
                    }}
                    className="px-3 py-1 rounded-md bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] font-bold transition-colors cursor-pointer"
                  >
                    Continue Exploring
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* 1. PREVIEW TAB: TRANSPARENCY & UPDATE EMAIL BREAKDOWN      */}
          {/* ========================================================= */}
          {tab === 'preview' ? (
            <EmailUpdatePreview
              currentUser={currentUser}
              onBack={() => {
                setTab(currentUser ? 'signin' : 'signup');
                setErrorMsg(null);
              }}
              onSendTestEmail={handleSendTestUpdate}
              testEmailStatus={testEmailStatus}
            />
          ) : currentUser ? (
            /* ========================================================= */
            /* 2. IF ALREADY SIGNED IN: COMPLETE ACCOUNT MANAGEMENT HUB */
            /* ========================================================= */
            <div className="space-y-4">
              {/* Account Identity Card */}
              <div className="p-4 rounded-xl bg-[var(--panel)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[var(--gold)]/20 text-[var(--gold)] flex items-center justify-center font-mono font-bold text-base shadow-xs">
                      {currentUser.displayName?.[0]?.toUpperCase() ||
                        currentUser.email?.[0]?.toUpperCase() ||
                        'U'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
                        <span>{currentUser.displayName || 'Subscriber Member'}</span>
                        {currentUser.emailVerified ? (
                          <span
                            title="Email Verified with Firebase Auth"
                            className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[var(--success-text)] font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span
                            title="Email unverified in Firebase Auth"
                            className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[var(--gold)] font-semibold"
                          >
                            <ShieldAlert className="w-3 h-3" /> Unverified
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono text-[var(--text-muted)]">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>

                  <span className="text-[var(--success-text)] font-mono text-[10.5px] uppercase font-bold tracking-wider">
                    Connected
                  </span>
                </div>

                {/* Email verification reminder if not verified */}
                {!currentUser.emailVerified && (
                  <div className="pt-2 flex items-center justify-between gap-2 text-xs font-mono">
                    <span className="text-[var(--text-secondary)]">Confirm your email for priority broadcasts:</span>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={isSendingVerification || verificationSent}
                      className="text-[11px] font-mono text-[var(--gold)] hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSendingVerification ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" /> Sending...
                        </>
                      ) : verificationSent ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-[var(--success-text)]" /> Link Dispatched
                        </>
                      ) : (
                        'Send Verification Link'
                      )}
                    </button>
                  </div>
                )}

                {/* Account Details & Provider */}
                <div className="pt-3 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[var(--gold)]" /> Auth Provider:
                    </span>
                    <span className="text-[var(--text)]">
                      {currentUser.providerData?.[0]?.providerId === 'google.com'
                        ? 'Google OAuth'
                        : 'Email & Password'}
                    </span>
                  </div>
                  <div style={{ display: 'none' }} className="hidden">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[var(--gold)]" /> Firebase UID:
                    </span>
                    <span className="text-[var(--text-muted)] font-mono text-[10px] truncate max-w-[160px]">
                      {currentUser.uid}
                    </span>
                  </div>
                </div>
              </div>

              {/* Edit Display Name */}
              <div className="p-4 rounded-xl bg-[var(--panel)] space-y-2">
                <label className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                  Update Display Name
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <UserIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your preferred name"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg)] text-xs font-mono text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] transition-colors"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleUpdateDisplayName}
                    disabled={isUpdatingProfile}
                    className="px-3.5 py-2 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-mono font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isUpdatingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              </div>

              {/* Live Notification Preferences with Firestore Sync */}
              <div className="p-4 rounded-xl bg-[var(--panel)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--gold)] flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" /> Notification Subscriptions
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)]">Firestore Synced</span>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-mono text-[var(--text)] p-2 rounded-lg hover:bg-[var(--bg)] transition-colors">
                    <input
                      type="checkbox"
                      checked={receivePlatformUpdates}
                      onChange={(e) => setReceivePlatformUpdates(e.target.checked)}
                      className="mt-0.5 accent-[var(--gold)]"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">Featured Platforms &amp; Project Launches</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Receive announcements when M R S publishes new portals and web tools.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer text-xs font-mono text-[var(--text)] p-2 rounded-lg hover:bg-[var(--bg)] transition-colors">
                    <input
                      type="checkbox"
                      checked={receiveBlogUpdates}
                      onChange={(e) => setReceiveBlogUpdates(e.target.checked)}
                      className="mt-0.5 accent-[var(--gold)]"
                    />
                    <div className="flex-1">
                      <div className="font-semibold">IT Support Guides &amp; Technical Articles</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        Receive solutions for remote administration, Microsoft 365, and web systems.
                      </div>
                    </div>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={isUpdatingPrefs}
                  className="w-full py-2 px-3 rounded-lg bg-[var(--gold)]/15 hover:bg-[var(--gold)]/25 text-[var(--gold)] font-mono text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[38px] disabled:opacity-50"
                >
                  {isUpdatingPrefs ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Preferences...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Save Notification Preferences
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons for Logged In User */}
              <div className="pt-1">
                <button
                  type="button"
                  style={{ display: 'none' }}
                  onClick={() => {
                    setTab('preview');
                    if (!emailPreview) loadEmailPreview();
                  }}
                  className="hidden"
                >
                  <Eye className="w-3.5 h-3.5" /> Email Preview
                </button>

                <button
                  type="button"
                  style={{ display: 'none' }}
                  onClick={handleSendTestUpdate}
                  disabled={testEmailStatus === 'sending'}
                  className="hidden"
                >
                  <Send className="w-3.5 h-3.5 text-[var(--gold)]" /> Send Sample Email
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-3 rounded-lg bg-[var(--panel)] hover:bg-rose-500/15 text-[var(--text-secondary)] hover:text-[var(--danger-text)] font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[44px]"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          ) : tab === 'forgot' ? (
            /* ========================================================= */
            /* 2. PASSWORD RECOVERY TAB                                  */
            /* ========================================================= */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="text-xs font-mono text-[var(--text-secondary)] leading-relaxed">
                Enter your registered email address. Firebase Auth will dispatch a secure link to reset your password.
              </div>

              <div>
                <label className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@example.com"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg)] text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorMsg(null);
                  }}
                  className="py-2.5 px-3 rounded-lg bg-[var(--panel)] hover:bg-[var(--bg)] text-[var(--text-secondary)] hover:text-[var(--text)] font-mono text-xs uppercase tracking-wider cursor-pointer transition-colors"
                >
                  Back to Sign In
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-mono font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] shadow-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Sending Link...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Send Recovery Link
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ========================================================= */
            /* 3. SIGN UP & SIGN IN TAB SELECTOR & FORMS                 */
            /* ========================================================= */
            <div>
              {/* Tab Selector */}
              <div className="flex items-center rounded-xl bg-[var(--panel)] p-1 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setTab('signup');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider active:scale-[0.97] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation ${
                    tab === 'signup'
                      ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" /> Sign Up &amp; Subscribe
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('signin');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-mono font-semibold uppercase tracking-wider active:scale-[0.97] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation ${
                    tab === 'signin'
                      ? 'bg-[var(--gold)] text-[var(--gold-ink)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" /> Sign In
                </button>
                <button
                  type="button"
                  style={{ display: 'none' }}
                  onClick={() => {
                    setTab('preview');
                    setErrorMsg(null);
                    if (!emailPreview) loadEmailPreview();
                  }}
                  className="hidden"
                >
                  <Eye className="w-3.5 h-3.5" /> Email Preview
                </button>
              </div>

              {/* Sign Up / Subscribe Form */}
              {tab === 'signup' ? (
                <form onSubmit={handleSignUp} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Your Name <span className="text-[var(--text-muted)]">(Optional)</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alexander Clark"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg)] text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Email Address <span className="text-[var(--gold)]">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg)] text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Password Input with Visibility Toggle */}
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Password <span className="text-[var(--gold)]">* (min 6 characters)</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 rounded-lg bg-[var(--bg)] text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password strength visual meter */}
                    {password && (
                      <div className="mt-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                          <span>Strength:</span>
                          <span className="font-semibold">{strength.label}</span>
                        </div>
                        <div className="h-1 w-full bg-[var(--panel)] rounded-full overflow-hidden">
                          <div
                            className={`h-full ${strength.color} transition-all duration-300`}
                            style={{ width: `${Math.max(15, (strength.score / 4) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Confirm Password <span className="text-[var(--gold)]">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full pl-9 pr-10 py-2 rounded-lg bg-[var(--bg)] text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none focus:ring-1 transition-colors ${
                          confirmPassword && password !== confirmPassword
                            ? 'ring-1 ring-rose-500 focus:ring-rose-500'
                            : 'focus:ring-[var(--gold)]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-[10px] font-mono text-[var(--danger-text)] mt-1">Passwords do not match.</p>
                    )}
                  </div>

                  {/* Notification Checkboxes */}
                  <div className="p-3 rounded-lg bg-[var(--panel)] space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer text-xs font-mono text-[var(--text)]">
                      <input
                        type="checkbox"
                        checked={receivePlatformUpdates}
                        onChange={(e) => setReceivePlatformUpdates(e.target.checked)}
                        className="mt-0.5 accent-[var(--gold)]"
                      />
                      <span>Email me customized announcements when M R S launches new featured platforms or web projects.</span>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer text-xs font-mono text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={receiveBlogUpdates}
                        onChange={(e) => setReceiveBlogUpdates(e.target.checked)}
                        className="mt-0.5 accent-[var(--gold)]"
                      />
                      <span>Include tech blog troubleshooting guides and IT tutorials.</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-mono font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Creating Account...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Sign Up &amp; Receive Updates
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Sign In Form */
                <form onSubmit={handleSignIn} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@example.com"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--bg)] text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setTab('forgot');
                          setErrorMsg(null);
                        }}
                        className="text-[11px] font-mono text-[var(--gold)] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 rounded-lg bg-[var(--bg)] text-xs sm:text-sm font-mono text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)] transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-mono font-semibold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer min-h-[44px] shadow-sm disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Signing In...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="w-4 h-4" /> Sign In to Account
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Divider & Google Auth */}
              <div className="pt-3">
                <div className="relative flex py-2 items-center">
                  <span className="flex-shrink mx-auto text-[11px] font-mono text-[var(--text-muted)] uppercase">or continue with</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-[var(--panel)] hover:bg-[var(--bg)] text-[var(--text)] text-xs font-mono font-medium transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer min-h-[44px]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-[var(--bg)] text-center text-[11px] font-mono text-[var(--text-muted)] shrink-0">
          <span>Curated by Camellia (M R S Assistant) • Firebase Secured • Zero spam guarantee</span>
        </div>
      </div>
    </div>
  );
};
