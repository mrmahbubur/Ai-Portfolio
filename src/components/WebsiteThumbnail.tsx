import React, { useState } from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface WebsiteThumbnailProps {
  url: string;
  title: string;
  badge?: string;
  customImage?: string;
  className?: string;
}

export const WebsiteThumbnail: React.FC<WebsiteThumbnailProps> = ({
  url,
  title,
  badge,
  customImage,
  className = '',
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getDomain = (rawUrl: string): string => {
    try {
      const parsed = new URL(rawUrl);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return 'live-platform';
    }
  };

  const domain = getDomain(url);
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  const primaryScreenshotUrl =
    customImage || `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=800`;
  const fallbackScreenshotUrl = `https://api.microlink.io?url=${encodeURIComponent(
    url
  )}&screenshot=true&embed=screenshot.url`;

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden bg-[var(--panel-raised)] group/thumb transition-all duration-200 aspect-[16/9] ${className}`}
    >
      {/* Clean Loading / Fallback Frame */}
      {!imageLoaded && (
        <div className="absolute inset-0 bg-[var(--panel-raised)] flex flex-col items-center justify-center gap-1.5 px-4 text-center">
          <div className="flex items-center gap-2 text-[var(--gold)] text-xs font-mono">
            <Globe className="w-4 h-4 shrink-0" />
            <span className="font-medium truncate max-w-[200px]">{domain}</span>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[220px]">
            {title}
          </span>
        </div>
      )}

      {/* Live Website Screenshot */}
      <img
        src={imageError ? fallbackScreenshotUrl : primaryScreenshotUrl}
        alt={`${title} website preview`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          if (!imageError) {
            setImageError(true);
          }
        }}
        className={`w-full h-full object-cover object-top transition-transform duration-500 group-hover/thumb:scale-[1.03] ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Measured Bottom Scrim for High-Contrast Metadata */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent pointer-events-none" />

      {/* Center Hover Action */}
      <div className="absolute inset-0 bg-[var(--bg)]/55 backdrop-blur-[2px] opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20 pointer-events-none">
        <div className="px-4 py-2 rounded-xl bg-[var(--gold)] text-[var(--gold-ink)] font-semibold text-xs flex items-center gap-2 shadow-lg">
          <span>Open Website</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Unboxed Bottom Metadata Strip (Zero-Pill) */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 text-[11px] font-mono text-white/95 pointer-events-none z-10">
        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <img
            src={faviconUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
            className="w-3.5 h-3.5 rounded-sm object-contain shrink-0"
          />
          <span className="truncate font-medium">{domain}</span>
        </div>
        {badge && (
          <span className="text-[10px] text-white/80 truncate shrink-0">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
};
