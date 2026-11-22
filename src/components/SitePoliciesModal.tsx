import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Scale, FileText, Lock, Eye, AlertCircle, RefreshCw } from 'lucide-react';

interface SitePolicyItem {
  id: string;
  title: string;
  shortDescription: string;
  lastUpdated: string;
  effectiveYear: number;
  version: string;
  content: string[];
}

interface SitePoliciesManifest {
  effectiveYear: number;
  lastRunTimestamp: string;
  copyrightText: string;
  ownerEmail: string;
  policies: Record<string, SitePolicyItem>;
  legalComplianceStandards: string[];
}

interface SitePoliciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: string;
}

export const SitePoliciesModal: React.FC<SitePoliciesModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'terms-of-service',
}) => {
  const [manifest, setManifest] = useState<SitePoliciesManifest | null>(null);
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setLoading(true);

    fetch('/api/policies/current')
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.policies) {
          setManifest(data);
          if (!data.policies[activeTab]) {
            const firstKey = Object.keys(data.policies)[0];
            if (firstKey) setActiveTab(firstKey);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load current policies from backend:', err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPolicy = manifest?.policies?.[activeTab];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-[var(--bg)] text-[var(--text)] shadow-[var(--shadow-panel)] overflow-hidden transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] animate-scaleUp"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-[var(--panel-raised)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--gold-tint)] text-[var(--gold)] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base md:text-lg font-heading font-bold text-[var(--text)]">
                  Site Legal &amp; Compliance Hub
                </h3>
                {manifest && (
                  <span className="text-[11px] font-mono text-[var(--success-text)] font-semibold">
                    · {manifest.effectiveYear} Active
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)]">
                Autonomous backend annual governance engine &bull; M R S Portfolio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--panel-hover)] active:scale-95 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer touch-manipulation"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Tabs (Responsive Scrollable Row) */}
        <div className="flex items-center gap-1 px-4 sm:px-6 py-2 bg-[var(--bg)] overflow-x-auto no-scrollbar">
          {manifest?.policies &&
            (Object.values(manifest.policies) as SitePolicyItem[]).map((p) => {
              const isActive = activeTab === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveTab(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap active:scale-[0.97] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer touch-manipulation ${
                    isActive
                      ? 'bg-[var(--gold)] text-[var(--gold-ink)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)]'
                  }`}
                >
                  {p.title.split('&')[0].trim()}
                </button>
              );
            })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
              <RefreshCw className="w-6 h-6 animate-spin text-[var(--gold)]" />
              <span className="text-xs font-mono">Synchronizing live policies from backend...</span>
            </div>
          ) : currentPolicy ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--panel-raised)]">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[var(--gold)] mb-1">
                  <span>Version {currentPolicy.version}</span>
                  <span className="text-[var(--text-muted)]">Effective {currentPolicy.lastUpdated}</span>
                </div>
                <h4 className="text-base sm:text-lg font-heading font-bold text-[var(--text)]">
                  {currentPolicy.title}
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {currentPolicy.shortDescription}
                </p>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                {currentPolicy.content.map((clause, idx) => (
                  <p key={idx} className="p-3 rounded-lg bg-[var(--panel-raised)]/60">
                    {clause}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Select a policy tab above to view active legal documentation.
            </div>
          )}

          {/* Legal Compliance Standards Notice */}
          {manifest?.legalComplianceStandards && (
            <div className="mt-4 p-3.5 rounded-xl bg-[var(--panel-raised)]/40">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--gold)] mb-1.5 flex items-center gap-1.5 font-semibold">
                <Scale className="w-3.5 h-3.5" />
                <span>Enforced International Standards ({manifest.effectiveYear})</span>
              </div>
              <p className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">
                {manifest.legalComplianceStandards.join(' · ')}
              </p>
            </div>
          )}
        </div>

        {/* Footer Bar with Backend Dynamic Copyright */}
        <div className="px-4 sm:px-6 py-3 bg-[var(--panel-raised)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[var(--text-muted)] font-mono">
          <span>{manifest?.copyrightText || `© 2024–${new Date().getFullYear()} M R S. All Rights Reserved.`}</span>
          <span className="text-[var(--success-text)]">Auto-updated via backend governance</span>
        </div>
      </div>
    </div>
  );
};
