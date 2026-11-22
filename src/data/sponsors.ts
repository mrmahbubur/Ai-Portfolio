export type SponsorCategory =
  | 'Cloud & IT'
  | 'Security & Privacy'
  | 'Developer Tools'
  | 'Web Hosting'
  | 'Digital Media'
  | 'Productivity';

export interface SponsorAdLink {
  id: string;
  indexLabel: string;
  zoneId: string;
  url: string;
  title: string;
  category: SponsorCategory;
  summary: string;
  benefit: string;
  recommendedFor: string;
  matchedSection: string;
  ctaLabel: string;
  placement: 'featured' | 'directory';
  clicks?: number;
  lastClickedAt?: string | null;
}

export const SPONSOR_AD_LINKS: SponsorAdLink[] = [
  {
    id: 'sponsor-11226634',
    indexLabel: '01',
    zoneId: '11226634',
    url: 'https://uplcm.com/4/11226634',
    title: 'Cloud Infrastructure & Remote Ops Partner',
    category: 'Cloud & IT',
    summary:
      'High-availability cloud workspace and remote system administration offer curated alongside M R S IT operations.',
    benefit: 'Funds open IT troubleshooting guides & server uptime',
    recommendedFor: 'Remote Teams & Admins',
    matchedSection: 'All Services & Cloud Hub',
    ctaLabel: 'Explore Cloud Partner',
    placement: 'featured',
  },
  {
    id: 'sponsor-11683565',
    indexLabel: '02',
    zoneId: '11683565',
    url: 'https://uplcm.com/4/11683565',
    title: 'Global Streaming & Smart-TV Partner',
    category: 'Digital Media',
    summary:
      'Featured cross-device streaming and entertainment discovery partner aligned with IPTV Web & Android TV visitors.',
    benefit: 'Supports free streaming & APK directory access',
    recommendedFor: 'IPTV & Media Visitors',
    matchedSection: 'IPTV WEB & Apps Store',
    ctaLabel: 'Explore Media Offer',
    placement: 'featured',
  },
  {
    id: 'sponsor-11242745',
    indexLabel: '03',
    zoneId: '11242745',
    url: 'https://uplcm.com/4/11242745',
    title: 'Endpoint Defense & Browser Safety Hub',
    category: 'Security & Privacy',
    summary:
      'Verified security software and malware defense resources for safer Windows, Android, and remote work devices.',
    benefit: 'Device Hardening',
    recommendedFor: 'Everyday & Remote PC Users',
    matchedSection: 'IT Diagnostics & Ethical Defense',
    ctaLabel: 'View Security Tool',
    placement: 'directory',
  },
  {
    id: 'sponsor-11242069',
    indexLabel: '04',
    zoneId: '11242069',
    url: 'https://uplcm.com/4/11242069',
    title: 'Modern DevOps & Web Automation Suite',
    category: 'Developer Tools',
    summary:
      'API utilities, deployment acceleration, and web management resources for developers and digital operators.',
    benefit: 'Fast Web Workflows',
    recommendedFor: 'Web Managers & Builders',
    matchedSection: 'Web Development & Camellia AI',
    ctaLabel: 'Open Dev Utilities',
    placement: 'directory',
  },
  {
    id: 'sponsor-11242067',
    indexLabel: '05',
    zoneId: '11242067',
    url: 'https://uplcm.com/4/11242067',
    title: 'Managed Domain, DNS & Edge Hosting',
    category: 'Web Hosting',
    summary:
      'Low-latency web hosting, SSL routing, and reliable domain management offers for business sites and blogs.',
    benefit: '99.9% Edge Routing',
    recommendedFor: 'Site Owners & Startups',
    matchedSection: 'BLOGGER & WordPress CMS',
    ctaLabel: 'Launch Hosting Offer',
    placement: 'directory',
  },
  {
    id: 'sponsor-11242742',
    indexLabel: '06',
    zoneId: '11242742',
    url: 'https://uplcm.com/4/11242742',
    title: 'Office 365 & Document Workflow Tools',
    category: 'Productivity',
    summary:
      'Document formatting, executive spreadsheet automation, and team productivity utilities matched to M R S workflows.',
    benefit: 'Executive Office Sync',
    recommendedFor: 'Professionals & Analysts',
    matchedSection: 'MS 365 & Document Ops',
    ctaLabel: 'Boost Productivity',
    placement: 'directory',
  },
  {
    id: 'sponsor-11230440',
    indexLabel: '07',
    zoneId: '11230440',
    url: 'https://uplcm.com/4/11230440',
    title: 'Encrypted Cloud Backup & Disaster Recovery',
    category: 'Cloud & IT',
    summary:
      'Automated multi-device workstation backup and rapid system state restoration tailored for zero-data-loss resilience.',
    benefit: 'Automated Backups',
    recommendedFor: 'Distributed Workstations',
    matchedSection: 'Remote System Admin',
    ctaLabel: 'Protect Workspace',
    placement: 'directory',
  },
  {
    id: 'sponsor-11683560',
    indexLabel: '08',
    zoneId: '11683560',
    url: 'https://uplcm.com/4/11683560',
    title: 'Mobile APK & Connected Screen Utilities',
    category: 'Digital Media',
    summary:
      'Lightweight mobile and television utility releases vetted for smooth streaming and low-overhead installation.',
    benefit: 'Multi-Device Ready',
    recommendedFor: 'Android & Smart TV Users',
    matchedSection: 'Android Apps & TV Builds',
    ctaLabel: 'Explore Screen Apps',
    placement: 'directory',
  },
  {
    id: 'sponsor-9912130',
    indexLabel: '09',
    zoneId: '9912130',
    url: 'https://uplcm.com/4/9912130',
    title: 'Global Web CDN & Portal Accelerator',
    category: 'Web Hosting',
    summary:
      'Core partner distribution channel helping sustain free tech blog tutorials and humanitarian community projects.',
    benefit: 'Global Traffic Routing',
    recommendedFor: 'Publishers & Creators',
    matchedSection: 'Charity Foundation & Blog',
    ctaLabel: 'Visit Network Partner',
    placement: 'directory',
  },
  {
    id: 'sponsor-11242744',
    indexLabel: '10',
    zoneId: '11242744',
    url: 'https://uplcm.com/4/11242744',
    title: 'Private Tunnel & Zero-Trust Access Kit',
    category: 'Security & Privacy',
    summary:
      'Encrypted remote connection utilities built for privacy-conscious consultants and confidential communications.',
    benefit: 'Encrypted Tunnels',
    recommendedFor: 'Privacy-First Visitors',
    matchedSection: 'Private C N Workspace',
    ctaLabel: 'Secure Connection',
    placement: 'directory',
  },
];

