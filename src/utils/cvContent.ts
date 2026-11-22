import { getRealTimeCvProjects, RawCvProjectInput, stripWebsiteAddresses } from './cvProjects.ts';

export interface WorkExperienceEntry {
  role: string;
  period: string;
  location: string;
  highlights: string[];
}

export interface LiveCvContent {
  roleLinesSpaced: string[];
  roleLinesPlain: string[];
  coreSkills: string[];
  techStack: string[];
  interests: string[];
  profileParagraphs: string[];
  whatICanHelpWith: string[];
  availabilityNote: string;
  workExperience: WorkExperienceEntry[];
  commitmentNote: string;
}

export interface LiveCvProfileInput {
  roleTitle?: string;
  location?: string;
  gravatarBio?: string;
  skills?: string[];
  interests?: string[];
  whatICanHelpWith?: string[];
  projects?: RawCvProjectInput[];
}

const DEFAULT_ROLE_PLAIN = [
  'IT SUPPORT PROFESSIONAL',
  'REMOTE ADMIN & DOCS SPECIALIST',
  'WEB MANAGER',
];

const DEFAULT_CORE_SKILLS = [
  'IT Support & Technical Troubleshooting',
  'Virtual Assistance & MS Office 365',
  'Website Management & Digital Content',
  'Technical Writing & Documentation',
  'Online Research & Digital Problem-Solving',
  'AI Tools & Productivity Assistance',
  'Social Media & Online Business Support',
];

const DEFAULT_TECH_STACK = [
  'Windows PC, Android OS & Wi-Fi Diagnostics',
  'Microsoft 365 (Word, Excel, PowerPoint)',
  'WordPress, Blogger CMS & SEO Optimization',
  'AI Workflow, Prompting & No-Code Tools',
  'Cloud Portals, Git, GitHub & Web Operations',
];

const DEFAULT_INTERESTS = [
  'Web Development',
  'Web3',
  'Ethical Hacking',
  'Social Sciences',
  'Remote Working',
];

const DEFAULT_HELP_ITEMS = [
  'IT Support & Troubleshooting — Windows PC, Android, browsers & Wi-Fi',
  'Virtual Assistance & Admin — MS Office 365, email, data & applications',
  'Website Management & Content — WordPress, Blogger CMS, SEO & QA',
  'Technical Writing & Docs — Step-by-step guides, FAQs & proofreading',
  'Online Research & Problem-Solving — Tool comparison, testing & reports',
  'AI Tools & Productivity — Workflow automation, prompts & content review',
  'Social Media & Business Support — Publishing schedules & brand copy',
];

const STALE_DEFAULT_SKILLS_SIGNATURE = 'IT Troubleshooting (Windows, Android, browsers, WiFi)';
const STALE_DEFAULT_HELP_SIGNATURE = 'Document management & formatting';

function toLetterSpaced(label: string): string {
  return label
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((word) => word.split('').join(' '))
    .join('   ');
}

interface BioCategorySection {
  title: string;
  bullets: string[];
}

function parseGravatarBioCategories(bio: string): BioCategorySection[] {
  if (!bio || typeof bio !== 'string') return [];

  const categories: BioCategorySection[] = [];
  // Normalize inline "**Heading*** bullet" sequences that sometimes come from scraped Gravatar HTML/markdown
  const normalized = bio
    .replace(/✅\s*\*\*/g, '\n✅ **')
    .replace(/###\s+/g, '\n### ')
    .replace(/\*\s+(?=[A-Z])/g, '\n* ');

  const lines = normalized.split(/\r?\n/);
  let current: BioCategorySection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const headingMatch = line.match(/^(?:✅\s*)?\*\*([^*]+)\*\*\s*$/);
    if (headingMatch) {
      const title = stripWebsiteAddresses(headingMatch[1]).trim();
      if (title && !/^(Certified|Technical writing|Remote work|Work style):?$/i.test(title)) {
        current = { title, bullets: [] };
        categories.push(current);
      } else {
        current = null;
      }
      continue;
    }

    if (line.startsWith('###')) {
      current = null;
      continue;
    }

    if (current && (line.startsWith('*') || line.startsWith('-'))) {
      const bullet = stripWebsiteAddresses(line.replace(/^[*-\s]+/, '')).trim();
      if (bullet) {
        current.bullets.push(bullet);
      }
    }
  }

  return categories;
}

