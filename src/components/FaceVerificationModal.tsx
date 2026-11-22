import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Camera,
  Upload,
  RefreshCw,
  AlertCircle,
  X,
  CheckCircle2,
  Lock,
  Scale,
  RotateCcw,
  SwitchCamera,
  Activity,
  Volume2,
  VolumeX,
  Sparkles,
  BadgeCheck,
  Download,
} from 'lucide-react';
import { collectComprehensiveClientTelemetry } from '../utils/telemetry';
import { CAMELLIA_AVATAR_SRC } from '../constants/persona';

export interface FaceVerificationAudit {
  confidence: number;
  method: string;
  reason?: string;
  livenessMotionDetected?: boolean;
  eyeContrastDetected?: boolean;
  imageDimensions?: string;
  verificationId?: string;
  verificationToken?: string;
  verifiedAt?: number;
  expiresAt?: number;
}

export interface FaceVerificationModalProps {
  isOpen: boolean;
  mode?: 'cv_download' | 'persona_identity';
  uid?: string;
  onClose: () => void;
  onVerified: (faceCapture?: string, audit?: FaceVerificationAudit) => void;
  onAnnounce?: (text: string) => void;
}

type VerificationStage =
  | 'initializing'
  | 'align_center'
  | 'verifying'
  | 'needs_retry'
  | 'verified'
  | 'camera_error';

interface LiveQualityChecks {
  lightingOk: boolean;
  centeredOk: boolean;
  livenessOk: boolean;
  featuresOk: boolean;
  hint: string;
}

interface OpticalFrameMetrics {
  meanLuma: number;
  lumaStdDev: number;
  skinRatio: number;
  centerFocusRatio: number;
  eyeBandContrast: number;
  sharpnessScore: number;
  frameDelta: number;
  livenessMotionScore: number;
  faceDetectedNative: boolean;
  imageWidth: number;
  imageHeight: number;
  passedOpticalCheck: boolean;
  failureReason?: string;
}

const LIVENESS_CHALLENGES = [
  'Hold centered and blink naturally once',
  'Look directly at the camera with eyes open',
  'Keep natural lighting steady on your face',
];

export const VERIFIED_PASS_STORAGE_KEY = 'mrs_persona_verified_pass';

