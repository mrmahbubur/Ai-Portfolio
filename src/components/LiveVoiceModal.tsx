import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Radio,
  PhoneOff,
  Send,
  Volume2,
  AlertCircle,
} from 'lucide-react';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLanguage: string;
}

interface LiveTranscriptItem {
  id: string;
  speaker: 'you' | 'camellia';
  text: string;
}

const WORKLET_PROCESSOR_CODE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0] && input[0].length > 0) {
      const floatSamples = input[0];
      const pcm16 = new Int16Array(floatSamples.length);
      for (let i = 0; i < floatSamples.length; i++) {
        const s = Math.max(-1, Math.min(1, floatSamples[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-capture-processor', PcmCaptureProcessor);
`;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  activeLanguage,
}) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [visionMode, setVisionMode] = useState<'none' | 'camera' | 'screen'>('none');
  const [transcripts, setTranscripts] = useState<LiveTranscriptItem[]>([]);
  const [quickPrompt, setQuickPrompt] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletBlobUrlRef = useRef<string | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);
  const videoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveRafRef = useRef<number | null>(null);
  const isMicMutedRef = useRef<boolean>(false);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  const flushPlaybackQueue = useCallback(() => {
    for (const src of scheduledSourcesRef.current) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    scheduledSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    }
  }, []);

  const playOutputPcm24k = useCallback((base64Data: string) => {
    const ctx = outputCtxRef.current;
    const analyser = outputAnalyserRef.current;
    if (!ctx || !analyser) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      const binStr = atob(base64Data);
      const len = binStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }

      const numSamples = Math.floor(len / 2);
      if (numSamples <= 0) return;

      const audioBuffer = ctx.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      for (let i = 0; i < numSamples; i++) {
        const s = view.getInt16(i * 2, true);
        channelData[i] = s < 0 ? s / 32768 : s / 32767;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(analyser);

      const startAt = Math.max(ctx.currentTime + 0.015, nextStartTimeRef.current);
      nextStartTimeRef.current = startAt + audioBuffer.duration;
      scheduledSourcesRef.current.add(source);

      source.onended = () => {
        scheduledSourcesRef.current.delete(source);
      };
      source.start(startAt);
    } catch {
      // Skip corrupt chunk
    }
  }, []);

  const stopVisionStream = useCallback(() => {
    if (videoTimerRef.current) {
      clearInterval(videoTimerRef.current);
      videoTimerRef.current = null;
    }
    if (videoStreamRef.current) {
      videoStreamRef.current.getTracks().forEach((t) => t.stop());
      videoStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setVisionMode('none');
  }, []);

  const teardownSession = useCallback(() => {
    stopVisionStream();
    flushPlaybackQueue();

    if (waveRafRef.current !== null) {
      cancelAnimationFrame(waveRafRef.current);
      waveRafRef.current = null;
    }
    if (workletNodeRef.current) {
      try {
        workletNodeRef.current.disconnect();
      } catch {}
      workletNodeRef.current = null;
    }
    if (workletBlobUrlRef.current) {
      URL.revokeObjectURL(workletBlobUrlRef.current);
      workletBlobUrlRef.current = null;
    }
    if (scriptNodeRef.current) {
      try {
        scriptNodeRef.current.disconnect();
      } catch {}
      scriptNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
      outputAnalyserRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'close' }));
        }
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    setStatus('idle');
  }, [flushPlaybackQueue, stopVisionStream]);

  const appendTranscript = useCallback((speaker: 'you' | 'camellia', text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.speaker === speaker && last.text.length < 320) {
        return [...prev.slice(0, -1), { ...last, text: `${last.text} ${clean}`.trim() }];
      }
      return [...prev.slice(-16), { id: `${speaker}-${Date.now()}`, speaker, text: clean }];
    });
  }, []);

  const drawWaveformLoop = useCallback(() => {
    const canvas = waveCanvasRef.current;
    const analyser = outputAnalyserRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 28;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const tick = () => {
      waveRafRef.current = requestAnimationFrame(tick);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (analyser && data) {
        analyser.getByteFrequencyData(data);
      }

      const barWidth = Math.max(3, Math.floor((w - (bars - 1) * 4) / bars));
      const goldColor = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim() || '#E2B867';
      ctx.fillStyle = goldColor;

      for (let i = 0; i < bars; i++) {
        const binIdx = data ? Math.min(data.length - 1, Math.floor((i / bars) * (data.length * 0.45))) : 0;
        const mag = data ? data[binIdx] / 255 : 0.06;
        const barH = Math.max(4, mag * (h - 6));
        const x = i * (barWidth + 4);
        const y = (h - barH) / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, 3);
        ctx.fill();
      }
    };

    waveRafRef.current = requestAnimationFrame(tick);
  }, []);

  const startLiveSession = useCallback(async () => {
    teardownSession();
    setStatus('connecting');
    setErrorMsg(null);
    setTranscripts([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      inputCtxRef.current = inputCtx;
      outputCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      const analyser = outputCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.72;
      analyser.connect(outputCtx.destination);
      outputAnalyserRef.current = analyser;

      drawWaveformLoop();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live?lang=${encodeURIComponent(activeLanguage || 'en-US')}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready') {
            setStatus('connected');
          } else if (msg.type === 'audio' && msg.data) {
            playOutputPcm24k(msg.data);
          } else if (msg.type === 'input_transcript' && msg.text) {
            appendTranscript('you', msg.text);
          } else if (msg.type === 'output_transcript' && msg.text) {
            appendTranscript('camellia', msg.text);
          } else if (msg.type === 'interrupted') {
            flushPlaybackQueue();
          } else if (msg.type === 'error') {
            setErrorMsg(msg.message || 'Live voice stream error.');
            setStatus('error');
          } else if (msg.type === 'closed') {
            setStatus('idle');
          }
        } catch {}
      };

      ws.onerror = () => {
        setErrorMsg('Unable to connect to real-time voice server.');
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
      };

      const source = inputCtx.createMediaStreamSource(stream);

      const sendPcmChunk = (pcmBuffer: ArrayBuffer) => {
        if (isMicMutedRef.current) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              data: arrayBufferToBase64(pcmBuffer),
            })
          );
        }
      };

      if (inputCtx.audioWorklet) {
        try {
          const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          workletBlobUrlRef.current = blobUrl;
          await inputCtx.audioWorklet.addModule(blobUrl);
          const workletNode = new AudioWorkletNode(inputCtx, 'pcm-capture-processor');
          workletNode.port.onmessage = (e) => {
            if (e.data instanceof ArrayBuffer) {
              sendPcmChunk(e.data);
            }
          };
          source.connect(workletNode);
          workletNodeRef.current = workletNode;
          return;
        } catch {
          // Automatic fallback below if CSP restricts Blob worklets
        }
      }

      const scriptNode = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptNode.onaudioprocess = (e) => {
        const samples = e.inputBuffer.getChannelData(0);
        const pcm16 = new Int16Array(samples.length);
        for (let i = 0; i < samples.length; i++) {
          const s = Math.max(-1, Math.min(1, samples[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        sendPcmChunk(pcm16.buffer);
      };
      source.connect(scriptNode);
      scriptNode.connect(inputCtx.destination);
      scriptNodeRef.current = scriptNode;
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission was declined. Please allow microphone access to talk live.'
          : err?.message || 'Microphone setup failed.'
      );
      setStatus('error');
    }
  }, [activeLanguage, appendTranscript, drawWaveformLoop, flushPlaybackQueue, playOutputPcm24k, teardownSession]);

  const toggleVisionSource = async (mode: 'camera' | 'screen') => {
    if (visionMode === mode) {
      stopVisionStream();
      return;
    }
    stopVisionStream();

    try {
      const stream =
        mode === 'camera'
          ? await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
          : await navigator.mediaDevices.getDisplayMedia({ video: true });

      videoStreamRef.current = stream;
      setVisionMode(mode);

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = stream;
        await videoElementRef.current.play().catch(() => {});
      }

      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        stopVisionStream();
      });

      // Stream 1 FPS JPEG frames cleanly into Gemini Live session
      videoTimerRef.current = setInterval(() => {
        const video = videoElementRef.current;
        const canvas = hiddenCanvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;

        canvas.width = 480;
        canvas.height = Math.max(270, Math.round((video.videoHeight / Math.max(1, video.videoWidth)) * 480));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        const base64 = dataUrl.split(',')[1];
        if (base64) {
          wsRef.current.send(
            JSON.stringify({
              type: 'video',
              data: base64,
              mimeType: 'image/jpeg',
            })
          );
        }
      }, 1000);
    } catch (err: any) {
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? `${mode === 'camera' ? 'Camera' : 'Screen sharing'} permission was declined.`
          : 'Unable to start live video feed.'
      );
      setVisionMode('none');
    }
  };

  const handleSendTextNudge = (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickPrompt.trim();
    if (!text || wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'text', text }));
    appendTranscript('you', text);
    setQuickPrompt('');
  };

  useEffect(() => {
    if (!isOpen) {
      teardownSession();
    }
  }, [isOpen, teardownSession]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camellia Real-Time Live Voice and Vision Session"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-0 sm:p-5 no-speak"
    >
      <div className="w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-2xl bg-[var(--panel)] shadow-2xl overflow-hidden flex flex-col sm:max-h-[90dvh]">
        {/* Header */}
        <header className="px-5 py-4 bg-[var(--panel-raised)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={CAMELLIA_AVATAR_SRC}
              alt="Camellia"
              className="w-10 h-10 rounded-full object-cover object-top ring-1 ring-[var(--gold)]/60 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-base text-[var(--text)] truncate">
                Live Voice &amp; Vision with Camellia
              </h3>
              <p className="text-xs font-mono text-[var(--text-secondary)] truncate">
                {status === 'connected'
                  ? 'Full-Duplex Streaming · Interruption Ready'
                  : status === 'connecting'
                  ? 'Establishing bidirectional audio socket...'
                  : 'Real-time voice conversation & live troubleshooting'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              teardownSession();
              onClose();
            }}
            aria-label="Close Live Session"
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Live Stage Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 text-[var(--danger-text)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Optional Live Camera / Screen Feed */}
          <div className={visionMode === 'none' ? 'hidden' : 'rounded-xl overflow-hidden bg-black relative'}>
            <video
              ref={videoElementRef}
              autoPlay
              muted
              playsInline
              className="w-full max-h-60 object-contain"
            />
            <div className="px-3 py-1.5 bg-black/75 text-[11px] font-mono text-white flex items-center justify-between">
              <span>{visionMode === 'camera' ? 'Live Camera Vision (1 FPS)' : 'Live Screen Share (1 FPS)'}</span>
              <button
                type="button"
                onClick={stopVisionStream}
                className="text-rose-300 hover:underline cursor-pointer"
              >
                Stop Video
              </button>
            </div>
          </div>
          <canvas ref={hiddenCanvasRef} className="hidden" />

          {/* Real Acoustic Output Visualizer */}
          <div className="p-4 sm:p-5 rounded-xl bg-[var(--bg)] flex flex-col items-center space-y-3">
            <canvas ref={waveCanvasRef} width={320} height={48} className="w-full max-w-[320px] h-[48px]" />

            <div className="flex flex-wrap items-center justify-center gap-2">
              {status !== 'connected' && status !== 'connecting' ? (
                <button
                  type="button"
                  onClick={startLiveSession}
                  className="px-5 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer min-h-[42px]"
                >
                  <Radio className="w-4 h-4" />
                  <span>Start Real-Time Conversation</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMicMuted((prev) => {
                        const nextMuted = !prev;
                        if (nextMuted && wsRef.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({ type: 'audio_stream_end' }));
                        }
                        return nextMuted;
                      });
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px] transition-colors ${
                      isMicMuted
                        ? 'bg-rose-500/15 text-[var(--danger-text)]'
                        : 'bg-[var(--panel-raised)] text-[var(--text)] hover:text-[var(--gold)]'
                    }`}
                  >
                    {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[var(--gold)]" />}
                    <span>{isMicMuted ? 'Mic Muted' : 'Mic Live'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleVisionSource('camera')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px] transition-colors ${
                      visionMode === 'camera'
                        ? 'bg-[var(--gold)] text-[var(--gold-ink)] font-semibold'
                        : 'bg-[var(--panel-raised)] text-[var(--text)] hover:text-[var(--gold)]'
                    }`}
                  >
                    {visionMode === 'camera' ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-[var(--gold)]" />}
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleVisionSource('screen')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer min-h-[40px] transition-colors ${
                      visionMode === 'screen'
                        ? 'bg-[var(--gold)] text-[var(--gold-ink)] font-semibold'
                        : 'bg-[var(--panel-raised)] text-[var(--text)] hover:text-[var(--gold)]'
                    }`}
                  >
                    {visionMode === 'screen' ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4 text-[var(--gold)]" />}
                    <span>Share Screen</span>
                  </button>

                  <button
                    type="button"
                    onClick={teardownSession}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-[var(--danger-text)] text-xs font-semibold flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>End Call</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Live Transcript Log */}
          <div className="rounded-xl bg-[var(--bg)] p-3.5 max-h-56 overflow-y-auto space-y-2.5">
            {transcripts.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">
                {status === 'connected'
                  ? 'Listening — speak naturally or share your screen for live visual IT troubleshooting.'
                  : 'Press "Start Real-Time Conversation" to speak natively with Camellia.'}
              </p>
            ) : (
              transcripts.map((t) => (
                <div key={t.id} className="text-xs leading-relaxed">
                  <span className={`font-mono font-semibold uppercase mr-2 ${t.speaker === 'camellia' ? 'text-[var(--gold)]' : 'text-[var(--text-secondary)]'}`}>
                    {t.speaker === 'camellia' ? 'Camellia:' : 'You:'}
                  </span>
                  <span className="text-[var(--text)]">{t.text}</span>
                </div>
              ))
            )}
          </div>

          {/* Optional Silent Text Nudge Inside Live Call */}
          {status === 'connected' && (
            <form onSubmit={handleSendTextNudge} className="flex items-center gap-2">
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Or type a silent note during the live call..."
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg)] focus:ring-1 focus:ring-[var(--gold)] text-xs text-[var(--text)] outline-hidden"
              />
              <button
                type="submit"
                disabled={!quickPrompt.trim()}
                className="p-2 rounded-xl bg-[var(--gold)] text-[var(--gold-ink)] disabled:opacity-40 cursor-pointer"
                aria-label="Send Note"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        <footer className="px-5 py-2.5 bg-[var(--panel-raised)]/80 text-[11px] font-mono text-[var(--text-muted)] flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 truncate">
            <Volume2 className="w-3.5 h-3.5 text-[var(--gold)] shrink-0" />
            <span>Female Kore Studio Voice · Live PCM Audio</span>
          </span>
          <span className="shrink-0">1 FPS Vision Capable</span>
        </footer>
      </div>
    </div>
  );
};
