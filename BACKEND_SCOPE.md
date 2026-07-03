# Shared backend for the AI Prompt Library — scope

**Goal:** make **upvotes** and **comments** team-wide (shared across everyone), instead of
living in each visitor's browser `localStorage`. Prompt content itself stays curated in
`prompts.json` (via the existing issue → PR flow) — the backend only holds the *social
layer* (votes + comments) that sits on top of it.

**Status:** scoping / decision doc. No backend built yet.

---

## 1. The binding constraint (read this first)

The PLN sandbox that hosts the app (per `ai-app-starter-kit/AGENTS.md`, `CLAUDE.md`, `README.md`):

- **Injects no runtime env vars or secrets.** "Apps run on shared infrastructure with no
  credentials provided."
- **Has an ephemeral filesystem.** The container is rebuilt from the uploaded zip on every
  deploy; data dirs are explicitly excluded. So SQLite/JSON-on-disk **does not persist** and
  isn't shared across replicas.
- **No documented managed datastore, persistent volume, or config injection.**

**Consequence:** the app itself cannot be the source of truth, and we cannot hand it a
database password. Any shared store must be reachable with something that is *not a classic
secret* — i.e. a **capability URL** (an unguessable endpoint) or a **publishable key designed
to be shipped to browsers** — OR the platform must provide storage directly (see §6).

Helpful: the app already ships a `CONFIG.SHEET_ENDPOINT` constant + a `persist()` function
(from the prototype) built to POST changes to an external endpoint. That's the seam we'd wire.

---

## 2. What has to be shared

| Data | Shape | Notes |
|------|-------|-------|
| **Votes** | one record per `(promptId, voterId)` | Upvotes are **anonymous** (per your last change) — we store an opaque `voterId` only to dedupe/toggle, never displayed. Count = distinct voterIds. |
| **Comments** | `{id, promptId, author, text, ts, parentId, edited}` | `author` is the self-declared display name we already capture via `ensureUser()`. Supports threaded replies + edit/delete of your own. |
| Prompts | — | **Not** in the backend. Stay in `prompts.json`, curated via issue → PR. The social layer references `promptId`. |

Keeping prompts out of the mutable store is deliberate: it preserves the "source of truth +
review" workflow and keeps the backend tiny and low-risk.

---

## 3. Architecture options

| Option | Where state lives | Client needs | Ops burden | Scales to | Verdict |
|--------|-------------------|--------------|------------|-----------|---------|
| **A. Google Apps Script + Sheet** | a Google Sheet, written by an Apps Script Web App | just the Web App **URL** (capability URL, not a secret) | ~none (no server to run) | dozens–low hundreds of users | ✅ **Recommended v1** |
| **B. Supabase (managed Postgres)** | Supabase Postgres | public **anon key** + URL, protected by Row-Level Security | low (managed; no server) | thousands | ✅ **Recommended if you want a real DB / future auth** |
| **C. Custom serverless API + DB** | e.g. Cloudflare Workers + D1/KV, or a small Node API + Postgres | API base URL | medium (you own deploy + monitoring) | high | ⚠️ Only if A/B don't fit |
| **D. App-local SQLite / file** | the sandbox container | — | low | — | ❌ Ephemeral + not shared — fails the goal |
| **E. GitHub as store** (issues/reactions) | the repo | a write token (a **secret**) | low | low | ❌ Needs a secret; slow/noisy for votes. Keep GitHub for *prompt submissions* only |
| **F. Platform-native datastore** | provided by PLN | TBD | lowest | TBD | ❓ **Confirm first** (§6) — could beat all of the above |

**Why A for v1:** zero new infrastructure, no secret in the app (only a capability URL, which
fits the existing `SHEET_ENDPOINT` seam), PL already lives in Google Workspace, the Sheet is
human-readable so moderation/audit is trivial, and it's free. Its ceiling (Apps Script quotas,
~modest concurrency, few-hundred-ms latency) is well above PL Infra team scale.

**Why B as the upgrade:** if you want durability, real queries, and a path to genuine
per-user auth, Supabase gives a managed Postgres with a *publishable* anon key (safe in the
browser **when paired with Row-Level Security**) and no server to operate.

---

