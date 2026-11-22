# Self-Running, Self-Fixing, Auto-Updating System (Google AI Studio site)

M R S – IT Support & Web Management (mrxshahin.ai.studio)

## Read this first: what is real and what is not

**Possible for real, and recommended:**
1. The site **restarts and recovers itself** after crashes, failed calls and outages.
2. The site **watches itself** and alerts you only when something truly needs you.
3. **Content changes need no publishing at all.** Services, prices, notices, FAQ, Camellia rules and the banner are stored in a database and edited live.
4. **Code changes deploy automatically** (no clicking Publish) once the project is connected to GitHub and a Google Cloud build trigger. This is a one-time setup, about 30–60 minutes.
5. **Dependency and security updates** arrive automatically as small, tested updates.
6. **AI proposes fixes automatically.** A scheduled job reads error logs and asks Gemini to prepare a fix. Tests run, and the fix goes live automatically only if it passes. Anything risky waits for your one-tap approval.
7. **Automatic rollback** to the last good version if a new deploy fails its health check.

**Not possible or not safe:**
- A site that rewrites and republishes its own code with no tests and no limits. One wrong AI edit could break orders or payments with nobody watching. This is why step 6 has tests, limits and rollback.
- Doing this entirely inside AI Studio's free Build mode. Publishing from AI Studio is a manual button. Automatic deploys need the project exported to GitHub and deployed on Google Cloud Run. Cloud Run needs a billing account attached, but its free monthly allowance is generous, and with a budget alert a small site normally costs very little or nothing. Set a budget alert at a small amount (for example 5 USD) so there are no surprises.

