import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv";
import { GoogleGenAI, HarmCategory, HarmBlockThreshold, ThinkingLevel, Modality, type Content, type Part, type LiveServerMessage } from "@google/genai";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { adminAuth } from "./src/lib/firebase-admin.ts";
import { getOrCreateUser, getUserByUid } from "./src/db/users.ts";
import { saveInquiry } from "./src/db/inquiries.ts";
import { generateIntelligentAnswer } from "./src/utils/intelligentQA.ts";
import { compileProfileToCvPdfBuffer } from "./src/server/compileCvPdf.ts";
import { generateUniqueCvDocId } from "./src/utils/cvTracking.ts";
import { buildRealTimeCvContent } from "./src/utils/cvContent.ts";
import {
  getAllSubscribers,
  getSubscriberByEmail,
  upsertSubscriber,
  removeSubscriber,
  formatProjectUpdateEmail,
  formatWelcomeSubscriberEmail,
  cleanSiteUrl,
  dispatchUpdateNotificationToSubscribers,
  getUpdatesHistory,
} from "./src/server/subscribers.ts";
import {
  escapeHtml,
  escapeJsonLdString,
  resolveOriginUrl,
  safeEmailHref,
  safeGmailComposeHref,
  safeGoogleMapsHref,
  safeMailtoHref,
  sanitizeEmailSubject,
  stripCrlf,
  stripHtmlTags,
} from "./src/server/emailSanitizer.ts";
import {
  generateSocialSharePacks,
  generateRssFeed,
  generateSitemapXml,
  generateRobotsTxt,
  generatePromotionalDigestEmail,
  trackReferral,
  getReferralStats,
} from "./src/server/promotion.ts";
import {
  createAccount,
  authenticateAccount,
  updateAccountProfile,
  findAccountByEmail,
  findAccountByUid,
  toPublicUser,
  getAllAccountsCount,
} from "./src/server/accounts.ts";
import {
  recordCompletedHelp,
  getVisitorHelpStats,
  sendMonthlyReport,
  startMonthlyReportScheduler,
  recordInquiryLog,
  recordCvDownloadLog,
  buildMonthlyReportContent,
} from "./src/server/visitorHelpTracker.ts";
import {
  getCurrentPolicies,
  checkAndApplyAnnualUpdate,
  startAnnualUpdateScheduler,
} from "./src/server/annualUpdateEngine.ts";
import {
  storeAndEmailVerifiedPerson,
  getVerifiedFacesLog,
} from "./src/server/verifiedFaceStorage.ts";
import {
  verifyRealHumanFace,
  issueBiometricToken,
  verifyBiometricToken,
} from "./src/server/realFaceVerifier.ts";
import {
  CAMELLIA_ASSISTANT_URL,
  syncUserDataWithRemoteAssistant,
  getAssistantSyncStatus,
  getFullSharedBackendState,
} from "./src/server/assistantBridge.ts";
import {
  securityHeadersMiddleware,
  maliciousRequestGuard,
  adaptiveRateLimiter,
  payloadSanitizer,
  requireAdminAuthorization,
} from "./src/server/securityShield.ts";
import {
  CAMELLIA_SYSTEM_INSTRUCTION,
  getCamelliaSystemInstruction,
} from "./src/prompts/camellia-prompt.ts";

// Configurable Flash-class model constant for Camellia Assistant
export const CAMELLIA_MODEL = "gemini-4-hydrogen";
export const CAMELLIA_TTS_MODEL = "gemini-3.8-flash-lite-tts";

dotenv.config();

function resolveRequestOrigin(req: express.Request): string {
  if (process.env.APP_URL) {
    const envOrigin = resolveOriginUrl(process.env.APP_URL);
    if (envOrigin) return envOrigin;
  }
  const rawProto = String(req.headers["x-forwarded-proto"] || req.protocol || "https")
    .split(",")[0]
    .trim()
    .toLowerCase();
  const proto = rawProto === "http" ? "http" : "https";
  const rawHost = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  if (/^[a-zA-Z0-9.-]+(?::[0-9]{1,5})?$/.test(rawHost)) {
    const hostOrigin = resolveOriginUrl(`${proto}://${rawHost}`);
    if (hostOrigin) return hostOrigin;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    const renderOrigin = resolveOriginUrl(process.env.RENDER_EXTERNAL_URL);
    if (renderOrigin) return renderOrigin;
  }
  return cleanSiteUrl();
}

function parseServerPort(rawValue: string | undefined, fallback = 3000): number {
  const trimmed = (rawValue ?? "").trim();
  if (!/^[1-9]\d{0,4}$/.test(trimmed)) {
    return fallback;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 65535 ? parsed : fallback;
}

const app = express();
app.set("trust proxy", 1);
const PORT = parseServerPort(process.env.PORT, 3000);

// High Security System Middleware Stack
app.use(securityHeadersMiddleware);
app.use(maliciousRequestGuard);
app.use(express.json({ limit: "10mb" }));
app.use(payloadSanitizer);
app.use(adaptiveRateLimiter);

// Lazy Gmail SMTP Transporter
let smtpTransporter: nodemailer.Transporter | null = null;
function getSmtpTransporter(): nodemailer.Transporter | null {
  const gmailUser = (process.env.GMAIL_USER || process.env.SMTP_USER || "mr216873@gmail.com").trim();
  const gmailPass = (process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_PASSWORD || "").trim().replace(/\s+/g, "");

  if (!gmailPass) {
    return null;
  }

  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return smtpTransporter;
}

// Lazy Google Gen AI helper with telemetry header
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Dedicated Gemini v1beta client (required for TTS, Embeddings, Transcribe, and Live Bidi)
let ttsAiClient: GoogleGenAI | null = null;
function getTtsAI(): GoogleGenAI {
  if (!ttsAiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    ttsAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "v1beta",
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return ttsAiClient;
}

// Dedicated Gemini v1alpha client fallback for experimental Bidi Live sessions
let alphaAiClient: GoogleGenAI | null = null;
function getAlphaAI(): GoogleGenAI {
  if (!alphaAiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    alphaAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "v1alpha",
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return alphaAiClient;
}

// Liveness & Health Checks (/health, /api/health, /ready)
app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    hasKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"),
    smtpConfigured: Boolean(process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS),
    destinationEmail: process.env.GMAIL_RECIPIENT || process.env.GMAIL_USER || "mr216873@gmail.com",
  });
});

app.get("/ready", (req, res) => {
  const dataDir = path.join(process.cwd(), "data");
  let storageWritable = false;
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.accessSync(dataDir, fs.constants.W_OK);
    storageWritable = true;
  } catch {}
  const gravatarLoaded = Boolean(latestGravatarCache?.profile);
  const aiReady = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY");
  const isReady = storageWritable;
  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    storageWritable,
    gravatarLoaded,
    aiReady,
    timestamp: new Date().toISOString(),
  });
});

// Visitor Geolocation & Support Trigger Endpoint (Checks if visitor is outside Bangladesh)
app.get("/api/visitor-geo", async (req, res) => {
  try {
    const clientTz = String(req.query.tz || "").trim();
    const headerCountry = String(
      req.headers["x-appengine-country"] ||
      req.headers["cf-ipcountry"] ||
      req.headers["x-country-code"] ||
      req.headers["x-vercel-ip-country"] ||
      ""
    )
      .trim()
      .toUpperCase();

    let countryCode = headerCountry && headerCountry !== "ZZ" && headerCountry !== "XX" ? headerCountry : "";

    if (!countryCode) {
      const forwarded = String(req.headers["x-forwarded-for"] || "");
      const rawIp = forwarded ? forwarded.split(",")[0].trim() : (req.socket.remoteAddress || "");
      const ip = rawIp.replace(/^::ffff:/, "");

      const isPrivateOrLocal =
        !ip ||
        ip === "127.0.0.1" ||
        ip === "::1" ||
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip);

      if (!isPrivateOrLocal) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const geoRes = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
            signal: controller.signal,
            headers: { "User-Agent": "mrs-portfolio-server" },
          });
          clearTimeout(timeout);
          if (geoRes.ok) {
            const text = (await geoRes.text()).trim().toUpperCase();
            if (/^[A-Z]{2}$/.test(text)) {
              countryCode = text;
            }
          }
        } catch {
          // Fallback to timezone check if external geo lookup times out
        }
      }
    }

    const isTzBangladesh =
      clientTz === "Asia/Dhaka" || clientTz === "Asia/Dacca";

    if (!countryCode && isTzBangladesh) {
      countryCode = "BD";
    }

    const isBangladesh = countryCode === "BD" || (countryCode === "" && isTzBangladesh);

    res.json({
      countryCode: countryCode || (isTzBangladesh ? "BD" : "INTL"),
      isBangladesh,
    });
  } catch (err) {
    res.json({
      countryCode: "INTL",
      isBangladesh: false,
    });
  }
});

// Autonomous 24/7 Background Gravatar Auto-Sync Daemon State
let latestGravatarCache: any = null;
let lastSyncTimestamp: string = "";
let syncCycleCount: number = 0;
let lastChangeDetectedAt: string = "";
let lastDataHash: string = "";
let isAutoSyncRunning = false;
const activeSseClients = new Set<express.Response>();

// Broadcast data to all active SSE subscribers
function broadcastToSseClients(event: string, payload: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of activeSseClients) {
    try {
      client.write(message);
    } catch (_) {
      activeSseClients.delete(client);
    }
  }
}

