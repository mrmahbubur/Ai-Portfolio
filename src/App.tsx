import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HeaderHUD } from './components/HeaderHUD';
import { GravatarProfile } from './components/GravatarProfile';
import { FloatingAssistant } from './components/FloatingAssistant';
import { NeuralAmbientCanvas } from './components/NeuralAmbientCanvas';
import { EnterSiteOverlay } from './components/EnterSiteOverlay';
import { EmbedModal } from './components/EmbedModal';
import { AuthModal } from './components/AuthModal';
import { NewsletterSubscribePopup } from './components/NewsletterSubscribePopup';
import {
  FaceVerificationModal,
  FaceVerificationAudit,
  VERIFIED_PASS_STORAGE_KEY,
} from './components/FaceVerificationModal';
import { AdSlot, SponsoredLink, SponsorShowcase, InlineSponsorStrip } from './components/AdSlot';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { Message, BioProfile, VoiceSettings, AvatarState, TourStage, Project } from './types';
import { INITIAL_BIO_PROFILE, buildSystemInstructionFromProfile } from './data/defaultProfile';
import { getExplanationForSection } from './data/explanations';
import { audioEngine } from './utils/audio';
import { detectBrowserLanguage, getLanguageByCode, getLocalizedGreeting } from './utils/languages';
import { generateIntelligentAnswer } from './utils/intelligentQA';
import {
  auth,
  authPersistencePromise,
  clearStoredAuthUser,
  isAuthStorageSyncEvent,
  normalizeAuthSessionUser,
  parseStoredAuthUser,
  readStoredAuthUser,
  writeStoredAuthUser,
  type AuthSessionUser,
} from './lib/firebase';
import { formatFirebaseAuthError } from './lib/firebaseAuthErrors';
import {
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeEmailInput,
  sanitizeMultilineText,
  sanitizeSingleLineText,
} from './utils/inputSanitization';
import { onAuthStateChanged } from 'firebase/auth';

// Lazy-load upgraded interactive AI panels so initial page load stays instantaneous
const CamelliaChatPanel = React.lazy(() =>
  import('./components/CamelliaChatPanel').then((m) => ({ default: m.CamelliaChatPanel }))
);
const SemanticCommandPalette = React.lazy(() =>
  import('./components/SemanticCommandPalette').then((m) => ({ default: m.SemanticCommandPalette }))
);
const LiveVoiceModal = React.lazy(() =>
  import('./components/LiveVoiceModal').then((m) => ({ default: m.LiveVoiceModal }))
);