function summarizeBulletList(title: string, bullets: string[]): string {
  if (bullets.length === 0) return title;
  // Compact concise executive summary mapping for known categories or first keywords
  const lower = title.toLowerCase();
  if (lower.includes('it support')) return `${title} — Windows PC, Android, browsers & Wi-Fi`;
  if (lower.includes('virtual assistance')) return `${title} — MS 365, email, data & applications`;
  if (lower.includes('website management')) return `${title} — WordPress, Blogger CMS, SEO & QA`;
  if (lower.includes('technical writing')) return `${title} — Troubleshooting guides, FAQs & editing`;
  if (lower.includes('online research')) return `${title} — Resource evaluation, testing & reports`;
  if (lower.includes('ai tools')) return `${title} — Prompt workflows, review & automation`;
  if (lower.includes('social media')) return `${title} — Content schedules, copy & coordination`;

  const firstShort = bullets[0].split(',')[0].slice(0, 44).trim();
  return firstShort ? `${title} — ${firstShort}` : title;
}

function buildLiveRoleLines(roleTitle?: string): { spaced: string[]; plain: string[] } {
  if (!roleTitle || !roleTitle.trim()) {
    return {
      plain: DEFAULT_ROLE_PLAIN,
      spaced: DEFAULT_ROLE_PLAIN.map(toLetterSpaced),
    };
  }

  const segments = roleTitle
    .split('|')
    .map((s) => stripWebsiteAddresses(s).trim())
    .filter((s) => s.length > 0 && s.length <= 44);

  const selected = (segments.length >= 2 ? segments.slice(0, 3) : DEFAULT_ROLE_PLAIN).map((seg) => {
    const upper = seg.toUpperCase();
    // Keep within narrow sidebar width
    if (upper === 'REMOTE ADMIN & DOCUMENTATION SPECIALIST') {
      return 'REMOTE ADMIN & DOCS SPECIALIST';
    }
    return upper;
  });

  return {
    plain: selected,
    spaced: selected.map(toLetterSpaced),
  };
}

/**
 * Builds up-to-date, URL-free executive CV content (excluding Contact, Personal Details,
 * Education, and Certifications which remain preserved by user instruction).
 */