// Robust multi-endpoint live Gravatar Profile Fetcher with Cache-Busting
async function fetchFreshGravatarProfile(usernameParam?: string, emailParam?: string) {
  const username = usernameParam || "mrxshahin";
  const email = emailParam || "mr216873@gmail.com";

  const emailClean = email.trim().toLowerCase();
  const md5Hash = crypto.createHash("md5").update(emailClean).digest("hex");
  const sha256Hash = crypto.createHash("sha256").update(emailClean).digest("hex");

  const gravatarApiKey =
    process.env.GRAVATAR_API_KEY ||
    process.env.GRAVATAR_ACCESS_TOKEN ||
    process.env.GRAVATAR_BEARER_TOKEN ||
    "";

  const requestHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (compatible; MRSHAHIN-GravatarContinuousSync/4.0; +https://gravatar.com)",
    Accept: "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
  };

  if (gravatarApiKey && gravatarApiKey !== "MY_GRAVATAR_API_KEY") {
    requestHeaders["Authorization"] = `Bearer ${gravatarApiKey.trim()}`;
  }

  const now = Date.now();
  const v3Candidates = [
    `https://api.gravatar.com/v3/profiles/${sha256Hash}?_t=${now}`,
    `https://api.gravatar.com/v3/profiles/${username}?_t=${now}`,
  ];
  const v2Candidates = [
    `https://en.gravatar.com/${sha256Hash}.json?_t=${now}`,
    `https://en.gravatar.com/${md5Hash}.json?_t=${now}`,
    `https://en.gravatar.com/${username}.json?_t=${now}`,
  ];

  async function fetchFirstJson(urls: string[]): Promise<{ data: any; url: string } | null> {
    for (const url of urls) {
      try {
        const fetchRes = await fetch(url, {
          headers: requestHeaders,
          signal: AbortSignal.timeout(6000),
        });
        if (fetchRes.ok) {
          const json = await fetchRes.json();
          if (json && (json.entry || json.hash || json.display_name || json.displayName || json.description || json.about_me || json.aboutMe)) {
            return { data: json, url };
          }
        }
      } catch (_) {
        // Continue to next candidate endpoint
      }
    }
    return null;
  }

  function decodeHtmlEntities(str: string): string {
    return (str || "")
      .replace(/&amp;/g, "&")
      .replace(/&#038;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  // Fetch v3 API, v2 legacy JSON, and live public HTML concurrently so zero fields are dropped
  const [v3Result, v2Result, htmlResult] = await Promise.all([
    fetchFirstJson(v3Candidates),
    fetchFirstJson(v2Candidates),
    (async () => {
      const links: Array<{ title: string; link: string; description: string; thumbnail?: string }> = [];
      const interests: string[] = [];
      const verifiedFromHtml: Array<{ service_type: string; service_label: string; url: string }> = [];
      try {
        const htmlRes = await fetch(`https://gravatar.com/${username}?_t=${now}`, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(6500),
        });
        if (htmlRes.ok) {
          const htmlText = await htmlRes.text();

          // 1. Parse g-profile__links card-by-card strictly inside card boundaries
          const linksIdx = htmlText.indexOf("g-profile__links");
          if (linksIdx >= 0) {
            const nextCardAfterLinks = htmlText.indexOf("g-profile__card", linksIdx + 20);
            const linksSection = htmlText.slice(linksIdx, nextCardAfterLinks > linksIdx ? nextCardAfterLinks : undefined);
            const cardChunks = linksSection.split(/class="[^"]*g-profile-card__card-item[^"]*"/i).slice(1);
            for (const cardChunk of cardChunks) {
              const linkTagMatch = cardChunk.match(/<a[^>]*class="[^"]*card-item__link[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
              if (!linkTagMatch) continue;
              const openTag = linkTagMatch[0];
              const hrefMatch = openTag.match(/href="([^"]+)"/i);
              const titleMatch = openTag.match(/title="([^"]*)"/i);
              const href = hrefMatch ? decodeHtmlEntities(hrefMatch[1]).trim() : "";
              const titleAttr = titleMatch ? decodeHtmlEntities(titleMatch[1]).trim() : "";
              const innerText = decodeHtmlEntities(linkTagMatch[1].replace(/<[^>]+>/g, "").replace(/↗/g, "")).trim();

              // Extract description strictly inside this single card chunk only
              const pMatch = cardChunk.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
              const descText = pMatch
                ? decodeHtmlEntities(pMatch[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim()
                : "";

              const mshotMatch =
                cardChunk.match(/data-mshot="([^"]+)"/i) ||
                cardChunk.match(/src="([^"]*mshots[^"]*)"/i);
              const thumbnail = mshotMatch ? decodeHtmlEntities(mshotMatch[1]) : undefined;

              if (href) {
                links.push({
                  title: titleAttr || innerText || "Featured Platform",
                  link: href,
                  description: descText,
                  thumbnail,
                });
              }
            }
          }

          // 2. Parse g-profile__interests-list
          const interestsMatch = htmlText.match(/class="[^"]*g-profile__interests-list[^"]*"([\s\S]*?)<\/ul>/i);
          if (interestsMatch) {
            const liRegex = /<li[^>]*>\s*(?:<span[^>]*>)?([\s\S]*?)(?:<\/span>)?\s*<\/li>/gi;
            let lm;
            while ((lm = liRegex.exec(interestsMatch[1])) !== null) {
              const cleaned = decodeHtmlEntities(lm[1].replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
              if (cleaned) interests.push(cleaned);
            }
          }

          // 3. Parse is-verified-accounts card
          const vaIdx = htmlText.indexOf("is-verified-accounts");
          if (vaIdx >= 0) {
            const nextCardAfterVa = htmlText.indexOf("g-profile__card", vaIdx + 20);
            const vaSection = htmlText.slice(vaIdx, nextCardAfterVa > vaIdx ? nextCardAfterVa : undefined);
            const vaChunks = vaSection.split(/class="[^"]*g-profile-card__card-item[^"]*"/i).slice(1);
            for (const vaChunk of vaChunks) {
              const labelMatch = vaChunk.match(/card-item__label-text[^>]*>([\s\S]*?)<\/span>/i);
              const aMatch = vaChunk.match(/<a[^>]*class="[^"]*card-item__link[^"]*"[^>]*href="([^"]+)"/i);
              if (aMatch) {
                const label = labelMatch ? decodeHtmlEntities(labelMatch[1].replace(/<[^>]+>/g, "")).trim() : "";
                const vaUrl = decodeHtmlEntities(aMatch[1]).trim();
                const typeGuess = label.toLowerCase() || (vaUrl.includes("x.com") ? "twitter" : vaUrl.includes("github") ? "github" : vaUrl.includes("bsky") ? "bluesky" : vaUrl.includes("linkedin") ? "linkedin" : vaUrl.includes("wordpress") ? "wordpress" : vaUrl.includes("goodreads") ? "goodreads" : "web");
                verifiedFromHtml.push({
                  service_type: typeGuess === "x" ? "twitter" : typeGuess,
                  service_label: label || typeGuess,
                  url: vaUrl,
                });
              }
            }
          }
        }
      } catch (_) {
        // Continue if HTML scrape times out
      }
      return { links, interests, verifiedFromHtml };
    })(),
  ]);

  const gravatarData: any = v3Result?.data || v2Result?.data || null;
  const v2Entry: any = Array.isArray(v2Result?.data?.entry) ? v2Result.data.entry[0] : (v2Result?.data || {});
  const v3Entry: any = Array.isArray(v3Result?.data?.entry) ? v3Result.data.entry[0] : (v3Result?.data || {});
  const fetchedFromUrl = v3Result?.url || v2Result?.url || "";
  const liveScrapedLinks = htmlResult.links;
  const htmlInterests = htmlResult.interests;
  const htmlVerifiedAccounts = htmlResult.verifiedFromHtml;

  const defaultAvatarUrl = "/mrs_profile_avatar.jpg";

  // Clean M R S from project name headings
  function cleanProjectHeading(title: string): string {
    if (!title) return "";
    return title
      .replace(/^(\s*M\s*R\s*S\s*|M\.R\.S\.\s*|Mrs\.?\s*)[-–—:]?\s*/i, "")
      .replace(/\bM\s*R\s*S\b/gi, "")
      .replace(/\bMrs\b/g, "")
      .trim();
  }

  // Build dynamic featured projects and platforms synthesized strictly from live Gravatar data
  function buildDynamicProjectsAndPlatforms(entryData: any = {}, scrapedLinks: Array<{ title: string; link: string; description: string; thumbnail?: string }> = []): Array<{
    id: string;
    title: string;
    category: string;
    description: string;
    tags: string[];
    badge: string;
    link: string;
    customThumbnail?: string;
    speechNarrative: string;
    source?: string;
    verified?: boolean;
  }> {
    let userimageThumb = "https://0.gravatar.com/userimage/140624186/589947ba6feb635084f1ebb4e1167443?size=512";
    if (Array.isArray(entryData.photos) && entryData.photos.length > 0) {
      const userPhoto = entryData.photos.find((p: any) => p.value && p.value.includes("userimage"));
      if (userPhoto?.value) {
        userimageThumb = userPhoto.value.includes("?") ? `${userPhoto.value}&size=512` : `${userPhoto.value}?size=512`;
      }
    }

    // Curated definitions for all live Gravatar-verified platforms (keeps full untruncated descriptions & clean categorization)
    const canonicalPlatformDefinitions = [
      {
        matchKeys: ["mrs-services.ai.studio"],
        id: "proj-1-services",
        defaultTitle: "All Services",
        category: "Services & IT Hub",
        defaultDescription: "Unified service portal showcasing M R S's remote IT support, virtual assistance, Microsoft 365 document workflows, web management, and digital solutions.",
        tags: ["IT Services", "Remote Admin", "Virtual Assistance", "Consulting"],
        badge: "ALL SERVICES",
        link: "https://mrs-services.ai.studio/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrs-services.ai.studio%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} is M R S's unified directory covering remote IT support, Microsoft Office document formatting, virtual assistance, and web operations.`,
      },
      {
        matchKeys: ["shahin-iptv.ai.studio"],
        id: "proj-2-iptv-web",
        defaultTitle: "IPTV WEB",
        category: "Live Streaming & Media Platform",
        defaultDescription: "Your World, One Screen. Stream 10,000+ live channels of Sports, Movies, Dramas, and News from anywhere with high-definition playback and a Premium ad-free tier.",
        tags: ["IPTV", "Media Streaming", "Live TV", "10,000+ Channels"],
        badge: "LIVE WEB APP",
        link: "https://shahin-iptv.ai.studio",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fshahin-iptv.ai.studio?w=640",
        getSpeechNarrative: (t: string) => `${t} is the flagship entertainment platform streaming over ten thousand live international channels across Sports, Movies, Dramas, and News.`,
      },
      {
        matchKeys: ["mrmahbubur.github.io/apps-store", "apps-store-idk3.onrender.com"],
        id: "proj-3-apps-store",
        defaultTitle: "Apps Store",
        category: "Web & Android App Directory",
        defaultDescription: "Curated web and mobile applications directory built by M R S — offering direct access to lightweight utilities, streaming players, and productivity tools.",
        tags: ["Web Apps", "Android APK", "Software Hub", "Utilities"],
        badge: "APPS DIRECTORY",
        link: "https://mrmahbubur.github.io/APPS-STORE/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FAPPS-STORE%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} serves as a centralized directory for direct web utilities and Android software packages maintained by M R S.`,
      },
      {
        matchKeys: ["mrs-pcn.ai.studio"],
        id: "proj-4-pcn",
        defaultTitle: "Private C N",
        category: "Privacy & Secure Communications",
        defaultDescription: "Everything is Private And Safe — privacy-first communication and confidential digital workspace platform built with strict data security safeguards.",
        tags: ["Privacy", "Encrypted", "Confidential", "Security"],
        badge: "PRIVATE & SAFE",
        link: "https://mrs-pcn.ai.studio/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrs-pcn.ai.studio%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} provides a privacy-first communications and confidential workspace environment where everything stays private and protected.`,
      },
      {
        matchKeys: ["mrmahbubur.github.io/camellia-shop", "camellia-shop.onrender.com"],
        id: "proj-5-shop",
        defaultTitle: "Camellia Shop",
        category: "Global E-Commerce Storefront",
        defaultDescription: "Global E-commerce Site, For making life easier — curated online shopping platform offering everyday essentials, accessories, and trending goods with streamlined checkout.",
        tags: ["E-Commerce", "Global Store", "Curated Goods", "Online Shopping"],
        badge: "E-COMMERCE",
        link: "https://mrmahbubur.github.io/Camellia-Shop/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FCamellia-Shop%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} is M R S's global e-commerce storefront designed to make everyday shopping simpler with curated essentials and accessories.`,
      },
      {
        matchKeys: ["mrmahbubur.github.io/charity-foundation", "charity-foundation-pyj9.onrender.com", "mrscharityfoundation.blogspot.com"],
        id: "proj-6-charity",
        defaultTitle: "Charity Project",
        category: "Humanitarian Non-Profit",
        defaultDescription: "A Future Project Built on Compassion. Dedicated to transforming lives through healthcare, education, shelter, and empowerment for communities in need.",
        tags: ["Non-Profit", "Healthcare", "Education", "Shelter Support"],
        badge: "FOUNDATION",
        link: "https://mrmahbubur.github.io/Charity-Foundation/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FCharity-Foundation%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} is a compassionate humanitarian foundation dedicated to healthcare, education, shelter, and empowerment for communities in need.`,
      },
      {
        matchKeys: ["mrxshahin.blogspot.com"],
        id: "proj-7-blogger",
        defaultTitle: "BLOGGER",
        category: "Tech Blog",
        defaultDescription: "Practical fixes and step-by-step guides for everyday tech problems — Windows, Android, WiFi, browsers, and more. Clear solutions with step-by-step guidance.",
        tags: ["Technical Writing", "IT Support", "Guides", "Troubleshooting"],
        badge: "TECH BLOG",
        link: "https://mrxshahin.blogspot.com/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrxshahin.blogspot.com%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} is M R S's long-running technology blog since 2018, offering practical fixes for Windows, Android, Wi-Fi, and browsers.`,
      },
      {
        matchKeys: ["mrmahbubur.github.io/camellia-ai", "camellia-ai.onrender.com"],
        id: "proj-8-camellia-ai",
        defaultTitle: "Camellia Ai",
        category: "Interactive AI Assistant Platform",
        defaultDescription: "Dedicated interactive conversational AI workspace featuring Camellia — providing multilingual voice guidance, coding support, research, and workflow assistance.",
        tags: ["Artificial Intelligence", "Voice Concierge", "Multilingual", "Automation"],
        badge: "CAMELLIA AI",
        link: "https://mrmahbubur.github.io/Camellia-Ai/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FCamellia-Ai%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} is the dedicated interactive AI platform powered by Camellia, offering coding, research, and multilingual assistance.`,
      },
      {
        matchKeys: ["mrmahbubur.github.io/admin", "admin-maa0.onrender.com", "mrsadmin.blogspot.com"],
        id: "proj-9-cloud",
        defaultTitle: "Cloud",
        category: "Portfolio & Admin Hub",
        defaultDescription: "M R S offers IT support, virtual assistance, data entry, web management, AI solutions, technical writing, CV design, and digital operations.",
        tags: ["Web Hub", "IT Support", "Virtual Assistance", "Digital Ops"],
        badge: "CENTRAL HUB",
        link: "https://mrmahbubur.github.io/Admin/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrmahbubur.github.io%2FAdmin%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} is the central administration and client portal presenting M R S's IT support, data management, and digital operations.`,
      },
      {
        matchKeys: ["mrxshahin.ai.studio"],
        id: "proj-10-ai-portfolio",
        defaultTitle: "Ai Portfolio",
        category: "Multimodal AI Concierge",
        defaultDescription: "M R S AI Assistant is standing by to introduce you, walk through verified professional credentials, and give you an interactive voice-guided tour through all platforms.",
        tags: ["AI Portfolio", "Multimodal", "Voice AI", "Interactive Concierge"],
        badge: "AI PORTFOLIO",
        link: "https://mrxshahin.ai.studio/",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fmrxshahin.ai.studio%2F?w=640",
        getSpeechNarrative: (t: string) => `${t} is this flagship interactive AI portfolio experience, uniting live Gravatar synchronization, voice guidance, and verified credentials.`,
      },
      {
        matchKeys: ["upload-apk.com"],
        id: "proj-iptv-apk",
        defaultTitle: "Android TV Apk",
        category: "Android Package Download",
        defaultDescription: "Download Mrs IPTV APK — 10,000+ Channels, Latest Device Support, Easy Install. High-definition streaming on Android TVs, boxes, and mobile devices.",
        tags: ["Android APK", "Direct Download", "IPTV Player", "Smart TV"],
        badge: "DIRECT APK",
        link: "https://www.upload-apk.com/en/0Jr71hMVlsFwN9Y%20",
        defaultThumbnail: "https://s0.wp.com/mshots/v1/https%3A%2F%2Fwww.upload-apk.com%2Fen%2F0Jr71hMVlsFwN9Y%2520?w=640",
        getSpeechNarrative: (t: string) => `${t} offers direct Android package downloads for mobile devices, tablets, and smart televisions.`,
      },
    ];

    // Helper to ensure each project item has a strictly unique ID
    const ensureUniqueProjectList = (list: any[]) => {
      const seenIds = new Set<string>();
      return list.map((item, idx) => {
        let baseId = item.id || `proj-${idx + 1}`;
        let uniqueId = baseId;
        let counter = 2;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${baseId}-${counter}`;
          counter++;
        }
        seenIds.add(uniqueId);
        return {
          ...item,
          id: uniqueId,
        };
      });
    };

    const normalizeUrl = (u: string) => (u || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");

    const isSocialOrAccountUrl = (url: string) => {
      const norm = normalizeUrl(url);
      return ["x.com", "twitter.com", "linkedin.com", "github.com/", "bsky.app", "goodreads.com", "calendly.com", "gravatar.com"].some((s) =>
        s === "github.com/" ? (norm === "github.com/mrmahbubur") : norm.includes(s)
      );
    };

    const selfHostCandidates = [
      "mrxshahin.ai.studio",
      "ais-dev-kvr65sziiqaqoqlwvajinm-369506879239.asia-southeast1.run.app",
      "ais-pre-kvr65sziiqaqoqlwvajinm-369506879239.asia-southeast1.run.app",
      ...[process.env.APP_URL, process.env.SHARED_APP_URL, process.env.RENDER_EXTERNAL_URL]
        .filter((u): u is string => Boolean(u))
        .map((u) => normalizeUrl(u)),
    ].filter(Boolean);

    const isSelfSiteUrl = (url: string, title?: string) => {
      const norm = normalizeUrl(url);
      const cleanTitle = (title || "").trim().toLowerCase();
      if (cleanTitle === "ai portfolio") return true;
      return selfHostCandidates.some((host) => host && (norm === host || norm.startsWith(`${host}/`) || norm.includes(host)));
    };

    const resolveDescription = (rawDesc: string, matchedDef: any, title: string) => {
      const cleanRaw = (rawDesc || "").replace(/^["“]|["”]$/g, "").trim();
      const isTruncated = cleanRaw.endsWith("...") || cleanRaw.endsWith("…");
      if (cleanRaw && !isTruncated) {
        return cleanRaw;
      }
      if (matchedDef) {
        return matchedDef.defaultDescription;
      }
      return cleanRaw || `Official verified platform for ${title} maintained by M R S.`;
    };

    // 1. Live scraped links from Gravatar profile HTML (contains exact order, titles, URLs, descriptions, thumbnails)
    if (scrapedLinks && scrapedLinks.length > 0) {
      const resultProjects = [];

      for (let i = 0; i < scrapedLinks.length; i++) {
        const item = scrapedLinks[i];
        const normItemUrl = normalizeUrl(item.link);
        if (isSocialOrAccountUrl(item.link) || isSelfSiteUrl(item.link, item.title)) continue;

        const matchedDef = canonicalPlatformDefinitions.find((def) => {
          const normDef = normalizeUrl(def.link);
          return normDef === normItemUrl || def.matchKeys.some((k) => normItemUrl.includes(k));
        });

        const rawLiveTitle =
          item.title && item.title.trim() && item.title.toLowerCase() !== "website"
            ? item.title.trim()
            : matchedDef
            ? matchedDef.defaultTitle
            : `Platform ${resultProjects.length + 1}`;
        const liveTitle = cleanProjectHeading(rawLiveTitle) || rawLiveTitle;
        const liveDescription = resolveDescription(item.description, matchedDef, liveTitle);

        if (matchedDef) {
          resultProjects.push({
            id: matchedDef.id,
            title: liveTitle,
            category: matchedDef.category,
            description: liveDescription,
            tags: matchedDef.tags,
            badge: matchedDef.badge,
            link: item.link || matchedDef.link,
            customThumbnail: item.thumbnail || matchedDef.defaultThumbnail,
            speechNarrative: matchedDef.getSpeechNarrative(liveTitle),
            verified: true,
            source: "gravatar_sync",
          });
        } else {
          resultProjects.push({
            id: `proj-custom-${resultProjects.length + 1}`,
            title: liveTitle,
            category: "Verified Online Platform",
            description: liveDescription,
            tags: ["Web", "Verified Link", "Live Sync"],
            badge: "PLATFORM",
            link: item.link,
            customThumbnail: item.thumbnail || `https://s0.wp.com/mshots/v1/${encodeURIComponent(item.link)}?w=640`,
            speechNarrative: `Here is ${liveTitle}, an official verified platform linked directly in M R S's profile: ${liveDescription}`,
            verified: true,
            source: "gravatar_sync",
          });
        }
      }

      if (resultProjects.length > 0) {
        return ensureUniqueProjectList(resultProjects);
      }
    }

    // 2. Fallback: API links/urls/websites if HTML scrape unavailable
    const incomingApiLinks: any[] = [];
    if (Array.isArray(entryData.links)) incomingApiLinks.push(...entryData.links);
    if (Array.isArray(entryData.urls)) incomingApiLinks.push(...entryData.urls);
    if (Array.isArray(entryData.websites)) incomingApiLinks.push(...entryData.websites);

    if (incomingApiLinks.length > 0) {
      const filteredProjects = [];

      for (let i = 0; i < incomingApiLinks.length; i++) {
        const item = incomingApiLinks[i];
        const itemUrl = item.value || item.url || item.link || (typeof item === "string" ? item : "");
        const incomingTitle = item.title || item.name || item.display || item.label || "";
        if (!itemUrl || isSocialOrAccountUrl(itemUrl) || isSelfSiteUrl(itemUrl, incomingTitle)) continue;
        const normItemUrl = normalizeUrl(itemUrl);
        const matchedDef = canonicalPlatformDefinitions.find((def) => {
          const normDef = normalizeUrl(def.link);
          return normDef === normItemUrl || def.matchKeys.some((k) => normItemUrl.includes(k));
        });

        const rawLiveTitle =
          incomingTitle && incomingTitle.trim() && incomingTitle.toLowerCase() !== "website"
            ? incomingTitle.trim()
            : matchedDef
            ? matchedDef.defaultTitle
            : `Platform ${filteredProjects.length + 1}`;
        const liveTitle = cleanProjectHeading(rawLiveTitle) || rawLiveTitle;
        const liveDescription = resolveDescription(item.description || "", matchedDef, liveTitle);

        if (matchedDef) {
          filteredProjects.push({
            id: matchedDef.id,
            title: liveTitle,
            category: item.category || matchedDef.category,
            description: liveDescription,
            tags: matchedDef.tags,
            badge: item.badge || matchedDef.badge,
            link: itemUrl || matchedDef.link,
            customThumbnail: item.thumbnail || matchedDef.defaultThumbnail,
            speechNarrative: matchedDef.getSpeechNarrative(liveTitle),
            verified: true,
            source: "gravatar_api",
          });
        } else {
          filteredProjects.push({
            id: `proj-custom-${filteredProjects.length + 1}`,
            title: liveTitle,
            category: item.category || "Verified Online Platform",
            description: liveDescription,
            tags: ["Web", "Verified Link", "Live Sync"],
            badge: item.badge || "PLATFORM",
            link: itemUrl,
            customThumbnail: item.thumbnail || `https://s0.wp.com/mshots/v1/${encodeURIComponent(itemUrl)}?w=640`,
            speechNarrative: `Here is ${liveTitle}, an official verified platform linked directly in M R S's profile: ${liveDescription}`,
            verified: true,
            source: "gravatar_api",
          });
        }
      }

      if (filteredProjects.length > 0) {
        return ensureUniqueProjectList(filteredProjects);
      }
    }

    // 3. Offline curated baseline (9 active external Gravatar platforms, excluding self site)
    return canonicalPlatformDefinitions
      .filter((def) => def.id !== "proj-iptv-apk" && def.id !== "proj-10-ai-portfolio")
      .map((def) => ({
        id: def.id,
        title: def.defaultTitle,
        category: def.category,
        description: def.defaultDescription,
        tags: def.tags,
        badge: def.badge,
        link: def.link,
        customThumbnail: def.defaultThumbnail,
        speechNarrative: def.getSpeechNarrative(def.defaultTitle),
        verified: true,
        source: "verified_profile",
      }));
  }

  const mergedApiEntry = {
    ...v2Entry,
    ...v3Entry,
  };

  const standardProjects = buildDynamicProjectsAndPlatforms(mergedApiEntry, liveScrapedLinks);

  if (!gravatarData && liveScrapedLinks.length === 0) {
    if (latestGravatarCache?.profile) {
      return {
        ...latestGravatarCache,
        source: "cached_memory",
        syncedAt: new Date().toISOString(),
      };
    }

    const exactGravatarBio = `*IT Support Professional | Web Manager | Digital Entrepreneur | Content Creator*

I'm a dedicated IT support and administrative professional with a strong technical foundation and a genuine passion for solving problems. My expertise centers on Microsoft Office applications, document management, job application processing, and professional email correspondence — skills I apply with precision, patience, and reliability, backed by a solid understanding of system troubleshooting.

**A Career Built on Remote Independence**
Much of my professional journey has unfolded in the digital-first world of remote work. Across various online platforms, I've built a reputation for adaptability, self-motivation, and consistent, high-quality delivery — even without the structure of a traditional office. This experience has shaped how I work today: independently, efficiently, and always with an eye toward continuous improvement.

**A Multi-Platform Digital Presence**
Beyond individual client work, I manage and grow a portfolio of active online projects, each reflecting a different facet of my interests and expertise:
- **Portfolio & Web Hub** — Central home for projects, showcasing work as an entrepreneur, web manager, and content creator.
- **Tech Blog (Blogger)** — Practical fixes and step-by-step guides for everyday tech problems.
- **Mrs IPTV (Web & App)** — Flagship entertainment platform delivering 10,000+ live channels with a Premium ad-free tier.
- **MRS Store** — E-commerce venture with quality trending fashion and mobile accessories.
- **MRS Charity Foundation (upcoming)** — Future project transforming lives through healthcare, education, and shelter.

**Technology, Curiosity & Continuous Learning**
Passionate about emerging tech across web development, Web3, cybersecurity defense, and social sciences.

**A Writer Since 2018**
Active blogger on WordPress and Blogspot since 2018 sharing insights and tutorials.

**Professionalism as a Standard, Not an Exception**
Professionalism, patience, and dedication in every interaction and deliverable.`;

    return {
      success: true,
      source: "fallback_cache",
      syncedAt: new Date().toISOString(),
      profile: {
        ownerName: "M R S",
        displayName: "M R S",
        username: "mrxshahin",
        roleTitle: "IT Support Professional | Remote Admin & Documentation Specialist | Web Manager | Helping businesses run smoother, one ticket at a time",
        location: "Global / Remote",
        avatarUrl: defaultAvatarUrl,
        gravatarBio: exactGravatarBio,
        projects: standardProjects,
        socials: {
          email: "mr216873@gmail.com",
          phone: "+8809611056361",
          calendlyUrl: "https://calendly.com/mrxshahin",
          linkedinUrl: "https://www.linkedin.com/in/mrmahbubur",
          githubUrl: "https://github.com/mrmahbubur",
          xUrl: "https://x.com/Mrshahinx",
          blueskyUrl: "https://bsky.app/profile/mrxshahin.bsky.social",
          wordpressUrl: "https://mrxshahin.wordpress.com",
          contactForm: "https://mrsadmin.blogspot.com/p/contact-us.html?m=1",
          goodreadsUrl: "https://goodreads.com",
          gravatarUrl: "https://gravatar.com/mrxshahin",
        },
      },
    };
  }

  const entry = mergedApiEntry;

  const rawBio =
    entry.description ||
    entry.aboutMe ||
    entry.about_me ||
    entry.bio ||
    `*IT Support Professional | Web Manager | Digital Entrepreneur | Content Creator*

I'm a dedicated IT support and administrative professional with a strong technical foundation and a genuine passion for solving problems. My expertise centers on Microsoft Office applications, document management, job application processing, and professional email correspondence — skills I apply with precision, patience, and reliability, backed by a solid understanding of system troubleshooting.`;

  const rawLocation =
    entry.location ||
    entry.currentLocation ||
    "Global / Remote";

  let avatarUrl = defaultAvatarUrl;
  if (entry.avatar_url) {
    avatarUrl = entry.avatar_url.includes("?") ? `${entry.avatar_url}&size=512` : `${entry.avatar_url}?size=512`;
  } else if (entry.thumbnailUrl) {
    avatarUrl = entry.thumbnailUrl.includes("?") ? `${entry.thumbnailUrl}&size=512` : `${entry.thumbnailUrl}?size=512`;
  } else if (Array.isArray(entry.photos) && entry.photos.length > 0 && entry.photos[0].value) {
    avatarUrl = entry.photos[0].value.includes("?") ? `${entry.photos[0].value}&size=512` : `${entry.photos[0].value}?size=512`;
  }

  const socials: Record<string, string> = {
    email: emailClean,
    gravatarUrl: `https://gravatar.com/${username}`,
    xUrl: "https://x.com/Mrshahinx",
    githubUrl: "https://github.com/mrmahbubur",
    linkedinUrl: "https://www.linkedin.com/in/mrmahbubur",
    blueskyUrl: "https://bsky.app/profile/mrxshahin.bsky.social",
    calendlyUrl: "https://calendly.com/mrxshahin",
    wordpressUrl: "https://mrxshahin.wordpress.com",
    contactForm: "https://mrsadmin.blogspot.com/p/contact-us.html?m=1",
    phone: "+8809611056361",
  };

  if (entry.contact_info) {
    if (entry.contact_info.cell_phone) socials.phone = entry.contact_info.cell_phone;
    if (entry.contact_info.calendar) socials.calendlyUrl = entry.contact_info.calendar;
    if (entry.contact_info.email) socials.email = entry.contact_info.email;
    if (entry.contact_info.contact_form) socials.contactForm = entry.contact_info.contact_form;
  }

  if (Array.isArray(entry.contactInfo)) {
    for (const c of entry.contactInfo) {
      if (c.type === "contactform" && c.value) socials.contactForm = c.value;
      if (c.type === "calendar" && c.value) socials.calendlyUrl = c.value;
    }
  }

  if (Array.isArray(entry.phoneNumbers) && entry.phoneNumbers.length > 0) {
    socials.phone = entry.phoneNumbers[0].value || socials.phone;
  }

  // Merge verified accounts cleanly across v3, v2, and HTML without duplicates
  const mergedVerifiedAccounts: Array<{ service_type: string; service_label: string; shortname: string; name: string; url: string; service_icon?: string }> = [];
  const seenAccountKeys = new Set<string>();
  const pushVerifiedAccount = (serviceType: string, serviceLabel: string, url: string, serviceIcon?: string) => {
    if (!url) return;
    const normUrl = url.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
    let typeKey = (serviceType || serviceLabel || "").toLowerCase();
    if (typeKey === "twitter" || normUrl.startsWith("x.com/") || normUrl.startsWith("twitter.com/")) {
      typeKey = "x";
    }
    if (seenAccountKeys.has(normUrl) || (typeKey && seenAccountKeys.has(`type:${typeKey}`))) return;
    seenAccountKeys.add(normUrl);
    if (typeKey) seenAccountKeys.add(`type:${typeKey}`);
    mergedVerifiedAccounts.push({
      service_type: serviceType,
      service_label: serviceLabel,
      shortname: serviceType,
      name: serviceLabel,
      url,
      ...(serviceIcon ? { service_icon: serviceIcon } : {}),
    });

    if (typeKey.includes("twitter") || typeKey === "x") socials.xUrl = url;
    if (typeKey.includes("github")) socials.githubUrl = url;
    if (typeKey.includes("linkedin")) socials.linkedinUrl = url;
    if (typeKey.includes("bluesky") || typeKey.includes("bsky")) socials.blueskyUrl = url;
    if (typeKey.includes("wordpress")) socials.wordpressUrl = url;
    if (typeKey.includes("goodreads")) socials.goodreadsUrl = url;
  };

  const v3Verified = entry.verified_accounts || entry.verifiedAccounts || [];
  if (Array.isArray(v3Verified)) {
    for (const va of v3Verified) {
      pushVerifiedAccount(
        String(va.service_type || va.service_label || "web").toLowerCase(),
        String(va.service_label || va.service_type || "Verified"),
        String(va.url || ""),
        va.service_icon
      );
    }
  }
  if (Array.isArray(entry.accounts)) {
    for (const acc of entry.accounts) {
      pushVerifiedAccount(
        String(acc.shortname || acc.domain || acc.name || "web").toLowerCase(),
        String(acc.name || acc.shortname || "Verified"),
        String(acc.url || ""),
        acc.iconUrl
      );
    }
  }
  for (const va of htmlVerifiedAccounts) {
    pushVerifiedAccount(va.service_type, va.service_label, va.url);
  }

  // Normalize interests into clean string[] (from API + HTML g-profile__interests-list)
  const formatInterestLabel = (raw: string): string => {
    const clean = raw.trim();
    if (!clean) return "";
    if (clean.toLowerCase() === "web3") return "Web3";
    if (clean.toLowerCase() === "ethical hacking") return "Ethical Hacking";
    return clean;
  };

  const rawInterestsList: string[] = [];
  if (Array.isArray(entry.interests)) {
    for (const item of entry.interests) {
      const label = typeof item === "string" ? item : (item?.name || item?.slug || "");
      const formatted = formatInterestLabel(String(label || ""));
      if (formatted) rawInterestsList.push(formatted);
    }
  }
  for (const hInt of htmlInterests) {
    const formatted = formatInterestLabel(hInt);
    if (formatted && !rawInterestsList.some((x) => x.toLowerCase() === formatted.toLowerCase())) {
      rawInterestsList.push(formatted);
    }
  }
  const normalizedInterests =
    rawInterestsList.length > 0
      ? rawInterestsList
      : ["Web Development", "Web3", "Ethical Hacking", "Social Sciences", "Remote Working"];

  const roleTitle =
    entry.job_title ||
    entry.jobTitle ||
    entry.headline ||
    "IT Support Professional | Remote Admin & Documentation Specialist | Web Manager | Helping businesses run smoother, one ticket at a time";

  // Extract crypto wallets from currency or crypto_wallets array in Gravatar
  const cryptoWallets: { type: string; address: string }[] = [];
  if (Array.isArray(entry.currency)) {
    for (const c of entry.currency) {
      if (c.value && c.type) {
        const typeNormalized = c.type.toUpperCase();
        if (!cryptoWallets.some((w) => w.type === typeNormalized || (w.type === "BTC" && typeNormalized === "BITCOIN") || (w.type === "LTC" && typeNormalized === "LITECOIN"))) {
          cryptoWallets.push({
            type: typeNormalized === "BITCOIN" ? "BTC" : typeNormalized === "LITECOIN" ? "LTC" : typeNormalized,
            address: c.value,
          });
        }
      }
    }
  } else if (Array.isArray(entry.crypto_wallets)) {
    for (const w of entry.crypto_wallets) {
      if (w.address && w.currency) {
        cryptoWallets.push({
          type: String(w.currency).toUpperCase(),
          address: w.address,
        });
      }
    }
  }

  // Extract header image and background styling
  let headerImage = "";
  if (typeof entry.header_image === "string" && entry.header_image) {
    const match = entry.header_image.match(/url\(['"]?([^'"]+)['"]?\)/i);
    headerImage = match ? match[1] : entry.header_image;
  } else if (entry.profileBackground?.url) {
    headerImage = entry.profileBackground.url;
  } else if (entry.header_image?.image_id) {
    headerImage = `https://1.gravatar.com/userimage/140624186/${entry.header_image.image_id}?size=1024`;
  }

  const backgroundColor =
    entry.background_color ||
    entry.profileBackground?.color ||
    "linear-gradient(138deg, rgba(15, 44, 133, 1) 0%, rgba(142, 48, 112) 55%, rgba(71, 34, 44, 1) 100%)";

  const decodedBio = decodeHtmlEntities(rawBio);

  const parsedProfile = {
    ownerName: "M R S",
    displayName: entry.display_name || entry.displayName || "M R S",
    username: entry.preferredUsername || username,
    roleTitle,
    location: rawLocation,
    avatarUrl,
    gravatarBio: decodedBio,
    certification: entry.certification || "360-Hour Certified Computer Specialist & MS Office Professional",
    projects: standardProjects,
    platforms: standardProjects,
    socials: {
      email: socials.email || "mr216873@gmail.com",
      phone: socials.phone || "+8809611056361",
      calendlyUrl: socials.calendlyUrl || "https://calendly.com/mrxshahin",
      linkedinUrl: socials.linkedinUrl || "https://www.linkedin.com/in/mrmahbubur",
      githubUrl: socials.githubUrl || "https://github.com/mrmahbubur",
      xUrl: socials.xUrl || "https://x.com/Mrshahinx",
      blueskyUrl: socials.blueskyUrl || "https://bsky.app/profile/mrxshahin.bsky.social",
      wordpressUrl: socials.wordpressUrl || "https://mrxshahin.wordpress.com",
      contactForm: socials.contactForm || "https://mrsadmin.blogspot.com/p/contact-us.html?m=1",
      ...(socials.goodreadsUrl ? { goodreadsUrl: socials.goodreadsUrl } : {}),
      gravatarUrl: `https://gravatar.com/${username}`,
    },
    verifiedAccounts: mergedVerifiedAccounts.length > 0 ? mergedVerifiedAccounts : [
      { service_type: "twitter", service_label: "X", url: "https://x.com/Mrshahinx" },
      { service_type: "github", service_label: "GitHub", url: "https://github.com/mrmahbubur" },
      { service_type: "bluesky", service_label: "Bluesky", url: "https://bsky.app/profile/mrxshahin.bsky.social" },
      { service_type: "linkedin", service_label: "LinkedIn", url: "https://www.linkedin.com/in/mrmahbubur" },
      { service_type: "wordpress", service_label: "WordPress", url: "https://mrxshahin.wordpress.com" },
    ],
    interests: normalizedInterests,
    headerImage: headerImage || "https://1.gravatar.com/userimage/140624186/eb80b95de8da05aca3d1b6e47836f736?size=1024",
    backgroundColor,
    cryptoWallets: cryptoWallets.length > 0 ? cryptoWallets : [
      { type: "BTC", address: "bc1pm7nkt7hrl8q9uhunu0y92nsrmjsprqet0rv7pvjug5lvksvngc3srjj9dr" },
      { type: "LTC", address: "ltc1qx32xcdc625w25kt6hdn2e9jkavau65ss7h7y5a" },
    ],
    personalDetails: {
      dateOfBirth: "23/07/2002",
      nationality: "Bangladeshi",
      religion: "Islam",
      address: "Bharera, Tajpur-3123, Osmani Nagar, Sylhet",
    },
    whatICanHelpWith: buildRealTimeCvContent({
      roleTitle,
      location: rawLocation,
      gravatarBio: decodedBio,
      interests: normalizedInterests,
      projects: standardProjects,
    }).whatICanHelpWith,
    education: [
      {
        degree: "Bachelor of Social Science",
        institution: "Sylhet Government College, Sylhet",
        period: "Jan 2021 – Present",
      },
      {
        degree: "Higher Secondary Certificate (HSC)",
        institution: "Tajpur Degree College, Sylhet",
        period: "Jan 2019 – Dec 2020",
        gpa: "GPA: 3.33",
      },
      {
        degree: "Secondary School Certificate (SSC)",
        institution: "Mongol Chondi Nishikanto High School, Sylhet",
        period: "Jan 2017 – Dec 2018",
        gpa: "GPA: 3.39",
      },
    ],
    languages: [
      { name: "English", level: "Conversational" },
      { name: "Hindi", level: "Basic" },
      { name: "Bengali", level: "Native" },
    ],
    coursesCertifications: [
      "Basic Computer Course (360 Hrs)",
      "Android Hardware Repair",
      "IELTS — Band 5.5",
    ],
  };

  return {
    success: true,
    authenticated: Boolean(gravatarApiKey && gravatarApiKey !== "MY_GRAVATAR_API_KEY"),
    source: "gravatar_live",
    endpoint: fetchedFromUrl,
    syncedAt: new Date().toISOString(),
    profile: parsedProfile,
  };
}

