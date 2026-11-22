import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { AvatarState } from '../types';
import { Volume2, VolumeX, Mic, MessageSquare, ChevronDown, RotateCcw, ExternalLink, Sparkles, Radio } from 'lucide-react';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';
import { audioEngine } from '../utils/audio';

interface FloatingAssistantProps {
  avatarState: AvatarState;
  audioLevel: number;
  phonemeWeight: number;
  currentCaption: string;
  activeExplainKey: string | null;
  pendingNavigationUrl?: string | null;
  onAssistantClick: () => void;
  onMicToggle: () => void;
  isMicActive: boolean;
  onStopSpeech: () => void;
  onReplaySpeech: () => void;
  onSkipToPendingUrl?: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenChat: () => void;
  onOpenLiveVoice?: () => void;
}

export const FloatingAssistant: React.FC<FloatingAssistantProps> = ({
  avatarState,
  audioLevel,
  phonemeWeight,
  currentCaption,
  activeExplainKey,
  pendingNavigationUrl,
  onAssistantClick,
  onMicToggle,
  isMicActive,
  onStopSpeech,
  onReplaySpeech,
  onSkipToPendingUrl,
  isMuted,
  onToggleMute,
  onOpenChat,
  onOpenLiveVoice,
}) => {
  const [showCaptionBubble, setShowCaptionBubble] = useState(false);
  const [captionManuallyDismissed, setCaptionManuallyDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarFrameRef = useRef<HTMLDivElement | null>(null);

  // Photorealistic 3D perspective head-pose & ambient rim-light tracking
  const [pose, setPose] = useState({
    rotateX: 0,
    rotateY: 0,
    shiftX: 0,
    shiftY: 0,
    sheenX: 50,
    sheenY: 30,
    attentionScale: 1,
  });
  const [isBlinking, setIsBlinking] = useState(false);
  const rafIdRef = useRef<number | null>(null);

  const isSpeaking = avatarState === 'speaking';
  const isListening = avatarState === 'listening' || isMicActive;
  const isThinking = avatarState === 'thinking';
  const isIdle = avatarState === 'idle' && !isMicActive;

  // Real-time cursor attention & 3D perspective head tilt
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;

      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!avatarFrameRef.current) return;

        const rect = avatarFrameRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.36;

        const dx = lastX - cx;
        const dy = lastY - cy;
        const dist = Math.hypot(dx, dy);

        const maxSpanX = Math.max(320, window.innerWidth * 0.45);
        const maxSpanY = Math.max(320, window.innerHeight * 0.45);
        const normX = Math.max(-1, Math.min(1, Math.tanh((dx / maxSpanX) * 1.2)));
        const normY = Math.max(-1, Math.min(1, Math.tanh((dy / maxSpanY) * 1.2)));

        const proximity = Math.max(0, 1 - dist / 420);

        setPose({
          rotateY: Number((normX * 7.5).toFixed(2)),
          rotateX: Number((-normY * 6.0).toFixed(2)),
          shiftX: Number((normX * 2.2).toFixed(2)),
          shiftY: Number((normY * 1.8).toFixed(2)),
          sheenX: Number((50 + normX * 26).toFixed(1)),
          sheenY: Number((35 + normY * 22).toFixed(1)),
          attentionScale: Number((1.0 + proximity * 0.035).toFixed(3)),
        });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Natural human blink cadence (subtle luminance dip without distorting facial pixels)
  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout> | null = null;
    let resetTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleBlink = () => {
      const interval = 3200 + Math.random() * 4800;
      blinkTimeout = setTimeout(() => {
        setIsBlinking(true);
        resetTimeout = setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 145);
      }, interval);
    };

    scheduleBlink();
    return () => {
      if (blinkTimeout) clearTimeout(blinkTimeout);
      if (resetTimeout) clearTimeout(resetTimeout);
    };
  }, []);

  const startAutoHideTimer = () => {
    if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    autoHideTimerRef.current = setTimeout(() => {
      setShowCaptionBubble(false);
    }, 5200);
  };

  // Auto-open live caption whenever Camellia speaks a new narration, then auto-hide 5.2s after she finishes
  useEffect(() => {
    if (isSpeaking && currentCaption) {
      if (!captionManuallyDismissed) {
        setShowCaptionBubble(true);
      }
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    } else if (!isSpeaking && showCaptionBubble) {
      startAutoHideTimer();
    }
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [isSpeaking, currentCaption, captionManuallyDismissed]);

  // Reset manual dismiss when caption text changes cleanly
  useEffect(() => {
    if (currentCaption) {
      setCaptionManuallyDismissed(false);
    }
  }, [currentCaption]);

  const handleMouseEnterCaption = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  };

  const handleMouseLeaveCaption = () => {
    if (!isSpeaking) {
      startAutoHideTimer();
    }
  };

  const vocalIntensity = isSpeaking ? Math.min(1, Math.max(audioLevel, phonemeWeight * 0.65)) : 0;

  return (
    <aside
      id="mrs-assistant"
      aria-label="Camellia — M R S Assistant interactive guide"
      className="fixed safe-bottom-assistant left-3 sm:left-6 z-40 flex flex-col items-start pointer-events-none select-none transition-all duration-300 max-w-[calc(100vw-1.5rem)]"
    >
      {/* Live Synchronized Speech Caption Bar */}
      {showCaptionBubble && (isSpeaking || currentCaption) ? (
        <div
          id="caption-bar"
          aria-live="polite"
          onMouseEnter={handleMouseEnterCaption}
          onMouseLeave={handleMouseLeaveCaption}
          className="pointer-events-auto max-w-[calc(100vw-1.5rem)] w-full sm:max-w-[360px] mb-2.5 p-3.5 sm:p-4 rounded-2xl bg-[var(--panel)]/95 ring-1 ring-[var(--border)] text-[var(--text)] transition-all duration-200 shadow-[var(--shadow-panel)] backdrop-blur-md animate-fadeIn text-left"
        >
          <div className="flex items-center justify-between gap-2 pb-2 mb-2">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium tracking-[0.08em] text-[var(--gold)]">
              <Radio className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
              <span>Camellia</span>
              <span className="text-[10px] text-[var(--text-muted)] font-normal">
                · M R S Assistant
              </span>
              {activeExplainKey && (
                <span className="text-[var(--text-muted)] font-normal text-[10.5px] truncate max-w-[100px] sm:max-w-none">
                  · {activeExplainKey}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {isSpeaking && (
                <button
                  type="button"
                  onClick={onStopSpeech}
                  title="Pause / Stop voice"
                  className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors duration-200 cursor-pointer"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onReplaySpeech}
                title="Replay explanation"
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] transition-colors duration-200 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setCaptionManuallyDismissed(true);
                  setShowCaptionBubble(false);
                }}
                title="Minimize caption"
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel-raised)] transition-colors duration-200 cursor-pointer"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="leading-relaxed font-sans text-[13px] sm:text-[14px] text-[var(--text)] selection:bg-[var(--gold)]/40">
            {currentCaption}
          </p>

          {pendingNavigationUrl && isSpeaking && (
            <div className="mt-3 flex items-center justify-between gap-2 bg-[var(--panel-raised)] p-2.5 rounded-lg">
              <span className="text-[11px] sm:text-[12px] font-mono text-[var(--gold)] flex items-center gap-1.5">
                <Radio className="w-3 h-3 shrink-0" />
                Navigating when narration finishes...
              </span>
              {onSkipToPendingUrl && (
                <button
                  type="button"
                  onClick={onSkipToPendingUrl}
                  className="text-[11px] sm:text-[12px] font-mono font-medium px-2.5 py-1 rounded bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] transition-colors duration-200 flex items-center gap-1 cursor-pointer"
                >
                  <span>Go Now</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {isSpeaking && !pendingNavigationUrl && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-1.5">
              {audioEngine.getSpectrumBands(6, audioLevel).map((mag, i) => (
                <div
                  key={i}
                  className="w-1 bg-[var(--gold)] rounded-full transition-all duration-100"
                  style={{
                    height: `${Math.max(4, Math.round(4 + mag * 14))}px`,
                    opacity: 0.6 + mag * 0.4,
                  }}
                />
              ))}
              <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)] tracking-normal truncate">
                Kore Studio Voice &middot; Narrating
              </span>
            </div>
          )}
        </div>
      ) : (
        currentCaption ? (
          <button
            type="button"
            onClick={() => {
              setCaptionManuallyDismissed(false);
              setShowCaptionBubble(true);
              if (!isSpeaking) startAutoHideTimer();
            }}
            title="Show Camellia speech caption"
            className="pointer-events-auto mb-2 px-3 py-1.5 rounded-xl bg-[var(--panel)]/95 hover:bg-[var(--panel-raised)] ring-1 ring-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--gold)] font-mono text-[11px] flex items-center gap-1.5 transition-all duration-200 shadow-[var(--shadow-card)] cursor-pointer backdrop-blur-md"
          >
            <MessageSquare className="w-3 h-3 text-[var(--gold)]" />
            <span>Show Caption</span>
          </button>
        ) : null
      )}

      {/* Photorealistic Living AI Persona Stage */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative pointer-events-auto cursor-pointer group flex flex-col items-start"
      >
        {/* Status Indicator */}
        <div
          className={`mb-1.5 px-2.5 py-1 rounded-xl bg-[var(--panel)]/95 ring-1 ring-[var(--border)] font-mono text-[10px] sm:text-[11px] text-[var(--gold)] flex items-center gap-1.5 transition-all duration-200 shadow-[var(--shadow-card)] backdrop-blur-md ${
            isHovered || isSpeaking || isListening ? 'opacity-100' : 'opacity-90'
          }`}
        >
          {isSpeaking ? (
            <Volume2 className="w-3 h-3 text-[var(--gold)] shrink-0" />
          ) : isListening ? (
            <Mic className="w-3 h-3 text-[var(--success-text)] shrink-0" />
          ) : (
            <Sparkles className="w-3 h-3 text-[var(--gold)] shrink-0" />
          )}
          <span className="font-medium">
            {isSpeaking
              ? 'Narrating'
              : isListening
              ? 'Listening...'
              : isThinking
              ? 'Formulating...'
              : isHovered
              ? 'Ask Camellia'
              : 'Camellia AI'}
          </span>
        </div>

        {/* Real 3D Perspective Portrait Card with Audio-Reactive Halo */}
        <motion.div
          ref={avatarFrameRef}
          onClick={onAssistantClick}
          title="Camellia AI Assistant — Click for voice narration or assistance"
          animate={
            isIdle
              ? {
                  scale: [1, 1.022, 1.006, 1.028, 1],
                  transition: {
                    duration: 3.6,
                    repeat: Infinity,
                    repeatType: 'loop',
                    ease: 'easeInOut',
                    times: [0, 0.16, 0.32, 0.48, 1],
                  },
                }
              : isSpeaking
              ? {
                  scale: 1.02 + vocalIntensity * 0.035,
                  transition: { duration: 0.12 },
                }
              : isListening
              ? {
                  scale: 1.025,
                  transition: { duration: 0.25 },
                }
              : {
                  scale: [1, 1.016, 1],
                  transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' },
                }
          }
          whileHover={{ scale: 1.045 }}
          whileTap={{ scale: 0.97 }}
          style={{
            perspective: '850px',
            boxShadow: isSpeaking
              ? `0 0 ${22 + Math.round(vocalIntensity * 18)}px rgba(226, 184, 103, ${0.28 + vocalIntensity * 0.35})`
              : isListening
              ? '0 0 24px rgba(16, 185, 129, 0.32)'
              : undefined,
          }}
          className={`relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-2xl p-1 bg-gradient-to-b from-[var(--gold)]/55 via-[var(--panel-raised)] to-[var(--panel)] transition-all duration-300 shadow-2xl overflow-hidden ${
            isSpeaking
              ? 'ring-2 ring-[var(--gold)]/85'
              : isListening
              ? 'ring-2 ring-emerald-400/85'
              : ''
          }`}
        >
          {/* 3D Pose Inner Stage */}
          <div
            className="relative w-full h-full overflow-hidden rounded-xl transition-transform duration-200 ease-out will-change-transform"
            style={{
              transform: `rotateX(${pose.rotateX}deg) rotateY(${pose.rotateY}deg) translate3d(${pose.shiftX}px, ${pose.shiftY}px, 0) scale(${pose.attentionScale})`,
            }}
          >
            <img
              src={CAMELLIA_AVATAR_SRC}
              alt="Camellia — M R S Assistant"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top transition-all duration-150"
              style={{
                filter: isBlinking
                  ? 'brightness(0.91) contrast(1.03)'
                  : isSpeaking
                  ? `brightness(${(1 + vocalIntensity * 0.05).toFixed(2)}) saturate(${(1.02 + vocalIntensity * 0.08).toFixed(2)})`
                  : 'brightness(1)',
              }}
            />

            {/* Subtle Natural Blink Soft-Focus Micro Veil */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-[24%] h-[16%] pointer-events-none transition-opacity duration-100"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(168, 124, 92, 0.36) 0%, transparent 72%)',
                opacity: isBlinking ? 0.85 : 0,
              }}
            />

            {/* Dynamic Studio Specular Sheen Following Gaze */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle at ${pose.sheenX}% ${pose.sheenY}%, rgba(255, 240, 200, 0.16) 0%, transparent 58%)`,
                opacity: isHovered || isSpeaking ? 0.95 : 0.45,
              }}
            />

            {/* Real Web Audio FFT Vocal Wave Overlay when Speaking */}
            {isSpeaking && (
              <div className="absolute inset-x-2 bottom-1.5 flex items-end justify-center gap-0.5 h-4 pointer-events-none z-15">
                {audioEngine.getSpectrumBands(7, audioLevel).map((mag, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full bg-[var(--gold)] shadow-[0_0_6px_rgba(226,184,103,0.9)] transition-all duration-75"
                    style={{
                      height: `${Math.max(3, Math.round(3 + mag * 13))}px`,
                      opacity: 0.72 + mag * 0.28,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="absolute top-2 right-2 p-1 rounded-full bg-[var(--hud-bg)] text-[var(--gold)] shadow-xs z-20">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        </motion.div>

        {/* Quick Interaction Toolbar */}
        <div
          className={`touch-reveal-toolbar flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-[var(--panel)] ring-1 ring-[var(--border)] transition-all duration-300 shadow-[var(--shadow-panel)] ${
            isHovered || isSpeaking || isListening ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMicToggle();
            }}
            title={isListening ? 'Stop voice listening' : 'Speak to Camellia by voice'}
            className={`p-2 rounded-full text-xs active:scale-90 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation ${
              isListening
                ? 'bg-emerald-500/15 text-[var(--success-text)] ring-1 ring-[var(--success-text)]/40'
                : 'text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)]'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            title={isMuted ? 'Unmute voice' : 'Mute voice'}
            className="p-2 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] active:scale-90 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-[var(--danger-text)]" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat();
            }}
            title="Open Camellia AI Chat"
            className="p-2 rounded-full text-xs text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel-raised)] active:scale-90 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>

          {onOpenLiveVoice && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLiveVoice();
              }}
              title="Real-Time Live Voice & Vision Call"
              className="p-2 rounded-full text-xs text-[var(--gold)] hover:bg-[var(--panel-raised)] active:scale-90 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center touch-manipulation"
            >
              <Radio className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
