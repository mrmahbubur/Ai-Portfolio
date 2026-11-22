import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import { escapeHtml, safeEmailHref, sanitizeEmailSubject, stripHtmlTags } from './emailSanitizer.ts';

export interface SubscriberRecord {
  email: string;
  name?: string;
  uid?: string;
  subscribedAt: string;
  receivePlatformUpdates: boolean;
  receiveBlogUpdates: boolean;
}

const SUBSCRIBERS_FILE = path.join(process.cwd(), 'data', 'subscribers.json');

// In-memory cache of active subscribers
let subscribersCache: SubscriberRecord[] = [];

// Initialize data directory and load existing subscribers
function ensureSubscribersFile() {
  try {
    const dataDir = path.dirname(SUBSCRIBERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(SUBSCRIBERS_FILE)) {
      const content = fs.readFileSync(SUBSCRIBERS_FILE, 'utf-8');
      subscribersCache = JSON.parse(content);
    } else {
      subscribersCache = [];
      fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribersCache, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Subscribers] Could not access subscribers.json, keeping in-memory cache:', err);
  }
}

ensureSubscribersFile();

function persistSubscribers() {
  try {
    const dataDir = path.dirname(SUBSCRIBERS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(SUBSCRIBERS_FILE, JSON.stringify(subscribersCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Subscribers] Failed to persist subscribers to disk:', err);
  }
}

export function getAllSubscribers(): SubscriberRecord[] {
  return [...subscribersCache];
}

export function getSubscriberByEmail(email: string): SubscriberRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return subscribersCache.find((s) => s.email.toLowerCase() === normalized);
}

export function upsertSubscriber(subscriber: {
  email: string;
  name?: string;
  uid?: string;
  receivePlatformUpdates?: boolean;
  receiveBlogUpdates?: boolean;
}): SubscriberRecord {
  const normalizedEmail = subscriber.email.trim().toLowerCase();
  const existingIdx = subscribersCache.findIndex((s) => s.email.toLowerCase() === normalizedEmail);

  const record: SubscriberRecord = {
    email: normalizedEmail,
    name: subscriber.name?.trim() || (existingIdx >= 0 ? subscribersCache[existingIdx].name : undefined),
    uid: subscriber.uid || (existingIdx >= 0 ? subscribersCache[existingIdx].uid : undefined),
    subscribedAt: existingIdx >= 0 ? subscribersCache[existingIdx].subscribedAt : new Date().toISOString(),
    receivePlatformUpdates: subscriber.receivePlatformUpdates ?? true,
    receiveBlogUpdates: subscriber.receiveBlogUpdates ?? true,
  };

  if (existingIdx >= 0) {
    subscribersCache[existingIdx] = record;
  } else {
    subscribersCache.push(record);
  }

  persistSubscribers();
  return record;
}

export function removeSubscriber(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const initialLength = subscribersCache.length;
  subscribersCache = subscribersCache.filter((s) => s.email.toLowerCase() !== normalized);
  if (subscribersCache.length !== initialLength) {
    persistSubscribers();
    return true;
  }
  return false;
}

// Official featured platform and interactive projects hub
export const FEATURED_PLATFORM_URL = 'https://mrxshahin.ai.studio/';

// Helper to clean and format site URL ensuring strict http/https protocol & no trailing slashes
export function cleanSiteUrl(url?: string): string {
  return safeEmailHref(url);
}

// Generate the customized email update crafted by Camellia (M R S Assistant)
export function formatProjectUpdateEmail(project: {
  title: string;
  category: string;
  description: string;
  link?: string;
  siteUrl?: string;
  badge?: string;
  tags?: string[];
  customNote?: string;
  recipientName?: string;
}): { subject: string; text: string; html: string } {
  // Target site URL for this specific release
  const targetSiteUrl = cleanSiteUrl(project.siteUrl || project.link);
  const featuredPlatformUrl = cleanSiteUrl(FEATURED_PLATFORM_URL);
  const cleanRecipientName = project.recipientName ? stripHtmlTags(project.recipientName).slice(0, 100) : '';
  const cleanTitle = stripHtmlTags(project.title).slice(0, 200) || 'Portfolio Update';
  const subject = sanitizeEmailSubject(`🚀 New Platform Alert: "${cleanTitle}" is now Live on M R S Portfolio`);
  const nameGreeting = cleanRecipientName ? `Hello ${cleanRecipientName},` : 'Hello,';
  const tagsList = project.tags && project.tags.length > 0 ? project.tags.join(' • ') : project.category;
  const note = project.customNote || 
    `M R S has built and published "${cleanTitle}", expanding our ecosystem of verified IT support, digital tools, and remote administration resources. As an active subscriber, here is your curated launch briefing.`;

  const safeTitle = escapeHtml(cleanTitle);
  const safeCategory = escapeHtml(project.category);
  const safeBadge = escapeHtml(project.badge || 'NEW LAUNCH');
  const safeDesc = escapeHtml(project.description);
  const safeGreeting = escapeHtml(nameGreeting);
  const safeNote = escapeHtml(note);
  const safeTagsList = escapeHtml(tagsList);
  const safeTargetUrl = escapeHtml(targetSiteUrl);
  const safeFeaturedUrl = escapeHtml(featuredPlatformUrl);

  const text = `${nameGreeting}\n\n` +
    `I am Camellia, M R S Assistant, speaking with my signature Claude AI female voice. I am pleased to deliver this official platform launch briefing:\n\n` +
    `============================================================\n` +
    `NEW PLATFORM: ${project.title}\n` +
    `CATEGORY: ${project.category}\n` +
    `STATUS: ${project.badge || 'VERIFIED LIVE'}\n` +
    `============================================================\n\n` +
    `ABOUT THIS RELEASE:\n${project.description}\n\n` +
    `CAMELLIA (M R S ASSISTANT) BRIEFING:\n"${note}"\n\n` +
    `KEY HIGHLIGHTS:\n${tagsList}\n\n` +
    `EXPLORE THIS RELEASE ON THIS SITE:\n${targetSiteUrl}\n\n` +
    `FEATURED PLATFORM & PROJECTS HUB:\n${featuredPlatformUrl}\nExplore all live interactive applications, voice concierge modules, and deployed portfolio systems.\n\n` +
    `Open access guarantee: Visiting and exploring M R S's portfolio is always 100% open and free — no account or login is required to explore all projects.\n\n` +
    `Warm regards,\n` +
    `Camellia — M R S Assistant (Claude AI Female Voice Model)\n` +
    `Personal Concierge for M R S (Certified IT Support Professional)\n` +
    `Featured Projects & Platform Hub: ${featuredPlatformUrl}\n` +
    `Official Site: ${targetSiteUrl}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safeTitle} - M R S Platform Launch</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC; -webkit-font-smoothing: antialiased;">
      <!-- Hidden Preheader for Inbox Preview -->
      <div style="display: none; font-size: 1px; color: #0B0F19; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        New platform update: ${safeTitle} (${safeCategory}). Curated briefing and official access from Camellia (M R S Assistant).
      </div>

      <div style="max-width: 620px; margin: 24px auto; background: #131B2E; border: 1px solid rgba(226, 184, 103, 0.35); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55);">
        
        <!-- Top Warm Gold Gradient Accent Bar -->
        <div style="background: linear-gradient(90deg, #E2B867 0%, #F3D08A 50%, #D4A045 100%); height: 4px;"></div>
        
        <!-- Header -->
        <div style="padding: 26px 30px 18px 30px; border-bottom: 1px solid #1E293B;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #E2B867; text-transform: uppercase;">
              M R S PORTFOLIO &amp; PLATFORM HUB
            </div>
            <span style="background: rgba(226, 184, 103, 0.16); color: #E2B867; border: 1px solid rgba(226, 184, 103, 0.45); font-size: 10px; font-family: ui-monospace, monospace; font-weight: 700; text-transform: uppercase; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.05em;">
              ${safeBadge}
            </span>
          </div>
          <h1 style="margin: 0 0 6px 0; font-size: 23px; font-weight: 700; color: #FFFFFF; font-family: Georgia, 'Times New Roman', serif; line-height: 1.3;">
            Platform Update: ${safeTitle}
          </h1>
          <p style="margin: 0; font-size: 13px; color: #94A3B8; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
            Curated announcement delivered by Camellia (M R S Assistant) • Speaking with Claude AI Female Voice
          </p>
        </div>

        <!-- Assistant Greeting & Commentary -->
        <div style="padding: 26px 30px 14px 30px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #E2E8F0; line-height: 1.6;">${safeGreeting}</p>
          
          <div style="background: #0B0F19; border-left: 3px solid #E2B867; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);">
            <div style="font-family: ui-monospace, monospace; font-size: 10px; color: #E2B867; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
              AI Concierge Briefing
            </div>
            <p style="margin: 0; font-size: 14px; line-height: 1.65; color: #CBD5E1; font-style: italic;">
              "${safeNote}"
            </p>
            <div style="margin-top: 10px; font-size: 12px; color: #E2B867; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
              — Camellia, M R S Assistant (Claude AI Female Voice Model • Personal Concierge for M R S)
            </div>
          </div>

          <!-- Feature Spotlight Card -->
          <div style="background: #182238; border: 1px solid #2A3859; border-radius: 12px; padding: 22px; margin-bottom: 24px;">
            <div style="font-family: ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #E2B867; font-weight: 700; margin-bottom: 8px;">
              ${safeCategory}
            </div>
            <h2 style="margin: 0 0 10px 0; font-size: 19px; color: #FFFFFF; font-weight: 700; font-family: Georgia, serif;">
              ${safeTitle}
            </h2>
            <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
              ${safeDesc}
            </p>
            
            <div style="background: #0F172A; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; border: 1px solid #1E293B;">
              <span style="font-family: ui-monospace, monospace; font-size: 11px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">System Stack:</span>
              <span style="font-family: ui-monospace, monospace; font-size: 11px; color: #E2B867; margin-left: 6px;">${safeTagsList}</span>
            </div>
            
            <!-- Primary Action Button: THIS SITE LINK ONLY -->
            <div>
              <a href="${safeTargetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #E2B867 0%, #D4A045 100%); color: #0B0F19; font-weight: 800; font-size: 13px; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; padding: 13px 28px; border-radius: 8px; box-shadow: 0 4px 14px rgba(226, 184, 103, 0.35); text-align: center;">
                Explore on This Site ↗
              </a>
              <div style="margin-top: 10px; font-family: ui-monospace, monospace; font-size: 11px; color: #94A3B8;">
                Direct link: <a href="${safeTargetUrl}" target="_blank" rel="noopener noreferrer" style="color: #E2B867; text-decoration: underline; word-break: break-all;">${safeTargetUrl}</a>
              </div>
            </div>
          </div>

          <!-- Featured Platform & Projects Hub Link -->
          <div style="background: #0F172A; border: 1px solid #2A3859; border-radius: 12px; padding: 18px 20px; margin-bottom: 22px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <span style="font-family: ui-monospace, monospace; font-size: 11px; color: #E2B867; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
                ★ Featured Platform &amp; Projects Link
              </span>
              <span style="background: rgba(226, 184, 103, 0.15); color: #E2B867; border: 1px solid rgba(226, 184, 103, 0.35); font-size: 10px; font-family: ui-monospace, monospace; font-weight: 700; padding: 2px 8px; border-radius: 9999px;">
                FEATURED HUB
              </span>
            </div>
            <p style="margin: 0 0 12px 0; font-size: 13px; color: #CBD5E1; line-height: 1.55;">
              Explore M R S’s premier interactive AI concierge platform, full portfolio directory, verified certifications, and live web management showcase:
            </p>
            <div>
              <a href="${featuredPlatformUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #1E293B; border: 1px solid #E2B867; color: #F8FAFC; font-weight: 700; font-size: 12px; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
                Open Featured Platform: mrxshahin.ai.studio ↗
              </a>
              <div style="margin-top: 8px; font-family: ui-monospace, monospace; font-size: 11px; color: #94A3B8;">
                Direct Hub URL: <a href="${featuredPlatformUrl}" target="_blank" rel="noopener noreferrer" style="color: #E2B867; text-decoration: underline; word-break: break-all;">${featuredPlatformUrl}</a>
              </div>
            </div>
          </div>

          <!-- Open Access Guarantee -->
          <div style="border-top: 1px solid #1E293B; padding-top: 18px; margin-bottom: 18px;">
            <h4 style="margin: 0 0 6px 0; font-size: 12px; font-family: ui-monospace, monospace; text-transform: uppercase; color: #E2B867; letter-spacing: 0.08em; font-weight: 700;">
              Always Connected with M R S
            </h4>
            <p style="margin: 0; font-size: 13px; color: #94A3B8; line-height: 1.55;">
              You are receiving this update because you subscribed on M R S’s official platform. Visitors never need an account to browse, but subscribers receive early access to every new web tool, IT service, and portfolio upgrade directly on this site.
            </p>
          </div>
        </div>

        <!-- Footer: THIS SITE & FEATURED HUB LINKS -->
        <div style="background: #0B0F19; border-top: 1px solid #1E293B; padding: 22px 30px; text-align: center; font-size: 12px; color: #64748B; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #94A3B8; font-family: ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">
            M R S • Certified IT Support Professional, Web Manager &amp; Digital Entrepreneur
          </p>
          <p style="margin: 0 0 6px 0; font-family: ui-monospace, monospace; font-size: 11px;">
            <a href="${safeFeaturedUrl}" target="_blank" rel="noopener noreferrer" style="color: #E2B867; text-decoration: none; font-weight: 700;">
              Featured Platform &amp; Projects: ${safeFeaturedUrl}
            </a>
          </p>
          <p style="margin: 0; font-family: ui-monospace, monospace; font-size: 11px;">
            <a href="${safeTargetUrl}" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: none;">
              Visit M R S Official Site (${safeTargetUrl})
            </a>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  return { subject, text, html };
}

// Generate the welcome confirmation email for new subscribers
export function formatWelcomeSubscriberEmail(recipientEmail: string, recipientName?: string, siteUrl?: string): { subject: string; text: string; html: string } {
  const targetSiteUrl = cleanSiteUrl(siteUrl);
  const featuredPlatformUrl = cleanSiteUrl(FEATURED_PLATFORM_URL);
  const safeTargetUrl = escapeHtml(targetSiteUrl);
  const safeFeaturedUrl = escapeHtml(featuredPlatformUrl);
  const cleanRecipientName = recipientName ? stripHtmlTags(recipientName).slice(0, 100) : '';
  const subject = `✨ Always Connected: You are Subscribed to M R S Platform & Project Updates`;
  const nameGreeting = cleanRecipientName ? `Hello ${cleanRecipientName},` : 'Hello,';

  const text = `${nameGreeting}\n\n` +
    `I am Camellia, M R S Assistant, speaking with my signature Claude AI female voice as the personal AI representative and concierge for M R S.\n\n` +
    `Welcome to our update stream! You are now successfully subscribed to receive direct email alerts whenever M R S launches a new featured platform, IT service, or major tech project on this site.\n\n` +
    `KEY HIGHLIGHTS:\n` +
    `• Visiting M R S's portfolio is always 100% open and free without needing to sign in.\n` +
    `• Whenever a new platform is published, I will prepare a customized briefing with technical details and direct access for you.\n` +
    `• Explore everything directly on this site: ${targetSiteUrl}\n` +
    `• Featured Platform & Projects Hub: ${featuredPlatformUrl}\n\n` +
    `Warm regards,\n` +
    `Camellia — M R S Assistant (Claude AI Female Voice Model)\n` +
    `Personal Concierge for M R S (Certified IT Support Professional)\n` +
    `Featured Projects & Platform Hub: ${featuredPlatformUrl}\n` +
    `Official Site: ${targetSiteUrl}`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to M R S Updates</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F8FAFC; -webkit-font-smoothing: antialiased;">
      <div style="display: none; font-size: 1px; color: #0B0F19; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        Welcome to M R S Platform Updates! You are now connected with Camellia (M R S Assistant).
      </div>

      <div style="max-width: 600px; margin: 24px auto; background: #131B2E; border: 1px solid rgba(226, 184, 103, 0.35); border-radius: 16px; overflow: hidden; box-shadow: 0 16px 36px rgba(0, 0, 0, 0.55);">
        <!-- Top Accent Gradient -->
        <div style="background: linear-gradient(90deg, #E2B867 0%, #F3D08A 50%, #D4A045 100%); height: 4px;"></div>
        
        <!-- Header -->
        <div style="padding: 26px 30px 18px 30px; border-bottom: 1px solid #1E293B;">
          <span style="font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #E2B867; text-transform: uppercase;">
            ALWAYS CONNECTED
          </span>
          <h1 style="margin: 8px 0 4px 0; font-size: 23px; font-weight: 700; color: #FFFFFF; font-family: Georgia, 'Times New Roman', serif;">
            Welcome to M R S Updates
          </h1>
          <p style="margin: 0; font-size: 13px; color: #94A3B8; font-family: ui-monospace, monospace;">
            Subscribed with ${escapeHtml(recipientEmail)}
          </p>
        </div>

        <!-- Body -->
        <div style="padding: 26px 30px;">
          <p style="margin: 0 0 16px 0; font-size: 15px; color: #E2E8F0; line-height: 1.6;">${escapeHtml(nameGreeting)}</p>
          
          <div style="background: #0B0F19; border-left: 3px solid #E2B867; border-radius: 10px; padding: 16px 20px; margin-bottom: 22px; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);">
            <div style="font-family: ui-monospace, monospace; font-size: 10px; color: #E2B867; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
              Personal Welcome from Camellia (M R S Assistant)
            </div>
            <p style="margin: 0; font-size: 14px; line-height: 1.65; color: #CBD5E1; font-style: italic;">
              "I am <strong>Camellia</strong>, M R S Assistant, speaking with my signature Claude AI female voice. Thank you for subscribing! As M R S creates new featured platforms, web systems, and IT support solutions, I will keep you informed with tailored briefings."
            </p>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #E2B867; font-weight: 600; font-family: ui-monospace, monospace;">
              — Camellia, M R S Assistant (Claude AI Female Voice Persona)
            </p>
          </div>

          <div style="background: #182238; border: 1px solid #2A3859; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 12px; font-family: ui-monospace, monospace; text-transform: uppercase; color: #E2B867; letter-spacing: 0.08em; font-weight: 700;">
              Subscriber Privileges
            </h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #CBD5E1; line-height: 1.7;">
              <li>Instant email alerts when a new project or platform launches</li>
              <li>Architectural overviews and technical stack breakdowns</li>
              <li>Direct 1-click access to explore on this site</li>
              <li>Zero spam — notifications sent only for genuine major releases</li>
            </ul>
          </div>

          <!-- Primary CTA Button & Featured Platform Links -->
          <div style="text-align: left; margin-bottom: 18px;">
            <a href="${safeTargetUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: linear-gradient(135deg, #E2B867 0%, #D4A045 100%); color: #0B0F19; font-weight: 800; font-size: 13px; font-family: ui-monospace, monospace; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; padding: 12px 26px; border-radius: 8px; box-shadow: 0 4px 14px rgba(226, 184, 103, 0.35);">
              Explore on This Site ↗
            </a>
            <div style="margin-top: 8px; font-family: ui-monospace, monospace; font-size: 11px; color: #94A3B8;">
              Direct link: <a href="${safeTargetUrl}" target="_blank" rel="noopener noreferrer" style="color: #E2B867; text-decoration: underline; word-break: break-all;">${safeTargetUrl}</a>
            </div>
          </div>

          <!-- Featured Platform & Projects Hub Link -->
          <div style="background: #0F172A; border: 1px solid #2A3859; border-radius: 12px; padding: 14px 18px; margin-bottom: 16px;">
            <div style="font-family: ui-monospace, monospace; font-size: 11px; color: #E2B867; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; margin-bottom: 6px;">
              ★ Featured Platform &amp; Projects Hub
            </div>
            <div style="font-size: 12px; color: #CBD5E1; margin-bottom: 8px;">
              Interactive voice AI concierge, full digital showcase &amp; project index:
            </div>
            <a href="${safeFeaturedUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; color: #E2B867; font-family: ui-monospace, monospace; font-size: 11px; font-weight: 700; text-decoration: underline; word-break: break-all;">
              ${safeFeaturedUrl} ↗
            </a>
          </div>
        </div>

        <!-- Footer: THIS SITE & FEATURED HUB -->
        <div style="background: #0B0F19; border-top: 1px solid #1E293B; padding: 20px 30px; text-align: center; font-size: 12px; color: #64748B;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #94A3B8; font-family: ui-monospace, monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;">
            M R S • Certified IT Support Professional &amp; Web Manager
          </p>
          <p style="margin: 0 0 6px 0; font-family: ui-monospace, monospace; font-size: 11px;">
            <a href="${safeFeaturedUrl}" target="_blank" rel="noopener noreferrer" style="color: #E2B867; text-decoration: none; font-weight: 700;">
              Featured Platform: ${safeFeaturedUrl}
            </a>
          </p>
          <p style="margin: 0; font-family: ui-monospace, monospace; font-size: 11px;">
            <a href="${safeTargetUrl}" target="_blank" rel="noopener noreferrer" style="color: #94A3B8; text-decoration: none;">
              Visit M R S Official Site (${safeTargetUrl})
            </a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject, text, html };
}