export function buildRealTimeCvContent(profile: LiveCvProfileInput): LiveCvContent {
  const roles = buildLiveRoleLines(profile.roleTitle);
  const bioCategories = parseGravatarBioCategories(profile.gravatarBio || '');
  const liveProjects = getRealTimeCvProjects(profile.projects);

  // Core Skills: prefer live Gravatar categories if available, or non-stale explicit skills
  const hasCustomSkills =
    Array.isArray(profile.skills) &&
    profile.skills.length > 0 &&
    !profile.skills.includes(STALE_DEFAULT_SKILLS_SIGNATURE);

  const coreSkills = hasCustomSkills
    ? profile.skills!.slice(0, 7)
    : bioCategories.length >= 4
    ? bioCategories.slice(0, 7).map((c) => {
        if (c.title === 'Virtual Assistance & Administrative Support') {
          return 'Virtual Assistance & MS Office 365';
        }
        return c.title;
      })
    : DEFAULT_CORE_SKILLS;

  // Interests: live Gravatar interests first
  const interests =
    Array.isArray(profile.interests) && profile.interests.length > 0
      ? profile.interests.map((i) => stripWebsiteAddresses(String(i))).filter(Boolean).slice(0, 6)
      : DEFAULT_INTERESTS;

  // What I Can Help With: live Gravatar capability categories with concise detail
  const hasCustomHelp =
    Array.isArray(profile.whatICanHelpWith) &&
    profile.whatICanHelpWith.length > 0 &&
    !profile.whatICanHelpWith.includes(STALE_DEFAULT_HELP_SIGNATURE);

  const whatICanHelpWith = hasCustomHelp
    ? profile.whatICanHelpWith!.map((h) => stripWebsiteAddresses(h)).filter(Boolean).slice(0, 7)
    : bioCategories.length >= 4
    ? bioCategories.slice(0, 7).map((c) => summarizeBulletList(c.title, c.bullets))
    : DEFAULT_HELP_ITEMS;

  // Dynamic ecosystem names (URL-free) from live synchronized projects
  const ecosystemNames = liveProjects.map((p) => p.name).slice(0, 6);
  const ecosystemPhrase =
    ecosystemNames.length > 0
      ? ecosystemNames.join(', ') + (liveProjects.length > 6 ? ', and allied web portals' : '')
      : 'IT services, IPTV streaming, app directories, e-commerce, interactive AI, and humanitarian initiatives';

  const hasBioAi = (profile.gravatarBio || '').toLowerCase().includes('ai tools');
  const hasBioResearch = (profile.gravatarBio || '').toLowerCase().includes('online research');

  const profileParagraphs = [
    'IT support, virtual assistance, and administrative professional helping businesses and entrepreneurs simplify daily operations, resolve Windows, Android, Wi-Fi, and software issues, and manage Microsoft Office 365 & documentation workflows — backed by a 360-hour certified computer course.',
    `Built on years of independent remote work across global platforms${hasBioResearch ? ', combining online research, technical writing since 2018,' : ', combining technical writing since 2018'}${hasBioAi ? ' and AI productivity tools' : ''} to deliver accurate, organized results asynchronously across time zones.`,
    `Actively manages a live multi-platform digital ecosystem (${ecosystemPhrase}) — uniting web administration, CMS publishing, automated workflows, and digital community solutions.`,
  ];

  const availabilityNote = (profile.gravatarBio || '').toLowerCase().includes('project-based')
    ? 'Available for ongoing remote support, freelance & clearly defined project work.'
    : 'Open to remote contract, freelance, and part-time opportunities.';

  const locationLabel =
    profile.location && profile.location.trim() && profile.location !== 'Global / Remote'
      ? `${profile.location.trim()} · Remote / Multi-Timezone`
      : 'Global / Remote (Asynchronous & Multi-Timezone)';

  const workExperience: WorkExperienceEntry[] = [
    {
      role: 'Independent IT Support, Virtual Assistant & Web Manager',
      period: '2018 – Present',
      location: locationLabel,
      highlights: [
        'Delivering remote IT troubleshooting (Windows PC, Android, browsers, Wi-Fi), Microsoft 365 productivity, inbox management, and high-precision document preparation.',
        `Operating ${liveProjects.length} active digital platforms across IT services, live streaming media, app directories, e-commerce, interactive AI workspaces, CMS blogs, and non-profit outreach.`,
        'Authoring step-by-step tech troubleshooting guides since 2018 while integrating AI prompt workflows, tool benchmarking, and online research for reliable client outcomes.',
      ],
    },
  ];

  const commitmentNote =
    'Committed to accuracy, reliability, clear asynchronous communication, and independent problem-solving — delivering organized remote IT support, documentation, AI-assisted research, and digital operations with complete confidentiality.';

  return {
    roleLinesSpaced: roles.spaced,
    roleLinesPlain: roles.plain,
    coreSkills,
    techStack: DEFAULT_TECH_STACK,
    interests: interests.length > 0 ? interests : DEFAULT_INTERESTS,
    profileParagraphs,
    whatICanHelpWith,
    availabilityNote,
    workExperience,
    commitmentNote,
  };
}
