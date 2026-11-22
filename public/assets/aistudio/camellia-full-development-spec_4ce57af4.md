# Camellia – Complete Development Spec (Structure, System, Layout, Theme, Graphics, Interface)

M R S – IT Support & Web Management (mrxshahin.ai.studio)

Paste the section under **Task** into the Build chat of your existing AI Studio app. Send it in three messages if it feels too long:

1. Sections 0–3 (rules, structure, system)
2. Sections 4–8 (layout, theme, graphics, interface, components)
3. Sections 9–14 (states, accessibility, data, performance, build order, acceptance tests)

Build on top of the existing site. Never recreate it.

---

## Task

Develop the existing M R S site and the Camellia assistant into a complete, professional, real-world product: a clear structure, a reliable system, a consistent layout and theme, polished graphics and a smooth interface. Modify the existing app only. Keep every current section, text, link, button, the audio narration, the order flows and the IPTV payment flow working exactly as before. Add, refine and harden. Do not remove or redesign what already works. Camellia is the only assistant name visitors see.

---

## 0. Ground rules

1. Save a backup or version before every large change.
2. Work in small steps and confirm the site still loads and works after each step.
3. Reuse existing components, colors, fonts and assets before creating new ones.
4. One source of truth for design values (tokens), one for the system prompt, one for site content.
5. No placeholder text, no fake data, no broken links, no console errors in the finished product.
6. After building, report what was added, what was left unchanged and any bugs fixed.

---

## 1. Project structure

Organize the code like this (adapt names to the existing setup):

```
/
├─ server/
│  ├─ server.ts                 # Express app, static hosting, middleware order
│  ├─ routes/
│  │  ├─ chat.ts                # POST /api/chat (SSE streaming)
│  │  ├─ upload.ts              # POST /api/upload
│  │  ├─ conversations.ts       # CRUD for saved chats
│  │  ├─ orders.ts              # create/read order status
│  │  ├─ payments.ts            # verification, manual review
│  │  └─ health.ts              # /health, /ready
│  ├─ services/
│  │  ├─ gemini.ts              # model calls, retry, fallback, circuit breaker
│  │  ├─ orders.ts, payments.ts, notify.ts
│  │  └─ memory.ts              # summaries, preferences
│  ├─ middleware/               # errors, rate limit, validation, security
│  ├─ prompts/camellia-prompt.ts# Part A (existing) + Part B (assistant)
│  └─ utils/                    # logger, ids, sanitize
├─ src/
│  ├─ app/                      # routing, providers, error boundary
│  ├─ styles/
│  │  ├─ tokens.css             # all colors, spacing, type, radius, shadow, motion
│  │  ├─ base.css, layout.css, components.css, motion.css
│  ├─ components/
│  │  ├─ layout/                # Header, Footer, Section, Container, MobileNav
│  │  ├─ profile/               # Hero, IdentityCard, Credentials, Services...
│  │  ├─ chat/                  # ChatPanel, Sidebar, MessageList, Message, Composer...
│  │  └─ ui/                    # Button, Card, Chip, Modal, Toast, Tabs, Skeleton...
│  ├─ hooks/                    # useChat, useConversations, useSpeech, useOnline
│  ├─ lib/                      # api client, markdown renderer, formatters
│  └─ content/                  # site text, services, prices (single source)
└─ public/                      # logo, icons, fonts, og image, manifest
```

Rules: no giant single file, one responsibility per file, shared logic in hooks and services, content and prices stored only in `content/`.

---

## 2. System design (how the parts connect)

```
Visitor browser
   │  (HTTPS)
   ▼
Express server on Cloud Run ──► static front end
   │
   ├─► /api/chat ───► Gemini service (retry, fallback, breaker, search tool)
   ├─► /api/upload ─► validation ─► Gemini (image / PDF understanding)
   ├─► /api/conversations ─► Firestore
   ├─► /api/orders, /api/payments ─► Firestore + owner notification
   └─► /health, /ready
```