export interface SiteUpdateRecord {
  id: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
  tags?: string[];
  customNote?: string;
  timestamp: string;
  sentCount: number;
}

const UPDATES_FILE = path.join(process.cwd(), 'data', 'updates.json');
let updatesCache: SiteUpdateRecord[] = [];

function ensureUpdatesFile() {
  try {
    const dataDir = path.dirname(UPDATES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (fs.existsSync(UPDATES_FILE)) {
      updatesCache = JSON.parse(fs.readFileSync(UPDATES_FILE, 'utf-8'));
    } else {
      updatesCache = [];
      fs.writeFileSync(UPDATES_FILE, JSON.stringify(updatesCache, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('[Updates] Failed to initialize updates.json:', err);
  }
}
ensureUpdatesFile();

export function getUpdatesHistory(): SiteUpdateRecord[] {
  return [...updatesCache];
}

// Automatically dispatch notification email to all active registered subscribers whenever a new update happens
export async function dispatchUpdateNotificationToSubscribers(
  update: {
    title: string;
    category?: string;
    description: string;
    badge?: string;
    tags?: string[];
    customNote?: string;
    siteUrl?: string;
  },
  transporter?: nodemailer.Transporter | null
): Promise<{ success: boolean; sentCount: number; totalSubscribers: number; updateRecord: SiteUpdateRecord }> {
  const subscribers = getAllSubscribers().filter((s) => s.receivePlatformUpdates);
  let sentCount = 0;
  const gmailUser = process.env.GMAIL_USER || 'mr216873@gmail.com';

  if (transporter && subscribers.length > 0) {
    for (const sub of subscribers) {
      try {
        const emailContent = formatProjectUpdateEmail({
          title: update.title,
          category: update.category || 'Platform Update',
          description: update.description,
          siteUrl: update.siteUrl,
          badge: update.badge || 'NEW UPDATE',
          tags: update.tags || [],
          customNote: update.customNote,
          recipientName: sub.name,
        });

        await transporter.sendMail({
          from: `"Camellia (M R S Assistant)" <${gmailUser}>`,
          to: sub.email,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
        });
        sentCount++;
      } catch (err) {
        console.warn(`[AutoUpdate] Failed to send update email to ${sub.email}:`, err);
      }
    }
  }

  // Record this update in the persistent updates log
  const newRecord: SiteUpdateRecord = {
    id: `upd_${Date.now()}`,
    title: update.title,
    category: update.category || 'Platform Update',
    description: update.description,
    badge: update.badge || 'NEW UPDATE',
    tags: update.tags || [],
    customNote: update.customNote,
    timestamp: new Date().toISOString(),
    sentCount,
  };

  updatesCache.unshift(newRecord);
  try {
    const dataDir = path.dirname(UPDATES_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(UPDATES_FILE, JSON.stringify(updatesCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Updates] Failed to persist updates.json:', err);
  }

  return { success: true, sentCount, totalSubscribers: subscribers.length, updateRecord: newRecord };
}

