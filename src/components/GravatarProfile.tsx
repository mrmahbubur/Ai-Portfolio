import React, { useState, useMemo, useEffect } from 'react';
import { motion, useReducedMotion, type Variants } from 'motion/react';
import { BioProfile, Project } from '../types';
import { WebsiteThumbnail } from './WebsiteThumbnail';
import { DownloadCvBar } from './DownloadCvBar';
import { type FaceVerificationAudit } from './FaceVerificationModal';
import { SitePoliciesModal } from './SitePoliciesModal';
import { AdSlot } from './AdSlot';
import { PWAInstallButton } from './PWAInstallButton';
import {
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Tv,
  ShoppingBag,
  HeartHandshake,
  BookOpen,
  Globe,
  Mail,
  Calendar,
  Linkedin,
  Github,
  Twitter,
  Send,
  Volume2,
  RefreshCw,
  Sparkles,
  Check,
  Copy,
  Download,
  Smartphone,
  ChevronDown,
  ChevronUp,
  Briefcase,
  X,
  Eye,
  Radio,
  Search,
  Share2,
  ScanFace,
  BadgeCheck,
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

interface GravatarProfileProps {
  profile: BioProfile;
  activeExplainKey: string | null;
  pendingNavigationUrl?: string | null;
  onSendInquiry: (name: string, email: string, note: string) => Promise<any> | void;
  onNavigateDirectly?: (url: string) => void;
  isSyncingGravatar?: boolean;
  onSyncGravatar?: () => void;
  lastGravatarSync?: Date | null;
  onAnnounceDownload?: (text: string) => void;
  onSectionClick?: (key: string) => void;
  currentUser?: any;
  onOpenAuthModal?: (tab?: 'signin' | 'signup') => void;
  onOpenSearch?: () => void;
  onOpenLiveVoice?: () => void;
  onAskAboutProject?: (project: Project) => void;
  verifiedPersonaPass?: FaceVerificationAudit | null;
  onOpenPersonaVerify?: () => void;
  onPassVerified?: (audit: FaceVerificationAudit) => void;
  renderBeforeFooter?: React.ReactNode;
}

type ProjectFilterCategory = 'all' | 'web' | 'iptv' | 'commerce' | 'charity';

const sectionVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: (customDelay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      delay: customDelay,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const cardContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

const cardItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 14,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const GravatarProfile: React.FC<GravatarProfileProps> = ({
  profile,
  activeExplainKey,
  onSendInquiry,
  onAnnounceDownload,
  onSectionClick,
  currentUser,
  onOpenAuthModal,
  onOpenSearch,
  onOpenLiveVoice,
  onAskAboutProject,
  verifiedPersonaPass,
  onOpenPersonaVerify,
  onPassVerified,
  renderBeforeFooter,
}) => {
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryNote, setInquiryNote] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState<'idle' | 'sending' | 'smtp_success' | 'direct_ready'>('idle');
  const [lastDirectUrls, setLastDirectUrls] = useState<{ gmailUrl: string; mailtoUrl: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedWalletIndex, setCopiedWalletIndex] = useState<number | null>(null);
  const [showPoliciesModal, setShowPoliciesModal] = useState<boolean>(false);
  const [activePolicyTab, setActivePolicyTab] = useState<string>('terms-of-service');
  const [backendPolicies, setBackendPolicies] = useState<{ copyrightText?: string; effectiveYear?: number } | null>(null);

  useEffect(() => {
    fetch('/api/policies/current')
      .then((r) => r.json())
      .then((data) => {
        if (data?.copyrightText) setBackendPolicies(data);
      })
      .catch(() => {});
  }, []);
  const [isAboutExpanded, setIsAboutExpanded] = useState(false);
  const [projectFilter, setProjectFilter] = useState<ProjectFilterCategory>('all');
  const [inspectedProject, setInspectedProject] = useState<Project | null>(null);
  const [copiedProjectUrl, setCopiedProjectUrl] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && inspectedProject) {
        setInspectedProject(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectedProject]);

  const handleCopyWallet = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedWalletIndex(index);
    setTimeout(() => setCopiedWalletIndex(null), 2000);
  };

  const recipientEmail = profile.socials?.email || 'mr216873@gmail.com';

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryName.trim() || !inquiryNote.trim()) return;

    setInquiryStatus('sending');

    const trimmedName = inquiryName.trim().slice(0, 100);
    const rawEmail = inquiryEmail.trim();
    const validEmail = (rawEmail.length >= 3 ? rawEmail : 'visitor@example.com').slice(0, 128);
    const trimmedSubject = `Portfolio Inquiry from ${trimmedName}`.slice(0, 200);
    const trimmedMessage = inquiryNote.trim().slice(0, 2000);

    const result = await onSendInquiry(inquiryName, inquiryEmail, inquiryNote);

    try {
      await addDoc(collection(db, 'inquiries'), {
        name: trimmedName,
        email: validEmail,
        subject: trimmedSubject,
        message: trimmedMessage,
        createdAt: new Date().toISOString(),
      });
    } catch (fErr) {
      if (fErr instanceof Error && fErr.message.toLowerCase().includes('permission')) {
        handleFirestoreError(fErr, OperationType.CREATE, 'inquiries');
      }
      console.warn('Non-fatal Firestore inquiry notice:', fErr);
    }

    const encodedSubject = encodeURIComponent(`Portfolio Inquiry from ${inquiryName}`);
    const encodedBody = encodeURIComponent(
      `Hello M R S,\n\nSender: ${inquiryName}\nEmail: ${inquiryEmail || 'visitor@example.com'}\nDate: ${new Date().toUTCString()}\n\nMessage:\n${inquiryNote}\n\n--\nSent via M R S Interactive Portfolio`
    );
    const gmailUrl =
      result?.directGmailUrl ||
      `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${encodedSubject}&body=${encodedBody}`;
    const mailtoUrl =
      result?.mailtoUrl ||
      `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;

    setLastDirectUrls({ gmailUrl, mailtoUrl });

    if (result?.smtpDelivered) {
      setInquiryStatus('smtp_success');
      setTimeout(() => {
        setInquiryStatus('idle');
      }, 7000);
      setInquiryName('');
      setInquiryEmail('');
      setInquiryNote('');
    } else {
      setInquiryStatus('direct_ready');
    }
  };

  const getDirectComposeUrls = () => {
    const encodedSubject = encodeURIComponent(`Portfolio Inquiry from ${inquiryName || 'Visitor'}`);
    const encodedBody = encodeURIComponent(
      `Hello M R S,\n\nSender: ${inquiryName || 'Visitor'}\nEmail: ${inquiryEmail || 'visitor@example.com'}\nDate: ${new Date().toUTCString()}\n\nMessage:\n${inquiryNote || 'Hello M R S, I would like to get in touch regarding your IT support and web management services.'}\n\n--\nSent via M R S Interactive Portfolio`
    );
    const gmailUrl =
      lastDirectUrls?.gmailUrl ||
      `https://mail.google.com/mail/?view=cm&fs=1&to=${recipientEmail}&su=${encodedSubject}&body=${encodedBody}`;
    const mailtoUrl =
      lastDirectUrls?.mailtoUrl ||
      `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    return { gmailUrl, mailtoUrl };
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(recipientEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const handleCopyProfileUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = window.location.href || profile.socials?.gravatarUrl || 'https://gravatar.com/mrxshahin';
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${profile.ownerName || 'M R S'} — Executive Portfolio & AI Concierge`,
          text: profile.roleTitle,
          url,
        });
        return;
      } catch {
        // User cancelled or Web Share unsupported in current context; fall back to copy
      }
    }
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const isHighlighted = (key: string) => activeExplainKey === key;
  const avatarImageSrc = profile.avatarUrl || '/mrs_profile_avatar.jpg';
  const gravatarHandle = profile.gravatarUsername || 'mrxshahin';

  const shouldReduceMotion = useReducedMotion();

  const activeSectionVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.2 } },
      }
    : sectionVariants;

  const activeContainerVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
      }
    : cardContainerVariants;

  const activeItemVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.15 } },
      }
    : cardItemVariants;

  // Categorize projects for clean segmented filtering
  const classifyProject = (proj: Project): ProjectFilterCategory => {
    const checkStr = `${proj.id} ${proj.category || ''} ${proj.title || ''} ${proj.badge || ''}`.toLowerCase();
    if (checkStr.includes('iptv') || checkStr.includes('stream') || checkStr.includes('apk') || /\btv\b/.test(checkStr)) {
      return 'iptv';
    }
    if (
      checkStr.includes('camellia shop') ||
      checkStr.includes('commerce') ||
      (checkStr.includes('shop') && !checkStr.includes('apps store')) ||
      (checkStr.includes('store') && !checkStr.includes('apps store'))
    ) {
      return 'commerce';
    }
    if (checkStr.includes('charity') || checkStr.includes('humanitarian') || checkStr.includes('foundation')) {
      return 'charity';
    }
    return 'web';
  };

  const filteredProjects = useMemo(() => {
    const list = profile.projects || [];
    if (projectFilter === 'all') return list;
    return list.filter((p) => classifyProject(p) === projectFilter);
  }, [profile.projects, projectFilter]);

  const cleanProjectTitle = (rawTitle: string) => {
    return (
      (rawTitle || '')
        .replace(/^(\s*M\s*R\s*S\s*|M\.R\.S\.\s*|Mrs\.?\s*)[-–—:]?\s*/i, '')
        .replace(/\bM\s*R\s*S\b/gi, '')
        .replace(/\bMrs\b/g, '')
        .trim() || rawTitle
    );
  };

  // Strip certificate, course, IELTS, and academic education references from site bio narrative
  // (all certificates and academic education details remain preserved exclusively inside the CV PDF)
  const cleanSiteBioNarrative = (rawBio: string) => {
    if (!rawBio) return '';
    return rawBio
      .replace(/\s*I hold a comprehensive 360-hour basic computer course certification[^.\n]*\./gi, '')
      .split(/\r?\n/)
      .filter((line) => {
        const lower = line.toLowerCase();
        if (/\*\*\s*certified:\s*\*\*/i.test(lower) || /360-hour|360 hrs|course certification|\bielts\b/i.test(lower)) {
          return false;
        }
        if (/academic education|bachelor of social science|sylhet government college|tajpur degree college|mongol chondi/i.test(lower)) {
          return false;
        }
        return true;
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  return (
    <div className="w-full selection:bg-[var(--gold)]/25">
      {/* 1. Full-Screen Split Executive Hero + Full-Width 4-Column Capability Strip */}
      <motion.header
        id="profile-header"
        data-explain="header"
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        custom={0}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('a, button, input, textarea')) {
            onSectionClick?.('header');
          }
        }}
        className={`futuristic-card-glow relative w-full overflow-hidden bg-gradient-to-b from-[var(--panel)]/65 to-[var(--bg)] transition-all duration-200 group cursor-pointer lg:min-h-[calc(100svh-96px)] flex flex-col justify-between ${
          isHighlighted('header') ? 'ring-1 ring-inset ring-[var(--gold)]/60' : ''
        }`}
      >
        {/* Top Split-Screen Hero Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch flex-1">
          {/* Left Column: Typographic Hierarchy & Primary Executive Actions */}
          <div className="lg:col-span-8 px-5 py-8 sm:px-8 sm:py-10 lg:px-14 xl:px-20 2xl:px-28 lg:py-14 xl:py-16 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Unboxed Metadata Kicker (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5 text-[var(--gold)] font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Verified Executive Profile</span>
                </span>
                <span aria-hidden="true">·</span>
                <span>{profile.location || 'Global / Remote'}</span>
                <span aria-hidden="true">·</span>
                <span>@{gravatarHandle}</span>
              </div>

              {/* Balanced Display Headline */}
              <div className="space-y-2">
                <h1
                  className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold tracking-tight text-[var(--text)]"
                  style={{ textWrap: 'balance' }}
                >
                  {profile.ownerName || 'M R S'}
                </h1>
                <p
                  className="text-base sm:text-lg lg:text-xl font-medium text-[var(--gold)] leading-snug max-w-2xl"
                  style={{ textWrap: 'balance' }}
                >
                  {profile.roleTitle}
                </p>
              </div>

              {/* Concise Executive Lead Paragraph */}
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-[68ch]">
                IT Support Specialist, Remote Administrator, and Digital Entrepreneur dedicated to keeping business systems, Microsoft 365 environments, technical documentation, and multi-platform web operations running with precision.
              </p>
            </div>

            {/* Single-Line Action Bar */}
            <div className="pt-5 mt-5 flex flex-wrap items-center gap-2 sm:gap-3">
              <a
                href="#contact"
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Direct Contact</span>
              </a>

              <a
                href={profile.socials?.calendlyUrl || 'https://calendly.com/mrxshahin'}
                target="_blank"
                rel="noopener noreferrer"
                data-allow-navigation="true"
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--text)] hover:text-[var(--gold)] text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--gold)] shrink-0" />
                <span>Book Consultation</span>
              </a>

              <a
                href="#cv-download-bar"
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--text)] hover:text-[var(--gold)] text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--gold)] shrink-0" />
                <span>Download CV (PDF)</span>
              </a>

              {onOpenLiveVoice && (
                <button
                  type="button"
                  onClick={onOpenLiveVoice}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[var(--gold)]/15 hover:bg-[var(--gold)]/25 text-[var(--gold)] text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Live Voice AI</span>
                </button>
              )}

              {onOpenSearch && (
                <button
                  type="button"
                  onClick={onOpenSearch}
                  title="Semantic Search across Projects, Services & Sponsors (Ctrl+K)"
                  className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--text)] hover:text-[var(--gold)] text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
                >
                  <Search className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                  <span>Search</span>
                  <kbd className="hidden sm:inline font-mono text-[10px] text-[var(--text-muted)]">⌘K</kbd>
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyProfileUrl}
                className="px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--gold)] text-xs sm:text-sm font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[40px]"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0" />
                    <span className="text-[var(--success-text)]">Link Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                    <span>Share Hub</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Portrait Visual Anchor & Audio Briefing / Persona Face Verify */}
          <div className="lg:col-span-4 bg-[var(--panel-raised)]/35 px-5 py-8 sm:px-8 sm:py-10 lg:pr-14 xl:pr-20 2xl:pr-28 lg:pl-10 lg:py-14 flex flex-col items-center justify-between text-center relative">
            <div className="w-full flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] mb-4">
              {verifiedPersonaPass ? (
                <span className="inline-flex items-center gap-1 text-[var(--success-text)] font-semibold">
                  <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Face Verified · {verifiedPersonaPass.confidence}%</span>
                </span>
              ) : (
                <span>Verified Identity</span>
              )}
              <span>Live Gravatar Sync</span>
            </div>

            <div className="relative my-4">
              <div
                className={`w-32 h-32 sm:w-40 sm:h-40 xl:w-44 xl:h-44 rounded-full bg-[var(--panel)] p-1 ring-2 overflow-hidden shadow-[var(--shadow-panel)] group-hover:scale-[1.02] transition-transform duration-200 ${
                  verifiedPersonaPass ? 'ring-emerald-500/80' : 'ring-[var(--gold)]/70'
                }`}
              >
                <img
                  src={avatarImageSrc}
                  alt={profile.displayName || profile.ownerName || 'M R S'}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    if (
                      img.src !== window.location.origin + '/mrs_profile_avatar.jpg' &&
                      !img.src.endsWith('/mrs_profile_avatar.jpg')
                    ) {
                      img.src = '/mrs_profile_avatar.jpg';
                    }
                  }}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <div
                className={`absolute bottom-1 right-1 p-1.5 rounded-full shadow-md flex items-center justify-center ${
                  verifiedPersonaPass
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--gold)] text-[var(--gold-ink)]'
                }`}
                title={
                  verifiedPersonaPass
                    ? `Biometric Face Pass Active (${verifiedPersonaPass.verificationId || 'Verified'})`
                    : 'Verified Executive Identity'
                }
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>

            <div className="w-full pt-4 mt-2 space-y-2.5">
              <p className="text-xs text-[var(--text-secondary)]">
                Click any section or card to hear <strong className="text-[var(--text)]">{profile.personaName || 'Camellia'}</strong> narrate full details in your language.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSectionClick?.('header');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] text-[var(--gold)] text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shadow-[var(--shadow-card)]"
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span>Play Executive Audio Introduction</span>
              </button>

              {onOpenPersonaVerify && (
                <button
                  type="button"
                  id="hero-persona-face-verify-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPersonaVerify();
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                    verifiedPersonaPass
                      ? 'bg-emerald-500/12 hover:bg-emerald-500/20 text-[var(--success-text)]'
                      : 'bg-[var(--gold-tint)] hover:bg-[var(--gold)]/22 text-[var(--gold)]'
                  }`}
                >
                  {verifiedPersonaPass ? (
                    <>
                      <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                      <span>
                        Face Verified · {verifiedPersonaPass.confidence}%
                        {verifiedPersonaPass.verificationId ? ` (${verifiedPersonaPass.verificationId})` : ''}
                      </span>
                    </>
                  ) : (
                    <>
                      <ScanFace className="w-3.5 h-3.5 shrink-0" />
                      <span>Verify Visitor Face with {profile.personaName || 'Camellia'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Capability & Proof Strip Below Hero Split */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-5 sm:py-6 bg-[var(--panel-raised)]/40">
          <div className="p-4 sm:px-5 sm:py-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="text-[11px] font-mono text-[var(--text-muted)] block">
              01. Systems &amp; Support
            </span>
            <p className="text-sm font-semibold text-[var(--text)] mt-1 tabular-nums">
              Windows · Android · Networking
            </p>
            <span className="text-xs text-[var(--text-secondary)]">
              Remote Troubleshooting &amp; Diagnostics
            </span>
          </div>

          <div className="p-4 sm:px-5 sm:py-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="text-[11px] font-mono text-[var(--text-muted)] block">
              02. Live Ventures
            </span>
            <p className="text-sm font-semibold text-[var(--text)] mt-1 tabular-nums">
              {(profile.projects || []).length} Active Digital Platforms
            </p>
            <span className="text-xs text-[var(--text-secondary)]">
              Web Portals · IPTV · E-Commerce · Charity
            </span>
          </div>

          <div className="p-4 sm:px-5 sm:py-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="text-[11px] font-mono text-[var(--text-muted)] block">
              03. Core Specialization
            </span>
            <p className="text-sm font-semibold text-[var(--text)] mt-1 tabular-nums">
              Remote Admin &amp; IT Operations
            </p>
            <span className="text-xs text-[var(--text-secondary)]">
              Microsoft 365 · Documentation · Web Ops
            </span>
          </div>

          <div className="p-4 sm:px-5 sm:py-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="text-[11px] font-mono text-[var(--text-muted)] block">
              04. Multilingual Reach
            </span>
            <p className="text-sm font-semibold text-[var(--text)] mt-1 tabular-nums">
              4 Spoken Languages + AI Translation
            </p>
            <span className="text-xs text-[var(--text-secondary)]">
              English · Bengali · Hindi · Urdu
            </span>
          </div>
        </div>
      </motion.header>

      {/* Contextual Cloud & Remote Ops Sponsor Banner (Paired with Executive Hero) */}
      <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-6">
        <AdSlot
          format="468x60"
          contextZone="hero-cloud"
          initialIndex={0}
          label="Cloud & Remote IT Partner"
        />
      </div>

      {/* 2. About & Executive Capabilities Dossier */}
      <motion.section
        id="bio"
        data-explain="bio"
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        custom={0.05}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('a, button, input, textarea')) {
            onSectionClick?.('bio');
          }
        }}
        className={`futuristic-card-glow w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-10 sm:py-14 bg-[var(--panel-raised)]/35 transition-all duration-200 cursor-pointer ${
          isHighlighted('bio') ? 'ring-1 ring-inset ring-[var(--gold)]/60' : ''
        }`}
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
          <div>
            <h2
              className="text-xl sm:text-2xl font-heading font-bold tracking-tight text-[var(--text)]"
              style={{ textWrap: 'balance' }}
            >
              <span className="font-mono text-[var(--gold)] mr-2.5 tabular-nums">01.</span>
              About &amp; Professional Summary
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Official Executive Narrative · Remote Services &amp; Capabilities
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSectionClick?.('bio');
            }}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] text-xs font-medium text-[var(--gold)] transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span>Narrate Biography</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Full Gravatar Narrative */}
          <div className="lg:col-span-7 space-y-4 font-body leading-relaxed text-[var(--text)]">
            {profile.gravatarBio ? (
              (() => {
                const renderInlineMarkdown = (raw: string) => {
                  const parts = raw.split(/(\*\*[^*]+\*\*)/g);
                  return parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                      return (
                        <strong key={i} className="text-[var(--text)] font-semibold">
                          {part.slice(2, -2)}
                        </strong>
                      );
                    }
                    return <React.Fragment key={i}>{part.replace(/\*/g, '')}</React.Fragment>;
                  });
                };

                const allBlocks = cleanSiteBioNarrative(profile.gravatarBio)
                  .split(/\r?\n\r?\n/)
                  .map((b) => b.trim())
                  .filter(Boolean);
                const visibleBlocks = isAboutExpanded ? allBlocks : allBlocks.slice(0, 4);

                return (
                  <>
                    {visibleBlocks.map((block, idx) => {
                      const trimmed = block.trim();
                      if (!trimmed) return null;

                      if (/^#{1,4}\s+/.test(trimmed) && !trimmed.includes('\n')) {
                        const headingText = trimmed.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '').trim();
                        return (
                          <h3
                            key={idx}
                            className="text-base sm:text-lg font-heading font-semibold text-[var(--gold)] pt-3 pb-1 tracking-tight"
                          >
                            {headingText}
                          </h3>
                        );
                      }

                      if (
                        (trimmed.startsWith('**') && trimmed.endsWith('**')) ||
                        (trimmed.endsWith(':') && !trimmed.includes('\n')) ||
                        (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*\*\*[^*]+\*\*$/u.test(trimmed) && !trimmed.includes('\n'))
                      ) {
                        const headingText = trimmed.replace(/\*\*/g, '').trim();
                        return (
                          <h3
                            key={idx}
                            className="text-base sm:text-lg font-heading font-semibold text-[var(--gold)] pt-3 pb-1 tracking-tight"
                          >
                            {headingText}
                          </h3>
                        );
                      }

                      if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**') && !trimmed.includes('\n')) {
                        const italicText = trimmed.replace(/^\*|\*$/g, '').trim();
                        return (
                          <p
                            key={idx}
                            className="text-sm sm:text-base font-heading italic text-[var(--gold)] font-medium pb-1"
                          >
                            {italicText}
                          </p>
                        );
                      }

                      const lines = trimmed.split(/\r?\n/);
                      const hasListItems = lines.some((l) => {
                        const t = l.trim();
                        return (
                          t.startsWith('- ') ||
                          t.startsWith('* ') ||
                          /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(t)
                        );
                      });

                      if (hasListItems && lines.length > 1) {
                        const introLines: string[] = [];
                        const listItems: string[] = [];

                        lines.forEach((line, lineIdx) => {
                          const lTrim = line.trim();
                          if (lTrim.startsWith('- ') || lTrim.startsWith('* ')) {
                            listItems.push(lTrim.replace(/^[-*]\s+/, ''));
                          } else if (
                            /^#{1,4}\s+/.test(lTrim) ||
                            (lineIdx === 0 && /^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*\*\*/u.test(lTrim))
                          ) {
                            introLines.push(lTrim.replace(/^#{1,4}\s+/, ''));
                          } else if (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(lTrim)) {
                            listItems.push(lTrim);
                          } else if (lTrim) {
                            introLines.push(lTrim);
                          }
                        });

                        return (
                          <div key={idx} className="space-y-2.5">
                            {introLines.length > 0 && (
                              <h3 className="text-sm sm:text-base font-heading text-[var(--gold)] font-semibold leading-relaxed pt-1">
                                {renderInlineMarkdown(introLines.join(' '))}
                              </h3>
                            )}
                            {listItems.length > 0 && (
                              <ul className="space-y-2 pl-1">
                                {listItems.map((item, itemIdx) => {
                                  const boldMatch = item.match(/^\*\*([^*]+)\*\*(.*)/);
                                  if (boldMatch) {
                                    return (
                                      <li
                                        key={itemIdx}
                                        className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed flex items-start gap-2.5"
                                      >
                                        <span className="text-[var(--gold)] font-mono select-none">·</span>
                                        <span>
                                          <strong className="text-[var(--text)] font-semibold">
                                            {boldMatch[1]}
                                          </strong>
                                          {renderInlineMarkdown(boldMatch[2])}
                                        </span>
                                      </li>
                                    );
                                  }
                                  return (
                                    <li
                                      key={itemIdx}
                                      className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed flex items-start gap-2.5"
                                    >
                                      <span className="text-[var(--gold)] font-mono select-none">·</span>
                                      <span>{renderInlineMarkdown(item)}</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>
                        );
                      }

                      return (
                        <p
                          key={idx}
                          className="text-sm sm:text-base text-[var(--text-secondary)] font-normal leading-relaxed max-w-[68ch]"
                        >
                          {renderInlineMarkdown(trimmed)}
                        </p>
                      );
                    })}

                    {allBlocks.length > 4 && (
                      <div className="pt-3">
                        <button
                          type="button"
                          id="toggle-about-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAboutExpanded(!isAboutExpanded);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-raised)]/80 hover:bg-[var(--panel-hover)] text-[var(--gold)] text-xs font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap"
                        >
                          <span>{isAboutExpanded ? 'Show Concise Summary' : 'Read Full Executive Narrative'}</span>
                          {isAboutExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-[var(--gold)]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-[var(--gold)]" />
                          )}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <p className="font-body text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                {profile.aboutDetails}
              </p>
            )}
          </div>

          {/* Right Column: Structured Remote Capabilities & Working Languages */}
          <div className="lg:col-span-5 space-y-5 lg:pl-8">
            {/* What I Can Help With (Core Remote Services) */}
            {profile.whatICanHelpWith && profile.whatICanHelpWith.length > 0 && (
              <div className="p-5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-3">
                <div className="flex items-center gap-2 text-sm font-heading font-semibold text-[var(--text)]">
                  <Briefcase className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span>Remote Services &amp; Solutions</span>
                </div>
                <ul className="space-y-2.5 pt-1">
                  {profile.whatICanHelpWith.map((service, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex items-start gap-2.5"
                    >
                      <span className="font-mono text-[var(--gold)] font-semibold tabular-nums shrink-0">
                        0{idx + 1}.
                      </span>
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Working Languages */}
            {profile.languages && profile.languages.length > 0 && (
              <div className="p-5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-3">
                <div className="flex items-center gap-2 text-sm font-heading font-semibold text-[var(--text)]">
                  <Globe className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span>Working Languages</span>
                </div>
                <div className="space-y-2">
                  {profile.languages.map((lang, idx) => (
                    <div key={idx} className="py-1.5 flex items-center justify-between gap-3">
                      <span className="text-xs sm:text-sm font-semibold text-[var(--text)]">
                        {lang.name}
                      </span>
                      <span className="text-xs font-mono text-[var(--gold)]">
                        {lang.level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Link to Downloadable CV for Certificates & Education */}
            <div className="p-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text)]">
                  Full Executive Resume (PDF)
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Certificates &amp; academic history included inside downloadable CV
                </p>
              </div>
              <a
                href="#cv-download-bar"
                className="px-3.5 py-2 rounded-xl bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--gold)] text-xs font-medium whitespace-nowrap shrink-0 transition-colors"
              >
                Open CV
              </a>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Contextual Productivity & M365 Banner */}
      <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-6">
        <div className="hidden md:block">
          <AdSlot
            format="728x90"
            contextZone="credentials-productivity"
            initialIndex={0}
            label="Featured Partner · MS 365 & Cloud Workspaces"
          />
        </div>
        <div className="block md:hidden">
          <AdSlot
            format="468x60"
            contextZone="credentials-productivity"
            initialIndex={0}
            label="Featured Partner · MS 365 & Cloud Workspaces"
          />
        </div>
      </div>

      {/* 3. Featured Platforms & Projects with Segmented Filter & Lightbox Preview */}
      <motion.section
        id="links"
        data-explain="links"
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.08 }}
        custom={0}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('a, button, input, textarea')) {
            onSectionClick?.('links');
          }
        }}
        className={`futuristic-card-glow w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-10 sm:py-14 bg-[var(--bg)] transition-all duration-200 cursor-pointer ${
          isHighlighted('links') ? 'ring-1 ring-inset ring-[var(--gold)]/60' : ''
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7">
          <div>
            <h2
              className="text-xl sm:text-2xl font-heading font-bold text-[var(--text)] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              <span className="font-mono text-[var(--gold)] mr-2.5 tabular-nums">02.</span>
              Featured Platforms &amp; Live Ventures
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Click any platform to hear Camellia explain its architecture, or launch directly
            </p>
          </div>

          {/* Interactive Segmented Category Filter Controls */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] overflow-x-auto no-speak"
            role="tablist"
            aria-label="Filter projects by category"
          >
            {(
              [
                { id: 'all', label: `All (${(profile.projects || []).length})` },
                { id: 'web', label: 'Web & Apps' },
                { id: 'iptv', label: 'IPTV & Media' },
                { id: 'commerce', label: 'E-Commerce' },
                { id: 'charity', label: 'Humanitarian' },
              ] as { id: ProjectFilterCategory; label: string }[]
            ).map((tab) => {
              const active = projectFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={(e) => {
                    e.stopPropagation();
                    const docAny = document as any;
                    if (!shouldReduceMotion && typeof docAny.startViewTransition === 'function') {
                      docAny.startViewTransition(() => setProjectFilter(tab.id));
                    } else {
                      setProjectFilter(tab.id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.96] cursor-pointer whitespace-nowrap shrink-0 touch-manipulation ${
                    active
                      ? 'bg-[var(--gold)] text-[var(--gold-ink)] font-semibold shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Project Bento Grid */}
        <motion.div
          variants={activeContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5"
        >
          {filteredProjects.map((proj, idx) => {
            const isProjActive =
              isHighlighted(proj.id) || isHighlighted(proj.id.replace('proj-', ''));
            const cleanTitle = cleanProjectTitle(proj.title);
            const checkStr = `${proj.id} ${proj.category || ''} ${cleanTitle}`.toLowerCase();
            const projectUrl = proj.link || 'https://gravatar.com/mrxshahin';
            const domain = (() => {
              try {
                return new URL(projectUrl).hostname.replace(/^www\./, '');
              } catch {
                return 'live-platform';
              }
            })();
            const faviconUrl = domain
              ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
              : null;

            const projectIcon = (() => {
              if (checkStr.includes('apk') || checkStr.includes('download')) {
                return <Download className="w-4 h-4" />;
              }
              if (checkStr.includes('app') || checkStr.includes('mobile')) {
                return <Smartphone className="w-4 h-4" />;
              }
              if (checkStr.includes('iptv') || checkStr.includes('stream') || checkStr.includes('tv')) {
                return <Tv className="w-4 h-4" />;
              }
              if (checkStr.includes('store') || checkStr.includes('commerce') || checkStr.includes('shop')) {
                return <ShoppingBag className="w-4 h-4" />;
              }
              if (checkStr.includes('charity') || checkStr.includes('humanitarian') || checkStr.includes('foundation')) {
                return <HeartHandshake className="w-4 h-4" />;
              }
              if (checkStr.includes('blog') || checkStr.includes('guide') || checkStr.includes('article')) {
                return <BookOpen className="w-4 h-4" />;
              }
              if (checkStr.includes('ai') || checkStr.includes('assistant') || checkStr.includes('bot')) {
                return <Sparkles className="w-4 h-4" />;
              }
              return <Globe className="w-4 h-4" />;
            })();

            return (
              <motion.div
                variants={activeItemVariants}
                key={`${proj.id || 'proj'}-${idx}`}
                data-explain={proj.id}
                onPointerMove={(e) => {
                  if (e.pointerType === 'touch') return;
                  const el = e.currentTarget;
                  const rect = el.getBoundingClientRect();
                  el.style.setProperty('--mx', `${Math.round(e.clientX - rect.left)}px`);
                  el.style.setProperty('--my', `${Math.round(e.clientY - rect.top)}px`);
                }}
                onClick={() => {
                  onSectionClick?.(proj.id);
                }}
                className={`link-card futuristic-card-glow w-full p-4 sm:p-5 rounded-xl transition-all duration-200 group flex flex-col justify-between cursor-pointer ${
                  isProjActive
                    ? 'bg-[var(--panel-raised)] ring-1 ring-[var(--gold)]/70 shadow-[var(--shadow-panel)]'
                    : ''
                }`}
              >
                <div>
                  {/* Live Website Screenshot Thumbnail */}
                  <WebsiteThumbnail
                    url={projectUrl}
                    title={cleanTitle}
                    badge={proj.badge || proj.category}
                    customImage={proj.customThumbnail}
                    className="mb-3.5 rounded-lg overflow-hidden"
                  />

                  {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)] mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[var(--gold)] truncate max-w-[170px]">
                      {faviconUrl ? (
                        <img
                          src={faviconUrl}
                          alt=""
                          aria-hidden="true"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                          className="w-3.5 h-3.5 object-contain shrink-0"
                        />
                      ) : (
                        projectIcon
                      )}
                      <span className="truncate">{domain}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{proj.badge || proj.category || 'Platform'}</span>
                  </div>

                  <h3 className="text-base sm:text-lg font-heading font-semibold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors duration-150 line-clamp-1">
                    {cleanTitle}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 leading-relaxed font-normal line-clamp-2">
                    {proj.description}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 mt-4">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSectionClick?.(proj.id);
                      }}
                      title="Listen to Camellia explain this platform"
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors duration-150 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Volume2 className="w-3 h-3 text-[var(--gold)] shrink-0" />
                      <span>Narrate</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInspectedProject(proj);
                        onSectionClick?.(proj.id);
                      }}
                      title="Inspect full platform overview"
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors duration-150 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Eye className="w-3 h-3 text-[var(--gold)] shrink-0" />
                      <span>Preview</span>
                    </button>
                  </div>

                  <a
                    href={projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-allow-navigation="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSectionClick?.(proj.id);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[var(--gold)]/15 hover:bg-[var(--gold)] text-[var(--gold)] hover:text-[var(--gold-ink)] text-xs font-medium transition-colors duration-150 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

      {/* Contextual Media, Streaming & Dev Banner (Paired with Live Ventures & IPTV Platforms) */}
      <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-6">
        <div className="hidden md:block">
          <AdSlot
            format="728x90"
            contextZone="projects-media"
            initialIndex={0}
            label="Partner Spotlight · Streaming, Apps & Web Automation"
          />
        </div>
        <div className="block md:hidden">
          <AdSlot
            format="468x60"
            contextZone="projects-media"
            initialIndex={0}
            label="Partner Spotlight · Streaming & Apps"
          />
        </div>
      </div>

      {/* 4. Interests & Core Competencies */}
      <motion.section
        id="interests"
        data-explain="interests"
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.12 }}
        custom={0}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('a, button, input, textarea')) {
            onSectionClick?.('interests');
          }
        }}
        className={`futuristic-card-glow w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-10 sm:py-14 bg-[var(--panel-raised)]/35 transition-all duration-200 group cursor-pointer ${
          isHighlighted('interests') ? 'ring-1 ring-inset ring-[var(--gold)]/60' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
          <div>
            <h2
              className="text-xl sm:text-2xl font-heading font-bold text-[var(--text)] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              <span className="font-mono text-[var(--gold)] mr-2.5 tabular-nums">03.</span>
              Core Competencies &amp; Technical Focus
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Enterprise IT Support · Remote Administration · Digital Publishing · Multilingual Operations
            </p>
          </div>

          {/* Unboxed Interest Focus Line */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--gold)]">
            {(profile.interests || []).map((interest, idx) => (
              <React.Fragment key={interest}>
                {idx > 0 && <span className="text-[var(--text-muted)]">·</span>}
                <span>{interest}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Key Competencies Matrix (Clean Editorial Numbering + Unboxed Typographic Lists) */}
        <motion.div
          variants={activeContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5"
        >
          {(profile.skillsList || []).map((group, idx) => (
            <motion.div
              variants={activeItemVariants}
              key={idx}
              className="futuristic-card-glow p-5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="font-heading text-sm sm:text-base font-semibold text-[var(--text)]">
                    <span className="font-mono text-[var(--gold)] mr-2 tabular-nums">
                      0{idx + 1}.
                    </span>
                    {group.category}
                  </h3>
                  <span className="text-[11px] font-mono text-[var(--text-muted)] tabular-nums">
                    {(group.skills || []).length} Capabilities
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {(group.skills || []).map((skill, sIdx) => (
                    <React.Fragment key={skill}>
                      {sIdx > 0 && (
                        <span className="mx-2 text-[var(--gold)] font-mono" aria-hidden="true">
                          ·
                        </span>
                      )}
                      <span className="text-[var(--text)] font-medium">{skill}</span>
                    </React.Fragment>
                  ))}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Contextual Cybersecurity & Zero-Trust Banner (Paired with Technical Focus) */}
      <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-6">
        <div className="hidden md:block">
          <AdSlot
            format="728x90"
            contextZone="security-privacy"
            initialIndex={0}
            label="Verified Security Partner · Endpoint Defense & Privacy"
          />
        </div>
        <div className="block md:hidden">
          <AdSlot
            format="468x60"
            contextZone="security-privacy"
            initialIndex={0}
            label="Verified Security Partner"
          />
        </div>
      </div>

      {/* 5. Official Profiles & Verified Networks Section */}
      <motion.section
        id="verified"
        data-explain="verified"
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.12 }}
        custom={0}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('a, button, input, textarea')) {
            onSectionClick?.('verified');
          }
        }}
        className={`futuristic-card-glow w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-10 sm:py-14 bg-[var(--bg)] transition-all duration-200 group cursor-pointer ${
          isHighlighted('verified') ? 'ring-1 ring-inset ring-[var(--gold)]/60' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3 mb-7">
          <div>
            <h2
              className="text-xl sm:text-2xl font-heading font-bold text-[var(--text)] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              <span className="font-mono text-[var(--gold)] mr-2.5 tabular-nums">04.</span>
              Official Profiles &amp; Verified Networks
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Authenticated social accounts, developer repositories, scheduling &amp; Web3 addresses
            </p>
          </div>
        </div>

        <motion.div
          variants={activeContainerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5"
        >
          {/* Gravatar Hub */}
          <motion.a
            variants={activeItemVariants}
            href={profile.socials.gravatarUrl || 'https://gravatar.com/mrxshahin'}
            target="_blank"
            rel="noopener noreferrer"
            data-allow-navigation="true"
            className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <ShieldCheck className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--text)] block truncate">
                  Executive Profile Hub
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                  @{gravatarHandle}
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
          </motion.a>

          {/* WordPress */}
          <motion.a
            variants={activeItemVariants}
            href={profile.socials.wordpressUrl || 'https://mrxshahin.wordpress.com'}
            target="_blank"
            rel="noopener noreferrer"
            data-allow-navigation="true"
            className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <BookOpen className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--text)] block truncate">
                  WordPress
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                  Official Site
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
          </motion.a>

          {/* LinkedIn */}
          <motion.a
            variants={activeItemVariants}
            href={profile.socials.linkedinUrl || 'https://www.linkedin.com/in/mrmahbubur'}
            target="_blank"
            rel="noopener noreferrer"
            data-allow-navigation="true"
            className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Linkedin className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--text)] block truncate">
                  LinkedIn
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                  /in/mrmahbubur
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
          </motion.a>

          {/* GitHub */}
          <motion.a
            variants={activeItemVariants}
            href={profile.socials.githubUrl || 'https://github.com/mrmahbubur'}
            target="_blank"
            rel="noopener noreferrer"
            data-allow-navigation="true"
            className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Github className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--text)] block truncate">
                  GitHub
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                  @mrmahbubur
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
          </motion.a>

          {/* X */}
          <motion.a
            variants={activeItemVariants}
            href={profile.socials.xUrl || 'https://x.com/Mrshahinx'}
            target="_blank"
            rel="noopener noreferrer"
            data-allow-navigation="true"
            className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Twitter className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--text)] block truncate">
                  X (Twitter)
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                  @Mrshahinx
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
          </motion.a>

          {/* Bluesky */}
          <motion.a
            variants={activeItemVariants}
            href={profile.socials.blueskyUrl || 'https://bsky.app/profile/mrxshahin.bsky.social'}
            target="_blank"
            rel="noopener noreferrer"
            data-allow-navigation="true"
            className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Globe className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--text)] block truncate">
                  Bluesky
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                  mrxshahin.bsky
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
          </motion.a>

          {/* Calendly */}
          <motion.a
            variants={activeItemVariants}
            href={profile.socials.calendlyUrl || 'https://calendly.com/mrxshahin'}
            target="_blank"
            rel="noopener noreferrer"
            data-allow-navigation="true"
            className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Calendar className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <div className="truncate">
                <span className="text-xs font-semibold text-[var(--text)] block truncate">
                  Calendly
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                  Book Meeting
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
          </motion.a>

          {/* Cloud / Admin Web Portal */}
          {(() => {
            const adminProj = (profile.projects || []).find((p) => /cloud|admin/i.test(`${p.id} ${p.title}`));
            const portalUrl = adminProj?.link || profile.socials.contactForm || 'https://mrmahbubur.github.io/Admin/';
            let portalHost = 'mrmahbubur.github.io';
            try {
              portalHost = new URL(portalUrl).hostname.replace(/^www\./, '');
            } catch {}
            return (
              <motion.a
                variants={activeItemVariants}
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-allow-navigation="true"
                className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Globe className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <div className="truncate">
                    <span className="text-xs font-semibold text-[var(--text)] block truncate">
                      Cloud Admin Portal
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                      {portalHost}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
              </motion.a>
            );
          })()}

          {/* Optional Goodreads if present in Gravatar */}
          {(profile.socials.goodreadsUrl ||
            (profile.verifiedAccounts || []).some((acc) => /goodreads/i.test(acc.name || acc.shortname || ''))) && (
            <motion.a
              variants={activeItemVariants}
              href={
                profile.socials.goodreadsUrl ||
                (profile.verifiedAccounts || []).find((acc) => /goodreads/i.test(acc.name || acc.shortname || ''))?.url ||
                'https://www.goodreads.com/mrxshahin'
              }
              target="_blank"
              rel="noopener noreferrer"
              data-allow-navigation="true"
              className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-colors duration-150 group/item"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <BookOpen className="w-4 h-4 text-[var(--gold)] shrink-0" />
                <div className="truncate">
                  <span className="text-xs font-semibold text-[var(--text)] block truncate">
                    Goodreads
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] block truncate">
                    Reading List
                  </span>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover/item:text-[var(--gold)] shrink-0" />
            </motion.a>
          )}
        </motion.div>

        {/* Verified Crypto Wallets */}
        {Array.isArray(profile.cryptoWallets) && profile.cryptoWallets.length > 0 && (
          <div className="mt-6 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <span className="font-mono text-xs text-[var(--text-secondary)] font-medium">
                Verified Decentralized Wallet Addresses
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profile.cryptoWallets.map((wallet, idx) => (
                <div
                  key={idx}
                  className="futuristic-card-glow flex items-center justify-between p-3.5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] text-xs font-mono"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className="text-[var(--gold)] font-bold uppercase shrink-0">
                      {wallet.type}
                    </span>
                    <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                    <span className="truncate text-[var(--text-secondary)] text-[11px]" title={wallet.address}>
                      {wallet.address}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyWallet(wallet.address, idx);
                    }}
                    title={`Copy ${wallet.type} address`}
                    className="p-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors shrink-0 cursor-pointer"
                  >
                    {copiedWalletIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-[var(--success-text)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>

      {/* Contextual Web Hosting & Global CDN Banner (Paired with Verified Networks) */}
      <div className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-6">
        <div className="hidden md:block">
          <AdSlot
            format="728x90"
            contextZone="hosting-community"
            initialIndex={0}
            label="Network Partner · Edge Hosting & CDN Acceleration"
          />
        </div>
        <div className="block md:hidden">
          <AdSlot
            format="468x60"
            contextZone="hosting-community"
            initialIndex={0}
            label="Network Partner · Edge Hosting"
          />
        </div>
      </div>

      {/* 6. Direct Contact & Guaranteed Delivery (AGENTS.md Rule 5 Compliant) */}
      <motion.section
        id="contact"
        data-explain="contact"
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        custom={0}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('a, button, input, textarea, form')) {
            onSectionClick?.('contact');
          }
        }}
        className={`futuristic-card-glow w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-10 sm:py-14 bg-[var(--panel-raised)]/35 transition-all duration-200 cursor-pointer ${
          isHighlighted('contact') ? 'ring-1 ring-inset ring-[var(--gold)]/60' : ''
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
          <div>
            <h2
              className="text-xl sm:text-2xl font-heading font-bold text-[var(--text)] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              <span className="font-mono text-[var(--gold)] mr-2.5 tabular-nums">05.</span>
              Direct Contact &amp; Consultation Dispatch
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Direct dispatch to {recipientEmail} · Instant Gmail Web &amp; Mail Client options
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Left Column: Verified Contact Details & 1-Click Direct Compose Actions */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="futuristic-card-glow p-5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-4">
              <div>
                <span className="font-mono text-[11px] text-[var(--text-muted)] block mb-1">
                  Verified Target Recipient
                </span>
                <div className="flex items-center justify-between gap-2">
                  <a
                    href={`mailto:${recipientEmail}`}
                    className="font-mono text-sm sm:text-base text-[var(--gold)] hover:underline flex items-center gap-2 break-all font-semibold"
                  >
                    <Mail className="w-4 h-4 text-[var(--gold)] shrink-0" />
                    <span>{recipientEmail}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    title="Copy Email Address"
                    className="px-2.5 py-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[var(--success-text)]" />
                        <span className="text-[var(--success-text)]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-3 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">Direct Phone:</span>
                  <a
                    href={`tel:${profile.socials?.phone || '+8809611056361'}`}
                    className="hover:text-[var(--gold)] transition-colors tabular-nums"
                  >
                    {profile.socials?.phone || '+8809611056361'}
                  </a>
                </div>
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span className="text-[var(--text-muted)]">Operating Base:</span>
                  <span>{profile.location || 'Global / Remote'}</span>
                </div>
              </div>

              {/* Direct 1-Click Compose Buttons on Contact Card (Rule 5) */}
              <div className="pt-3 space-y-2">
                <span className="font-mono text-[11px] text-[var(--text-muted)] block">
                  1-Click Direct Compose
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={getDirectComposeUrls().gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-allow-navigation="true"
                    className="px-3 py-2 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-xs font-medium text-[var(--text)] hover:text-[var(--gold)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Mail className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                    <span>Open Gmail Web</span>
                  </a>

                  <a
                    href={getDirectComposeUrls().mailtoUrl}
                    data-allow-navigation="true"
                    className="px-3 py-2 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-xs font-medium text-[var(--text)] hover:text-[var(--gold)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                    <span>Default Mail App</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="futuristic-card-glow p-5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[11px] text-[var(--text-muted)] block">
                  Live Calendar Scheduling
                </span>
                <p className="text-xs sm:text-sm font-semibold text-[var(--text)] mt-0.5">
                  Book a 1-on-1 IT Consultation
                </p>
              </div>
              <a
                href={profile.socials.calendlyUrl || 'https://calendly.com/mrxshahin'}
                target="_blank"
                rel="noopener noreferrer"
                data-allow-navigation="true"
                className="px-3.5 py-2 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Calendly</span>
              </a>
            </div>
          </div>

          {/* Right Column: Direct Message Form with Automatic 1-Click Fallback */}
          <form
            onSubmit={handleFormSubmit}
            className="futuristic-card-glow lg:col-span-7 space-y-4 p-5 sm:p-6 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  placeholder="Alex Smith"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--bg)] ring-1 ring-[var(--border)] text-xs sm:text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all duration-150"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                  Your Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--bg)] ring-1 ring-[var(--border)] text-xs sm:text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Project Brief, IT Support Ticket, or Inquiry
              </label>
              <textarea
                required
                rows={4}
                value={inquiryNote}
                onChange={(e) => setInquiryNote(e.target.value)}
                placeholder="Describe your IT support requirement, remote administration task, or web project..."
                className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--bg)] ring-1 ring-[var(--border)] text-xs sm:text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] transition-all duration-150 resize-none"
              />
            </div>

            {inquiryStatus === 'direct_ready' && (
              <div className="p-4 rounded-xl bg-[var(--panel)] space-y-3">
                <div className="flex items-center gap-2 text-xs text-[var(--success-text)] font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Inquiry logged and pre-addressed for <strong>{recipientEmail}</strong>. Choose a 1-click dispatch option below if you also wish to send directly from your email client:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <a
                    href={getDirectComposeUrls().gmailUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-allow-navigation="true"
                    className="px-3.5 py-2 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] active:scale-[0.97] text-[var(--gold-ink)] text-xs font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap touch-manipulation shadow-xs hover:shadow-sm"
                  >
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span>Open Gmail Web (Pre-Filled)</span>
                  </a>
                  <a
                    href={getDirectComposeUrls().mailtoUrl}
                    data-allow-navigation="true"
                    className="px-3.5 py-2 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-xs font-medium text-[var(--text)] hover:text-[var(--gold)] active:scale-[0.97] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap touch-manipulation"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                    <span>Open Default Mail Client</span>
                  </a>
                </div>
              </div>
            )}

            {inquiryStatus === 'smtp_success' && (
              <div className="p-3.5 rounded-lg bg-emerald-500/12 text-[var(--success-text)] text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Message transmitted directly to {recipientEmail} via Gmail SMTP!</span>
              </div>
            )}

            <button
              type="submit"
              disabled={inquiryStatus === 'sending'}
              className="w-full py-3 px-5 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] active:scale-[0.985] disabled:opacity-50 text-[var(--gold-ink)] text-xs sm:text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:shadow-md min-h-[44px] touch-manipulation"
            >
              {inquiryStatus === 'sending' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Dispatching Inquiry to {recipientEmail}...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Direct Message to M R S</span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.section>

      {/* Download M R S CV Bar with Biometric Face Verification */}
      <motion.div
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        custom={0}
      >
        <DownloadCvBar
          profile={profile}
          uid={currentUser?.uid}
          onAnnounceDownload={onAnnounceDownload}
          onPassVerified={onPassVerified}
        />
      </motion.div>

      {/* Sponsored Directory & Pre-Footer Banner Showcase */}
      {renderBeforeFooter}

      {/* 7. Full-Bleed Editorial Footer */}
      <motion.footer
        variants={activeSectionVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.1 }}
        custom={0}
        className="w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 pt-10 pb-24 sm:pb-16 text-center text-xs text-[var(--text-muted)] space-y-4 bg-[var(--panel)]/65"
      >
        <div className="max-w-2xl mx-auto text-center text-xs text-[var(--text-secondary)] leading-relaxed px-4">
          <p>
            To receive official email briefings when new platforms launch, click{' '}
            <button
              type="button"
              className="text-[var(--gold)] font-semibold cursor-pointer hover:underline"
              onClick={() => onOpenAuthModal?.('signup')}
            >
              Sign In
            </button>{' '}
            in the navigation bar.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-xs text-[var(--text-secondary)]">
          <a href="#profile-header" className="hover:text-[var(--gold)] transition-colors">
            Profile
          </a>
          <span aria-hidden="true">·</span>
          <a href="#bio" className="hover:text-[var(--gold)] transition-colors">
            About &amp; Services
          </a>
          <span aria-hidden="true">·</span>
          <a href="#links" className="hover:text-[var(--gold)] transition-colors">
            Platforms &amp; Projects
          </a>
          <span aria-hidden="true">·</span>
          <a href="#interests" className="hover:text-[var(--gold)] transition-colors">
            Competencies
          </a>
          <span aria-hidden="true">·</span>
          <a href="#verified" className="hover:text-[var(--gold)] transition-colors">
            Verified Networks
          </a>
          <span aria-hidden="true">·</span>
          <a href="#contact" className="hover:text-[var(--gold)] transition-colors">
            Contact
          </a>
          <span aria-hidden="true">·</span>
          <a href="#sponsors" className="hover:text-[var(--gold)] transition-colors">
            Sponsored Partners
          </a>
        </div>

        {/* Dynamic Auto-Updated Legal Policies */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 text-[11px] sm:text-xs text-[var(--text-muted)] pt-1">
          <button
            type="button"
            onClick={() => {
              setActivePolicyTab('terms-of-service');
              setShowPoliciesModal(true);
            }}
            className="hover:text-[var(--gold)] transition-colors cursor-pointer"
          >
            Terms of Service
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              setActivePolicyTab('privacy-policy');
              setShowPoliciesModal(true);
            }}
            className="hover:text-[var(--gold)] transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              setActivePolicyTab('verification-policy');
              setShowPoliciesModal(true);
            }}
            className="hover:text-[var(--gold)] transition-colors cursor-pointer"
          >
            Biometric Standards
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              setActivePolicyTab('cookie-ads-policy');
              setShowPoliciesModal(true);
            }}
            className="hover:text-[var(--gold)] transition-colors cursor-pointer"
          >
            Advertising &amp; Cookies
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => {
              setActivePolicyTab('ai-ethics-policy');
              setShowPoliciesModal(true);
            }}
            className="hover:text-[var(--gold)] transition-colors cursor-pointer"
          >
            AI Ethics
          </button>
          <PWAInstallButton variant="footer" />
        </div>

        <p className="text-xs text-[var(--text-muted)] pt-1">
          {backendPolicies?.copyrightText ||
            `© 2024–${new Date().getFullYear()} M R S · IT Support Professional & Web Manager (Auto-Updated Policies)`}
        </p>
      </motion.footer>

      {/* Project Lightbox / Full Preview Modal */}
      {inspectedProject && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="project-lightbox-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedProject(null);
          }}
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--panel)] shadow-[var(--shadow-panel)] overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 bg-[var(--panel-raised)]">
              <div className="min-w-0 pr-4">
                <span className="text-[11px] font-mono text-[var(--gold)] block">
                  {inspectedProject.badge || inspectedProject.category || 'Verified Platform'}
                </span>
                <h3
                  id="project-lightbox-title"
                  className="text-lg font-heading font-bold text-[var(--text)] truncate"
                >
                  {cleanProjectTitle(inspectedProject.title)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectedProject(null)}
                aria-label="Close project preview"
                className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <WebsiteThumbnail
                url={inspectedProject.link || 'https://gravatar.com/mrxshahin'}
                title={cleanProjectTitle(inspectedProject.title)}
                badge={inspectedProject.badge || inspectedProject.category}
                customImage={inspectedProject.customThumbnail}
                className="rounded-xl overflow-hidden"
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                    Platform Overview &amp; Architecture
                  </h4>
                  <span className="text-[11px] font-mono text-[var(--gold)] truncate">
                    {(() => {
                      try {
                        return new URL(inspectedProject.link || 'https://gravatar.com/mrxshahin').hostname.replace(/^www\./, '');
                      } catch {
                        return 'verified-platform';
                      }
                    })()}
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {inspectedProject.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSectionClick?.(inspectedProject.id)}
                    className="px-3.5 py-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel-raised)] text-xs font-medium text-[var(--gold)] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Narrate</span>
                  </button>

                  {onAskAboutProject && (
                    <button
                      type="button"
                      onClick={() => {
                        const proj = inspectedProject;
                        setInspectedProject(null);
                        onAskAboutProject(proj);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel-raised)] text-xs font-medium text-[var(--text)] hover:text-[var(--gold)] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
                      <span>Ask Camellia AI</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(inspectedProject.link || 'https://gravatar.com/mrxshahin');
                      setCopiedProjectUrl(true);
                      setTimeout(() => setCopiedProjectUrl(false), 2000);
                    }}
                    className="px-3 py-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel-raised)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedProjectUrl ? <Check className="w-3.5 h-3.5 text-[var(--success-text)] shrink-0" /> : <Copy className="w-3.5 h-3.5 shrink-0" />}
                    <span>{copiedProjectUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>

                <a
                  href={inspectedProject.link || 'https://gravatar.com/mrxshahin'}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-allow-navigation="true"
                  className="px-5 py-2 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-semibold transition-colors flex items-center gap-2 ml-auto"
                >
                  <span>Visit Live Platform</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Site Policies & Compliance Modal */}
      <SitePoliciesModal
        isOpen={showPoliciesModal}
        onClose={() => setShowPoliciesModal(false)}
        defaultTab={activePolicyTab}
      />
    </div>
  );
};
