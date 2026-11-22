import React, { useEffect, useRef } from 'react';
import { AvatarState } from '../types';

interface NeuralAmbientCanvasProps {
  theme: 'dark' | 'light';
  audioLevel: number;
  avatarState: AvatarState;
}

interface NodeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
}

export const NeuralAmbientCanvas: React.FC<NeuralAmbientCanvasProps> = ({
  theme,
  audioLevel,
  avatarState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioLevelRef = useRef<number>(audioLevel);
  const avatarStateRef = useRef<AvatarState>(avatarState);
  const themeRef = useRef<'dark' | 'light'>(theme);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    avatarStateRef.current = avatarState;
  }, [avatarState]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let isReducedMotion = motionQuery.matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Scale node density intelligently by device width so mobile battery stays untouched
    const particleCount = width < 640 ? 22 : width < 1024 ? 34 : 48;
    const maxDistance = width < 640 ? 115 : 145;

    const particles: NodeParticle[] = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      radius: 1.1 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    }));

    const pointer = {
      x: -9999,
      y: -9999,
      active: false,
    };

    const handlePointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
    };

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    motionQuery.addEventListener('change', handleMotionChange);

    let rafId = 0;
    let paused = document.hidden;

    const handleVisibility = () => {
      paused = document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const drawFrame = (time: number) => {
      rafId = requestAnimationFrame(drawFrame);
      if (paused || isReducedMotion) return;

      ctx.clearRect(0, 0, width, height);

      const isDark = themeRef.current === 'dark';
      const liveAudio = audioLevelRef.current;
      const isActiveSpeech = avatarStateRef.current === 'speaking' || avatarStateRef.current === 'listening';
      const energyBoost = isActiveSpeech ? 1 + liveAudio * 1.45 : 1;

      const nodeBaseColor = isDark ? '226, 184, 103' : '154, 106, 30';
      const nodeOpacity = isDark ? 0.24 + liveAudio * 0.20 : 0.16 + liveAudio * 0.14;
      const lineBaseOpacity = isDark ? 0.055 + liveAudio * 0.06 : 0.04 + liveAudio * 0.05;

      // Subtle hardware-composited optical halo tracking pointer position
      if (pointer.active) {
        const haloRadius = width < 640 ? 180 : 280;
        const grad = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, haloRadius);
        grad.addColorStop(0, `rgba(${nodeBaseColor}, ${(isDark ? 0.055 : 0.032) + liveAudio * 0.03})`);
        grad.addColorStop(1, `rgba(${nodeBaseColor}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, haloRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx * energyBoost;
        p.y += p.vy * energyBoost;

        // Gentle pointer attraction/deflection field
        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10 && dist < 170) {
            const force = (1 - dist / 170) * 0.016;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Velocity damping to maintain calm ambient cadence
        p.vx *= 0.992;
        p.vy *= 0.992;

        // Keep slight organic drift floor
        const speed = Math.hypot(p.vx, p.vy);
        if (speed < 0.08) {
          p.vx += Math.cos(time * 0.0005 + p.phase) * 0.01;
          p.vy += Math.sin(time * 0.0005 + p.phase) * 0.01;
        } else if (speed > 0.75) {
          p.vx = (p.vx / speed) * 0.75;
          p.vy = (p.vy / speed) * 0.75;
        }

        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        ctx.beginPath();
        const r = p.radius * (isActiveSpeech ? 1 + liveAudio * 0.5 : 1);
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodeBaseColor}, ${nodeOpacity.toFixed(3)})`;
        ctx.fill();
      }

      // Spatial proximity links
      ctx.lineWidth = 0.75;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * lineBaseOpacity;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(${nodeBaseColor}, ${alpha.toFixed(3)})`;
            ctx.stroke();
          }
        }
      }
    };

    rafId = requestAnimationFrame(drawFrame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      motionQuery.removeEventListener('change', handleMotionChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none select-none opacity-85"
    />
  );
};