## 4. Recommended design (v1 = Option A)

**Backend (Google Apps Script Web App, deployed "execute as me / anyone with the link"):**
- Sheet with two tabs: `votes` (`promptId`, `voterId`, `ts`) and `comments`
  (`id`, `promptId`, `author`, `text`, `ts`, `parentId`, `edited`).
- `GET  ?action=state` → `{ counts: {promptId: n}, comments: {promptId: [...]} }` (CORS-enabled).
- `POST {action:"vote", promptId, voterId, on}` → upsert/delete a vote row.
- `POST {action:"comment", promptId, author, text, parentId}` → append; returns the new row.
- `POST {action:"editComment"|"deleteComment", id, author}` → author-match guarded.
- A shared `writeToken` required on writes (defense-in-depth, not real auth).

**Client (`app.js`) changes:**
- Set `CONFIG.SHEET_ENDPOINT` to the Web App URL (capability URL — safe to ship, **not** a secret).
- On load, fetch shared state and render counts + comments from the server.
- Vote / comment / edit / delete call the API with **optimistic UI**, reconciling on response.
- Keep `localStorage` for three things only: the anonymous `voterId` (a generated UUID), the
  user's own vote set (to show pressed state), and `currentUser` (display name).
- **Graceful degradation** (required by `AGENTS.md`): if the endpoint is unset/unreachable,
  fall back to today's local-only behavior and show a subtle "not synced" indicator.

**Identity & anti-abuse (internal-tool appropriate):**
- Comments: self-declared display name (already captured). Votes: anonymous opaque id.
- Because the endpoint URL is visible in the shipped JS, treat writes as trust-based: shared
  write token, server-side length/rate limits, size caps, author-match for edit/delete, and a
  Sheet that an admin can moderate/wipe. The app is embedded only in the internal PL dashboard,
  so exposure is limited and the data is low-sensitivity (L1-ish).

**Migration:** existing per-browser votes/comments are local/anonymous and can't be reliably
merged, so the shared store starts fresh. Optional one-time "push my local comments to shared"
button if that history matters.

---

## 5. Effort & phasing

| Phase | Work | Rough effort |
|-------|------|--------------|
| 0 | Confirm platform questions (§6); pick A or B | ½ day (mostly waiting on answers) |
| 1 | Option A: Sheet + Apps Script endpoint, wire `app.js`, degrade path, test, redeploy | ~0.5–1 day |
| 1-alt | Option B: Supabase project + tables + RLS, wire client, test, redeploy | ~1–2 days |
| 2 (later) | Real per-user auth (if dashboard passes identity), moderation UI, notifications on new comment | scoped separately |

---

## 6. Confirm with the PLN platform team before building

These answers can change the recommendation (and may make an external service unnecessary):

1. **Does the sandbox offer any persistent storage or a managed datastore/KV** we can use directly?
2. **Is there a supported way to inject runtime config/secrets?** (If yes, a credentialed DB opens up.)
3. **Does the dashboard pass an authenticated user identity to the embedded iframe** (header,
   `postMessage`, or signed token)? If so, we get real per-user attribution + vote dedupe for free.
4. **Can the embedded app make cross-origin `fetch` calls to external hosts** (Google/Supabase),
   or does the dashboard's CSP `connect-src` restrict the iframe? (Writes happen from the user's
   browser, so this is the key gating question.)
5. **Any data-residency/compliance constraint** on storing member-generated content off-platform?

---

## 7. Risks

- **Q4 is the real gate:** if the dashboard's CSP blocks the iframe from calling external hosts,
  Options A–C need a platform-provided proxy or Option F instead.
- Apps Script quotas/latency and CORS quirks (mitigated by team scale; Supabase avoids them).
- Capability-URL model is trust-based — fine for internal, low-sensitivity social data; not for
  anything confidential.
- Ownership: whoever owns the Sheet / Supabase project owns its uptime and moderation.

---

## Recommendation

Confirm §6 (especially Q4). Assuming external calls are allowed: **ship Option A** for a fast,
zero-infra, team-wide v1, and keep **Option B (Supabase)** as the upgrade path if/when you want
a real database and genuine per-user auth. If the platform turns out to provide storage
(Option F), prefer that.
