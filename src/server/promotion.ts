import { getAllSubscribers, cleanSiteUrl, FEATURED_PLATFORM_URL } from './subscribers';
import { escapeCdata, escapeHtml, safeEmailHref, safeMailtoHref } from './emailSanitizer.ts';

export interface SocialSharePack {
  platform: 'linkedin' | 'x' | 'whatsapp' | 'telegram' | 'facebook' | 'reddit' | 'email';
  name: string;
  shareUrl: string;
  suggestedText: string;
  iconHint: string;
}

export interface ReferralStat {
  source: string;
  hits: number;
  lastHitAt: string;
}

// In-memory promotional tracking
const referralStats = new Map<string, { hits: number; lastHitAt: string }>();

export function trackReferral(source?: string): void {
  const cleanSource = (source || 'direct').trim().toLowerCase().slice(0, 50);
  const current = referralStats.get(cleanSource) || { hits: 0, lastHitAt: new Date().toISOString() };
  current.hits += 1;
  current.lastHitAt = new Date().toISOString();
  referralStats.set(cleanSource, current);
}

export function getReferralStats(): ReferralStat[] {
  const list: ReferralStat[] = [];
  for (const [source, stat] of referralStats.entries()) {
    list.push({ source, hits: stat.hits, lastHitAt: stat.lastHitAt });
  }
  return list.sort((a, b) => b.hits - a.hits);
}

