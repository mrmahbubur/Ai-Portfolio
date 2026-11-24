import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Play,
  Sun,
  Moon,
  Globe,
  Check,
  ChevronDown,
  UserPlus,
  UserCheck,
  Search,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../utils/languages';
import { PWAInstallButton } from './PWAInstallButton';
import { type AuthSessionUser } from '../lib/firebase';

interface HeaderHUDProps {
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenEmbed?: () => void;
  onStartTour: () => void;
  onOpenChat: () => void;
  onOpenSearch?: () => void;
  personaName: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  activeLanguage?: string;
  onSelectLanguage?: (langCode: string) => void;
  currentUser?: AuthSessionUser | null;
  onOpenAuthModal?: (tab?: 'signin' | 'signup') => void;
}

const NAV_SECTIONS = [
  { id: 'bio', label: 'About & Services' },
  { id: 'links', label: 'Platforms & Projects' },
  { id: 'interests', label: 'Competencies' },
  { id: 'verified', label: 'Verified Networks' },
  { id: 'contact', label: 'Contact' },
] as const;

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  isMuted,
  onToggleMute,
  onStartTour,
  onOpenChat,
  onOpenSearch,
  personaName,
  theme,
  onToggleTheme,
  activeLanguage = 'en-US',
  onSelectLanguage,
  currentUser,
  onOpenAuthModal,
}) => {
  const isDark = theme === 'dark';
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState<string>('bio');
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const currentLang = getLanguageByCode(activeLanguage);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
      } else {
        await document.exitFullscreen?.();
      }
    } catch {
      // Fullscreen restricted by browser or iframe sandbox permissions
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    if (langMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [langMenuOpen]);

  // GPU Scroll-Progress Hairline synced via requestAnimationFrame
  useEffect(() => {
    let rafId = 0;
    const updateProgress = () => {
      rafId = 0;
      const docEl = document.documentElement;
      const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight);
      const ratio = Math.max(0, Math.min(1, window.scrollY / maxScroll));
      setScrollProgress(ratio);
    };

    const onScroll = () => {
      if (!rafId) {
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    updateProgress();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Real IntersectionObserver Section ScrollSpy
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sectionEls = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (sectionEls.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveNavId(visible[0].target.id);
        }
      },
      { rootMargin: '-22% 0px -55% 0px', threshold: [0.1, 0.35, 0.65] }
    );

    sectionEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      id="site-header"
      className="w-full bg-[var(--hud-bg)] backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 py-2.5 sm:py-3 transition-colors duration-200"
    >
      <div className="w-full flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Clean Wordmark Identity */}
        <a
          href="#profile-header"
          id="site-logo-link"
          className="flex items-center gap-2.5 text-[var(--text)] hover:text-[var(--gold)] transition-colors duration-150 group whitespace-nowrap shrink-0"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full overflow-hidden shrink-0 bg-[var(--panel)]">
            <img
              src="/site.svg"
              alt="M R S"
              id="site-logo"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </span>
          <span className="font-heading text-[17px] sm:text-[18px] font-bold tracking-tight text-[var(--text)] whitespace-nowrap">
            M R S
          </span>
        </a>

        {/* Zone 2: Clean Typographic Navigation Links with Active ScrollSpy */}
        <nav
          aria-label="Primary Portfolio Navigation"
          className="hidden lg:flex items-center gap-6 text-[13px] font-medium text-[var(--text-secondary)]"
        >
          {NAV_SECTIONS.map((sec) => {
            const isActive = activeNavId === sec.id;
            return (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={() => setActiveNavId(sec.id)}
                className={`transition-colors duration-150 whitespace-nowrap shrink-0 underline-offset-6 ${
                  isActive
                    ? 'text-[var(--gold)] font-semibold underline decoration-[var(--gold)] decoration-2'
                    : 'hover:text-[var(--text)] hover:underline decoration-[var(--gold)]/60'
                }`}
              >
                {sec.label}
              </a>
            );
          })}
          <button
            type="button"
            onClick={onOpenChat}
            className="hover:text-[var(--gold)] text-[var(--text-secondary)] hover:underline underline-offset-4 decoration-[var(--gold)] font-medium transition-colors duration-150 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[var(--gold)]" />
            <span>Camellia Chat</span>
          </button>
        </nav>

        {/* Zone 3: Quiet Utility Controls & Primary Audio Tour Action */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 max-w-[calc(100vw-110px)] overflow-x-auto no-scrollbar py-0.5">
          {/* Semantic Search Trigger */}
          {onOpenSearch && (
            <button
              id="hud-search-btn"
              type="button"
              onClick={onOpenSearch}
              title="Semantic Search (Cmd+K / Ctrl+K)"
              aria-label="Semantic Search"
              className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-[var(--panel-raised)] active:scale-[0.96] text-[var(--text-secondary)] hover:text-[var(--gold)] transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation"
            >
              <Search className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <kbd className="hidden xl:inline font-mono text-[10px] text-[var(--text-muted)]">⌘K</kbd>
            </button>
          )}

          {/* Language Selector Dropdown */}
          {onSelectLanguage && (
            <div className="relative shrink-0" ref={langMenuRef}>
              <button
                id="hud-language-selector-btn"
                onClick={() => setLangMenuOpen((prev) => !prev)}
                title={`Audio Language: ${currentLang.name} (${currentLang.nativeName})`}
                aria-label={`Change Language (Current: ${currentLang.name})`}
                className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-[var(--panel-raised)] active:scale-[0.96] text-[var(--text-secondary)] hover:text-[var(--gold)] transition-all duration-150 cursor-pointer flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation"
              >
                <Globe className="w-4 h-4 text-[var(--gold)] shrink-0" />
                <span className="text-[11px] sm:text-xs font-mono font-medium whitespace-nowrap text-[var(--text)]">
                  {currentLang.flag} <span className="hidden xl:inline">{currentLang.nativeName}</span>
                </span>
                <ChevronDown className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 max-h-80 overflow-y-auto rounded-xl bg-[var(--panel)] ring-1 ring-[var(--border)] shadow-[var(--shadow-panel)] z-50 py-1.5 text-xs font-mono animate-scaleUp origin-top-right">
                  <div className="px-3 py-2 text-[11px] font-medium text-[var(--text-secondary)] flex items-center justify-between mb-1">
                    <span>Spoken Narration Language</span>
                    <Volume2 className="w-3.5 h-3.5 text-[var(--gold)]" />
                  </div>
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code.toLowerCase() === activeLanguage.toLowerCase();
                    return (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onSelectLanguage(lang.code);
                          setLangMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition-colors duration-150 cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--gold-tint)] text-[var(--gold)] font-semibold'
                            : 'text-[var(--text)] hover:bg-[var(--panel-raised)] hover:text-[var(--gold)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-sm shrink-0">{lang.flag}</span>
                          <span className="truncate">{lang.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-normal truncate">
                            ({lang.nativeName})
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Day / Night Theme Toggle */}
          <button
            id="themeToggle"
            onClick={onToggleTheme}
            title={isDark ? 'Switch to Day / Light Mode' : 'Switch to Night / Dark Mode'}
            aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-[var(--panel-raised)] active:scale-[0.96] text-[var(--text)] transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-[var(--gold)] shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-[var(--gold)] shrink-0" />
            )}
            <span className="hidden xl:inline text-xs font-medium text-[var(--text-secondary)]">
              {isDark ? 'Light' : 'Dark'}
            </span>
          </button>

          {/* True Browser Full-Screen Mode Toggle */}
          <button
            id="hud-fullscreen-btn"
            type="button"
            onClick={handleToggleFullscreen}
            title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            aria-label={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen'}
            className="hidden sm:flex px-2 py-1.5 rounded-xl bg-transparent hover:bg-[var(--panel-raised)] active:scale-[0.96] text-[var(--gold)] transition-all duration-150 cursor-pointer items-center justify-center whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 shrink-0" />
            ) : (
              <Maximize2 className="w-4 h-4 shrink-0" />
            )}
          </button>

          {/* Voice Mute Toggle */}
          <button
            id="hud-mute-btn"
            onClick={onToggleMute}
            title={isMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
            aria-label={isMuted ? 'Unmute Audio & Voice' : 'Mute Audio & Voice'}
            className={`px-2 py-1.5 rounded-xl text-xs font-medium active:scale-[0.96] transition-all duration-150 cursor-pointer flex items-center justify-center whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation ${
              isMuted
                ? 'bg-rose-500/15 text-[var(--danger-text)]'
                : 'bg-transparent hover:bg-[var(--panel-raised)] text-[var(--gold)]'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4 shrink-0" /> : <Volume2 className="w-4 h-4 shrink-0" />}
          </button>

          {/* Native In-App PWA Installer */}
          <PWAInstallButton variant="header" />

          {/* Sign Up / Sign In for Updates */}
          {onOpenAuthModal && (
            <button
              id="hud-auth-btn"
              onClick={() => onOpenAuthModal(currentUser ? 'signin' : 'signup')}
              title={
                currentUser
                  ? `Subscriber: ${currentUser.email || 'Active'}`
                  : `Sign In for Email Updates from ${personaName || 'Camellia'}`
              }
              aria-label="Sign In for Updates"
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium active:scale-[0.96] transition-all duration-150 cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation ${
                currentUser
                  ? 'bg-[var(--gold-tint)] text-[var(--gold)]'
                  : 'bg-transparent hover:bg-[var(--panel-raised)] text-[var(--text-secondary)] hover:text-[var(--gold)]'
              }`}
            >
              {currentUser ? (
                <>
                  <UserCheck className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span className="hidden xl:inline truncate max-w-[90px]">
                    {currentUser.displayName || currentUser.email?.split('@')[0] || 'Subscriber'}
                  </span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-[var(--gold)] shrink-0" />
                  <span className="hidden xl:inline">Sign In</span>
                </>
              )}
            </button>
          )}

          {/* Primary Action: Guided Audio Tour */}
          <button
            id="hud-tour-btn"
            onClick={onStartTour}
            title="Start Concierge Guided Audio Tour"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] active:scale-[0.96] text-[var(--gold-ink)] text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] shadow-sm touch-manipulation"
          >
            <Play className="w-3 h-3 fill-current shrink-0" />
            <span className="text-[11px] sm:text-xs">Audio Tour</span>
          </button>
        </div>
      </div>

      {/* GPU-Accelerated Scroll Progress Hairline */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent overflow-hidden pointer-events-none"
      >
        <div
          className="h-full w-full origin-left bg-gradient-to-r from-[var(--gold)]/50 via-[var(--gold)] to-[var(--gold)]/80 transition-transform duration-75 ease-out will-change-transform"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>
    </header>
  );
};
