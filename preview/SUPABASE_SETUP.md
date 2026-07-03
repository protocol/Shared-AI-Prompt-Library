# Turn on shared upvotes & comments (Supabase)

By default the app runs **local-only**: upvotes and comments live in each person's
browser. Follow these steps to make them **shared across the team**, backed by a
Supabase Postgres database. ~15 minutes, free tier is fine.

Nothing here is a secret you must hide: the only value that ships in the app is the
**publishable anon key**, which is safe in client code *because* the Row-Level
Security policies below constrain what it can do.

---

## 1. Create the project
1. Go to <https://supabase.com>, sign in, **New project**. Pick a name (e.g. `pl-prompt-library`) and a region near your team. Save the database password somewhere (you won't need it for this app).
2. Wait for it to finish provisioning (~2 min).

## 2. Create the tables + security policies
Open **SQL Editor → New query**, paste the whole block below, and **Run**.

> Note: this block has **no SQL comments** on purpose. If you paste SQL whose `--`
> comment markers get "smart-converted" to an em-dash (`—`) in transit, Postgres
> throws `syntax error at or near "to"`. The block is also re-runnable: the
> `drop policy if exists` lines let you run it again cleanly.

```sql
create table if not exists public.votes (
  id bigint generated always as identity primary key,
  prompt_id text not null,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique (prompt_id, voter_id)
);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  prompt_id text not null,
  author text not null,
  text text not null,
  parent_id bigint references public.comments(id) on delete cascade,
  client_id text,
  edited boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists votes_prompt_idx on public.votes (prompt_id);
create index if not exists comments_prompt_idx on public.comments (prompt_id, created_at);

alter table public.votes enable row level security;
alter table public.comments enable row level security;

drop policy if exists votes_read on public.votes;
drop policy if exists votes_insert on public.votes;
drop policy if exists votes_delete on public.votes;
create policy votes_read on public.votes for select using (true);
create policy votes_insert on public.votes for insert with check (true);
create policy votes_delete on public.votes for delete using (true);

drop policy if exists comments_read on public.comments;
drop policy if exists comments_insert on public.comments;
drop policy if exists comments_update on public.comments;
drop policy if exists comments_delete on public.comments;
create policy comments_read on public.comments for select using (true);
create policy comments_insert on public.comments for insert with check (true);
create policy comments_update on public.comments for update using (true) with check (true);
create policy comments_delete on public.comments for delete using (true);

create table if not exists public.prompts (
  id text primary key,
  data jsonb,
  hidden boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.prompts enable row level security;
drop policy if exists prompts_read on public.prompts;
drop policy if exists prompts_insert on public.prompts;
drop policy if exists prompts_update on public.prompts;
drop policy if exists prompts_delete on public.prompts;
create policy prompts_read on public.prompts for select using (true);
create policy prompts_insert on public.prompts for insert with check (true);
create policy prompts_update on public.prompts for update using (true) with check (true);
create policy prompts_delete on public.prompts for delete using (true);

create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  message text not null,
  author text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert with check (true);
```

The `feedback` table captures messages from the **Send feedback** button. It is
**insert-only** — the anon key can submit but has no read policy, so submissions are
write-only from the app; read them in the Supabase **Table Editor** (or add a
`feedback_read` policy later if you want to surface them in-app).

## Enable skill-file uploads (Storage)
Skill files (the optional file on the Add-a-prompt form) live in a public Storage
bucket. Run this once in the **SQL Editor** (creates the bucket + access policies):

```sql
insert into storage.buckets (id, name, public) values ('skills','skills',true)
  on conflict (id) do nothing;
drop policy if exists skills_upload on storage.objects;
drop policy if exists skills_read on storage.objects;
drop policy if exists skills_delete on storage.objects;
create policy skills_upload on storage.objects for insert with check (bucket_id = 'skills');
create policy skills_read on storage.objects for select using (bucket_id = 'skills');
create policy skills_delete on storage.objects for delete using (bucket_id = 'skills');
```

The bucket is **public-read** (anyone with the link can download a skill file) and
anon can upload — appropriate for an internal tool. Files are stored under
`skills/<promptId>/<timestamp>_<filename>`, and the download link is saved on the
prompt. Until the bucket exists, the Add-a-prompt form still works; it just skips the
file with a notice. Supabase's default per-file limit is 50 MB.

