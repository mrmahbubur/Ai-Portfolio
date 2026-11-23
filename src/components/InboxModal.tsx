import React, { useState } from 'react';
import { InquiryMessage } from '../types';
import {
  Inbox,
  Mail,
  Trash2,
  X,
  ExternalLink,
  CheckCircle2,
  Clock,
  User,
  Copy,
  Check,
  Send,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { sanitizeMailtoHref } from '../utils/inputSanitization';

interface InboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiries: InquiryMessage[];
  onDeleteInquiry: (id: string) => void;
  onClearAll: () => void;
  onRefresh?: () => void;
  ownerEmail?: string;
}

export const InboxModal: React.FC<InboxModalProps> = ({
  isOpen,
  onClose,
  inquiries,
  onDeleteInquiry,
  onClearAll,
  onRefresh,
  ownerEmail = 'mr216873@gmail.com',
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full h-full sm:h-auto max-w-3xl bg-[var(--panel)] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:max-h-[85vh] text-[var(--text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[var(--panel-raised)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--bg)] text-[var(--gold)]">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-[var(--text)]">
                  Messages &amp; Inquiries Inbox
                </h3>
                <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                <span className="text-xs font-mono font-medium text-[var(--gold)]">
                  {inquiries.length} {inquiries.length === 1 ? 'Message' : 'Messages'}
                </span>
              </div>
              <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
                Recipient Email: <span className="text-[var(--gold)] font-medium">{ownerEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                title="Refresh messages"
                className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-2.5 bg-[var(--bg)] text-xs font-mono text-[var(--text-secondary)] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-text)] flex-shrink-0" />
            <span>Inquiries submitted from the profile contact form are stored here &amp; routed to your email.</span>
          </div>
          {inquiries.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] text-[var(--danger-text)] hover:opacity-80 transition-opacity whitespace-nowrap cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Message List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {inquiries.length === 0 ? (
            <div className="py-12 text-center space-y-3 font-mono">
              <div className="w-12 h-12 rounded-full bg-[var(--bg)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                <Mail className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-[var(--text)]">No Messages in Inbox Yet</div>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                When visitors fill out the Contact &amp; Inquiries form on your verified portfolio profile, their messages will appear here and trigger assistant notifications.
              </p>
            </div>
          ) : (
            inquiries.map((inq) => {
              const formattedDate = new Date(inq.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              });

              return (
                <div
                  key={inq.id}
                  className="p-4 rounded-xl bg-[var(--bg)] hover:bg-[var(--panel-raised)] transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--panel)] flex items-center justify-center text-[var(--gold)] font-bold text-[10px]">
                        {inq.senderName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-[var(--text)]">{inq.senderName}</span>
                      <span className="text-[var(--text-muted)]">&lt;{inq.senderEmail}&gt;</span>
                    </div>

                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-[11px]">
                      <Clock className="w-3 h-3 text-[var(--gold)]" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Message Body */}
                  <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap font-sans">
                    {inq.message}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      {/* Direct Reply Link via Mailto */}
                      <a
                        href={sanitizeMailtoHref(
                          inq.senderEmail,
                          `Re: Inquiry from ${ownerEmail}`,
                          `\n\n--- Original Inquiry ---\nFrom: ${inq.senderName} (${inq.senderEmail})\nDate: ${formattedDate}\n\n${inq.message}`,
                          ownerEmail
                        )}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] font-semibold transition-colors cursor-pointer shadow-sm"
                      >
                        <Mail className="w-3 h-3" />
                        Reply via Email
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            inq.id,
                            `From: ${inq.senderName} <${inq.senderEmail}>\nDate: ${formattedDate}\n\n${inq.message}`
                          )
                        }
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--panel)] hover:bg-[var(--panel-raised)] text-[var(--text-secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
                      >
                        {copiedId === inq.id ? (
                          <>
                            <Check className="w-3 h-3 text-[var(--success-text)]" />
                            <span className="text-[var(--success-text)] text-[11px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteInquiry(inq.id)}
                      title="Delete message"
                      className="p-1.5 rounded-lg bg-[var(--panel)] hover:bg-rose-500/15 text-[var(--text-muted)] hover:text-[var(--danger-text)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[var(--panel-raised)] flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
          <span>Connected Mailbox: {ownerEmail}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--bg)] hover:bg-[var(--panel)] text-[var(--text)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
