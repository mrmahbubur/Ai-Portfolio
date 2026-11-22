import { BioProfile, Topic } from '../types';
import { buildMultilingualDirective } from '../utils/languages';

export const INITIAL_BIO_PROFILE: BioProfile = {
  personaName: 'Camellia',
  ownerName: 'M R S',
  displayName: 'M R S',
  gravatarUsername: 'mrxshahin',
  avatarUrl: '/mrs_profile_avatar.jpg',
  lastSyncedAt: new Date().toISOString(),
  roleTitle: 'IT Support Professional | Remote Admin & Documentation Specialist | Web Manager | Helping businesses run smoother, one ticket at a time',
  location: 'Global / Remote',
  socials: {
    email: 'mr216873@gmail.com',
    phone: '+8809611056361',
    gravatarUrl: 'https://gravatar.com/mrxshahin',
    githubUrl: 'https://github.com/mrmahbubur',
    blueskyUrl: 'https://bsky.app/profile/mrxshahin.bsky.social',
    linkedinUrl: 'https://www.linkedin.com/in/mrmahbubur',
    xUrl: 'https://x.com/Mrshahinx',
    wordpressUrl: 'https://mrxshahin.wordpress.com',
    contactForm: 'https://mrsadmin.blogspot.com/p/contact-us.html?m=1',
    calendlyUrl: 'https://calendly.com/mrxshahin',
  },
  verifiedAccounts: [
    { service_type: 'twitter', service_label: 'X', url: 'https://x.com/Mrshahinx' },
    { service_type: 'github', service_label: 'GitHub', url: 'https://github.com/mrmahbubur' },
    { service_type: 'bluesky', service_label: 'Bluesky', url: 'https://bsky.app/profile/mrxshahin.bsky.social' },
    { service_type: 'linkedin', service_label: 'LinkedIn', url: 'https://www.linkedin.com/in/mrmahbubur' },
    { service_type: 'wordpress', service_label: 'WordPress', url: 'https://mrxshahin.wordpress.com' },
  ],
  gravatarBio: `🖥️ **Available for Remote IT Support, Virtual Assistance & Administrative Work**

I help businesses, entrepreneurs, and individuals simplify their daily operations, solve technical problems, manage digital tasks, and stay productive — without the overhead of hiring a full-time employee.

With years of independent online work experience and a strong interest in technology, web solutions, and digital productivity, I can support a wide range of technical, administrative, and content-related tasks remotely.

### 💼 What I Can Do for You

✅ **IT Support & Technical Troubleshooting**
* Windows PC troubleshooting and basic system maintenance
* Android device support and app-related troubleshooting
* Browser, internet connectivity, Wi-Fi, and common software issues
* Software installation, configuration, and basic technical guidance
* Step-by-step technical documentation and user support

✅ **Virtual Assistance & Administrative Support**
* Data entry, data organization, and document formatting
* Microsoft Word, Excel, PowerPoint, and office productivity tasks
* Email management, professional correspondence, and inbox organization
* Online research, information collection, and data verification
* Form filling, job application assistance, and document preparation
* File organization, record keeping, and digital documentation
* Task coordination and routine administrative assistance

✅ **Website Management & Digital Content**
* Website content updates and basic website administration
* Blog post publishing and content formatting
* WordPress and Blogger content management
* SEO-friendly article writing and on-page content optimization
* Website testing, troubleshooting, and basic usability checks
* Web research, content planning, and topic development
* AI-assisted content creation, editing, and proofreading

✅ **Technical Writing & Documentation**
* Writing technology guides, tutorials, and how-to articles
* Creating step-by-step troubleshooting instructions
* Explaining websites, apps, and digital tools in simple language
* Preparing FAQs, user guides, and knowledge-base articles
* Rewriting, proofreading, and improving existing content
* Creating informative articles about software, websites, apps, and online services

✅ **Online Research & Digital Problem-Solving**
* Finding and evaluating online resources
* Researching websites, apps, and technology solutions
* Comparing digital tools and identifying practical alternatives
* Organizing research findings into clear, useful reports
* Testing online services and documenting user experiences
* Identifying workflow improvements and opportunities for automation

✅ **AI Tools & Productivity Assistance**
* Using AI tools to support research, writing, and content development
* Improving repetitive workflows with practical digital tools
* Assisting with AI-generated content review and refinement
* Developing detailed prompts for writing, research, and creative tasks
* Exploring no-code and low-code solutions for everyday business needs

✅ **Social Media & Online Business Support**
* Preparing social media posts, captions, and content descriptions
* Managing content schedules and organizing publishing materials
* Creating promotional copy for websites, apps, and digital services
* Assisting with basic online brand and content management
* Supporting digital projects through research, documentation, and coordination

### 🎯 Why Work With Me?

I value accuracy, reliability, clear communication, and independent problem-solving. I am comfortable working remotely, handling asynchronous tasks, and organizing my workload around agreed deadlines.

### 📌 My Background

* **Technical writing:** Writing technology guides and solutions since 2018
* **Remote work:** Years of independent online work experience
* **Work style:** Self-directed, detail-oriented, adaptable, and comfortable across time zones

### 🤝 Available for Freelance & Remote Opportunities

Whether you need a remote IT support assistant, virtual assistant, website content manager, technical writer, online researcher, or general digital operations support, I am open to discussing how I can help.`,
  certification: '360-Hour Certified Computer Specialist & MS Office Professional',
  aboutDetails: 'IT Support Professional & Web Manager with extensive experience in document management, computer system troubleshooting, remote administration, and digital platform management.',
  interests: [
    'Web Development',
    'Web3',
    'Ethical Hacking',
    'Social Sciences',
    'Remote Working',
  ],
  projects: [
    {
      id: 'proj-1-services',
      title: 'All Services',
      category: 'Services & IT Hub',
      description: 'Unified service portal showcasing M R S\'s remote IT support, virtual assistance, Microsoft 365 document workflows, web management, and digital solutions.',
      tags: ['IT Services', 'Remote Admin', 'Virtual Assistance', 'Consulting'],
      badge: 'ALL SERVICES',
      link: 'https://mrs-services.ai.studio/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrs-services.ai.studio%2F?w=640',
      speechNarrative: 'All Services is M R S\'s unified directory covering remote IT support, Microsoft Office document formatting, virtual assistance, and web operations.',
    },
    {
      id: 'proj-2-iptv-web',
      title: 'IPTV WEB',
      category: 'Live Streaming & Media Platform',
      description: 'Your World, One Screen. Stream 10,000+ live channels of Sports, Movies, Dramas, and News from anywhere with high-definition playback and a Premium ad-free tier.',
      tags: ['IPTV', 'Media Streaming', 'Live TV', '10,000+ Channels'],
      badge: 'LIVE WEB APP',
      link: 'https://shahin-iptv.ai.studio',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fshahin-iptv.ai.studio?w=640',
      speechNarrative: 'IPTV WEB is the flagship entertainment platform streaming over ten thousand live international channels across Sports, Movies, Dramas, and News.',
    },
    {
      id: 'proj-3-apps-store',
      title: 'Apps Store',
      category: 'Web & Android App Directory',
      description: 'Curated web and mobile applications directory built by M R S — offering direct access to lightweight utilities, streaming players, and productivity tools.',
      tags: ['Web Apps', 'Android APK', 'Software Hub', 'Utilities'],
      badge: 'APPS DIRECTORY',
      link: 'https://mrmahbubur.github.io/APPS-STORE/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FAPPS-STORE%2F?w=640',
      speechNarrative: 'Apps Store serves as a centralized directory for direct web utilities and Android software packages maintained by M R S.',
    },
    {
      id: 'proj-4-pcn',
      title: 'Private C N',
      category: 'Privacy & Secure Communications',
      description: 'Everything is Private And Safe — privacy-first communication and confidential digital workspace platform built with strict data security safeguards.',
      tags: ['Privacy', 'Encrypted', 'Confidential', 'Security'],
      badge: 'PRIVATE & SAFE',
      link: 'https://mrs-pcn.ai.studio/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrs-pcn.ai.studio%2F?w=640',
      speechNarrative: 'Private C N provides a privacy-first communications and confidential workspace environment where everything stays private and protected.',
    },
    {
      id: 'proj-5-shop',
      title: 'Camellia Shop',
      category: 'Global E-Commerce Storefront',
      description: 'Global E-commerce Site, For making life easier — curated online shopping platform offering everyday essentials, accessories, and trending goods with streamlined checkout.',
      tags: ['E-Commerce', 'Global Store', 'Curated Goods', 'Online Shopping'],
      badge: 'E-COMMERCE',
      link: 'https://mrmahbubur.github.io/Camellia-Shop/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FCamellia-Shop%2F?w=640',
      speechNarrative: 'Camellia Shop is M R S\'s global e-commerce storefront designed to make everyday shopping simpler with curated essentials and accessories.',
    },
    {
      id: 'proj-6-charity',
      title: 'Charity Project',
      category: 'Humanitarian Non-Profit',
      description: 'A Future Project Built on Compassion. Dedicated to transforming lives through healthcare, education, shelter, and empowerment for communities in need.',
      tags: ['Non-Profit', 'Healthcare', 'Education', 'Shelter Support'],
      badge: 'FOUNDATION',
      link: 'https://mrmahbubur.github.io/Charity-Foundation/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FCharity-Foundation%2F?w=640',
      speechNarrative: 'Charity Project is a compassionate humanitarian foundation dedicated to healthcare, education, shelter, and empowerment for communities in need.',
    },
    {
      id: 'proj-7-blogger',
      title: 'BLOGGER',
      category: 'Tech Blog',
      description: 'Practical fixes and step-by-step guides for everyday tech problems — Windows, Android, WiFi, browsers, and more. Clear solutions with step-by-step guidance.',
      tags: ['Technical Writing', 'IT Support', 'Guides', 'Troubleshooting'],
      badge: 'TECH BLOG',
      link: 'https://mrxshahin.blogspot.com/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrxshahin.blogspot.com%2F?w=640',
      speechNarrative: 'BLOGGER is M R S\'s long-running technology blog since 2018, offering practical fixes for Windows, Android, Wi-Fi, and browsers.',
    },
    {
      id: 'proj-8-camellia-ai',
      title: 'Camellia Ai',
      category: 'Interactive AI Assistant Platform',
      description: 'Dedicated interactive conversational AI workspace featuring Camellia — providing multilingual voice guidance, coding support, research, and workflow assistance.',
      tags: ['Artificial Intelligence', 'Voice Concierge', 'Multilingual', 'Automation'],
      badge: 'CAMELLIA AI',
      link: 'https://mrmahbubur.github.io/Camellia-Ai/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FCamellia-Ai%2F?w=640',
      speechNarrative: 'Camellia Ai is the dedicated interactive AI platform powered by Camellia, offering coding, research, and multilingual assistance.',
    },
    {
      id: 'proj-9-cloud',
      title: 'Cloud',
      category: 'Portfolio & Admin Hub',
      description: 'M R S offers IT support, virtual assistance, data entry, web management, AI solutions, technical writing, CV design, and digital operations.',
      tags: ['Web Hub', 'IT Support', 'Virtual Assistance', 'Digital Ops'],
      badge: 'CENTRAL HUB',
      link: 'https://mrmahbubur.github.io/Admin/',
      customThumbnail: 'https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FAdmin%2F?w=640',
      speechNarrative: 'Cloud is the central administration and client portal presenting M R S\'s IT support, data management, and digital operations.',
    },
  ],
  skillsList: [
    {
      category: 'IT Support & Administration',
      skills: ['System Troubleshooting', 'Microsoft 365 & Office Suite', 'Document Management', 'Professional Correspondence', 'User Hardware & Network Diagnostics'],
    },
    {
      category: 'Web & Digital Management',
      skills: ['Blogspot & WordPress CMS', 'Web Architecture', 'Domain & DNS Management', 'SEO & Analytics', 'Content Strategy'],
    },
    {
      category: 'Digital Operations & Interactive Systems',
      skills: ['Digital Interactive Concierge Systems', 'Workflow Automation', 'Autonomous Systems Management', 'E-Commerce Operations', 'Remote Team Collaboration'],
    },
    {
      category: 'Core Competencies & Digital Skills',
      skills: ['Remote Work Autonomy', 'Data Organization', 'Technical Writing', 'Client Communication'],
    },
  ],
  headerImage: 'https://1.gravatar.com/userimage/140624186/eb80b95de8da05aca3d1b6e47836f736?size=1024',
  backgroundColor: 'linear-gradient(138deg, rgba(15, 44, 133, 1) 0%, rgba(142, 48, 112) 55%, rgba(71, 34, 44, 1) 100%)',
  cryptoWallets: [
    { type: 'BTC', address: 'bc1pm7nkt7hrl8q9uhunu0y92nsrmjsprqet0rv7pvjug5lvksvngc3srjj9dr' },
    { type: 'LTC', address: 'ltc1qx32xcdc625w25kt6hdn2e9jkavau65ss7h7y5a' },
  ],
  education: [
    {
      degree: 'Bachelor of Social Science',
      institution: 'Sylhet Government College, Sylhet',
      period: 'Jan 2021 – Present',
    },
    {
      degree: 'Higher Secondary Certificate (HSC)',
      institution: 'Tajpur Degree College, Sylhet',
      period: 'Jan 2019 – Dec 2020',
      gpa: 'GPA: 3.33',
    },
    {
      degree: 'Secondary School Certificate (SSC)',
      institution: 'Mongol Chondi Nishikanto High School, Sylhet',
      period: 'Jan 2017 – Dec 2018',
      gpa: 'GPA: 3.39',
    },
  ],
  personalDetails: {
    fullName: 'MAHBUBUR RAHMAN SHAHIN',
    dateOfBirth: '23/07/2002',
    nationality: 'Bangladeshi',
    religion: 'Islam',
    address: 'Bharera, Tajpur-3123, Osmani Nagar, Sylhet',
  },
  languages: [
    { name: 'English', level: 'Conversational' },
    { name: 'Hindi', level: 'Basic' },
    { name: 'Bengali', level: 'Native' },
  ],
  coursesCertifications: [
    'Basic Computer Course (360 Hrs)',
    'Android Hardware Repair',
    'IELTS — Band 5.5',
  ],
  whatICanHelpWith: [
    'IT Support & Technical Troubleshooting — Windows PC, Android, browsers & Wi-Fi',
    'Virtual Assistance & Administrative Support — MS 365, email, data & applications',
    'Website Management & Digital Content — WordPress, Blogger CMS, SEO & QA',
    'Technical Writing & Documentation — Troubleshooting guides, FAQs & editing',
    'Online Research & Digital Problem-Solving — Resource evaluation, testing & reports',
    'AI Tools & Productivity Assistance — Prompt workflows, review & automation',
    'Social Media & Online Business Support — Content schedules, copy & coordination',
  ],
  systemInstruction: `You are Camellia (M R S Assistant), a calm, articulate, and dedicated personal concierge for M R S on his official portfolio website.

STRICT OWNER IDENTITY RULES:
- The site owner's name is strictly "M R S".
- DO NOT collect, extract, or assume any other name from website details, Gravatar, or external sources.
- You are Camellia, M R S Assistant — his guide and representative — a separate identity from him. Always refer to him in the third person ("he", "his work", "M R S") and to yourself as Camellia (M R S Assistant). Never conflate his name with your own.

VOICE & TONE DIRECTIVE:
- Speak in a calm, gentle, peaceful, and relaxed manner with your signature Claude AI female voice.
- Speak with a measured, tranquil cadence and clear, polite phrasing. Never sound rushed, aggressive, or overly loud.

PROFILE OVERVIEW:
- Name: M R S
- Title: IT Support Professional | Web Manager | Digital Entrepreneur | Content Creator
- Background: IT support & administrative professional; expertise in Microsoft Office, document management, professional correspondence, technical writing since 2018, remote independent work.
- Certificates & Academic Education Policy: Certificates and academic education details are intentionally kept out of the public website and preserved inside the downloadable Executive CV (PDF). Direct visitors asking for them to the Download Executive CV (PDF) bar on the page.
- Interests: Web Development, Web3, Ethical Hacking, Social Sciences, Remote Working.
- Contact: email (mr216873@gmail.com), Calendly link, LinkedIn, GitHub, X, Bluesky, WordPress.
- Platforms: All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai, Cloud.`,
};