// Pre-packaged viral self-promotional copy tailored for M R S
export function generateSocialSharePacks(siteUrl?: string, projectTitle?: string): SocialSharePack[] {
  const targetUrl = cleanSiteUrl(siteUrl);
  const hubUrl = FEATURED_PLATFORM_URL;

  const defaultTitle = projectTitle 
    ? `Explore "${projectTitle}" on M R S's Verified Portfolio`
    : `M R S • Certified IT Support Professional & Web Manager`;

  const linkedinText = projectTitle
    ? `I recommend checking out "${projectTitle}" by M R S — Certified IT Support Professional and Web Manager. Explore live platforms and remote solutions here: ${targetUrl}`
    : `Explore the verified interactive portfolio and AI voice concierge of M R S — Certified IT Support Professional & Web Manager. Specializing in remote systems administration, MS 365, document systems, and full-stack web platforms: ${targetUrl}`;

  const xText = projectTitle
    ? `Check out "${projectTitle}" on the interactive portfolio of M R S (@Mrshahinx) — Certified IT Support & Web Manager. #ITSupport #TechPortfolio #RemoteAdmin ${targetUrl}`
    : `Explore the interactive AI-powered portfolio of M R S (@Mrshahinx) — Certified IT Support Professional & Web Manager. 24/7 Voice Concierge, verified credentials & live platforms: ${targetUrl} #ITSupport #RemoteAdmin #WebManager`;

  const chatText = projectTitle
    ? `Take a look at "${projectTitle}" by M R S (Certified IT Support Professional & Web Manager): ${targetUrl}`
    : `Check out M R S's interactive portfolio with 24/7 AI Voice Concierge & verified credentials (IT Support, Remote Systems & Web Management): ${targetUrl}`;

  const emailSubjectText = 'M R S — Certified IT Support Professional & Web Manager';
  const emailBodyText =
    `Hello,\n\nI wanted to share M R S's interactive portfolio and AI concierge: ${targetUrl}\n\n` +
    `M R S is a Certified IT Support Professional and Web Manager specializing in remote administration, MS Office document systems, and digital platforms.\n\n` +
    `Featured Hub: ${hubUrl}\nContact: mr216873@gmail.com`;

  return [
    {
      platform: 'linkedin',
      name: 'LinkedIn',
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(targetUrl)}`,
      suggestedText: linkedinText,
      iconHint: 'linkedin',
    },
    {
      platform: 'x',
      name: 'X (Twitter)',
      shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`,
      suggestedText: xText,
      iconHint: 'twitter',
    },
    {
      platform: 'whatsapp',
      name: 'WhatsApp',
      shareUrl: `https://api.whatsapp.com/send?text=${encodeURIComponent(chatText)}`,
      suggestedText: chatText,
      iconHint: 'whatsapp',
    },
    {
      platform: 'telegram',
      name: 'Telegram',
      shareUrl: `https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(chatText)}`,
      suggestedText: chatText,
      iconHint: 'telegram',
    },
    {
      platform: 'facebook',
      name: 'Facebook',
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(targetUrl)}`,
      suggestedText: defaultTitle,
      iconHint: 'facebook',
    },
    {
      platform: 'email',
      name: 'Email Referral',
      shareUrl: safeMailtoHref('', {
        allowEmptyRecipient: true,
        subject: emailSubjectText,
        body: emailBodyText,
      }),
      suggestedText: emailBodyText,
      iconHint: 'mail',
    },
  ];
}

// Generate valid RSS 2.0 Syndication Feed for automated content distributors and aggregators
export function generateRssFeed(siteUrl?: string): string {
  const targetUrl = cleanSiteUrl(siteUrl);
  const pubDate = new Date().toUTCString();

  const items = [
    {
      title: 'Cloud — Remote Systems Administration & Verified Web Hub',
      link: 'https://mrmahbubur.github.io/Admin/',
      guid: `${targetUrl}/#projects-cloud`,
      description: 'Central Portfolio and Web Hub for M R S’s work, IT administration, and digital projects.',
      category: 'Portfolio & Web Hub',
      pubDate: 'Fri, 01 Sep 2023 12:00:00 GMT',
    },
    {
      title: 'Blogger Tech Blog — Practical Guides & IT Fixes',
      link: 'https://mrxshahin.blogspot.com/',
      guid: `${targetUrl}/#projects-blogger`,
      description: 'Practical fixes and step-by-step guides for everyday tech problems — Windows, Android, WiFi, browsers, and more since 2018.',
      category: 'Tech Blog',
      pubDate: 'Mon, 15 Jan 2024 10:00:00 GMT',
    },
    {
      title: 'IPTV WEB — 10,000+ Live Channels Media Platform',
      link: 'https://shahin-iptv.ai.studio',
      guid: `${targetUrl}/#projects-iptv-web`,
      description: 'Your World, One Screen. Stream 10,000+ live channels of Sports, Movies, Dramas, and News with high-definition playback.',
      category: 'Media Streaming',
      pubDate: 'Wed, 20 Mar 2024 14:30:00 GMT',
    },
    {
      title: 'Mrs IPTV Android TV APK — High-Definition TV Streaming Package',
      link: 'https://www.upload-apk.com/en/0Jr71hMVlsFwN9Y%20',
      guid: `${targetUrl}/#projects-iptv-apk`,
      description: 'Direct Android APK download for Smart TVs, TV boxes, tablets, and phones.',
      category: 'Android Package',
      pubDate: 'Sun, 05 May 2024 08:00:00 GMT',
    },
    {
      title: 'Executive CV Download & Verified Professional Credentials',
      link: `${targetUrl}/#cv-download`,
      guid: `${targetUrl}/#cv-download`,
      description: 'Official 360-Hour Certified Computer Specialist & MS Office Professional credentials and IT Support CV.',
      category: 'Credentials',
      pubDate: pubDate,
    },
  ];

  const safeTargetXmlUrl = escapeHtml(safeEmailHref(targetUrl));
  const itemsXml = items.map((it) => {
    const safeItemLink = escapeHtml(safeEmailHref(it.link, targetUrl));
    const safeItemGuid = escapeHtml(it.guid);
    return `
    <item>
      <title><![CDATA[${escapeCdata(it.title)}]]></title>
      <link>${safeItemLink}</link>
      <guid isPermaLink="false">${safeItemGuid}</guid>
      <description><![CDATA[${escapeCdata(it.description)}]]></description>
      <category><![CDATA[${escapeCdata(it.category)}]]></category>
      <pubDate>${escapeHtml(it.pubDate)}</pubDate>
      <author>mr216873@gmail.com (M R S)</author>
    </item>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>M R S • Certified IT Support Professional &amp; Web Manager</title>
    <link>${safeTargetXmlUrl}</link>
    <description>Official updates, verified IT support solutions, tech blog guides, and digital platforms by M R S.</description>
    <language>en-us</language>
    <lastBuildDate>${escapeHtml(pubDate)}</lastBuildDate>
    <atom:link href="${safeTargetXmlUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <managingEditor>mr216873@gmail.com (M R S)</managingEditor>
    <webMaster>mr216873@gmail.com (M R S)</webMaster>
    ${itemsXml}
  </channel>
</rss>`;
}

// Generate valid Sitemap XML for Google, Bing, and Search Engine Bots
export function generateSitemapXml(siteUrl?: string): string {
  const baseTargetUrl = safeEmailHref(cleanSiteUrl(siteUrl));
  const today = new Date().toISOString().split('T')[0];

  const pages = [
    { loc: `${baseTargetUrl}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${baseTargetUrl}/#about`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${baseTargetUrl}/#projects`, priority: '0.9', changefreq: 'weekly' },
    { loc: `${baseTargetUrl}/#skills`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseTargetUrl}/#contact`, priority: '0.8', changefreq: 'monthly' },
    { loc: `${baseTargetUrl}/#cv-download`, priority: '0.8', changefreq: 'weekly' },
  ];

  const urlsXml = pages.map((p) => `
  <url>
    <loc>${escapeHtml(p.loc)}</loc>
    <lastmod>${escapeHtml(today)}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urlsXml}
</urlset>`;
}

// Generate standard robots.txt directing search bots to sitemap and rss
export function generateRobotsTxt(siteUrl?: string): string {
  const targetUrl = cleanSiteUrl(siteUrl);
  return `User-agent: *
Allow: /

Sitemap: ${targetUrl}/sitemap.xml
Sitemap: ${targetUrl}/rss.xml
`;
}

// Generate comprehensive promotional digest email for all subscribers
export function generatePromotionalDigestEmail(siteUrl?: string): { subject: string; text: string; html: string } {
  const targetUrl = safeEmailHref(cleanSiteUrl(siteUrl));
  const hubUrl = safeEmailHref(FEATURED_PLATFORM_URL);
  const safeTargetUrl = escapeHtml(targetUrl);
  const safeHubUrl = escapeHtml(hubUrl);
  const subject = `⭐ Platform Showcase: M R S Verified IT Support & Digital Ecosystem`;

  const text = 
`Hello,

I am Camellia, speaking on behalf of M R S (M R S Assistant) — Certified IT Support Professional and Web Manager.

Here is our official platform showcase briefing highlighting M R S's live systems and verified service capabilities:

1. CLOUD — Remote Systems Administration & Verified Web Hub
   Central showcase for M R S's work, IT administration, and digital projects.
   Direct: https://mrmahbubur.github.io/Admin/

2. BLOGGER — Technical Blog & Troubleshooting Guides
   Practical solutions for Windows, Android, WiFi, and browser configuration.
   Direct: https://mrxshahin.blogspot.com/

3. IPTV WEB — Live Streaming Media Platform
   10,000+ international live channels across Sports, News, and Cinema.
   Direct: https://shahin-iptv.ai.studio

4. DIRECT ANDROID APK — High-Definition IPTV Player
   Direct download package for Smart TVs, boxes, and mobile devices.
   Direct: https://www.upload-apk.com/en/0Jr71hMVlsFwN9Y%20

5. EXECUTIVE IT CREDENTIALS & CV
   360-Hour Certified Computer Specialist & MS Office Professional.
   Verified download available with interactive biometric check on this site.

EXPLORE ON THIS SITE:
${targetUrl}

FEATURED PLATFORM & PROJECTS HUB:
${hubUrl}

DIRECT CONTACT & INQUIRIES:
mr216873@gmail.com | +8809611056361

Warm regards,
Camellia — M R S Assistant
Personal Concierge for M R S (Certified IT Support Professional)`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(subject)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #F8FAFC;">
      <div style="max-width: 600px; margin: 24px auto; background: #131B2E; border: 1px solid rgba(226, 184, 103, 0.35); border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(90deg, #E2B867 0%, #F3D08A 50%, #D4A045 100%); height: 4px;"></div>
        <div style="padding: 24px 30px; border-bottom: 1px solid #1E293B;">
          <div style="font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; color: #E2B867; text-transform: uppercase; letter-spacing: 0.12em;">
            EXECUTIVE SHOWCASE BRIEFING
          </div>
          <h1 style="margin: 6px 0 0 0; font-size: 22px; color: #FFFFFF; font-family: Georgia, serif;">
            M R S Digital Ecosystem &amp; Verified Platforms
          </h1>
        </div>

        <div style="padding: 24px 30px;">
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #CBD5E1; line-height: 1.6;">
            I am <strong>Camellia</strong>, M R S Assistant, delivering our curated platform briefing. Below are M R S’s active verified platforms and services:
          </p>

          <div style="background: #182238; border: 1px solid #2A3859; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px;">
            <div style="font-size: 11px; font-family: ui-monospace, monospace; color: #E2B867; font-weight: 700; text-transform: uppercase;">1. Central Web Hub</div>
            <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 2px 0 4px 0;">Cloud (mrmahbubur.github.io/Admin)</div>
            <div style="font-size: 12px; color: #94A3B8;">Web Manager, IT support expert, certified troubleshooter, and blogger since 2018.</div>
          </div>

          <div style="background: #182238; border: 1px solid #2A3859; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px;">
            <div style="font-size: 11px; font-family: ui-monospace, monospace; color: #E2B867; font-weight: 700; text-transform: uppercase;">2. Tech Blog</div>
            <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 2px 0 4px 0;">Blogger (mrxshahin.blogspot.com)</div>
            <div style="font-size: 12px; color: #94A3B8;">Practical fixes and step-by-step guides for everyday Windows, Android, and WiFi issues.</div>
          </div>

          <div style="background: #182238; border: 1px solid #2A3859; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px;">
            <div style="font-size: 11px; font-family: ui-monospace, monospace; color: #E2B867; font-weight: 700; text-transform: uppercase;">3. Live Media Platform</div>
            <div style="font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 2px 0 4px 0;">IPTV WEB (shahin-iptv.ai.studio)</div>
            <div style="font-size: 12px; color: #94A3B8;">High-definition live streaming with 10,000+ international sports, news, and cinema channels.</div>
          </div>

          <div style="text-align: center; margin-top: 24px;">
            <a href="${safeTargetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #E2B867 0%, #D4A045 100%); color: #0B0F19; font-weight: 800; font-size: 13px; font-family: ui-monospace, monospace; text-transform: uppercase; padding: 12px 28px; border-radius: 8px; text-decoration: none;">
              Launch Interactive Portfolio ↗
            </a>
          </div>
        </div>

        <div style="background: #0B0F19; border-top: 1px solid #1E293B; padding: 16px 30px; text-align: center; font-size: 11px; color: #64748B;">
          Direct Email: <a href="${escapeHtml(safeMailtoHref('mr216873@gmail.com'))}" style="color: #E2B867; text-decoration: none;">mr216873@gmail.com</a> • Hub: <a href="${safeHubUrl}" style="color: #94A3B8; text-decoration: none;">${safeHubUrl}</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, text, html };
}
