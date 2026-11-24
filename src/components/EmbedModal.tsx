import React, { useState } from 'react';
import { X, Copy, Check, Code2, Globe } from 'lucide-react';
import { resolveBrowserOrigin } from '../utils/inputSanitization';

interface EmbedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmbedModal: React.FC<EmbedModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [embedWidth, setEmbedWidth] = useState('100%');
  const [embedHeight, setEmbedHeight] = useState('720px');
  const [allowMic, setAllowMic] = useState(true);

  if (!isOpen) return null;

  const currentUrl = resolveBrowserOrigin('https://mrxshahin.blogspot.com');

  const embedCode = `<iframe
  src="${currentUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  style="border: 1px solid rgba(226, 184, 103, 0.22); border-radius: 16px; background: #0B0F19;"
  allow="${allowMic ? 'microphone;' : ''} clipboard-write"
  loading="lazy"
  title="Camellia (M R S Assistant) — Personal Concierge for M R S"
></iframe>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="embed-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full h-full sm:h-auto max-w-3xl sm:max-h-[90vh] flex flex-col sm:rounded-2xl bg-[var(--panel)] overflow-hidden font-sans text-[var(--text)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--panel-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--panel)] flex items-center justify-center text-[var(--gold)]">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-[var(--text)] font-heading">
                Blogspot &amp; Website Embed Generator
              </h2>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Deploy Camellia (M R S Assistant) as a concierge widget on Blogspot or any CMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors duration-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm">
          {/* Customization Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono text-[var(--text-muted)] tracking-[0.12em] uppercase mb-1">Widget Width</label>
              <input
                type="text"
                value={embedWidth}
                onChange={(e) => setEmbedWidth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] ring-1 ring-[var(--border)] text-[var(--text)] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[var(--text-muted)] tracking-[0.12em] uppercase mb-1">Widget Height</label>
              <input
                type="text"
                value={embedHeight}
                onChange={(e) => setEmbedHeight(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg)] ring-1 ring-[var(--border)] text-[var(--text)] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 pb-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowMic}
                  onChange={(e) => setAllowMic(e.target.checked)}
                  className="accent-[var(--gold)] w-4 h-4 rounded"
                />
                <span className="text-xs font-mono text-[var(--text-secondary)] tracking-[0.12em] uppercase">Allow Mic</span>
              </label>
            </div>
          </div>

          {/* Embed Code Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-[0.12em] text-[var(--gold)]">
                HTML iFrame Snippet
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--emerald)] hover:opacity-90 text-[var(--emerald-text)] font-mono text-xs tracking-[0.12em] uppercase transition-colors duration-300 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED' : 'COPY CODE'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-[var(--bg)] font-mono text-xs text-[var(--gold)] overflow-x-auto leading-relaxed">
              <code>{embedCode}</code>
            </pre>
          </div>

          {/* Blogspot Integration Instructions */}
          <div className="p-4 rounded-xl bg-[var(--bg)] space-y-2">
            <h4 className="font-mono text-xs font-medium text-[var(--gold)] uppercase tracking-[0.12em] flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-[var(--gold)]" />
              <span>How to add to Blogspot (mrsadmin.blogspot.com):</span>
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--text-secondary)] font-sans leading-relaxed">
              <li>Open your Blogspot Dashboard &rarr; <strong>Layout</strong>.</li>
              <li>Click <strong>Add a Gadget</strong> in your Sidebar or Main Section.</li>
              <li>Choose <strong>HTML/JavaScript</strong> gadget.</li>
              <li>Paste the snippet above into the Content field and save.</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--panel-raised)] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[var(--gold)] hover:brightness-105 text-[var(--gold-ink)] font-mono font-semibold text-xs uppercase tracking-[0.12em] transition-colors duration-300 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