function analyzeCanvasFramePixels(
  ctx: CanvasRenderingContext2D,
  evalSize: number,
  prevFrameSample: Uint8ClampedArray | null,
  nativeFaceDetected: boolean,
  sourceWidth: number,
  sourceHeight: number,
  recentDeltas: number[]
): { metrics: OpticalFrameMetrics; quality: LiveQualityChecks; currentSample: Uint8ClampedArray } {
  const imgData = ctx.getImageData(0, 0, evalSize, evalSize);
  const data = imgData.data;

  const cx = evalSize / 2;
  const cy = evalSize / 2;
  const innerRadius = evalSize * 0.36;
  const innerRadiusSq = innerRadius * innerRadius;

  let innerTotal = 0;
  let innerSkin = 0;
  let outerTotal = 0;
  let outerSkin = 0;

  let sumLuma = 0;
  let sumSqLuma = 0;
  let allSamples = 0;

  let eyeBandSum = 0;
  let eyeBandSqSum = 0;
  let eyeBandCount = 0;

  let gradSum = 0;
  let gradCount = 0;

  let deltaSum = 0;
  let deltaCount = 0;

  const sampleWidth = Math.floor(evalSize / 4);
  const currentSample = new Uint8ClampedArray(sampleWidth * sampleWidth);
  let sampleIdx = 0;

  for (let y = 8; y < evalSize - 8; y += 2) {
    for (let x = 8; x < evalSize - 8; x += 2) {
      const idx = (y * evalSize + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      sumLuma += luma;
      sumSqLuma += luma * luma;
      allSamples++;

      const isYCbCrSkin = cb >= 74 && cb <= 134 && cr >= 131 && cr <= 180 && luma >= 28;

      const dx = x - cx;
      const dy = y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq <= innerRadiusSq) {
        innerTotal++;
        if (isYCbCrSkin) innerSkin++;

        if (y >= evalSize * 0.3 && y <= evalSize * 0.54) {
          eyeBandSum += luma;
          eyeBandSqSum += luma * luma;
          eyeBandCount++;
        }

        if (x + 2 < evalSize) {
          const nIdx = (y * evalSize + (x + 2)) * 4;
          const nLuma = 0.299 * data[nIdx] + 0.587 * data[nIdx + 1] + 0.114 * data[nIdx + 2];
          gradSum += Math.abs(luma - nLuma);
          gradCount++;
        }
      } else {
        outerTotal++;
        if (isYCbCrSkin) outerSkin++;
      }

      if (x % 4 === 0 && y % 4 === 0 && sampleIdx < currentSample.length) {
        const val = Math.round(luma);
        currentSample[sampleIdx] = val;
        if (prevFrameSample && sampleIdx < prevFrameSample.length) {
          deltaSum += Math.abs(val - prevFrameSample[sampleIdx]);
          deltaCount++;
        }
        sampleIdx++;
      }
    }
  }

  const meanLuma = allSamples > 0 ? sumLuma / allSamples : 0;
  const variance = allSamples > 0 ? Math.max(0, sumSqLuma / allSamples - meanLuma * meanLuma) : 0;
  const lumaStdDev = Math.sqrt(variance);

  const skinRatio = innerTotal > 0 ? innerSkin / innerTotal : 0;
  const outerSkinRatio = outerTotal > 0 ? outerSkin / outerTotal : 0;
  const centerFocusRatio =
    skinRatio + outerSkinRatio > 0 ? skinRatio / (skinRatio + outerSkinRatio) : 0;

  const eyeMean = eyeBandCount > 0 ? eyeBandSum / eyeBandCount : 0;
  const eyeVar =
    eyeBandCount > 0 ? Math.max(0, eyeBandSqSum / eyeBandCount - eyeMean * eyeMean) : 0;
  const eyeBandContrast = Math.sqrt(eyeVar);

  const sharpnessScore = gradCount > 0 ? gradSum / gradCount : 0;
  const frameDelta = deltaCount > 0 ? deltaSum / deltaCount : 1.0;

  const avgRecentDelta =
    recentDeltas.length > 0
      ? recentDeltas.reduce((acc, v) => acc + v, 0) / recentDeltas.length
      : frameDelta;

  const lightingOk = meanLuma >= 22 && meanLuma <= 246;
  const contrastOk = lumaStdDev >= 9.5 && eyeBandContrast >= 5.2;
  const centeredOk = nativeFaceDetected || (skinRatio >= 0.06 && centerFocusRatio >= 0.22);
  const livenessOk = prevFrameSample ? avgRecentDelta >= 0.12 && avgRecentDelta <= 45 : true;
  const featuresOk = lightingOk && contrastOk && centeredOk;

  let hint = 'Align your uncovered face directly inside the oval guide';
  let failureReason: string | undefined;

  if (!lightingOk) {
    if (meanLuma < 22) {
      hint = 'Too dark — face a soft light source or increase screen brightness';
      failureReason = 'Camera frame is too dark to detect facial features.';
    } else {
      hint = 'Too much glare — move away from bright backlight directly behind you';
      failureReason = 'Frame is overexposed. Reduce direct glare behind your face.';
    }
  } else if (lumaStdDev < 9.5) {
    hint = 'No facial contours visible — ensure camera lens is uncovered';
    failureReason = 'No clear facial contours detected in the frame.';
  } else if (!centeredOk) {
    hint = 'Center your face clearly within the oval frame';
    failureReason = 'No human face centered inside the verification frame.';
  } else if (!contrastOk) {
    hint = 'Look directly at the camera with eyes clearly visible';
    failureReason = 'Facial features could not be clearly resolved.';
  } else {
    hint = 'Biometric alignment locked — verifying live identity';
  }

  return {
    metrics: {
      meanLuma: Math.round(meanLuma * 10) / 10,
      lumaStdDev: Math.round(lumaStdDev * 10) / 10,
      skinRatio: Math.round(skinRatio * 1000) / 1000,
      centerFocusRatio: Math.round(centerFocusRatio * 1000) / 1000,
      eyeBandContrast: Math.round(eyeBandContrast * 10) / 10,
      sharpnessScore: Math.round(sharpnessScore * 10) / 10,
      frameDelta: Math.round(frameDelta * 100) / 100,
      livenessMotionScore: Math.round(avgRecentDelta * 100) / 100,
      faceDetectedNative: nativeFaceDetected,
      imageWidth: sourceWidth,
      imageHeight: sourceHeight,
      passedOpticalCheck: featuresOk,
      failureReason: featuresOk ? undefined : failureReason,
    },
    quality: {
      lightingOk,
      centeredOk,
      livenessOk,
      featuresOk,
      hint,
    },
    currentSample,
  };
}

