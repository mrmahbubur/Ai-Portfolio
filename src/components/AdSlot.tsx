import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  ExternalLink,
  Globe,
  ShieldCheck,
  Layers,
  Sparkles,
  Volume2,
  ArrowUpRight,
  SlidersHorizontal,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Tv,
  Code2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  SPONSOR_AD_LINKS,
  SPONSOR_CLICK_EVENT,
  BannerZoneContext,
  SponsorAdLink,
  SponsorCategory,
  fetchLiveSponsors,
  getSponsorsForContext,
  recordSponsorClick,
} from '../data/sponsors';

export type AdFormat = '728x90' | '468x60' | '300x250';

interface AdSlotProps {
  format: AdFormat;
  contextZone?: BannerZoneContext;
  sponsorIds?: string[];
  initialIndex?: number;
  autoRotateMs?: number;
  className?: string;
  label?: string;
}

const handleCardPointerMove = (e: React.PointerEvent<HTMLElement>) => {
  if (e.pointerType === 'touch') return;
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${Math.round(e.clientX - rect.left)}px`);
  el.style.setProperty('--my', `${Math.round(e.clientY - rect.top)}px`);
};

function useLiveSponsors() {
  const [sponsors, setSponsors] = useState<SponsorAdLink[]>(SPONSOR_AD_LINKS);

  useEffect(() => {
    let cancelled = false;
    fetchLiveSponsors().then((merged) => {
      if (!cancelled && merged && merged.length > 0) {
        setSponsors(merged);
      }
    });

    const handleSync = (event: Event) => {
      const detail = (event as CustomEvent<{ sponsorId?: string; url?: string }>).detail;
      if (!detail) return;
      setSponsors((prev) =>
        prev.map((item) =>
          item.id === detail.sponsorId || item.url === detail.url
            ? {
                ...item,
                clicks: (item.clicks || 0) + 1,
                lastClickedAt: new Date().toISOString(),
              }
            : item
        )
      );
    };

    window.addEventListener(SPONSOR_CLICK_EVENT, handleSync);
    return () => {
      cancelled = true;
      window.removeEventListener(SPONSOR_CLICK_EVENT, handleSync);
    };
  }, []);

  return sponsors;
}

function getCategoryIcon(category: SponsorCategory, sizeClass = 'w-5 h-5') {
  switch (category) {
    case 'Cloud & IT':
      return <Cloud className={sizeClass} />;
    case 'Digital Media':
      return <Tv className={sizeClass} />;
    case 'Security & Privacy':
      return <ShieldCheck className={sizeClass} />;
    case 'Developer Tools':
      return <Code2 className={sizeClass} />;
    case 'Web Hosting':
      return <Globe className={sizeClass} />;
    case 'Productivity':
      return <FileSpreadsheet className={sizeClass} />;
    default:
      return <Layers className={sizeClass} />;
  }
}

const BannerSvgGrid: React.FC<{ category: SponsorCategory }> = ({ category }) => {
  const accentStroke = 'var(--gold)';
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]"
      preserveAspectRatio="none"
      viewBox="0 0 400 120"
    >
      <defs>
        <pattern
          id={`grid-${category.replace(/\s+/g, '-')}`}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>
      <rect width="400" height="120" fill={`url(#grid-${category.replace(/\s+/g, '-')})`} />
      <circle cx="360" cy="24" r="52" fill="none" stroke={accentStroke} strokeWidth="0.9" />
      <circle cx="360" cy="24" r="28" fill="none" stroke={accentStroke} strokeWidth="0.7" />
    </svg>
  );
};

