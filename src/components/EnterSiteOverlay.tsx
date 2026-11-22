import React from 'react';
import { Sparkles, Volume2, ArrowRight } from 'lucide-react';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';

interface EnterSiteOverlayProps {
  onEnter: () => void;
  ownerName?: string;
  roleTitle?: string;
  personaName?: string;
}

export const EnterSiteOverlay: React.FC<EnterSiteOverlayProps> = ({
  onEnter,
  ownerName = 'M R S',
  roleTitle = 'IT Support Professional | Remote Admin & Documentation Specialist | Web Manager | Helping businesses run smoother, one ticket at a time',
  personaName = 'Camellia',
}) => {
  React.useEffect(() => {
    onEnter();
  }, [onEnter]);

  return (
    <div
      id="enter-site-modal"
      style={{ display: 'none' }}
      className="hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg)]/95 backdrop-blur-md animate-fade-in"
    >
      {/* Background subtle radial ambient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[var(--gold)]/15 via-transparent to-transparent" />

      {/* Main Luxury Concierge Placard */}
      <div className="relative w-full max-w-lg p-6 sm:p-8 rounded-2xl bg-[var(--panel)] shadow-2xl text-center">
        {/* Sweet AI Character Face Greeting */}
        <div className="mx-auto mb-3.5 w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-tr from-[var(--gold)] to-[var(--gold-hover)] shadow-xl overflow-hidden">
          <img
            src={CAMELLIA_AVATAR_SRC}
            alt={personaName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top rounded-full"
          />
        </div>

        {/* Clean Typographic Eyebrow */}
        <div className="inline-flex items-center gap-2 mb-3 font-mono text-[11px] font-medium text-[var(--gold)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span>Interactive Concierge Experience</span>
        </div>

        {/* Heading */}
        <h1 className="font-heading text-2xl sm:text-3xl text-[var(--text)] font-bold tracking-tight mb-2">
          Welcome to {ownerName}’s Portfolio
        </h1>

        {/* Subtitle */}
        <p className="text-xs sm:text-sm font-mono text-[var(--gold)] tracking-wider uppercase mb-3">
          {roleTitle}
        </p>

        {/* Narrative Description */}
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-sans mb-6 max-w-md mx-auto">
          {personaName} (M R S Assistant) is standing by to introduce you, walk through technical services and live platforms, and give you an interactive guided tour.
        </p>

        {/* Primary Audio Unlock Action */}
        <button
          id="enter-site-button"
          onClick={onEnter}
          className="group w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] active:scale-[0.98] text-[var(--gold-ink)] font-bold text-sm tracking-wider uppercase transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-md hover:shadow-lg cursor-pointer touch-manipulation min-h-[44px]"
        >
          <Volume2 className="w-4 h-4 text-[var(--gold-ink)]" />
          <span>Enter Site &amp; Meet {personaName}</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
};