## Feedback to a Google Sheet (optional)
By default "Send feedback" writes to the Supabase `feedback` table (read it in the
Table Editor). To send it to a **Google Sheet you own** instead:

1. Create a Google Sheet. **Extensions → Apps Script**, paste this, and Save:

   ```js
   function doPost(e) {
     var ss = SpreadsheetApp.getActiveSpreadsheet();
     var sheet = ss.getSheetByName("Feedback") || ss.insertSheet("Feedback");
     if (sheet.getLastRow() === 0) sheet.appendRow(["Timestamp", "Message", "Name", "Source"]);
     var d = {};
     try { d = JSON.parse(e.postData.contents); } catch (err) {}
     sheet.appendRow([new Date(), d.message || "", d.author || "", d.source || ""]);
     return ContentService.createTextOutput(JSON.stringify({ ok: true }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

2. **Deploy → New deployment → Web app.** Execute as **Me**; Who has access **Anyone**.
   Copy the **Web app URL** (ends in `/exec`).
3. Paste it into `config.js` as `FEEDBACK_SHEET_ENDPOINT`, in both `preview/` and
   `app/public/`, then redeploy.

When set, feedback goes to your Sheet (the app can't read the response back across
origins, so it optimistically shows "Thanks for the feedback!"). Leave it blank to
keep using the Supabase `feedback` table.

The `prompts` table stores **team-added prompts** (and edits/overrides of the built-in
examples) as JSON, so new prompts persist for everyone — just like upvotes and comments.
Until this table exists, adding a prompt still works but stays local to that browser;
once it exists, new prompts sync on the next page load (no redeploy needed).

The policies grant the publishable anon key read/write access. This is trust-based
(there is no per-user login), which is appropriate for an internal tool; tighten the
policies later if you add authenticated identity.

## 3. Get your two values
**Project Settings → API**:
- **Project URL** — e.g. `https://abcd1234.supabase.co`
- **anon public** key (a long `eyJ…` string). **Not** the `service_role` key.

## 4. Point the app at it
Edit `preview/config.js` (and, for the deployed app, `app/public/config.js`):

```js
window.PL_CONFIG = {
  SUPABASE_URL: "https://abcd1234.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...your-anon-key..."
};
```

Then redeploy (bump the `?v=` on the script tags in `index.html` so browsers fetch
the new config past the CDN cache — see the deploy notes).

## 5. Verify
- Open the app in two different browsers (or a normal + private window).
- Upvote a prompt in one → after a refresh it shows in the other. Post a comment → it appears for both.
- If sharing is off/unreachable the app silently falls back to local-only and shows a brief "Shared sync unavailable" notice — it never breaks.

---

## Important: the dashboard CSP (scope question #4)
The app calls Supabase **from the user's browser**, inside the PL Infra → AI Apps
dashboard `<iframe>`. If that iframe is served with a Content-Security-Policy that
restricts `connect-src`, the browser will block calls to `*.supabase.co` and the app
will fall back to local-only. Supabase itself allows these requests (its REST API
returns permissive CORS headers) — the only thing that can block them is the
dashboard's CSP. **Confirm with the platform team that embedded apps may `connect-src`
to `https://*.supabase.co`** (this is scope question #4).

## What's shared vs. local
- **Shared (Supabase):** prompt upvote counts, comments (incl. edits/deletes).
- **Local per browser:** which prompts *you* upvoted (pressed state), your display
  name, theme, and any prompts you draft via the in-page modal. Comment up-votes are
  currently local-only.
- **Not in Supabase:** the prompts themselves — those stay curated in `prompts.json`
  via the issue → PR flow.

## Notes / limits (v1)
- No realtime: other people's votes/comments appear on next load, not live. (Supabase
  Realtime can be added later.)
- Trust-based: with only the anon key there's no server-verified identity, so the
  policies above let any client read/write. Fine for an internal tool; revisit if the
  data ever becomes sensitive or the audience widens.
- Edit/Delete of your own comments is gated client-side by your browser's anonymous
  `client_id`; the server permits it by trust.
