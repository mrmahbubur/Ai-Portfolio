import React, { useRef, useEffect } from 'react';
import { Volume2, Copy, Check, Terminal, User, Bot, Trash2 } from 'lucide-react';
import { Message, AvatarState } from '../types';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';

interface TranscriptFeedProps {
  messages: Message[];
  avatarState: AvatarState;
  onReplayAudio: (text: string) => void;
  onClearHistory: () => void;
  personaName: string;
  onSelectPrompt?: (text: string) => void;
}

export const TranscriptFeed: React.FC<TranscriptFeedProps> = ({
  messages,
  avatarState,
  onReplayAudio,
  onClearHistory,
  personaName,
  onSelectPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, avatarState]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const starterPrompts = [
    { icon: '💻', title: 'Coding Help', prompt: 'Help me write or debug a script' },
    { icon: '🛠️', title: 'IT Support', prompt: 'How do I diagnose a slow PC and high memory usage?' },
    { icon: '✉️', title: 'Draft Email', prompt: 'Help me draft a professional inquiry email' },
    { icon: '🔬', title: 'Explain Topic', prompt: 'Explain how modern Large Language Models work' },
    { icon: '💼', title: 'M R S Projects', prompt: 'What projects and live platforms has M R S built?' },
    { icon: '📅', title: 'Contact M R S', prompt: 'How can I schedule a consultation or contact M R S?' },
  ];

  return (
    <div
      id="transcript-feed-section"
      className="flex flex-col h-full rounded-2xl bg-[var(--panel)] overflow-hidden shadow-[var(--shadow-card)]"
    >
      {/* Concierge Dialogue Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--panel-raised)]">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-[var(--gold)]" />
          <span className="font-mono text-xs font-semibold text-[var(--text)]">
            Concierge Dialogue Log
          </span>
          <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
          <span className="text-[11px] font-mono text-[var(--gold)]">
            {messages.length} Entries
          </span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClearHistory}
            title="Clear Chat Logs"
            className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-rose-400 transition-colors duration-300 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">CLEAR</span>
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs max-h-[380px] sm:max-h-[460px]">
        {(!messages || messages.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
            {/* Camellia Profile Avatar with Golden Glow */}
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-[var(--gold)] shadow-lg bg-[var(--panel-raised)] p-0.5">
                <img
                  src={CAMELLIA_AVATAR_SRC}
                  alt={personaName}
                  className="w-full h-full object-cover object-top rounded-full"
                />
              </div>
            </div>

            <h4 className="font-heading text-base sm:text-lg font-bold text-[var(--text)] mb-1">
              Hello! I am {personaName}.
            </h4>
            <p className="text-xs text-[var(--gold)] font-mono mb-2">
              All-Purpose AI Assistant · Here for Any Help
            </p>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-4 leading-relaxed font-sans">
              Ask me anything — just like ChatGPT or Claude. I can write and debug code, solve IT issues, draft emails, explain complex ideas, or guide you through M R S’s portfolio.
            </p>

            {/* Interactive Starter Chips */}
            <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {starterPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectPrompt?.(item.prompt)}
                  className="p-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)] transition-all duration-200 group flex items-start gap-2.5 text-left cursor-pointer"
                >
                  <span className="text-base shrink-0 group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-[var(--text)] group-hover:text-[var(--gold)] transition-colors">
                      {item.title}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {item.prompt}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          (messages || []).map((msg) => {
            const isUser = msg.role === 'user';
            const isCopied = copiedId === msg.id;

            return (
              <div
                key={msg.id}
                id={`msg-${msg.id}`}
                className={`flex gap-3 p-3.5 rounded-xl shadow-[var(--shadow-card)] transition-colors duration-300 ${
                  isUser
                    ? 'bg-[var(--bg)] text-[var(--text)] ml-4'
                    : 'bg-[var(--panel-raised)] text-[var(--text)] mr-4'
                }`}
              >
                {/* Speaker Avatar Icon */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center ${
                    isUser
                      ? 'bg-[var(--panel)] text-[var(--text)]'
                      : 'ring-1 ring-[var(--gold)]/40 shadow-xs'
                  }`}
                >
                  {isUser ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <img
                      src={CAMELLIA_AVATAR_SRC}
                      alt={personaName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-[11px] font-semibold text-[var(--gold)]">
                      {isUser ? 'Visitor' : personaName}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">{msg.timestamp}</span>
                  </div>

                  <p className="text-sm font-sans leading-relaxed text-[var(--text)] whitespace-pre-wrap">
                    {msg.text}
                  </p>

                  {/* Actions */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => onReplayAudio(msg.text)}
                      title="Replay Spoken Audio"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors duration-300 cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-[var(--gold)]" />
                      <span>Replay</span>
                    </button>
                    <span className="text-[var(--text-muted)]/40">&bull;</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--text)] transition-colors duration-300 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-[var(--success-text)]" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Thinking Indicator */}
        {avatarState === 'thinking' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--panel-raised)] ring-1 ring-[var(--gold)]/40 text-[var(--gold)]">
            <span className="text-xs font-mono">
              {personaName} is formulating response grounded in M R S’s official profile...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
};