export const AdSlot = ({
  format,
  contextZone = 'all',
  sponsorIds,
  initialIndex = 0,
  autoRotateMs = 9500,
  className = '',
  label,
}: AdSlotProps) => {
  const allSponsors = useLiveSponsors();
  const pool = useMemo(
    () => getSponsorsForContext(allSponsors, contextZone, sponsorIds),
    [allSponsors, contextZone, sponsorIds]
  );

  const [activeIndex, setActiveIndex] = useState<number>(() =>
    pool.length > 0 ? initialIndex % pool.length : 0
  );
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (activeIndex >= pool.length && pool.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, pool.length]);

  useEffect(() => {
    if (isPaused || pool.length <= 1 || autoRotateMs <= 0) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % pool.length);
    }, autoRotateMs);

    return () => clearInterval(timer);
  }, [isPaused, pool.length, autoRotateMs]);

  const sponsor = pool[activeIndex % Math.max(1, pool.length)] || SPONSOR_AD_LINKS[0];

  const stepBanner = useCallback(
    (delta: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (pool.length <= 1) return;
      setActiveIndex((prev) => (prev + delta + pool.length) % pool.length);
    },
    [pool.length]
  );

  const handleOpenSponsor = () => {
    recordSponsorClick(sponsor.id, sponsor.url);
  };

  const displayLabel = label ?? `Sponsored Partner · Matched with ${sponsor.matchedSection}`;

  if (format === '300x250') {
    return (
      <div
        className={`no-speak no-print w-full flex flex-col ${className}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          onPointerMove={handleCardPointerMove}
          className="futuristic-card-glow relative flex flex-col justify-between rounded-2xl bg-[var(--panel)] transition-all duration-200 overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-panel)] min-h-[260px]"
        >
          {/* Graphic Header Strip */}
          <div className="relative px-4 pt-4 pb-3 bg-[var(--panel-raised)]/60 flex items-center justify-between gap-2 text-[var(--text)] overflow-hidden">
            <BannerSvgGrid category={sponsor.category} />
            <div className="relative z-10 flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[var(--panel)] text-[var(--gold)] flex items-center justify-center shrink-0 shadow-xs">
                {getCategoryIcon(sponsor.category, 'w-4 h-4')}
              </div>
              <div className="min-w-0">
                <span className="text-[10.5px] font-mono text-[var(--gold)] font-semibold block truncate">
                  {sponsor.indexLabel} · {sponsor.category}
                </span>
                <span className="text-[10.5px] font-mono text-[var(--text-muted)] block truncate">
                  Sponsored Banner
                </span>
              </div>
            </div>

            {pool.length > 1 && (
              <div className="relative z-10 flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={(e) => stepBanner(-1, e)}
                  aria-label="Previous sponsor banner"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => stepBanner(1, e)}
                  aria-label="Next sponsor banner"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Clickable Banner Body & CTA */}
          <a
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-allow-navigation="true"
            onClick={handleOpenSponsor}
            className="flex-1 flex flex-col justify-between p-4 sm:p-5 group focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
          >
            <div className="space-y-2">
              <h3 className="text-base font-heading font-bold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors leading-snug">
                {sponsor.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                {sponsor.summary}
              </p>
              <p className="text-[11px] font-mono text-[var(--text-muted)] pt-0.5">
                {sponsor.benefit}
                {typeof sponsor.clicks === 'number' && sponsor.clicks > 0
                  ? ` · ${sponsor.clicks} visits`
                  : ''}
              </p>
            </div>

            <div className="pt-4 mt-3">
              <span className="w-full px-4 py-2.5 rounded-xl bg-[var(--gold)] group-hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-2 min-h-[44px] shadow-xs">
                <span>{sponsor.ctaLabel || 'Explore Partner Offer'}</span>
                <ArrowUpRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </span>
            </div>
          </a>
        </div>
      </div>
    );
  }

  if (format === '468x60') {
    return (
      <div
        className={`no-speak no-print w-full ${className}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          onPointerMove={handleCardPointerMove}
          className="futuristic-card-glow relative rounded-xl bg-[var(--panel)] transition-all duration-200 overflow-hidden shadow-[var(--shadow-card)]"
        >
          <BannerSvgGrid category={sponsor.category} />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
            <a
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-allow-navigation="true"
              onClick={handleOpenSponsor}
              className="flex-1 min-w-0 flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--panel-raised)] text-[var(--gold)] flex items-center justify-center shrink-0">
                {getCategoryIcon(sponsor.category, 'w-4 h-4')}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[var(--text-muted)] truncate">
                  <span className="text-[var(--gold)] font-semibold">{sponsor.indexLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{sponsor.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{sponsor.recommendedFor}</span>
                </div>
                <p className="text-xs sm:text-sm font-heading font-semibold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors truncate">
                  {sponsor.title}
                </p>
              </div>
            </a>

            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
              {pool.length > 1 && (
                <div className="flex items-center gap-0.5 rounded-lg bg-[var(--panel-raised)] p-0.5">
                  <button
                    type="button"
                    onClick={(e) => stepBanner(-1, e)}
                    aria-label="Previous sponsor banner"
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => stepBanner(1, e)}
                    aria-label="Next sponsor banner"
                    className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <a
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                data-allow-navigation="true"
                onClick={handleOpenSponsor}
                className="px-4 py-2 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-semibold transition-all duration-150 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[44px] touch-manipulation"
              >
                <span>{sponsor.ctaLabel}</span>
                <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // '728x90' Full Leaderboard Interactive Banner
  return (
    <div
      className={`no-speak no-print w-full ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        onPointerMove={handleCardPointerMove}
        className="futuristic-card-glow relative rounded-2xl bg-[var(--panel)] transition-all duration-200 overflow-hidden shadow-[var(--shadow-card)]"
      >
        <BannerSvgGrid category={sponsor.category} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-4">
          <a
            href={sponsor.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-allow-navigation="true"
            onClick={handleOpenSponsor}
            className="flex-1 min-w-0 flex items-start sm:items-center gap-4 group focus-visible:outline-2 focus-visible:outline-[var(--gold)]"
          >
            {/* Geometric Category Crest */}
            <div className="w-12 h-12 rounded-xl bg-[var(--panel-raised)] text-[var(--gold)] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-[1.03] transition-transform">
              {getCategoryIcon(sponsor.category, 'w-5 h-5')}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                <span className="text-[var(--gold)] font-semibold tabular-nums">
                  {sponsor.indexLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[var(--text-secondary)]">{displayLabel}</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden sm:inline text-[var(--gold)]/90">{sponsor.benefit}</span>
                {typeof sponsor.clicks === 'number' && sponsor.clicks > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{sponsor.clicks} visits</span>
                  </>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-heading font-bold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors truncate">
                {sponsor.title}
              </h3>

              <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                {sponsor.summary}
              </p>
            </div>
          </a>

          <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 pt-2 md:pt-0">
            {pool.length > 1 && (
              <div className="flex items-center gap-1 rounded-xl bg-[var(--panel-raised)] p-0.5">
                <button
                  type="button"
                  onClick={(e) => stepBanner(-1, e)}
                  aria-label="Previous partner banner"
                  title="Previous partner banner"
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10.5px] font-mono text-[var(--text-muted)] px-1 tabular-nums">
                  {(activeIndex % pool.length) + 1}/{pool.length}
                </span>
                <button
                  type="button"
                  onClick={(e) => stepBanner(1, e)}
                  aria-label="Next partner banner"
                  title="Next partner banner"
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <a
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-allow-navigation="true"
              onClick={handleOpenSponsor}
              className="px-5 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] active:scale-[0.98] text-[var(--gold-ink)] text-xs sm:text-sm font-semibold transition-all duration-150 inline-flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px] touch-manipulation shadow-xs hover:shadow-sm"
            >
              <span>{sponsor.ctaLabel}</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SponsoredLink: React.FC<{
  className?: string;
  label?: string;
  href?: string;
  sponsorId?: string;
}> = ({
  className = '',
  label = `Featured Partner · ${SPONSOR_AD_LINKS[0].title}`,
  href = SPONSOR_AD_LINKS[0].url,
  sponsorId = SPONSOR_AD_LINKS[0].id,
}) => {
  return (
    <div className={`no-speak no-print w-full flex justify-center py-2 ${className}`}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        data-allow-navigation="true"
        onClick={() => recordSponsorClick(sponsorId, href)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] text-xs font-mono text-[var(--gold)] hover:text-[var(--gold-hover)] transition-colors duration-150 min-h-[44px] touch-manipulation text-center shadow-[var(--shadow-card)]"
      >
        <span>{label}</span>
        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      </a>
    </div>
  );
};

export const InlineSponsorStrip: React.FC<{ className?: string }> = ({ className = '' }) => {
  const sponsors = useLiveSponsors();
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Seamless 2x list loop for hardware-accelerated kinetic marquee
  const tickerItems = useMemo(() => [...sponsors, ...sponsors], [sponsors]);

  return (
    <div
      className={`no-speak no-print w-full ${className}`}
      aria-label="Live Moving Sponsored Partner Bar"
    >
      <div className="sponsor-marquee-container w-full bg-[var(--panel)] shadow-[var(--shadow-card)] px-4 sm:px-6 lg:px-10 xl:px-14 2xl:px-20 py-2 flex items-center gap-3 text-xs overflow-hidden">
        <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--gold)] shrink-0 pr-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline font-semibold">Live Sponsors</span>
          <span className="sm:hidden font-semibold">Sponsors</span>
        </div>

        <div className="flex-1 min-w-0 overflow-hidden">
          <div
            className="sponsor-marquee-track items-center gap-5"
            style={isPaused ? { animationPlayState: 'paused' } : undefined}
          >
            {tickerItems.map((item, idx) => (
              <a
                key={`${item.id}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                data-allow-navigation="true"
                onClick={() => recordSponsorClick(item.id, item.url)}
                className="no-speak inline-flex items-center gap-2 text-[11px] sm:text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--gold)] whitespace-nowrap shrink-0 py-0.5 transition-colors group"
              >
                <span className="font-mono text-[10px] text-[var(--gold)] tabular-nums">
                  {item.indexLabel}
                </span>
                <span className="group-hover:underline underline-offset-2">{item.title}</span>
                <span className="text-[10px] font-mono text-[var(--text-muted)] hidden md:inline">
                  · {item.matchedSection}
                </span>
                <ArrowUpRight className="w-3 h-3 text-[var(--gold)] shrink-0" />
              </a>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 pl-2">
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? 'Resume Moving Sponsors' : 'Pause Moving Sponsors'}
            title={isPaused ? 'Resume Moving Sponsors' : 'Pause Moving Sponsors'}
            className="no-speak p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
          </button>
          <a
            href="#sponsors"
            className="no-speak hidden sm:inline-block px-2 py-1 rounded-lg text-[10.5px] font-mono text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors whitespace-nowrap"
          >
            All {sponsors.length}
          </a>
        </div>
      </div>
    </div>
  );
};

interface SponsorShowcaseProps {
  isHighlighted?: boolean;
  onSectionClick?: (key: string) => void;
}

type FilterOption = 'All' | SponsorCategory;
type SortMode = 'curated' | 'popular';

const FILTER_TABS: FilterOption[] = [
  'All',
  'Cloud & IT',
  'Security & Privacy',
  'Developer Tools',
  'Web Hosting',
  'Digital Media',
  'Productivity',
];

export const SponsorShowcase: React.FC<SponsorShowcaseProps> = ({
  isHighlighted = false,
  onSectionClick,
}) => {
  const sponsors = useLiveSponsors();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');
  const [sortMode, setSortMode] = useState<SortMode>('curated');
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const [isSpotlightPaused, setIsSpotlightPaused] = useState<boolean>(false);

  // Auto-cycle live Featured Spotlight smoothly across all 10 partners every 7s
  useEffect(() => {
    if (isSpotlightPaused || activeFilter !== 'All' || sortMode === 'popular') return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const timer = setInterval(() => {
      setSpotlightIndex((prev) => (prev + 2) % sponsors.length);
    }, 7000);

    return () => clearInterval(timer);
  }, [isSpotlightPaused, activeFilter, sortMode, sponsors.length]);

  const handleTrackAndOpen = useCallback((sponsor: SponsorAdLink) => {
    recordSponsorClick(sponsor.id, sponsor.url);
  }, []);

  const applyFilterWithTransition = useCallback((nextTab: FilterOption) => {
    const docAny = document as any;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduced && typeof docAny.startViewTransition === 'function') {
      docAny.startViewTransition(() => setActiveFilter(nextTab));
    } else {
      setActiveFilter(nextTab);
    }
  }, []);

  const stepSpotlight = useCallback(
    (delta: number) => {
      setSpotlightIndex((prev) => {
        const total = sponsors.length || 1;
        return (prev + delta + total) % total;
      });
    },
    [sponsors.length]
  );

  const sortedSponsors = useMemo(() => {
    const list = [...sponsors];
    if (sortMode === 'popular') {
      list.sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
    }
    return list;
  }, [sponsors, sortMode]);

  const featuredSponsors = useMemo(() => {
    if (activeFilter !== 'All' || sortMode === 'popular') return [];
    const total = sortedSponsors.length;
    if (total === 0) return [];
    return [
      sortedSponsors[spotlightIndex % total],
      sortedSponsors[(spotlightIndex + 1) % total],
    ].filter(Boolean);
  }, [sortedSponsors, activeFilter, sortMode, spotlightIndex]);

  const directorySponsors = useMemo(() => {
    if (activeFilter === 'All') {
      if (sortMode === 'popular') return sortedSponsors;
      const featuredIds = new Set(featuredSponsors.map((s) => s.id));
      return sortedSponsors.filter((s) => !featuredIds.has(s.id));
    }
    return sortedSponsors.filter((s) => s.category === activeFilter);
  }, [sortedSponsors, activeFilter, sortMode, featuredSponsors]);

  const featuredFooterPartner =
    sponsors.find((s) => s.id === 'sponsor-9912130') || SPONSOR_AD_LINKS[8] || SPONSOR_AD_LINKS[0];

  return (
    <section
      id="sponsors"
      data-explain="sponsors"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('a, button, .no-speak')) {
          onSectionClick?.('sponsors');
        }
      }}
      className="no-print w-full"
      aria-labelledby="sponsors-section-heading"
    >
      <div
        className={`w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-10 sm:py-14 bg-[var(--bg)] transition-all duration-200 cursor-pointer ${
          isHighlighted ? 'ring-1 ring-[var(--gold)]/60' : ''
        }`}
      >
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7">
          <div>
            <h2
              id="sponsors-section-heading"
              className="text-xl sm:text-2xl font-heading font-bold text-[var(--text)] tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              <span className="font-mono text-[var(--gold)] mr-2.5 tabular-nums">06.</span>
              Sponsored Partners &amp; Ecosystem Directory
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Interactive sponsor banners matched cleanly across M R S IT, cloud, streaming &amp; security platforms
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {activeFilter === 'All' && sortMode === 'curated' && (
              <div className="no-speak inline-flex items-center rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] p-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stepSpotlight(-2);
                  }}
                  title="Previous Rotating Partners"
                  aria-label="Previous Rotating Partners"
                  className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsSpotlightPaused((p) => !p);
                  }}
                  title={isSpotlightPaused ? 'Resume Auto-Rotation' : 'Pause Auto-Rotation'}
                  aria-label={isSpotlightPaused ? 'Resume Auto-Rotation' : 'Pause Auto-Rotation'}
                  className="px-2 py-1 rounded-md text-[11px] font-mono text-[var(--gold)] hover:bg-[var(--panel-raised)] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {isSpotlightPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  <span>{isSpotlightPaused ? 'Paused' : 'Rotating'}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    stepSpotlight(2);
                  }}
                  title="Next Rotating Partners"
                  aria-label="Next Rotating Partners"
                  className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSortMode((prev) => (prev === 'curated' ? 'popular' : 'curated'));
              }}
              className="no-speak px-3 py-2 rounded-lg bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
              title="Toggle between Rotating Curated View and Most Visited Partners"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
              <span>{sortMode === 'curated' ? 'Rotating Curated' : 'Most Visited'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSectionClick?.('sponsors');
              }}
              className="px-3 py-2 rounded-lg bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] text-xs font-medium text-[var(--gold)] transition-colors duration-150 flex items-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
            >
              <Volume2 className="w-3.5 h-3.5 shrink-0" />
              <span>About Sponsors</span>
            </button>
          </div>
        </div>

        {/* Interactive Category Filter Controls */}
        <div
          className="no-speak flex items-center gap-1 p-1 mb-6 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Filter sponsor links by category"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            const count =
              tab === 'All'
                ? sponsors.length
                : sponsors.filter((s) => s.category === tab).length;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={(e) => {
                  e.stopPropagation();
                  applyFilterWithTransition(tab);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation ${
                  isActive
                    ? 'bg-[var(--gold)] text-[var(--gold-ink)] font-semibold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)]'
                }`}
              >
                {tab === 'All' ? `All Partners (${count})` : `${tab} (${count})`}
              </button>
            );
          })}
        </div>

        {/* Dynamic Rotating Featured Spotlight Banners (2-Column) */}
        {featuredSponsors.length > 0 && (
          <div
            onMouseEnter={() => setIsSpotlightPaused(true)}
            onMouseLeave={() => setIsSpotlightPaused(false)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5"
          >
            {featuredSponsors.map((sponsor) => (
              <a
                key={sponsor.id}
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                data-allow-navigation="true"
                onPointerMove={handleCardPointerMove}
                onClick={() => handleTrackAndOpen(sponsor)}
                className="no-speak futuristic-card-glow group relative flex flex-col justify-between p-5 sm:p-6 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-panel)] transition-all duration-200 min-h-[44px] overflow-hidden animate-fadeIn"
              >
                <BannerSvgGrid category={sponsor.category} />

                <div className="relative z-10 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[var(--panel-raised)] text-[var(--gold)] flex items-center justify-center shrink-0">
                        {getCategoryIcon(sponsor.category, 'w-4 h-4')}
                      </div>
                      <div className="min-w-0 truncate">
                        <span className="text-[var(--gold)] font-semibold tabular-nums">
                          {sponsor.indexLabel}
                        </span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-[var(--text-secondary)]">{sponsor.category}</span>
                        <span aria-hidden="true"> · </span>
                        <span className="text-[var(--gold)]/90">
                          Paired with {sponsor.matchedSection}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--gold)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 shrink-0 transition-all" />
                  </div>

                  <h3 className="text-base sm:text-lg font-heading font-semibold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors">
                    {sponsor.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    {sponsor.summary}
                  </p>
                </div>

                <div className="relative z-10 pt-3 mt-4 flex items-center justify-between gap-2 text-xs font-mono">
                  <span className="text-[var(--text-muted)] truncate">
                    {sponsor.benefit}
                    {typeof sponsor.clicks === 'number' && sponsor.clicks > 0
                      ? ` · ${sponsor.clicks} visits`
                      : ''}
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-[var(--gold)]/15 group-hover:bg-[var(--gold)] text-[var(--gold)] group-hover:text-[var(--gold-ink)] font-semibold transition-colors shrink-0">
                    {sponsor.ctaLabel || 'Launch Offer'}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* 4-Column Desktop / 2-Column Tablet / 1-Column Mobile Partner Banner Directory */}
        <div
          className={`grid gap-3.5 ${
            directorySponsors.length <= 2
              ? 'grid-cols-1 md:grid-cols-2'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {directorySponsors.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              data-allow-navigation="true"
              onPointerMove={handleCardPointerMove}
              onClick={() => handleTrackAndOpen(sponsor)}
              className="no-speak futuristic-card-glow group flex flex-col justify-between p-4 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-panel)] transition-all duration-150 min-h-[44px]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-[10.5px] font-mono text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="text-[var(--gold)]">{getCategoryIcon(sponsor.category, 'w-3.5 h-3.5')}</span>
                    <span className="text-[var(--gold)] font-semibold tabular-nums">{sponsor.indexLabel}</span>
                    <span>·</span>
                    <span className="truncate">{sponsor.category}</span>
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--gold)] shrink-0 transition-colors" />
                </div>

                <h3 className="text-sm font-heading font-semibold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors line-clamp-2">
                  {sponsor.title}
                </h3>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {sponsor.summary}
                </p>
              </div>

              <div className="pt-2.5 mt-3 flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                <span className="truncate" title={sponsor.matchedSection}>
                  {sponsor.matchedSection}
                  {typeof sponsor.clicks === 'number' && sponsor.clicks > 0
                    ? ` · ${sponsor.clicks}`
                    : ''}
                </span>
                <span className="text-[var(--gold)] font-semibold shrink-0 group-hover:underline">
                  Visit ↗
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* Disclosure Bar + Verified Featured Partner Link */}
        <div className="mt-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
            <span>
              Transparent Partner Disclosure · {sponsors.length} verified sponsor banner links open in a new tab (`rel=&quot;sponsored&quot;`).
            </span>
          </div>

          <a
            href={featuredFooterPartner.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            data-allow-navigation="true"
            onClick={() => handleTrackAndOpen(featuredFooterPartner)}
            className="no-speak inline-flex items-center gap-1.5 text-xs font-mono text-[var(--gold)] hover:underline whitespace-nowrap shrink-0"
          >
            <span>{featuredFooterPartner.title}</span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>
      </div>
    </section>
  );
};