- All secrets are environment variables. The browser never sees the API key.
- Chat runs through server-sent events for live streaming and cancellation.
- Orders and payments keep their existing rules. Anything uncertain goes to manual review.
- Every request has a request ID, validation, rate limiting and central error handling.
- Full backend rules (retry, timeouts, security, self-healing) follow the earlier backend instructions file.

---

## 3. Site map and page structure

Keep the current single-page profile structure and refine it into clear, anchored sections in this order:

1. **Header** (sticky): logo + "MRS · IT Support & Web Management", navigation (About & Credentials, Platforms & Projects, Competencies, Verified Networks, Contact), a **Chat with Camellia** button, language switcher.
2. **Sponsored partner banner** (existing): keep, with fixed height so it never shifts the layout.
3. **Hero / Verified Executive Profile:** name, tagline, summary, buttons (Direct Contact, Book Consultation, Executive Credentials, Copy Hub Link), identity-verified logo, audio introduction button.
4. **Key facts strip:** four cards (Certifications, Live Ventures, Core Specialization, Multilingual Reach).
5. **About & Professional Summary** with "Read Full Executive Narrative" and "Narrate Biography".
6. **Verified Certifications & Credentials** and **Education** timeline.
7. **Remote Services & Solutions:** numbered list, each linking to the order flow.
8. **Platforms & Projects:** cards for each live site and service (with working links).
9. **Competencies:** grouped skills with simple level indicators.
10. **Verified Networks:** profile links with verified badges.
11. **Contact & Book Consultation:** form, buttons, response-time note.
12. **Footer:** links, copyright, disclaimer, language selector.

The Camellia chat is available from the header, the hero and a floating button on every section.

---

## 4. Layout system

**Grid and spacing**
- 12-column grid on desktop, 4-column on mobile. Max content width 1200 px, centered.
- Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 64, 96. Use only these values.
- Section padding: 64 px vertical on desktop, 40 px on mobile.

**Breakpoints**
- Mobile: up to 639 px (primary target, most visitors are on phones)
- Tablet: 640–1023 px
- Desktop: 1024 px and above

**Desktop chat layout**

```
┌──────────────────────────────────────────────────────────────┐
│ Header: logo · nav · [Chat with Camellia] · language          │
├───────────────┬──────────────────────────────────────────────┤
│ Sidebar       │ Chat header: avatar · "Camellia" · ⋯ settings │
│ [+ New chat]  ├──────────────────────────────────────────────┤
│ Search        │                                              │
│ Today         │   Message list (scrolls)                     │
│  · chat 1     │   assistant bubbles left, visitor right      │
│  · chat 2     │                                              │
│ Earlier       │                                              │
│  · chat 3     ├──────────────────────────────────────────────┤
│ Settings      │ Composer: [+] [ message…        ] [🎤] [Send] │
└───────────────┴──────────────────────────────────────────────┘
```

**Mobile chat layout**
- Full-screen sheet over the page with a top bar: back/close, "Camellia", menu (chats, settings).
- Message list fills the screen. Composer fixed at the bottom with safe-area padding, above the keyboard.
- Conversation list opens as a left drawer.

**Page layout on mobile**
- Single column, cards stacked, sticky header collapsed to logo + menu button + chat button.
- Tap targets at least 44 × 44 px. No horizontal scrolling anywhere.

---

## 5. Theme system (keep the existing gold-and-navy identity)

Define everything as CSS variables in `tokens.css` and use them everywhere. Sample the exact current colors from the live site and use these as the reference:

```css
:root {
  /* Surfaces */
  --bg:            #0A0F1A;   /* page background, deep navy-black */
  --surface-1:     #0F1829;   /* cards */
  --surface-2:     #142036;   /* raised cards, inputs */
  --border:        #243553;   /* subtle borders */
  --border-gold:   #C9A24B66; /* gold-tinted outline for hero and key cards */

  /* Brand */
  --gold:          #E0B65A;   /* primary accent, buttons, headings accents */
  --gold-strong:   #F2CB6E;   /* hover */
  --gold-deep:     #B8923A;   /* pressed */
  --navy:          #12213B;

  /* Text */
  --text:          #E8ECF4;   /* main text */
  --text-muted:    #9AA7BD;   /* secondary */
  --text-faint:    #6B7891;   /* labels */
  --on-gold:       #1A1305;   /* text on gold buttons */

  /* Status */
  --success:       #3FCF8E;
  --warning:       #F2B84B;
  --danger:        #F06A6A;
  --info:          #6AA8F0;

  /* Shape and depth */
  --radius-sm: 8px;  --radius-md: 12px;  --radius-lg: 18px;  --radius-pill: 999px;
  --shadow-1: 0 1px 2px #0006;
  --shadow-2: 0 8px 24px #0008;
  --glow-gold: 0 0 0 1px var(--border-gold), 0 8px 32px #E0B65A22;

  /* Motion */
  --ease: cubic-bezier(.2,.8,.2,1);
  --dur-fast: 120ms; --dur: 200ms; --dur-slow: 360ms;
}
```

**Typography**
- Headings: the existing display font (geometric sans, bold). Body: a clean sans (Inter-style). Code: a monospace font. Always add system fallbacks.
- Scale (px, desktop / mobile): H1 44/32, H2 32/26, H3 22/20, body 16/16, small 14/13, label 12/12 uppercase with letter-spacing.
- Line height 1.6 for body, 1.2 for headings. Keep line length around 65–75 characters.

**Theme modes**
- Default: the existing dark theme.
- Add an optional light theme using the same tokens (`[data-theme="light"]`) and a toggle in settings. Follow the visitor's system setting on first visit, then remember their choice.
- Gold on dark must meet contrast requirements. Never place gold text on a light background without darkening it.

---

## 6. Graphics and visual assets

- **Logo:** use the real MR logo (circular gold emblem). Provide SVG (header and favicons), a 512 px PNG, and a monochrome version. Keep clear space equal to a quarter of its width.
- **Identity badge:** the verified check badge on the logo stays, with a soft gold glow.
- **Camellia avatar:** the MR logo in a round frame with a small green "online" dot. Use it in the chat header, next to every assistant message and on the floating button.
- **Icons:** one consistent line-icon set (24 px grid, 1.75 px stroke, rounded caps). Use the same set everywhere. No mixed styles, no emoji as interface icons.
- **Backgrounds:** subtle layered navy gradients with a faint gold radial glow behind the hero. No heavy images that slow the page.
- **Illustrations and cards:** simple geometric shapes, thin gold line accents, small numbered markers (01, 02, 03) as already used on the site.
- **Images:** WebP/AVIF with sizes and lazy loading, explicit width and height to avoid layout jumps, alt text on every image.
- **Social and app assets:** favicon set, Apple touch icon, a 1200 × 630 share image (logo, name, tagline), a web manifest with theme color.
- **Motion graphics:** only subtle effects. Fade-up on section entry (200–360 ms), button hover lift, a soft gold shimmer on the verified badge, animated typing dots in chat, and a calm "speaking" waveform around the avatar during read-aloud. Respect `prefers-reduced-motion` by turning all of it off.

---

## 7. Interface specification (chat)

**Entry points:** floating round button bottom-right (avatar, small pulse once on first visit), header button, hero button. All open the same panel.

**Chat header:** avatar, "Camellia", status ("Online"), buttons for new chat, settings, close.

**Empty state:** large avatar, greeting ("Hello, I'm Camellia. How can I help you today?"), and 6–7 suggestion chips (Write an email, Fix my Wi-Fi, Improve my CV, Explain a topic, Translate this, Help me code, View services).

**Messages**
- Visitor: right-aligned bubble, gold-tinted surface, rounded corners with one flat corner.
- Camellia: left-aligned, avatar, no heavy bubble, text on the dark surface for easy reading of long answers.
- Rendered Markdown: headings, lists, tables with horizontal scroll, quotes, links (open in a new tab, `rel="noopener noreferrer"`), inline code, and code blocks with language label, syntax highlighting and a **Copy** button.
- Source links from search appear as small numbered chips under the answer.
- Timestamps on hover; grouped by day in the saved chats list.

