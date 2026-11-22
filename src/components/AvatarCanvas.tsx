import React, { useEffect, useRef, useState } from 'react';
import { AvatarState } from '../types';

interface AvatarCanvasProps {
  avatarState: AvatarState;
  audioLevel: number; // 0 to 1
  phonemeWeight: number; // 0 to 1
  onAvatarClick?: () => void;
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  avatarState,
  audioLevel,
  phonemeWeight,
  onAvatarClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Animation state references
  const animRef = useRef({
    time: 0,
    blinkProgress: 0, // 0 = open, 1 = closed
    isBlinking: false,
    lastBlinkTime: 0,
    headTiltX: 0,
    headTiltY: 0,
    mouthAperture: 0,
    mouthWidth: 0,
    auraPhase: 0,
    pulseEnergy: 0,
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      mousePos.current.targetX = Math.max(-1, Math.min(1, nx));
      mousePos.current.targetY = Math.max(-1, Math.min(1, ny));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize handler for sharp retina displays
    const resize = () => {
      if (!canvas || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width || 340;
      const height = rect.height || 340;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);

    // Main render loop
    const render = () => {
      const state = animRef.current;
      state.time += 0.035;

      // Mouse smoothing
      mousePos.current.x += (mousePos.current.targetX - mousePos.current.x) * 0.08;
      mousePos.current.y += (mousePos.current.targetY - mousePos.current.y) * 0.08;

      // Blink logic
      const now = Date.now();
      if (!state.isBlinking && now - state.lastBlinkTime > 3000 + Math.sin(state.time * 2) * 2000) {
        state.isBlinking = true;
        state.blinkProgress = 0;
      }
      if (state.isBlinking) {
        state.blinkProgress += 0.16;
        if (state.blinkProgress >= 1) {
          state.isBlinking = false;
          state.blinkProgress = 0;
          state.lastBlinkTime = now;
        }
      }

      // Mouth physics interpolation
      const targetMouth = avatarState === 'speaking' ? Math.max(0.15, phonemeWeight * 0.95 + audioLevel * 0.5) : 0;
      state.mouthAperture += (targetMouth - state.mouthAperture) * 0.28;
      state.mouthWidth += ((avatarState === 'speaking' ? 0.3 + phonemeWeight * 0.4 : 0.2) - state.mouthWidth) * 0.2;

      // Pulse energy
      const targetPulse = avatarState === 'listening' ? 0.8 : avatarState === 'speaking' ? 0.95 : avatarState === 'thinking' ? 0.7 : 0.3;
      state.pulseEnergy += (targetPulse - state.pulseEnergy) * 0.1;

      // Clear Canvas
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + Math.sin(state.time * 1.5) * 5; // Floating bob

      // Draw background ambient halo & audio reactive radar rings
      drawCyberAura(ctx, centerX, centerY, state, avatarState, audioLevel);

      // Draw Neck & Collar
      drawCyberTorso(ctx, centerX, centerY, state, avatarState);

      // Draw Head Base & Cyber Chassis
      drawHeadChassis(ctx, centerX, centerY, state, avatarState);

      // Draw Visor & Expressive Eyes
      drawEyesAndVisor(ctx, centerX, centerY, state, mousePos.current, avatarState);

      // Draw Animated Mouth
      drawMouth(ctx, centerX, centerY, state, avatarState);

      // Draw Cyber HUD Accents & Status Rings
      drawHUDOverlays(ctx, centerX, centerY, state, avatarState, audioLevel);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
    };
  }, [avatarState, audioLevel, phonemeWeight]);

  return (
    <div
      ref={containerRef}
      id="avatar-canvas-container"
      onClick={onAvatarClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full max-w-[340px] aspect-square mx-auto cursor-pointer group select-none"
    >
      {/* Background radial gradient glow */}
      <div
        className={`absolute inset-0 rounded-full filter blur-3xl transition-opacity duration-500 pointer-events-none ${
          avatarState === 'speaking'
            ? 'bg-cyan-500/20 opacity-100'
            : avatarState === 'thinking'
            ? 'bg-amber-500/20 opacity-90'
            : avatarState === 'listening'
            ? 'bg-cyan-400/25 opacity-100'
            : 'bg-cyan-500/10 opacity-60'
        }`}
      />

      {/* Main Canvas rendering */}
      <canvas ref={canvasRef} className="relative z-10 w-full h-full" />

      {/* Status Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-xl bg-[var(--hud-bg)] ring-1 ring-[var(--border)] backdrop-blur-md text-[11px] font-mono shadow-[var(--shadow-card)] transition-all duration-300">
        <span
          className={`font-semibold tracking-wide ${
            avatarState === 'speaking' || avatarState === 'thinking'
              ? 'text-[var(--gold)]'
              : avatarState === 'listening'
              ? 'text-[var(--success-text)]'
              : 'text-[var(--text-secondary)]'
          }`}
        >
          {avatarState === 'speaking'
            ? 'Narrating'
            : avatarState === 'listening'
            ? 'Listening'
            : avatarState === 'thinking'
            ? 'Thinking'
            : 'Camellia AI'}
        </span>
      </div>
    </div>
  );
};

// Helper Drawing Functions
function drawCyberAura(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: any,
  avatarState: AvatarState,
  audioLevel: number
) {
  const isCyan = avatarState !== 'thinking';
  const primaryColor = isCyan ? 'rgba(6, 182, 212, ' : 'rgba(245, 158, 11, ';
  const baseRadius = 115;

  // Outer orbital ring
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.time * (avatarState === 'thinking' ? 1.5 : 0.3));

  ctx.strokeStyle = primaryColor + (0.15 + state.pulseEnergy * 0.2) + ')';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 14]);
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius + Math.sin(state.time) * 4, 0, Math.PI * 2);
  ctx.stroke();

  // Audio wave arcs if speaking/listening
  if (avatarState === 'speaking' || avatarState === 'listening') {
    const waveCount = 24;
    const waveRadius = baseRadius + 15 + audioLevel * 20;
    ctx.setLineDash([]);
    ctx.lineWidth = 2;

    for (let i = 0; i < waveCount; i++) {
      const angle = (i / waveCount) * Math.PI * 2;
      const barHeight = Math.sin(angle * 4 + state.time * 6) * (6 + audioLevel * 18);
      const x1 = Math.cos(angle) * waveRadius;
      const y1 = Math.sin(angle) * waveRadius;
      const x2 = Math.cos(angle) * (waveRadius + Math.max(2, barHeight));
      const y2 = Math.sin(angle) * (waveRadius + Math.max(2, barHeight));

      ctx.strokeStyle = i % 2 === 0 ? primaryColor + '0.7)' : 'rgba(251, 191, 36, 0.6)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCyberTorso(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: any,
  avatarState: AvatarState
) {
  ctx.save();
  // Collar / neck base
  const neckY = cy + 62;

  // Shoulders gradient
  const grad = ctx.createLinearGradient(cx - 70, neckY, cx + 70, neckY + 70);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(0.5, '#131d33');
  grad.addColorStop(1, '#090d16');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(cx - 55, neckY + 65);
  ctx.lineTo(cx - 24, neckY + 10);
  ctx.lineTo(cx + 24, neckY + 10);
  ctx.lineTo(cx + 55, neckY + 65);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Cyber collar accents
  ctx.strokeStyle = avatarState === 'thinking' ? '#f59e0b' : '#06b6d4';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 18, neckY + 15);
  ctx.lineTo(cx, neckY + 30);
  ctx.lineTo(cx + 18, neckY + 15);
  ctx.stroke();

  // Core power diode
  ctx.fillStyle = avatarState === 'thinking' ? '#fbbf24' : '#22d3ee';
  ctx.shadowColor = avatarState === 'thinking' ? '#f59e0b' : '#06b6d4';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(cx, neckY + 40, 4 + Math.sin(state.time * 3) * 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawHeadChassis(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: any,
  avatarState: AvatarState
) {
  ctx.save();
  const mouseTilt = mousePosToTilt(state);
  const headX = cx + mouseTilt.x;
  const headY = cy + mouseTilt.y - 10;

  // Head Silhouette (Stylized Android/Cyber Profile)
  const headGrad = ctx.createRadialGradient(headX, headY - 15, 10, headX, headY, 65);
  headGrad.addColorStop(0, '#1e293b');
  headGrad.addColorStop(0.7, '#0f172a');
  headGrad.addColorStop(1, '#090e1a');

  ctx.fillStyle = headGrad;
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  // Rounded futuristic android head
  ctx.ellipse(headX, headY, 52, 58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Side audio antennae / ear modules
  const earColor = avatarState === 'thinking' ? '#d97706' : '#0891b2';
  [-1, 1].forEach((dir) => {
    const earX = headX + dir * 55;
    const earY = headY - 2;

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = earColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(earX - 6, earY - 16, 12, 32, 6);
    ctx.fill();
    ctx.stroke();

    // Ear led light
    ctx.fillStyle = earColor;
    ctx.shadowColor = earColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(earX, earY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Forehead cyber circuit line
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(headX - 25, headY - 42);
  ctx.lineTo(headX - 10, headY - 42);
  ctx.lineTo(headX, headY - 34);
  ctx.lineTo(headX + 10, headY - 42);
  ctx.lineTo(headX + 25, headY - 42);
  ctx.stroke();

  ctx.restore();
}

function drawEyesAndVisor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: any,
  mouse: { x: number; y: number },
  avatarState: AvatarState
) {
  ctx.save();
  const mouseTilt = mousePosToTilt(state);
  const headX = cx + mouseTilt.x;
  const headY = cy + mouseTilt.y - 10;

  // Visor glass shape
  const visorGrad = ctx.createLinearGradient(headX, headY - 25, headX, headY + 15);
  visorGrad.addColorStop(0, '#050b14');
  visorGrad.addColorStop(1, '#0c1626');

  ctx.fillStyle = visorGrad;
  ctx.strokeStyle = avatarState === 'thinking' ? 'rgba(245, 158, 11, 0.6)' : 'rgba(6, 182, 212, 0.6)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.roundRect(headX - 42, headY - 22, 84, 38, [12, 12, 16, 16]);
  ctx.fill();
  ctx.stroke();

  // Visor reflection streak
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(headX - 35, headY - 14);
  ctx.lineTo(headX + 20, headY - 14);
  ctx.stroke();

  // Eye calculation with blink
  const blinkHeight = Math.max(1, 14 * (1 - Math.sin(state.blinkProgress * Math.PI)));
  const eyeGazeX = mouse.x * 4;
  const eyeGazeY = mouse.y * 3;

  const eyeColor = avatarState === 'thinking' ? '#fbbf24' : '#22d3ee';
  const pupilGlow = avatarState === 'thinking' ? '#f59e0b' : '#06b6d4';

  [-1, 1].forEach((dir) => {
    const eyeBaseX = headX + dir * 20;
    const eyeBaseY = headY - 3;

    ctx.save();
    ctx.shadowColor = pupilGlow;
    ctx.shadowBlur = 10;
    ctx.fillStyle = eyeColor;

    if (state.blinkProgress > 0.05) {
      // Slit during blink
      ctx.fillRect(eyeBaseX - 8, eyeBaseY - blinkHeight / 2, 16, blinkHeight);
    } else {
      // Open expressive cyber eye
      ctx.beginPath();
      ctx.ellipse(eyeBaseX + eyeGazeX, eyeBaseY + eyeGazeY, 8, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeBaseX + eyeGazeX + 1.5, eyeBaseY + eyeGazeY - 1.5, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Cyber optic crosshair lines
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(eyeBaseX - 11, eyeBaseY);
      ctx.lineTo(eyeBaseX - 7, eyeBaseY);
      ctx.moveTo(eyeBaseX + 7, eyeBaseY);
      ctx.lineTo(eyeBaseX + 11, eyeBaseY);
      ctx.stroke();
    }

    ctx.restore();
  });

  ctx.restore();
}

function drawMouth(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: any,
  avatarState: AvatarState
) {
  ctx.save();
  const mouseTilt = mousePosToTilt(state);
  const headX = cx + mouseTilt.x;
  const headY = cy + mouseTilt.y - 10;
  const mouthY = headY + 30;

  const mouthOpen = state.mouthAperture; // 0 to 1
  const mouthWidth = 14 + state.mouthWidth * 16;
  const mouthHeight = Math.max(2, mouthOpen * 14);

  const glowColor = avatarState === 'thinking' ? '#f59e0b' : '#06b6d4';

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 6;

  if (mouthOpen > 0.08) {
    // Speaking open viseme mouth
    ctx.fillStyle = '#060d17';
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(headX, mouthY, mouthWidth / 2, mouthHeight, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Voice light emission inside mouth
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.ellipse(headX, mouthY + mouthHeight * 0.2, mouthWidth / 3, mouthHeight * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Subtle cyber smile line when idle
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(headX - 10, mouthY - 1);
    ctx.quadraticCurveTo(headX, mouthY + 3, headX + 10, mouthY - 1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHUDOverlays(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: any,
  avatarState: AvatarState,
  audioLevel: number
) {
  ctx.save();
  const radius = 135;

  // Top and bottom HUD target corners
  const hudColor = avatarState === 'thinking' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(6, 182, 212, 0.4)';
  ctx.strokeStyle = hudColor;
  ctx.lineWidth = 1.5;

  const cornerSize = 14;
  const left = cx - radius;
  const right = cx + radius;
  const top = cy - radius;
  const bottom = cy + radius;

  // Top Left
  ctx.beginPath();
  ctx.moveTo(left, top + cornerSize);
  ctx.lineTo(left, top);
  ctx.lineTo(left + cornerSize, top);
  ctx.stroke();

  // Top Right
  ctx.beginPath();
  ctx.moveTo(right - cornerSize, top);
  ctx.lineTo(right, top);
  ctx.lineTo(right, top + cornerSize);
  ctx.stroke();

  // Bottom Left
  ctx.beginPath();
  ctx.moveTo(left, bottom - cornerSize);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + cornerSize, bottom);
  ctx.stroke();

  // Bottom Right
  ctx.beginPath();
  ctx.moveTo(right - cornerSize, bottom);
  ctx.lineTo(right, bottom);
  ctx.lineTo(right, bottom - cornerSize);
  ctx.stroke();

  // Monospace tech telemetry data
  ctx.font = '9px monospace';
  ctx.fillStyle = hudColor;
  ctx.fillText('AUDIO_FREQ: 24kHz', left + 8, top + 14);
  ctx.fillText(`RMS: ${(audioLevel * 100).toFixed(0)}%`, right - 64, top + 14);

  ctx.restore();
}

function mousePosToTilt(state: any) {
  return {
    x: Math.sin(state.time * 0.8) * 1.5,
    y: Math.cos(state.time * 0.7) * 1.2,
  };
}
