// Comprehensive Client-Side Telemetry Collector for MRS Portfolio
export interface ClientTelemetryData {
  // Screen & Display
  screenResolution?: string;
  availableScreen?: string;
  viewportSize?: string;
  devicePixelRatio?: number;
  colorDepth?: number;
  orientation?: string;
  touchSupport?: string;

  // Hardware & Graphics
  cores?: string;
  deviceMemory?: string;
  gpuRenderer?: string;
  gpuVendor?: string;
  batteryLevel?: string;
  batteryCharging?: boolean;

  // Network & Connection
  connectionType?: string;
  downlinkSpeed?: string;
  roundTripLatency?: string;
  dataSaver?: string;

  // Environment & Settings
  timezone?: string;
  timezoneOffset?: string;
  localTime?: string;
  languages?: string;
  primaryLanguage?: string;
  platform?: string;
  colorSchemePreference?: string;
  cookiesEnabled?: boolean;
  webAssemblySupported?: boolean;
  pdfViewerEnabled?: boolean;
  doNotTrack?: string;

  // Navigation & Session
  url?: string;
  referrer?: string;
  sessionDurationSeconds?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

const pageLoadTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

// Extract GPU details via WebGL canvas
function getGpuDetails(): { renderer?: string; vendor?: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return {};

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return {};

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

    return {
      renderer: typeof renderer === 'string' ? renderer : undefined,
      vendor: typeof vendor === 'string' ? vendor : undefined,
    };
  } catch {
    return {};
  }
}

export async function collectComprehensiveClientTelemetry(): Promise<ClientTelemetryData> {
  const telemetry: ClientTelemetryData = {};

  try {
    if (typeof window !== 'undefined') {
      // Screen & Viewport
      telemetry.screenResolution = `${window.screen.width}x${window.screen.height}`;
      telemetry.availableScreen = `${window.screen.availWidth}x${window.screen.availHeight}`;
      telemetry.viewportSize = `${window.innerWidth}x${window.innerHeight}`;
      telemetry.devicePixelRatio = window.devicePixelRatio || 1;
      telemetry.colorDepth = window.screen.colorDepth;
      telemetry.orientation = window.screen.orientation?.type || 'unknown';

      // Touch & Pointer
      const maxTouch = navigator.maxTouchPoints || 0;
      telemetry.touchSupport =
        maxTouch > 0 ? `Touchscreen (${maxTouch} points)` : 'Mouse / Trackpad (Non-touch)';

      // Session Duration
      const durationMs =
        typeof performance !== 'undefined'
          ? performance.now() - pageLoadTime
          : Date.now() - pageLoadTime;
      telemetry.sessionDurationSeconds = Math.max(1, Math.round(durationMs / 1000));

      // URLs & UTM params
      telemetry.url = window.location.href;
      telemetry.referrer = document.referrer || 'Direct / Bookmark';

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('utm_source')) telemetry.utmSource = urlParams.get('utm_source')!;
      if (urlParams.get('utm_medium')) telemetry.utmMedium = urlParams.get('utm_medium')!;
      if (urlParams.get('utm_campaign')) telemetry.utmCampaign = urlParams.get('utm_campaign')!;
      if (urlParams.get('utm_term')) telemetry.utmTerm = urlParams.get('utm_term')!;
      if (urlParams.get('utm_content')) telemetry.utmContent = urlParams.get('utm_content')!;

      // Preferences
      telemetry.colorSchemePreference = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'Dark Mode'
        : 'Light Mode';
    }

    if (typeof navigator !== 'undefined') {
      // Hardware
      if (navigator.hardwareConcurrency) {
        telemetry.cores = `${navigator.hardwareConcurrency} Logical Cores`;
      }
      if ((navigator as any).deviceMemory) {
        telemetry.deviceMemory = `~${(navigator as any).deviceMemory} GB RAM`;
      }
      telemetry.platform =
        (navigator as any).userAgentData?.platform || navigator.platform || 'Unknown Platform';

      // Languages & Locale
      telemetry.languages = navigator.languages ? navigator.languages.join(', ') : navigator.language;
      telemetry.primaryLanguage = navigator.language;
      telemetry.cookiesEnabled = navigator.cookieEnabled;
      telemetry.doNotTrack = navigator.doNotTrack === '1' ? 'Enabled' : 'Disabled / Unset';

      if ((navigator as any).pdfViewerEnabled !== undefined) {
        telemetry.pdfViewerEnabled = (navigator as any).pdfViewerEnabled;
      }

      // Network Connection
      const conn = (navigator as any).connection;
      if (conn) {
        telemetry.connectionType = conn.effectiveType || conn.type;
        if (conn.downlink) telemetry.downlinkSpeed = `${conn.downlink} Mbps`;
        if (conn.rtt) telemetry.roundTripLatency = `${conn.rtt} ms`;
        if (conn.saveData !== undefined) telemetry.dataSaver = conn.saveData ? 'Active' : 'Off';
      }

      // Battery API (if available)
      try {
        if (typeof (navigator as any).getBattery === 'function') {
          const battery = await (navigator as any).getBattery();
          if (battery) {
            telemetry.batteryLevel = `${Math.round(battery.level * 100)}%`;
            telemetry.batteryCharging = battery.charging;
          }
        }
      } catch {
        // Battery status query restricted or rejected
      }
    }

    // Timezone & Local Clock
    if (typeof Intl !== 'undefined') {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      telemetry.timezone = tz;
      const now = new Date();
      const offsetMinutes = -now.getTimezoneOffset();
      const offsetHours = (offsetMinutes / 60).toFixed(1).replace('.0', '');
      telemetry.timezoneOffset = `UTC${offsetMinutes >= 0 ? '+' : ''}${offsetHours}`;
      telemetry.localTime = now.toLocaleString('en-US', {
        timeZone: tz,
        dateStyle: 'full',
        timeStyle: 'medium',
      });
    }

    // GPU graphics
    const gpu = getGpuDetails();
    if (gpu.renderer) telemetry.gpuRenderer = gpu.renderer;
    if (gpu.vendor) telemetry.gpuVendor = gpu.vendor;

    // WebAssembly support
    telemetry.webAssemblySupported = typeof WebAssembly !== 'undefined';
  } catch (err) {
    console.warn('Telemetry collection safe catch:', err);
  }

  return telemetry;
}
