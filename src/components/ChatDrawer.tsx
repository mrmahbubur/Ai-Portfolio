import React, { useMemo } from 'react';
import { Message, AvatarState, BioProfile } from '../types';
import { TranscriptFeed } from './TranscriptFeed';
import { VoiceMicControls } from './VoiceMicControls';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';
import {
  X,
  Sparkles,
  Layers,
  Cpu,
  Briefcase,
  Compass,
  Mail,
  ExternalLink,
} from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  avatarState: AvatarState;
  onSendMessage: (text: string) => void;
  onReplayAudio: (text: string) => void;
  onClearHistory: () => void;
  personaName: string;
  onMicStateChange: (listening: boolean) => void;
  activeLanguage?: string;
  profile?: BioProfile;
}

interface QuickAskChip {
  id: string;
  label: string;
  question: string;
  contextHint?: string;
  icon: React.ReactNode;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  avatarState,
  onSendMessage,
  onReplayAudio,
  onClearHistory,
  personaName,
  onMicStateChange,
  activeLanguage = 'en-US',
  profile,
}) => {
  const quickAskChips = useMemo<QuickAskChip[]>(() => {
    const owner = profile?.ownerName || 'M R S';
    const chips: QuickAskChip[] = [];

    // 2. Projects (Contextual from profile.projects)
    if (profile?.projects && profile.projects.length > 0) {
      const topProjectNames = profile.projects
        .slice(0, 2)
        .map((p) => p.title)
        .join(', ');
      chips.push({
        id: 'projects',
        label: `Tell me about the ${profile.projects.length} featured projects`,
        question: `What featured projects and live platforms (${topProjectNames}, etc.) has ${owner} built?`,
        contextHint: `${profile.projects.length} live platforms`,
        icon: <Layers className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />,
      });
    }

    // 3. Core Skills (Contextual from profile.skillsList)
    if (profile?.skillsList && profile.skillsList.length > 0) {
      const primaryCategory = profile.skillsList[0]?.category || 'IT Support';
      chips.push({
        id: 'skills',
        label: 'What are your core IT skills?',
        question: `What are ${owner}'s core technical skills in ${primaryCategory} and Web Management?`,
        contextHint: `${profile.skillsList.length} skill domains`,
        icon: <Cpu className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />,
      });
    }

    // 4. Remote Services / What I Can Help With (Contextual from profile.whatICanHelpWith)
    if (profile?.whatICanHelpWith && profile.whatICanHelpWith.length > 0) {
      chips.push({
        id: 'services',
        label: 'What can you help me with?',
        question: `What remote IT support, documentation, and administrative services can ${owner} help with?`,
        contextHint: `${profile.whatICanHelpWith.length} core services`,
        icon: <Briefcase className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />,
      });
    }

    // 6. Interests (Contextual from profile.interests)
    if (profile?.interests && profile.interests.length > 0) {
      const topInterests = profile.interests.slice(0, 2).join(' & ');
      chips.push({
        id: 'interests',
        label: `Interests in ${topInterests}`,
        question: `What are ${owner}'s technical interests in ${profile.interests.join(', ')}?`,
        contextHint: `${profile.interests.length} focus areas`,
        icon: <Compass className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />,
      });
    }

    // 7. Contact & Consultation (Contextual from profile.socials)
    if (profile?.socials?.email || profile?.socials?.calendlyUrl) {
      chips.push({
        id: 'contact',
        label: `How can I contact ${owner}?`,
        question: `How can I contact ${owner} or schedule a consultation via Calendly?`,
        contextHint: profile.socials.email,
        icon: <Mail className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />,
      });
    }

    return chips;
  }, [profile]);

  if (!isOpen) return null;

  const isBusy = avatarState === 'thinking';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--bg)] h-full flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[var(--panel)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--bg)] p-0.5 shrink-0 shadow-xs">
              <img
                src={CAMELLIA_AVATAR_SRC}
                alt={personaName}
                className="w-full h-full object-cover object-top rounded-full"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-[17px] font-bold text-[var(--text)]">
                  {personaName} AI Assistant
                </h3>
              </div>
              <p className="font-mono text-[10px] text-[var(--gold)]">
                M R S Assistant · Interactive Voice &amp; Text Guide
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close chat drawer"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors duration-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camellia Assistant Linked Portal Bar */}
        <div className="px-4 py-2.5 bg-[var(--panel-raised)] flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
            <span className="text-[11px] font-mono text-[var(--text-secondary)] truncate">
              Connected: <strong className="text-[var(--gold)]">Camellia AI Studio</strong>
            </span>
          </div>

          <a
            href="https://camellia-assistant.ai.studio/"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Dedicated Camellia Assistant Portal (Realtime Data Shared)"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--gold)]/15 hover:bg-[var(--gold)]/25 text-[var(--gold)] font-mono text-[10.5px] font-semibold transition-colors shrink-0"
          >
            <span>Open AI Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Transcript Feed Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <TranscriptFeed
            messages={messages}
            avatarState={avatarState}
            onReplayAudio={onReplayAudio}
            onClearHistory={onClearHistory}
            personaName={personaName}
            onSelectPrompt={onSendMessage}
          />
        </div>

        {/* Dedicated Contextual Quick-Ask Suggestion Chip Bar */}
        <div
          id="chat-drawer-quick-ask-bar"
          className="px-4 py-3 bg-[var(--panel)]/95"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[var(--gold)]" />
              <span className="font-mono text-[11px] font-medium text-[var(--text-secondary)]">
                Quick-Ask · Contextual Profile Questions
              </span>
            </div>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              One-Tap
            </span>
          </div>

          <div
            className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin"
            role="region"
            aria-label="Quick-ask profile suggestion chips"
          >
            {quickAskChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={isBusy}
                title={chip.contextHint ? `${chip.question} (${chip.contextHint})` : chip.question}
                onClick={() => onSendMessage(chip.question)}
                className="group shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--panel-raised)] hover:bg-[var(--panel-hover)] text-xs font-medium text-[var(--text)] hover:text-[var(--gold)] transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap"
              >
                {chip.icon}
                <span className="whitespace-nowrap">{chip.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Voice & Text Input at Bottom */}
        <div className="p-4 bg-[var(--panel)]">
          <VoiceMicControls
            onSendMessage={onSendMessage}
            avatarState={avatarState}
            onMicStateChange={onMicStateChange}
            isTouring={false}
            disabled={isBusy}
            activeLanguage={activeLanguage}
          />
        </div>
      </div>
    </div>
  );
};
