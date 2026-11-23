import React, { useState } from 'react';
import { SocialLinks } from '../types';
import { Mail, Calendar, Linkedin, Github, Twitter, Globe, BookOpen, ExternalLink, Send, CheckCircle2, MessageSquare, AlertCircle } from 'lucide-react';
import {
  INPUT_LIMITS,
  isValidEmailAddress,
  sanitizeEmailInput,
  sanitizeMailtoHref,
  sanitizeMultilineText,
  sanitizeSafeHref,
  sanitizeSingleLineText,
} from '../utils/inputSanitization';

interface ConciergeContactProps {
  socials?: SocialLinks;
  onSendInquiry: (name: string, email: string, note: string) => Promise<any> | void;
}

const DEFAULT_SOCIALS: SocialLinks = {
  email: 'mr216873@gmail.com',
  gravatarUrl: 'https://gravatar.com/mrxshahin',
  linkedinUrl: 'https://www.linkedin.com/in/mrxshahin/',
  githubUrl: 'https://github.com/mrxshahin',
  xUrl: 'https://x.com/mrxshahin',
  blueskyUrl: 'https://bsky.app/profile/mrxshahin.bsky.social',
  wordpressUrl: 'https://mrxshahin.blogspot.com',
  goodreadsUrl: 'https://www.goodreads.com/user/show/159495146-mrx-shahin',
  calendlyUrl: '',
};

