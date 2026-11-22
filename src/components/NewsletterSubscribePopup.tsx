import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Mail, X, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import {
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeEmailInput,
  sanitizeSingleLineText,
} from '../utils/inputSanitization';

interface NewsletterSubscribePopupProps {
  theme: 'dark' | 'light';
  onAnnounce?: (text: string) => void;
}

export const NewsletterSubscribePopup: React.FC<NewsletterSubscribePopupProps> = ({
  theme,
  onAnnounce,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [triggerReason, setTriggerReason] = useState<'time' | 'visits' | 'manual'>('time');

  // Trigger evaluation: >10 minutes (600s) spent OR 3+ visits
  useEffect(() => {
    // 1. Check if user already subscribed
    const isSubscribed = localStorage.getItem('mrs_newsletter_subscribed') === 'true';
    if (isSubscribed) return;

    // 2. Check if snoozed
    const snoozedUntil = parseInt(localStorage.getItem('mrs_newsletter_snoozed_until') || '0', 10);
    const isSnoozed = Date.now() < snoozedUntil;

    // 3. Register visit count per browser session
    const sessionKey = 'mrs_session_visit_counted';
    let currentVisits = parseInt(localStorage.getItem('mrs_visit_count') || '0', 10);
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, 'true');
      currentVisits += 1;
      localStorage.setItem('mrs_visit_count', currentVisits.toString());
    }

    // 4. If visits >= 3 and not snoozed, trigger after a brief polite delay
    if (currentVisits >= 3 && !isSnoozed) {
      const visitTimer = setTimeout(() => {
        setTriggerReason('visits');
        setIsVisible(true);
      }, 4000);
      return () => clearTimeout(visitTimer);
    }

    // 5. Track time spent (10 minutes = 600 seconds cumulative or in session)
    let cumulativeSeconds = parseInt(localStorage.getItem('mrs_time_spent_seconds') || '0', 10);

    const interval = setInterval(() => {
      const alreadySubbed = localStorage.getItem('mrs_newsletter_subscribed') === 'true';
      if (alreadySubbed) {
        clearInterval(interval);
        return;
      }

      cumulativeSeconds += 1;
      // Persist every 5 seconds to minimize localStorage writes
      if (cumulativeSeconds % 5 === 0) {
        localStorage.setItem('mrs_time_spent_seconds', cumulativeSeconds.toString());
      }

      // Check if threshold exceeded (10 minutes = 600 seconds)
      const currentSnooze = parseInt(localStorage.getItem('mrs_newsletter_snoozed_until') || '0', 10);
      if (cumulativeSeconds >= 600 && Date.now() >= currentSnooze && !isVisible) {
        setTriggerReason('time');
        setIsVisible(true);
        clearInterval(interval);
      }
    }, 1000);

    // 6. Manual trigger event listener for testing & direct navigation
    const handleManualTrigger = () => {
      setTriggerReason('manual');
      setIsVisible(true);
    };
    window.addEventListener('mrs:show-newsletter', handleManualTrigger);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mrs:show-newsletter', handleManualTrigger);
    };
  }, [isVisible]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    // Snooze for 24 hours if dismissed without subscribing
    localStorage.setItem(
      'mrs_newsletter_snoozed_until',
      (Date.now() + 24 * 60 * 60 * 1000).toString()
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeEmailInput(email, INPUT_LIMITS.EMAIL_MAX);
    const cleanName = sanitizeSingleLineText(name, INPUT_LIMITS.NAME_MAX);

    if (!isValidEmailAddress(cleanEmail)) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cleanEmail,
          name: cleanName || undefined,
          receivePlatformUpdates: true,
          receiveBlogUpdates: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsSuccess(true);
        // Persist subscription status so it never triggers again
        localStorage.setItem('mrs_newsletter_subscribed', 'true');
        localStorage.removeItem('mrs_newsletter_snoozed_until');

        if (onAnnounce) {
          onAnnounce(
            'Thank you for subscribing! You will automatically receive official email notifications whenever new platforms and updates are published.'
          );
        }

        // Automatically hide the option after successful submission
        setTimeout(() => {
          setIsVisible(false);
        }, 1600);
      } else {
        setErrorMessage(data.error || 'Failed to save subscription. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage('Network error occurred. Your subscription could not be saved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="mrs-newsletter-subscribe-popup"
          initial={{ opacity: 0, y: 35, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.96, transition: { duration: 0.25 } }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed safe-bottom-assistant right-3 sm:right-5 z-40 w-[calc(100vw-1.5rem)] max-w-[400px] rounded-2xl p-4 sm:p-5 shadow-[var(--shadow-panel)] transition-colors bg-[var(--panel)] text-[var(--text)]"
        >
          {/* Header row with badge and close button */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl flex items-center justify-center bg-[var(--gold-tint)] text-[var(--gold)]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gold)]">
                  {triggerReason === 'visits' ? 'Frequent Visitor Privilege' : 'Active Visitor Briefing'}
                </span>
                <h4 className="text-sm font-bold font-heading tracking-tight mt-0.5 text-[var(--text)]">
                  Stay Updated with M R S
                </h4>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)] cursor-pointer"
              title="Maybe later"
              aria-label="Dismiss newsletter prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Success State */}
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-3 text-center"
            >
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-500/15 flex items-center justify-center text-[var(--success-text)]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-[var(--success-text)] mb-1">
                Subscribed Successfully!
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                You will automatically receive email notifications whenever new platforms and updates are published.
              </p>
            </motion.div>
          ) : (
            <>
              <p className="text-xs leading-relaxed mb-3.5 text-[var(--text-secondary)]">
                You’ve spent time exploring M R S’s work! Subscribe to automatically receive official launch briefings whenever new IT solutions, digital tools, or platform updates go live.
              </p>

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
                  <input
                    type="email"
                    required
                    maxLength={INPUT_LIMITS.EMAIL_MAX}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value.slice(0, INPUT_LIMITS.EMAIL_MAX));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="Enter your email address..."
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl transition-colors bg-[var(--bg)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--gold)]"
                  />
                </div>

                {errorMessage && (
                  <p className="text-[11px] text-[var(--danger-text)] font-medium">{errorMessage}</p>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 px-3 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-md hover:shadow-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] disabled:opacity-50 cursor-pointer min-h-[40px] touch-manipulation"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Subscribing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Subscribe for Updates</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-3 py-2 text-xs font-mono rounded-xl active:scale-95 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer touch-manipulation text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)]"
                  >
                    Later
                  </button>
                </div>

                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-0.5">
                  <span>Direct updates only &bull; Zero spam</span>
                  <span>Unsubscribe anytime</span>
                </div>
              </form>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
