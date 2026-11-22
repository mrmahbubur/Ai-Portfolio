export interface RawCvProjectInput {
  id?: string;
  title?: string;
  name?: string;
  category?: string;
  badge?: string;
  description?: string;
  link?: string;
  url?: string;
}

export interface CvProjectEntry {
  name: string;
  badge: string;
  desc: string;
}

/**
 * Removes full URLs, protocols, paths, and bare domain names so NO website
 * addresses appear inside the CV Digital Projects section.
 */
export function stripWebsiteAddresses(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  let cleaned = raw
    // Strip markdown links like [Title](https://...) -> Title
    .replace(/\[([^\]]+)\]\(\s*(?:https?:\/\/|www\.)?[^)\s]+\s*\)/gi, '$1')
    // Strip parenthesized URLs/domains like (mrxshahin.blogspot.com) or (https://example.com)
    .replace(
      /\(\s*(?:https?:\/\/|www\.)?(?:[a-z0-9-]+\.)+(?:com|org|net|io|ai|studio|dev|app|co|me|info|xyz|online|site|tech|blog|tv|shop|store|cloud|edu|gov|uk|bd|us|in|ca|au|de|fr|gg|ly|to|cc)(?:\/[^\s)]*)?\s*\)/gi,
      ''
    )
    // Strip bracketed URLs/domains
    .replace(
      /\[\s*(?:https?:\/\/|www\.)?(?:[a-z0-9-]+\.)+(?:com|org|net|io|ai|studio|dev|app|co|me|info|xyz|online|site|tech|blog|tv|shop|store|cloud|edu|gov|uk|bd|us|in|ca|au|de|fr|gg|ly|to|cc)(?:\/[^\s\]]*)?\s*\]/gi,
      ''
    )
    // Strip full http(s):// and www. URLs
    .replace(/\b(?:https?:\/\/|www\.)[^\s,;)\]]+/gi, '')
    // Strip bare domain/subdomain addresses with known web TLDs & optional paths
    .replace(
      /\b(?:[a-z0-9-]+\.)+(?:ai\.studio|onrender\.com|github\.io|blogspot\.com|wordpress\.com|pages\.dev|vercel\.app|netlify\.app|run\.app|fly\.dev|railway\.app|com|org|net|io|studio|dev|app|co|me|info|xyz|online|site|tech|blog|tv|shop|store|cloud|edu|gov|uk|bd)(?:\/[^\s,;)\]]*)?/gi,
      ''
    );

  // Tidy dangling connectors/punctuation left behind when a domain or URL was removed
  cleaned = cleaned
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1');

  for (let i = 0; i < 3; i++) {
    cleaned = cleaned
      .replace(/\b(?:available\s+at|hosted\s+on|accessible\s+at|visit\s+at|live\s+at|at|on|via|from|url|and|or)\s*(?=[.,;:!?]|$)/gi, '')
      .replace(/\s*[-–—·|,:]\s*$/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  cleaned = cleaned
    .replace(/^\s*[-–—·|,:;.]\s*/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();

  return cleaned;
}

const DEFAULT_CV_PROJECTS: CvProjectEntry[] = [
  {
    name: 'All Services',
    badge: 'Services & IT Hub',
    desc: 'Unified service portal showcasing remote IT support, virtual assistance, Microsoft 365 document workflows, and web management.',
  },
  {
    name: 'IPTV WEB',
    badge: 'Live Streaming & Media',
    desc: 'Web and Android streaming platform delivering 10,000+ live channels of sports, movies, dramas, and news with an ad-free tier.',
  },
  {
    name: 'Apps Store',
    badge: 'Web & Android Apps',
    desc: 'Curated web and mobile application directory offering lightweight utilities, streaming players, and productivity tools.',
  },
  {
    name: 'Private C N',
    badge: 'Privacy & Security',
    desc: 'Privacy-first communication and confidential digital workspace platform built with strict data security safeguards.',
  },
  {
    name: 'Camellia Shop',
    badge: 'Global E-Commerce',
    desc: 'Curated online storefront offering everyday essentials, accessories, and trending goods with streamlined checkout.',
  },
  {
    name: 'Charity Project',
    badge: 'Humanitarian Non-Profit',
    desc: 'Humanitarian initiative dedicated to healthcare, education, shelter, and community empowerment.',
  },
  {
    name: 'BLOGGER',
    badge: 'Tech Blog · 2018–Present',
    desc: 'Practical fixes and step-by-step troubleshooting guides covering Windows, Android, Wi-Fi, and browsers.',
  },
  {
    name: 'Camellia Ai',
    badge: 'Interactive AI Platform',
    desc: 'Conversational AI concierge workspace providing multilingual voice guidance, coding help, and workflow automation.',
  },
  {
    name: 'Cloud',
    badge: 'Portfolio & Admin Hub',
    desc: 'Central administration portal presenting remote IT support, data management, and digital operations.',
  },
];

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function isGenericDescription(desc: string): boolean {
  const lower = desc.toLowerCase();
  return (
    !lower ||
    lower.startsWith('official verified platform for ') ||
    lower.startsWith('verified online platform')
  );
}

/**
 * Builds clean, deduplicated, URL-free real-time digital project entries for the CV PDF.
 */
export function getRealTimeCvProjects(rawProjects?: RawCvProjectInput[]): CvProjectEntry[] {
  if (!Array.isArray(rawProjects) || rawProjects.length === 0) {
    return DEFAULT_CV_PROJECTS;
  }

  const deduped = new Map<string, CvProjectEntry>();

  for (const raw of rawProjects) {
    const fallbackTitle = stripWebsiteAddresses(raw.category || '') || 'Digital Platform';
    const rawName = stripWebsiteAddresses(raw.title || raw.name || '') || fallbackTitle;
    if (!rawName) continue;

    // Normalize generic "Verified Online Platform" / "PLATFORM" badge strings
    const cleanedCategory = stripWebsiteAddresses(raw.category || '');
    const cleanedBadge = stripWebsiteAddresses(raw.badge || '');
    let badgeLabel = cleanedCategory;
    if (!badgeLabel || /^verified online platform$/i.test(badgeLabel)) {
      badgeLabel =
        cleanedBadge && !/^platform$/i.test(cleanedBadge)
          ? cleanedBadge
          : 'Digital Platform';
    }

    let cleanedDesc = stripWebsiteAddresses(raw.description || '');
    if (!cleanedDesc) {
      cleanedDesc = `${rawName} — ${badgeLabel} managed and maintained as part of M R S's digital operations.`;
    }

    const key = normalizeKey(rawName);
    const candidate: CvProjectEntry = {
      name: rawName,
      badge: badgeLabel,
      desc: cleanedDesc,
    };

    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, candidate);
    } else {
      // Keep whichever has the richer, non-generic real description
      const existingGeneric = isGenericDescription(existing.desc);
      const candidateGeneric = isGenericDescription(candidate.desc);
      if (
        (existingGeneric && !candidateGeneric) ||
        (existingGeneric === candidateGeneric && candidate.desc.length > existing.desc.length)
      ) {
        deduped.set(key, candidate);
      }
    }
  }

  const list = Array.from(deduped.values());
  return list.length > 0 ? list : DEFAULT_CV_PROJECTS;
}
