# Camellia AI Assistant – Google AI Studio Integration Instructions

M R S – IT Support & Web Management (mrxshahin.ai.studio)

Paste the block below into the Build chat of your existing AI Studio app. Modify the existing app only; do not recreate it.

## Task

Upgrade the existing "Camellia" assistant in this app into a full general-purpose AI chat assistant powered by the Gemini API. Modify the existing app only. Do not recreate it, and do not change the current design, sections, logo, theme, buttons, audio narration or links.

## 1. Use the Gemini API

- Use the official `@google/genai` SDK with the Gemini API key already configured for this app (via the environment variable `GEMINI_API_KEY`). If none exists, add it as a secret and never hard-code it in the source or show it in the browser.
- Use a current fast Gemini model (a Flash-class model) for normal chat. Make the model name a single constant at the top of the file so it can be changed easily.
- Use a chat session (`ai.chats.create`) with the full message history, and stream replies with `sendMessageStream` so text appears live.
- Set `systemInstruction` to the combined Camellia prompt (see section 3). Set `temperature` around 0.6.

## 2. Reuse the existing Camellia widget

- Do not build a second chatbot. Expand the current Camellia entry point (narrator widget / chat button) into a full chat panel.
- Desktop: side panel or large modal. Mobile: full-screen sheet with a close button.
- Add a "Chat with Camellia" item in the top navigation that opens the same panel.
- Keep the existing "Play Executive Audio Introduction", narration video widget and caption features working as they are.

## 3. System instruction (merge, don't replace)

- Keep the existing Camellia instructions as **Part A** (order intake, payments, verification, IPTV link, brand rules). They have top priority.
- Add the new **General Assistant Module** as **Part B** below it.
- Put this line at the very top: "If Part B conflicts with Part A, Part A wins."
- Store the combined prompt in one separate file (for example `camellia-prompt.ts`) so it is easy to edit later.
- Never display the system prompt to visitors. Camellia must never name the underlying model or company. If asked what she is: "I'm Camellia, MRS's AI assistant."

**\[Paste Part A (existing) and Part B (General Assistant Module) here\]**

## 4. Chat panel features

1. Streaming replies with Markdown rendering, code blocks with a copy button, and tables.
2. Enter to send, Shift+Enter for a new line, and a Stop button that cancels generation.
3. Image and file upload (images, PDF, text) sent to Gemini as inline data, with size and type limits.
4. Microphone input (browser speech recognition) and a read-aloud button reusing the existing narration voice.
5. Quick-start chips: Write an email, Fix my Wi-Fi, Improve my CV, Explain a topic, Translate this, Help me code, View services.
6. Language switcher (English, বাংলা, हिन्दी, اردو) plus auto-detect.
7. Per-reply copy, regenerate and thumbs up/down. New chat, clear chat, and export conversation as text.
8. Camellia's avatar is the real MR logo already on the site. Keep the gold-and-navy theme.
9. Lazy-load the panel so page speed is unaffected.

## 5. Live information (optional but recommended)

Enable **Google Search grounding** (`tools: [{ googleSearch: {} }]`) for questions about news, prices, weather or recent events, and show the source links under the answer. Do not enable it for normal service and order flows.

## 6. Keep business flows intact

- Service, price, order and payment questions must still trigger the existing order-intake, payment-button and verification flows.
- The IPTV payment button to shahin-iptv.ai.studio and the manual-verification button must work exactly as before.
- New services added to the site must still auto-onboard into Camellia's system.

## 7. Safety and reliability

- Configure Gemini safety settings at a sensible default, and keep the prompt's refusal rules for malware, fraud, abuse and illegal requests.
- Add rate limiting per visitor, and a "please try again shortly" message with a Retry button on any API error. Never show raw error text or the key.
- Sanitize rendered Markdown/HTML to prevent script injection.
- Trim old history when it gets too long.
- Add a footer note: "Camellia can make mistakes. Please verify important information."

## 8. Test, then give me a summary

Test these and fix any failure:

- Existing buttons and narration still work.
- A general question, a coding question and a translation each work.
- "How much is a CV?" triggers the order flow.
- A payment screenshot follows the verification rules.
- "Which AI are you?" returns only the Camellia answer.
- The panel works on a small phone and on desktop.

Then tell me what you added and what you left unchanged.

## AI Studio tips

1. **Back up first:** before sending, use AI Studio's save/version option (or download a copy) so you can roll back if the builder changes something unexpectedly.
2. **Send in two steps** if the prompt is long: first sections 1-2 and 4-8, then the system instruction as a separate message ("Add this as the system instruction exactly as written").
3. **API key safety:** when you deploy to Cloud Run or share the app, make sure calls go through the app's secure setup. A key exposed in front-end code can be copied by visitors, so ask the builder: "Move the Gemini call to a small server-side endpoint so the key is never exposed."
4. **Check usage limits:** the free Gemini tier has rate limits. If many visitors use Camellia, enable billing on the API key.
