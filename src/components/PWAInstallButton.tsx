import { useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'footer';
}

export const PWAInstallButton = ({ variant = 'header' }: PWAInstallButtonProps) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Install M R S Hub as an App"
        className={
          variant === 'header'
            ? 'px-2 sm:px-2.5 py-1.5 rounded-xl bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] active:scale-[0.96] text-[var(--gold)] text-xs font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation'
            : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--gold)] text-xs font-mono transition-colors cursor-pointer'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span className={variant === 'header' ? 'hidden xl:inline' : ''}>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Install on iPhone / iPad"
          className={
            variant === 'header'
              ? 'px-2 sm:px-2.5 py-1.5 rounded-xl bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] active:scale-[0.96] text-[var(--gold)] text-xs font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[36px] touch-manipulation'
              : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-[var(--gold)] text-xs font-mono transition-colors cursor-pointer'
          }
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span className={variant === 'header' ? 'hidden xl:inline' : ''}>Install App</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install App on iOS Safari"
            onClick={() => setShowIOSGuide(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 no-speak"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[var(--panel)] p-6 shadow-2xl space-y-4 animate-scaleUp"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-heading font-bold text-[var(--text)]">
                  Install M R S Hub on iOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close Install Guide"
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="space-y-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[var(--gold)] shrink-0">01.</span>
                  <span>
                    Tap the <strong className="text-[var(--text)] inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 text-[var(--gold)]" /> Share</strong> icon in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-mono font-bold text-[var(--gold)] shrink-0">02.</span>
                  <span>
                    Scroll down and select <strong className="text-[var(--text)]">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs font-semibold cursor-pointer transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
