# LeadForge — Vercel + Apify Setup Guide

A pay-per-lead SaaS that shows GMB businesses without websites — pulled **live** from Apify.

Yeh project pure HTML + Vercel Serverless Functions hai. Koi React, koi build step nahi.

---

## What's inside

```
leadforge-vercel/
├── public/
│   └── index.html       ← The UI (same as MVP, now fetches from API)
├── api/
│   ├── leads.js         ← Returns leads from your Apify dataset
│   ├── stats.js         ← Returns filter dropdowns + counts
│   └── sync.js          ← Triggers a NEW Apify scrape on-demand
├── package.json
├── vercel.json
├── .env.example         ← Copy to .env.local for local dev
└── .gitignore
```

---

## Step-by-step deployment (15 minutes)

### Step 1 — Apify account banao

1. Go to [https://apify.com](https://apify.com) and sign up (free).
2. Free plan mein $5 worth of monthly credits milte hain — about 1,000-2,000 leads scrape karne ke liye kaafi hai testing ke liye.

### Step 2 — Apify API token nikalo

1. Login → top-right profile icon → **Settings** → **Integrations** → **API tokens**.
2. **Personal API token** copy karo (starts with `apify_api_...`).
3. Isko safe rakhna — yeh sensitive hai. Ise notepad mein paste kar do for now.

### Step 3 — Pehla scrape chalao (Google Maps Scraper)

1. Apify dashboard mein **Store** par jao.
2. Search: `Google Maps Scraper` by **compass**. Direct link: [apify.com/compass/crawler-google-places](https://apify.com/compass/crawler-google-places).
3. Click **"Try for free"** / **"Start"**.
4. Input mein yeh daalo (example for plumbers in Austin):
   ```
   Search terms: plumber in austin texas
   Number of places: 200
   Language: en
   Skip closed places: true
   ```
5. Click **"Start"**. Wait 5-15 minutes. Status `SUCCEEDED` ho jayega.
6. Click run → **"Storage"** tab → **"Default dataset"** → top right par **Dataset ID** copy karo. Looks like: `xRl9pFc8KqM7nBz1`.

> **Tip:** Multiple keywords ek hi run mein daal sakte ho — 5-10 queries combine kar lo (e.g. "plumber austin", "salon austin", "electrician dallas" etc). Sab same dataset mein aayenge.

### Step 4 — Code GitHub par daalo

Two options:

**Option A — Quick (GitHub web upload):**
1. [github.com](https://github.com) par new repo banao: `leadforge` (private OK).
2. Upload all files from this folder (drag-and-drop on GitHub's web upload).
3. Commit.

**Option B — Git CLI:**
```bash
cd leadforge-vercel
git init
git add .
git commit -m "Initial LeadForge MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/leadforge.git
git push -u origin main
```

### Step 5 — Deploy to Vercel

1. Go to [vercel.com](https://vercel.com), sign in with GitHub.
2. **"Add New" → "Project"** → import your `leadforge` repo.
3. Framework preset: **Other** (Vercel auto-detects).
4. Root directory: leave as `.`
5. Build settings: leave defaults.
6. **IMPORTANT — Environment Variables** section open karo, aur yeh 3 add karo:

   | Key | Value |
   |-----|-------|
   | `APIFY_TOKEN` | `apify_api_xxxxxxxxx...` (Step 2 wala) |
   | `APIFY_DATASET_ID` | `xRl9pFc8KqM7nBz1` (Step 3 wala) |
   | `APIFY_ACTOR_ID` | `compass~crawler-google-places` |

7. Click **"Deploy"**.
8. Wait 30-60 seconds. URL milega like `leadforge-xyz.vercel.app`.

**Open the URL — aapko real Apify-scraped leads dikhne lagenge!** 🎉

---

## How it works under the hood

```
[User browser]
      ↓
[Vercel CDN] → public/index.html
      ↓ (fetch /api/leads?country=US&niche=plumber)
[Vercel Serverless Function]
      ↓ (uses APIFY_TOKEN)
[Apify Dataset API]
      ↓ (returns 1000+ GMB records)
[leads.js filters for no-website, applies filters, returns paged JSON]
      ↓
[Browser renders cards with locked contact info]
      ↓ (user clicks Unlock → 1 credit deducted in localStorage)
[Contact details revealed + saved in My Leads]
```

- Lead data: live from Apify, cached at Vercel edge for 5 min.
- Credits + unlocks: stored in browser `localStorage` (no backend DB needed yet).
- New scrapes: trigger via `/api/sync` (see below).

---

## Triggering new scrapes from your dashboard

You can call `/api/sync` to start a new Apify run without leaving your site:

```bash
curl -X POST https://leadforge-xyz.vercel.app/api/sync \
  -H "Content-Type: application/json" \
  -d '{"searchString": "dentist in dallas texas", "maxItems": 200}'
```

Response:
```json
{
  "success": true,
  "runId": "abc123",
  "datasetId": "newDataset456",
  "message": "Scrape started. When it finishes (5-20 min), copy the datasetId above into your Vercel APIFY_DATASET_ID env var."
}
```

After the run finishes (you'll see it `SUCCEEDED` in Apify console), update your Vercel env var `APIFY_DATASET_ID` to the new datasetId and redeploy (or just hit redeploy in Vercel dashboard).

> **Better approach (V2):** keep ONE master dataset and configure Apify to **append** to it on every run. Then `APIFY_DATASET_ID` never needs to change.

---

## Local dev (optional)

```bash
npm install -g vercel
vercel link    # connect to your project
vercel env pull .env.local
vercel dev     # runs at http://localhost:3000
```

---

## Known limits of this MVP

| Feature | Status | How to upgrade |
|---------|--------|----------------|
| Real Apify lead data | ✅ Working | — |
| Credit system | ⚠ localStorage only | Add Supabase Postgres or Vercel KV for per-user wallets |
| User accounts | ❌ Anonymous | Add Supabase Auth (15 min) or Clerk |
| Real payments | ❌ Simulated | Connect Stripe Checkout (1-2 hours) |
| Email addresses on leads | ⚠ Often missing | Add a second Apify actor: `lukaskrivka/google-maps-extractor` or use Hunter.io API |
| Server-side filtering at scale | ⚠ Pulls full dataset per request | Once dataset >10K rows, move to Supabase Postgres |
| New scrape scheduling | ⚠ Manual via /api/sync | Add Vercel Cron job (free) to run /api/sync daily |

---

## Cost expectations

| Service | Free tier | Pay-as-you-go |
|---------|-----------|---------------|
| Vercel | Unlimited hobby projects, 100GB bandwidth | $20/mo Pro |
| Apify | $5 credit/month | $5-7 per 1,000 leads scraped |
| GitHub | Unlimited private repos | — |
| **Total to launch** | **$0** | $5-15/month for ongoing scraping |

When you start charging customers via Stripe, gross margin stays ~80%+.

---

## Troubleshooting

**"Server is missing APIFY_TOKEN" error**
→ Vercel dashboard → Project Settings → Environment Variables. Make sure all 3 are set. Then redeploy (Deployments tab → ⋯ → Redeploy).

**Leads show but contact info is empty**
→ Google Maps Scraper sometimes returns places without phone numbers. Use the `Has phone` filter to hide them. For emails, run a separate email-extraction actor.

**"No leads match your filters"**
→ Your dataset might be small. Run more Apify scrapes with different keywords. Each scrape is appended to one dataset if you configure it that way.

**Lead's website check is wrong (showing a business that actually has a website)**
→ Apify's Google Maps Scraper sometimes pulls websites under `website` or `url`. Check `api/leads.js` line 33 — the filter logic — and adjust field names.

**It's slow on first load**
→ First request after deploy can take 5-10s (cold start + Apify API call). Subsequent requests are cached for 5 min. For >10K leads, migrate to Supabase Postgres.

---

## Next steps after MVP is live

1. **Connect Stripe** — replace the fake "Buy credits" button with real Stripe Checkout. See companion doc Section 6.
2. **Add Supabase** for proper user accounts and persistent credit wallets.
3. **Set up Vercel Cron** to auto-trigger `/api/sync` daily with rotating search terms.
4. **Add email enrichment** — second Apify actor or Hunter.io API for `email` field.
5. **Add an admin dashboard** — count of leads, scrapes, unlocks, revenue.
6. **Custom domain** — buy `leadforge.io` (or whatever name you like) on Namecheap, point CNAME to Vercel.

The full SaaS playbook with these next steps is in `LeadForge_SaaS_Blueprint.docx`.

---

Built with ❤️ for ViralHunt Network.