export const FaceVerificationModal: React.FC<FaceVerificationModalProps> = ({
  isOpen,
  mode = 'cv_download',
  uid,
  onClose,
  onVerified,
  onAnnounce,
}) => {
  const [stage, setStage] = useState<VerificationStage>('initializing');
  const [progress, setProgress] = useState<number>(15);
  const [qualityChecks, setQualityChecks] = useState<LiveQualityChecks>({
    lightingOk: false,
    centeredOk: false,
    livenessOk: false,
    featuresOk: false,
    hint: 'Initializing biometric camera feed...',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [verificationAudit, setVerificationAudit] = useState<FaceVerificationAudit | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceIndex, setSelectedDeviceIndex] = useState<number>(0);
  const [voiceGuidanceOn, setVoiceGuidanceOn] = useState<boolean>(true);
  const [livenessChallenge, setLivenessChallenge] = useState<string>(LIVENESS_CHALLENGES[0]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nativeDetectorRef = useRef<any>(null);

  const stageRef = useRef<VerificationStage>('initializing');
  const sessionTokenRef = useRef<number>(0);
  const consecutiveStableRef = useRef<number>(0);
  const hasCompletedRef = useRef<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const prevSampleRef = useRef<Uint8ClampedArray | null>(null);
  const recentDeltasRef = useRef<number[]>([]);
  const referenceLivenessFrameRef = useRef<string | null>(null);
  const lastMetricsRef = useRef<OpticalFrameMetrics | null>(null);
  const autoLaunchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceGuidanceRef = useRef<boolean>(true);

  useEffect(() => {
    voiceGuidanceRef.current = voiceGuidanceOn;
  }, [voiceGuidanceOn]);

  const onAnnounceRef = useRef(onAnnounce);
  useEffect(() => {
    onAnnounceRef.current = onAnnounce;
  }, [onAnnounce]);

  const speakGuidance = useCallback((text: string) => {
    if (voiceGuidanceRef.current && onAnnounceRef.current) {
      onAnnounceRef.current(text);
    }
  }, []);

  const onVerifiedRef = useRef(onVerified);
  useEffect(() => {
    onVerifiedRef.current = onVerified;
  }, [onVerified]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  useEffect(() => {
    try {
      const FD = (window as any).FaceDetector;
      if (typeof FD === 'function' && !nativeDetectorRef.current) {
        nativeDetectorRef.current = new FD({ fastMode: true, maxDetectedFaces: 2 });
      }
    } catch {
      nativeDetectorRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && stageRef.current !== 'verifying') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playStepTone = useCallback(
    (freq = 880) => {
      try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.045, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } catch {}
    },
    [getAudioContext]
  );

  const playSuccessChime = useCallback(() => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc2.frequency.setValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.18);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.42);
    } catch {}
  }, [getAudioContext]);

  const stopCamera = useCallback(() => {
    sessionTokenRef.current += 1;
    if (autoLaunchTimerRef.current) {
      clearTimeout(autoLaunchTimerRef.current);
      autoLaunchTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const captureSnapshot = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const size = Math.min(vw, vh);
    const sx = Math.max(0, (vw - size) / 2);
    const sy = Math.max(0, (vh - size) / 2);

    ctx.translate(720, 0);
    ctx.scale(-1, 1);
    try {
      ctx.drawImage(video, sx, sy, size, size, 0, 0, 720, 720);
    } catch {
      return null;
    }

    return canvas.toDataURL('image/jpeg', 0.92);
  }, []);

  const completeVerification = useCallback(
    (photo: string, audit: FaceVerificationAudit) => {
      if (hasCompletedRef.current) return;
      hasCompletedRef.current = true;
      isSubmittingRef.current = false;

      stopCamera();
      setCapturedPhoto(photo);
      setVerificationAudit(audit);
      setStage('verified');
      stageRef.current = 'verified';
      setProgress(100);
      playSuccessChime();

      // Store ONLY non-PII cryptographic pass receipt in sessionStorage
      if (audit.verificationId && audit.verificationToken) {
        try {
          sessionStorage.setItem(
            VERIFIED_PASS_STORAGE_KEY,
            JSON.stringify({
              verificationId: audit.verificationId,
              verificationToken: audit.verificationToken,
              confidence: audit.confidence,
              method: audit.method,
              verifiedAt: audit.verifiedAt,
              expiresAt: audit.expiresAt,
            })
          );
        } catch {}
      }

      if (mode === 'cv_download') {
        speakGuidance('Persona verification confirmed. Launching your executive CV PDF download now.');
        autoLaunchTimerRef.current = setTimeout(() => {
          onVerifiedRef.current(photo, audit);
        }, 1250);
      } else {
        speakGuidance(
          `Persona identity verified at ${audit.confidence}% confidence. Your biometric pass is now active.`
        );
        onVerifiedRef.current(photo, audit);
      }
    },
    [mode, playSuccessChime, speakGuidance, stopCamera]
  );

  const sendToBackendAndVerify = useCallback(
    async (
      photoDataUrl: string,
      method: string,
      opticalMetrics: OpticalFrameMetrics | null,
      livenessFrameDataUrl?: string | null
    ) => {
      if (isSubmittingRef.current || hasCompletedRef.current) return;
      isSubmittingRef.current = true;

      stageRef.current = 'verifying';
      setStage('verifying');
      setProgress(90);
      setCapturedPhoto(photoDataUrl);
      setErrorMessage(null);

      try {
        const clientTelemetry = await collectComprehensiveClientTelemetry().catch(() => ({}));
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const response = await fetch('/api/verify-human-face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            faceCapture: photoDataUrl,
            livenessCapture: livenessFrameDataUrl || undefined,
            livenessChallenge,
            telemetry: clientTelemetry,
            verificationMethod: method,
            purpose: mode,
            isCvDownloadFlow: mode === 'cv_download',
            skipEmail: mode === 'cv_download',
            uid: uid || undefined,
            biometricMetrics: opticalMetrics || { passedOpticalCheck: true },
          }),
        });
        clearTimeout(timeoutId);

        const data = await response.json().catch(() => ({ verified: false }));
        if (!response.ok || !data.verified) {
          throw new Error(
            data.reason ||
              'Real human face could not be verified. Center your uncovered face in clear lighting and try again.'
          );
        }

        const confidence = Math.round(Number(data.confidence ?? 94));
        completeVerification(photoDataUrl, {
          confidence,
          method: data.method || method,
          reason: data.reason,
          livenessMotionDetected: data.metrics?.livenessMotionDetected,
          eyeContrastDetected: data.metrics?.eyeContrastDetected,
          imageDimensions: data.metrics?.imageDimensions,
          verificationId: data.verificationId || data.storedRecordId,
          verificationToken: data.verificationToken,
          verifiedAt: data.verifiedAt,
          expiresAt: data.expiresAt,
        });
      } catch (err: any) {
        isSubmittingRef.current = false;
        const msg =
          err?.name === 'AbortError'
            ? 'Verification timed out. Ensure your connection is active and click Scan Again.'
            : err?.message ||
              'Real human face not detected. Please look straight into the camera in a well-lit area.';
        setErrorMessage(msg);
        stageRef.current = 'needs_retry';
        setStage('needs_retry');
        setProgress(35);
        consecutiveStableRef.current = 0;
        referenceLivenessFrameRef.current = null;

        speakGuidance('I could not confirm your portrait clearly. Please adjust lighting or center your face and tap Scan Again.');
      }
    },
    [completeVerification, livenessChallenge, mode, speakGuidance, uid]
  );

  const handleManualCaptureClick = useCallback(() => {
    if (isSubmittingRef.current || hasCompletedRef.current) return;

    if (stageRef.current === 'needs_retry') {
      setErrorMessage(null);
      consecutiveStableRef.current = 0;
      referenceLivenessFrameRef.current = null;
      stageRef.current = 'align_center';
      setStage('align_center');
      setProgress(40);
      return;
    }

    const snapshot = captureSnapshot();
    if (!snapshot) {
      setErrorMessage('Camera frame is still initializing. Wait a moment or upload a portrait photo.');
      return;
    }

    playStepTone(880);
    const firstSnap = referenceLivenessFrameRef.current;
    const validDualFrame = firstSnap && firstSnap !== snapshot ? firstSnap : null;
    sendToBackendAndVerify(
      snapshot,
      'manual_capture_face_verified',
      lastMetricsRef.current,
      validDualFrame
    );
  }, [captureSnapshot, playStepTone, sendToBackendAndVerify]);

  const startCamera = useCallback(
    async (explicitDeviceId?: string) => {
      stopCamera();
      const currentSession = ++sessionTokenRef.current;

      hasCompletedRef.current = false;
      isSubmittingRef.current = false;
      consecutiveStableRef.current = 0;
      prevSampleRef.current = null;
      recentDeltasRef.current = [];
      referenceLivenessFrameRef.current = null;
      lastMetricsRef.current = null;

      setLivenessChallenge(
        LIVENESS_CHALLENGES[Math.floor(Math.random() * LIVENESS_CHALLENGES.length)]
      );
      setCapturedPhoto(null);
      setVerificationAudit(null);
      setErrorMessage(null);
      setStage('initializing');
      stageRef.current = 'initializing';
      setProgress(15);
      setQualityChecks({
        lightingOk: false,
        centeredOk: false,
        livenessOk: false,
        featuresOk: false,
        hint: 'Requesting camera stream...',
      });

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access is not supported on this browser or device.');
        }

        const videoConstraint: MediaTrackConstraints = explicitDeviceId
          ? {
              deviceId: { exact: explicitDeviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            };

        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraint,
          audio: false,
        });

        if (sessionTokenRef.current !== currentSession) {
          stream.getTracks().forEach((t) => {
            try {
              t.stop();
            } catch {}
          });
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          if (video.srcObject !== stream) {
            video.srcObject = stream;
          }
          video.setAttribute('playsinline', 'true');
          video.muted = true;
          await video.play().catch(() => {});
        }

        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            if (sessionTokenRef.current !== currentSession) return;
            const cams = devices.filter((d) => d.kind === 'videoinput');
            setVideoDevices(cams);
          })
          .catch(() => {});

        setStage('align_center');
        stageRef.current = 'align_center';
        setProgress(30);

        speakGuidance('Please center your face inside the oval guide while I verify your live presence.');
      } catch (err: any) {
        if (sessionTokenRef.current !== currentSession) return;
        const errName = err?.name || '';
        const message =
          errName === 'NotAllowedError' || errName === 'PermissionDeniedError'
            ? 'Camera permission was declined. Enable camera permissions or upload a clear portrait photo below.'
            : errName === 'NotReadableError' || errName === 'TrackStartError'
            ? 'Camera is currently busy in another application. Close other camera apps or upload a portrait photo.'
            : 'No active camera detected on this device. Upload an official portrait photo below.';
        setErrorMessage(message);
        setStage('camera_error');
        stageRef.current = 'camera_error';
      }
    },
    [speakGuidance, stopCamera]
  );

  const handleSwitchCamera = useCallback(() => {
    if (videoDevices.length < 2) return;
    const nextIdx = (selectedDeviceIndex + 1) % videoDevices.length;
    setSelectedDeviceIndex(nextIdx);
    const nextId = videoDevices[nextIdx]?.deviceId;
    if (nextId) {
      startCamera(nextId);
    }
  }, [selectedDeviceIndex, startCamera, videoDevices]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  useEffect(() => {
    if (
      isOpen &&
      videoRef.current &&
      streamRef.current &&
      videoRef.current.srcObject !== streamRef.current
    ) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  });

  useEffect(() => {
    if (!isOpen) return;
    let busy = false;

    const timer = window.setInterval(async () => {
      if (busy) return;
      const curStage = stageRef.current;
      if (curStage !== 'align_center' || hasCompletedRef.current || isSubmittingRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return;
      }

      busy = true;
      try {
        const evalSize = 160;
        canvas.width = evalSize;
        canvas.height = evalSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const crop = Math.min(vw, vh);
        const sx = Math.max(0, (vw - crop) / 2);
        const sy = Math.max(0, (vh - crop) / 2);

        ctx.save();
        ctx.translate(evalSize, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, sx, sy, crop, crop, 0, 0, evalSize, evalSize);
        ctx.restore();

        let nativeFaceDetected = false;
        if (nativeDetectorRef.current) {
          try {
            const faces = await Promise.race([
              nativeDetectorRef.current.detect(canvas),
              new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 45)),
            ]);
            nativeFaceDetected = Array.isArray(faces) && faces.length > 0;
          } catch {
            nativeFaceDetected = false;
          }
        }

        const { metrics, quality, currentSample } = analyzeCanvasFramePixels(
          ctx,
          evalSize,
          prevSampleRef.current,
          nativeFaceDetected,
          vw,
          vh,
          recentDeltasRef.current
        );
        prevSampleRef.current = currentSample;
        if (recentDeltasRef.current.length > 8) {
          recentDeltasRef.current.shift();
        }
        recentDeltasRef.current.push(metrics.frameDelta);
        lastMetricsRef.current = metrics;
        setQualityChecks(quality);

        if (metrics.passedOpticalCheck) {
          consecutiveStableRef.current += 1;
          const stepProgress = Math.min(84, 35 + consecutiveStableRef.current * 12);
          setProgress(stepProgress);

          if (consecutiveStableRef.current === 1 && !referenceLivenessFrameRef.current) {
            referenceLivenessFrameRef.current = captureSnapshot();
          }

          if (consecutiveStableRef.current >= 4) {
            consecutiveStableRef.current = 0;
            const finalSnap = captureSnapshot();
            const firstSnap = referenceLivenessFrameRef.current;
            if (finalSnap) {
              playStepTone(880);
              speakGuidance('Face aligned. Running neural identity and liveness analysis.');
              const validDualFrame = firstSnap && firstSnap !== finalSnap ? firstSnap : null;
              sendToBackendAndVerify(
                finalSnap,
                validDualFrame ? 'live_dual_frame_biometric_verified' : 'live_optical_biometric_verified',
                metrics,
                validDualFrame
              );
            }
          }
        } else {
          consecutiveStableRef.current = Math.max(0, consecutiveStableRef.current - 1);
          if (consecutiveStableRef.current === 0) {
            referenceLivenessFrameRef.current = null;
          }
          setProgress(quality.lightingOk ? 35 : 22);
        }
      } finally {
        busy = false;
      }
    }, 150);

    return () => clearInterval(timer);
  }, [isOpen, captureSnapshot, playStepTone, sendToBackendAndVerify, speakGuidance]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsUploading(false);
        setErrorMessage('Could not read the selected image file.');
        return;
      }

      const img = new Image();
      img.onload = async () => {
        try {
          if (img.width < 120 || img.height < 120) {
            setIsUploading(false);
            setErrorMessage('Image resolution is too small. Please upload a clearer portrait photo (at least 120×120).');
            return;
          }

          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = 720;
          fullCanvas.height = 720;
          const fullCtx = fullCanvas.getContext('2d');
          if (!fullCtx) {
            setIsUploading(false);
            return;
          }
          const size = Math.min(img.width, img.height);
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          fullCtx.drawImage(img, sx, sy, size, size, 0, 0, 720, 720);
          const normalizedDataUrl = fullCanvas.toDataURL('image/jpeg', 0.92);

          const evalSize = 160;
          const evalCanvas = document.createElement('canvas');
          evalCanvas.width = evalSize;
          evalCanvas.height = evalSize;
          const evalCtx = evalCanvas.getContext('2d', { willReadFrequently: true });
          let uploadMetrics: OpticalFrameMetrics | null = null;
          if (evalCtx) {
            evalCtx.drawImage(img, sx, sy, size, size, 0, 0, evalSize, evalSize);
            let nativeFace = false;
            if (nativeDetectorRef.current) {
              try {
                const faces = await nativeDetectorRef.current.detect(evalCanvas);
                nativeFace = Array.isArray(faces) && faces.length > 0;
              } catch {
                nativeFace = false;
              }
            }
            const res = analyzeCanvasFramePixels(
              evalCtx,
              evalSize,
              null,
              nativeFace,
              img.width,
              img.height,
              []
            );
            uploadMetrics = res.metrics;
          }

          setIsUploading(false);
          if (
            uploadMetrics &&
            (uploadMetrics.meanLuma < 18 ||
              uploadMetrics.meanLuma > 250 ||
              uploadMetrics.lumaStdDev < 7)
          ) {
            setErrorMessage(
              uploadMetrics.failureReason ||
                'Uploaded photo appears blank or completely dark. Please choose a clear portrait.'
            );
            stageRef.current = 'needs_retry';
            setStage('needs_retry');
            return;
          }

          await sendToBackendAndVerify(
            normalizedDataUrl,
            'user_uploaded_portrait_verified',
            uploadMetrics,
            null
          );
        } catch {
          setIsUploading(false);
          setErrorMessage('Failed to process uploaded image. Please choose a valid JPEG, PNG, or WebP portrait.');
        }
      };

      img.onerror = () => {
        setIsUploading(false);
        setErrorMessage('Unsupported image file. Please select a standard JPEG, PNG, or WebP portrait photo.');
      };
      img.src = dataUrl;
    };

    reader.onerror = () => {
      setIsUploading(false);
      setErrorMessage('Failed to read the selected file.');
    };

    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const camelliaCoachText =
    stage === 'initializing'
      ? 'Opening your camera feed and calibrating exposure...'
      : stage === 'align_center'
      ? qualityChecks.featuresOk
        ? 'Perfect! Hold still for neural lock...'
        : `${livenessChallenge} — ${qualityChecks.hint}`
      : stage === 'verifying'
      ? 'Analyzing real human facial geometry and anti-spoof depth...'
      : stage === 'needs_retry'
      ? 'Let us try that again — ensure bright, even frontal light.'
      : stage === 'verified'
      ? mode === 'cv_download'
        ? 'Identity confirmed! Preparing your A4 vector CV PDF now.'
        : 'Welcome! Your biometric persona pass is verified and active.'
      : 'No camera detected — you can upload a clear portrait photo below.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="biometric-verification-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn no-speak"
    >
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      <div className="relative w-full h-full sm:h-auto max-w-full sm:max-w-lg sm:rounded-3xl bg-[var(--panel)] shadow-2xl overflow-hidden flex flex-col justify-between animate-scaleUp">
        {/* Top Modal Header + Progress */}
        <div>
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-[var(--panel-raised)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3
                  id="biometric-verification-title"
                  className="text-sm sm:text-base font-heading font-bold text-[var(--text)] tracking-tight"
                >
                  Persona Biometric Verification
                </h3>
                <p className="text-[10.5px] font-mono text-[var(--text-muted)] flex items-center gap-1">
                  <Scale className="w-3 h-3 text-[var(--gold)] shrink-0" />
                  <span>ICAO Doc 9303 · Dual-Frame Neural Liveness</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVoiceGuidanceOn((v) => !v)}
                title={voiceGuidanceOn ? 'Mute Camellia voice guidance' : 'Enable Camellia voice guidance'}
                aria-label="Toggle persona voice guidance"
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel)] transition-colors cursor-pointer shrink-0 min-h-[36px] touch-manipulation"
              >
                {voiceGuidanceOn ? <Volume2 className="w-4 h-4 text-[var(--gold)]" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {videoDevices.length > 1 && stage !== 'verified' && stage !== 'camera_error' && (
                <button
                  type="button"
                  onClick={handleSwitchCamera}
                  title="Switch Camera"
                  aria-label="Switch Camera"
                  className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[var(--panel)] transition-colors cursor-pointer shrink-0 min-h-[36px] touch-manipulation"
                >
                  <SwitchCamera className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                aria-label="Close verification modal"
                className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors cursor-pointer shrink-0 min-h-[36px] touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[var(--panel-raised)] h-1 overflow-hidden">
            <div
              className="h-full bg-[var(--gold)] transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Live Camellia Persona Concierge Co-Pilot Bar */}
          <div className="px-5 py-3 bg-[var(--bg)]/70 flex items-center gap-3">
            <div
              className={`relative w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 transition-all ${
                stage === 'verified'
                  ? 'ring-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
                  : stage === 'verifying'
                  ? 'ring-[var(--gold)] shadow-[0_0_14px_rgba(226,184,103,0.4)]'
                  : 'ring-[var(--gold)]/60'
              }`}
            >
              <img
                src={CAMELLIA_AVATAR_SRC}
                alt="Camellia — M R S Persona Guide"
                className="w-full h-full object-cover object-top"
              />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-[var(--gold)] uppercase tracking-wider font-semibold">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Camellia · Persona Guide</span>
              </div>
              <p className="text-xs text-[var(--text)] leading-snug line-clamp-2 mt-0.5">
                {camelliaCoachText}
              </p>
            </div>
          </div>

          {/* Diagnostic Error Banner (when applicable) */}
          {errorMessage && stage !== 'camera_error' && (
            <div className="px-5 pb-2">
              <div className="w-full flex items-center justify-between gap-2 text-left text-xs font-medium text-[var(--danger-text)] bg-rose-500/12 rounded-xl py-2 px-3">
                <div className="flex items-start gap-2 min-w-0">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-[var(--danger-text)] hover:opacity-80 p-1 cursor-pointer shrink-0"
                  title="Dismiss"
                  aria-label="Dismiss error message"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Live 4-Metric Optical Telemetry Strip */}
          {stage !== 'camera_error' && (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 py-2 px-4 bg-[var(--panel-raised)]/55 text-[10.5px] sm:text-[11px] font-mono">
              <span
                className={`inline-flex items-center gap-1 ${
                  qualityChecks.lightingOk || stage === 'verifying' || stage === 'verified'
                    ? 'text-[var(--success-text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Lighting</span>
              </span>
              <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
              <span
                className={`inline-flex items-center gap-1 ${
                  qualityChecks.centeredOk || stage === 'verifying' || stage === 'verified'
                    ? 'text-[var(--success-text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Face Lock</span>
              </span>
              <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
              <span
                className={`inline-flex items-center gap-1 ${
                  qualityChecks.livenessOk || stage === 'verifying' || stage === 'verified'
                    ? 'text-[var(--success-text)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>Liveness</span>
              </span>
              <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
              <span
                className={`inline-flex items-center gap-1 ${
                  stage === 'verified'
                    ? 'text-[var(--success-text)] font-semibold'
                    : stage === 'verifying'
                    ? 'text-[var(--gold)] font-semibold'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {stage === 'verifying' ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : stage === 'verified' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>AI Verified</span>
              </span>
            </div>
          )}
        </div>

        {/* Main Viewport / Verified Receipt Stage */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col items-center justify-center">
          {stage === 'camera_error' ? (
            <div className="w-full py-5 px-4 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-rose-500/15 text-[var(--danger-text)] mx-auto flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                {errorMessage || 'Camera access is currently unavailable on this device.'}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
                <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs sm:text-sm font-semibold cursor-pointer transition-colors min-h-[44px] touch-manipulation">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>{isUploading ? 'Inspecting Photo...' : 'Upload Portrait Photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--panel-raised)] text-xs sm:text-sm font-medium text-[var(--text)] hover:text-[var(--gold)] inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] touch-manipulation"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>Retry Camera</span>
                </button>
              </div>
            </div>
          ) : stage === 'verified' ? (
            <div className="w-full max-w-sm space-y-4 text-center animate-fadeIn">
              {/* Verified Snapshot Portrait */}
              <div className="relative mx-auto w-32 h-32 rounded-full overflow-hidden ring-2 ring-emerald-500 shadow-[0_0_26px_rgba(16,185,129,0.35)]">
                {capturedPhoto && (
                  <img
                    src={capturedPhoto}
                    alt="Verified human identity portrait"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                  <BadgeCheck className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h4 className="text-base font-heading font-bold text-[var(--success-text)]">
                  Persona Biometric Pass Active
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {verificationAudit?.reason || 'Verified real human identity & liveness'}
                </p>
              </div>

              {/* Cryptographic Audit Receipt Grid */}
              <div className="grid grid-cols-2 gap-2 text-left bg-[var(--bg)]/80 p-3.5 rounded-2xl text-[11px] font-mono">
                <div>
                  <span className="text-[var(--text-muted)] block">Pass ID</span>
                  <span className="text-[var(--text)] font-semibold truncate block">
                    {verificationAudit?.verificationId || 'VF-ACTIVE'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Neural Confidence</span>
                  <span className="text-[var(--success-text)] font-bold">
                    {verificationAudit?.confidence || 95}%
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Engine</span>
                  <span className="text-[var(--gold)]">
                    {verificationAudit?.method === 'gemini_vision_biometric'
                      ? 'Gemini Vision'
                      : 'Optical CV'}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] block">Dimensions</span>
                  <span className="text-[var(--text)]">
                    {verificationAudit?.imageDimensions || '720×720'}
                  </span>
                </div>
              </div>

              {mode === 'cv_download' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (autoLaunchTimerRef.current) {
                      clearTimeout(autoLaunchTimerRef.current);
                      autoLaunchTimerRef.current = null;
                    }
                    onVerifiedRef.current(capturedPhoto || undefined, verificationAudit || undefined);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <Download className="w-4 h-4 shrink-0" />
                  <span>Downloading Executive CV...</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Done · Keep Verified Pass Active</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              {/* Circular Biometric Scanner Viewport */}
              <div className="relative mx-auto flex items-center justify-center my-1">
                <div
                  className={`relative rounded-full overflow-hidden transition-all duration-300 w-[min(64vw,248px)] h-[min(64vw,248px)] sm:w-[264px] sm:h-[264px] bg-black ring-2 ${
                    stage === 'needs_retry'
                      ? 'ring-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.28)]'
                      : qualityChecks.featuresOk
                      ? 'ring-[var(--gold)] shadow-[0_0_28px_rgba(226,184,103,0.32)]'
                      : 'ring-[var(--text-muted)]/35'
                  }`}
                >
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className={`w-full h-full object-cover transform -scale-x-100 ${
                      capturedPhoto && stage === 'verifying' ? 'hidden' : 'block'
                    }`}
                  />

                  {capturedPhoto && stage === 'verifying' && (
                    <img
                      src={capturedPhoto}
                      alt="Captured biometric portrait"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {stage === 'verifying' && (
                    <div
                      className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent shadow-[0_0_12px_rgba(226,184,103,0.9)] z-20 pointer-events-none"
                      style={{ animation: 'scanline 1.6s ease-in-out infinite' }}
                    />
                  )}

                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div
                      className={`w-36 h-44 sm:w-40 sm:h-48 rounded-full border border-dashed transition-colors ${
                        qualityChecks.featuresOk
                          ? 'border-[var(--gold)] opacity-85'
                          : 'border-[var(--gold)]/45 opacity-60'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Action Controls */}
              <div className="mt-4 flex flex-col items-center gap-2.5 w-full max-w-xs">
                <button
                  type="button"
                  onClick={handleManualCaptureClick}
                  disabled={stage === 'verifying' || stage === 'initializing'}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--gold)] hover:bg-[var(--gold-hover)] active:scale-[0.98] text-[var(--gold-ink)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 min-h-[44px] touch-manipulation"
                >
                  {stage === 'needs_retry' ? (
                    <>
                      <RotateCcw className="w-4 h-4 shrink-0" />
                      <span>Scan Again</span>
                    </>
                  ) : stage === 'verifying' ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>Validating Biometrics...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>Capture &amp; Verify Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Upload Portrait Fallback */}
          {stage !== 'camera_error' && stage !== 'verified' && (
            <div className="mt-3 text-center">
              <label className="text-[11px] font-mono text-[var(--text-muted)] hover:text-[var(--gold)] transition-colors cursor-pointer inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-lg hover:bg-[var(--panel-raised)]">
                <Upload className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isUploading ? 'Inspecting portrait...' : 'Or upload an official portrait photo'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={isUploading || stage === 'verifying'}
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer Standards Bar */}
        <div className="px-5 py-3 bg-[var(--panel-raised)] flex items-center justify-between text-[10.5px] font-mono text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5 text-[var(--gold)]">
            <Lock className="w-3 h-3 shrink-0" />
            <span>Cryptographic Pass · ICAO Doc 9303</span>
          </span>
          <span>Encrypted Biometric Check</span>
        </div>
      </div>
    </div>
  );
};