// Continuous Background Daemon Worker Execution Cycle
async function executeGravatarAutoSyncCycle() {
  try {
    const data = await fetchFreshGravatarProfile("mrxshahin", "mr216873@gmail.com");
    if (data && data.profile) {
      syncCycleCount += 1;
      lastSyncTimestamp = new Date().toISOString();
      const currentHash = JSON.stringify(data.profile);

      const hasChanged = currentHash !== lastDataHash;
      latestGravatarCache = {
        ...data,
        syncedAt: lastSyncTimestamp,
        syncCycleCount,
        backgroundSyncActive: true,
      };

      if (hasChanged) {
        lastDataHash = currentHash;
        lastChangeDetectedAt = lastSyncTimestamp;
        console.log(`[Gravatar Daemon] Profile update detected at cycle #${syncCycleCount}. Broadcasting to ${activeSseClients.size} client(s).`);
        broadcastToSseClients("profile_update", latestGravatarCache);
      } else {
        broadcastToSseClients("heartbeat", {
          status: "connected",
          syncCycleCount,
          lastSyncAt: lastSyncTimestamp,
          activeClients: activeSseClients.size,
        });
      }
    }
  } catch (err) {
    console.warn("[Gravatar Daemon] Background sync warning (retrying automatically):", err);
  }
}

// Start Autonomous Background Gravatar Auto-Sync Daemon
function startGravatarAutoSyncDaemon(intervalMs = 10000) {
  if (isAutoSyncRunning) return;
  isAutoSyncRunning = true;
  console.log(`[Gravatar Daemon] Starting 24/7 autonomous Gravatar auto-sync daemon (polling cadence: ${intervalMs / 1000}s).`);

  // Immediate startup sync
  executeGravatarAutoSyncCycle();

  // Continuous background auto-sync loop
  setInterval(() => {
    executeGravatarAutoSyncCycle();
  }, intervalMs);
}

// Gravatar Live Sync Endpoint (Instantly returns cached fresh data, triggers update)
app.get("/api/gravatar", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    const force = req.query.force === "true";
    const username = (req.query.username as string) || "mrxshahin";
    const email = (req.query.email as string) || "mr216873@gmail.com";

    if (force || !latestGravatarCache) {
      const freshData = await fetchFreshGravatarProfile(username, email);
      latestGravatarCache = {
        ...freshData,
        syncedAt: new Date().toISOString(),
        syncCycleCount,
        backgroundSyncActive: true,
      };
    }

    res.json({
      ...latestGravatarCache,
      backgroundDaemonActive: true,
      syncCycleCount,
      lastChangeDetectedAt: lastChangeDetectedAt || latestGravatarCache?.syncedAt,
    });
  } catch (error: any) {
    if (latestGravatarCache) {
      return res.json({
        ...latestGravatarCache,
        backgroundDaemonActive: true,
        warning: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: error.message,
      syncedAt: new Date().toISOString(),
    });
  }
});

// Explicit Force Sync & Refresh Routes (GET and POST)
app.all(["/api/gravatar/sync", "/api/gravatar/refresh", "/api/gravatar/webhook"], async (req, res) => {
  try {
    const username = (req.query.username as string) || (req.body && req.body.username) || "mrxshahin";
    const email = (req.query.email as string) || (req.body && req.body.email) || "mr216873@gmail.com";
    const freshData = await fetchFreshGravatarProfile(username, email);
    if (freshData && freshData.profile) {
      syncCycleCount += 1;
      lastSyncTimestamp = new Date().toISOString();
      lastChangeDetectedAt = lastSyncTimestamp;
      latestGravatarCache = {
        ...freshData,
        syncedAt: lastSyncTimestamp,
        syncCycleCount,
        backgroundSyncActive: true,
      };
      broadcastToSseClients("profile_update", latestGravatarCache);
    }
    res.json({
      success: true,
      message: "Gravatar API instant update executed and broadcasted successfully",
      syncCycleCount,
      syncedAt: lastSyncTimestamp,
      profile: latestGravatarCache?.profile,
      activeSseClients: activeSseClients.size,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gravatar Status Endpoint
app.get("/api/gravatar/status", (req, res) => {
  res.json({
    success: true,
    backgroundDaemonActive: isAutoSyncRunning,
    syncCadenceSeconds: 8,
    syncCycleCount,
    lastSyncTimestamp,
    lastChangeDetectedAt,
    activeSseSubscribers: activeSseClients.size,
    cachedProfileName: latestGravatarCache?.profile?.displayName || "M R S",
    verifiedAccountsCount: latestGravatarCache?.profile?.verifiedAccounts?.length || 0,
    featuredProjectsCount: latestGravatarCache?.profile?.projects?.length || 0,
  });
});

// Real-time Featured Projects Endpoint
app.get("/api/gravatar/projects", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const projects = latestGravatarCache?.profile?.projects || [];
  res.json({
    success: true,
    total: projects.length,
    projects,
    syncedAt: latestGravatarCache?.syncedAt || new Date().toISOString(),
    syncCycleCount,
    backgroundDaemonActive: true,
  });
});

// Real-time Featured Platforms Endpoint
app.get("/api/gravatar/platforms", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const platforms = latestGravatarCache?.profile?.platforms || latestGravatarCache?.profile?.projects || [];
  res.json({
    success: true,
    total: platforms.length,
    platforms,
    syncedAt: latestGravatarCache?.syncedAt || new Date().toISOString(),
    syncCycleCount,
    backgroundDaemonActive: true,
  });
});

// Gravatar Real-time Server-Sent Events (SSE) Stream
// Subscribes clients directly to the continuous backend auto-sync loop
app.get("/api/gravatar/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  activeSseClients.add(res);

  // Send current cached profile immediately upon connecting
  if (latestGravatarCache) {
    res.write(`event: profile_update\ndata: ${JSON.stringify(latestGravatarCache)}\n\n`);
  } else {
    // Trigger immediate background sync if cold
    executeGravatarAutoSyncCycle();
  }

  req.on("close", () => {
    activeSseClients.delete(res);
  });
});

// Live Synchronized CV Data Endpoint
app.get("/api/cv-data", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";
  await ensureFreshGravatarCache(forceRefresh);
  const cvData = getLiveProfileForCv();

  res.json({
    success: true,
    cvData,
  });
});

// Helper function to build live profile for CV compiler (preserves Contact, Languages, Certifications, Personal Details, and Education)
function getLiveProfileForCv(): any {
  const cachedProfile = latestGravatarCache?.profile || {};
  const liveCv = buildRealTimeCvContent({
    roleTitle: cachedProfile.roleTitle,
    location: cachedProfile.location,
    gravatarBio: cachedProfile.gravatarBio,
    skills: cachedProfile.skills,
    interests: cachedProfile.interests,
    whatICanHelpWith: cachedProfile.whatICanHelpWith,
    projects: cachedProfile.projects,
  });

  return {
    fullName: "MAHBUBUR RAHMAN SHAHIN",
    ownerName: cachedProfile.ownerName || "M R S",
    displayName: cachedProfile.displayName || "M R S",
    roleTitle: cachedProfile.roleTitle || "IT Support Professional | Remote Admin & Documentation Specialist | Web Manager | Helping businesses run smoother, one ticket at a time",
    location: cachedProfile.location || "Global / Remote",
    avatarUrl: cachedProfile.avatarUrl || "/mrs_profile_avatar.jpg",
    gravatarBio: cachedProfile.gravatarBio || "",
    contact: {
      email: cachedProfile.socials?.email || "mr216873@gmail.com",
      phone: cachedProfile.socials?.phone || "+880 961 105 6361",
      gravatarUrl: "gravatar.com/mrxshahin",
    },
    skills: liveCv.coreSkills,
    languages: [
      { name: "English", level: "Conversational" },
      { name: "Hindi", level: "Basic" },
      { name: "Bengali", level: "Native" },
    ],
    coursesCertifications: [
      "Basic Computer Course (360 Hrs)",
      "Android Hardware Repair",
      "IELTS — Band 5.5",
    ],
    interests: liveCv.interests,
    personalDetails: {
      dateOfBirth: "23/07/2002",
      nationality: "Bangladeshi",
      religion: "Islam",
    },
    whatICanHelpWith: liveCv.whatICanHelpWith,
    projects: cachedProfile.projects || [],
    education: [
      {
        degree: "Bachelor of Social Science",
        institution: "Sylhet Government College, Sylhet",
        period: "Jan 2021 – Present",
      },
      {
        degree: "Higher Secondary Certificate (HSC)",
        institution: "Tajpur Degree College, Sylhet",
        period: "Jan 2019 – Dec 2020",
        gpa: "GPA: 3.33",
      },
      {
        degree: "Secondary School Certificate (SSC)",
        institution: "Mongol Chondi Nishikanto High School, Sylhet",
        period: "Jan 2017 – Dec 2018",
        gpa: "GPA: 3.39",
      },
    ],
    syncedAt: latestGravatarCache?.syncedAt || new Date().toISOString(),
  };
}

// Format Fixed CV Filename
function getCvFilename(): string {
  return "M R S CV.pdf";
}

// User-Agent & Device Parser
function parseUserAgentDetails(ua: string) {
  let os = "Unknown OS";
  let deviceType = "Desktop";
  let browser = "Unknown Browser";

  if (!ua) {
    return { os: "Unknown OS", deviceType: "Unknown Device", browser: "Unknown Browser" };
  }

  if (/windows phone/i.test(ua)) {
    os = "Windows Phone";
    deviceType = "Mobile (Windows Phone)";
  } else if (/win(dows|98|nt|ce|32|64)/i.test(ua)) {
    if (/windows nt 10\.0/i.test(ua) || /windows nt 10/i.test(ua)) os = "Windows 10 / 11";
    else if (/windows nt 6.3/i.test(ua)) os = "Windows 8.1";
    else if (/windows nt 6.2/i.test(ua)) os = "Windows 8";
    else if (/windows nt 6.1/i.test(ua)) os = "Windows 7";
    else os = "Windows";
    deviceType = "Desktop / Laptop (PC)";
  } else if (/iphone/i.test(ua)) {
    const match = ua.match(/OS (\d+[_\d]*)/);
    os = match ? `iOS ${match[1].replace(/_/g, ".")}` : "iOS";
    deviceType = "Mobile (Apple iPhone)";
  } else if (/ipad/i.test(ua)) {
    const match = ua.match(/OS (\d+[_\d]*)/);
    os = match ? `iPadOS ${match[1].replace(/_/g, ".")}` : "iPadOS";
    deviceType = "Tablet (Apple iPad)";
  } else if (/android/i.test(ua)) {
    const match = ua.match(/Android\s+([0-9.]+)/i);
    os = match ? `Android ${match[1]}` : "Android";
    deviceType = /mobile/i.test(ua) ? "Mobile (Android Phone)" : "Tablet (Android)";
  } else if (/macintosh|mac os x/i.test(ua)) {
    const match = ua.match(/Mac OS X\s+([0-9_]+)/i);
    os = match ? `macOS ${match[1].replace(/_/g, ".")}` : "macOS";
    deviceType = "Desktop / Laptop (Mac)";
  } else if (/cros/i.test(ua)) {
    os = "ChromeOS";
    deviceType = "Chromebook / Laptop";
  } else if (/linux/i.test(ua)) {
    os = "Linux";
    deviceType = "Desktop / Server (Linux)";
  }

  if (/edg\//i.test(ua)) {
    const m = ua.match(/edg\/([0-9.]+)/i);
    browser = `Microsoft Edge ${m ? m[1] : ""}`;
  } else if (/opr\/|opera/i.test(ua)) {
    const m = ua.match(/(?:opr|opera)\/([0-9.]+)/i);
    browser = `Opera ${m ? m[1] : ""}`;
  } else if (/samsungbrowser/i.test(ua)) {
    const m = ua.match(/samsungbrowser\/([0-9.]+)/i);
    browser = `Samsung Internet ${m ? m[1] : ""}`;
  } else if (/chrome|crios/i.test(ua)) {
    const m = ua.match(/(?:chrome|crios)\/([0-9.]+)/i);
    browser = `Google Chrome ${m ? m[1] : ""}`;
  } else if (/firefox|fxios/i.test(ua)) {
    const m = ua.match(/(?:firefox|fxios)\/([0-9.]+)/i);
    browser = `Mozilla Firefox ${m ? m[1] : ""}`;
  } else if (/safari/i.test(ua)) {
    const m = ua.match(/version\/([0-9.]+)/i);
    browser = `Apple Safari ${m ? m[1] : ""}`;
  }

  return { os, deviceType, browser: browser.trim() };
}

function extractClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string") return realIp.trim();
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string") return cfIp.trim();
  return req.socket.remoteAddress || req.ip || "Unknown IP";
}

// Comprehensive IP Geolocation Lookup Helper
async function resolveGeoIp(ip: string): Promise<any> {
  const cleanIp = ip.split(",")[0].trim().replace(/^::ffff:/, "");
  if (
    !cleanIp ||
    cleanIp === "127.0.0.1" ||
    cleanIp === "::1" ||
    cleanIp.startsWith("10.") ||
    cleanIp.startsWith("192.168.") ||
    cleanIp.startsWith("172.") ||
    cleanIp.toLowerCase().includes("unknown")
  ) {
    return {
      status: "local",
      country: "Local Sandbox / Cloud Environment",
      countryCode: "LOCAL",
      city: "Cloud Run / Sandbox Host",
      regionName: "Development / Container Ingress",
      zip: "N/A",
      isp: "Google Cloud Sandbox Proxy",
      org: "GCP Cloud Run Container",
      as: "Container Network",
      timezone: "UTC",
      query: cleanIp,
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.status === "success") {
        return data;
      }
    }
  } catch {
    // Geo lookup timed out or network isolated
  }

  return {
    status: "unavailable",
    country: "Lookup Offline / Private",
    query: cleanIp,
  };
}

// Global In-Memory Deduplication Cache: Guarantees STRICTLY ONE EMAIL per download session
const recentCvEmailDispatches = new Map<string, number>();

function cleanRecentCvEmailDispatches() {
  const cutoff = Date.now() - 10 * 60 * 1000; // 10 minutes
  for (const [key, timestamp] of recentCvEmailDispatches.entries()) {
    if (timestamp < cutoff) recentCvEmailDispatches.delete(key);
  }
}

