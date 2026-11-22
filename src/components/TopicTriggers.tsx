import React from 'react';
import { User, Layers, Cpu, Mail, Sparkles, Volume2 } from 'lucide-react';
import { Topic, AvatarState } from '../types';
import { QUICK_TOPICS } from '../data/defaultProfile';

interface TopicTriggersProps {
  onSelectTopic: (topic: Topic) => void;
  activeTopicId: string | null;
  avatarState: AvatarState;
  disabled?: boolean;
}

export const TopicTriggers: React.FC<TopicTriggersProps> = ({
  onSelectTopic,
  activeTopicId,
  avatarState,
  disabled,
}) => {
  const getIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'User':
        return <User className={className} />;
      case 'Layers':
        return <Layers className={className} />;
      case 'Cpu':
        return <Cpu className={className} />;
      case 'Mail':
        return <Mail className={className} />;
      default:
        return <Sparkles className={className} />;
    }
  };

  return (
    <div id="topic-triggers-section" className="w-full">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-mono text-xs font-semibold text-[var(--text)]">
          Quick Topics
        </span>
        <span className="text-[11px] font-mono text-[var(--text-muted)]">
          Click to hear Camellia explain
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(QUICK_TOPICS || []).map((topic) => {
          const isActive = activeTopicId === topic.id;
          const isSpeakingThis = isActive && avatarState === 'speaking';

          return (
            <button
              key={topic.id}
              id={`topic-btn-${topic.id}`}
              disabled={disabled || (avatarState === 'thinking' && !isActive)}
              onClick={() => onSelectTopic(topic)}
              className={`group relative flex flex-col p-3 rounded-xl text-left transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--panel-raised)] ring-1 ring-[var(--gold)] shadow-[var(--shadow-panel)] scale-[1.01]'
                  : 'bg-[var(--panel)] hover:bg-[var(--panel-raised)] shadow-[var(--shadow-card)]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {/* Metadata & Icon */}
              <div className="flex items-center justify-between w-full mb-2">
                <span
                  className={`text-[11px] font-mono font-semibold ${
                    isActive
                      ? 'text-[var(--gold)]'
                      : 'text-[var(--text-muted)] group-hover:text-[var(--gold)]'
                  }`}
                >
                  {topic.badge}
                </span>

                {isSpeakingThis ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-[var(--gold)]">
                    <Volume2 className="w-3 h-3" />
                    Speaking
                  </span>
                ) : (
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[var(--gold)] text-[var(--gold-ink)]'
                        : 'bg-[var(--bg)] text-[var(--text-muted)] group-hover:text-[var(--gold)]'
                    }`}
                  >
                    {getIcon(topic.iconName, 'w-3.5 h-3.5')}
                  </div>
                )}
              </div>

              {/* Title & Subtitle */}
              <div className="font-heading font-semibold text-sm text-[var(--text)] mb-0.5 group-hover:text-[var(--gold)] transition-colors">
                {topic.title}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] leading-tight">
                {topic.subtitle}
              </div>

              {/* Bottom active bar */}
              {isActive && (
                <div className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-[var(--gold)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