**Message actions (under each reply):** copy, regenerate, thumbs up/down, read aloud. For the visitor's last message: edit and resend.

**Composer**
- Auto-growing text area (max 6 lines), Enter to send, Shift+Enter for a new line.
- Attach button (images, PDF, text), shown as removable thumbnails above the input.
- Microphone button with a recording state; Send button turns into a **Stop** button while streaming.
- Character counter only when approaching the limit. Disabled state while offline.

**Sidebar / drawer:** New chat, search, chats grouped (Today, Yesterday, Earlier) with rename and delete, a Settings entry at the bottom.

**Settings panel:** language, theme (dark/light/system), response length (short/normal/detailed), tone (friendly/professional), voice on/off and voice speed, memory on/off with "view and delete saved info", export and "clear all chats".

**Order integration inside chat:** when a visitor starts an order, Camellia shows a clean card (service, price, steps, payment buttons) inside the conversation, and keeps an order status chip visible until it is finished. Payment upload uses the same attach control with the existing verification rules.

---

## 8. Component library

Build once, reuse everywhere. Each component has the states default, hover, focus, active, disabled, loading and error where relevant.

| Component | Notes |
|---|---|
| Button | Primary (gold, dark text), Secondary (outline gold), Ghost, Danger. Sizes S/M/L. Icon-only variant with tooltip. |
| Card | Surface-1, border, optional gold outline, hover lift. |
| Chip | Suggestion chips, tags, verified badge. |
| Input / Textarea / Select | Surface-2, gold focus ring, helper and error text. |
| Modal / Sheet / Drawer | Focus trap, ESC to close, scroll lock, slide-up on mobile. |
| Tabs / Accordion | For credentials, FAQ, "Read full narrative". |
| Toast | Success, error, info; auto-dismiss, stacked bottom-center. |
| Skeleton | For chat list, message loading and cards. |
| Avatar | Camellia and visitor, with status dot. |
| Tooltip | Keyboard accessible. |
| Progress / Spinner | For uploads and verification. |
| Badge / Status pill | Order states with distinct colors. |
| CodeBlock | Highlight, copy, language label, wrap toggle. |
| EmptyState | Illustration/avatar, message, action. |

---

## 9. State and behavior rules

- **Loading:** skeletons for lists, typing dots before the first streamed token, progress for uploads.
- **Empty:** helpful empty states with a clear next action.
- **Error:** inline message with Retry, never a blank screen. Chat errors show under the failed message with "Retry" and "Copy my message".
- **Offline:** banner at the top, disabled composer, queued retry when back online.
- **Success:** subtle toast or inline confirmation, never blocking.
- **Streaming:** auto-scroll to the bottom only while the visitor is at the bottom; if they scroll up, show a "Jump to latest" button.
- **Long content:** tables and code scroll inside their own container, never widening the page.
- **Persistence:** the open conversation, draft text, theme and settings survive a reload.
- **Navigation:** deep links to sections and to a specific chat. The browser Back button closes the chat panel on mobile.

---

## 10. Accessibility and usability

- Meet WCAG 2.1 AA contrast. Check gold text and muted text on dark surfaces.
- Everything works by keyboard: visible focus ring (gold, 2 px), logical tab order, ESC closes layers, skip-to-content link.
- Use semantic HTML (header, nav, main, section, footer, button, form). Add ARIA only where needed: `aria-live="polite"` for streamed replies, labels on icon buttons, `role="dialog"` on modals.
- Respect reduced motion and the system color scheme.
- Support right-to-left layout for Urdu text in messages and inputs, and proper fonts for Bengali, Hindi and Urdu scripts.
- Captions/transcripts for the audio and narration features. Provide a "Show Caption" option as already present.
- Plain, friendly language in all interface text.