// Background Device Telemetry Email Dispatcher for CV Downloads
async function sendCvDownloadNotificationEmail(info: {
  ip: string;
  userAgent: string;
  headers?: Record<string, any>;
  telemetry?: Record<string, any>;
  filename?: string;
  downloadMethod?: string;
  faceCapture?: string;
  docUniqueId?: string;
}) {
  const docUniqueId = info.docUniqueId && info.docUniqueId.trim() ? info.docUniqueId.trim() : generateUniqueCvDocId();

  // Deduplication check: strictly only one email sent per document serial or download session
  cleanRecentCvEmailDispatches();
  if (recentCvEmailDispatches.has(docUniqueId)) {
    console.info(`[CV Download Alert] Email already dispatched for docUniqueId ${docUniqueId}. Skipping duplicate email.`);
    return;
  }
  recentCvEmailDispatches.set(docUniqueId, Date.now());

  const transporter = getSmtpTransporter();
  const destinationEmail = process.env.GMAIL_RECIPIENT || process.env.GMAIL_USER || "mr216873@gmail.com";
  const gmailUser = process.env.GMAIL_USER || "mr216873@gmail.com";
  const parsed = parseUserAgentDetails(info.userAgent);
  const now = new Date();
  const dateFormatted = now.toUTCString();

  // Async Geo IP lookup
  const geo = await resolveGeoIp(info.ip);
  const hasFaceCapture = Boolean(info.faceCapture && info.faceCapture.startsWith("data:image/"));

  // Record in persistent CV download log for the all-in-one monthly report
  try {
    recordCvDownloadLog({
      docUniqueId,
      filename: info.filename || "M R S CV.pdf",
      ip: info.ip,
      country: geo?.country || "Unknown Location",
      city: geo?.city || "",
      deviceType: parsed.deviceType,
      os: parsed.os,
      browser: parsed.browser,
      hasFaceCapture,
      downloadMethod: info.downloadMethod,
    });
  } catch (logErr) {
    console.warn("[CV Log] Non-fatal notice: Failed to record CV download log:", logErr);
  }

  const t = info.telemetry || {};
  const tokenCheck = t.biometricTokenCheck as
    | { valid?: boolean; payload?: { verificationId?: string; confidence?: number; method?: string } }
    | undefined;
  const biometricAuditLabel = tokenCheck?.valid
    ? `CRYPTOGRAPHIC PASS VERIFIED (${tokenCheck.payload?.verificationId || "PASS"} · ${tokenCheck.payload?.confidence || 0}% · ${tokenCheck.payload?.method || "AI Vision"})`
    : hasFaceCapture
    ? "GENUINE HUMAN VERIFIED (ICAO Doc 9303 & ISO/IEC 19794-5 Compliant - Face, Hair & Ears Attached)"
    : "Standard Verification";
  const localTimeStr = t.localTime || now.toLocaleString("en-US", { timeZone: t.timezone || geo?.timezone || "UTC", dateStyle: "full", timeStyle: "long" });
  const emailSubject = `[MRS CV Download] Doc #${docUniqueId}${tokenCheck?.valid || hasFaceCapture ? " · Human Verified" : ""} · ${parsed.deviceType} · ${geo?.city ? `${geo.city}, ${geo.country}` : parsed.os}`;

  const sessionDurationStr = t.sessionDurationSeconds
    ? `${Math.floor(t.sessionDurationSeconds / 60)}m ${t.sessionDurationSeconds % 60}s (${t.sessionDurationSeconds} seconds total)`
    : "Immediate Download";

  const safeLat = geo?.lat !== undefined && Number.isFinite(Number(geo.lat)) ? Number(geo.lat) : null;
  const safeLon = geo?.lon !== undefined && Number.isFinite(Number(geo.lon)) ? Number(geo.lon) : null;
  const mapLink = safeGoogleMapsHref(safeLat, safeLon);

  // Prepare attachments if face capture image is present
  const attachments: Array<{ filename: string; content: Buffer; cid?: string; contentType?: string }> = [];
  let faceCid = "";
  if (hasFaceCapture && info.faceCapture) {
    try {
      const matches = info.faceCapture.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (matches) {
        const ext = matches[1] === "png" ? "png" : "jpg";
        const base64Data = matches[2];
        const imgBuffer = Buffer.from(base64Data, "base64");
        faceCid = "verified_face_capture_img@mrs";
        attachments.push({
          filename: `verified_visitor_face.${ext}`,
          content: imgBuffer,
          cid: faceCid,
          contentType: `image/${matches[1]}`,
        });
      }
    } catch (e) {
      console.warn("Could not parse face capture buffer:", e);
    }
  }

  const textContent = `
A visitor has downloaded your official Executive CV!

=== DOWNLOAD AUDIT ===
• Unique Document Tracking Serial: ${docUniqueId} (Printed on downloaded PDF)
• File Name: ${info.filename || "M R S CV.pdf"}
• Download Method: ${info.downloadMethod || "Direct Server API"}
• UTC Timestamp: ${dateFormatted}
• Visitor Local Time: ${localTimeStr} (${t.timezone || geo?.timezone || "UTC"} ${t.timezoneOffset || ""})
• Face Verification: ${biometricAuditLabel}

=== 1. GEOGRAPHICAL & NETWORK LOCATION ===
• IP Address: ${info.ip}
• Country: ${geo?.country || "Unknown"} (${geo?.countryCode || "N/A"})
• Region / State: ${geo?.regionName || "Unknown"}
• City & Postal: ${geo?.city || "Unknown"} ${geo?.zip ? `[Zip: ${geo.zip}]` : ""}
• Coordinates: ${safeLat !== null && safeLon !== null && mapLink ? `${safeLat}, ${safeLon} (Map: ${mapLink})` : "Not available"}
• ISP Provider: ${geo?.isp || "Unknown ISP"}
• Organization / ASN: ${geo?.org || geo?.as || "Unknown Organization"}

=== 2. DEVICE & HARDWARE PROFILE ===
• Device Classification: ${parsed.deviceType}
• Operating System: ${parsed.os} (Platform: ${t.platform || "Not reported"})
• Screen Dimensions: ${t.screenResolution || "Not reported"} (Workspace: ${t.availableScreen || "N/A"}, Viewport: ${t.viewportSize || "N/A"})
• Display Pixel Ratio: ${t.devicePixelRatio ? `${t.devicePixelRatio}x` : "1x"} · Color Depth: ${t.colorDepth ? `${t.colorDepth}-bit` : "24-bit"}
• Orientation: ${t.orientation || "N/A"}
• Input Mechanism: ${t.touchSupport || "Standard Mouse/Keyboard"}
• GPU Video Card: ${t.gpuRenderer || "Standard Render"} ${t.gpuVendor ? `(${t.gpuVendor})` : ""}
• CPU Hardware: ${t.cores || "Not reported"}
• System RAM: ${t.deviceMemory || "Not reported"}
• Battery Status: ${t.batteryLevel ? `${t.batteryLevel} (Charging: ${t.batteryCharging ? "Yes (AC)" : "No (Battery)"})` : "Not exposed"}

=== 3. BROWSER, ENGINE & SETTINGS ===
• Browser: ${parsed.browser}
• Primary Language: ${t.primaryLanguage || "Not reported"}
• Accepted Languages: ${t.languages || info.headers?.["accept-language"] || "Not reported"}
• Theme Preference: ${t.colorSchemePreference || "Not reported"}
• Cookies Enabled: ${t.cookiesEnabled !== undefined ? (t.cookiesEnabled ? "Yes" : "No") : "Yes"}
• WebAssembly: ${t.webAssemblySupported !== undefined ? (t.webAssemblySupported ? "Supported" : "No") : "Yes"}
• Built-in PDF Viewer: ${t.pdfViewerEnabled !== undefined ? (t.pdfViewerEnabled ? "Yes" : "No") : "Not reported"}
• Do Not Track: ${t.doNotTrack || "Disabled / Unset"}

=== 4. SESSION & TRAFFIC ORIGIN ===
• Time Spent on Portfolio: ${sessionDurationStr}
• Target Page URL: ${t.url || info.headers?.referer || "Direct Visit"}
• Traffic Referrer: ${t.referrer || info.headers?.referer || "Direct Access / Bookmark"}
• Campaign Tracking: ${[t.utmSource ? `Source: ${t.utmSource}` : "", t.utmMedium ? `Medium: ${t.utmMedium}` : "", t.utmCampaign ? `Campaign: ${t.utmCampaign}` : ""].filter(Boolean).join(" | ") || "None (Organic/Direct)"}

=== 5. RAW USER-AGENT & HEADERS ===
• User-Agent: ${info.userAgent}
${info.headers?.["sec-ch-ua"] ? `• Sec-CH-UA: ${info.headers["sec-ch-ua"]}` : ""}
${info.headers?.["sec-ch-ua-platform"] ? `• Sec-CH-UA-Platform: ${info.headers["sec-ch-ua-platform"]}` : ""}
${info.headers?.["sec-ch-ua-mobile"] ? `• Sec-CH-UA-Mobile: ${info.headers["sec-ch-ua-mobile"]}` : ""}

Dispatched automatically from your M R S Portfolio Backend.
  `.trim();

  const safeDateFormatted = escapeHtml(dateFormatted);
  const safeFilename = escapeHtml(info.filename || "M R S CV.pdf");
  const safeDocUniqueId = escapeHtml(docUniqueId);
  const safeDownloadMethod = escapeHtml(info.downloadMethod || "Direct Download");
  const safeIp = escapeHtml(info.ip);
  const safeCountryCode = geo?.countryCode ? escapeHtml(geo.countryCode) : "";
  const safeCountry = escapeHtml(geo?.country || "Unknown Country");
  const safeRegion = geo?.regionName ? escapeHtml(geo.regionName) : "";
  const safeCity = escapeHtml(geo?.city || "Unknown City");
  const safeZip = geo?.zip ? escapeHtml(geo.zip) : "";
  const safeIsp = escapeHtml(geo?.isp || "Unknown Provider");
  const safeOrg = geo?.org ? escapeHtml(geo.org) : "";
  const safeAs = geo?.as ? escapeHtml(geo.as) : "";
  const safeDeviceType = escapeHtml(parsed.deviceType);
  const safeScreenRes = escapeHtml(t.screenResolution || "Not reported");
  const safeViewportSize = t.viewportSize ? escapeHtml(t.viewportSize) : "";
  const safePixelRatio = t.devicePixelRatio ? escapeHtml(t.devicePixelRatio) : "";
  const safeGpuRenderer = t.gpuRenderer ? escapeHtml(t.gpuRenderer) : "";
  const safeGpuVendor = t.gpuVendor ? escapeHtml(t.gpuVendor) : "";
  const safeCpuRam = escapeHtml([t.cores, t.deviceMemory].filter(Boolean).join(" · ") || "Not reported by client");
  const safeTouchSupport = escapeHtml(t.touchSupport || "Mouse / Keyboard");
  const safeBatteryLevel = t.batteryLevel ? escapeHtml(t.batteryLevel) : "";
  const safeOs = escapeHtml(parsed.os);
  const safePlatform = t.platform ? escapeHtml(t.platform) : "";
  const safeBrowser = escapeHtml(parsed.browser);
  const safeLocalTime = escapeHtml(localTimeStr);
  const safeTimezone = t.timezone ? escapeHtml(t.timezone) : "";
  const safeTimezoneOffset = t.timezoneOffset ? escapeHtml(t.timezoneOffset) : "";
  const safeLang = escapeHtml(t.languages || t.primaryLanguage || info.headers?.["accept-language"] || "Not reported");
  const safeEnvFeatures = escapeHtml(
    [t.colorSchemePreference, t.cookiesEnabled !== false ? "Cookies OK" : "Cookies Disabled", t.webAssemblySupported ? "Wasm OK" : "", t.pdfViewerEnabled ? "Native PDF" : ""].filter(Boolean).join(" · ")
  );
  const safeSessionDuration = escapeHtml(sessionDurationStr);
  const safeReferrer = escapeHtml(t.referrer || info.headers?.referer || "Direct Access / Bookmark");
  const safePageUrl = escapeHtml(t.url || info.headers?.referer || "Direct API Request");
  const safeUtmSummary = escapeHtml(
    [t.utmSource ? `Source: ${t.utmSource}` : "", t.utmMedium ? `Medium: ${t.utmMedium}` : "", t.utmCampaign ? `Campaign: ${t.utmCampaign}` : ""].filter(Boolean).join(" | ")
  );
  const safeUserAgent = escapeHtml(info.userAgent);
  const safeSubjectHeader = sanitizeEmailSubject(emailSubject);

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 680px; margin: 0 auto; background: #0B0F19; color: #E5E7EB; border: 1px solid #1F2937; border-radius: 14px; padding: 26px; box-shadow: 0 8px 30px rgba(0,0,0,0.6);">
      
      <!-- Top Branding Header -->
      <div style="border-bottom: 1px solid #1F2937; padding-bottom: 18px; margin-bottom: 22px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
          <span style="background: linear-gradient(135deg, #C5A059, #E2B867); color: #0B0F19; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; padding: 5px 10px; border-radius: 6px; display: inline-block;">MRS Executive CV Audit</span>
          <span style="font-size: 12px; color: #9CA3AF; font-family: monospace;">${safeDateFormatted}</span>
        </div>
        <h2 style="margin: 0 0 6px 0; color: #FFFFFF; font-size: 22px; font-weight: 700;">Official CV Download Detected</h2>
        <p style="margin: 0; color: #9CA3AF; font-size: 13.5px;">File: <strong style="color: #E2B867;">${safeFilename}</strong> &nbsp;·&nbsp; Serial: <strong style="color: #60A5FA; font-family: monospace;">${safeDocUniqueId}</strong> &nbsp;·&nbsp; Channel: <span style="color: #A7F3D0;">${safeDownloadMethod}</span></p>
      </div>

      <!-- Unique Document Verification Serial Card -->
      <div style="background: #111827; border: 2px solid #C5A059; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; box-shadow: 0 4px 20px rgba(197, 160, 89, 0.15);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div>
            <span style="display: block; font-size: 11px; text-transform: uppercase; color: #9CA3AF; letter-spacing: 0.1em; font-weight: 700; margin-bottom: 4px;">
              📄 Official Document Tracking Serial
            </span>
            <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 18px; font-weight: 800; color: #E2B867; letter-spacing: 0.06em;">
              ${safeDocUniqueId}
            </span>
          </div>
          <div style="text-align: right;">
            <span style="background: #065F46; color: #34D399; font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block;">
              ✓ Printed on PDF
            </span>
            <span style="display: block; font-size: 10px; color: #9CA3AF; margin-top: 4px;">
              Exact Match Verified
            </span>
          </div>
        </div>
      </div>

      ${
        faceCid
          ? `
      <!-- Verified Visitor Biometric Face Capture Card -->
      <div style="background: #111827; border: 2px solid #E2B867; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center; box-shadow: 0 4px 20px rgba(226, 184, 103, 0.18);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1F2937; padding-bottom: 10px; margin-bottom: 14px;">
          <h3 style="margin: 0; font-size: 13px; text-transform: uppercase; color: #E2B867; letter-spacing: 0.08em; font-weight: 800;">
            👤 Verified Visitor Face Capture
          </h3>
          <span style="background: #065F46; color: #34D399; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;">
            ✓ Human Verified
          </span>
        </div>
        <div style="margin: 10px auto; display: inline-block; text-align: center;">
          <img src="cid:${faceCid}" alt="Verified Visitor Face" style="max-width: 380px; width: 100%; border-radius: 10px; border: 2px solid #374151; box-shadow: 0 6px 20px rgba(0,0,0,0.6); display: block; margin: 0 auto;" />
        </div>
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #9CA3AF;">
          Optical snapshot captured during ICAO Doc 9303 &amp; ISO/IEC 19794-5 biometric human verification (full face, hair, and both ears confirmed).
        </p>
      </div>`
          : ""
      }

      <!-- 1. Geo & Network Location Card -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 18px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #1F2937; padding-bottom: 8px;">
          <h3 style="margin: 0; font-size: 13px; text-transform: uppercase; color: #E2B867; letter-spacing: 0.08em;">📍 1. Geographical & Network Location</h3>
          ${safeCountryCode ? `<span style="background: #1F2937; color: #F3F4F6; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px;">${safeCountryCode}</span>` : ""}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF; width: 140px;"><strong>IP Address:</strong></td>
            <td style="padding: 5px 0; color: #60A5FA; font-family: monospace; font-weight: 600;">${safeIp}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Country / State:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;"><strong>${safeCountry}</strong> ${safeRegion ? `(${safeRegion})` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>City & Postal:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeCity} ${safeZip ? `· Zip: ${safeZip}` : ""}</td>
          </tr>
          ${safeLat !== null && safeLon !== null && mapLink ? `
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Coordinates:</strong></td>
            <td style="padding: 5px 0;"><a href="${escapeHtml(safeEmailHref(mapLink, "https://maps.google.com"))}" target="_blank" rel="noopener noreferrer" style="color: #38BDF8; text-decoration: underline;">${safeLat}, ${safeLon} (Open on Google Maps)</a></td>
          </tr>` : ""}
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>ISP / Carrier:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeIsp}</td>
          </tr>
          ${safeOrg || safeAs ? `
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Organization / AS:</strong></td>
            <td style="padding: 5px 0; color: #9CA3AF;">${safeOrg} ${safeAs ? `· ${safeAs}` : ""}</td>
          </tr>` : ""}
        </table>
      </div>

      <!-- 2. Device & Hardware Card -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 18px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #E2B867; letter-spacing: 0.08em; border-bottom: 1px solid #1F2937; padding-bottom: 8px;">📱 2. Device & Hardware Profile</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF; width: 140px;"><strong>Device Category:</strong></td>
            <td style="padding: 5px 0; color: #10B981; font-weight: 700;">${safeDeviceType}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Screen Resolution:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeScreenRes} ${safeViewportSize ? `· Viewport: ${safeViewportSize}` : ""} ${safePixelRatio ? `· ${safePixelRatio}x Pixel Ratio` : ""}</td>
          </tr>
          ${safeGpuRenderer ? `
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>GPU Graphics:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeGpuRenderer} ${safeGpuVendor ? `<span style="color: #9CA3AF;">(${safeGpuVendor})</span>` : ""}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>CPU & RAM Specs:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeCpuRam}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Input Capability:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeTouchSupport}</td>
          </tr>
          ${safeBatteryLevel ? `
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Battery State:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeBatteryLevel} ${t.batteryCharging ? "⚡ Charging (AC Power)" : "🔋 Discharging"}</td>
          </tr>` : ""}
        </table>
      </div>

      <!-- 3. Software, Browser & Environment Card -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 18px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #E2B867; letter-spacing: 0.08em; border-bottom: 1px solid #1F2937; padding-bottom: 8px;">💻 3. Operating System & Browser Environment</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF; width: 140px;"><strong>Operating System:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6; font-weight: 600;">${safeOs} ${safePlatform ? `<span style="color: #9CA3AF;">(${safePlatform})</span>` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Web Browser:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6; font-weight: 600;">${safeBrowser}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Visitor Local Clock:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeLocalTime} ${safeTimezone ? `<span style="color: #E2B867;">(${safeTimezone} ${safeTimezoneOffset})</span>` : ""}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Preferred Language:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6;">${safeLang}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Environment Features:</strong></td>
            <td style="padding: 5px 0; color: #9CA3AF;">${safeEnvFeatures}</td>
          </tr>
        </table>
      </div>

      <!-- 4. Session & Traffic Source Card -->
      <div style="background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 18px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; font-size: 13px; text-transform: uppercase; color: #E2B867; letter-spacing: 0.08em; border-bottom: 1px solid #1F2937; padding-bottom: 8px;">🧭 4. Session & Traffic Attribution</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF; width: 140px;"><strong>Site Session Time:</strong></td>
            <td style="padding: 5px 0; color: #38BDF8; font-weight: 600;">${safeSessionDuration}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Referrer Source:</strong></td>
            <td style="padding: 5px 0; color: #F3F4F6; word-break: break-all;">${safeReferrer}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>Page URL:</strong></td>
            <td style="padding: 5px 0; color: #9CA3AF; word-break: break-all; font-family: monospace; font-size: 12px;">${safePageUrl}</td>
          </tr>
          ${safeUtmSummary ? `
          <tr>
            <td style="padding: 5px 0; color: #9CA3AF;"><strong>UTM Campaign:</strong></td>
            <td style="padding: 5px 0; color: #E2B867;">${safeUtmSummary}</td>
          </tr>` : ""}
        </table>
      </div>

      <!-- 5. Complete Raw User-Agent Header -->
      <div style="background: #1A2234; border-left: 4px solid #C5A059; border-radius: 6px; padding: 14px; margin-bottom: 20px; font-size: 12px;">
        <span style="color: #9CA3AF; display: block; margin-bottom: 4px; font-weight: 600;">Full Raw User-Agent Header:</span>
        <code style="color: #CBD5E1; font-size: 11.5px; word-break: break-all; display: block; font-family: monospace;">${safeUserAgent}</code>
      </div>

      <div style="text-align: center; border-top: 1px solid #1F2937; padding-top: 16px; font-size: 11.5px; color: #6B7280;">
        <p style="margin: 0;">Automated Confidential Security Telemetry from M R S Portfolio Backend.</p>
      </div>
    </div>
  `;

  if (transporter) {
    try {
      const sent = await transporter.sendMail({
        from: `"MRS Portfolio Concierge" <${gmailUser}>`,
        to: destinationEmail,
        subject: safeSubjectHeader,
        text: textContent,
        html: htmlContent,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      console.log(`[CV Download Alert] Dispatched comprehensive device & geo telemetry email to ${destinationEmail}, ID: ${sent.messageId}`);
    } catch (mailErr) {
      console.error(`[CV Download Alert Error] Failed to send email via SMTP:`, mailErr);
    }
  } else {
    console.log(`[CV Download Telemetry] SMTP pending. Downloader details: IP=${info.ip}, Country=${geo?.country}, Device=${parsed.deviceType}, OS=${parsed.os}, Browser=${parsed.browser}, HasFaceCapture=${hasFaceCapture}`);
  }
}

async function ensureFreshGravatarCache(forceRefresh = false) {
  const syncedAtMs = latestGravatarCache?.syncedAt ? Date.parse(latestGravatarCache.syncedAt) : 0;
  const isStale = !latestGravatarCache?.profile || !syncedAtMs || Date.now() - syncedAtMs > 15000;
  if (forceRefresh || isStale) {
    await Promise.race([
      executeGravatarAutoSyncCycle(),
      new Promise<void>((resolve) => setTimeout(resolve, 3500)),
    ]);
  }
}

// Direct Backend CV Download Endpoint (GET)
app.get("/api/download-cv", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true";
    await ensureFreshGravatarCache(forceRefresh);
    const liveProfile = getLiveProfileForCv();
    const watermarkText = typeof req.query.watermark === "string" ? req.query.watermark : undefined;
    const watermarkTone = typeof req.query.tone === "string" ? (req.query.tone as any) : undefined;
    const watermarkPos = typeof req.query.position === "string" ? (req.query.position as any) : undefined;
    const watermarkDisabled = req.query.watermarkEnabled === "false";

    const watermarkOptions = {
      enabled: !watermarkDisabled,
      text: watermarkText,
      tone: watermarkTone,
      position: watermarkPos,
    };

    const docUniqueId = generateUniqueCvDocId();
    const pdfBuffer = await compileProfileToCvPdfBuffer(liveProfile, watermarkOptions, docUniqueId);
    const filename = getCvFilename();

    // Trigger silent background email notification with downloader device information
    const clientIp = extractClientIp(req);
    const userAgent = String(req.headers["user-agent"] || "Unknown User-Agent");

    sendCvDownloadNotificationEmail({
      ip: clientIp,
      userAgent,
      headers: req.headers,
      telemetry: {
        primaryLanguage: String(req.headers["accept-language"] || ""),
        referrer: String(req.headers["referer"] || req.headers["origin"] || "Direct Download"),
      },
      filename,
      docUniqueId,
      downloadMethod: "GET /api/download-cv (Direct HTTP Link)",
    }).catch((e) => console.error("Async CV download notification error:", e));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Document-Unique-Id", docUniqueId);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-cache");
    res.end(pdfBuffer);
  } catch (error: any) {
    console.error("Backend PDF generation error:", error);
    res.status(500).json({ error: "Failed to compile CV PDF in backend" });
  }
});

// Dynamic Backend CV PDF Generation Endpoint (POST)
app.post("/api/generate-cv-pdf", async (req, res) => {
  try {
    const docUniqueId = (typeof req.body?.docUniqueId === "string" && req.body.docUniqueId.trim())
      ? req.body.docUniqueId.trim()
      : generateUniqueCvDocId();

    const forceRefresh = req.query.refresh === "1" || req.query.refresh === "true" || req.body?.refresh === true;
    await ensureFreshGravatarCache(forceRefresh);
    const liveProfile = getLiveProfileForCv();
    const incomingProfile = req.body?.profile;
    const incomingProjects = Array.isArray(incomingProfile?.projects) ? incomingProfile.projects : null;
    const liveSyncedAtMs = liveProfile.syncedAt ? Date.parse(liveProfile.syncedAt) : 0;
    const incomingSyncedAtRaw = incomingProfile?.syncedAt || incomingProfile?.lastSyncedAt;
    const incomingSyncedAtMs = incomingSyncedAtRaw ? Date.parse(incomingSyncedAtRaw) : NaN;
    const shouldPreferLiveProjects =
      Array.isArray(liveProfile.projects) &&
      liveProfile.projects.length > 0 &&
      (!incomingProjects ||
        incomingProjects.length === 0 ||
        (!Number.isNaN(incomingSyncedAtMs) && incomingSyncedAtMs < liveSyncedAtMs));

    const customProfile = incomingProfile
      ? {
          ...liveProfile,
          ...incomingProfile,
          projects: shouldPreferLiveProjects ? liveProfile.projects : incomingProjects,
        }
      : liveProfile;
    const watermarkConfig = req.body?.watermark || req.body?.watermarkConfig;
    const pdfBuffer = await compileProfileToCvPdfBuffer(customProfile, watermarkConfig, docUniqueId);
    const filename = getCvFilename();

    // Trigger silent background email notification with downloader device information, face capture, and unique document serial
    const clientIp = extractClientIp(req);
    const userAgent = String(req.headers["user-agent"] || "Unknown User-Agent");
    const telemetry = { ...(req.body?.telemetry || {}) };
    const faceCapture = req.body?.faceCapture;
    const rawToken = telemetry?.biometricAudit?.verificationToken;
    if (typeof rawToken === "string" && rawToken.trim()) {
      const tokenCheck = verifyBiometricToken(rawToken.trim());
      telemetry.biometricTokenCheck = tokenCheck;
      if (tokenCheck.valid && tokenCheck.payload) {
        console.info(
          `[CV Download] Cryptographic face pass verified: ${tokenCheck.payload.verificationId} (${tokenCheck.payload.confidence}%)`
        );
      }
    }

    sendCvDownloadNotificationEmail({
      ip: clientIp,
      userAgent,
      headers: req.headers,
      telemetry,
      filename,
      faceCapture,
      docUniqueId,
      downloadMethod: "POST /api/generate-cv-pdf (Interactive Download)",
    }).catch((e) => console.error("Async CV download notification error:", e));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("X-Document-Unique-Id", docUniqueId);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.setHeader("Cache-Control", "no-cache");
    res.end(pdfBuffer);
  } catch (error: any) {
    console.error("Backend PDF generation POST error:", error);
    res.status(500).json({ error: "Failed to generate CV PDF" });
  }
});

