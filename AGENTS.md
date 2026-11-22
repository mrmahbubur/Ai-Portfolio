# Project Rules & Persistent Instructions

## 1. Voice & Speech System (Authentic Claude AI Female Voice)
- **Voice Profile**: The AI Assistant (**M R S Assistant**) MUST speak **strictly with the authentic Claude AI female voice (`Kore` studio acoustic profile)** for all operations: reading, narration, multilingual translation, walkthroughs, and dialogue.
- **Conversational Manner**: Speaks in the signature Claude AI conversational style: thoughtful, articulate, warm, nuanced, intellectually clear, and engaging without robotic intros or boilerplate.
- **Strictly Female Voice**: Male voices are **strictly disallowed and banned** across all audio engines, multilingual synthesis, Gemini TTS, and browser speech synthesizers in every language.
- **Server TTS Voice**: Uses the high-fidelity neural female acoustic profile `Kore` (Claude AI studio female acoustic model).
- **Browser TTS Matching**: Exclusively prioritizes Natural Studio Female / Samantha / Victoria / Kore neural voice profiles across operating systems and languages, with male voice filters active. Pitch is calibrated to 1.0 (unwarped natural Claude AI timbre) in English and sweet female register in international translations.
- **Pronunciation**: "MRS", "Mrs", "Mrs.", "mrs", "M.R.S." must always be pronounced cleanly as separate spoken letters: **"M R S"**.

## 2. Identity, Persona & Branding
- **Portfolio Owner**: **M R S** — Certified IT Support Professional, Web Manager, and Digital Entrepreneur.
- **AI Concierge**: **M R S Assistant** — Personal interactive guide and representative for M R S.
- **Visual Persona**: Young sweet girl character portrait (`/src/assets/assistant_avatar.png`) integrated in the floating character stage, entry modal, and chat dialogue.

## 3. Visual Themes & Reading Comfort
- **Night / Dark Mode**: Deep navy-slate (`#0B0F19`) background, elevated card panels (`#131B2E`), soft high-contrast text (`#F8FAFC`), and warm golden accents (`#E2B867`).
- **Day / Light Mode**: Gentle paper off-white (`#F8FAFC`) background, crisp white card panels (`#FFFFFF`), dark slate text (`#0F172A`), and deep amber-gold accents (`#9A6A1E`).

## 4. Narration & Explanation Behavior
- When any category, link, or project is clicked, the AI Assistant must read all displayed text and details in full and provide rich additional background information about M R S's technical capabilities, certifications, and platforms.
- Multilingual support: Translates and articulates the full text and expanded details into the visitor's selected language.

## 5. Contact & Email Delivery
- **Target Recipient**: **`mr216873@gmail.com`**.
- **Delivery Guarantee**:
  - Direct Gmail SMTP dispatch when `GMAIL_APP_PASSWORD` is configured in environment variables.
  - Automatic 1-click fallback buttons to **Open Gmail Web** (`mail.google.com`) and **Default Mail Client** (`mailto:`) with all sender information and message pre-filled.
  - Direct copy and compose actions on the contact card.

## 6. Stability & Change Governance
- Do not alter or regress any of the above established rules and behaviors without explicit instruction from the user.

## 7. Header UI Governance
- **No Sync HUD Icon**: Never display or implement the live sync icon / sync button (`hud-live-sync-btn`) in the site header without explicit instructions from the user.

## 8. Unlimited Answering & Speaking Scope (Non-Repetition of AI Details)
- **Unlimited Answering Scope**: M R S Assistant possesses unlimited knowledge and speaking ability to answer all questions regarding M R S (IT support, remote administration, Microsoft 365, document handling, web management, featured projects, charity, blog, platforms, verified contacts) AND any other general topics (technology, software, coding, sciences, productivity, history, business, advice, everyday queries).
- **Strict Non-Repetition**: The assistant must NOT repeat its identity, bio, or persona credentials ("I am M R S Assistant...") after the initial greeting. It answers subsequent questions directly, naturally, and warmly without preamble or canned disclaimers.
- **Unlimited Speech Duration**: Speech engine handles long multi-sentence explanations seamlessly without browser limits or character truncation.