---

## 11. Data model (Firestore)

```
conversations/{id}   { ownerId|sessionId, title, createdAt, updatedAt, summary, lang }
  messages/{id}      { role, text, attachments[], createdAt, sources[], feedback }
orders/{id}          { service, price, status, createdAt, updatedAt, contact, notes }
payments/{id}        { orderId, method, txnIdHash, checks{}, status, reviewReason }
settings/{ownerId}   { theme, lang, length, tone, voice, memoryEnabled }
memory/{ownerId}     { items[]: { text, createdAt } }        # only when enabled
errors/{id}          { code, route, requestId, createdAt }   # no secrets, no personal data
```

Rules: orders are idempotent (one per client token), transaction IDs are stored hashed and checked for duplicates, personal data is minimized, and the visitor can delete their chats and memory at any time.

---

## 12. Performance and quality targets

- Lighthouse on mobile: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 95+.
- First contentful paint under 1.8 s on a typical mobile connection; no layout shift from the banner, images or fonts (reserve space, `font-display: swap`).
- Lazy-load the chat panel, markdown and highlighter libraries, and below-the-fold images.
- Compress responses, long cache headers for hashed assets, Cloud Run minimum instances of 1.
- No console errors or warnings in production. Strict TypeScript, linting and formatting enabled.
- SEO basics: proper title and meta description, Open Graph and Twitter tags, structured data for the person/organization, sitemap and robots, clean headings (one H1).

---

## 13. Build order (do it in this sequence)

1. Back up the app. Add `tokens.css` using the existing colors and fonts, and refactor styles to use the tokens without changing the look.
2. Organize the folder structure and split large files, keeping behavior identical.
3. Build the shared UI components (Button, Card, Chip, Input, Modal, Toast, Skeleton).
4. Refine the page layout, spacing and responsive behavior section by section.
5. Add the server (Express), health checks and the Gemini service with retry, fallback and breaker.
6. Build the chat panel: entry points, layout, messages, composer, streaming, stop, markdown and code blocks.
7. Add conversations (sidebar, rename, delete, search) and Firestore storage.
8. Add attachments, search grounding with sources, voice input and read-aloud.
9. Add settings, theme toggle, language switcher and optional memory.
10. Integrate orders and payments inside chat, keeping the existing verification rules.
11. Add graphics polish: favicons, share image, motion, avatar states.
12. Harden: security, rate limits, error boundaries, offline handling, logging.
13. Run accessibility, performance and acceptance tests. Fix everything that fails.

---

## 14. Acceptance tests (all must pass before publishing)

1. All existing sections, buttons, links, audio narration and order flows work as before.
2. The layout is correct and has no horizontal scroll at 360, 414, 768, 1024 and 1440 px widths.
3. Tokens drive all colors and spacing; switching dark/light theme changes the whole site consistently.
4. Chat opens from the floating button, header and hero; closes with ESC, the close button and the Back button on mobile.
5. Streaming, Stop, regenerate, edit-and-resend, copy, feedback and read-aloud work.
6. Code blocks highlight correctly and copy; tables scroll inside their container.
7. Image and PDF upload work; wrong types and oversized files show a clear message.
8. A current-events question uses search and shows source chips.
9. Saved chats persist across reload; rename, search and delete work; "clear all" removes everything.
10. A full order (service → price → payment proof → verification or manual review) completes inside chat, with no duplicate orders on double click.
11. Simulated failures (model timeout, offline, bad upload) show friendly messages and recover.
12. Keyboard-only use and a screen reader can complete the main tasks; contrast and reduced-motion checks pass.
13. Bengali, Hindi and Urdu text display correctly, with right-to-left behavior for Urdu.
14. Lighthouse scores meet the targets in section 12; no console errors.
15. No other AI product name appears anywhere in the interface; asking "Which AI are you?" returns only the Camellia answer.

When finished, send me a short report: what you added, what you left unchanged, bugs found and fixed, and any item you could not complete.