export const QUICK_TOPICS: Topic[] = [
  {
    id: 'tour',
    title: 'Guided Tour',
    subtitle: 'Narrated Portfolio Walkthrough',
    badge: 'Guided Tour',
    iconName: 'Sparkles',
    prompt: 'Start the complete guided tour: introduce yourself calmly, walk through M R S’s bio, highlight his verified platforms, and open the floor for questions.',
    color: 'gold',
  },
  {
    id: 'about',
    title: 'About M R S',
    subtitle: 'Gravatar Bio & IT Career',
    badge: 'Biography',
    iconName: 'User',
    prompt: 'Tell me about M R S, his background as an IT support professional, virtual assistance, technical writing since 2018, and remote career.',
    color: 'emerald',
  },
  {
    id: 'projects',
    title: 'All Live Platforms',
    subtitle: 'Services, IPTV, Apps, Shop, Charity & AI',
    badge: 'Portfolio',
    iconName: 'Layers',
    prompt: 'Please walk me through M R S’s live Gravatar platforms including All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai, Cloud, and Ai Portfolio.',
    color: 'gold',
  },
  {
    id: 'skills',
    title: 'Interests & Skills',
    subtitle: 'Web3, Ethical Hacking & IT',
    badge: 'Expertise',
    iconName: 'Cpu',
    prompt: 'What are M R S’s key technical interests (Web Development, Web3, Ethical Hacking, Social Sciences, Remote Working) and IT proficiencies?',
    color: 'cyan',
  },
  {
    id: 'contact',
    title: 'Contact & Connect',
    subtitle: 'Email, Calendly & Socials',
    badge: 'Contact Desk',
    iconName: 'Mail',
    prompt: 'How can visitors contact M R S, book via Calendly, or connect on LinkedIn, GitHub, X, WordPress, and Bluesky?',
    color: 'gold',
  },
];

