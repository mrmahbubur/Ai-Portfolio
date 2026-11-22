import React, { useEffect, useState, useRef } from 'react';
import { AvatarState } from '../types';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';
import { audioEngine } from '../utils/audio';

interface RealisticAvatarProps {
  avatarState: AvatarState;
  audioLevel: number;
  phonemeWeight: number;
  activeTopicId?: string | null;
  onAvatarClick?: () => void;
}

export const RealisticAvatar: React.FC<RealisticAvatarProps> = ({
  avatarState,
  audioLevel,
  phonemeWeight,
  activeTopicId: _activeTopicId,
  onAvatarClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pose, setPose] = useState({
    rotateX: 0,
    rotateY: 0,
    shiftX: 0,
    shiftY: 0,
    sheenX: 50,
    sheenY: 32,
  });
  const [isBlinking, setIsBlinking] = useState(false);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;

      if (rafIdRef.current !== null) return;

      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.36;

        const dx = lastX - cx;
        const dy = lastY - cy;

        const maxSpanX = Math.max(320, window.innerWidth * 0.45);
        const maxSpanY = Math.max(320, window.innerHeight * 0.45);
        const normX = Math.max(-1, Math.min(1, Math.tanh((dx / maxSpanX) * 1.2)));
        const normY = Math.max(-1, Math.min(1, Math.tanh((dy / maxSpanY) * 1.2)));

        setPose({
          rotateY: Number((normX * 7).toFixed(2)),
          rotateX: Number((-normY * 5.5).toFixed(2)),
          shiftX: Number((normX * 3.5).toFixed(2)),
          shiftY: Number((normY * 2.5).toFixed(2)),
          sheenX: Number((50 + normX * 26).toFixed(1)),
          sheenY: Number((35 + normY * 22).toFixed(1)),
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

  const isSpeaking = avatarState === 'speaking';
  const isListening = avatarState === 'listening';
  const isThinking = avatarState === 'thinking';
  const vocalIntensity = isSpeaking ? Math.min(1, Math.max(audioLevel, phonemeWeight * 0.65)) : 0;

  return (
    <div
      ref={containerRef}
      id="realistic-avatar-container"
      onClick={onAvatarClick}
      style={{ perspective: '950px' }}
      className="relative w-full max-w-[340px] aspect-square mx-auto rounded-3xl overflow-hidden cursor-pointer select-none group ring-1 ring-[var(--gold)]/35 hover:ring-[var(--gold)] shadow-2xl bg-[var(--panel)] transition-all duration-300"
    >
      {/* Ambient Aura */}
      <div
        className={`absolute -inset-1 rounded-3xl filter blur-2xl transition-opacity duration-700 pointer-events-none ${
          isSpeaking
            ? 'bg-[var(--gold)]/30 opacity-100'
            : isListening
            ? 'bg-emerald-500/25 opacity-100'
            : isThinking
            ? 'bg-[var(--gold)]/25 opacity-90'
            : 'bg-[var(--gold)]/10 opacity-50'
        }`}
      />

      {/* 3D Perspective Portrait Stage */}
      <div
        className="relative w-full h-full transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `rotateX(${pose.rotateX}deg) rotateY(${pose.rotateY}deg) translate3d(${pose.shiftX}px, ${pose.shiftY}px, 0) scale(${(1 + vocalIntensity * 0.025).toFixed(3)})`,
        }}
      >
        <img
          src={CAMELLIA_AVATAR_SRC}
          alt="Camellia — M R S Assistant AI Concierge"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top rounded-2xl transition-all duration-500 group-hover:scale-105"
          style={{
            filter: isBlinking
              ? 'brightness(0.91) contrast(1.03)'
              : isSpeaking
              ? `brightness(${(1 + vocalIntensity * 0.06).toFixed(2)})`
              : 'brightness(1)',
          }}
        />

        {/* Subtle Natural Blink Veil */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[24%] h-[16%] pointer-events-none transition-opacity duration-100"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(168, 124, 92, 0.34) 0%, transparent 72%)',
            opacity: isBlinking ? 0.85 : 0,
          }}
        />

        {/* Dynamic Studio Specular Sheen */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${pose.sheenX}% ${pose.sheenY}%, rgba(255, 240, 200, 0.16) 0%, transparent 60%)`,
          }}
        />

        {/* Live Web Audio Spectrum When Speaking */}
        {isSpeaking && (
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-20 flex items-end gap-1 h-5 pointer-events-none">
            {audioEngine.getSpectrumBands(9, audioLevel).map((mag, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-[var(--gold)] shadow-[0_0_8px_rgba(226,184,103,0.9)] transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.round(4 + mag * 16))}px`,
                  opacity: 0.72 + mag * 0.28,
                }}
              />
            ))}
          </div>
        )}

        <div className="absolute inset-0 z-15 pointer-events-none bg-gradient-to-t from-[var(--panel)]/90 via-transparent to-transparent" />
      </div>

      {/* Signature Concierge Placard */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--hud-bg)] ring-1 ring-[var(--border)] backdrop-blur-md font-mono text-[11px] text-[var(--gold)] shadow-[var(--shadow-card)] whitespace-nowrap font-semibold">
        <span>Camellia · M R S Assistant</span>
      </div>
    </div>
  );
};
