# Admin Reports System Setup

Complete step-by-step. **10 minutes** total.

---

## Part 1: Create Supabase table (3 minutes)

1. Open **[supabase.com](https://supabase.com)** → your project (ViralHunt Network)
2. Left sidebar → **SQL Editor**
3. Top right → **"+ New Query"**
4. Open the file `supabase-setup.sql` from your code folder
5. Copy **ALL** the SQL content
6. Paste in Supabase SQL Editor
7. **IMPORTANT:** Find these 2 lines (around line 65 and 75) and update if your admin email is different:
   ```sql
   using (auth.jwt() ->> 'email' = 'seoxaman@gmail.com');
   ```
   Replace `seoxaman@gmail.com` with whatever email YOU log in with.
8. Bottom right → green **"Run"** button
9. Success message dikhega: "Success. No rows returned"

### Verify table created:

- Left sidebar → **Table Editor**
- Aapko `bad_lead_reports` table dikhna chahiye in the list

---

## Part 2: Update admin.html with your Supabase keys (2 minutes)

`public/admin.html` kholo, top mein 3 cheezein replace karo:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";          // ← apna URL paste
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE"; // ← apna key paste
const ADMIN_EMAILS = ["seoxaman@gmail.com"];              // ← apna email
```

Replace with:
```javascript
const SUPABASE_URL = "https://wqzqzwswmflyuogdiprq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI...(your full key)";
const ADMIN_EMAILS = ["seoxaman@gmail.com"];  // add more emails if needed
```

> **Admin emails me multiple add kar sakte ho:**
> ```javascript
> const ADMIN_EMAILS = ["seoxaman@gmail.com", "partner@example.com"];
> ```

---

## Part 3: Upload files to GitHub (3 minutes)

3 files update karne hain:

| File | Status | Action |
|------|--------|--------|
| `public/dashboard.html` | ✏️ Updated (with report modal) | Replace |
| `public/admin.html` | 🆕 NEW file | Upload |
| `vercel.json` | ✏️ Updated (added /admin route) | Replace |
| `supabase-setup.sql` | 🆕 NEW file (for reference) | Upload |

### Method — drag-drop upload:

1. GitHub repo kholo
2. Upload each file in its proper location:
   - Root: `vercel.json`, `supabase-setup.sql`, `ADMIN_SETUP.md`
   - `public/`: `dashboard.html`, `admin.html`
3. Replace existing files when prompted
4. Commit changes
5. Vercel auto-deploys (30-60 sec)

---

## Part 4: Test the system (2 minutes)

### Step 1 — User side (test reporting)

1. `lead-forge-rho.vercel.app/dashboard` kholo
2. Koi lead unlock karo
3. **"⚠ Report bad lead"** click karo
4. Modal khulega with reasons checkboxes
5. 2-3 reasons select karo, notes likho
6. **"Submit & Refund Credit"** click karo
7. Toast: "✓ Report submitted. Credit refunded."

### Step 2 — Admin side (view reports)

1. URL kholo: `lead-forge-rho.vercel.app/admin`
2. Sirf admin email se login hone par hi access milega
3. Aapko dikhega:
   - 📊 Stats (Total, Open, Verified, Rejected, 7-day)
   - 🔍 Filters (status, country, search)
   - 📋 Table with all reports
   - ✅ Verify / ✕ Reject buttons
   - 📥 Export CSV

### Step 3 — Direct database view

1. Supabase → Table Editor → `bad_lead_reports`
2. Aapki test report dikhegi spreadsheet ki tarah
3. Click any row to see full details
4. Edit `status` column to update

---

## Admin features

### Stats overview
- **Total Reports** — sab time ke
- **Open** — abhi review nahi kiye (warning yellow)
- **Verified** — confirmed bad leads (green)
- **Rejected** — false reports (gray)
- **Last 7 days** — recent activity trend

### Filtering
- **Status filter:** Open / Verified / Rejected
- **Country filter:** auto-populated from data
- **Search:** by user email, business name, notes — anything

### Actions per report
- **View:** open full details in modal
- **✓ Verify:** mark as confirmed bad lead
- **✕ Reject:** mark as false claim
- **Sign out:** logout from admin

### Export
- CSV export of currently filtered reports
- Include: date, user, business, location, reasons, notes, status
- Use for further analysis or compliance

---

## What happens when user reports

```
User clicks "⚠ Report bad lead"
        ↓
Modal opens with 6 reason checkboxes:
   - Phone number doesn't work
   - Actually has a website
   - Business has permanently closed
   - Wrong business info
   - Duplicate of another lead
   - Other (with notes)
        ↓
User selects reasons + writes notes
        ↓
Click "Submit & Refund Credit"
        ↓
Saves to Supabase bad_lead_reports table:
   - user_id, user_email
   - lead_name, lead_phone, lead_address, etc.
   - reasons array
   - notes
   - status = "open"
   - reported_at = now()
        ↓
User's credit refunded automatically
Lead removed from their "My Leads"
        ↓
Toast notification confirms submission
        ↓
YOU (admin) see it instantly in /admin
```

---

## Quality control workflow (best practice)

Daily/weekly routine:

1. Open `/admin/reports` → filter Status: Open
2. For each report:
   - Open Maps link to verify business
   - Check phone number (call or look up)
   - Decide: real bad lead or user mistake?
3. Click **✓ Verify** for legit complaints
4. Click **✕ Reject** for false claims
5. Track verified rate — if >30%, your data source has issues

### Insights aap nikal sakte ho:

- **Most reported niche** → maybe scrape with different query
- **Most reported city** → maybe data quality issue in that region
- **Most common reason** → improve filtering logic
- **Users reporting too often** → potential fraud (offer refund verification)
- **7-day trend** → spike means recent data has issues

---

## Security notes

✅ **RLS protects data:**
- Users CAN insert their own reports
- Users CAN view their own reports
- Users CANNOT see other users' reports
- Admin emails CAN see/update everything

✅ **Frontend protection:**
- `/admin` checks if user email is in `ADMIN_EMAILS` array
- Non-admin emails see "Access denied" page

⚠️ **Important — RLS is server-side, ADMIN_EMAILS is client-side:**
- Even if someone modifies client code, Supabase RLS will still block them from reading other users' data
- The `ADMIN_EMAILS` check is just a UX layer
- True security comes from the SQL policy at line 65 of `supabase-setup.sql`

---

## Add more admins later

To add admin access for another email:

### Method 1: Frontend (admin sees admin panel UI)

In `public/admin.html`, update:
```javascript
const ADMIN_EMAILS = ["seoxaman@gmail.com", "newadmin@example.com"];
```

### Method 2: Backend (admin can read database)

In Supabase SQL Editor:
```sql
-- Drop existing policy
drop policy "Admin view all reports" on public.bad_lead_reports;

-- Re-create with both emails
create policy "Admin view all reports"
  on public.bad_lead_reports
  for select
  to authenticated
  using (
    auth.jwt() ->> 'email' = 'seoxaman@gmail.com'
    OR auth.jwt() ->> 'email' = 'newadmin@example.com'
  );

-- Same for update policy
drop policy "Admin update all reports" on public.bad_lead_reports;

create policy "Admin update all reports"
  on public.bad_lead_reports
  for update
  to authenticated
  using (
    auth.jwt() ->> 'email' = 'seoxaman@gmail.com'
    OR auth.jwt() ->> 'email' = 'newadmin@example.com'
  );
```

**Both changes required** for full admin access.

---

## Troubleshooting

### "Access denied" on /admin
- Make sure you're logged in with email listed in `ADMIN_EMAILS`
- Re-deploy after updating `admin.html` if you changed the email list

### "Could not load reports" error
- Check Supabase SQL ran successfully (Table Editor → `bad_lead_reports` exists)
- Check admin email matches in BOTH:
  - `admin.html` (ADMIN_EMAILS array)
  - `supabase-setup.sql` (line 65 & 75)

### Reports submit but don't show in admin
- Open browser DevTools → Console tab → look for errors
- Check Supabase API logs (Project → Logs → Logs Explorer)
- Verify RLS policies were created (Table Editor → bad_lead_reports → Policies tab)

### Want to delete old test reports
Supabase Table Editor → click rows → top right "Delete" button.
Or SQL:
```sql
delete from public.bad_lead_reports where notes like '%test%';
```

---

## What's next (V2 features)

After this is working, future improvements:

1. **Email notifications** — get email when new report comes in (via Supabase Functions + Resend)
2. **Bulk actions** — select multiple → mark all verified
3. **Blocklist system** — when admin verifies report, add lead to "do not show again" list
4. **User reputation** — track per-user verified rate, flag suspicious users
5. **API for reports** — webhooks for Slack/Discord notifications

---

Built for ViralHunt Network · LeadForge SaaS
