import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowUpRight, Volume2, Radio, Sparkles, Compass } from 'lucide-react';
import { sanitizeSafeHref } from '../utils/inputSanitization';

export interface SemanticSearchResult {
  id: string;
  type: 'section' | 'project' | 'service' | 'sponsor' | 'credential';
  title: string;
  subtitle: string;
  scrollTarget?: string;
  explainKey?: string;
  url?: string;
  score: number;
}

interface SemanticCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToSection: (targetSelector?: string, explainKey?: string) => void;
  onOpenLiveVoice: () => void;
  onAskCamellia: (prompt: string) => void;
}

const SUGGESTED_INTENTS = [
  'Microsoft 365 & remote IT support',
  'Android TV APK & IPTV streaming',
  'Humanitarian charity foundation',
  'Verify certifications & download CV',
  'Cloud & security sponsor partners',
];

export const SemanticCommandPalette: React.FC<SemanticCommandPaletteProps> = ({
  isOpen,
  onClose,
  onJumpToSection,
  onOpenLiveVoice,
  onAskCamellia,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [engineUsed, setEngineUsed] = useState<string>('default');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch('/api/semantic-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query.trim() }),
        });
        const data = await res.json();
        if (!cancelled && data?.success && Array.isArray(data.results)) {
          setResults(data.results);
          setEngineUsed(data.engine || 'default');
        }
      } catch {
        // Keep current results
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }, query.trim() ? 180 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, isOpen]);

  if (!isOpen) return null;

  const navigateWithViewTransition = (fn: () => void) => {
    const docAny = document as any;
    if (typeof docAny.startViewTransition === 'function') {
      docAny.startViewTransition(() => {
        fn();
      });
    } else {
      fn();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Semantic Search & Navigation"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[10vh] sm:pt-[14vh] px-4 no-speak"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-2xl bg-[var(--panel)] shadow-2xl overflow-hidden flex flex-col max-h-[82vh] animate-scaleUp"
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 bg-[var(--bg)]">
          <Search className="w-4 h-4 text-[var(--gold)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by meaning (e.g., fix Wi-Fi, IPTV app, charity, CV, cloud sponsor)..."
            className="flex-1 bg-transparent text-sm sm:text-base text-[var(--text)] placeholder:text-[var(--text-muted)] outline-hidden"
          />
          {isSearching && (
            <span className="text-[11px] font-mono text-[var(--gold)] shrink-0">Matching...</span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Search"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Intent Suggestions */}
        {!query.trim() && (
          <div className="px-4 py-2.5 bg-[var(--panel-raised)]/45 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {SUGGESTED_INTENTS.map((intent) => (
              <button
                key={intent}
                type="button"
                onClick={() => setQuery(intent)}
                className="px-2.5 py-1 rounded-lg bg-[var(--panel)] hover:bg-[var(--panel-hover)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--gold)] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {intent}
              </button>
            ))}
          </div>
        )}

        {/* Semantic Results List */}
        <div className="flex-1 overflow-y-auto space-y-0.5 py-1">
          {results.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                No exact portfolio match found for "{query}".
              </p>
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    const q = query.trim();
                    onClose();
                    onAskCamellia(q);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask Camellia AI directly</span>
                </button>
              )}
            </div>
          ) : (
            results.map((item) => {
              const matchPct = Math.round(item.score * 100);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    navigateWithViewTransition(() => {
                      onJumpToSection(item.scrollTarget, item.explainKey);
                      onClose();
                    });
                  }}
                  className="px-4 py-3.5 hover:bg-[var(--panel-raised)] transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--text-muted)]">
                      <span className="text-[var(--gold)] uppercase font-semibold">{item.type}</span>
                      {query.trim() && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{matchPct}% match</span>
                        </>
                      )}
                    </div>
                    <h4 className="text-sm font-heading font-semibold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.explainKey && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateWithViewTransition(() => {
                            onJumpToSection(item.scrollTarget, item.explainKey);
                            onClose();
                          });
                        }}
                        title="Jump & Listen to Camellia"
                        className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel-hover)] text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {sanitizeSafeHref(item.url) && (
                      <a
                        href={sanitizeSafeHref(item.url)}
                        target="_blank"
                        rel={item.type === 'sponsor' ? 'noopener noreferrer sponsored' : 'noopener noreferrer'}
                        data-allow-navigation="true"
                        onClick={(e) => e.stopPropagation()}
                        title="Open Platform"
                        className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--gold)] text-[var(--text-secondary)] hover:text-[var(--gold-ink)] transition-colors"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="px-4 py-2.5 bg-[var(--panel-raised)]/60 flex items-center justify-between gap-2 text-[11px] font-mono text-[var(--text-muted)]">
          <div className="flex items-center gap-2 truncate">
            <Compass className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
            <span className="truncate">
              {engineUsed === 'gemini-embedding-2'
                ? 'Vector Search · Neural Embeddings'
                : 'Semantic Portfolio Index'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLiveVoice();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel-hover)] text-[var(--gold)] font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Radio className="w-3 h-3" />
            <span>Switch to Live Voice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
