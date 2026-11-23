import React, { useState, useEffect } from 'react';
import {
  FileText,
  Eye,
  Info,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Mail,
  Sparkles,
  ArrowLeft,
  Send,
  Layers,
  Check,
  Code,
} from 'lucide-react';

import { type AuthSessionUser } from '../lib/firebase';
import { sanitizeMailtoHref, sanitizeSafeHref } from '../utils/inputSanitization';

interface EmailUpdatePreviewProps {
  onBack: () => void;
  currentUser?: AuthSessionUser | null;
  onSendTestEmail?: () => void;
  testEmailStatus?: 'idle' | 'sending' | 'sent' | 'error';
}

export const EmailUpdatePreview: React.FC<EmailUpdatePreviewProps> = ({
  onBack,
  currentUser,
  onSendTestEmail,
  testEmailStatus = 'idle',
}) => {
  const [data, setData] = useState<{
    subject: string;
    text: string;
    html: string;
    project?: {
      title: string;
      category: string;
      description: string;
      tags: string[];
      link: string;
      launchStatus: string;
      assistantNote: string;
    };
    siteUrl?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'breakdown' | 'visual' | 'text'>('breakdown');

  const fetchPreview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/email/preview-update');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.warn('Failed to load email preview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, []);

  return (
    <div className="space-y-4">
      {/* Navigation & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--gold)] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to {currentUser ? 'Account Profile' : 'Sign Up / Sign In'}
        </button>

        <div className="flex items-center rounded-lg bg-[var(--panel)] p-1 shadow-[var(--shadow-card)]">
          <button
            type="button"
            onClick={() => setViewMode('breakdown')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'breakdown'
                ? 'bg-[var(--gold)] text-[var(--gold-ink)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Info className="w-3 h-3" /> Information Breakdown
          </button>
          <button
            type="button"
            onClick={() => setViewMode('visual')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'visual'
                ? 'bg-[var(--gold)] text-[var(--gold-ink)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Eye className="w-3 h-3" /> Visual Layout
          </button>
          <button
            type="button"
            onClick={() => setViewMode('text')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 ${
              viewMode === 'text'
                ? 'bg-[var(--gold)] text-[var(--gold-ink)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text)]'
            }`}
          >
            <Code className="w-3 h-3" /> Plain Text
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-8 text-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[var(--gold)] mx-auto" />
          <p className="text-xs font-mono text-[var(--text-secondary)]">Loading update email template & structure...</p>
        </div>
      ) : !data ? (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
          Unable to fetch email preview. Please ensure the server is active.
        </div>
      ) : (
        <>
          {/* Quick Header Summary */}
          <div className="p-3.5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>Dispatch Reason:</span>
              <span className="text-[var(--gold)] font-semibold">New Platform / Project Launch</span>
            </div>
            <div className="text-sm font-heading font-bold text-[var(--text)]">
              {data.subject}
            </div>
            <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
              <span>Sender: <strong>Camellia (M R S Assistant)</strong> &lt;mr216873@gmail.com&gt;</span>
            </div>
          </div>

          {/* VIEW 1: Information Breakdown (What is included vs what is not) */}
          {viewMode === 'breakdown' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[var(--bg)] space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--text)] tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-[var(--success-text)]" />
                  <span>Information Explicitly Included in Every Update Email</span>
                </div>

                <div className="space-y-2.5 text-xs font-mono text-[var(--text-secondary)]">
                  {/* Item 1 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>1. Platform Title &amp; Release Category</span>
                      <span className="text-[11px] text-[var(--gold)] font-semibold">
                        {data.project?.category || 'Enterprise IT'}
                      </span>
                    </div>
                    <p className="text-[11px]">
                      The verified name of the newly launched application or service (e.g. <em>"{data.project?.title}"</em>) so you immediately know what was published.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>2. Technical Project Abstract &amp; Solution Overview</span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Architecture
                      </span>
                    </div>
                    <p className="text-[11px]">
                      Detailed description of the technical challenges resolved, infrastructure design, and business utility of the platform.
                    </p>
                  </div>

                  {/* Item 3 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>3. Claude AI Voice Narrative Briefing</span>
                      <span className="text-[11px] text-[var(--gold)]">
                        Camellia
                      </span>
                    </div>
                    <p className="text-[11px]">
                      A thoughtful, warm technical briefing from Camellia (M R S Assistant) in the authentic Claude AI female voice persona explaining key benefits and operational highlights.
                    </p>
                  </div>

                  {/* Item 4 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>4. Core Tech Stack &amp; Metadata</span>
                      <span className="text-[11px] text-[var(--success-text)]">
                        Stack
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-[var(--text)]">
                      {data.project?.tags?.map((tag, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>}
                          <span>{tag}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Item 5 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>5. Direct 1-Click Launch Link</span>
                      <span className="text-[11px] text-[var(--gold)]">
                        Direct Access
                      </span>
                    </div>
                    <p className="text-[11px]">
                      Direct URL to access the deployed system or interactive showcase immediately on this site without needing to hunt for links.
                    </p>
                  </div>

                  {/* Item 6 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>6. Featured Platform &amp; Projects Hub Link</span>
                      <span className="text-[11px] text-[var(--gold)]">
                        Featured Hub
                      </span>
                    </div>
                    <p className="text-[11px]">
                      Dedicated link to M R S’s premier interactive platform (<code className="text-[var(--gold)]">https://mrxshahin.ai.studio/</code>) showcasing live projects, multimodal AI tools, and full platform catalog.
                    </p>
                  </div>

                  {/* Item 7 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>7. 100% Free &amp; Open Access Guarantee Notice</span>
                      <span className="text-[11px] text-[var(--success-text)]">
                        Open Access
                      </span>
                    </div>
                    <p className="text-[11px]">
                      Every email explicitly clarifies that M R S portfolio is 100% open and free to explore for everyone without requiring subscriptions or paid tiers.
                    </p>
                  </div>

                  {/* Item 8 */}
                  <div className="p-2.5 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] space-y-1">
                    <div className="font-bold text-[var(--text)] flex items-center justify-between gap-2">
                      <span>8. Verified Contact &amp; 1-Click Unsubscribe</span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Compliance
                      </span>
                    </div>
                    <p className="text-[11px]">
                      Verified recipient address (<code>mr216873@gmail.com</code>) and an instant unsubscribe link allowing you to opt out at any moment.
                    </p>
                  </div>
                </div>
              </div>

              {/* What is NOT included */}
              <div className="p-3.5 rounded-xl bg-[var(--bg)] space-y-2 text-xs font-mono">
                <div className="font-bold text-[var(--text)] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--gold)]" />
                  <span>What is NOT Included (Zero Spam Commitment)</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-[var(--text-secondary)]">
                  <li><strong>No Marketing Spam or Third-Party Ads:</strong> You will never receive marketing promotions, sales funnels, or affiliate offers.</li>
                  <li><strong>No Unsolicited Newsletters:</strong> Dispatches only trigger upon genuine project launches or verified technical blog releases.</li>
                  <li><strong>No Data Sharing:</strong> Your email address is never sold, shared, or exposed to external marketers.</li>
                </ul>
              </div>
            </div>
          )}

          {/* VIEW 2: Visual Email Preview (Rendered as in an Email Client) */}
          {viewMode === 'visual' && (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden border border-[var(--border)] bg-[#0B0F19] text-[#F8FAFC]">
                {/* Email Client Window Header */}
                <div className="px-4 py-2.5 bg-[#131B2E] border-b border-[#1E293B] text-[11px] font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 text-[#E2B867]">M R S Updates • Inbox Preview</span>
                  </div>
                  <span className="text-[#64748B]">HTML 5 Email</span>
                </div>

                {/* Email Header Bar */}
                <div className="p-5 border-b border-[#1E293B] space-y-1">
                  <div className="text-[10px] font-mono tracking-widest text-[#E2B867] font-bold uppercase">
                    M R S • IT Support Professional & Web Manager
                  </div>
                  <h3 className="text-base font-heading font-bold text-[#F8FAFC]">
                    New Project Announcement: {data.project?.title}
                  </h3>
                  <p className="text-[11px] text-[#94A3B8] font-mono">
                    From: Camellia (M R S Assistant) &lt;mr216873@gmail.com&gt;
                  </p>
                </div>

                {/* Email Body Contents */}
                <div className="p-5 space-y-4 text-xs font-mono">
                  {/* Persona Greeting */}
                  <div className="p-3 rounded-lg bg-[#131B2E] border border-[#1E293B] flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-[#E2B867] shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-[#F8FAFC]">Hello Subscriber,</div>
                      <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                        I am pleased to share that M R S has just deployed a new featured project to the digital portfolio. Here are the core specifications and architecture details.
                      </p>
                    </div>
                  </div>

                  {/* Featured Project Showcase Card */}
                  <div className="p-4 rounded-xl bg-[#131B2E] border border-[#E2B867]/40 space-y-3">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-[#E2B867]/20 text-[#E2B867] font-bold uppercase tracking-wider">
                        {data.project?.launchStatus || 'FEATURED LAUNCH'}
                      </span>
                      <span className="text-[#94A3B8] uppercase">
                        {data.project?.category}
                      </span>
                    </div>

                    <h4 className="text-base font-bold font-heading text-[#F8FAFC]">
                      {data.project?.title}
                    </h4>

                    <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                      {data.project?.description}
                    </p>

                    {/* Claude AI Audio/Narrative Note */}
                    <div className="p-3 rounded-lg bg-[#0B0F19] border border-[#1E293B] space-y-1">
                      <div className="text-[10px] text-[#E2B867] font-bold uppercase tracking-wider">
                        Assistant Technical Briefing:
                      </div>
                      <p className="text-[11px] text-[#CBD5E1] italic leading-relaxed">
                        "{data.project?.assistantNote}"
                      </p>
                    </div>

                    {/* Tech Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {data.project?.tags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-[#0B0F19] text-[#E2B867] border border-[#1E293B] text-[10px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <div className="pt-2">
                      <div className="inline-block py-2.5 px-4 rounded-lg bg-[#E2B867] text-[#0B0F19] font-bold text-xs uppercase tracking-wider shadow-sm">
                        Explore Platform & Architecture &rarr;
                      </div>
                    </div>
                  </div>

                  {/* Featured Platform & Projects Link Card */}
                  <div className="p-3.5 rounded-lg bg-[#131B2E] border border-[#2A3859] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#E2B867] font-bold font-mono uppercase tracking-wider">
                        ★ Featured Platform &amp; Projects Link
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E2B867]/15 text-[#E2B867] border border-[#E2B867]/30 font-mono">
                        FEATURED HUB
                      </span>
                    </div>
                    <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                      Explore M R S’s interactive AI concierge platform, full portfolio directory, remote IT services, and live web management showcase:
                    </p>
                    <a
                      href={sanitizeSafeHref('https://mrxshahin.ai.studio/') || 'https://mrxshahin.ai.studio/'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#0B0F19] border border-[#E2B867]/60 text-[#E2B867] text-[11px] font-mono font-bold hover:underline"
                    >
                      <span>https://mrxshahin.ai.studio/</span>
                      <span>↗</span>
                    </a>
                  </div>

                  {/* Open Access Note */}
                  <div className="p-3 rounded-lg bg-[#131B2E] border border-[#1E293B] text-[11px] text-[#94A3B8] leading-relaxed">
                    <strong className="text-[#F8FAFC]">Open Access Guarantee:</strong> M R S’s portfolio is always completely free and openly accessible. You can view all live demos, documentation, and source materials anytime without requiring an account.
                  </div>

                  {/* Email Footer */}
                  <div className="pt-3 border-t border-[#1E293B] text-[10px] text-[#64748B] space-y-1">
                    <div>Sent with care by <strong>Camellia (M R S Assistant)</strong> • IT Support &amp; Remote Ops Guide</div>
                    <div>Direct Contact: <a href={sanitizeMailtoHref('mr216873@gmail.com')} className="text-[#E2B867] underline">mr216873@gmail.com</a></div>
                    <div>You are receiving this because you subscribed on M R S Portfolio. <span className="underline text-[#94A3B8] cursor-pointer">Unsubscribe</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: Raw Plain Text */}
          {viewMode === 'text' && (
            <div className="p-3.5 rounded-xl bg-[var(--bg)] space-y-2">
              <div className="text-[11px] font-mono text-[var(--text-muted)] tracking-wider">
                Raw Plain-Text Email Stream
              </div>
              <pre className="p-3 rounded-lg bg-[var(--panel)] shadow-[var(--shadow-card)] text-[11px] font-mono text-[var(--text)] whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96">
                {data.text}
              </pre>
            </div>
          )}

          {/* Quick Dispatch / Test Trigger for Signed in users */}
          {currentUser && onSendTestEmail && (
            <div className="p-3.5 rounded-xl bg-[var(--panel)] shadow-[var(--shadow-card)] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono text-[var(--text-secondary)]">
                Send a live test copy of this update email directly to <strong>{currentUser.email}</strong>
              </div>
              <button
                type="button"
                onClick={onSendTestEmail}
                disabled={testEmailStatus === 'sending'}
                className="w-full sm:w-auto py-2 px-3.5 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] font-mono text-xs font-semibold tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                {testEmailStatus === 'sending' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching...
                  </>
                ) : testEmailStatus === 'sent' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Dispatched to Inbox!
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" /> Send Test to My Inbox
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