export default function App() {
  // Active Multilingual System (Auto-detected from browser region / locale on load with manual override)
  const [activeLanguage, setActiveLanguage] = useState<string>(() => {
    const saved = localStorage.getItem('mrs_active_language');
    if (saved) return saved;
    return detectBrowserLanguage();
  });

  // State
  const [hasEnteredSite, setHasEnteredSite] = useState<boolean>(false);
  const [tourStage, setTourStage] = useState<TourStage>('not_started');
  const [activeExplainKey, setActiveExplainKey] = useState<string | null>(null);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState<boolean>(false);
  const [queuedChatPrompt, setQueuedChatPrompt] = useState<{ id: string; text: string } | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState<boolean>(false);
  const [isPersonaVerifyOpen, setIsPersonaVerifyOpen] = useState<boolean>(false);
  const [verifiedPersonaPass, setVerifiedPersonaPass] = useState<FaceVerificationAudit | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [currentCaption, setCurrentCaption] = useState<string>(() => {
    const initialLang = localStorage.getItem('mrs_active_language') || detectBrowserLanguage();
    return getLocalizedGreeting(initialLang);
  });

  // Day / Night Theme (auto-adapts to any device's OS color scheme & supports manual override)
  const [hasManualThemeOverride, setHasManualThemeOverride] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || saved === 'light';
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', theme === 'dark' ? '#0B0F19' : '#F8FAFC');
    }

    if (hasManualThemeOverride) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, hasManualThemeOverride]);

  // Listen to device OS Day/Night switches dynamically when user has not forced a manual theme
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (!hasManualThemeOverride) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [hasManualThemeOverride]);

  const handleToggleTheme = () => {
    const applySwitch = () => {
      setHasManualThemeOverride(true);
      setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };
    const docAny = document as any;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && typeof docAny.startViewTransition === 'function') {
      docAny.startViewTransition(applySwitch);
    } else {
      applySwitch();
    }
  };

  const sanitizeProjectsWithUniqueIds = (rawProjects: any[]): Project[] => {
    if (!Array.isArray(rawProjects)) return [];
    const currentHost =
      typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost'
        ? window.location.hostname.toLowerCase()
        : '';
    const seenIds = new Set<string>();
    return rawProjects
      .filter((p) => {
        if (!p) return false;
        const linkLower = String(p.link || '').toLowerCase();
        const titleLower = String(p.title || '').trim().toLowerCase();
        if (p.id === 'proj-10-ai-portfolio' || titleLower === 'ai portfolio') return false;
        if (linkLower.includes('mrxshahin.ai.studio')) return false;
        if (currentHost && linkLower.includes(currentHost)) return false;
        return true;
      })
      .map((p, idx) => {
        let baseId = p.id || `proj-${idx + 1}`;
        if (baseId === 'proj-4-iptv-apk' && p.title && /mobile/i.test(p.title)) {
          baseId = 'proj-4-iptv-mobile-apk';
        }
        let uniqueId = baseId;
        let counter = 2;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${baseId}-${counter}`;
          counter++;
        }
        seenIds.add(uniqueId);
        return {
          ...p,
          id: uniqueId,
        };
      });
  };

  const normalizeInterestsList = (raw: any): string[] => {
    if (!Array.isArray(raw)) return INITIAL_BIO_PROFILE.interests;
    const normalized = raw
      .map((item) => (typeof item === 'string' ? item : item?.name || item?.slug || ''))
      .map((s) => s.trim())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : INITIAL_BIO_PROFILE.interests;
  };

  const [profile, setProfile] = useState<BioProfile>(() => {
    const savedVersion = localStorage.getItem('mrs_bio_profile_version');
    const saved = savedVersion === '4' ? localStorage.getItem('mrs_bio_profile') : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_BIO_PROFILE,
          ...parsed,
          ownerName: 'M R S',
          displayName: 'M R S',
          personaName: (parsed.personaName && parsed.personaName !== 'M R S Assistant') ? parsed.personaName : 'Camellia',
          socials: {
            ...INITIAL_BIO_PROFILE.socials,
            email: 'mr216873@gmail.com',
            ...(parsed.socials || parsed.socialLinks || {}),
          },
          interests: normalizeInterestsList(parsed.interests),
          projects:
            Array.isArray(parsed.projects) && parsed.projects.length > 0
              ? sanitizeProjectsWithUniqueIds(parsed.projects)
              : INITIAL_BIO_PROFILE.projects,
          skillsList:
            Array.isArray(parsed.skillsList) && parsed.skillsList.length > 0
              ? parsed.skillsList
              : INITIAL_BIO_PROFILE.skillsList,
        };
      } catch (_) {}
    }
    return INITIAL_BIO_PROFILE;
  });

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('mrs_voice_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          geminiVoice: 'Kore', // Enforced authentic studio female voice
        };
      } catch (_) {}
    }
    return {
      geminiVoice: 'Kore',
      speakingRate: 0.9,
      pitch: 1.0,
      autoPlayVoice: true,
      soundFxEnabled: true,
      preferGeminiTTS: true,
    };
  });

  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [phonemeWeight, setPhonemeWeight] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState<boolean>(false);

  // Authentication & Subscriber state (supports Firebase & server-stored accounts)
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(() => readStoredAuthUser());
  const [authListenerError, setAuthListenerError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'signup'>('signup');

  const applyAuthSessionUser = useCallback(
    (candidate: unknown, options: { persist?: boolean } = {}): AuthSessionUser | null => {
      const shouldPersist = options.persist !== false;
      if (!candidate) {
        if (shouldPersist) {
          clearStoredAuthUser();
        }
        setCurrentUser(null);
        return null;
      }

      const nextUser = shouldPersist
        ? writeStoredAuthUser(candidate)
        : normalizeAuthSessionUser(candidate);

      if (!nextUser) {
        if (shouldPersist) {
          clearStoredAuthUser();
        }
        setCurrentUser(null);
        return null;
      }

      setCurrentUser(nextUser);
      setAuthListenerError(null);
      return nextUser;
    },
    []
  );

  // Real browser connectivity tracking for offline resilience notice
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Validate any stored cryptographic face verification pass against backend on mount
  useEffect(() => {
    let cancelled = false;
    const validateStoredPass = async () => {
      try {
        const raw = sessionStorage.getItem(VERIFIED_PASS_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as FaceVerificationAudit;
        if (!parsed?.verificationToken) {
          sessionStorage.removeItem(VERIFIED_PASS_STORAGE_KEY);
          return;
        }
        const res = await fetch('/api/verify-human-face/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ verificationToken: parsed.verificationToken }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.valid) {
          setVerifiedPersonaPass({
            ...parsed,
            verificationId: data.verificationId || parsed.verificationId,
            confidence: typeof data.confidence === 'number' ? data.confidence : parsed.confidence,
            verifiedAt: data.verifiedAt || parsed.verifiedAt,
            expiresAt: data.expiresAt || parsed.expiresAt,
          });
        } else {
          sessionStorage.removeItem(VERIFIED_PASS_STORAGE_KEY);
          setVerifiedPersonaPass(null);
        }
      } catch {
        // Ignore storage / network transient failure
      }
    };
    validateStoredPass();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let active = true;

    authPersistencePromise
      .then((res) => {
        if (active && res.error) {
          setAuthListenerError(res.error);
        }
      })
      .catch((err) => {
        if (active) {
          setAuthListenerError(
            formatFirebaseAuthError(err, 'Unable to initialize authentication persistence.')
          );
        }
      });

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!active) return;

        if (user) {
          const existing = readStoredAuthUser();
          const sameIdentity =
            existing &&
            (existing.uid === user.uid ||
              (existing.email && user.email && existing.email.toLowerCase() === user.email.toLowerCase()));

          const mergedSession = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || (sameIdentity ? existing?.displayName : null) || null,
            photoURL: user.photoURL || null,
            emailVerified: Boolean(user.emailVerified),
            receivePlatformUpdates: sameIdentity ? existing?.receivePlatformUpdates : undefined,
            receiveBlogUpdates: sameIdentity ? existing?.receiveBlogUpdates : undefined,
            isServerAccount: false,
          };

          applyAuthSessionUser(mergedSession);
        } else {
          const parsed = readStoredAuthUser();
          if (parsed?.isServerAccount && parsed.email) {
            applyAuthSessionUser(parsed, { persist: false });
            // Silently refresh server subscriber status to keep persisted server account current
            fetch(`/api/subscribers/status?email=${encodeURIComponent(parsed.email)}`)
              .then((res) => (res.ok ? res.json() : null))
              .then((data) => {
                if (!active || !data?.subscriber) return;
                const refreshed = {
                  ...parsed,
                  displayName: data.subscriber.name || parsed.displayName,
                  receivePlatformUpdates: Boolean(data.subscriber.receivePlatformUpdates),
                  receiveBlogUpdates: Boolean(data.subscriber.receiveBlogUpdates),
                };
                applyAuthSessionUser(refreshed);
              })
              .catch(() => {});
          } else {
            applyAuthSessionUser(null);
          }
        }
      },
      (authErr) => {
        if (!active) return;
        const formatted = formatFirebaseAuthError(
          authErr,
          'Firebase authentication session check encountered an error.'
        );
        console.warn('Firebase authentication listener error:', authErr);
        setAuthListenerError(formatted);

        // Fall back gracefully to persisted server account if available
        const parsed = readStoredAuthUser();
        if (parsed?.isServerAccount) {
          applyAuthSessionUser(parsed, { persist: false });
        }
      }
    );

    const handleStorageSync = (e: StorageEvent) => {
      if (isAuthStorageSyncEvent(e)) {
        const nextUser = parseStoredAuthUser(e.newValue);
        applyAuthSessionUser(nextUser, { persist: false });
      }
    };
    window.addEventListener('storage', handleStorageSync);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener('storage', handleStorageSync);
    };
  }, [applyAuthSessionUser]);

  // Live Gravatar Sync State
  const [isSyncingGravatar, setIsSyncingGravatar] = useState<boolean>(false);
  const [lastGravatarSync, setLastGravatarSync] = useState<Date | null>(() => new Date());
  const [gravatarSyncNotice, setGravatarSyncNotice] = useState<string | null>(null);

  const lastSpokenTextRef = useRef<string>('');

  // Live Gravatar profile synchronizer
  const applyGravatarData = useCallback(
    (data: any, isManual = false) => {
      if (data && data.success && data.profile) {
        setLastGravatarSync(new Date());
        const p = data.profile;

        setProfile((prev) => {
          const nextProjects =
            Array.isArray(p.projects) && p.projects.length > 0
              ? sanitizeProjectsWithUniqueIds(p.projects)
              : prev.projects;
          const nextInterests =
            Array.isArray(p.interests) && p.interests.length > 0
              ? normalizeInterestsList(p.interests)
              : prev.interests;
          const nextVerified =
            Array.isArray(p.verifiedAccounts) && p.verifiedAccounts.length > 0
              ? p.verifiedAccounts
              : prev.verifiedAccounts;
          const nextAvatarUrl =
            p.avatarUrl && p.avatarUrl !== '/mrs_profile_avatar.jpg'
              ? p.avatarUrl
              : (prev.avatarUrl || '/mrs_profile_avatar.jpg');

          const hasAvatarChange = Boolean(nextAvatarUrl && nextAvatarUrl !== prev.avatarUrl);
          const hasBioChange = Boolean(p.gravatarBio && p.gravatarBio !== prev.gravatarBio);
          const hasRoleChange = Boolean(p.roleTitle && p.roleTitle !== prev.roleTitle);
          const hasLocationChange = Boolean(p.location && p.location !== prev.location);
          const hasNameChange = Boolean(p.displayName && p.displayName !== prev.displayName);
          const hasProjectsChange = JSON.stringify(nextProjects) !== JSON.stringify(prev.projects);
          const hasInterestsChange = JSON.stringify(nextInterests) !== JSON.stringify(prev.interests);
          const hasVerifiedChange = JSON.stringify(nextVerified) !== JSON.stringify(prev.verifiedAccounts);

          const isModified =
            hasAvatarChange ||
            hasBioChange ||
            hasRoleChange ||
            hasLocationChange ||
            hasNameChange ||
            hasProjectsChange ||
            hasInterestsChange ||
            hasVerifiedChange;

          const updated: BioProfile = {
            ...prev,
            ownerName: 'M R S',
            displayName: p.displayName || prev.displayName || 'M R S',
            personaName: (p.personaName && p.personaName !== 'M R S Assistant') ? p.personaName : 'Camellia',
            avatarUrl: nextAvatarUrl,
            gravatarBio: p.gravatarBio || prev.gravatarBio,
            roleTitle: p.roleTitle || prev.roleTitle,
            location: p.location || prev.location,
            lastSyncedAt: data.syncedAt || new Date().toISOString(),
            socials: {
              ...prev.socials,
              ...(p.socials || {}),
            },
            verifiedAccounts: nextVerified,
            interests: nextInterests,
            projects: nextProjects,
            headerImage: p.headerImage || prev.headerImage,
            backgroundColor: p.backgroundColor || prev.backgroundColor,
            cryptoWallets: p.cryptoWallets || prev.cryptoWallets,
          };

          updated.systemInstruction = buildSystemInstructionFromProfile(updated, activeLanguage);
          localStorage.setItem('mrs_bio_profile', JSON.stringify(updated));
          localStorage.setItem('mrs_bio_profile_version', '4');

          if (isModified) {
            setGravatarSyncNotice('Profile synchronized with Gravatar in real time.');
            setTimeout(() => setGravatarSyncNotice(null), 4000);
          } else if (isManual) {
            setGravatarSyncNotice('Profile is current and verified.');
            setTimeout(() => setGravatarSyncNotice(null), 3000);
          }

          return updated;
        });
      }
    },
    [activeLanguage]
  );

  const syncGravatarProfile = useCallback(
    async (isManual = false) => {
      setIsSyncingGravatar(true);
      try {
        const username = profile.gravatarUsername || 'mrxshahin';
        const email = profile.socials?.email || 'mr216873@gmail.com';
        const res = await fetch(
          `/api/gravatar?username=${encodeURIComponent(username)}&email=${encodeURIComponent(
            email
          )}&_t=${Date.now()}`
        );
        const data = await res.json();
        applyGravatarData(data, isManual);
      } catch (err) {
        console.warn('Gravatar sync attempt skipped:', err);
      } finally {
        setIsSyncingGravatar(false);
      }
    },
    [profile.gravatarUsername, profile.socials?.email, applyGravatarData]
  );

  // Real-time EventSource Stream & Auto-Sync Hooks (Mount, SSE, Interval, Focus)
  useEffect(() => {
    // 1. Initial manual fetch
    syncGravatarProfile(false);

    // 2. Establish Real-time Server-Sent Events (SSE) Stream
    let eventSource: EventSource | null = null;
    const username = profile.gravatarUsername || 'mrxshahin';
    const email = profile.socials?.email || 'mr216873@gmail.com';

    try {
      eventSource = new EventSource(
        `/api/gravatar/stream?username=${encodeURIComponent(username)}&email=${encodeURIComponent(
          email
        )}`
      );

      eventSource.addEventListener('profile_update', (event) => {
        try {
          const parsed = JSON.parse(event.data);
          applyGravatarData(parsed, false);
        } catch (_) {}
      });

      eventSource.onerror = () => {
        // SSE reconnection is managed automatically by browser
      };
    } catch (_) {}

    // 3. Fallback active polling every 20 seconds
    const interval = setInterval(() => {
      syncGravatarProfile(false);
    }, 20000);

    // 4. Tab visibility / Window focus trigger
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncGravatarProfile(false);
      }
    };
    const handleWindowFocus = () => {
      syncGravatarProfile(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [profile.gravatarUsername, profile.socials?.email, syncGravatarProfile, applyGravatarData]);

  // Audio level callback
  useEffect(() => {
    audioEngine.setAudioLevelCallback((level, phoneme) => {
      setAudioLevel(level);
      setPhonemeWeight(phoneme);
    });
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('mrs_bio_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('mrs_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  useEffect(() => {
    localStorage.setItem('mrs_active_language', activeLanguage);
  }, [activeLanguage]);

  // Core Speech Synthesizer with active language binding & original Cloud AI Female voice
  const speakText = useCallback(
    (text: string, onEndCallback?: () => void, langOverride?: string) => {
      return new Promise<void>((resolve) => {
        lastSpokenTextRef.current = text;
        setCurrentCaption(text);

        if (isMuted || !voiceSettings.autoPlayVoice) {
          setAvatarState('idle');
          if (onEndCallback) onEndCallback();
          resolve();
          return;
        }

        setAvatarState('speaking');
        const targetLang = langOverride || activeLanguage || 'en-US';

        const finishSpeaking = () => {
          setAvatarState('idle');
          if (onEndCallback) onEndCallback();
          resolve();
        };

        // Authentic Original Claude AI Female voice speech engine (Kore studio acoustic profile)
        audioEngine.speakWithClaudeAIVoice(text, {
          rate: voiceSettings.speakingRate || 0.92,
          pitch: 1.0, // 1.0 ensures original unwarped Claude AI natural voice acoustics
          languageCode: targetLang,
          onStart: () => setAvatarState('speaking'),
          onEnd: finishSpeaking,
        });
      });
    },
    [isMuted, voiceSettings, activeLanguage]
  );

  // Seamless Language Switching Handler - speaks immediately in newly selected language
  const handleLanguageChange = useCallback(
    async (newLang: string) => {
      setActiveLanguage(newLang);
      localStorage.setItem('mrs_active_language', newLang);

      // Auto-unlock audio playback context on user language selection
      if (!hasEnteredSite) {
        setHasEnteredSite(true);
      }

      audioEngine.stopCurrentAudio();
      setAvatarState('idle');

      if (voiceSettings.soundFxEnabled) {
        audioEngine.playSoundEffect('chime');
      }

      const greetingText = getLocalizedGreeting(newLang);
      setCurrentCaption(greetingText);

      if (!isMuted) {
        const switchMsg: Message = {
          id: `msg-${Date.now()}-lang-${newLang}`,
          role: 'assistant',
          text: greetingText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasAudio: true,
        };
        setMessages((prev) => [...prev, switchMsg]);
        await speakText(greetingText, undefined, newLang);
      }
    },
    [hasEnteredSite, isMuted, voiceSettings, speakText]
  );

  // Assistant speech on demand (available when triggered by tour or direct assistant interaction)
  const speakAbout = useCallback(
    async (explainKey: string, onEnd?: () => void) => {
      setActiveExplainKey(explainKey);
      if (voiceSettings.soundFxEnabled) {
        audioEngine.playSoundEffect('click');
      }

      audioEngine.stopCurrentAudio();

      // Retrieve full rich narrative in active language instantly
      const narrative = getExplanationForSection(explainKey, profile, activeLanguage);

      const assistantMsg: Message = {
        id: `msg-${Date.now()}-${explainKey}`,
        role: 'assistant',
        text: narrative,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasAudio: true,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await speakText(narrative, onEnd, activeLanguage);
    },
    [profile, voiceSettings, speakText, activeLanguage]
  );

  // Handle open query via Gemini Chat with active language instruction
  const handleQuery = useCallback(
    async (prompt: string) => {
      if (!prompt.trim()) return;

      if (voiceSettings.soundFxEnabled) {
        audioEngine.playSoundEffect('chime');
      }

      audioEngine.stopCurrentAudio();

      const userMsg: Message = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        text: prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setAvatarState('thinking');

      try {
        const history = messages.slice(-12).map((m) => ({
          role: m.role,
          text: m.text,
        }));

        const sysInstruction = buildSystemInstructionFromProfile(profile, activeLanguage);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            systemInstruction: sysInstruction,
            history,
            languageCode: activeLanguage,
            profileContext: {
              ownerName: profile.ownerName,
              headline: profile.headline,
              certification: profile.certification,
              coursesCertifications: profile.coursesCertifications,
              projects: profile.projects,
              whatICanHelpWith: profile.whatICanHelpWith,
              skillsList: profile.skillsList,
              socials: profile.socials,
            },
          }),
        });

        const data = await response.json().catch(() => ({}));
        const responseText =
          (response.ok && data.text) ||
          data.fallbackText ||
          generateIntelligentAnswer(prompt, profile, activeLanguage);

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-mrs`,
          role: 'assistant',
          text: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hasAudio: true,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        await speakText(responseText, undefined, activeLanguage);
      } catch (error) {
        const fallbackText = generateIntelligentAnswer(prompt, profile, activeLanguage);
        const errorMsg: Message = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        await speakText(fallbackText, undefined, activeLanguage);
      }
    },
    [profile, messages, voiceSettings, speakText, activeLanguage]
  );

  // Guided Walkthrough Tour (dynamically aligned with all live Gravatar projects)
  const runConciergeTour = useCallback(async () => {
    setTourStage('intro');

    const dynamicProjectSteps = (profile.projects || []).map((proj) => ({
      key: proj.id,
      label: `Stage 3 · ${proj.title}`,
    }));

    const tourSequence = [
      { key: 'header', label: 'Stage 1 · Profile' },
      { key: 'bio', label: 'Stage 2 · Bio' },
      ...dynamicProjectSteps,
      { key: 'interests', label: 'Stage 4 · Interests' },
      { key: 'contact', label: 'Stage 5 · Contact' },
    ];

    for (const step of tourSequence) {
      setActiveExplainKey(step.key);
      const element = document.querySelector(`[data-explain="${step.key}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      await speakAbout(step.key);
    }

    setTourStage('handoff');
    const conclusion =
      activeLanguage === 'en-US'
        ? "That completes our tour. Feel free to click any section to hear more, or ask me any question about M R S's work!"
        : "Tour completed. Feel free to explore or ask me any questions!";
    await speakText(conclusion, undefined, activeLanguage);
  }, [profile, speakAbout, speakText, activeLanguage]);

  // Site Entry
  const handleEnterSite = () => {
    setHasEnteredSite(true);
    audioEngine.init();
    audioEngine.playSoundEffect('chime');
    speakAbout('header');
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMuted(nextMuted);
    if (nextMuted) {
      setAvatarState('idle');
      audioEngine.stopCurrentAudio();
    }
  };

  // Open integrated upgraded Camellia AI Assistant Chat Panel
  const handleOpenChat = useCallback(() => {
    setIsChatPanelOpen(true);
  }, []);

  // Direct Inquiry Handling - Sent directly to mr216873@gmail.com via Gmail SMTP with zero persistence
  const handleSendInquiry = async (name: string, email: string, note: string) => {
    const cleanName = sanitizeSingleLineText(name, INPUT_LIMITS.NAME_MAX);
    const cleanEmailRaw = sanitizeEmailInput(email, INPUT_LIMITS.EMAIL_MAX);
    const cleanNote = sanitizeMultilineText(note, INPUT_LIMITS.MESSAGE_MAX);

    if (!cleanName || !cleanNote) {
      return {
        success: false,
        smtpDelivered: false,
        error: 'Please provide both your name and message before sending.',
      };
    }

    if (
      cleanEmailRaw &&
      cleanEmailRaw !== 'guest@portfolio.com' &&
      !isValidEmailAddress(cleanEmailRaw)
    ) {
      return {
        success: false,
        smtpDelivered: false,
        error: 'Please enter a valid email address.',
      };
    }

    const cleanEmail = cleanEmailRaw || 'guest@portfolio.com';
    let smtpDelivered = false;
    let directGmailUrl = '';
    let mailtoUrl = '';
    let errorMessage = '';
    let requestSucceeded = false;

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, note: cleanNote }),
      });
      if (res.ok) {
        const data = await res.json();
        requestSucceeded = true;
        smtpDelivered = Boolean(data.smtpDelivered);
        directGmailUrl = data.directGmailUrl || '';
        mailtoUrl = data.mailtoUrl || '';
      } else {
        const errData = await res.json().catch(() => ({}));
        errorMessage = errData.error || 'Failed to dispatch inquiry.';
      }
    } catch (err: any) {
      console.warn('Inquiry dispatch error:', err);
      errorMessage = err?.message || 'Network error while sending inquiry.';
    }

    if (!requestSucceeded) {
      return {
        success: false,
        smtpDelivered: false,
        error: errorMessage || 'Unable to process inquiry.',
      };
    }

    const recipient = profile.socials?.email || 'mr216873@gmail.com';
    const ackText = smtpDelivered
      ? `Thank you, ${cleanName}. Your message has been transmitted directly to M R S's Gmail inbox at ${recipient} via Gmail SMTP.`
      : `Thank you, ${cleanName}. Your message is prepared for M R S at ${recipient}. You can send it directly via Gmail Web or your email app.`;

    const inqMsg: Message = {
      id: `msg-${Date.now()}-inq`,
      role: 'assistant',
      text: ackText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, inqMsg]);
    speakText(ackText, undefined, activeLanguage);

    return {
      success: true,
      smtpDelivered,
      directGmailUrl,
      mailtoUrl,
      error: errorMessage || undefined,
    };
  };

  // Global click listener to start speaking when any section or project card is clicked
  useEffect(() => {
    const handleGlobalExplainClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Ignore interactive form controls or action buttons
      if (target.closest('input, textarea, select, button[type="submit"], #toggle-about-details-btn, .no-speak')) {
        return;
      }

      // Check if user clicked a link card (project card)
      const linkCard = target.closest('.link-card[data-explain]') as HTMLElement | null;
      if (linkCard) {
        const explainKey = linkCard.getAttribute('data-explain');
        if (explainKey) {
          speakAbout(explainKey);
        }
        return;
      }

      // Check general section click to explain
      const sectionTarget = target.closest('[data-explain]') as HTMLElement | null;
      if (sectionTarget) {
        const explainKey = sectionTarget.getAttribute('data-explain');
        if (explainKey) {
          speakAbout(explainKey);
        }
      }
    };

    document.addEventListener('click', handleGlobalExplainClick);
    return () => document.removeEventListener('click', handleGlobalExplainClick);
  }, [speakAbout]);

  // Global Cmd+K / Ctrl+K shortcut for Neural Semantic Search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleOpenLiveVoice = useCallback(() => {
    audioEngine.stopCurrentAudio();
    setAvatarState('idle');
    setIsLiveVoiceOpen(true);
  }, []);

  const speechRecRef = useRef<any>(null);
  const handleMicToggle = useCallback(() => {
    if (isMicActive && speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {}
      speechRecRef.current = null;
      setIsMicActive(false);
      setAvatarState('idle');
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      // Fall back to full-duplex Gemini Live Voice session on browsers without Web Speech STT
      handleOpenLiveVoice();
      return;
    }

    try {
      audioEngine.stopCurrentAudio();
      const recognition = new SpeechRec();
      recognition.lang = activeLanguage || 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      speechRecRef.current = recognition;

      setIsMicActive(true);
      setAvatarState('listening');
      setCurrentCaption('Listening — ask Camellia anything...');

      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
        speechRecRef.current = null;
        setIsMicActive(false);
        if (transcript) {
          handleQuery(transcript);
        } else {
          setAvatarState('idle');
        }
      };

      recognition.onerror = () => {
        speechRecRef.current = null;
        setIsMicActive(false);
        setAvatarState('idle');
      };

      recognition.onend = () => {
        speechRecRef.current = null;
        setIsMicActive(false);
      };

      recognition.start();
    } catch {
      setIsMicActive(false);
      setAvatarState('idle');
      handleOpenLiveVoice();
    }
  }, [isMicActive, activeLanguage, handleOpenLiveVoice, handleQuery]);

  const handleJumpToSearchMatch = useCallback(
    (selector?: string, explainKey?: string) => {
      const executeJump = () => {
        if (selector) {
          const el = document.querySelector(selector);
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (explainKey) {
          speakAbout(explainKey);
        }
      };

      const docAny = document as any;
      const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!reduced && typeof docAny.startViewTransition === 'function') {
        docAny.startViewTransition(executeJump);
      } else {
        executeJump();
      }
    },
    [speakAbout]
  );

  // Single hardware-efficient delegated handler powering pointer specular glow site-wide
  const handleDelegatedGlowMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const card = (e.target as HTMLElement | null)?.closest('.futuristic-card-glow') as HTMLElement | null;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${Math.round(e.clientX - rect.left)}px`);
    card.style.setProperty('--my', `${Math.round(e.clientY - rect.top)}px`);
  }, []);

  return (
    <div
      onPointerMove={handleDelegatedGlowMove}
      className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-300 flex flex-col font-sans selection:bg-[var(--gold)]/30 selection:text-[var(--text)] relative"
    >
      {/* Real Hardware-Accelerated Interactive Ambient Particle & Audio Field */}
      <NeuralAmbientCanvas theme={theme} audioLevel={audioLevel} avatarState={avatarState} />
      {/* Audio Unlock & Entry Site Modal */}
      {!hasEnteredSite && (
        <EnterSiteOverlay
          onEnter={handleEnterSite}
          ownerName={profile.ownerName}
          roleTitle={profile.roleTitle}
          personaName={profile.personaName}
        />
      )}

      {/* Offline Connectivity Recovery Notice */}
      {isOffline && (
        <div
          role="status"
          className="w-full bg-rose-500/15 text-[var(--danger-text)] px-4 py-2 text-center text-xs font-mono z-50"
        >
          Network connection interrupted — showing cached portfolio content until connectivity returns.
        </div>
      )}

      {/* Auth Listener / Persistence Recovery Notice */}
      {authListenerError && !isAuthModalOpen && (
        <div
          role="alert"
          className="w-full bg-amber-500/15 text-[var(--text)] px-4 py-2 text-center text-xs font-mono z-50 flex flex-wrap items-center justify-center gap-3"
        >
          <span>{authListenerError}</span>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('signin');
              setIsAuthModalOpen(true);
            }}
            className="underline text-[var(--gold)] hover:text-[var(--gold-hover)] cursor-pointer font-semibold"
          >
            Account Settings
          </button>
          <button
            type="button"
            onClick={() => setAuthListenerError(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Toast Notice for Gravatar Live Sync */}
      {gravatarSyncNotice && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[var(--panel-raised)]/95 backdrop-blur-md text-[var(--gold)] font-mono text-xs shadow-xl flex items-center gap-2 animate-fadeIn">
          <span>{gravatarSyncNotice}</span>
        </div>
      )}

      {/* Header: MRS | Portfolio · Blog · Profile with Theme and Language Controls */}
      <HeaderHUD
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenEmbed={() => setIsEmbedModalOpen(true)}
        onStartTour={runConciergeTour}
        onOpenChat={handleOpenChat}
        onOpenSearch={() => setIsSearchOpen(true)}
        personaName={profile.personaName}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        activeLanguage={activeLanguage}
        onSelectLanguage={handleLanguageChange}
        currentUser={currentUser}
        onOpenAuthModal={(tab) => {
          setAuthModalTab(tab || 'signup');
          setIsAuthModalOpen(true);
        }}
      />

      {/* Lightweight Moving Sponsored Partner Ticker Flush Below Header */}
      <div className="w-full">
        <InlineSponsorStrip />
      </div>

      {/* Main Full-Screen Portfolio Canvas */}
      <main className="flex-1 w-full relative z-10">
        <SectionErrorBoundary sectionName="Executive Portfolio">
          <GravatarProfile
            profile={profile}
            activeExplainKey={activeExplainKey}
            pendingNavigationUrl={pendingNavigationUrl}
            onSendInquiry={handleSendInquiry}
            onNavigateDirectly={(url) => {
              window.location.href = url;
            }}
            isSyncingGravatar={isSyncingGravatar}
            onSyncGravatar={() => syncGravatarProfile(true)}
            lastGravatarSync={lastGravatarSync}
            onAnnounceDownload={(text) => speakText(text, undefined, activeLanguage)}
            onSectionClick={speakAbout}
            currentUser={currentUser}
            verifiedPersonaPass={verifiedPersonaPass}
            onOpenPersonaVerify={() => setIsPersonaVerifyOpen(true)}
            onPassVerified={(audit) => setVerifiedPersonaPass(audit)}
            onOpenAuthModal={(tab) => {
              setAuthModalTab(tab || 'signup');
              setIsAuthModalOpen(true);
            }}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenLiveVoice={handleOpenLiveVoice}
            onAskAboutProject={(proj) => {
              setQueuedChatPrompt({
                id: `proj-${proj.id}-${Date.now()}`,
                text: `Please explain the technical architecture, key features, and use cases of ${proj.title} (${proj.link || 'verified platform'}). Summary: ${proj.description}`,
              });
              setIsChatPanelOpen(true);
            }}
            renderBeforeFooter={
              <div className="w-full">
                {/* Full 10-Partner Interactive Directory & Rotating Spotlight Banners */}
                <SectionErrorBoundary sectionName="Sponsored Partners Directory">
                  <SponsorShowcase
                    isHighlighted={activeExplainKey === 'sponsors'}
                    onSectionClick={speakAbout}
                  />
                </SectionErrorBoundary>

                {/* Pre-Footer Dual High-CTR Graphic Sponsor Banner Deck */}
                <div className="no-print w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-8 flex flex-col items-center space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 w-full">
                    <AdSlot
                      format="300x250"
                      contextZone="projects-media"
                      initialIndex={0}
                    />
                    <AdSlot
                      format="300x250"
                      contextZone="hosting-community"
                      initialIndex={1}
                    />
                  </div>
                  <SponsoredLink label="Explore Featured Cloud & Remote Ops Sponsor Offer" />
                </div>
              </div>
            }
          />
        </SectionErrorBoundary>
      </main>

      {/* Persistent Floating Character in Bottom-Left Corner in Front of Gravatar Portfolio */}
      <FloatingAssistant
        avatarState={avatarState}
        audioLevel={audioLevel}
        phonemeWeight={phonemeWeight}
        currentCaption={currentCaption}
        activeExplainKey={activeExplainKey}
        pendingNavigationUrl={pendingNavigationUrl}
        onAssistantClick={() => {
          if (avatarState === 'idle') {
            speakAbout(activeExplainKey || 'header');
          }
        }}
        onMicToggle={handleMicToggle}
        isMicActive={isMicActive}
        onStopSpeech={() => {
          audioEngine.stopCurrentAudio();
          setAvatarState('idle');
          setPendingNavigationUrl(null);
        }}
        onReplaySpeech={() => {
          if (lastSpokenTextRef.current) {
            speakText(lastSpokenTextRef.current, undefined, activeLanguage);
          }
        }}
        onSkipToPendingUrl={() => {
          if (pendingNavigationUrl) {
            window.location.href = pendingNavigationUrl;
          }
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenChat={handleOpenChat}
        onOpenLiveVoice={handleOpenLiveVoice}
      />

      {/* Embed Modal */}
      <EmbedModal
        isOpen={isEmbedModalOpen}
        onClose={() => setIsEmbedModalOpen(false)}
      />

      {/* Sign Up / Sign In & Subscriber Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
        currentUser={currentUser}
        authError={authListenerError}
        onClearAuthError={() => setAuthListenerError(null)}
        onUserChanged={(user) => applyAuthSessionUser(user)}
        onAnnounce={(text) => speakText(text)}
      />

      {/* Standalone Camellia Persona Identity Face Verification Modal */}
      <FaceVerificationModal
        isOpen={isPersonaVerifyOpen}
        mode="persona_identity"
        uid={currentUser?.uid}
        onClose={() => setIsPersonaVerifyOpen(false)}
        onVerified={(_faceCapture, audit) => {
          if (audit) {
            setVerifiedPersonaPass(audit);
          }
        }}
        onAnnounce={(text) => speakText(text, undefined, activeLanguage)}
      />

      {/* Automated Newsletter Subscription Option (Triggered after 10+ minutes or 3+ visits) */}
      <NewsletterSubscribePopup
        theme={theme}
        onAnnounce={(text) => speakText(text)}
      />

      {/* Upgraded Camellia AI Chat Assistant (Lazy-Loaded & Error-Isolated) */}
      <SectionErrorBoundary sectionName="Camellia AI Chat">
        <React.Suspense fallback={null}>
          {isChatPanelOpen && (
            <CamelliaChatPanel
              isOpen={isChatPanelOpen}
              onClose={() => setIsChatPanelOpen(false)}
              activeLanguage={activeLanguage}
              onSelectLanguage={handleLanguageChange}
              profile={profile}
              onOpenLiveVoice={handleOpenLiveVoice}
              queuedPrompt={queuedChatPrompt}
            />
          )}
        </React.Suspense>
      </SectionErrorBoundary>

      {/* Neural Semantic Search Command Palette (Cmd/Ctrl+K) */}
      <SectionErrorBoundary sectionName="Semantic Search">
        <React.Suspense fallback={null}>
          {isSearchOpen && (
            <SemanticCommandPalette
              isOpen={isSearchOpen}
              onClose={() => setIsSearchOpen(false)}
              onJumpToSection={handleJumpToSearchMatch}
              onOpenLiveVoice={handleOpenLiveVoice}
              onAskCamellia={(q) => {
                setQueuedChatPrompt({ id: `q-${Date.now()}`, text: q });
                setIsChatPanelOpen(true);
              }}
            />
          )}
        </React.Suspense>
      </SectionErrorBoundary>

      {/* Real-Time Full-Duplex Native Voice & Vision Studio */}
      <SectionErrorBoundary sectionName="Live Voice Studio">
        <React.Suspense fallback={null}>
          {isLiveVoiceOpen && (
            <LiveVoiceModal
              isOpen={isLiveVoiceOpen}
              onClose={() => setIsLiveVoiceOpen(false)}
              activeLanguage={activeLanguage}
            />
          )}
        </React.Suspense>
      </SectionErrorBoundary>
    </div>
  );
}
