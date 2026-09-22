# Instagram Comment → Auto-Reply + Auto-DM

When someone comments on your reel/post, this app:
1. Posts a public reply to their comment.
2. Sends them a DM ("private reply") automatically.

Stack: **Next.js** (hosted on **Vercel**) + **Supabase** (Google login + database) + **Meta/Instagram Graph API** (the actual comment/DM automation).

⚠️ Important reality check before you start: Instagram automation is NOT done through
Google/Supabase — Supabase only handles *your app's login*. The comment/DM automation
itself requires a **Meta (Facebook) Developer App** with Instagram permissions, because
only Meta's API can read comments and send DMs on Instagram's behalf. There is no way
around this step; any tool that does this (including this one) goes through Meta's API.

---

## 0. Requirements
- An Instagram account converted to a **Professional (Business or Creator) account**.
- That Instagram account linked to a **Facebook Page** (Instagram settings → linked accounts).
- A free [Supabase](https://supabase.com) account.
- A free [Vercel](https://vercel.com) account.
- A [Meta Developer](https://developers.facebook.com) account.

---

## 1. Create the Supabase project
1. Go to supabase.com → New Project. Save your database password somewhere safe.
2. Once created, go to **Project Settings → API** and copy:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret, server-only)
3. Go to **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`
   from this project, and click Run. This creates the `profiles`, `ig_connections`,
   `automation_rules`, `webhook_logs` tables with RLS policies.
4. Go to **Authentication → Providers → Google** and toggle it on.
   - You'll need a Google OAuth Client ID/Secret. Get one at
     https://console.cloud.google.com/apis/credentials → Create Credentials → OAuth Client ID
     → Application type: Web application.
   - Under **Authorized redirect URIs** in Google Cloud, add the callback URL Supabase
     shows you on that same Providers → Google page (something like
     `https://xxxxx.supabase.co/auth/v1/callback`).
   - Paste the Google Client ID and Secret into Supabase's Google provider settings and Save.
5. Go to **Authentication → URL Configuration** and set:
   - Site URL: `https://your-vercel-domain.vercel.app` (you'll get this in step 4 — you can
     come back and update it after deploying).
   - Redirect URLs: add `https://your-vercel-domain.vercel.app/auth/callback` and, for local
     testing, `http://localhost:3000/auth/callback`.

---

## 2. Create the Meta App (for Instagram Graph API access)
1. Go to https://developers.facebook.com/apps → Create App → type "Other" → "Business".
2. In the App Dashboard, click **Add Product** → set up **Webhooks** and **Facebook Login**.
   (If your account is eligible, you may see "Instagram" as a product directly — add it too.)
3. Under **Facebook Login → Settings**, set **Valid OAuth Redirect URIs** to:
   `https://your-vercel-domain.vercel.app/api/instagram/callback`
4. Under **App Settings → Basic**, copy the **App ID** and **App Secret** →
   these become `META_APP_ID` and `META_APP_SECRET`.
5. Under **Webhooks**, click "Add Subscription" for the **Instagram** object, subscribe to
   the **comments** field. Meta will ask for a Callback URL and Verify Token:
   - Callback URL: `https://your-vercel-domain.vercel.app/api/webhook/instagram`
   - Verify Token: invent any random string, put the same string in your `.env` as
     `IG_VERIFY_TOKEN`.
   - Meta will call your app's `GET /api/webhook/instagram` to verify — this only works
     once the app is deployed to Vercel (step 4), so come back to this after deploying.
6. While your app is in **Development Mode**, only Facebook accounts listed as
   Admins/Developers/Testers on the app (Settings → Roles) can use these permissions —
   that's fine for personal/self-use. To let other people use it, you must submit for
   **App Review** for `instagram_manage_comments` and `instagram_manage_messages`
   (Meta reviews this manually and can take days/weeks).

---

## 3. Configure environment variables
Copy `.env.example` to `.env.local` and fill in every value collected above.

```
cp .env.example .env.local
```

---

## 4. Deploy to Vercel
1. Push this folder to a GitHub repo (or use `vercel` CLI directly from this folder).
2. Go to vercel.com → New Project → import the repo.
3. In the Vercel project's **Settings → Environment Variables**, paste every variable
   from your `.env.local`.
4. Deploy. Copy your live URL, e.g. `https://ig-automation-yourname.vercel.app`.
5. Go back and update:
   - Supabase → Authentication → URL Configuration (Site URL + Redirect URL) with this domain.
   - Meta App → Facebook Login → Valid OAuth Redirect URIs with `.../api/instagram/callback`.
   - Meta App → Webhooks → finish the subscription now that `GET /api/webhook/instagram`
     is live (it will echo back the challenge and verify successfully).
   - `.env` values `META_REDIRECT_URI` and `NEXT_PUBLIC_APP_URL` on Vercel to match the
     real domain, then redeploy.

---

## 5. Use it
1. Open your live URL → **Continue with Google** (this is your app login, via Supabase).
2. Click **Connect Instagram** → log in with Facebook → grant permissions → this finds
   your linked Instagram Business account and stores its access token in Supabase.
3. Create a rule: keyword (or leave blank to match every comment), the public reply text,
   and the DM text.
4. Comment on your own reel from a different Instagram account to test — Meta will fire
   the webhook, your app replies publicly, then sends the DM.

---

## Local development
```
npm install
npm run dev
```
Use a tool like `ngrok http 3000` to get a temporary public HTTPS URL so Meta can reach
your webhook while testing locally, and temporarily point `META_REDIRECT_URI` /
the webhook Callback URL at that ngrok URL.

---

## Known limitations / things to double check before relying on this
- Meta's exact endpoint for "private replies" (DM from a comment) has changed across API
  versions and app types (Instagram API with Facebook Login vs. with Instagram Login).
  `lib/instagram.js` uses the `/{ig-user-id}/messages` with `recipient.comment_id` shape —
  verify this against Meta's current docs for your specific app configuration before
  going live, since Meta updates these periodically.
- Private replies must be sent within Meta's allowed time window after the comment.
- Long-lived Page access tokens last ~60 days; for real long-term use you'd want a
  scheduled job to refresh them before expiry (not included here).
- This is a self-use tool by default (Development Mode). Supporting other people's
  accounts requires Meta App Review approval.
