import React, { useState, useEffect } from 'react';
import { BioProfile, CvWatermarkConfig } from '../types';
import { generateMrsCvPdf, getFormattedCvFilename } from '../utils/cvPdfGenerator';
import { generateUniqueCvDocId } from '../utils/cvTracking';
import { collectComprehensiveClientTelemetry } from '../utils/telemetry';
import { FaceVerificationModal, FaceVerificationAudit } from './FaceVerificationModal';
import {
  FileText,
  CheckCircle2,
  RefreshCw,
  ScanFace,
} from 'lucide-react';

interface DownloadCvBarProps {
  profile: BioProfile;
  uid?: string;
  onAnnounceDownload?: (text: string) => void;
  onPassVerified?: (audit: FaceVerificationAudit) => void;
}

export const DownloadCvBar: React.FC<DownloadCvBarProps> = ({
  profile,
  uid,
  onAnnounceDownload,
  onPassVerified,
}) => {
  const [status, setStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [savedFilename, setSavedFilename] = useState<string>('');
  const [showFaceModal, setShowFaceModal] = useState<boolean>(false);

  // Clear any legacy cached verification so every download requires fresh verification
  useEffect(() => {
    try {
      sessionStorage.removeItem('mrs_human_face_verified');
      sessionStorage.removeItem('mrs_human_face_capture');
    } catch (e) {}
  }, []);

  // Fixed confidential watermark configuration
  const fixedWatermarkConfig: CvWatermarkConfig = {
    enabled: true,
    text: 'M R S • CONFIDENTIAL',
    tone: 'subtle-gold',
    position: 'diagonal-center',
  };

  // Internal execution of CV generation & download
  const executeDownload = async (capturedFace?: string, faceAudit?: FaceVerificationAudit) => {
    try {
      const activeFace = capturedFace;
      const currentFilename = getFormattedCvFilename();
      setSavedFilename(currentFilename);
      setStatus('generating');
      setProgressMsg('Fetching live profile data from backend...');

      if (onAnnounceDownload) {
        onAnnounceDownload(
          "Preparing and downloading M R S's executive CV in vector PDF format, fully synchronized with his latest projects, certifications, and experience."
        );
      }

      const telemetry = await collectComprehensiveClientTelemetry();
      const docUniqueId = generateUniqueCvDocId();

      // Pull fresh real-time profile & projects before compiling PDF
      let effectiveProfile: BioProfile = profile;
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 2500);
        const liveRes = await fetch(
          `/api/gravatar?username=${encodeURIComponent(profile.gravatarUsername || 'mrxshahin')}&_t=${Date.now()}`,
          { signal: controller.signal, cache: 'no-store' }
        );
        window.clearTimeout(timeoutId);
        if (liveRes.ok) {
          const liveJson = await liveRes.json();
          const liveData = liveJson?.profile;
          if (liveData) {
            effectiveProfile = {
              ...profile,
              ...liveData,
              projects:
                Array.isArray(liveData.projects) && liveData.projects.length > 0
                  ? liveData.projects
                  : profile.projects,
              socials: {
                ...(profile.socials || {}),
                ...(liveData.socials || {}),
              },
              lastSyncedAt: liveJson?.syncedAt || liveData.lastSyncedAt || profile.lastSyncedAt,
            };
          }
        }
      } catch (syncErr) {
        console.warn('Live Gravatar pre-CV sync skipped (using current state):', syncErr);
      }

      setProgressMsg('Compiling live portfolio into executive PDF...');

      try {
        const response = await fetch('/api/generate-cv-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            profile: effectiveProfile,
            telemetry: {
              ...telemetry,
              biometricAudit: faceAudit || undefined,
            },
            faceCapture: activeFace || undefined,
            watermark: fixedWatermarkConfig,
            docUniqueId,
          }),
        });

        if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
          const blob = await response.blob();
          const downloadUrl = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = downloadUrl;
          a.download = currentFilename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(downloadUrl);
          document.body.removeChild(a);

          setStatus('success');
          setProgressMsg('CV Downloaded Successfully!');
          setTimeout(() => {
            setStatus('idle');
            setProgressMsg('');
          }, 5000);
          return;
        }
      } catch (backendErr) {
        console.warn('Backend PDF endpoint direct fetch fallback:', backendErr);
      }

      setProgressMsg('Formatting vector 2-column executive resume...');
      const { doc, filename } = await generateMrsCvPdf(effectiveProfile, fixedWatermarkConfig, docUniqueId);
      const finalName = filename || currentFilename;
      doc.save(finalName);

      fetch('/api/notify-cv-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetry: {
            ...telemetry,
            biometricAudit: faceAudit || undefined,
          },
          filename: finalName,
          faceCapture: activeFace || undefined,
          docUniqueId,
        }),
      }).catch(() => {});

      setStatus('success');
      setProgressMsg('CV Downloaded Successfully!');
      setTimeout(() => {
        setStatus('idle');
        setProgressMsg('');
      }, 5000);
    } catch (error) {
      console.error('Failed to generate CV PDF:', error);
      setStatus('error');
      setProgressMsg('Error generating PDF. Please try again.');
      setTimeout(() => {
        setStatus('idle');
        setProgressMsg('');
      }, 4000);
    }
  };

  // Intercept download button click to enforce face verification EVERY TIME
  const handleDownloadClick = () => {
    setShowFaceModal(true);
    if (onAnnounceDownload) {
      onAnnounceDownload(
        "Please position your face within the circle to verify and download M R S's executive CV."
      );
    }
  };

  // Triggered when face verification successfully confirms live human presence
  const handleFaceVerified = (faceCapture?: string, audit?: FaceVerificationAudit) => {
    setShowFaceModal(false);
    if (audit) {
      onPassVerified?.(audit);
    }
    executeDownload(faceCapture, audit);
  };

  return (
    <>
      <div
        id="cv-download-bar"
        className="futuristic-card-glow w-full px-4 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-7 sm:py-9 bg-[var(--panel-raised)]/85 transition-all duration-200 relative overflow-hidden group"
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          {/* Left Info Area with Screen Size Adjustment */}
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--bg)] flex items-center justify-center text-[var(--gold)] shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="text-left flex-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs font-mono text-[var(--gold)] mb-0.5">
                <span className="inline-flex items-center gap-1">
                  <ScanFace className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>Biometric Verified</span>
                </span>
                <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                <span className="text-[var(--text-secondary)]">A4 Vector PDF</span>
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-heading font-bold text-[var(--text)] tracking-tight">
                Download M R S Executive CV / Resume (PDF)
              </h3>
              <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] mt-0.5">
                Complete A4 Vector Resume — Includes Certifications, Academic Education, Projects &amp; Experience
              </p>
            </div>
          </div>

          {/* Right Action Controls with Responsive Screen Size Sizing */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              id="download-mrs-cv-btn"
              onClick={handleDownloadClick}
              disabled={status === 'generating'}
              className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer min-h-[44px] whitespace-nowrap shrink-0 shadow-sm hover:shadow-md touch-manipulation ${
                status === 'generating'
                  ? 'bg-[var(--panel-raised)] text-[var(--gold)] cursor-wait'
                  : status === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-[var(--gold)] hover:bg-[var(--gold-hover)] text-[var(--gold-ink)]'
              }`}
            >
              {status === 'generating' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-[var(--gold)] shrink-0" />
                  <span>{progressMsg || 'Generating PDF...'}</span>
                </>
              ) : status === 'success' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                  <span>Download Complete</span>
                </>
              ) : (
                <>
                  <ScanFace className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Verify Face &amp; Download Document</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Real-time status progress bar */}
        {status === 'generating' && (
          <div className="mt-3 pt-3 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[var(--gold)]">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
              <span>{progressMsg}</span>
            </div>
            <span className="text-[var(--text-muted)]">A4 Vector Format</span>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-3 pt-3 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[var(--success-text)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>{savedFilename || 'M R S Executive Document.pdf'} saved to device.</span>
            </div>
            <span className="text-[var(--text-muted)]">Verified &amp; Recruiter Ready</span>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-3 pt-3 flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[var(--danger-text)]">
            <span>{progressMsg}</span>
          </div>
        )}
      </div>

      {/* Face Biometric Human Verification Modal */}
      <FaceVerificationModal
        isOpen={showFaceModal}
        mode="cv_download"
        uid={uid}
        onClose={() => setShowFaceModal(false)}
        onVerified={handleFaceVerified}
        onAnnounce={onAnnounceDownload}
      />
    </>
  );
};