export const ConciergeContact: React.FC<ConciergeContactProps> = ({
  socials = DEFAULT_SOCIALS,
  onSendInquiry,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const activeSocials = { ...DEFAULT_SOCIALS, ...socials };
  const safeEmail = isValidEmailAddress(activeSocials.email || '')
    ? sanitizeEmailInput(activeSocials.email)
    : 'mr216873@gmail.com';
  const safeCalendlyUrl = sanitizeSafeHref(activeSocials.calendlyUrl);
  const safeLinkedinUrl = sanitizeSafeHref(activeSocials.linkedinUrl);
  const safeGithubUrl = sanitizeSafeHref(activeSocials.githubUrl);
  const safeXUrl = sanitizeSafeHref(activeSocials.xUrl);
  const safeBlueskyUrl = sanitizeSafeHref(activeSocials.blueskyUrl);
  const safeWordpressUrl = sanitizeSafeHref(activeSocials.wordpressUrl);
  const safeGoodreadsUrl = sanitizeSafeHref(activeSocials.goodreadsUrl);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = sanitizeSingleLineText(name, INPUT_LIMITS.NAME_MAX);
    const rawCleanEmail = sanitizeEmailInput(email, INPUT_LIMITS.EMAIL_MAX);
    const cleanNote = sanitizeMultilineText(note, INPUT_LIMITS.MESSAGE_MAX);

    if (!cleanName) {
      setErrorMsg('Please enter your name or organization.');
      return;
    }
    if (rawCleanEmail && !isValidEmailAddress(rawCleanEmail)) {
      setErrorMsg('Please provide a valid email address or leave the optional email blank.');
      return;
    }
    if (!cleanNote) {
      setErrorMsg('Please enter a message before sending.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSendInquiry(cleanName, rawCleanEmail || 'guest@portfolio.com', cleanNote);
      setSent(true);
      setName('');
      setEmail('');
      setNote('');
      setTimeout(() => setSent(false), 8000);
    } catch {
      setErrorMsg('Unable to dispatch inquiry right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="contact-section" className="w-full p-6 sm:p-8 rounded-2xl bg-[var(--panel-raised)] transition-all duration-200">
      {/* Header */}
      <div className="mb-6 pb-3">
        <div className="flex items-center gap-2 font-mono text-xs text-[var(--gold)]">
          <Mail className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span>Direct Contact &amp; Channels</span>
        </div>
        <h2 className="font-heading text-2xl text-[var(--text)] font-bold tracking-tight mt-1">
          Connect with M R S
        </h2>
        <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
          Direct email to mr216873@gmail.com, verified networks, and instant messages
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Direct Links & Networks */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)]">
            <span className="block font-mono text-[11px] font-medium text-[var(--gold)] mb-1">
              Direct Primary Email · Private Dispatch
            </span>
            <a
              href={sanitizeMailtoHref(safeEmail)}
              className="text-base sm:text-lg font-mono text-[var(--text)] hover:text-[var(--gold)] transition-colors break-all flex items-center gap-2"
            >
              <Mail className="w-4 h-4 text-[var(--gold)] shrink-0" />
              <span>{safeEmail}</span>
            </a>
          </div>

          {/* Social Network Tiles */}
          <div className="grid grid-cols-2 gap-2.5">
            {safeCalendlyUrl && (
              <a
                href={safeCalendlyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-mono text-xs text-[var(--text)]">Calendly</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
              </a>
            )}

            <a
              href="https://mrmahbubur.github.io/Admin/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--gold)]" />
                <span className="font-mono text-xs text-[var(--text)]">Cloud Admin Portal</span>
              </div>
              <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
            </a>

            {safeLinkedinUrl && (
              <a
                href={safeLinkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Linkedin className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-mono text-xs text-[var(--text)]">LinkedIn</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
              </a>
            )}

            {safeGithubUrl && (
              <a
                href={safeGithubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Github className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-mono text-xs text-[var(--text)]">GitHub</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
              </a>
            )}

            {safeXUrl && (
              <a
                href={safeXUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Twitter className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-mono text-xs text-[var(--text)]">X / Twitter</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
              </a>
            )}

            {safeBlueskyUrl && (
              <a
                href={safeBlueskyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-mono text-xs text-[var(--text)]">Bluesky</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
              </a>
            )}

            {safeWordpressUrl && (
              <a
                href={safeWordpressUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-mono text-xs text-[var(--text)]">WordPress</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
              </a>
            )}

            {safeGoodreadsUrl && (
              <a
                href={safeGoodreadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] hover:bg-[var(--panel-hover)] shadow-[var(--shadow-card)] transition-all group"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--gold)]" />
                  <span className="font-mono text-xs text-[var(--text)]">Goodreads</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--gold)]" />
              </a>
            )}
          </div>
        </div>

        {/* Right Column: Direct Concierge Inquiry Note */}
        <div className="lg:col-span-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between gap-2 mb-2 font-mono text-[10px] uppercase tracking-wider text-[var(--gold)]">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3 text-[var(--gold)]" />
                <span>Direct Message to mr216873@gmail.com</span>
              </div>
              <span className="text-[var(--text-muted)]">Zero Storage</span>
            </div>

            <div>
              <input
                type="text"
                placeholder="Your Name or Organization"
                value={name}
                maxLength={INPUT_LIMITS.NAME_MAX}
                onChange={(e) => {
                  setName(e.target.value.slice(0, INPUT_LIMITS.NAME_MAX));
                  if (errorMsg) setErrorMsg(null);
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] ring-1 ring-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              />
            </div>

            <div>
              <input
                type="email"
                placeholder="Your Contact Email (Optional)"
                value={email}
                maxLength={INPUT_LIMITS.EMAIL_MAX}
                onChange={(e) => {
                  setEmail(e.target.value.slice(0, INPUT_LIMITS.EMAIL_MAX));
                  if (errorMsg) setErrorMsg(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] ring-1 ring-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              />
            </div>

            <div>
              <textarea
                rows={3}
                placeholder="How can M R S assist with your IT, Web, or Entrepreneurship needs?"
                value={note}
                maxLength={INPUT_LIMITS.MESSAGE_MAX}
                onChange={(e) => {
                  setNote(e.target.value.slice(0, INPUT_LIMITS.MESSAGE_MAX));
                  if (errorMsg) setErrorMsg(null);
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] ring-1 ring-[var(--border)] text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)] resize-none"
              />
              <div className="flex justify-end mt-1 font-mono text-[10px] text-[var(--text-muted)]">
                {note.length} / {INPUT_LIMITS.MESSAGE_MAX}
              </div>
            </div>

            {errorMsg && (
              <div role="alert" className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 text-[var(--danger-text)] font-mono text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] disabled:opacity-50 text-[var(--gold-ink)] text-xs font-mono tracking-wide font-semibold transition-all cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending...' : 'Send Message to mr216873@gmail.com'}</span>
            </button>

            {sent && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] font-mono text-xs text-[var(--text)] animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-[var(--success-text)]" />
                <span>Message routed directly to mr216873@gmail.com!</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
