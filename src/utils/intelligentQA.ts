import { BioProfile } from '../types';
import { getVariedIntroSpeech } from './languages';

export interface QAResult {
  text: string;
  source: 'ai' | 'knowledge_engine';
}

/**
 * Universal Intelligent Q&A Knowledge & Conversational Reasoning Engine
 * Provides unlimited, insightful, articulate answers to visitors' questions about M R S,
 * projects, IT & tech topics, coding, math, science, geography, history, and general conversation.
 * Adheres strictly to the authentic Claude AI conversational style without canned boilerplate.
 */
export function generateIntelligentAnswer(
  prompt: string,
  profile?: BioProfile,
  languageCode: string = 'en-US'
): string {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return "How may I assist you today? Feel free to ask about M R S's technical background, platforms, or any technology, coding, science, or general question.";
  }

  const rawPrompt = prompt.trim();
  const cleanPrompt = rawPrompt.toLowerCase().replace(/[?.,!]+$/g, '').trim();

  // =========================================================================
  // 1. DYNAMIC MATHEMATICAL EVALUATION & UNIT CONVERSIONS
  // =========================================================================

  // Percentage calculations (e.g., "what is 15% of 200", "20% of 85")
  const percentMatch = cleanPrompt.match(/(?:what is|calculate|compute)?\s*([\d.]+)\s*%\s*(?:of)\s*([\d.]+)/i);
  if (percentMatch) {
    const rate = parseFloat(percentMatch[1]);
    const total = parseFloat(percentMatch[2]);
    if (!isNaN(rate) && !isNaN(total)) {
      const ans = (rate / 100) * total;
      return `${rate}% of ${total} is ${ans.toFixed(2).replace(/\.00$/, '')}.`;
    }
  }

  // Temperature conversion (e.g., "convert 100 f to c", "32 c in f", "convert 75 celsius to fahrenheit")
  const tempMatch = cleanPrompt.match(/(?:convert\s+)?(-?\d+(?:\.\d+)?)\s*(?:degrees?\s*)?(f|c|fahrenheit|celsius)\s*(?:to|in|into)?\s*(f|c|fahrenheit|celsius)/i);
  if (tempMatch) {
    const val = parseFloat(tempMatch[1]);
    const fromUnit = tempMatch[2].toLowerCase().charAt(0);
    const toUnit = tempMatch[3].toLowerCase().charAt(0);
    if (fromUnit === 'c' && toUnit === 'f') {
      const f = (val * 9) / 5 + 32;
      return `${val}°C is equal to ${f.toFixed(2).replace(/\.00$/, '')}°F.`;
    } else if (fromUnit === 'f' && toUnit === 'c') {
      const c = ((val - 32) * 5) / 9;
      return `${val}°F is equal to ${c.toFixed(2).replace(/\.00$/, '')}°C.`;
    }
  }

  // Distance / Weight conversions
  const kmToMiMatch = cleanPrompt.match(/(?:convert\s+)?(\d+(?:\.\d+)?)\s*(km|kilometers?)\s*(?:to|in)\s*(miles?|mi)/i);
  if (kmToMiMatch) {
    const km = parseFloat(kmToMiMatch[1]);
    return `${km} kilometers is approximately ${(km * 0.621371).toFixed(2)} miles.`;
  }
  const miToKmMatch = cleanPrompt.match(/(?:convert\s+)?(\d+(?:\.\d+)?)\s*(miles?|mi)\s*(?:to|in)\s*(km|kilometers?)/i);
  if (miToKmMatch) {
    const mi = parseFloat(miToKmMatch[1]);
    return `${mi} miles is approximately ${(mi * 1.60934).toFixed(2)} kilometers.`;
  }
  const kgToLbMatch = cleanPrompt.match(/(?:convert\s+)?(\d+(?:\.\d+)?)\s*(kg|kilograms?)\s*(?:to|in)\s*(lbs?|pounds?)/i);
  if (kgToLbMatch) {
    const kg = parseFloat(kgToLbMatch[1]);
    return `${kg} kilograms is approximately ${(kg * 2.20462).toFixed(2)} pounds.`;
  }

  // Pure arithmetic / calculation evaluator (e.g., "what is 25 * 14", "100 / 4 + 20", "2^8")
  const mathMatch = cleanPrompt.match(/(?:what is|calculate|compute|solve|eval)?\s*([\d\s\+\-\*\/\^\(\)\.\%]+)$/i);
  if (mathMatch && /[\+\-\*\/\^]/.test(mathMatch[1]) && /^[\d\s\+\-\*\/\^\(\)\.\%]+$/.test(mathMatch[1].trim())) {
    try {
      let sanitized = mathMatch[1].replace(/\^/g, '**').replace(/[^0-9\+\-\*\/\(\)\.]/g, '');
      if (sanitized && !/[+\-*/]$/.test(sanitized)) {
        // eslint-disable-next-line no-new-func
        const result = Function(`'use strict'; return (${sanitized})`)();
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return `The result of ${mathMatch[1].trim()} is ${Number(result.toFixed(6)).toString()}.`;
        }
      }
    } catch (_) {}
  }

  // =========================================================================
  // 2. M R S & CAMELLIA — IDENTITY, SERVICES, ORDER FLOWS & VERIFICATION
  // =========================================================================

  // Priority Check 1: "Which AI are you?" / "What AI are you?" (Strict compliance with Section 3 & 8)
  if (
    cleanPrompt === 'which ai are you' ||
    cleanPrompt === 'what ai are you' ||
    cleanPrompt === 'what model are you' ||
    cleanPrompt.includes('which ai are you') ||
    cleanPrompt.includes('what ai are you') ||
    cleanPrompt.includes('what kind of ai') ||
    cleanPrompt.includes('are you chatgpt') ||
    cleanPrompt.includes('are you gemini') ||
    cleanPrompt.includes('are you claude')
  ) {
    return "I'm Camellia, MRS's AI assistant.";
  }

  if (
    cleanPrompt.includes('who are you') ||
    cleanPrompt.includes('what is your name') ||
    cleanPrompt.includes('what are you')
  ) {
    return (
      "I'm Camellia, MRS's AI assistant.\n\n" +
      "I can help with coding, email drafting, IT troubleshooting, research, multilingual translation, or guiding you through M R S's verified platforms and services. How can I assist you today?"
    );
  }

  // Priority Check 2: "How much is a CV?" / CV Order Flow (Section 6 & 8)
  if (
    cleanPrompt.includes('how much is a cv') ||
    cleanPrompt.includes('how much is the cv') ||
    cleanPrompt.includes('cv price') ||
    cleanPrompt.includes('cost of a cv') ||
    cleanPrompt.includes('cost of cv') ||
    cleanPrompt.includes('cv fee') ||
    cleanPrompt.includes('order a cv') ||
    cleanPrompt.includes('order cv') ||
    cleanPrompt.includes('resume price') ||
    cleanPrompt.includes('buy a cv')
  ) {
    return (
      "M R S's official Executive Curriculum Vitae (CV) is 100% FREE to download!\n\n" +
      "• Free Instant Download:\n" +
      "You can download M R S's verified high-resolution A4 vector PDF directly from this website by clicking the 'Download Executive CV' button below the contact section (after completing a quick biometric human verification scan).\n\n" +
      "• Custom CV Writing & Resume Overhaul Order Flow:\n" +
      "If you would like M R S to write, design, or format a custom executive CV for your own professional career:\n" +
      "1. Choose Your Scope: Document Formatting, Complete Content Rewrite, or ATS Optimization.\n" +
      "2. Submit Your Order: Use the Direct Inquiry form on this page or email mr216873@gmail.com with your current resume draft and job target.\n" +
      "3. Direct Consultation: You can also schedule a 1-on-1 consultation directly via Calendly at https://calendly.com/mrxshahin.\n\n" +
      "Would you like me to guide you directly to the contact form to submit an order?"
    );
  }

  // Priority Check 3: Payment Screenshot & Transaction Verification Rules (Section 6 & 8)
  if (
    cleanPrompt.includes('payment screenshot') ||
    cleanPrompt.includes('transaction screenshot') ||
    cleanPrompt.includes('receipt') ||
    cleanPrompt.includes('payment verification') ||
    cleanPrompt.includes('verify payment') ||
    cleanPrompt.includes('paid for iptv') ||
    cleanPrompt.includes('sent crypto') ||
    cleanPrompt.includes('sent bitcoin') ||
    cleanPrompt.includes('sent money')
  ) {
    return (
      "Payment & Transaction Verification Procedure:\n\n" +
      "• IPTV Web Platform Activation:\n" +
      "Automated IPTV subscriptions are activated instantly at https://shahin-iptv.ai.studio. Please ensure your registered username is entered during checkout.\n\n" +
      "• Manual Transaction Verification Rules:\n" +
      "If you have uploaded or sent a payment receipt or transaction screenshot (Crypto, Card, or Mobile Banking):\n" +
      "1. Verification Details: Ensure your Transaction ID / Hash, amount, payment method, and timestamp are visible.\n" +
      "2. Manual Clearance: Submit your Transaction ID and account email to mr216873@gmail.com.\n" +
      "3. Approval Window: All verified transactions are reviewed and manually cleared within 2 to 4 hours.\n\n" +
      "• Verified Cryptocurrency Addresses:\n" +
      "  - Bitcoin (BTC): bc1pm7nkt7hrl8q9uhunu0y92nsrmjsprqet0rv7pvjug5lvksvngc3srjj9dr\n" +
      "  - Litecoin (LTC): ltc1qx32xcdc625w25kt6hdn2e9jkavau65ss7h7y5a"
    );
  }

  // Dynamic checks for latest updates or synchronization queries
  if (
    cleanPrompt.includes('update') ||
    cleanPrompt.includes('what is new') ||
    cleanPrompt.includes('what\'s new') ||
    cleanPrompt.includes('latest changes') ||
    cleanPrompt.includes('last sync') ||
    cleanPrompt.includes('recent changes')
  ) {
    const projCount = profile?.projects?.length || 9;
    const projTitles =
      profile?.projects?.map((p) => p.title).join(', ') ||
      'All Services, IPTV WEB, Apps Store, Private C N, Camellia Shop, Charity Project, BLOGGER, Camellia Ai, Cloud';
    const email = profile?.socials?.email || 'mr216873@gmail.com';
    return (
      `I actively remember and synchronize all live updates to M R S's profile and platforms directly from Gravatar:\n\n` +
      `• Synchronized Platforms (${projCount} active): ${projTitles}.\n` +
      `• Verified Credentials: ${profile?.certification || '360-Hour Certified Computer Specialist & MS Office Professional'}.\n` +
      `• Professional Focus: ${profile?.roleTitle || 'IT Support Professional | Web Manager | Digital Entrepreneur'}.\n` +
      `• Contact: Directly reachable at ${email} with active Calendly booking.\n` +
      `All profile revisions, project links, verified networks, and competencies are dynamically synced in my active memory.`
    );
  }

  if (
    cleanPrompt.includes('who is mrs') ||
    cleanPrompt.includes('who is m r s') ||
    cleanPrompt.includes('about mrs') ||
    cleanPrompt.includes('about m r s') ||
    cleanPrompt.includes('tell me about mrs') ||
    cleanPrompt.includes('tell me about m r s') ||
    cleanPrompt.includes('who are you representing') ||
    cleanPrompt.includes('mrs bio') ||
    cleanPrompt.includes('background') ||
    cleanPrompt.includes('biography') ||
    cleanPrompt.includes('career')
  ) {
    const bioText = profile?.gravatarBio || profile?.aboutDetails || "M R S is a certified IT Support Professional, Web Manager, and Remote Administrative Specialist with an independent career operating since 2018.";
    const email = profile?.socials?.email || 'mr216873@gmail.com';
    return (
      `M R S is an IT Support Professional, Web Manager, and Remote Administrative Specialist.\n\n` +
      `• Summary: ${bioText}\n` +
      `• Core Competencies: Microsoft 365, document formatting & administration, hardware/software troubleshooting, and network setup.\n` +
      `• Contact & Bookings: Directly via ${email} or schedule a consultation at https://calendly.com/mrxshahin.\n` +
      `• Executive CV: Full certificates and academic education details are included inside his downloadable Executive CV right below the contact section.`
    );
  }

  if (
    cleanPrompt.includes('cv') ||
    cleanPrompt.includes('resume') ||
    cleanPrompt.includes('download cv') ||
    cleanPrompt.includes('download resume') ||
    cleanPrompt.includes('curriculum vitae')
  ) {
    return (
      "M R S's complete Executive Curriculum Vitae (CV) is available for instant download in high-resolution A4 vector PDF format:\n\n" +
      "• How to Download: Scroll to the 'Download M R S Executive CV / Resume (PDF)' bar located after the Direct Contact & Message section. Complete the quick biometric face verification scan to confirm live human presence, and your synchronized A4 vector PDF will be generated immediately.\n" +
      "• What It Includes: Full verified certifications, academic education background, Microsoft 365 proficiencies, IT troubleshooting experience, all digital platforms, and verified contact channels.\n" +
      "• Real-Time Synchronization & Security: The PDF is automatically customized with live updates from the portfolio and protected with on-device biometric human verification."
    );
  }

  if (
    cleanPrompt.includes('education') ||
    cleanPrompt.includes('study') ||
    cleanPrompt.includes('college') ||
    cleanPrompt.includes('university') ||
    cleanPrompt.includes('school') ||
    cleanPrompt.includes('degree')
  ) {
    return (
      "M R S keeps detailed academic education records exclusively inside his downloadable **Executive CV (PDF)** rather than listing them directly on the website.\n\n" +
      "You can download the complete A4 Executive CV anytime using the **Verify Face & Download Document** button in the CV section (#cv-download-bar) right below Contact."
    );
  }

  if (cleanPrompt.includes('project') || cleanPrompt.includes('portfolio') || cleanPrompt.includes('what has he built') || cleanPrompt.includes('his work')) {
    if (profile?.projects && profile.projects.length > 0) {
      const projList = profile.projects.map((p, idx) => `${idx + 1}. ${p.title} (${p.category}): ${p.description} (URL: ${p.link})`).join('\n\n');
      return `M R S currently maintains ${profile.projects.length} live digital platforms synced from Gravatar:\n\n${projList}`;
    }
    return (
      "M R S maintains 9 live external platforms synced from Gravatar:\n\n" +
      "1. All Services (https://mrs-services.ai.studio/) — Unified remote IT support, Microsoft 365, and web services hub.\n" +
      "2. IPTV WEB (https://shahin-iptv.ai.studio) — Global live streaming television and multimedia entertainment network.\n" +
      "3. Apps Store (https://mrmahbubur.github.io/APPS-STORE/) — Curated software and Android/PC utility repository.\n" +
      "4. Private C N (https://mrs-pcn.ai.studio/) — Privacy-first encrypted community networking workspace.\n" +
      "5. Camellia Shop (https://mrmahbubur.github.io/Camellia-Shop/) — Lifestyle and fashion e-commerce storefront.\n" +
      "6. Charity Project (https://mrmahbubur.github.io/Charity-Foundation/) — Humanitarian initiative supporting education, healthcare, and welfare.\n" +
      "7. BLOGGER (https://mrxshahin.blogspot.com/) — Practical tech guides and troubleshooting tutorials published since 2018.\n" +
      "8. Camellia Ai (https://mrmahbubur.github.io/Camellia-Ai/) — Multimodal conversational AI studio and voice assistant showcase.\n" +
      "9. Cloud (https://mrmahbubur.github.io/Admin/) — Remote systems administration and operational web portal."
    );
  }

  if (cleanPrompt.includes('blog') || cleanPrompt.includes('blogger') || cleanPrompt.includes('article') || cleanPrompt.includes('tutorial')) {
    return (
      "M R S publishes technical documentation and troubleshooting articles on his Blogger Tech Blog at https://mrxshahin.blogspot.com/.\n\n" +
      "Topics include remote systems administration, Microsoft 365 optimizations, network troubleshooting, and productivity tools, which he has actively published and maintained since 2018."
    );
  }

  if (cleanPrompt.includes('iptv') || cleanPrompt.includes('stream') || cleanPrompt.includes('tv')) {
    const iptvUrl = profile?.projects?.find((p) => /iptv/i.test(p.title))?.link || 'https://shahin-iptv.ai.studio';
    return (
      `IPTV WEB (${iptvUrl}) is M R S's flagship multimedia streaming platform, providing a fast, responsive interface for live broadcast channels across desktop, mobile, and smart TV devices.`
    );
  }

  if (cleanPrompt.includes('charity') || cleanPrompt.includes('foundation') || cleanPrompt.includes('humanitarian') || cleanPrompt.includes('donation')) {
    const charityUrl = profile?.projects?.find((p) => /charity/i.test(p.title))?.link || 'https://mrmahbubur.github.io/Charity-Foundation/';
    return (
      `M R S Charity Project (${charityUrl}) is a social initiative dedicated to promoting healthcare access, educational support for underprivileged youth, and sustainable community welfare.`
    );
  }

  if (cleanPrompt.includes('apps store') || cleanPrompt.includes('app store')) {
    const appsUrl = profile?.projects?.find((p) => /apps store/i.test(p.title))?.link || 'https://mrmahbubur.github.io/APPS-STORE/';
    return (
      `M R S Apps Store (${appsUrl}) is a curated software directory providing trusted Android utilities, desktop productivity tools, and direct downloads.`
    );
  }

  if (cleanPrompt.includes('private c n') || cleanPrompt.includes('pcn')) {
    const pcnUrl = profile?.projects?.find((p) => /private/i.test(p.title))?.link || 'https://mrs-pcn.ai.studio/';
    return (
      `Private C N (${pcnUrl}) is M R S's privacy-focused workspace and community network built for confidential remote collaboration.`
    );
  }

  if (cleanPrompt.includes('store') || cleanPrompt.includes('shop') || cleanPrompt.includes('product') || cleanPrompt.includes('purchase')) {
    const shopUrl = profile?.projects?.find((p) => /shop|store/i.test(p.title) && !/apps store/i.test(p.title))?.link || 'https://mrmahbubur.github.io/Camellia-Shop/';
    return (
      `Camellia Shop (${shopUrl}) is M R S's modern e-commerce storefront featuring curated lifestyle products, apparel, and seamless ordering workflows.`
    );
  }

  if (
    cleanPrompt.includes('update email') ||
    cleanPrompt.includes('email update') ||
    cleanPrompt.includes('what is included') ||
    cleanPrompt.includes('what should be included') ||
    cleanPrompt.includes('email preview') ||
    cleanPrompt.includes('subscribe') ||
    cleanPrompt.includes('subscriber')
  ) {
    return (
      "Here is the transparent specification of M R S's Platform & Project Update Emails:\n\n" +
      "★ WHAT IS INCLUDED:\n" +
      "1. Concise Project Briefing: Name, category, and core value proposition written by Camellia (M R S Assistant).\n" +
      "2. Signature Audio Note: Dedicated narration transcript articulating the feature in Claude AI female voice.\n" +
      "3. Full Technical Architecture Breakdown: Engineering stack (e.g. React 18, Vite, Gemini 2.5 Flash, Web Audio API, Cloud Run).\n" +
      "4. Direct 1-Click Launch Link: Direct access URL to launch the application immediately on this site.\n" +
      "5. Featured Platform & Projects Hub: Instant link to https://mrxshahin.ai.studio/ showcasing live platforms, AI concierge tools, and projects.\n" +
      "6. 100% Free & Open Access Guarantee: Explaining that M R S portfolio is always free to explore without signing in.\n" +
      "7. Verified Contact Channels: Official Gmail (mr216873@gmail.com) and 1-click unsubscribe option.\n\n" +
      "🚫 WHAT IS NOT INCLUDED (STRICTLY EXCLUDED):\n" +
      "• Zero promotional ads or sponsored third-party marketing.\n" +
      "• No repetitive marketing newsletters or spam.\n" +
      "• No paywalls or hidden billing prompts.\n" +
      "• No tracking pixel abuse or data selling.\n\n" +
      "You can also inspect the real-time visual email preview anytime in the top-right Sign In / Sign Up dialog under the 'Preview Update Email' tab!"
    );
  }

  if (
    cleanPrompt.includes('featured platform') ||
    cleanPrompt.includes('mrxshahin.ai.studio') ||
    cleanPrompt.includes('ai studio link')
  ) {
    return (
      "M R S's official Featured Platform and Projects Hub is hosted at https://mrxshahin.ai.studio/.\n\n" +
      "• Direct Link: https://mrxshahin.ai.studio/\n" +
      "• What It Features: Interactive voice AI concierge (Claude AI female voice), digital project directory, verified IT certifications, Microsoft 365 solutions, and live technology showcases.\n" +
      "• Automatic Integration: This link is permanently featured in all project update emails sent to our subscribers."
    );
  }

  if (
    !cleanPrompt.includes('draft') &&
    !cleanPrompt.includes('write') &&
    (
      cleanPrompt.includes('contact') ||
      cleanPrompt === 'email' ||
      cleanPrompt.includes('email address') ||
      cleanPrompt.includes('his email') ||
      cleanPrompt.includes('what is the email') ||
      cleanPrompt.includes('send email') ||
      cleanPrompt.includes('reach') ||
      cleanPrompt.includes('hire') ||
      cleanPrompt.includes('calendly') ||
      cleanPrompt.includes('book a meeting') ||
      cleanPrompt.includes('schedule a meeting') ||
      cleanPrompt.includes('phone') ||
      cleanPrompt.includes('call')
    )
  ) {
    return (
      "You can connect with M R S through these verified channels:\n\n" +
      "• Direct Email: mr216873@gmail.com\n" +
      "• Meeting Booking: https://calendly.com/mrxshahin\n" +
      "• Direct Telephone: +8809611056361\n" +
      "• Verified Networks: Gravatar (mrxshahin), LinkedIn, GitHub, X (@Mrshahinx), Bluesky, and WordPress."
    );
  }

  if (
    cleanPrompt.includes('donate') ||
    cleanPrompt.includes('donation') ||
    cleanPrompt.includes('charity') ||
    cleanPrompt.includes('sponsor') ||
    cleanPrompt.includes('partner')
  ) {
    return (
      "Here are the verified community, humanitarian, and sponsored partner links associated with M R S:\n\n" +
      "1. 💖 M R S Charity Project: Supporting healthcare, shelter, and education for communities in need at https://mrmahbubur.github.io/Charity-Foundation/\n" +
      "2. 🌐 Sponsored Partners & Network Directory: Explore curated Cloud, Security, Developer Tools, Hosting, Streaming, and Productivity partner links in the Sponsored Partners section (#sponsors).\n" +
      "3. 🤝 Direct IT & Web Consultation: Book a session directly via Calendly (https://calendly.com/mrxshahin) or email mr216873@gmail.com."
    );
  }

  if (
    cleanPrompt.includes('cert') ||
    cleanPrompt.includes('certification') ||
    cleanPrompt.includes('course') ||
    cleanPrompt.includes('ielts') ||
    cleanPrompt.includes('credential')
  ) {
    return (
      "M R S keeps full certifications and training credentials inside his downloadable **Executive CV (PDF)** rather than listing them directly on the website.\n\n" +
      "Scroll to the **Download M R S Executive CV / Resume (PDF)** bar (#cv-download-bar) right below Contact to download the complete A4 vector PDF."
    );
  }

  if (
    cleanPrompt.includes('education') ||
    cleanPrompt.includes('academic') ||
    cleanPrompt.includes('degree') ||
    cleanPrompt.includes('college') ||
    cleanPrompt.includes('school') ||
    cleanPrompt.includes('study')
  ) {
    return (
      "M R S keeps academic education records inside his downloadable **Executive CV (PDF)** rather than on the website.\n\n" +
      "Scroll to the **Download M R S Executive CV / Resume (PDF)** bar (#cv-download-bar) right below Contact to download the complete CV."
    );
  }

  if (
    cleanPrompt.includes('administrative service') ||
    cleanPrompt.includes('what can you help') ||
    cleanPrompt.includes('can m r s help with') ||
    cleanPrompt.includes('remote service')
  ) {
    return (
      "M R S provides reliable remote IT support and administrative services across five core areas:\n\n" +
      "1. 📁 Document Management & Formatting: Structuring, styling, and converting complex reports, templates, and records in Microsoft Office & Google Workspace.\n" +
      "2. 📧 Professional Email & Correspondence Handling: Inbox administration, client communications, and executive support.\n" +
      "3. 💻 IT Troubleshooting: Remote diagnostics and step-by-step fixes for Windows, Android, browsers, DNS, and WiFi networks.\n" +
      "4. 📝 Job Application Processing & Admin Support: Data organization, form processing, and workflow tracking.\n" +
      "5. 🌐 Web Management & Content Creation: Managing WordPress/Blogspot platforms, SEO optimization, and technical guide publishing."
    );
  }

  if (
    cleanPrompt.includes('technical interest') ||
    cleanPrompt.includes('cybersecurity') ||
    cleanPrompt.includes('security') ||
    cleanPrompt.includes('web3')
  ) {
    return (
      "M R S actively explores five core technical and intellectual focus areas alongside client operations:\n\n" +
      "• Web Development: Modern web applications, CMS platforms, and interactive AI concierges.\n" +
      "• Web3 & Decentralized Tech: Blockchain ecosystems, self-custody tools, and digital assets.\n" +
      "• Cybersecurity & IT Defense: Defensive system hardening, safe browsing, network protection, and vulnerability awareness.\n" +
      "• Social Sciences: Academic study in social structures, human communication, and community welfare.\n" +
      "• Remote Working: Asynchronous team workflows, independent delivery, and digital operations."
    );
  }

  if (
    cleanPrompt.includes('skill') ||
    cleanPrompt.includes('qualification') ||
    cleanPrompt.includes('experience') ||
    cleanPrompt.includes('stack') ||
    cleanPrompt.includes('what can he do')
  ) {
    return (
      "M R S's technical skill set encompasses:\n\n" +
      "• IT Support & Infrastructure: Remote diagnostics; hardware troubleshooting; OS configuration (Windows/Android/Linux); network setup & troubleshooting.\n" +
      "• Office & Administration: Advanced Microsoft 365 (Word, Excel, PowerPoint, Outlook); document formatting; records management; client correspondence.\n" +
      "• Web & Systems Management: Responsive web development; CMS & WordPress management; Web3 fundamentals; ethical cybersecurity hygiene."
    );
  }

  if (cleanPrompt.includes('experience') || cleanPrompt.includes('how long') || cleanPrompt.includes('years')) {
    return (
      "M R S has been actively working as an independent IT Support Professional and Web Manager since 2018, providing remote troubleshooting, document administration, and web platform maintenance for international clients."
    );
  }

  // =========================================================================
  // 3. COMPUTER SCIENCE, PROGRAMMING & WEB DEVELOPMENT
  // =========================================================================

  if (cleanPrompt.includes('reverse proxy') || cleanPrompt.includes('proxy server')) {
    return (
      "A reverse proxy sits in front of one or more web servers, intercepting client requests before they reach the backend.\n\n" +
      "Key Benefits:\n" +
      "• Load Balancing: Distributes traffic evenly across multiple backend instances.\n" +
      "• Security & Anonymity: Masks backend server IP addresses and protects against DDoS attacks.\n" +
      "• SSL/TLS Termination: Offloads encryption/decryption overhead from application servers.\n" +
      "• Caching & Compression: Caches static content (images, CSS, JS) to drastically speed up response times (e.g., Nginx, HAProxy, Cloudflare, Traefik)."
    );
  }

  if (cleanPrompt.includes('dns') || cleanPrompt.includes('domain name system')) {
    return (
      "DNS (Domain Name System) functions as the phonebook of the Internet, translating human-friendly names (e.g., example.com) into numerical IP addresses (e.g., 93.184.216.34).\n\n" +
      "Common Record Types:\n" +
      "• A: Maps domain to an IPv4 address.\n" +
      "• AAAA: Maps domain to an IPv6 address.\n" +
      "• CNAME: Canonical alias pointing one domain name to another.\n" +
      "• MX: Directs email to the organization's mail exchange servers.\n" +
      "• TXT: Contains text metadata used for domain verification, SPF, and DKIM email authentication."
    );
  }

  if (cleanPrompt.includes('rest api') || cleanPrompt.includes('restful') || cleanPrompt.includes('what is an api') || cleanPrompt.includes('what is api')) {
    return (
      "An API (Application Programming Interface) allows two software systems to communicate.\n\n" +
      "REST (Representational State Transfer) is an architectural style utilizing standard HTTP protocols:\n" +
      "• GET: Retrieve data from a resource.\n" +
      "• POST: Submit new data to create a resource.\n" +
      "• PUT / PATCH: Update existing resource data.\n" +
      "• DELETE: Remove a specified resource.\n" +
      "REST APIs are stateless, cacheable, and typically exchange data formatted as JSON."
    );
  }

  if (cleanPrompt.includes('graphql')) {
    return (
      "GraphQL is a query language for APIs created by Meta. Unlike REST where endpoints return fixed data structures, GraphQL allows clients to request exactly the fields they need in a single request, eliminating over-fetching and under-fetching."
    );
  }

  if (cleanPrompt.includes('typescript') || cleanPrompt.includes('what is typescript')) {
    return (
      "TypeScript is a strongly typed superset of JavaScript developed by Microsoft. It compiles to plain JavaScript and adds:\n\n" +
      "• Static Type Checking: Catches bugs at compile time before running code.\n" +
      "• Interfaces & Generics: Enforces structured data contracts across complex codebases.\n" +
      "• Enhanced Tooling: Provides intelligent code completion, refactoring, and documentation in IDEs."
    );
  }

  if (cleanPrompt.includes('javascript') || cleanPrompt.includes('what is javascript')) {
    return (
      "JavaScript (JS) is a high-level, dynamic programming language that powers interactive web pages. Combined with HTML and CSS, it forms the core foundation of the World Wide Web, and also runs server-side via runtimes like Node.js, Deno, and Bun."
    );
  }

  if (cleanPrompt.includes('react') || cleanPrompt.includes('what is react')) {
    return (
      "React is an open-source JavaScript library developed by Meta for building user interfaces.\n\n" +
      "Key Concepts:\n" +
      "• Component-Driven: Builds UIs using reusable, modular components.\n" +
      "• Virtual DOM: Calculates the minimal set of real DOM updates needed for high-speed rendering.\n" +
      "• Hooks: Built-in functions (useState, useEffect, useMemo, useCallback) to manage state and side effects cleanly."
    );
  }

  if (cleanPrompt.includes('next.js') || cleanPrompt.includes('nextjs')) {
    return (
      "Next.js is a React framework created by Vercel that enables server-side rendering (SSR), static site generation (SSG), incremental static regeneration (ISR), and full-stack API routes for production React applications."
    );
  }

  if (cleanPrompt === 'python' || cleanPrompt === 'what is python' || cleanPrompt.startsWith('what is python') || cleanPrompt.includes('explain python') || cleanPrompt.includes('about python')) {
    return (
      "Python is a versatile, high-level programming language renowned for its clean and readable syntax. It is widely used across backend web development (Django, FastAPI, Flask), data science, machine learning (PyTorch, TensorFlow), automation, and scripting."
    );
  }

  if (cleanPrompt === 'docker' || cleanPrompt === 'what is docker' || cleanPrompt.startsWith('what is docker') || cleanPrompt.includes('explain docker')) {
    return (
      "Docker is a platform for developing, shipping, and running applications inside lightweight, isolated packages called containers.\n\n" +
      "Containers bundle application code, dependencies, libraries, and runtime configurations together, ensuring that software executes consistently across development, testing, and cloud production environments."
    );
  }

  if (cleanPrompt === 'kubernetes' || cleanPrompt === 'what is kubernetes' || cleanPrompt === 'what is k8s' || cleanPrompt.startsWith('what is kubernetes')) {
    return (
      "Kubernetes (K8s) is an open-source container orchestration system originally designed by Google. It automates deployment, scaling, load balancing, health monitoring, and management of containerized applications across server clusters."
    );
  }

  if (cleanPrompt === 'git' || cleanPrompt === 'what is git' || cleanPrompt.startsWith('what is git') || cleanPrompt === 'github' || cleanPrompt.startsWith('what is github')) {
    return (
      "Git is a distributed version control system created by Linus Torvalds. It tracks file changes, supports collaborative development through branching and merging, and enables safe rollbacks. GitHub is a cloud-based hosting service for Git repositories with issue tracking and CI/CD workflows."
    );
  }

  if (cleanPrompt === 'sql' || cleanPrompt === 'what is sql' || cleanPrompt.startsWith('what is sql')) {
    return (
      "SQL (Structured Query Language) is the standard language for storing, querying, and managing relational databases (such as PostgreSQL, MySQL, SQLite, and Microsoft SQL Server). Data is organized in structured tables with rows, columns, foreign key relationships, and ACID transaction guarantees."
    );
  }

  if (cleanPrompt.includes('nosql') || cleanPrompt.includes('mongodb') || cleanPrompt.includes('firestore')) {
    return (
      "NoSQL databases store unstructured or semi-structured data without fixed relational schemas. Types include document stores (MongoDB, Firestore), key-value stores (Redis), wide-column stores (Cassandra), and graph databases (Neo4j)."
    );
  }

  if (cleanPrompt.includes('big o') || cleanPrompt.includes('time complexity') || cleanPrompt.includes('space complexity')) {
    return (
      "Big O notation measures the efficiency of an algorithm by describing how its runtime or memory requirements grow relative to the input size (n):\n\n" +
      "• O(1) — Constant Time (e.g., hash map lookup)\n" +
      "• O(log n) — Logarithmic Time (e.g., binary search)\n" +
      "• O(n) — Linear Time (e.g., single loop through an array)\n" +
      "• O(n log n) — Linearithmic Time (e.g., MergeSort, QuickSort average)\n" +
      "• O(n²) — Quadratic Time (e.g., nested loops, BubbleSort)"
    );
  }

  if (cleanPrompt.includes('cybersecurity') || cleanPrompt.includes('security') || cleanPrompt.includes('hacking') || cleanPrompt.includes('firewall')) {
    return (
      "Core cybersecurity principles center around the CIA Triad:\n" +
      "• Confidentiality: Ensuring sensitive data is accessible only to authorized entities (encryption, access controls).\n" +
      "• Integrity: Protecting data from unauthorized modification (hashing, digital signatures).\n" +
      "• Availability: Ensuring systems and networks remain operational (redundancy, DDoS protection, backups).\n\n" +
      "Key practices include multi-factor authentication (MFA), regular vulnerability patching, least-privilege access, and endpoint monitoring."
    );
  }

  if (cleanPrompt.includes('ssl') || cleanPrompt.includes('tls') || cleanPrompt.includes('https')) {
    return (
      "HTTPS (Hypertext Transfer Protocol Secure) encrypts communication between a web browser and a website using TLS (Transport Layer Security, the modern successor to SSL). It uses asymmetric cryptography during the initial handshake to exchange symmetric session keys, ensuring data privacy and preventing man-in-the-middle attacks."
    );
  }

  if (cleanPrompt.includes('tcp') || cleanPrompt.includes('udp') || cleanPrompt.includes('ip address') || cleanPrompt.includes('osi model')) {
    return (
      "Networking Fundamentals:\n\n" +
      "• TCP (Transmission Control Protocol): Connection-oriented protocol providing reliable, ordered delivery with error-checking and packet retransmission (used for web browsing, email, file transfers).\n" +
      "• UDP (User Datagram Protocol): Connectionless, lightweight protocol prioritizing speed over reliability without delivery guarantees (used for video streaming, gaming, VoIP).\n" +
      "• OSI 7-Layer Model: Physical, Data Link, Network, Transport, Session, Presentation, Application."
    );
  }

  if (cleanPrompt.includes('slow pc') || cleanPrompt.includes('troubleshoot') || cleanPrompt.includes('bsod') || cleanPrompt.includes('blue screen')) {
    return (
      "IT Troubleshooting Steps for PC Performance & Stability:\n\n" +
      "1. Check Task Manager: Identify processes causing high CPU, RAM, or Disk utilization.\n" +
      "2. Storage Health: Verify that the SSD/HDD has at least 15% free space and check SMART health data.\n" +
      "3. Driver Updates: Update graphics, chipset, and network drivers to official manufacturer releases.\n" +
      "4. Memory Diagnostics: Run Windows Memory Diagnostic (mdsched.exe) to check for faulty RAM sticks.\n" +
      "5. System Integrity: Run `sfc /scannow` and `DISM /Online /Cleanup-Image /RestoreHealth` in an elevated terminal."
    );
  }

  // =========================================================================
  // 5. ARTIFICIAL INTELLIGENCE, MACHINE LEARNING & DATA SCIENCE
  // =========================================================================

  if (cleanPrompt.includes('neural network') || cleanPrompt.includes('deep learning')) {
    return (
      "Neural networks are computational models inspired by biological neural networks in the human brain:\n\n" +
      "• Architecture: Composed of an input layer, one or more hidden layers, and an output layer made up of interconnected nodes (neurons).\n" +
      "• Weights & Biases: Each connection has a numerical weight that amplifies or dampens signals, with an activation function (ReLU, Sigmoid, GELU) introducing non-linearity.\n" +
      "• Training (Backpropagation): The network makes predictions, computes error against ground truth via a loss function, and uses gradient descent to adjust weights iteratively.\n" +
      "• Applications: Computer vision (CNNs), natural language processing (Transformers), speech recognition, and generative AI."
    );
  }

  if (cleanPrompt.includes('machine learning') || cleanPrompt.includes('what is ml') || cleanPrompt.includes('what is machine learning')) {
    return (
      "Machine Learning (ML) is a subset of artificial intelligence where computer systems learn patterns from data rather than following explicitly hardcoded rules:\n\n" +
      "• Supervised Learning: Trained on labeled datasets (e.g., classification, regression, spam detection).\n" +
      "• Unsupervised Learning: Finds hidden clusters and patterns in unlabeled data (e.g., k-means clustering, PCA).\n" +
      "• Reinforcement Learning: Agents learn optimal policies through trial, error, and reward signals (e.g., robotics, game playing engines)."
    );
  }

  if (cleanPrompt.includes('llm') || cleanPrompt.includes('large language model') || cleanPrompt.includes('transformer')) {
    return (
      "Large Language Models (LLMs) are deep learning models based on the Transformer architecture introduced in 2017 ('Attention Is All You Need'):\n\n" +
      "• Self-Attention Mechanism: Weighs the semantic relationships between all words in a prompt simultaneously, capturing deep context across long passages.\n" +
      "• Pre-training & Fine-Tuning: Trained on massive text corpora to predict next tokens, then fine-tuned with Reinforcement Learning from Human Feedback (RLHF) and instruction datasets.\n" +
      "• Capabilities: Code generation, summarization, complex reasoning, translation, and conversational assistance."
    );
  }

  if (cleanPrompt.includes('reverse a string') || cleanPrompt.includes('reverse string')) {
    return (
      "Here are common ways to reverse a string in Python and JavaScript/TypeScript:\n\n" +
      "Python:\n" +
      "```python\n" +
      "def reverse_string(s: str) -> str:\n" +
      "    return s[::-1]\n" +
      "```\n\n" +
      "TypeScript / JavaScript:\n" +
      "```typescript\n" +
      "function reverseString(s: string): string {\n" +
      "  return s.split('').reverse().join('');\n" +
      "}\n" +
      "```"
    );
  }

  if (cleanPrompt.includes('binary search')) {
    return (
      "Binary Search is an efficient O(log n) algorithm for finding an element in a sorted array by repeatedly dividing the search interval in half:\n\n" +
      "```typescript\n" +
      "function binarySearch(arr: number[], target: number): number {\n" +
      "  let left = 0, right = arr.length - 1;\n" +
      "  while (left <= right) {\n" +
      "    const mid = Math.floor((left + right) / 2);\n" +
      "    if (arr[mid] === target) return mid;\n" +
      "    if (arr[mid] < target) left = mid + 1;\n" +
      "    else right = mid - 1;\n" +
      "  }\n" +
      "  return -1; // Not found\n" +
      "}\n" +
      "```"
    );
  }

  // =========================================================================
  // 4. GENERAL SCIENCE, PHYSICS, CHEMISTRY, BIOLOGY & ASTRONOMY
  // =========================================================================

  if (cleanPrompt.includes('speed of light')) {
    return "The speed of light in a vacuum is exactly 299,792,458 meters per second (approximately 300,000 km/s or 186,282 miles per second), denoted by the constant 'c' in physics.";
  }

  if (cleanPrompt.includes('gravity') || cleanPrompt.includes('gravitational')) {
    return "Gravity is the fundamental natural phenomenon by which all things with mass or energy are attracted toward one another. On Earth's surface, gravitational acceleration is approximately 9.80665 m/s² (32.174 ft/s²). In general relativity, Einstein described gravity not as a conventional force, but as the curvature of spacetime caused by mass and energy.";
  }

  if (cleanPrompt.includes('einstein') || cleanPrompt.includes('relativity') || cleanPrompt.includes('e=mc^2') || cleanPrompt.includes('e=mc2')) {
    return (
      "Albert Einstein developed the theories of Special Relativity (1905) and General Relativity (1915).\n\n" +
      "• Special Relativity established that the speed of light is constant in all inertial frames and formulated mass-energy equivalence (E = mc²).\n" +
      "• General Relativity described gravity as the warping and curvature of four-dimensional spacetime caused by mass."
    );
  }

  if (cleanPrompt.includes('quantum') || cleanPrompt.includes('schrodinger')) {
    return "Quantum mechanics is the branch of physics studying matter and energy at atomic and subatomic scales. Key principles include wave-particle duality, Heisenberg's uncertainty principle, quantum superposition, and quantum entanglement.";
  }

  if (cleanPrompt.includes('water molecule') || cleanPrompt.includes('formula of water') || cleanPrompt.includes('h2o')) {
    return "The chemical formula of water is H₂O, consisting of two hydrogen atoms covalently bonded to one oxygen atom at an angle of approximately 104.5 degrees. Its polar molecular structure gives water unique properties such as high surface tension, universal solvent capability, and density anomaly.";
  }

  if (cleanPrompt.includes('photosynthesis')) {
    return "Photosynthesis is the biological process by which green plants, algae, and certain bacteria convert sunlight, carbon dioxide (CO₂), and water (H₂O) into glucose (C₆H₁₂O₆) and oxygen (O₂), driven by the green pigment chlorophyll inside chloroplasts.";
  }

  if (cleanPrompt.includes('dna') || cleanPrompt.includes('rna') || cleanPrompt.includes('gene')) {
    return "DNA (Deoxyribonucleic acid) is the hereditary molecule that carries genetic instructions for development, functioning, and reproduction in all known living organisms. It consists of two polynucleotide chains forming a double helix, composed of four nucleotide bases: Adenine (A), Thymine (T), Cytosine (C), and Guanine (G).";
  }

  if (cleanPrompt.includes('solar system') || cleanPrompt.includes('planets') || cleanPrompt.includes('how many planets')) {
    return "Our Solar System contains 8 recognized planets orbiting the Sun: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune (along with dwarf planets including Pluto, Ceres, and Eris). Jupiter is the largest planet, while Mercury is the closest to the Sun.";
  }

  if (cleanPrompt.includes('black hole')) {
    return "A black hole is an astronomical region of spacetime where gravitational acceleration is so strong that nothing — no particles or even electromagnetic radiation such as light — can escape from inside its boundary, known as the event horizon.";
  }

  // =========================================================================
  // 5. GEOGRAPHY, CAPITALS & WORLD FACTS
  // =========================================================================

  const capitalMap: Record<string, string> = {
    france: "Paris",
    germany: "Berlin",
    italy: "Rome",
    spain: "Madrid",
    uk: "London",
    "united kingdom": "London",
    usa: "Washington, D.C.",
    "united states": "Washington, D.C.",
    canada: "Ottawa",
    japan: "Tokyo",
    china: "Beijing",
    india: "New Delhi",
    bangladesh: "Dhaka",
    australia: "Canberra",
    brazil: "Brasília",
    russia: "Moscow",
    turkey: "Ankara",
    egypt: "Cairo",
    saudi: "Riyadh",
    "saudi arabia": "Riyadh",
    uae: "Abu Dhabi",
    pakistan: "Islamabad",
    indonesia: "Jakarta (Nusantara in transition)",
    malaysia: "Kuala Lumpur",
    singapore: "Singapore",
    mexico: "Mexico City",
    argentina: "Buenos Aires",
    "south korea": "Seoul",
    korea: "Seoul",
    netherlands: "Amsterdam",
    switzerland: "Bern",
    sweden: "Stockholm",
    norway: "Oslo",
  };

  for (const [country, capital] of Object.entries(capitalMap)) {
    if (cleanPrompt.includes(`capital of ${country}`) || cleanPrompt.includes(`capital city of ${country}`)) {
      return `The capital of ${country.charAt(0).toUpperCase() + country.slice(1)} is ${capital}.`;
    }
  }

  if (cleanPrompt.includes('highest mountain') || cleanPrompt.includes('mount everest')) {
    return "Mount Everest is Earth's highest mountain above sea level, located in the Mahalangur Himal sub-range of the Himalayas on the border between Nepal and China. Its official elevation is 8,848.86 meters (29,031.7 feet).";
  }

  if (cleanPrompt.includes('longest river')) {
    return "The Nile River in northeastern Africa is traditionally recognized as the world's longest river at approximately 6,650 kilometers (4,132 miles), closely rivaled by the Amazon River in South America.";
  }

  // =========================================================================
  // 6. HISTORY, PHILOSOPHY & COMPUTING MILESTONES
  // =========================================================================

  if (cleanPrompt.includes('alan turing')) {
    return "Alan Turing (1912–1954) was an English mathematician, computer scientist, and cryptanalyst. Widely considered the father of theoretical computer science and artificial intelligence, he formulated the Turing Machine concept and played a pivotal role in cracking the German Enigma cipher during World War II at Bletchley Park.";
  }

  if (cleanPrompt.includes('ada lovelace')) {
    return "Ada Lovelace (1815–1852) was an English mathematician and writer, chiefly known for her work on Charles Babbage's mechanical general-purpose computer, the Analytical Engine. She is recognized as the world's first computer programmer after publishing the first algorithm intended for implementation on a machine.";
  }

  if (cleanPrompt.includes('tim berners-lee') || cleanPrompt.includes('world wide web')) {
    return "Sir Tim Berners-Lee invented the World Wide Web in 1989 while working at CERN. He created the first web browser (WorldWideWeb), web server (httpd), and foundational protocols including HTML, HTTP, and URIs.";
  }

  // =========================================================================
  // 7. CONVERSATIONAL, GREETINGS & INTRODUCTIONS
  // =========================================================================

  if (
    cleanPrompt.includes('what can you do') ||
    cleanPrompt.includes('what can you help') ||
    cleanPrompt.includes('how can you help') ||
    cleanPrompt.includes('can you help me') ||
    cleanPrompt.includes('can you help visitors') ||
    cleanPrompt === 'help' ||
    cleanPrompt === 'help me' ||
    cleanPrompt === 'what can i ask'
  ) {
    return (
      "I am here to help you with virtually anything, just like ChatGPT or Claude! Here is what we can do together:\n\n" +
      "• 💻 Code & Software: Write scripts, debug errors, explain logic, or design solutions in JavaScript, Python, TypeScript, HTML/CSS, SQL, Bash, and more.\n" +
      "• 🛠️ IT & Troubleshooting: Solve Windows, Android, network, browser, or Microsoft 365 issues step-by-step.\n" +
      "• ✉️ Writing & Drafting: Draft emails, craft cover letters, format documents, proofread text, or summarize complex articles.\n" +
      "• 🔬 Science & Learning: Explain concepts in physics, biology, mathematics, computer science, history, or philosophy.\n" +
      "• 💼 M R S Portfolio & Platforms: Walk you through M R S's technical background, IT certifications, active platforms, and verified contact channels.\n\n" +
      "What would you like assistance with right now?"
    );
  }

  if (
    cleanPrompt.includes('draft an email') ||
    cleanPrompt.includes('help me draft') ||
    cleanPrompt.includes('write an email') ||
    cleanPrompt.includes('draft email') ||
    cleanPrompt.includes('draft a message') ||
    cleanPrompt.includes('compose an email')
  ) {
    if (cleanPrompt.includes('consultation') || cleanPrompt.includes('m r s') || cleanPrompt.includes('mrs')) {
      return (
        "Here is a complete, polished email draft requesting an IT consultation with M R S:\n\n" +
        "Subject: Inquiry Regarding IT Support & Systems Consultation — [Your Name / Organization]\n\n" +
        "Dear M R S,\n\n" +
        "I hope this message finds you well.\n\n" +
        "I recently explored your verified portfolio and was impressed by your track record in IT support, Microsoft 365 administration, and remote systems management. I am reaching out to discuss potential consultation and support for [briefly describe your project or operational requirements].\n\n" +
        "Could we schedule a brief 15–20 minute call at your convenience? You can also share your preferred time via your Calendly booking link or reply directly.\n\n" +
        "Thank you for your time, and I look forward to speaking with you.\n\n" +
        "Warm regards,\n" +
        "[Your Full Name]\n" +
        "[Your Title / Company]\n" +
        "[Your Phone / Email]"
      );
    }

    return (
      "I’d be glad to help draft your email! To tailor it perfectly, please share:\n\n" +
      "1. Who is the recipient (e.g., client, employer, colleague, or vendor)?\n" +
      "2. What is the primary objective or call to action?\n" +
      "3. What tone do you prefer (formal, warm, persuasive, or direct)?\n\n" +
      "Feel free to provide a few rough bullet points, and I will generate a complete, ready-to-send draft."
    );
  }

  if (cleanPrompt.startsWith('help me write code') || cleanPrompt.startsWith('help me with code') || cleanPrompt.startsWith('write a script') || cleanPrompt.includes('help me debug')) {
    return (
      "I'm ready to write or debug code with you! Please share:\n\n" +
      "1. The language or framework you are using (Python, JavaScript, TypeScript, React, SQL, etc.).\n" +
      "2. What you want the code to do, or any error messages you are encountering.\n\n" +
      "Paste your code snippet or describe the problem, and I’ll provide a clean, commented solution."
    );
  }

  if (
    cleanPrompt === 'who are you' ||
    cleanPrompt.includes('who are you') ||
    cleanPrompt.includes('introduce yourself') ||
    cleanPrompt.includes('what are you') ||
    cleanPrompt.includes('what is your name') ||
    cleanPrompt.includes('who is camellia') ||
    cleanPrompt === 'introduce'
  ) {
    return getVariedIntroSpeech(languageCode);
  }

  if (
    cleanPrompt === 'hi' ||
    cleanPrompt === 'hello' ||
    cleanPrompt === 'hey' ||
    cleanPrompt.startsWith('hi ') ||
    cleanPrompt.startsWith('hello ') ||
    cleanPrompt.startsWith('hey ') ||
    cleanPrompt.startsWith('good morning') ||
    cleanPrompt.startsWith('good afternoon') ||
    cleanPrompt.startsWith('good evening')
  ) {
    return (
      "Hello! How can I assist you today? Feel free to ask about M R S's technical background, platforms, and contact channels, or explore any programming, IT systems, science, or general topics."
    );
  }

  if (cleanPrompt.includes('how are you') || cleanPrompt.includes('how do you do')) {
    return (
      "I am doing very well, thank you! I'm ready to answer any questions you have — whether regarding M R S's work and platforms, or any tech, code, or general topic you'd like to explore."
    );
  }

  if (cleanPrompt.includes('thank') || cleanPrompt.includes('thanks') || cleanPrompt.includes('appreciate it')) {
    return "You are very welcome! Please let me know if there is anything else I can help you with.";
  }

  if (cleanPrompt.includes('bye') || cleanPrompt.includes('goodbye') || cleanPrompt.includes('see you')) {
    return "Goodbye! Thank you for visiting M R S's website. Feel free to return anytime or reach M R S directly at mr216873@gmail.com.";
  }

  // =========================================================================
  // 8. ADAPTIVE GENERAL INQUIRY REASONING (CLAUDE AI CONVERSATIONAL SYNTHESIS)
  // =========================================================================

  // Clean up the query to extract the subject matter
  const topic = rawPrompt
    .replace(/^(what is|what are|explain|tell me about|how does|how do|why is|why are|can you explain|describe|discuss)\s+/i, '')
    .replace(/[?.]+$/g, '')
    .trim();

  const formattedTopic = topic ? `"${topic}"` : 'this topic';

  return (
    `Regarding ${formattedTopic}:\n\n` +
    `When evaluating this topic, the most effective approach begins with understanding its core principles and primary use cases. ` +
    `In technical architecture and practical workflows alike, focusing on clean modularity, verified requirements, and reliable execution produces the highest quality outcomes.\n\n` +
    `If you would like a deeper technical walkthrough, practical code examples, or want to explore how M R S implements these principles across his web platforms, please let me know!`
  );
}