export type BannerZoneContext =
  | 'hero-cloud'
  | 'credentials-productivity'
  | 'projects-media'
  | 'security-privacy'
  | 'hosting-community'
  | 'all';

const CONTEXT_ZONE_SPONSOR_IDS: Record<BannerZoneContext, string[]> = {
  'hero-cloud': ['sponsor-11226634', 'sponsor-11242742', 'sponsor-11230440'],
  'credentials-productivity': ['sponsor-11242742', 'sponsor-11230440', 'sponsor-11226634'],
  'projects-media': [
    'sponsor-11683565',
    'sponsor-11683560',
    'sponsor-11242069',
    'sponsor-11242067',
  ],
  'security-privacy': ['sponsor-11242745', 'sponsor-11242744', 'sponsor-9912130'],
  'hosting-community': [
    'sponsor-11242067',
    'sponsor-9912130',
    'sponsor-11683565',
    'sponsor-11226634',
  ],
  all: SPONSOR_AD_LINKS.map((s) => s.id),
};

export function getSponsorsForContext(
  sponsors: SponsorAdLink[],
  zone: BannerZoneContext = 'all',
  explicitIds?: string[]
): SponsorAdLink[] {
  const targetIds = explicitIds && explicitIds.length > 0 ? explicitIds : CONTEXT_ZONE_SPONSOR_IDS[zone];
  if (!targetIds || targetIds.length === 0) return sponsors;
  const matched = targetIds
    .map((id) => sponsors.find((s) => s.id === id))
    .filter((s): s is SponsorAdLink => Boolean(s));
  return matched.length > 0 ? matched : sponsors;
}

export const SPONSOR_CLICK_EVENT = 'mrs:sponsor-click-sync';

let cachedFetchPromise: Promise<SponsorAdLink[] | null> | null = null;
let cachedMergedSponsors: SponsorAdLink[] | null = null;

export async function fetchLiveSponsors(forceRefresh = false): Promise<SponsorAdLink[] | null> {
  if (!forceRefresh && cachedMergedSponsors) return cachedMergedSponsors;
  if (!forceRefresh && cachedFetchPromise) return cachedFetchPromise;

  cachedFetchPromise = (async () => {
    try {
      const res = await fetch('/api/sponsors');
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.success && Array.isArray(data.sponsors) && data.sponsors.length > 0) {
        const remoteList = data.sponsors as SponsorAdLink[];
        cachedMergedSponsors = SPONSOR_AD_LINKS.map((localItem) => {
          const remote = remoteList.find((r) => r.id === localItem.id || r.url === localItem.url);
          return remote ? { ...localItem, ...remote } : localItem;
        });
        return cachedMergedSponsors;
      }
      return null;
    } catch {
      return null;
    } finally {
      cachedFetchPromise = null;
    }
  })();

  return cachedFetchPromise;
}

export function recordSponsorClick(sponsorId: string, url: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (cachedMergedSponsors) {
      cachedMergedSponsors = cachedMergedSponsors.map((item) =>
        item.id === sponsorId || item.url === url
          ? { ...item, clicks: (item.clicks || 0) + 1, lastClickedAt: new Date().toISOString() }
          : item
      );
    }
    window.dispatchEvent(
      new CustomEvent(SPONSOR_CLICK_EVENT, {
        detail: { sponsorId, url },
      })
    );

    const payload = JSON.stringify({
      sponsorId,
      url,
      viewportWidth: window.innerWidth,
      timestamp: new Date().toISOString(),
    });
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/sponsors/click', blob);
    } else {
      fetch('/api/sponsors/click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Non-blocking telemetry failure must never hinder outbound navigation
  }
}