export function buildSystemInstructionFromProfile(profile: BioProfile, languageCode: string = 'en-US'): string {
  const projectsSummary = profile.projects
    .map((p) => `- ${p.title} (${p.category}): ${p.description} (URL: ${p.link})`)
    .join('\n');

  const skillsSummary = profile.skillsList
    .map((c) => `- ${c.category}: ${c.skills.join(', ')}`)
    .join('\n');

  const langDirective = buildMultilingualDirective(languageCode);

  return `You are ${profile.personaName || 'Camellia'}, M R S Assistant — an articulate, highly versatile, and deeply helpful AI assistant, equipped with full general intelligence like Claude and ChatGPT, as well as specialized knowledge of M R S's portfolio and IT services.

CORE BEHAVIOR & CONVERSATIONAL STYLE:
1. Speak in the signature conversational style of Claude AI: thoughtful, articulate, warm, nuanced, intellectually clear, and engaging.
2. VERSATILE GENERAL ASSISTANT (LIKE CHATGPT & CLAUDE):
   - You are ready and eager to help visitors with ANY question, task, or challenge:
     * Coding & Software: Write scripts, debug errors, explain code, design solutions in JavaScript, TypeScript, Python, HTML/CSS, SQL, Bash, Go, etc.
     * Writing & Drafting: Draft emails, craft cover letters, format documents, proofread text, write summaries, and generate ideas.
     * IT Support & Diagnostics: Diagnose Windows, Android, Linux, network, browser, or Microsoft 365 issues.
     * Science, Math & Reasoning: Calculations, step-by-step problem solving, explaining academic and technical concepts.
     * Everyday Topics & Advice: Brainstorming, productivity workflows, technology recommendations, general conversation.
   - When visitors ask for help with anything, jump in eagerly and provide a complete, clear, well-structured answer.
   - Proactively ask follow-ups when appropriate ("Would you like me to write the full code for this?", "Would you like me to adjust the tone of this draft?").
3. STRICT NON-REPETITION DIRECTIVE:
   - DO NOT repeat introductory bio, persona credentials, or "I am Camellia..." after the first initial greeting.
   - Jump directly into answering the user's specific question or request naturally, warmly, and clearly without unnecessary preamble or repetitive disclaimers.
   - Only recite M R S's credentials or background when the visitor specifically asks about M R S, his background, his role, or his contact information.
4. IDENTITY SPECIFICATIONS:
   - The site owner's name is strictly "M R S" (always pronounced as separate letters "M R S").
   - You are Camellia, M R S Assistant — his dedicated AI guide — a distinct identity. Always refer to M R S in the third person ("he", "his work", "M R S").
5. COMPREHENSIVE M R S KNOWLEDGE BASE:
   - Full Name / Title: M R S — IT Support Professional | Remote Admin & Documentation Specialist | Web Manager
   - Expertise: Microsoft 365 & Office workflows, document formatting, client correspondence, and remote system administration since 2018.
   - Certificates & Academic Education: Intentionally kept off the public website and preserved inside M R S's downloadable Executive CV (PDF) below the contact section. If a visitor asks for certifications or academic history, kindly direct them to download the Executive CV (PDF).
   - Core Technical Interests: Web Development, Web3, Cybersecurity & IT Defense, Social Sciences, Remote Working.
   - Featured Projects & Platforms:
${projectsSummary}
   - Featured Platform & Projects Hub Link:
     * URL: https://mrxshahin.ai.studio/
     * Interactive multimodal AI concierge, project index, and platform showcase. Included in all project update emails.
   - Subscriber Update Emails (Transparency & Standards):
     * What is included: (1) Concise project briefing, (2) Audio note transcript, (3) Architecture & stack details, (4) Direct 1-click launch link on this site, (5) Featured Platform & Projects Hub link (https://mrxshahin.ai.studio/), (6) 100% Free & open access guarantee, (7) Verified contact (mr216873@gmail.com) and 1-click unsubscribe.
     * What is NOT included: Zero third-party ads, zero promotional sponsorships, no paywalls, and no tracking abuses.
     * Live Preview: Visitors can preview the update email live anytime in the Sign Up / Sign In modal under the "Preview Update Email" tab.
   - Technical Proficiencies:
${skillsSummary}
   - Verified Contact & Socials:
     * Direct Inquiries / Email: ${profile.socials.email} (routes directly to mr216873@gmail.com)
     * Gravatar: ${profile.socials.gravatarUrl}
     * Calendly: ${profile.socials.calendlyUrl || 'https://calendly.com/mrxshahin'}
     * Verified Accounts: X (@Mrshahinx), LinkedIn, GitHub, Bluesky, WordPress, Goodreads.
6. CONTINUOUS MULTI-TURN CAPABILITY:
   - Maintain context across long, rich multi-turn dialogues with visitors on any topic without artificial limits.
${langDirective}`;
}