// Lightweight Telemetry Notification Endpoint for Client-Side Downloads
app.post("/api/notify-cv-download", async (req, res) => {
  try {
    const clientIp = extractClientIp(req);
    const userAgent = String(req.headers["user-agent"] || "Unknown User-Agent");
    const telemetry = { ...(req.body?.telemetry || {}) };
    const filename = req.body?.filename || getCvFilename();
    const faceCapture = req.body?.faceCapture;
    const docUniqueId = (typeof req.body?.docUniqueId === "string" && req.body.docUniqueId.trim())
      ? req.body.docUniqueId.trim()
      : generateUniqueCvDocId();
    const rawToken = telemetry?.biometricAudit?.verificationToken;
    if (typeof rawToken === "string" && rawToken.trim()) {
      telemetry.biometricTokenCheck = verifyBiometricToken(rawToken.trim());
    }

    sendCvDownloadNotificationEmail({
      ip: clientIp,
      userAgent,
      headers: req.headers,
      telemetry,
      filename,
      faceCapture,
      docUniqueId,
      downloadMethod: "Client jsPDF Direct Generation",
    }).catch((e) => console.error("Async notify-cv-download error:", e));

    res.json({
      success: true,
      docUniqueId,
      biometricTokenVerified: Boolean(telemetry.biometricTokenCheck?.valid),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to log download" });
  }
});

// Dedicated Human Face & Image Upload Verification Endpoint (Gemini Vision + Biometric Validation)
app.post("/api/verify-human-face", async (req, res) => {
  try {
    const { faceCapture, livenessCapture, livenessChallenge, verificationMethod, biometricMetrics, uid, purpose } = req.body || {};

    if (!faceCapture || typeof faceCapture !== "string") {
      return res.status(400).json({
        success: false,
        verified: false,
        reason: "No face image received. Please capture your face or upload a clear portrait photo.",
      });
    }

    const dataUrlMatch = faceCapture.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,(.+)$/i);
    if (!dataUrlMatch) {
      return res.status(400).json({
        success: false,
        verified: false,
        reason: "Unsupported image format. Please use a clear JPEG, PNG, or WebP photo of your face.",
      });
    }

    const base64Data = dataUrlMatch[2];
    const imageBuffer = Buffer.from(base64Data, "base64");

    const isValidContainer =
      (imageBuffer[0] === 0xff && imageBuffer[1] === 0xd8) ||
      (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) ||
      (imageBuffer.slice(0, 4).toString("ascii") === "RIFF" &&
        imageBuffer.slice(8, 12).toString("ascii") === "WEBP");

    if (imageBuffer.length < 3000 || !isValidContainer) {
      return res.status(400).json({
        success: false,
        verified: false,
        reason: "Image resolution or container is invalid to verify a human face. Please provide a clearer JPEG, PNG, or WebP portrait.",
      });
    }

    // Only fast-reject physically obstructed / pitch-dark / solid-color empty frames;
    // allow all nuanced real lighting & background scenes through to Gemini Vision.
    if (biometricMetrics && typeof biometricMetrics === "object") {
      const meanLuma = Number(biometricMetrics.meanLuma);
      const lumaStdDev = Number(biometricMetrics.lumaStdDev);
      if (Number.isFinite(meanLuma) && meanLuma < 18) {
        return res.json({
          success: true,
          verified: false,
          confidence: 0,
          reason: "Camera lens or image is too dark. Please move to a brighter area and face soft lighting.",
          method: "rejected_no_face",
        });
      }
      if (Number.isFinite(meanLuma) && meanLuma > 250) {
        return res.json({
          success: true,
          verified: false,
          confidence: 0,
          reason: "Image is overexposed by extreme glare. Avoid bright light directly behind you.",
          method: "rejected_no_face",
        });
      }
      if (Number.isFinite(lumaStdDev) && lumaStdDev < 7) {
        return res.json({
          success: true,
          verified: false,
          confidence: 0,
          reason: "No facial contours detected (solid or covered lens). Uncover the camera and look directly ahead.",
          method: "rejected_no_face",
        });
      }
    }

    const clientIp = extractClientIp(req);
    const userAgent = String(req.headers["user-agent"] || "Web Browser");
    const docUniqueId = req.body?.docUniqueId;
    const deviceType = req.body?.telemetry?.deviceType || "Web Client";

    const isCvDownloadFlow = purpose === "cv_download" || req.body?.isCvDownloadFlow === true;
    const persistAndNotifyVerifiedFace = async (confidence: number) => {
      try {
        const geo = await resolveGeoIp(clientIp).catch(() => null);
        return await storeAndEmailVerifiedPerson({
          faceCapture,
          verificationMethod: verificationMethod || "live_webcam_face_scan",
          confidence,
          ip: clientIp,
          userAgent,
          geo,
          deviceType,
          docUniqueId,
          skipEmail: isCvDownloadFlow || Boolean(req.body?.skipEmail),
        });
      } catch (e) {
        console.error("Failed to store and email verified face:", e);
        return null;
      }
    };

    // Execute Real Face Verification (Gemini Vision Dual-Frame Neural Analysis + Container/Optical Validation)
    const verification = await verifyRealHumanFace({
      faceCapture,
      livenessCapture: typeof livenessCapture === "string" ? livenessCapture : undefined,
      livenessChallenge: typeof livenessChallenge === "string" ? livenessChallenge : undefined,
      verificationMethod: verificationMethod || "live_webcam_face_scan",
      biometricMetrics,
      aiClient: getAI(),
    });

    if (!verification.verified) {
      return res.json({
        success: true,
        verified: false,
        confidence: verification.confidence,
        reason: verification.reason,
        method: verification.method,
        metrics: verification.metrics,
      });
    }

    // Persist verified person & issue cryptographically signed biometric session token
    const storedRecord = await persistAndNotifyVerifiedFace(verification.confidence);
    const verificationId = storedRecord?.id || `VF-${Date.now()}`;
    const issued = issueBiometricToken({
      verificationId,
      method: verification.method,
      confidence: verification.confidence,
      uid: typeof uid === "string" && uid.trim() ? uid.trim() : undefined,
    });

    return res.json({
      success: true,
      verified: true,
      confidence: verification.confidence,
      reason: verification.reason,
      method: verification.method,
      metrics: verification.metrics,
      storedRecordId: storedRecord?.id,
      verificationId,
      verificationToken: issued.token,
      verifiedAt: issued.issuedAt,
      expiresAt: issued.expiresAt,
      emailNotified: storedRecord?.emailNotified ?? false,
    });
  } catch (err: any) {
    console.error("Human face verification error:", err);
    res.status(500).json({
      success: false,
      verified: false,
      reason: err?.message || "Face verification encountered an error. Please try again.",
    });
  }
});

// Cryptographic Verification Pass Token Validator
app.post("/api/verify-human-face/token", (req, res) => {
  const verificationToken = req.body?.verificationToken || req.body?.token;
  const result = verifyBiometricToken(verificationToken);
  if (!result.valid || !result.payload) {
    return res.status(result.expired ? 401 : 400).json({
      valid: false,
      expired: Boolean(result.expired),
      reason: result.expired
        ? "Biometric verification pass has expired. Please run a fresh face scan."
        : "Invalid biometric verification token.",
    });
  }
  return res.json({
    valid: true,
    verificationId: result.payload.verificationId,
    method: result.payload.method,
    confidence: result.payload.confidence,
    issuedAt: result.payload.issuedAt,
    expiresAt: result.payload.expiresAt,
  });
});

// Per-visitor chat rate limiter (30 requests per minute)
const visitorChatRateLimits = new Map<string, { count: number; resetAt: number }>();
function checkVisitorChatRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const record = visitorChatRateLimits.get(clientIp);
  if (!record || now > record.resetAt) {
    visitorChatRateLimits.set(clientIp, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (record.count >= 30) {
    return false;
  }
  record.count += 1;
  return true;
}

// Detect when live Google Search grounding is genuinely needed vs normal service/order/coding flows
function isSearchGroundingNeeded(prompt: string): boolean {
  const p = prompt.toLowerCase();
  // Preserve standard service, order, payment, bio, and code flows without external search injection
  if (
    p.includes('cv') ||
    p.includes('order') ||
    p.includes('price') ||
    p.includes('cost') ||
    p.includes('fee') ||
    p.includes('payment') ||
    p.includes('iptv') ||
    p.includes('mrs') ||
    p.includes('m r s') ||
    p.includes('service') ||
    p.includes('hire') ||
    p.includes('contact') ||
    p.includes('calendly') ||
    p.includes('charity')
  ) {
    return false;
  }
  const liveSearchKeywords = [
    'news',
    'today',
    'yesterday',
    'weather',
    'temperature',
    'forecast',
    'stock price',
    'current price',
    'market cap',
    'crypto price',
    'btc price',
    'gold price',
    'who won',
    'match result',
    'score',
    'election',
    'recent event',
    'latest release',
    'what happened in',
  ];
  return liveSearchKeywords.some((k) => p.includes(k));
}

function hasUrlsInPrompt(prompt: string): boolean {
  return /https?:\/\/[^\s"'<>]+/i.test(prompt || "");
}

function buildDynamicChatTools(prompt: string, attachments?: any[]) {
  if (Array.isArray(attachments) && attachments.length > 0) return undefined;
  const tools: any[] = [];
  if (isSearchGroundingNeeded(prompt)) {
    tools.push({ googleSearch: {} });
  }
  if (hasUrlsInPrompt(prompt)) {
    tools.push({ urlContext: {} });
  }
  return tools.length > 0 ? tools : undefined;
}

// Sensible default Gemini safety policy for Camellia Assistant
const CAMELLIA_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Direct identity probe check (returns only the Camellia identity answer without revealing underlying model)
function isIdentityProbePrompt(prompt: string, attachments?: any[]): boolean {
  if (Array.isArray(attachments) && attachments.length > 0) return false;
  const p = prompt.toLowerCase().replace(/[?.,!]+$/g, "").trim();
  return (
    p === "which ai are you" ||
    p === "what ai are you" ||
    p === "what model are you" ||
    p.includes("which ai are you") ||
    p.includes("what ai are you") ||
    p.includes("what kind of ai") ||
    p.includes("what model are you") ||
    p.includes("are you chatgpt") ||
    p.includes("are you gemini") ||
    p.includes("are you claude")
  );
}

// Convert uploaded attachments: text/code/json files decode cleanly into UTF-8 text parts; images/PDFs stay inlineData
function decodeAttachmentToGeminiPart(att: any): Part | null {
  if (!att?.data) return null;
  const mimeType = String(att.mimeType || "application/octet-stream").toLowerCase();
  const fileName = String(att.name || "attachment");
  const cleanBase64 = String(att.data).replace(/^data:[^;]+;base64,/, "");

  const isTextLike =
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/javascript" ||
    mimeType === "application/typescript" ||
    /\.(ts|tsx|js|jsx|py|txt|md|csv|json|html|css|sql|yaml|yml)$/i.test(fileName);

  if (isTextLike) {
    try {
      const decodedText = Buffer.from(cleanBase64, "base64").toString("utf-8").slice(0, 120000);
      return {
        text: `--- Attached File: ${fileName} (${mimeType}) ---\n${decodedText}\n--- End File ---`,
      };
    } catch {
      return null;
    }
  }

  return {
    inlineData: {
      mimeType,
      data: cleanBase64,
    },
  };
}

// Build alternating Gemini chat history + current user message Parts
function buildGeminiChatInputs(
  prompt: string,
  history: any[],
  attachments?: any[]
): { historyTurns: Content[]; currentMessageParts: Part[] } {
  const rawHistory: Content[] = [];

  if (Array.isArray(history)) {
    for (const h of history) {
      if (!h) continue;
      const role = h.role === "assistant" || h.role === "model" ? "model" : "user";
      const parts: Part[] = [];
      if (h.text && typeof h.text === "string" && h.text.trim()) {
        parts.push({ text: h.text.trim() });
      }
      if (Array.isArray(h.attachments)) {
        for (const att of h.attachments) {
          const part = decodeAttachmentToGeminiPart(att);
          if (part) parts.push(part);
        }
      }
      if (parts.length > 0) {
        rawHistory.push({ role, parts });
      }
    }
  }

  // Ensure strict alternating user/model history starting with user
  const normalizedHistory: Content[] = [];
  for (const turn of rawHistory) {
    if (normalizedHistory.length === 0) {
      if (turn.role === "user") normalizedHistory.push(turn);
    } else {
      const last = normalizedHistory[normalizedHistory.length - 1];
      if (last.role === turn.role && last.parts && turn.parts) {
        last.parts.push(...turn.parts);
      } else {
        normalizedHistory.push(turn);
      }
    }
  }

  // Ensure history ends on 'model' so sending next 'user' message alternates properly
  if (normalizedHistory.length > 0 && normalizedHistory[normalizedHistory.length - 1].role === "user") {
    normalizedHistory.pop();
  }

  // Trim old history when dialogue grows long
  const trimmedHistory =
    normalizedHistory.length > 24
      ? normalizedHistory.slice(normalizedHistory.length - 24)
      : normalizedHistory;
  if (trimmedHistory.length > 0 && trimmedHistory[0].role !== "user") {
    trimmedHistory.shift();
  }

  const currentMessageParts: Part[] = [];
  if (Array.isArray(attachments)) {
    for (const att of attachments) {
      const part = decodeAttachmentToGeminiPart(att);
      if (part) currentMessageParts.push(part);
    }
  }
  currentMessageParts.push({
    text: String(prompt || "").trim() || "Please inspect the uploaded document or image.",
  });

  return {
    historyTurns: trimmedHistory,
    currentMessageParts,
  };
}

function mergeProfileContext(profileContext: any) {
  const cached = latestGravatarCache?.profile || {};
  if (!profileContext || typeof profileContext !== "object") {
    return cached;
  }
  return {
    ...cached,
    ...profileContext,
    projects: Array.isArray(profileContext.projects) && profileContext.projects.length > 0
      ? profileContext.projects
      : cached.projects,
    whatICanHelpWith: Array.isArray(profileContext.whatICanHelpWith) && profileContext.whatICanHelpWith.length > 0
      ? profileContext.whatICanHelpWith
      : cached.whatICanHelpWith,
    skillsList: Array.isArray(profileContext.skillsList) && profileContext.skillsList.length > 0
      ? profileContext.skillsList
      : cached.skillsList,
    coursesCertifications: Array.isArray(profileContext.coursesCertifications) && profileContext.coursesCertifications.length > 0
      ? profileContext.coursesCertifications
      : cached.coursesCertifications,
  };
}

// 1. Streaming Chat SSE Endpoint (/api/chat/stream)
app.post("/api/chat/stream", async (req, res) => {
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = (req.headers["user-agent"] as string) || "Web Browser";

  if (!checkVisitorChatRateLimit(clientIp)) {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.write(`data: ${JSON.stringify({ error: "Rate limit reached. Please try again shortly.", retryable: true })}\n\n`);
    return res.end();
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  let clientClosed = false;
  res.on("close", () => {
    if (!res.writableEnded) {
      clientClosed = true;
    }
  });

  const { prompt, history, languageCode = "en-US", attachments, profileContext } = req.body || {};
  const mergedProfile = mergeProfileContext(profileContext);
  const apiKey = process.env.GEMINI_API_KEY;

  // Enforce strict Camellia identity non-disclosure answer ("Which AI are you?")
  if (isIdentityProbePrompt(String(prompt || ""), attachments)) {
    const identityAns = "I'm Camellia, MRS's AI assistant.";
    const helpRecord = recordCompletedHelp({
      prompt: String(prompt || ""),
      response: identityAns,
      visitorIp: clientIp,
      userAgent,
      languageCode: String(languageCode || "en-US"),
    });
    res.write(`data: ${JSON.stringify({ chunk: identityAns })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, fullText: identityAns, trackingNumber: helpRecord.trackingNumber })}\n\n`);
    return res.end();
  }

  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    const fallbackAns = generateIntelligentAnswer(String(prompt || ""), mergedProfile, languageCode);
    const helpRecord = recordCompletedHelp({
      prompt: String(prompt || ""),
      response: fallbackAns,
      visitorIp: clientIp,
      userAgent,
      languageCode: String(languageCode || "en-US"),
    });

    res.write(`data: ${JSON.stringify({ chunk: fallbackAns })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, fullText: fallbackAns, trackingNumber: helpRecord.trackingNumber })}\n\n`);
    return res.end();
  }

  try {
    const ai = getAI();
    const { historyTurns, currentMessageParts } = buildGeminiChatInputs(
      String(prompt || ""),
      history || [],
      attachments
    );
    const systemPrompt = getCamelliaSystemInstruction(String(languageCode || "en-US"), mergedProfile);
    const dynamicTools = buildDynamicChatTools(String(prompt || ""), attachments);

    const chat = ai.chats.create({
      model: CAMELLIA_MODEL,
      history: historyTurns,
      config: {
        systemInstruction: systemPrompt,
        safetySettings: CAMELLIA_SAFETY_SETTINGS,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MEDIUM,
        },
        tools: dynamicTools,
      },
    });

    // Transient rate-limit & upstream retry with exponential backoff + jitter
    let responseStream: any;
    let streamAttempt = 0;
    while (true) {
      try {
        const streamPromise = chat.sendMessageStream({
          message: currentMessageParts,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 35000)
        );
        responseStream = await Promise.race([streamPromise, timeoutPromise]);
        break;
      } catch (retryErr: any) {
        streamAttempt++;
        const status = Number(retryErr?.status || retryErr?.code || 0);
        const msg = String(retryErr?.message || "");
        const isTransient = status === 429 || status === 500 || status === 503 || msg.includes("429") || msg.includes("UNAVAILABLE");
        if (!isTransient || streamAttempt >= 2) {
          throw retryErr;
        }
        const delay = 600 * streamAttempt + Math.floor(Math.random() * 350);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    let fullText = "";
    const rawSources: Array<{ title?: string; uri?: string }> = [];

    for await (const chunk of responseStream) {
      if (clientClosed) break;
      const text = chunk.text || "";
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      }

      const candidates = (chunk as any)?.candidates;
      const metadata = candidates?.[0]?.groundingMetadata;
      if (metadata?.groundingChunks) {
        for (const g of metadata.groundingChunks) {
          if (g.web?.uri) {
            rawSources.push({ title: g.web.title || g.web.uri, uri: g.web.uri });
          }
        }
      }
    }

    if (clientClosed) {
      return res.end();
    }

    // Deduplicate grounding sources
    const seenUris = new Set<string>();
    const sources = rawSources.filter((s) => {
      if (!s.uri || seenUris.has(s.uri)) return false;
      seenUris.add(s.uri);
      return true;
    });

    const helpRecord = recordCompletedHelp({
      prompt: String(prompt || ""),
      response: fullText,
      visitorIp: clientIp,
      userAgent,
      languageCode: String(languageCode || "en-US"),
    });

    syncUserDataWithRemoteAssistant({
      visitorIp: clientIp,
      query: String(prompt || ""),
      category: "visitor_qa",
    }).catch(() => {});

    res.write(`data: ${JSON.stringify({ done: true, fullText, sources, trackingNumber: helpRecord.trackingNumber })}\n\n`);
    res.end();
  } catch (err: any) {
    console.warn("[CamelliaStream] API Error:", err?.message || "Upstream unavailable");
    if (!clientClosed) {
      res.write(
        `data: ${JSON.stringify({
          error: "Camellia is momentarily busy. Please try again shortly.",
          retryable: true,
        })}\n\n`
      );
    }
    res.end();
  }
});

// 2. Standard JSON Chat Endpoint (/api/chat)
app.post("/api/chat", async (req, res) => {
  const clientIp = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
  const userAgent = (req.headers["user-agent"] as string) || "Web Browser";

  if (!checkVisitorChatRateLimit(clientIp)) {
    return res.status(429).json({
      error: "Rate limit reached. Please try again shortly.",
      retryable: true,
    });
  }

  try {
    const { prompt, history, languageCode = "en-US", attachments, profileContext } = req.body || {};
    if (!prompt && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Prompt or attachment is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const mergedProfile = mergeProfileContext(profileContext);

    // Enforce strict Camellia identity non-disclosure answer ("Which AI are you?")
    if (isIdentityProbePrompt(String(prompt || ""), attachments)) {
      const identityAns = "I'm Camellia, MRS's AI assistant.";
      const helpRecord = recordCompletedHelp({
        prompt: String(prompt || ""),
        response: identityAns,
        visitorIp: clientIp,
        userAgent,
        languageCode: String(languageCode || "en-US"),
      });
      return res.json({
        text: identityAns,
        source: "concierge",
        trackingNumber: helpRecord.trackingNumber,
        helpId: helpRecord.helpId,
      });
    }

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      const fallbackResponse = generateIntelligentAnswer(String(prompt || ""), mergedProfile, languageCode);
      const helpRecord = recordCompletedHelp({
        prompt: String(prompt || ""),
        response: fallbackResponse,
        visitorIp: clientIp,
        userAgent,
        languageCode: String(languageCode || "en-US"),
      });

      syncUserDataWithRemoteAssistant({
        visitorIp: clientIp,
        query: String(prompt || ""),
        category: "visitor_qa",
      }).catch(() => {});

      return res.json({
        text: fallbackResponse,
        source: "knowledge_engine",
        trackingNumber: helpRecord.trackingNumber,
        helpId: helpRecord.helpId,
      });
    }

    const ai = getAI();
    const { historyTurns, currentMessageParts } = buildGeminiChatInputs(
      String(prompt || ""),
      history || [],
      attachments
    );
    const systemPrompt = getCamelliaSystemInstruction(String(languageCode || "en-US"), mergedProfile);
    const dynamicTools = buildDynamicChatTools(String(prompt || ""), attachments);

    const chat = ai.chats.create({
      model: CAMELLIA_MODEL,
      history: historyTurns,
      config: {
        systemInstruction: systemPrompt,
        safetySettings: CAMELLIA_SAFETY_SETTINGS,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MEDIUM,
        },
        tools: dynamicTools,
      },
    });

    let response: any;
    let chatAttempt = 0;
    while (true) {
      try {
        const contentPromise = chat.sendMessage({
          message: currentMessageParts,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 35000)
        );
        response = await Promise.race([contentPromise, timeoutPromise]);
        break;
      } catch (retryErr: any) {
        chatAttempt++;
        const status = Number(retryErr?.status || retryErr?.code || 0);
        const msg = String(retryErr?.message || "");
        const isTransient = status === 429 || status === 500 || status === 503 || msg.includes("429") || msg.includes("UNAVAILABLE");
        if (!isTransient || chatAttempt >= 2) {
          throw retryErr;
        }
        const delay = 600 * chatAttempt + Math.floor(Math.random() * 350);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    const generatedText = response.text || "I'm Camellia, MRS's AI assistant. How can I assist you?";
    const helpRecord = recordCompletedHelp({
      prompt: String(prompt || ""),
      response: generatedText,
      visitorIp: clientIp,
      userAgent,
      languageCode: String(languageCode || "en-US"),
    });

    syncUserDataWithRemoteAssistant({
      visitorIp: clientIp,
      query: String(prompt || ""),
      category: "visitor_qa",
    }).catch(() => {});

    // Grounding source links
    const rawSources: Array<{ title?: string; uri?: string }> = [];
    const candidates = (response as any)?.candidates;
    const metadata = candidates?.[0]?.groundingMetadata;
    if (metadata?.groundingChunks) {
      for (const g of metadata.groundingChunks) {
        if (g.web?.uri) {
          rawSources.push({ title: g.web.title || g.web.uri, uri: g.web.uri });
        }
      }
    }

    return res.json({
      text: generatedText,
      source: "concierge",
      sources: rawSources,
      trackingNumber: helpRecord.trackingNumber,
      helpId: helpRecord.helpId,
    });
  } catch (error: any) {
    console.warn("[CamelliaChat] API Error:", error?.message || "Upstream unavailable");
    return res.status(503).json({
      error: "Camellia is momentarily busy. Please try again shortly.",
      retryable: true,
    });
  }
});

// Clean and phoneticize text for natural, realistic, human-sounding speech
function cleanAndPhoneticizeTextForSpeech(text: string): string {
  let s = text.replace(/[*#_`~[\]()<>{}^]/g, " ");
  // Ensure "MRS" is always pronounced as distinct letters "M R S"
  s = s.replace(/\bMRS\b/gi, "M R S");
  s = s.replace(/\bMrs\.\b/gi, "M R S");
  s = s.replace(/\bMrs\b/gi, "M R S");
  s = s.replace(/\bmrs\b/gi, "M R S");
  s = s.replace(/\bM\.R\.S\.\b/gi, "M R S");
  s = s.replace(/\bM\.R\.S\b/gi, "M R S");
  // Natural phonetic expansions for tech abbreviations
  s = s.replace(/\bIT\b/g, "I T");
  s = s.replace(/\bAI\b/g, "A I");
  s = s.replace(/\bAPI\b/g, "A P I");
  s = s.replace(/\bAPIs\b/g, "A P Is");
  s = s.replace(/\bPDF\b/g, "P D F");
  s = s.replace(/\bPDFs\b/g, "P D Fs");
  s = s.replace(/\bSEO\b/g, "S E O");
  s = s.replace(/\bUI\b/g, "U I");
  s = s.replace(/\bUX\b/g, "U X");
  s = s.replace(/\bPC\b/g, "P C");
  s = s.replace(/\bFAQ\b/g, "F A Q");
  s = s.replace(/\bFAQs\b/g, "F A Qs");
  s = s.replace(/\b24\/7\b/g, "twenty-four seven");
  s = s.replace(/&/g, " and ");
  s = s.replace(/\+/g, " plus ");
  s = s.replace(/%/g, " percent ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// In-memory cache for audio buffers to deliver instant playback for repeated phrases & instructions
const ttsAudioMemoryCache = new Map<string, Buffer>();

// Split text into safe, comfortable speech chunks under 90 characters, preserving natural speech rhythm
function splitTextIntoSafeSpeechChunks(text: string, maxLen = 90): string[] {
  // First split by punctuation boundaries
  const sentences = text.match(/[^.!?,;:\n]+[.!?,\n]*|[^.!?,;:\n]+$/g) || [text];
  const safeChunks: string[] = [];

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;

    if (trimmedSentence.length <= maxLen) {
      safeChunks.push(trimmedSentence);
    } else {
      // Split long sentence by word boundaries
      const words = trimmedSentence.split(/\s+/);
      let currentChunk = "";
      for (const word of words) {
        if (!word) continue;
        if ((currentChunk + " " + word).trim().length <= maxLen) {
          currentChunk = (currentChunk + " " + word).trim();
        } else {
          if (currentChunk) safeChunks.push(currentChunk);
          if (word.length > maxLen) {
            let rem = word;
            while (rem.length > maxLen) {
              safeChunks.push(rem.slice(0, maxLen));
              rem = rem.slice(maxLen);
            }
            currentChunk = rem;
          } else {
            currentChunk = word;
          }
        }
      }
      if (currentChunk) safeChunks.push(currentChunk);
    }
  }

  return safeChunks.length > 0 ? safeChunks : [text.slice(0, maxLen)];
}

// Concatenate multiple 24kHz PCM WAV buffers cleanly by stripping trailing 44-byte RIFF headers and recalculating chunk sizes
function concatenateWavBuffers(wavBuffers: Buffer[]): Buffer {
  if (wavBuffers.length === 1) return wavBuffers[0];
  const valid = wavBuffers.filter((b) => b.length > 44);
  if (valid.length === 0) return Buffer.concat(wavBuffers);
  if (valid.length === 1) return valid[0];

  const header = Buffer.from(valid[0].subarray(0, 44));
  const pcmSlices = valid.map((b) => b.subarray(44));
  const totalDataBytes = pcmSlices.reduce((acc, slice) => acc + slice.length, 0);

  header.writeUInt32LE(36 + totalDataBytes, 4);
  header.writeUInt32LE(totalDataBytes, 40);

  return Buffer.concat([header, ...pcmSlices]);
}

let geminiTtsCooldownUntil = 0;
const inFlightTtsRequests = new Map<string, Promise<{ buffer: Buffer; format: "wav" | "mp3"; voice: string }>>();

function parseRetryDelayMs(err: any): number {
  const msg = String(err?.message || err || "");
  const retryMatch = msg.match(/retry\s+in\s+([\d.]+)s/i) || msg.match(/"retryDelay"\s*:\s*"(\d+)s"/i);
  if (retryMatch) {
    const secs = parseFloat(retryMatch[1]);
    if (!Number.isNaN(secs) && secs > 0) {
      return Math.min(120000, Math.ceil((secs + 2) * 1000));
    }
  }
  return 60000;
}

// Single Authoritative Female Voice Engine: Gemini Studio Neural 'Kore' Female Acoustic Profile (24kHz WAV) with fallback
async function generateRealisticNeuralSpeech(
  text: string,
  languageCode: string = "en-US"
): Promise<{ buffer: Buffer; format: "wav" | "mp3"; voice: string }> {
  const tl = languageCode ? languageCode.split("-")[0].toLowerCase() : "en";
  const cacheKey = `kore:${tl}:${text}`;

  // 1. Instant Cache Check
  const cached = ttsAudioMemoryCache.get(cacheKey);
  if (cached && cached.length > 0) {
    const isWav = cached.length > 12 && cached.subarray(0, 4).toString("ascii") === "RIFF";
    return { buffer: cached, format: isWav ? "wav" : "mp3", voice: isWav ? "Kore" : "female-studio" };
  }

  // Deduplicate concurrent identical TTS requests so double-clicks share one synthesis call
  const existingPromise = inFlightTtsRequests.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const runSynthesis = (async (): Promise<{ buffer: Buffer; format: "wav" | "mp3"; voice: string }> => {
    // 2. Real Neural Synthesis via Gemini Studio TTS ('Kore' Female Profile) when GEMINI_API_KEY is configured and not cooling down
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "MY_GEMINI_API_KEY" && Date.now() >= geminiTtsCooldownUntil) {
      try {
        const ttsAi = getTtsAI();
        // Use large 2400-char segments so full tour sections & narrations complete in a single API call
        const ttsChunks = splitTextIntoSafeSpeechChunks(text, 2400);
        const wavClips: Buffer[] = [];

        for (const chunkText of ttsChunks) {
          const ttsResponse = await ttsAi.models.generateContent({
            model: CAMELLIA_TTS_MODEL,
            contents: [
              {
                role: "user",
                parts: [{ text: chunkText }],
              },
            ],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" },
                },
              },
            },
          });

          const base64Audio =
            ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            wavClips.push(Buffer.from(base64Audio, "base64"));
          }
        }

        if (wavClips.length > 0) {
          const finalWav = concatenateWavBuffers(wavClips);
          if (ttsAudioMemoryCache.size < 600) {
            ttsAudioMemoryCache.set(cacheKey, finalWav);
          }
          return { buffer: finalWav, format: "wav", voice: "Kore" };
        }
      } catch (geminiTtsErr: any) {
        const errMsg = String(geminiTtsErr?.message || geminiTtsErr || "");
        if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          const waitMs = parseRetryDelayMs(geminiTtsErr);
          geminiTtsCooldownUntil = Date.now() + waitMs;
        } else {
          console.info("[TTS] Gemini Kore synthesis fallback:", errMsg.slice(0, 180));
        }
      }
    }

    // 3. Fallback speech synthesis stream when Gemini TTS is in quota cooldown or unconfigured
    const chunks = splitTextIntoSafeSpeechChunks(text, 92);
    const chunkBuffers: Buffer[] = [];

    const BATCH_SIZE = 4;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (chunk) => {
          const subCacheKey = `chunk:${tl}:${chunk}`;
          const subCached = ttsAudioMemoryCache.get(subCacheKey);
          if (subCached) return subCached;

          const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(tl)}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
          let lastErr: any = null;

          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const res = await fetch(url, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                  Referer: "https://translate.google.com/",
                },
              });
              if (res.ok) {
                const buf = Buffer.from(await res.arrayBuffer());
                if (buf.length > 0) {
                  if (ttsAudioMemoryCache.size < 600) {
                    ttsAudioMemoryCache.set(subCacheKey, buf);
                  }
                  return buf;
                }
              }
            } catch (err) {
              lastErr = err;
            }
          }
          if (lastErr) throw lastErr;
          throw new Error(`Neural speech fetch error for chunk: "${chunk.slice(0, 20)}..."`);
        })
      );
      chunkBuffers.push(...batchResults);
    }

    const combined = Buffer.concat(chunkBuffers);
    if (ttsAudioMemoryCache.size < 600) {
      ttsAudioMemoryCache.set(cacheKey, combined);
    }

    return { buffer: combined, format: "mp3", voice: "female-studio" };
  })();

  inFlightTtsRequests.set(cacheKey, runSynthesis);
  try {
    return await runSynthesis;
  } finally {
    inFlightTtsRequests.delete(cacheKey);
  }
}