So the plan has two parts: **Part A** (paste into AI Studio's Build chat) and **Part B** (a one-time setup you do once, which then makes everything automatic).

---

# PART A – Paste into AI Studio Build chat

## Task

Add self-healing, self-monitoring and live-editable content to this existing app. Modify the existing app only. Do not change the current design, content, buttons, audio, Camellia flows, order and payment flows or links. Add and harden only. Save a backup version first and test after each step.

### A1. Move content and rules out of the code (no more publishing for content)
- Store these in **Firestore** under a `config` collection, and load them at runtime with a short in-memory cache (about 60 seconds):
  - Services list, prices, descriptions and availability
  - Site notices and the sponsored banner text and link
  - Contact details and business hours
  - FAQ entries
  - Camellia's Part A business rules and Part B assistant prompt (versioned)
  - Feature switches (chat on/off, image upload on/off, search on/off, maintenance message)
- Seed the database with the current values from the site, so nothing changes visually.
- Show a small **Admin page** at a hidden, authenticated route (Google sign-in limited to my email) where I can edit all of the above and see saved versions with one-click restore. Changes go live within a minute, with no republish.
- Keep a safe default copy of every setting in the code. If the database is unreachable, the site uses the defaults and keeps working.

### A2. Self-healing at runtime
- Every external call (Gemini, Firestore, email, uploads) has a **timeout, retries with exponential backoff and jitter**, a **fallback** (second model, cached data, queued write) and a **circuit breaker**.
- Visitors only see friendly messages with a Retry button, never raw errors.
- **Feature isolation:** if one feature keeps failing (for example chat), automatically switch only that feature off and show a polite notice, while the rest of the site stays up. Re-test it automatically every few minutes and turn it back on when it recovers.
- Orders and payments that cannot be saved right now are **queued and retried** until saved. Never lose an order, never create duplicates (idempotency keys).
- Handle `unhandledRejection` and `uncaughtException` by logging, finishing in-flight requests and exiting cleanly so Cloud Run starts a fresh instance.
- Front end: error boundaries around each major section so one broken part never blanks the page. Auto-reload the page once if a new version was deployed and an old file fails to load.

### A3. Self-monitoring
- Add `GET /health` (alive) and `GET /ready` (database and model reachable).
- Run a **self-check every 5 minutes** that tests: home page load, a test chat message, a database read and write, the order creation path in test mode, and the payment verification path in test mode. Store results in `healthChecks`.
- Write structured JSON logs (request ID, route, status, duration, error code). Never log passwords, OTPs, card numbers, full transaction IDs or payment screenshot contents.
- Keep a simple `errors` collection with a code, count, first seen, last seen and status, so repeated problems group together.

### A4. Alerts that respect my time
- Send me an email (and a WhatsApp or Telegram message if a link is available) only for these: site down for more than 5 minutes, error rate above normal, a new order waiting, a payment in manual review, a deploy that failed or was rolled back, a budget alert.
- Group repeated alerts into one message. Add a **daily summary** email (orders, errors, uptime, what was fixed automatically).

### A5. Auto-maintenance jobs (server-side scheduled tasks)
- Daily: delete expired uploads and old temporary data, compact old chat summaries, check that prices on the site match the config, and check all external links on the site (report broken ones).
- Weekly: a report of top visitor questions Camellia could not answer well, so I can improve the knowledge base.
- Monthly: remind me to review costs, backups and access.

### A6. Safe self-update ("fix proposals")
- Add a protected endpoint `POST /internal/ai-fix` that only the scheduler can call (secret token). It does the following:
  1. Read the latest grouped errors from `errors`.
  2. Ask Gemini to explain the cause and propose a minimal fix, returned as a **patch**, not a full rewrite.
  3. Never touch these files automatically: payment verification, order creation, authentication, security rules, secrets, the system prompt. Fixes for those are only suggested to me.
  4. Save the proposal in `fixProposals` with the reason, the patch and a risk level (low, medium, high).
- In the Admin page, show proposals with **Approve** and **Reject** buttons. Approving opens a pull request automatically (Part B). Low-risk fixes may be set to auto-approve once tests pass (a switch I control, default off).

### A7. Test, then report
Test and fix anything that fails:
1. The site, audio, narration, chat and order flows work exactly as before.
2. Editing a service price in Admin changes the live site within a minute with no republish.
3. Turning the database off: the site still loads using defaults, orders queue, and recover when it returns.
4. Forcing chat to fail: chat switches off alone with a notice, the rest works, and chat returns automatically.
5. The 5-minute self-check runs and records results; a forced failure sends exactly one grouped alert.
6. A proposal appears in Admin after a test error, and Approve prepares the change but touches no protected file.
7. No console errors, and the layout still works on phone and desktop.

Then report what you added, what you left unchanged and any bugs you fixed.

---

# PART B – One-time setup for automatic deploys (done once by you)

These steps happen outside the Build chat. After this, updates go live automatically.

## B1. Move the code to GitHub
1. In AI Studio, use the option to **save or export the app to GitHub** (or download the code and upload it to a new **private** GitHub repository).
2. Add the files `Dockerfile` (or use buildpacks), `.gitignore` and a `README`. Make sure no API keys are in the code.

## B2. Deploy on Cloud Run with automatic builds
1. In Google Cloud Console, create or choose a project and attach a billing account. Immediately create a **budget alert** (for example 5 USD with alerts at 50% and 100%).
2. Create a **Cloud Run** service from the GitHub repository with continuous deployment. Choose the branch `main`, so every merge builds and deploys automatically.
3. Store `GEMINI_API_KEY` and other secrets in **Secret Manager** and connect them to the service. Never put them in the repository.
4. Set minimum instances to 1 (fast, no cold start), a request timeout, and memory and concurrency limits suited to a small site.
5. Point your domain (or keep the generated Cloud Run URL) at the service.

## B3. Safety net in the pipeline
1. Add **GitHub Actions** that run on every pull request and every push: install, lint, type-check, unit tests and a small smoke test (home page loads, `/health` and `/ready` pass, a test chat works).
2. Turn on branch protection: nothing reaches `main` unless the checks pass.
3. Configure the Cloud Run deployment so a new revision only receives traffic **after it passes the health check**; if it fails, traffic stays on the last good revision (automatic rollback).
4. Turn on **Dependabot** for dependency and security updates. Allow auto-merge only for small patch updates that pass all checks.

## B4. Scheduled jobs
1. Create **Cloud Scheduler** jobs that call the protected endpoints on schedule: the 5-minute self-check, daily maintenance, weekly report and the daily AI error review (`/internal/ai-fix`).
2. Create **Cloud Monitoring uptime checks** on the home page and `/ready`, with email alerts to you.

## B5. Pull requests from approved fixes
1. Create a GitHub **fine-grained access token** limited to this one repository (contents and pull requests only), and store it in Secret Manager.
2. When you press Approve on a proposal in Admin, the server opens a pull request with the patch. The checks in B3 run automatically. If they pass, it merges and deploys. If you turned on auto-approve for low-risk fixes, it merges by itself; otherwise it waits for your one tap.

## B6. Backups
1. Turn on **Firestore scheduled backups** (daily, keep 7–14 days).
2. Keep the GitHub repository private and enable two-step verification on GitHub and Google accounts.

---

## What your daily life looks like afterwards

| What happens | Who does it |
|---|---|
| Prices, services, notices, FAQ, Camellia rules change | You, in the Admin page. Live in about a minute. |
| Temporary outage, crash, slow model | The system retries, switches fallback, restarts and recovers by itself. |
| A feature keeps failing | It switches off alone with a notice, then returns when healthy. |
| New code reaches the site | Automatic after tests pass; automatic rollback if the health check fails. |
| Library updates and security patches | Dependabot opens them, tests run, small ones merge automatically. |
| A recurring bug | The AI prepares a fix, tests run, you approve with one tap (or low-risk ones auto-merge). |
| New order or manual payment review | You get one grouped alert. |
| Everything else | A single daily summary email. |

## Limits to remember

- The free Gemini tier has rate limits. If visitors grow, enable billing on the API key.
- The AI's fixes are suggestions checked by tests. For anything touching money, login or security, a human (you) should approve.
- Review the daily summary once a week and the cloud bill once a month. That is the small amount of maintenance that cannot be automated away.
