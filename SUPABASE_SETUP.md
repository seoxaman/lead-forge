# Supabase Setup Guide — LeadForge Auth

Complete step-by-step guide. **15-20 minutes** total.

---

## Part 1: Get Supabase keys (2 minutes)

1. Go to **[supabase.com](https://supabase.com)** → sign in
2. Open your project (or create a new one named `leadforge`)
3. Left sidebar → **Project Settings** (gear icon)
4. Click **API** (under Configuration)
5. Copy these two values:

   | Field | Where on page |
   |-------|---------------|
   | **Project URL** | Top of page, looks like `https://xxxxxxx.supabase.co` |
   | **Anon / Public Key** | Under "Project API keys" → "anon public" |

6. Paste them in notepad — you'll need them in Part 4.

---

## Part 2: Enable Google OAuth (5 minutes)

1. Supabase sidebar → **Authentication** → **Providers**
2. Find **Google** in the list → click it
3. Toggle **"Enable Sign in with Google"** ON
4. You'll see fields for **Client ID** and **Client Secret** — need to get these from Google.

### Get Google OAuth credentials:

1. Open new tab: **[console.cloud.google.com](https://console.cloud.google.com)**
2. Top bar → create a new project or pick one (any name, e.g. "LeadForge")
3. Left sidebar → **APIs & Services** → **Credentials**
4. Top → **"+ CREATE CREDENTIALS"** → **OAuth client ID**
5. If asked, first configure the OAuth consent screen:
   - User Type: **External** → Create
   - App name: `LeadForge`
   - Support email: your email
   - Developer email: your email
   - Save and continue through all steps (you can skip scopes & test users for now)
6. Back to **Create OAuth client ID**:
   - Application type: **Web application**
   - Name: `LeadForge Web`
   - **Authorized redirect URIs** → **+ ADD URI**:
     ```
     https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback
     ```
     (replace `YOUR_SUPABASE_PROJECT` with your actual subdomain, get it from Supabase API page)
7. Click **Create** → popup shows **Client ID** and **Client Secret** → copy both

### Paste into Supabase:

1. Go back to Supabase → Auth → Providers → Google
2. Paste **Client ID** and **Client Secret**
3. Click **Save**
4. Google OAuth is now enabled ✅

---

## Part 3: Configure Supabase redirect URLs (1 minute)

1. Supabase sidebar → **Authentication** → **URL Configuration**
2. **Site URL**: enter your live URL
   ```
   https://leadforgee.vercel.app
   ```
3. **Redirect URLs** → Add these (one per line):
   ```
   https://leadforgee.vercel.app/dashboard
   https://leadforgee.vercel.app/login
   https://leadforgee.vercel.app/signup
   http://localhost:3000/dashboard
   ```
4. **Save**

---

## Part 4: Paste keys into your code (3 minutes)

Open these **3 files** and replace `YOUR_SUPABASE_URL_HERE` and `YOUR_SUPABASE_ANON_KEY_HERE`:

### File 1: `public/dashboard.html`

Find these lines near the top (around line 8-9):
```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";
```

Replace with your actual values:
```javascript
const SUPABASE_URL = "https://xxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...";
```

### File 2: `public/login.html`

Same — find and replace at the bottom in the `<script>` section.

### File 3: `public/signup.html`

Same — find and replace at the bottom in the `<script>` section.

---

## Part 5: Push to GitHub & deploy (2 minutes)

After replacing keys in all 3 files, upload to GitHub:

1. Go to your GitHub repo (`leadforgee`)
2. Upload the updated files via `Add file → Upload files`
3. Or replace one-by-one via pencil edit
4. Commit changes
5. Vercel auto-deploys in 30-60 seconds

---

## Part 6: Test the flow

1. Open `https://leadforgee.vercel.app` — **landing page** dikhna chahiye
2. Click **"Get Started Free →"** → goes to `/signup`
3. Try **email + password signup** OR **Continue with Google**
4. After successful signup → auto-redirect to `/dashboard`
5. Dashboard works as before, with user email + Sign out button in nav

### Common issues:

| Problem | Fix |
|---------|-----|
| "Invalid Supabase URL" | Make sure URL has `https://` and ends with `.supabase.co` |
| Google sign-in popup blocked | Allow popups for `leadforgee.vercel.app` |
| Redirect loop on dashboard | Check redirect URLs in Supabase Auth → URL Configuration |
| "Email not confirmed" | Either disable email confirmation in Supabase (Auth → Providers → Email → "Confirm email" OFF) OR verify via email link |
| Google: "redirect_uri_mismatch" | The callback URL in Google Console must EXACTLY match `https://YOUR_PROJECT.supabase.co/auth/v1/callback` |

---

## Optional: Disable email confirmation (faster signup)

For instant signup without email verification:

1. Supabase → **Authentication** → **Providers** → **Email**
2. Toggle **"Confirm email"** OFF
3. Save

Now users can sign up and instantly access dashboard (no email verification).

---

## What's next (V2 features)

Currently credits + unlocked leads are stored in `localStorage` (per-browser). For real production:

1. **Move credits to Supabase database** — create `users` and `credits` tables
2. **Move unlocked leads** — create `unlocked_leads` table per user
3. **Stripe integration** — real payment flow on pricing buttons
4. **Row Level Security** — protect user data with Supabase RLS policies

Yeh sab next phase mein add karenge jab core flow stable ho jaye.

---

Built for ViralHunt Network · LeadForge SaaS