// Single Voice Speech Engine endpoint: Strictly locked to the 'Kore' studio female voice
app.post("/api/tts", async (req, res) => {
  try {
    const { text, languageCode = "en-US" } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text is required" });
    }

    const cleanedText = cleanAndPhoneticizeTextForSpeech(text);
    if (!cleanedText) {
      return res.json({ audioBase64: null, fallback: true });
    }

    try {
      const speechResult = await generateRealisticNeuralSpeech(cleanedText, languageCode);
      if (speechResult.buffer && speechResult.buffer.length > 0) {
        return res.json({
          audioBase64: speechResult.buffer.toString("base64"),
          format: speechResult.format,
          voice: speechResult.voice,
          sampleRate: 24000,
          fallback: false,
        });
      }
    } catch (neuralErr) {
      console.warn("Neural audio generation error:", neuralErr);
    }

    // Fallback indicator for browser speech synthesis (female-locked)
    res.json({
      audioBase64: null,
      sampleRate: 24000,
      fallback: true,
      message: "TTS fallback to client speech synthesis",
    });
  } catch (error: any) {
    res.json({
      audioBase64: null,
      sampleRate: 24000,
      fallback: true,
      message: "TTS fallback to client speech synthesis",
    });
  }
});

// Inquiries routing endpoint (Direct dispatch via Gmail SMTP - no persistent database storage)
app.post("/api/inquiries", async (req, res) => {
  try {
    const { name, email, note } = req.body ?? {};
    if (typeof name !== "string" || typeof note !== "string") {
      return res.status(400).json({ error: "Name and message note must be valid text." });
    }
    if (email !== undefined && typeof email !== "string") {
      return res.status(400).json({ error: "Email must be a valid text address." });
    }

    const senderName = stripHtmlTags(stripCrlf(name, 200)).slice(0, 100);
    const rawEmail = stripCrlf(email || "", 128).replace(/\s+/g, "");
    if (rawEmail && rawEmail !== "guest@portfolio.com" && rawEmail !== "visitor@mrs-concierge.internal" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return res.status(400).json({ error: "Please provide a valid reply-to email address." });
    }
    const senderEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
      ? rawEmail.slice(0, 128)
      : "visitor@mrs-concierge.internal";
    const senderNote = note
      .replace(/\r\n?/g, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
      .trim()
      .slice(0, 2000);

    if (!senderName || !senderNote) {
      return res.status(400).json({ error: "Valid name and message note are required." });
    }

    const destinationEmail = process.env.GMAIL_RECIPIENT || process.env.GMAIL_USER || "mr216873@gmail.com";
    const gmailUser = process.env.GMAIL_USER || "mr216873@gmail.com";

    const safeHtmlName = escapeHtml(senderName);
    const safeHtmlEmail = escapeHtml(senderEmail);
    const safeHtmlNote = escapeHtml(senderNote);
    const safeReplyHref = escapeHtml(safeMailtoHref(senderEmail, { fallbackEmail: destinationEmail }));
    const safeReplySubjectHref = escapeHtml(
      safeMailtoHref(senderEmail, {
        subject: "Re: Portfolio Inquiry - MRS",
        fallbackEmail: destinationEmail,
      })
    );

    const transporter = getSmtpTransporter();
    let smtpDelivered = false;
    let smtpMessageId = "";
    let smtpError: string | null = null;

    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: `"MRS Portfolio Concierge" <${gmailUser}>`,
          to: destinationEmail,
          replyTo: senderEmail,
          subject: sanitizeEmailSubject(`[MRS Inquiry] Direct message from ${senderName}`, 160),
          text: `You received a new portfolio inquiry from ${senderName} (${senderEmail}):\n\n"${senderNote}"\n\nTimestamp: ${new Date().toUTCString()}\nSource: MRS Gravatar Portfolio & Concierge`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0B0F19; color: #E5E7EB; border: 1px solid #1F2937; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              <div style="border-bottom: 1px solid #1F2937; padding-bottom: 16px; margin-bottom: 20px;">
                <span style="background: #1D8FF2; color: #FFFFFF; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; padding: 4px 8px; border-radius: 4px; display: inline-block;">MRS Concierge Dispatch</span>
                <h2 style="margin: 12px 0 4px 0; color: #FFFFFF; font-size: 20px;">New Portfolio Inquiry</h2>
                <p style="margin: 0; color: #9CA3AF; font-size: 13px;">Forwarded directly to ${escapeHtml(destinationEmail)} via Gmail SMTP</p>
              </div>

              <div style="background: #111827; border: 1px solid #1F2937; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 6px 0; color: #9CA3AF; width: 100px;"><strong>Sender:</strong></td>
                    <td style="padding: 6px 0; color: #F3F4F6; font-weight: 600;">${safeHtmlName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #9CA3AF;"><strong>Email:</strong></td>
                    <td style="padding: 6px 0; color: #1D8FF2;"><a href="${safeReplyHref}" style="color: #1D8FF2; text-decoration: none;">${safeHtmlEmail}</a></td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #9CA3AF;"><strong>Time (UTC):</strong></td>
                    <td style="padding: 6px 0; color: #9CA3AF;">${new Date().toUTCString()}</td>
                  </tr>
                </table>
              </div>

              <div style="background: #1A2234; border-left: 4px solid #1D8FF2; border-radius: 4px; padding: 16px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #9CA3AF; letter-spacing: 0.05em;">Message Content:</h4>
                <p style="margin: 0; color: #FFFFFF; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${safeHtmlNote}</p>
              </div>

              <div style="text-align: center; border-top: 1px solid #1F2937; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #6B7280;">
                <p style="margin: 0 0 12px 0;">This email was dispatched autonomously by your MRS Gravatar Concierge.</p>
                <a href="${safeReplySubjectHref}" style="display: inline-block; background: #1D8FF2; color: #FFFFFF; text-decoration: none; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; padding: 8px 18px; border-radius: 6px;">Reply Directly to ${safeHtmlName}</a>
              </div>
            </div>
          `,
        });
        smtpDelivered = true;
        smtpMessageId = info.messageId;
        console.log(`[Gmail SMTP] Successfully delivered inquiry ${info.messageId} to ${destinationEmail}`);
      } catch (err: any) {
        smtpError = err?.message || String(err);
        console.error(`[Gmail SMTP Error] Failed to send email:`, err);
      }
    } else {
      console.log(`[Gmail SMTP] Transporter not initialized (GMAIL_APP_PASSWORD pending). Direct routing acknowledgment for ${destinationEmail}`);
    }

    const inquirySubject = `Portfolio Inquiry from ${senderName}`;
    const inquiryBody = `Hello M R S,\n\nSender: ${senderName}\nEmail: ${senderEmail}\nDate: ${new Date().toUTCString()}\n\nMessage:\n${senderNote}\n\n--\nSent via M R S Interactive Portfolio`;
    const directGmailUrl = safeGmailComposeHref(destinationEmail, inquirySubject, inquiryBody);
    const mailtoUrl = safeMailtoHref(destinationEmail, {
      subject: inquirySubject,
      body: inquiryBody,
    });

    // Persist inquiry for the all-in-one monthly executive report
    try {
      recordInquiryLog({
        name: senderName,
        email: senderEmail,
        subject: `[MRS Inquiry] Message from ${senderName}`,
        note: senderNote,
        delivered: smtpDelivered,
      });
    } catch (logErr) {
      console.warn("[Inquiry Log] Failed to log inquiry:", logErr);
    }

    // Persist inquiry to Cloud SQL PostgreSQL database only when SQL_HOST is configured
    if (process.env.SQL_HOST && process.env.SQL_DB_NAME) {
      try {
        await saveInquiry(senderName, senderEmail, `[MRS Inquiry] Message from ${senderName}`, senderNote);
        console.log(`[Cloud SQL] Persisted inquiry from ${senderName} to database.`);
      } catch (dbErr) {
        console.warn(`[Cloud SQL] Non-fatal notice: Could not write inquiry to database:`, dbErr);
      }
    }

    res.json({
      success: true,
      smtpDelivered,
      smtpConfigured: Boolean(process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS),
      messageId: smtpMessageId || undefined,
      destinationEmail,
      directGmailUrl,
      mailtoUrl,
      message: smtpDelivered
        ? `Message sent directly to ${destinationEmail} via Gmail SMTP!`
        : `Message ready to send to ${destinationEmail}`,
      smtpError: smtpError || undefined,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to process inquiry" });
  }
});

// ============================================================================
// SERVER-SIDE USER ACCOUNT & AUTHENTICATION ENDPOINTS
// ============================================================================

// Register a new user account and store on server
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, displayName, receivePlatformUpdates = true, receiveBlogUpdates = true } = req.body ?? {};
    if (typeof email !== "string") {
      return res.status(400).json({ error: "A valid email address is required to create an account." });
    }
    const cleanEmail = stripCrlf(email, 128).replace(/\s+/g, "").toLowerCase();
    if (cleanEmail.length < 3 || cleanEmail.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "A valid email address is required to create an account." });
    }
    if (typeof password !== "string" || password.length < 6 || password.length > 128) {
      return res.status(400).json({ error: "Password must be between 6 and 128 characters." });
    }

    const cleanDisplayName =
      typeof displayName === "string"
        ? stripHtmlTags(stripCrlf(displayName, 100)).slice(0, 100) || undefined
        : undefined;

    const result = createAccount({
      email: cleanEmail,
      password,
      displayName: cleanDisplayName,
      receivePlatformUpdates: Boolean(receivePlatformUpdates),
      receiveBlogUpdates: Boolean(receiveBlogUpdates),
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Automatically register as active subscriber on server
    const siteUrl = resolveSiteUrl(req);
    upsertSubscriber({
      email: result.user.email,
      name: result.user.displayName,
      uid: result.user.uid,
      receivePlatformUpdates: result.user.receivePlatformUpdates,
      receiveBlogUpdates: result.user.receiveBlogUpdates,
    });

    // Send instant welcome confirmation email via Gmail SMTP if configured
    const transporter = getSmtpTransporter();
    let welcomeEmailSent = false;
    if (transporter) {
      try {
        const gmailUser = process.env.GMAIL_USER || "mr216873@gmail.com";
        const emailContent = formatWelcomeSubscriberEmail(result.user.email, result.user.displayName, siteUrl);
        await transporter.sendMail({
          from: `"Camellia (M R S Assistant)" <${gmailUser}>`,
          to: result.user.email,
          subject: sanitizeEmailSubject(emailContent.subject),
          text: emailContent.text,
          html: emailContent.html,
        });
        welcomeEmailSent = true;
      } catch (mailErr) {
        console.warn("[Auth] Welcome confirmation email dispatch notice:", mailErr);
      }
    }

    res.json({
      success: true,
      user: result.user,
      welcomeEmailSent,
      message: "Account created and safely stored on server. Signed in successfully!",
    });
  } catch (err: any) {
    console.error("Sign up endpoint error:", err);
    res.status(500).json({ error: err.message || "Internal server error during account creation." });
  }
});

// Authenticate user with server-stored account credentials
app.post("/api/auth/signin", (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password are required." });
    }
    const cleanEmail = stripCrlf(email, 128).replace(/\s+/g, "").toLowerCase();
    if (!cleanEmail || !password || password.length > 128) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = authenticateAccount(cleanEmail, password);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      success: true,
      user: result.user,
      message: "Signed in successfully using your account credentials.",
    });
  } catch (err: any) {
    console.error("Sign in endpoint error:", err);
    res.status(500).json({ error: err.message || "Internal server error during sign in." });
  }
});

// Update user profile or update email preferences
app.post("/api/auth/update-profile", (req, res) => {
  try {
    const { uid, displayName, receivePlatformUpdates, receiveBlogUpdates } = req.body ?? {};
    if (typeof uid !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid.trim())) {
      return res.status(400).json({ error: "Valid user UID is required." });
    }
    const cleanDisplayName =
      typeof displayName === "string"
        ? stripHtmlTags(stripCrlf(displayName, 100)).slice(0, 100)
        : undefined;

    const result = updateAccountProfile(uid.trim(), {
      displayName: cleanDisplayName,
      receivePlatformUpdates: receivePlatformUpdates !== undefined ? Boolean(receivePlatformUpdates) : undefined,
      receiveBlogUpdates: receiveBlogUpdates !== undefined ? Boolean(receiveBlogUpdates) : undefined,
    });

    if (!result.success) {
      return res.status(404).json({ error: result.error });
    }

    // Synchronize subscriber cache
    upsertSubscriber({
      email: result.user.email,
      name: result.user.displayName,
      uid: result.user.uid,
      receivePlatformUpdates: result.user.receivePlatformUpdates,
      receiveBlogUpdates: result.user.receiveBlogUpdates,
    });

    res.json({
      success: true,
      user: result.user,
      message: "Profile and email notification preferences updated.",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update profile." });
  }
});

// Preview the official platform update email announcement
app.get("/api/email/preview-update", (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  const sampleProject = {
    title: (req.query.title as string) || "Remote Diagnostics Pro & IT Monitoring Hub",
    category: (req.query.category as string) || "ENTERPRISE IT MANAGEMENT & NETWORK RECOVERY",
    description:
      (req.query.description as string) ||
      "Automated cross-platform telemetry monitoring, system heartbeat analysis, proactive incident alerting, and remote administration toolkit for Windows, Linux, and Microsoft 365 environments.",
    link: siteUrl,
    siteUrl,
    badge: (req.query.badge as string) || "FEATURED LAUNCH",
    tags: ["SysAdmin", "PowerShell", "Microsoft 365", "Remote Support", "Network Security", "Active Directory"],
    customNote:
      (req.query.customNote as string) ||
      "M R S has engineered and deployed this dedicated system management suite to provide end-to-end device visibility, remote troubleshooting protocols, and secure cloud management.",
    recipientName: (req.query.name as string) || "Valued Subscriber",
  };

  const email = formatProjectUpdateEmail(sampleProject);
  res.json({
    success: true,
    subject: email.subject,
    text: email.text,
    html: email.html,
    project: sampleProject,
    siteUrl,
  });
});

// Synchronize verified Firebase user with optional SQL database if configured
app.post("/api/auth/sync-user", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split("Bearer ")[1];
      const decoded = await adminAuth.verifyIdToken(token);
      if (process.env.SQL_HOST && process.env.SQL_DB_NAME && decoded?.uid && decoded?.email) {
        try {
          await getOrCreateUser(decoded.uid, decoded.email, decoded.name, decoded.picture);
        } catch (dbErr) {
          console.warn("Non-fatal Cloud SQL sync warning:", dbErr);
        }
      }
      return res.json({ success: true, uid: decoded.uid });
    }
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  } catch {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
});

// Get user profile by verified Firebase ID token
app.get("/api/user/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(400).json({ error: "Missing user UID in auth token" });
    }

    const userRecord =
      process.env.SQL_HOST && process.env.SQL_DB_NAME ? await getUserByUid(uid) : null;
    res.json({
      success: true,
      user: userRecord || {
        uid,
        email: req.user?.email || null,
        displayName: req.user?.name || null,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch user profile:", error);
    res.status(500).json({ error: error.message || "Failed to fetch profile" });
  }
});

app.get("/api/inquiries", (req, res) => {
  res.json({
    success: true,
    smtpConfigured: Boolean(process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS),
    destinationEmail: process.env.GMAIL_RECIPIENT || process.env.GMAIL_USER || "mr216873@gmail.com",
  });
});

// ============================================================================
// SUBSCRIBER & PLATFORM UPDATE BROADCAST ENDPOINTS
// ============================================================================

// Extract and resolve the canonical URL for this site
function resolveSiteUrl(req: express.Request): string {
  const candidateUrl = req.body?.siteUrl || req.body?.project?.siteUrl || req.body?.project?.link || req.body?.link;
  const candidateOrigin = resolveOriginUrl(candidateUrl);
  if (candidateOrigin) {
    return candidateOrigin;
  }
  const headerOrigin = resolveOriginUrl(req.headers.origin);
  if (headerOrigin) {
    return headerOrigin;
  }
  return resolveRequestOrigin(req);
}

// Subscribe to M R S platform & project email updates
app.post("/api/subscribers", async (req, res) => {
  try {
    const { email, name, uid, receivePlatformUpdates = true, receiveBlogUpdates = true } = req.body ?? {};
    if (typeof email !== "string") {
      return res.status(400).json({ error: "A valid email address is required to subscribe." });
    }

    const cleanSubEmail = stripCrlf(email, 128).replace(/\s+/g, "").toLowerCase();
    if (cleanSubEmail.length < 3 || cleanSubEmail.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanSubEmail)) {
      return res.status(400).json({ error: "Please provide a valid email address format." });
    }

    const cleanSubName = typeof name === "string" ? stripHtmlTags(stripCrlf(name, 100)).slice(0, 100) : undefined;
    const cleanSubUid = typeof uid === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(uid.trim()) ? uid.trim() : undefined;

    const siteUrl = resolveSiteUrl(req);
    const subscriber = upsertSubscriber({
      email: cleanSubEmail,
      name: cleanSubName || undefined,
      uid: cleanSubUid,
      receivePlatformUpdates: Boolean(receivePlatformUpdates),
      receiveBlogUpdates: Boolean(receiveBlogUpdates),
    });

    // Send instant welcome confirmation email via Gmail SMTP if configured
    const transporter = getSmtpTransporter();
    let welcomeEmailSent = false;
    if (transporter) {
      try {
        const gmailUser = process.env.GMAIL_USER || "mr216873@gmail.com";
        const emailContent = formatWelcomeSubscriberEmail(subscriber.email, subscriber.name, siteUrl);
        await transporter.sendMail({
          from: `"Camellia (M R S Assistant)" <${gmailUser}>`,
          to: subscriber.email,
          subject: sanitizeEmailSubject(emailContent.subject),
          text: emailContent.text,
          html: emailContent.html,
        });
        welcomeEmailSent = true;
      } catch (mailErr) {
        console.warn("[Subscribers] Welcome email delivery notice:", mailErr);
      }
    }

    res.json({
      success: true,
      subscriber,
      welcomeEmailSent,
      siteUrl,
      message: "Successfully subscribed to M R S platform & project updates!",
    });
  } catch (err: any) {
    console.error("Failed to process subscriber:", err);
    res.status(500).json({ error: err.message || "Failed to process subscription" });
  }
});

// Check subscriber status by email
app.get("/api/subscribers/status", (req, res) => {
  try {
    const email = String(req.query.email || "");
    if (!email) {
      return res.json({ subscribed: false });
    }
    const record = getSubscriberByEmail(email);
    res.json({
      subscribed: Boolean(record),
      subscriber: record || null,
      totalSubscribers: getAllSubscribers().length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to check subscriber status" });
  }
});

// Unsubscribe
app.post("/api/subscribers/unsubscribe", (req, res) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== "string") {
      return res.status(400).json({ error: "A valid email is required to unsubscribe." });
    }
    const cleanEmail = stripCrlf(email, 128).replace(/\s+/g, "").toLowerCase();
    if (cleanEmail.length < 3 || cleanEmail.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    const removed = removeSubscriber(cleanEmail);
    res.json({ success: true, removed, message: "Unsubscribed successfully." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to unsubscribe" });
  }
});

// Send a sample test platform update email directly to a recipient to verify formatting
app.post("/api/subscribers/test-email", async (req, res) => {
  try {
    const { email, name } = req.body ?? {};
    if (typeof email !== "string") {
      return res.status(400).json({ error: "Email address is required." });
    }
    const cleanTargetEmail = stripCrlf(email, 128).replace(/\s+/g, "").toLowerCase();
    if (cleanTargetEmail.length < 3 || cleanTargetEmail.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTargetEmail)) {
      return res.status(400).json({ error: "Please provide a valid recipient email address." });
    }
    const cleanTargetName =
      typeof name === "string" ? stripHtmlTags(stripCrlf(name, 100)).slice(0, 100) || undefined : undefined;

    const siteUrl = resolveSiteUrl(req);
    const transporter = getSmtpTransporter();
    const gmailUser = process.env.GMAIL_USER || "mr216873@gmail.com";

    // Customized update announcement featuring this site link ONLY
    const sampleProject = {
      title: "M R S Portfolio & Platform Hub",
      category: "IT Support & Web Management Platform",
      description: "Official interactive hub with real-time Gravatar V3 sync, certified IT support resources, Claude AI female voice assistant, and live platform services.",
      siteUrl,
      badge: "VERIFIED LIVE",
      tags: ["IT Support Professional", "Claude AI Voice Engine", "Gravatar V3 Real-time", "Cloud Infrastructure"],
      customNote: "This update showcases the verified features of M R S Portfolio Hub. As a valued subscriber, explore the platform directly with full open access.",
      recipientName: cleanTargetName,
    };

    const emailContent = formatProjectUpdateEmail(sampleProject);

    if (transporter) {
      await transporter.sendMail({
        from: `"Camellia (M R S Assistant)" <${gmailUser}>`,
        to: cleanTargetEmail,
        subject: sanitizeEmailSubject(`[Update Preview] ${emailContent.subject}`),
        text: emailContent.text,
        html: emailContent.html,
      });
      return res.json({
        success: true,
        delivered: true,
        siteUrl,
        message: `Customized Camellia (M R S Assistant) update email dispatched to ${cleanTargetEmail}!`,
      });
    }

    res.json({
      success: true,
      delivered: false,
      siteUrl,
      message: `Sample email generated. Configure GMAIL_APP_PASSWORD in settings for direct inbox dispatch.`,
      preview: emailContent,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to dispatch test email" });
  }
});

// Broadcast a project launch announcement to all registered subscribers
app.post("/api/subscribers/broadcast", async (req, res) => {
  try {
    const payload = (req.body && typeof req.body === "object" ? req.body.project || req.body : {}) as Record<string, unknown>;
    if (typeof payload.title !== "string" || !stripCrlf(payload.title, 200)) {
      return res.status(400).json({ error: "Project title is required for broadcast." });
    }
    const cleanTitle = stripHtmlTags(stripCrlf(payload.title, 200)).slice(0, 200);
    const cleanCategory =
      typeof payload.category === "string"
        ? stripHtmlTags(stripCrlf(payload.category, 100)).slice(0, 100) || "Featured Platform"
        : "Featured Platform";
    const cleanDescription =
      typeof payload.description === "string"
        ? stripHtmlTags(payload.description.replace(/\r\n?/g, "\n")).trim().slice(0, 2000) || "New project update from M R S."
        : "New project update from M R S.";
    const cleanBadge =
      typeof payload.badge === "string"
        ? stripHtmlTags(stripCrlf(payload.badge, 40)).slice(0, 40) || "NEW RELEASE"
        : "NEW RELEASE";
    const cleanTags = Array.isArray(payload.tags)
      ? payload.tags
          .filter((t): t is string => typeof t === "string")
          .slice(0, 12)
          .map((t) => stripHtmlTags(stripCrlf(t, 40)).slice(0, 40))
          .filter(Boolean)
      : [];
    const rawNote = payload.customNote ?? payload.speechNarrative;
    const cleanCustomNote =
      typeof rawNote === "string"
        ? stripHtmlTags(rawNote.replace(/\r\n?/g, "\n")).trim().slice(0, 2000) || undefined
        : undefined;

    const siteUrl = resolveSiteUrl(req);
    const subscribers = getAllSubscribers().filter((s) => s.receivePlatformUpdates);
    if (subscribers.length === 0) {
      return res.json({
        success: true,
        sentCount: 0,
        message: "No active platform update subscribers found.",
      });
    }

    const transporter = getSmtpTransporter();
    const gmailUser = process.env.GMAIL_USER || "mr216873@gmail.com";
    let sentCount = 0;

    if (transporter) {
      for (const subscriber of subscribers) {
        try {
          // Strictly this site link only
          const emailContent = formatProjectUpdateEmail({
            title: cleanTitle,
            category: cleanCategory,
            description: cleanDescription,
            siteUrl,
            badge: cleanBadge,
            tags: cleanTags,
            customNote: cleanCustomNote,
            recipientName: subscriber.name,
          });

          await transporter.sendMail({
            from: `"Camellia (M R S Assistant)" <${gmailUser}>`,
            to: subscriber.email,
            subject: sanitizeEmailSubject(emailContent.subject),
            text: emailContent.text,
            html: emailContent.html,
          });
          sentCount++;
        } catch (err) {
          console.warn(`[Broadcast] Failed to send email to ${subscriber.email}:`, err);
        }
      }
    }

    res.json({
      success: Boolean(transporter),
      delivered: Boolean(transporter && sentCount > 0),
      totalSubscribers: subscribers.length,
      sentCount,
      siteUrl,
      smtpConfigured: Boolean(transporter),
      message: transporter
        ? `Update announcement dispatched to ${sentCount} subscribers with this site link!`
        : `SMTP dispatch is unconfigured (GMAIL_APP_PASSWORD missing). 0 emails sent; ${subscribers.length} subscribers queued.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to broadcast project update" });
  }
});

// Automatic new update publishing endpoint: automatically sends email to all subscribers on new update
app.post("/api/updates/publish", async (req, res) => {
  try {
    const { title, category, description, badge, tags, customNote } = req.body ?? {};
    if (typeof title !== "string" || typeof description !== "string") {
      return res.status(400).json({ error: "Title and description strings are required for update publication." });
    }
    const cleanTitle = stripHtmlTags(stripCrlf(title, 200)).slice(0, 200);
    const cleanDescription = stripHtmlTags(description.replace(/\r\n?/g, "\n")).trim().slice(0, 2000);
    if (!cleanTitle || !cleanDescription) {
      return res.status(400).json({ error: "Title and description are required for update publication." });
    }

    const cleanCategory =
      typeof category === "string"
        ? stripHtmlTags(stripCrlf(category, 100)).slice(0, 100) || "Platform & IT Service Update"
        : "Platform & IT Service Update";
    const cleanBadge =
      typeof badge === "string"
        ? stripHtmlTags(stripCrlf(badge, 40)).slice(0, 40) || "NEW UPDATE"
        : "NEW UPDATE";
    const cleanTags = Array.isArray(tags)
      ? tags
          .filter((t): t is string => typeof t === "string")
          .slice(0, 12)
          .map((t) => stripHtmlTags(stripCrlf(t, 40)).slice(0, 40))
          .filter(Boolean)
      : ["IT Support", "Platform Update", "M R S Portfolio"];
    const cleanCustomNote =
      typeof customNote === "string"
        ? stripHtmlTags(customNote.replace(/\r\n?/g, "\n")).trim().slice(0, 2000) || undefined
        : undefined;

    const siteUrl = resolveSiteUrl(req);
    const transporter = getSmtpTransporter();

    const result = await dispatchUpdateNotificationToSubscribers(
      {
        title: cleanTitle,
        category: cleanCategory,
        description: cleanDescription,
        badge: cleanBadge,
        tags: cleanTags,
        customNote: cleanCustomNote,
        siteUrl,
      },
      transporter
    );

    res.json({
      success: true,
      siteUrl,
      sentCount: result.sentCount,
      totalSubscribers: result.totalSubscribers,
      smtpConfigured: Boolean(transporter),
      update: result.updateRecord,
      message: transporter
        ? `Update published and automatically emailed to ${result.sentCount} active subscribers!`
        : `Update logged. ${result.totalSubscribers} subscribers queued (configure GMAIL_APP_PASSWORD for direct live SMTP dispatch).`,
    });
  } catch (err: any) {
    console.error("Failed to publish update:", err);
    res.status(500).json({ error: err.message || "Failed to publish update and notify subscribers." });
  }
});

// Retrieve update announcements history
app.get("/api/updates/history", (req, res) => {
  try {
    const history = getUpdatesHistory();
    res.json({ success: true, count: history.length, updates: history });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve updates history." });
  }
});

// ============================================================================
// BACKEND SELF-PROMOTION & VIRAL DISTRIBUTION ENGINE
// ============================================================================

// 1. Social Sharing Links & High-Conversion Copy Generator (LinkedIn, X, WhatsApp, Telegram, etc.)
app.get("/api/promo/share-links", (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  const projectTitle = typeof req.query.project === "string" ? req.query.project : undefined;
  const packs = generateSocialSharePacks(siteUrl, projectTitle);
  res.json({
    success: true,
    siteUrl,
    projectTitle: projectTitle || "Full Portfolio",
    packs,
  });
});

// 2. RSS 2.0 Syndication Feed (for auto-distributors, IFTTT, Zapier, Blog readers, search crawlers)
app.get(["/rss.xml", "/api/feed.xml"], (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  res.header("Content-Type", "application/rss+xml; charset=utf-8");
  res.send(generateRssFeed(siteUrl));
});

// 3. Search Engine Sitemap XML
app.get("/sitemap.xml", (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(generateSitemapXml(siteUrl));
});

// 4. Search Engine Robots.txt with sitemap and RSS pointers
app.get("/robots.txt", (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  res.header("Content-Type", "text/plain; charset=utf-8");
  res.send(generateRobotsTxt(siteUrl));
});

// 5. Promotional Traffic & Referral Tracker (No cookies, privacy-preserving)
app.post("/api/promo/track", (req, res) => {
  const source = req.body.source || req.query.ref || "direct";
  trackReferral(String(source));
  res.json({ success: true, recorded: source });
});

// 6. Promotional Performance & Referral Analytics
app.get("/api/promo/stats", (req, res) => {
  const referrals = getReferralStats();
  const subscribersCount = getAllSubscribers().length;
  res.json({
    success: true,
    subscribersCount,
    totalReferralHits: referrals.reduce((sum, r) => sum + r.hits, 0),
    referrals,
  });
});

// 7. Preview Promotional Showcase Digest Email
app.get("/api/promo/preview-digest", (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  const digest = generatePromotionalDigestEmail(siteUrl);
  res.header("Content-Type", "text/html; charset=utf-8").send(digest.html);
});

// 8. Automated Promotional Digest Broadcast (to subscribers or preview to M R S)
app.post("/api/promo/broadcast-digest", async (req, res) => {
  try {
    const siteUrl = resolveSiteUrl(req);
    const testOnly = req.body.testOnly !== false; // defaults to test mode for safety
    const digest = generatePromotionalDigestEmail(siteUrl);
    const transporter = getSmtpTransporter();
    const gmailUser = process.env.GMAIL_USER || "mr216873@gmail.com";

    if (testOnly) {
      if (transporter) {
        await transporter.sendMail({
          from: `"Camellia (M R S Assistant)" <${gmailUser}>`,
          to: "mr216873@gmail.com",
          subject: sanitizeEmailSubject(`[PREVIEW] ${digest.subject}`),
          text: digest.text,
          html: digest.html,
        });
      }
      return res.json({
        success: true,
        testMode: true,
        sentTo: "mr216873@gmail.com",
        smtpConfigured: Boolean(transporter),
        message: transporter
          ? "Promotional digest preview email successfully sent to mr216873@gmail.com."
          : "SMTP not configured (set GMAIL_APP_PASSWORD to enable live delivery). Generated preview successfully.",
        digestPreview: {
          subject: digest.subject,
        },
      });
    }

    // Live broadcast to all subscribers
    const subscribers = getAllSubscribers().filter((s) => s.receivePlatformUpdates);
    let sentCount = 0;
    if (transporter && subscribers.length > 0) {
      for (const subscriber of subscribers) {
        try {
          await transporter.sendMail({
            from: `"Camellia (M R S Assistant)" <${gmailUser}>`,
            to: subscriber.email,
            subject: sanitizeEmailSubject(digest.subject),
            text: digest.text,
            html: digest.html,
          });
          sentCount++;
        } catch (err) {
          console.warn(`[PromoBroadcast] Failed to send to ${subscriber.email}:`, err);
        }
      }
    }

    res.json({
      success: Boolean(transporter),
      delivered: Boolean(transporter && sentCount > 0),
      testMode: false,
      totalSubscribers: subscribers.length,
      sentCount,
      smtpConfigured: Boolean(transporter),
      message: transporter
        ? `Promotional digest dispatched to ${sentCount} subscribers.`
        : `SMTP is not configured (GMAIL_APP_PASSWORD missing). Live promotional broadcast was not sent; 0 of ${subscribers.length} subscribers dispatched.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to broadcast promotional digest" });
  }
});

// =========================================================================
// BACKEND VISITOR HELP TRACKING & MONTHLY REPORTING API
// (Strictly executed in backend as instructed)
// =========================================================================

// Retrieve current visitor help stats & counts
app.get(["/api/backend/visitor-help-stats", "/api/visitor-help/stats"], (req, res) => {
  try {
    const stats = getVisitorHelpStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to retrieve visitor help stats" });
  }
});

// Trigger / dispatch monthly report to mr216873@gmail.com (Protected Admin Action)
app.post(["/api/backend/send-monthly-report", "/api/send-monthly-report"], requireAdminAuthorization, async (req, res) => {
  try {
    const force = req.body?.force === true;
    const targetMonth = typeof req.body?.month === "string" ? req.body.month.trim() : undefined;
    const transporter = getSmtpTransporter();
    const result = await sendMonthlyReport(transporter, force, targetMonth);
    res.json({
      success: true,
      result,
      recipient: "mr216873@gmail.com",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to dispatch monthly report" });
  }
});

// Preview HTML monthly report (Protected Admin Endpoint)
app.get(["/api/backend/preview-monthly-report", "/api/preview-monthly-report"], requireAdminAuthorization, (req, res) => {
  try {
    const monthKey = typeof req.query.month === "string" ? req.query.month.trim() : undefined;
    const now = new Date();
    const defaultMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const report = buildMonthlyReportContent(monthKey || defaultMonthKey);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(report.html);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate monthly report preview" });
  }
});

// Stored verified face records log endpoint (Protected Admin Endpoint)
app.get(["/api/backend/verified-faces", "/api/verified-faces"], requireAdminAuthorization, (req, res) => {
  try {
    const monthKey = typeof req.query.month === "string" ? req.query.month : undefined;
    const faces = getVerifiedFacesLog(monthKey);
    res.json({ success: true, count: faces.length, faces });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load verified faces log" });
  }
});

// =========================================================================
// BACKEND ANNUAL POLICY & COPYRIGHT GOVERNANCE API
// (Automatically runs every year and auto-updates site legal manifest)
// =========================================================================

app.get(["/api/policies/current", "/api/site-policies"], (req, res) => {
  try {
    const policies = getCurrentPolicies();
    res.json(policies);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load current policies" });
  }
});

app.post(["/api/backend/run-annual-update", "/api/run-annual-update"], requireAdminAuthorization, async (req, res) => {
  try {
    const force = req.body?.force === true;
    const log = await checkAndApplyAnnualUpdate(force);
    res.json({ success: true, log });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute annual update" });
  }
});

// =========================================================================
// REAL SPONSORED PARTNERS & ADVERTISING NETWORK ENDPOINTS
// =========================================================================

const SPONSOR_LINKS_DIRECTORY = [
  {
    id: "sponsor-11226634",
    indexLabel: "01",
    zoneId: "11226634",
    url: "https://uplcm.com/4/11226634",
    title: "Cloud Infrastructure & Remote Ops Partner",
    category: "Cloud & IT",
    summary: "High-availability cloud workspace and remote system administration offer curated alongside M R S IT operations.",
    benefit: "Funds open IT troubleshooting guides & server uptime",
    recommendedFor: "Remote Teams & Admins",
    matchedSection: "All Services & Cloud Hub",
    ctaLabel: "Explore Cloud Partner",
    placement: "featured",
  },
  {
    id: "sponsor-11683565",
    indexLabel: "02",
    zoneId: "11683565",
    url: "https://uplcm.com/4/11683565",
    title: "Global Streaming & Smart-TV Partner",
    category: "Digital Media",
    summary: "Featured cross-device streaming and entertainment discovery partner aligned with IPTV Web & Android TV visitors.",
    benefit: "Supports free streaming & APK directory access",
    recommendedFor: "IPTV & Media Visitors",
    matchedSection: "IPTV WEB & Apps Store",
    ctaLabel: "Explore Media Offer",
    placement: "featured",
  },
  {
    id: "sponsor-11242745",
    indexLabel: "03",
    zoneId: "11242745",
    url: "https://uplcm.com/4/11242745",
    title: "Endpoint Defense & Browser Safety Hub",
    category: "Security & Privacy",
    summary: "Verified security software and malware defense resources for safer Windows, Android, and remote work devices.",
    benefit: "Device Hardening",
    recommendedFor: "Everyday & Remote PC Users",
    matchedSection: "IT Diagnostics & Ethical Defense",
    ctaLabel: "View Security Tool",
    placement: "directory",
  },
  {
    id: "sponsor-11242069",
    indexLabel: "04",
    zoneId: "11242069",
    url: "https://uplcm.com/4/11242069",
    title: "Modern DevOps & Web Automation Suite",
    category: "Developer Tools",
    summary: "API utilities, deployment acceleration, and web management resources for developers and digital operators.",
    benefit: "Fast Web Workflows",
    recommendedFor: "Web Managers & Builders",
    matchedSection: "Web Development & Camellia AI",
    ctaLabel: "Open Dev Utilities",
    placement: "directory",
  },
  {
    id: "sponsor-11242067",
    indexLabel: "05",
    zoneId: "11242067",
    url: "https://uplcm.com/4/11242067",
    title: "Managed Domain, DNS & Edge Hosting",
    category: "Web Hosting",
    summary: "Low-latency web hosting, SSL routing, and reliable domain management offers for business sites and blogs.",
    benefit: "99.9% Edge Routing",
    recommendedFor: "Site Owners & Startups",
    matchedSection: "BLOGGER & WordPress CMS",
    ctaLabel: "Launch Hosting Offer",
    placement: "directory",
  },
  {
    id: "sponsor-11242742",
    indexLabel: "06",
    zoneId: "11242742",
    url: "https://uplcm.com/4/11242742",
    title: "Office 365 & Document Workflow Tools",
    category: "Productivity",
    summary: "Document formatting, executive spreadsheet automation, and team productivity utilities matched to M R S workflows.",
    benefit: "Executive Office Sync",
    recommendedFor: "Professionals & Analysts",
    matchedSection: "MS 365 & Document Ops",
    ctaLabel: "Boost Productivity",
    placement: "directory",
  },
  {
    id: "sponsor-11230440",
    indexLabel: "07",
    zoneId: "11230440",
    url: "https://uplcm.com/4/11230440",
    title: "Encrypted Cloud Backup & Disaster Recovery",
    category: "Cloud & IT",
    summary: "Automated multi-device workstation backup and rapid system state restoration tailored for zero-data-loss resilience.",
    benefit: "Automated Backups",
    recommendedFor: "Distributed Workstations",
    matchedSection: "Remote System Admin",
    ctaLabel: "Protect Workspace",
    placement: "directory",
  },
  {
    id: "sponsor-11683560",
    indexLabel: "08",
    zoneId: "11683560",
    url: "https://uplcm.com/4/11683560",
    title: "Mobile APK & Connected Screen Utilities",
    category: "Digital Media",
    summary: "Lightweight mobile and television utility releases vetted for smooth streaming and low-overhead installation.",
    benefit: "Multi-Device Ready",
    recommendedFor: "Android & Smart TV Users",
    matchedSection: "Android Apps & TV Builds",
    ctaLabel: "Explore Screen Apps",
    placement: "directory",
  },
  {
    id: "sponsor-9912130",
    indexLabel: "09",
    zoneId: "9912130",
    url: "https://uplcm.com/4/9912130",
    title: "Global Web CDN & Portal Accelerator",
    category: "Web Hosting",
    summary: "Core partner distribution channel helping sustain free tech blog tutorials and humanitarian community projects.",
    benefit: "Global Traffic Routing",
    recommendedFor: "Publishers & Creators",
    matchedSection: "Charity Foundation & Blog",
    ctaLabel: "Visit Network Partner",
    placement: "directory",
  },
  {
    id: "sponsor-11242744",
    indexLabel: "10",
    zoneId: "11242744",
    url: "https://uplcm.com/4/11242744",
    title: "Private Tunnel & Zero-Trust Access Kit",
    category: "Security & Privacy",
    summary: "Encrypted remote connection utilities built for privacy-conscious consultants and confidential communications.",
    benefit: "Encrypted Tunnels",
    recommendedFor: "Privacy-First Visitors",
    matchedSection: "Private C N Workspace",
    ctaLabel: "Secure Connection",
    placement: "directory",
  },
];

const SPONSORS_STATS_FILE = path.join(process.cwd(), "data", "sponsors_stats.json");
const sponsorClickStats = new Map<string, { clicks: number; lastClickedAt: string | null }>();

function loadSponsorStats() {
  try {
    if (fs.existsSync(SPONSORS_STATS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SPONSORS_STATS_FILE, "utf-8"));
      if (parsed && typeof parsed === "object") {
        for (const [id, entry] of Object.entries<any>(parsed)) {
          if (entry && typeof entry.clicks === "number") {
            sponsorClickStats.set(id, {
              clicks: entry.clicks,
              lastClickedAt: entry.lastClickedAt || null,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Sponsors] Could not load sponsors_stats.json:", err);
  }
}

function saveSponsorStats() {
  try {
    const dir = path.dirname(SPONSORS_STATS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const obj: Record<string, { clicks: number; lastClickedAt: string | null }> = {};
    for (const [k, v] of sponsorClickStats.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SPONSORS_STATS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Sponsors] Could not persist sponsors_stats.json:", err);
  }
}

loadSponsorStats();

app.get("/api/sponsors", (req, res) => {
  const sponsorsWithStats = SPONSOR_LINKS_DIRECTORY.map((sp) => {
    const stat = sponsorClickStats.get(sp.id);
    return {
      ...sp,
      clicks: stat?.clicks || 0,
      lastClickedAt: stat?.lastClickedAt || null,
    };
  });
  res.json({
    success: true,
    count: sponsorsWithStats.length,
    sponsors: sponsorsWithStats,
  });
});

app.post("/api/sponsors/click", (req, res) => {
  try {
    const rawSponsorId = typeof req.body?.sponsorId === "string" ? req.body.sponsorId.slice(0, 64) : "";
    const url = typeof req.body?.url === "string" ? req.body.url.slice(0, 256) : "";
    const matchedSponsor = SPONSOR_LINKS_DIRECTORY.find(
      (s) => s.id === rawSponsorId || s.url === url
    );
    if (!matchedSponsor) {
      return res.status(400).json({ error: "Unrecognized sponsor target" });
    }
    const canonicalId = matchedSponsor.id;
    const prev = sponsorClickStats.get(canonicalId) || { clicks: 0, lastClickedAt: null };
    const updated = {
      clicks: prev.clicks + 1,
      lastClickedAt: new Date().toISOString(),
    };
    sponsorClickStats.set(canonicalId, updated);
    saveSponsorStats();
    res.json({ success: true, sponsorId: canonicalId, recorded: true, clicks: updated.clicks });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to record sponsor click" });
  }
});

// =========================================================================
// CAMELLIA ASSISTANT INTERNAL CROSS-SYNC & REALTIME DATA SHARING
// (Connects internally to https://camellia-assistant.ai.studio/)
// =========================================================================

app.get(["/api/assistant/cross-sync-status", "/api/assistant/status"], (req, res) => {
  try {
    const status = getAssistantSyncStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get assistant sync status" });
  }
});

app.post(["/api/assistant/cross-sync", "/api/assistant/sync-now"], async (req, res) => {
  try {
    const clientIp = extractClientIp(req);
    const result = await syncUserDataWithRemoteAssistant({
      visitorIp: clientIp,
      query: req.body?.query,
      category: req.body?.category || "manual_sync",
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Cross-sync failed" });
  }
});

// Full Shared State API for https://camellia-assistant.ai.studio/ (CORS Enabled)
app.get(["/api/assistant/shared-data", "/api/assistant/shared-state"], (req, res) => {
  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    const cachedProfile = latestGravatarCache?.profile;
    const fullState = getFullSharedBackendState(cachedProfile);
    res.json(fullState);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to load shared state" });
  }
});

// =========================================================================
// REAL FUTURE TECHNOLOGY ENDPOINTS:
// 1. Speech-to-Text Transcription (gemini-3.5-transcribe)
// 2. Neural Semantic Search (gemini-embedding-2 + Cosine Similarity)
// 3. Real-Time Duplex Voice & Vision Live API WebSocket (/api/live, gemini-3.8-live)
// =========================================================================

app.post("/api/transcribe", async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/webm" } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "audioBase64 is required" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      return res.status(503).json({ error: "Transcription service unavailable" });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
    const safeMime = String(mimeType).split(";")[0].trim() || "audio/webm";
    const ai = getTtsAI();

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: safeMime,
              data: cleanBase64,
            },
          },
          {
            text: "Transcribe the spoken audio accurately into clean plain text in the original language. Return only the transcription.",
          },
        ],
      },
    });

    const transcript = (response.text || "").trim();
    res.json({ success: true, transcript });
  } catch (err: any) {
    console.warn("[Transcribe] Error:", err?.message || err);
    res.status(500).json({ error: "Audio transcription failed. Please try again." });
  }
});

interface SemanticDoc {
  id: string;
  type: "section" | "project" | "service" | "sponsor" | "credential";
  title: string;
  subtitle: string;
  searchBody: string;
  scrollTarget?: string;
  explainKey?: string;
  url?: string;
}

const SEMANTIC_BASE_CATALOG: SemanticDoc[] = [
  {
    id: "sec-header",
    type: "section",
    title: "M R S Executive Profile & Introduction",
    subtitle: "IT Support Professional · Remote Admin · Web Manager",
    searchBody: "M R S IT support professional remote administrator documentation specialist web manager Microsoft 365 troubleshooting",
    scrollTarget: "#profile-header",
    explainKey: "header",
  },
  {
    id: "sec-bio",
    type: "section",
    title: "About & Remote IT Services",
    subtitle: "Executive Narrative · System Troubleshooting · Microsoft 365 · Web Ops",
    searchBody: "about biography Microsoft Office Word Excel documentation remote administration troubleshooting services",
    scrollTarget: "#bio",
    explainKey: "bio",
  },
  {
    id: "sec-cv",
    type: "credential",
    title: "Download Executive CV & Resume (PDF)",
    subtitle: "Complete A4 Resume — Includes Certifications, Academic Education & Experience",
    searchBody: "download CV resume PDF printable verification career credentials certifications certificates academic education degree IELTS 360-hour hiring recruiter qualifications",
    scrollTarget: "#cv-download-bar",
    explainKey: "cv",
  },
  {
    id: "sec-interests",
    type: "service",
    title: "Core Competencies & Technical Focus",
    subtitle: "Web Development · Web3 · Ethical Hacking · Social Sciences · Remote Working",
    searchBody: "skills competencies technical stack ethical hacking cybersecurity defense web development Web3 social sciences remote collaboration troubleshooting",
    scrollTarget: "#interests",
    explainKey: "interests",
  },
  {
    id: "sec-contact",
    type: "service",
    title: "Direct Contact, Gmail & Calendly Booking",
    subtitle: "Email mr216873@gmail.com or schedule a remote consultation",
    searchBody: "contact email inquiry hire book meeting appointment Calendly phone support WhatsApp consultation",
    scrollTarget: "#contact",
    explainKey: "contact",
  },
  ...SPONSOR_LINKS_DIRECTORY.map((sp) => ({
    id: sp.id,
    type: "sponsor" as const,
    title: `${sp.title} (${sp.category})`,
    subtitle: `${sp.recommendedFor} · ${sp.benefit}`,
    searchBody: `sponsor partner advertiser ${sp.title} ${sp.summary} ${sp.category} ${sp.benefit} ${sp.recommendedFor} ${sp.placement} ${sp.zoneId}`,
    scrollTarget: "#sponsors",
    explainKey: "sponsors",
    url: sp.url,
  })),
];

function getDynamicSemanticCatalog(): SemanticDoc[] {
  const liveProjects: any[] = Array.isArray(latestGravatarCache?.profile?.projects) && latestGravatarCache.profile.projects.length > 0
    ? latestGravatarCache.profile.projects
    : [
        { id: "proj-1-services", title: "All Services", category: "Services & IT Hub", description: "Remote IT support, virtual assistance, Microsoft 365 document workflows, web management, and digital solutions.", tags: ["IT Support", "Services", "Remote"], link: "https://mrs-services.ai.studio/" },
        { id: "proj-2-iptv-web", title: "IPTV WEB", category: "Live Streaming & Media Platform", description: "Stream 10,000+ live channels of Sports, Movies, Dramas, and News with high-definition playback.", tags: ["IPTV", "Streaming", "Live TV"], link: "https://shahin-iptv.ai.studio" },
        { id: "proj-3-apps-store", title: "Apps Store", category: "Web & Android App Directory", description: "Direct access to lightweight utilities, Android APK apps, and productivity tools.", tags: ["Apps Store", "Android", "Software"], link: "https://mrmahbubur.github.io/APPS-STORE/" },
        { id: "proj-4-pcn", title: "Private C N", category: "Privacy & Secure Communications", description: "Everything is Private And Safe — privacy-first communications and confidential workspace.", tags: ["Privacy", "Encrypted", "Confidential"], link: "https://mrs-pcn.ai.studio/" },
        { id: "proj-5-shop", title: "Camellia Shop", category: "Global E-Commerce Storefront", description: "Global E-commerce Site, For making life easier.", tags: ["Camellia Shop", "E-Commerce", "Shopping"], link: "https://mrmahbubur.github.io/Camellia-Shop/" },
        { id: "proj-6-charity", title: "Charity Project", category: "Humanitarian Non-Profit", description: "Transforming lives through healthcare, education, shelter, and empowerment for communities in need.", tags: ["Charity", "Humanitarian", "Foundation"], link: "https://mrmahbubur.github.io/Charity-Foundation/" },
        { id: "proj-7-blogger", title: "BLOGGER", category: "Tech Blog", description: "Practical fixes and step-by-step guides for Windows, Android, WiFi, and browsers since 2018.", tags: ["Blog", "Tutorials", "Troubleshooting"], link: "https://mrxshahin.blogspot.com/" },
        { id: "proj-8-camellia-ai", title: "Camellia Ai", category: "Interactive AI Assistant Platform", description: "Interactive conversational AI assistant providing voice guidance, coding help, and research.", tags: ["Camellia AI", "Assistant", "Voice"], link: "https://mrmahbubur.github.io/Camellia-Ai/" },
        { id: "proj-9-cloud", title: "Cloud", category: "Portfolio & Admin Hub", description: "IT support, virtual assistance, data entry, web management, AI solutions, technical writing, and CV design.", tags: ["Cloud", "Admin", "Portfolio"], link: "https://mrmahbubur.github.io/Admin/" },
      ];

  const projectDocs: SemanticDoc[] = liveProjects.map((p: any) => ({
    id: p.id || `proj-${p.title}`,
    type: "project" as const,
    title: `${p.title} — ${p.category || "Platform"}`,
    subtitle: p.description || "",
    searchBody: `${p.title} ${p.category || ""} ${p.description || ""} ${(Array.isArray(p.tags) ? p.tags.join(" ") : "")} ${p.link || ""}`,
    scrollTarget: "#links",
    explainKey: p.id,
    url: p.link,
  }));

  return [...SEMANTIC_BASE_CATALOG.slice(0, 3), ...projectDocs, ...SEMANTIC_BASE_CATALOG.slice(3)];
}

let cachedSemanticVectors: Array<{ doc: SemanticDoc; vec: number[] }> | null = null;
let cachedSemanticCatalogSignature = "";
let semanticEmbedInFlight: Promise<Array<{ doc: SemanticDoc; vec: number[] }> | null> | null = null;

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

function lexicalSimilarity(query: string, target: string): number {
  const qTokens = query.toLowerCase().split(/\W+/).filter((w) => w.length > 1);
  if (qTokens.length === 0) return 0;
  const targetLower = target.toLowerCase();
  let hits = 0;
  for (const t of qTokens) {
    if (targetLower.includes(t)) hits += 1;
  }
  return Math.min(0.99, hits / qTokens.length);
}

async function ensureSemanticCatalogVectors(): Promise<Array<{ doc: SemanticDoc; vec: number[] }> | null> {
  const catalog = getDynamicSemanticCatalog();
  const signature = catalog.map((d) => `${d.id}:${d.title}:${d.url || ""}`).join("|");

  if (cachedSemanticVectors && cachedSemanticCatalogSignature === signature) {
    return cachedSemanticVectors;
  }
  if (semanticEmbedInFlight && cachedSemanticCatalogSignature === signature) {
    return semanticEmbedInFlight;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") return null;

  cachedSemanticCatalogSignature = signature;
  semanticEmbedInFlight = (async () => {
    const clients = [getTtsAI(), getAI()];
    for (const client of clients) {
      try {
        const res = await client.models.embedContent({
          model: "gemini-embedding-2",
          contents: catalog.map((d) => ({
            role: "user",
            parts: [{ text: `${d.title}. ${d.subtitle}. ${d.searchBody}` }],
          })),
        });
        const embeddings = res.embeddings || [];
        if (embeddings.length === catalog.length) {
          cachedSemanticVectors = catalog.map((doc, idx) => ({
            doc,
            vec: embeddings[idx]?.values || [],
          })).filter((entry) => entry.vec.length > 0);
          semanticEmbedInFlight = null;
          return cachedSemanticVectors;
        }
      } catch (err: any) {
        console.warn("[SemanticSearch] Batch embed attempt:", err?.message || err);
      }

      // Single-item parallel embed fallback in case model expects unary embed requests
      try {
        const vecs = await Promise.all(
          catalog.map(async (doc) => {
            const single = await client.models.embedContent({
              model: "gemini-embedding-2",
              contents: `${doc.title}. ${doc.subtitle}. ${doc.searchBody}`,
            });
            return { doc, vec: single.embeddings?.[0]?.values || [] };
          })
        );
        const valid = vecs.filter((v) => v.vec.length > 0);
        if (valid.length === catalog.length) {
          cachedSemanticVectors = valid;
          semanticEmbedInFlight = null;
          return cachedSemanticVectors;
        }
      } catch (singleErr: any) {
        console.warn("[SemanticSearch] Single embed attempt:", singleErr?.message || singleErr);
      }
    }
    semanticEmbedInFlight = null;
    return null;
  })();

  return semanticEmbedInFlight;
}

app.post("/api/semantic-search", async (req, res) => {
  try {
    const catalog = getDynamicSemanticCatalog();
    const query = typeof req.body?.query === "string" ? req.body.query.trim().slice(0, 300) : "";
    if (!query) {
      return res.json({
        success: true,
        engine: "default",
        results: catalog.slice(0, 8).map((doc) => ({
          id: doc.id,
          type: doc.type,
          title: doc.title,
          subtitle: doc.subtitle,
          scrollTarget: doc.scrollTarget,
          explainKey: doc.explainKey,
          url: doc.url,
          score: 1,
        })),
      });
    }

    const catalogVectors = await ensureSemanticCatalogVectors();
    const apiKey = process.env.GEMINI_API_KEY;

    if (catalogVectors && catalogVectors.length > 0 && apiKey && apiKey !== "MY_GEMINI_API_KEY") {
      for (const client of [getTtsAI(), getAI()]) {
        try {
          const qEmbed = await client.models.embedContent({
            model: "gemini-embedding-2",
            contents: query,
          });
          const qVec = qEmbed.embeddings?.[0]?.values;
          if (qVec && qVec.length > 0) {
            const scored = catalogVectors
              .map(({ doc, vec }) => {
                const sem = cosineSimilarity(qVec, vec);
                const lex = lexicalSimilarity(query, `${doc.title} ${doc.subtitle} ${doc.searchBody}`);
                const score = Math.min(0.99, Math.max(0, sem * 0.85 + lex * 0.25));
                return { doc, score };
              })
              .sort((a, b) => b.score - a.score)
              .slice(0, 8)
              .map(({ doc, score }) => ({
                id: doc.id,
                type: doc.type,
                title: doc.title,
                subtitle: doc.subtitle,
                scrollTarget: doc.scrollTarget,
                explainKey: doc.explainKey,
                url: doc.url,
                score: Number(score.toFixed(3)),
              }));

            return res.json({
              success: true,
              engine: "gemini-embedding-2",
              results: scored,
            });
          }
        } catch (qErr: any) {
          console.warn("[SemanticSearch] Query embed fallback:", qErr?.message || qErr);
        }
      }
    }

    // Deterministic lexical vector fallback
    const fallbackResults = catalog
      .map((doc) => ({
        doc,
        score: lexicalSimilarity(query, `${doc.title} ${doc.subtitle} ${doc.searchBody}`),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ doc, score }) => ({
        id: doc.id,
        type: doc.type,
        title: doc.title,
        subtitle: doc.subtitle,
        scrollTarget: doc.scrollTarget,
        explainKey: doc.explainKey,
        url: doc.url,
        score: Number(score.toFixed(3)),
      }));

    res.json({
      success: true,
      engine: "lexical-vector",
      results: fallbackResults,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Semantic search failed" });
  }
});

// Vite & Static file handler + Real-Time Gemini Live API WebSocket Bridge (/api/live)
async function startServer() {
  // Launch 24/7 Autonomous Background Gravatar Auto-Sync Daemon
  startGravatarAutoSyncDaemon(8000);

  // Launch Autonomous Background Monthly Report & Help Counter Scheduler
  startMonthlyReportScheduler(getSmtpTransporter);

  // Launch Autonomous Background Annual Policy & Copyright Governance Scheduler
  startAnnualUpdateScheduler();

  const server = http.createServer(app);

  const injectCanonicalSeoHtml = (rawHtml: string, req: express.Request): string => {
    const baseOrigin = resolveRequestOrigin(req);
    const collapsedPath = (req.path || "/").replace(/\/{2,}/g, "/");
    const reqPath = collapsedPath !== "/" ? collapsedPath.replace(/\/+$/, "") : "/";
    const canonicalRaw = new URL(reqPath, baseOrigin).toString();
    const websiteRootRaw = new URL("/", baseOrigin).toString();
    const imageRaw = new URL("/mrs_profile_avatar.jpg", baseOrigin).toString();
    const isHttpsOrigin = imageRaw.startsWith("https://");

    const canonicalUrl = escapeHtml(canonicalRaw);
    const imageAbsUrl = escapeHtml(imageRaw);
    const websiteJsonUrl = escapeJsonLdString(websiteRootRaw);
    const canonicalJsonUrl = escapeJsonLdString(canonicalRaw);
    const jsonImageAbsUrl = escapeJsonLdString(imageRaw);

    const updatedHtml = rawHtml
      .replace(
        /<link id="canonical-link" rel="canonical" href="[^"]*"\s*\/?>/i,
        `<link id="canonical-link" rel="canonical" href="${canonicalUrl}" />`
      )
      .replace(
        /<meta id="og-url-meta" property="og:url" content="[^"]*"\s*\/?>/i,
        `<meta id="og-url-meta" property="og:url" content="${canonicalUrl}" />`
      )
      .replace(
        /<meta id="og-image-meta" property="og:image" content="[^"]*"\s*\/?>/i,
        `<meta id="og-image-meta" property="og:image" content="${imageAbsUrl}" />`
      )
      .replace(
        /<meta id="og-image-secure-meta" property="og:image:secure_url" content="[^"]*"\s*\/?>/i,
        isHttpsOrigin
          ? `<meta id="og-image-secure-meta" property="og:image:secure_url" content="${imageAbsUrl}" />`
          : ""
      )
      .replace(
        /<meta id="twitter-url-meta" name="twitter:url" content="[^"]*"\s*\/?>/i,
        `<meta id="twitter-url-meta" name="twitter:url" content="${canonicalUrl}" />`
      )
      .replace(
        /<meta id="twitter-image-meta" name="twitter:image" content="[^"]*"\s*\/?>/i,
        `<meta id="twitter-image-meta" name="twitter:image" content="${imageAbsUrl}" />`
      )
      .replace(
        /("@id":\s*"#website"[\s\S]*?"url":\s*)"https:\/\/ais-pre-kvr65sziiqaqoqlwvajinm-369506879239\.asia-southeast1\.run\.app\/"/g,
        `$1"${websiteJsonUrl}"`
      )
      .replace(
        /("@id":\s*"#profilepage"[\s\S]*?"url":\s*)"https:\/\/ais-pre-kvr65sziiqaqoqlwvajinm-369506879239\.asia-southeast1\.run\.app\/"/g,
        `$1"${canonicalJsonUrl}"`
      )
      .replace(
        /"url":\s*"\/mrs_profile_avatar\.jpg"/g,
        `"url": "${jsonImageAbsUrl}"`
      )
      .replace(
        /"contentUrl":\s*"\/mrs_profile_avatar\.jpg"/g,
        `"contentUrl": "${jsonImageAbsUrl}"`
      )
      .replace(
        /"image":\s*"\/mrs_profile_avatar\.jpg"/g,
        `"image": "${jsonImageAbsUrl}"`
      );

    return updatedHtml;
  };

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: "spa",
    });
    app.get("*", async (req, res, next) => {
      const accept = String(req.headers.accept || "");
      const isHtmlNav =
        req.path === "/" ||
        (!req.path.startsWith("/api") &&
          !path.extname(req.path) &&
          !req.path.startsWith("/@") &&
          !req.path.startsWith("/src") &&
          !req.path.startsWith("/node_modules") &&
          accept.includes("text/html"));
      if (!isHtmlNav) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        const template = fs.readFileSync(indexPath, "utf-8");
        const transformed = await vite.transformIndexHtml(req.originalUrl, template);
        const seoHtml = injectCanonicalSeoHtml(transformed, req);
        res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(seoHtml);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
    app.get("/@vite/client", async (_req, res, next) => {
      try {
        const result = await vite.transformRequest("/@vite/client");
        if (!result?.code) {
          return next();
        }
        const safeClientCode = result.code
          .replace(
            /transport\.connect\(createHMRHandler\([^)]*\)\);/g,
            "/* HMR disabled: transport.connect skipped */"
          )
          .replace(
            /throw new Error\((['"])send was called before connect\1\);?/g,
            "return;"
          )
          .replace(
            /throw new Error\((['"])invoke was called before connect\1\);?/g,
            "return undefined;"
          );
        res
          .status(200)
          .set({
            "Content-Type": "application/javascript; charset=utf-8",
            "Cache-Control": "no-cache",
          })
          .send(safeClientCode);
      } catch (err) {
        next(err);
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const publicPath = path.join(process.cwd(), "public");
    app.use(express.static(distPath, { maxAge: "1h", index: false }));
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath, { maxAge: "1h", index: false }));
    }
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ error: "API endpoint not found" });
      }
      const distIndexPath = path.join(distPath, "index.html");
      try {
        const html = fs.readFileSync(distIndexPath, "utf-8");
        return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(injectCanonicalSeoHtml(html, req));
      } catch {
        return res.sendFile(distIndexPath);
      }
    });
  }

  const MAX_LIVE_WS_GLOBAL = 25;
  const MAX_LIVE_WS_PER_IP = 4;
  const MAX_LIVE_UPGRADES_PER_MIN = 20;
  const LIVE_WS_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
  const ALLOWED_LIVE_VIDEO_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

  let activeLiveWsGlobal = 0;
  const activeLiveWsByIp = new Map<string, number>();
  const liveUpgradeAttemptsByIp = new Map<string, number[]>();

  const getWsClientIp = (req: http.IncomingMessage): string => {
    const fwd = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const raw = fwd || req.socket?.remoteAddress || "unknown";
    return raw.slice(0, 64);
  };

  const isAllowedWebSocketOrigin = (req: http.IncomingMessage): boolean => {
    const originHeader = String(req.headers.origin || "").trim();
    if (!originHeader) return false;

    let parsedOrigin: URL;
    try {
      parsedOrigin = new URL(originHeader);
    } catch {
      return false;
    }

    if (parsedOrigin.protocol !== "https:" && parsedOrigin.protocol !== "http:") {
      return false;
    }

    const allowedHosts = new Set<string>();
    const addHost = (rawHost: string) => {
      const cleaned = rawHost.split(",")[0].trim().toLowerCase();
      if (cleaned) allowedHosts.add(cleaned);
    };

    if (typeof req.headers["x-forwarded-host"] === "string") {
      addHost(req.headers["x-forwarded-host"]);
    }
    if (typeof req.headers.host === "string") {
      addHost(req.headers.host);
    }
    for (const envCandidate of [process.env.APP_URL, process.env.RENDER_EXTERNAL_URL, process.env.SHARED_APP_URL]) {
      if (!envCandidate) continue;
      try {
        allowedHosts.add(new URL(cleanSiteUrl(envCandidate)).host.toLowerCase());
      } catch {}
    }

    return allowedHosts.has(parsedOrigin.host.toLowerCase());
  };

  const rejectWsUpgrade = (socket: any, statusCode: number, reason: string) => {
    try {
      socket.write(
        `HTTP/1.1 ${statusCode} ${reason}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(reason)}\r\n\r\n${reason}`
      );
    } catch {}
    try {
      socket.destroy();
    } catch {}
  };

  const liveWss = new WebSocketServer({
    noServer: true,
    maxPayload: 2 * 1024 * 1024,
  });

  server.on("upgrade", (req, socket, head) => {
    try {
      const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      if (reqUrl.pathname !== "/api/live") {
        socket.destroy();
        return;
      }

      if (!isAllowedWebSocketOrigin(req)) {
        console.warn(`[WebSocket] Blocked unauthorized upgrade origin: ${String(req.headers.origin || "missing")}`);
        rejectWsUpgrade(socket, 403, "Forbidden");
        return;
      }

      const clientIp = getWsClientIp(req);
      const now = Date.now();
      const recentAttempts = (liveUpgradeAttemptsByIp.get(clientIp) || []).filter((ts) => now - ts < 60_000);
      if (recentAttempts.length >= MAX_LIVE_UPGRADES_PER_MIN) {
        liveUpgradeAttemptsByIp.set(clientIp, recentAttempts);
        rejectWsUpgrade(socket, 429, "Too Many Requests");
        return;
      }
      recentAttempts.push(now);
      liveUpgradeAttemptsByIp.set(clientIp, recentAttempts);

      // Bound map growth during high churn
      if (liveUpgradeAttemptsByIp.size > 500) {
        for (const [ip, timestamps] of liveUpgradeAttemptsByIp.entries()) {
          const valid = timestamps.filter((ts) => now - ts < 60_000);
          if (valid.length === 0) liveUpgradeAttemptsByIp.delete(ip);
          else liveUpgradeAttemptsByIp.set(ip, valid);
        }
      }

      const ipActive = activeLiveWsByIp.get(clientIp) || 0;
      if (activeLiveWsGlobal >= MAX_LIVE_WS_GLOBAL || ipActive >= MAX_LIVE_WS_PER_IP) {
        rejectWsUpgrade(socket, 429, "Too Many Requests");
        return;
      }

      liveWss.handleUpgrade(req, socket, head, (ws) => {
        liveWss.emit("connection", ws, req);
      });
    } catch {
      try {
        socket.destroy();
      } catch {}
    }
  });

  liveWss.on("connection", async (clientWs: WebSocket, req) => {
    const clientIp = getWsClientIp(req);
    activeLiveWsGlobal += 1;
    activeLiveWsByIp.set(clientIp, (activeLiveWsByIp.get(clientIp) || 0) + 1);

    const reqUrl = new URL(req.url || "/api/live", `http://${req.headers.host || "localhost"}`);
    const rawLang = (reqUrl.searchParams.get("lang") || "en-US").trim();
    const lang = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})?$/.test(rawLang) ? rawLang : "en-US";
    const apiKey = process.env.GEMINI_API_KEY;

    let liveSession: any = null;
    let isClosed = false;
    let isCleanedUp = false;
    let idleTimer: NodeJS.Timeout | null = null;
    const pendingPayloads: any[] = [];

    const cleanupSocket = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      isClosed = true;

      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }

      activeLiveWsGlobal = Math.max(0, activeLiveWsGlobal - 1);
      const nextCount = (activeLiveWsByIp.get(clientIp) || 1) - 1;
      if (nextCount <= 0) {
        activeLiveWsByIp.delete(clientIp);
      } else {
        activeLiveWsByIp.set(clientIp, nextCount);
      }

      try {
        liveSession?.close?.();
      } catch {}
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
          try {
            clientWs.send(JSON.stringify({ type: "error", message: "Live voice session closed due to inactivity." }));
            clientWs.close(1000, "Idle timeout");
          } catch {}
        }
        cleanupSocket();
      }, LIVE_WS_IDLE_TIMEOUT_MS);
    };

    clientWs.on("close", cleanupSocket);
    clientWs.on("error", () => {
      cleanupSocket();
      try {
        clientWs.terminate();
      } catch {}
    });

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      try {
        clientWs.send(JSON.stringify({ type: "error", message: "Real-time Live API key is not configured on the server." }));
        clientWs.close();
      } catch {}
      cleanupSocket();
      return;
    }

    resetIdleTimer();

    const isValidLivePayload = (payload: unknown): payload is Record<string, any> => {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
      const candidate = payload as Record<string, any>;
      switch (candidate.type) {
        case "audio":
          return typeof candidate.data === "string" && candidate.data.length > 0 && candidate.data.length <= 512_000;
        case "video": {
          const mime = candidate.mimeType === undefined ? "image/jpeg" : String(candidate.mimeType);
          return (
            typeof candidate.data === "string" &&
            candidate.data.length > 0 &&
            candidate.data.length <= 1_500_000 &&
            ALLOWED_LIVE_VIDEO_MIMES.has(mime)
          );
        }
        case "text":
          return typeof candidate.text === "string" && candidate.text.trim().length > 0 && candidate.text.length <= 2000;
        case "audio_stream_end":
        case "close":
          return true;
        default:
          return false;
      }
    };

    const dispatchLivePayload = (payload: any) => {
      if (!liveSession || isClosed || !isValidLivePayload(payload)) return;
      if (payload.type === "audio") {
        liveSession.sendRealtimeInput({
          audio: { data: payload.data, mimeType: "audio/pcm;rate=16000" },
        });
      } else if (payload.type === "video") {
        liveSession.sendRealtimeInput({
          video: {
            data: payload.data,
            mimeType: typeof payload.mimeType === "string" && ALLOWED_LIVE_VIDEO_MIMES.has(payload.mimeType)
              ? payload.mimeType
              : "image/jpeg",
          },
        });
      } else if (payload.type === "text") {
        liveSession.sendClientContent({
          turns: [{ role: "user", parts: [{ text: payload.text.trim() }] }],
          turnComplete: true,
        });
      } else if (payload.type === "audio_stream_end") {
        liveSession.sendRealtimeInput({ audioStreamEnd: true });
      } else if (payload.type === "close") {
        clientWs.close();
      }
    };

    clientWs.on("message", (raw) => {
      if (isClosed) return;
      try {
        const rawText = typeof raw === "string" ? raw : raw.toString("utf8");
        if (rawText.length > 1_800_000) return;
        const payload = JSON.parse(rawText);
        if (!isValidLivePayload(payload)) return;
        resetIdleTimer();
        if (!liveSession) {
          if (pendingPayloads.length < 25) pendingPayloads.push(payload);
          return;
        }
        dispatchLivePayload(payload);
      } catch {
        // Ignore malformed frame
      }
    });

    try {
      const cachedProfile = latestGravatarCache?.profile;
      const baseInstruction = getCamelliaSystemInstruction(lang, cachedProfile);
      const liveInstruction = `${baseInstruction}\n\nREAL-TIME VOICE & VISION CONVERSATION MODE:\n- You are speaking live in real time over voice (and optional camera/screen frames).\n- Keep spoken turns natural, warm, concise, and conversational without markdown symbols or asterisks.\n- Always pronounce 'MRS' or 'M.R.S.' cleanly as separate letters: 'M R S'.`;

      const connectLiveWithClient = async (client: GoogleGenAI) => {
        return await client.live.connect({
          model: "gemini-3.8-live",
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" }, // Strictly authentic female voice
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: liveInstruction,
          },
          callbacks: {
            onmessage: (message: LiveServerMessage) => {
              if (isClosed || clientWs.readyState !== WebSocket.OPEN) return;
              const content = message.serverContent;

              if (content?.inputTranscription?.text) {
                clientWs.send(JSON.stringify({ type: "input_transcript", text: content.inputTranscription.text }));
              }
              if (content?.outputTranscription?.text) {
                clientWs.send(JSON.stringify({ type: "output_transcript", text: content.outputTranscription.text }));
              }
              for (const part of content?.modelTurn?.parts ?? []) {
                if (part.inlineData?.data) {
                  clientWs.send(JSON.stringify({ type: "audio", data: part.inlineData.data }));
                }
              }
              if (content?.interrupted) {
                clientWs.send(JSON.stringify({ type: "interrupted" }));
              }
              if (content?.turnComplete) {
                clientWs.send(JSON.stringify({ type: "turn_complete" }));
              }
            },
            onerror: (err: any) => {
              if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: "error", message: err?.message || "Live voice stream interrupted." }));
              }
            },
            onclose: () => {
              if (!isClosed && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: "closed" }));
                clientWs.close();
              }
            },
          },
        });
      };

      try {
        liveSession = await connectLiveWithClient(getTtsAI());
      } catch (betaErr: any) {
        console.warn("[GeminiLive] v1beta fallback to v1alpha:", betaErr?.message || betaErr);
        liveSession = await connectLiveWithClient(getAlphaAI());
      }

      if (isClosed || clientWs.readyState !== WebSocket.OPEN) {
        cleanupSocket();
        return;
      }

      clientWs.send(JSON.stringify({ type: "ready", model: "gemini-3.8-live", voice: "Kore", language: lang }));
      while (pendingPayloads.length > 0 && !isClosed) {
        const queued = pendingPayloads.shift();
        dispatchLivePayload(queued);
      }
    } catch (err: any) {
      console.warn("[GeminiLive] Connection failed:", err?.message || err);
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify({ type: "error", message: err?.message || "Unable to open Live voice session." }));
          clientWs.close();
        } catch {}
      }
      cleanupSocket();
      return;
    }
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`MRS Avatar Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
