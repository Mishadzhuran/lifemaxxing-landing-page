# LifeMaxxing Landing Page

Marketing site for [LifeMaxxing](https://github.com/Mishadzhuran/lifemaxxing) — log your life, max it out.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080  
Legal routes need directory indexes, so use paths like http://localhost:8080/legal/privacy/

## Deploy on cPanel (production)

The live site runs on **LiteSpeed/cPanel** (`lifemaxxing.io`). Upload the repo contents into `public_html` (or the domain document root):

1. Upload at least: `index.html`, `.htaccess`, `assets/`, `legal/`, `support/`, `account/`, `api/subscribe.php`, `api/config.example.php`, `privacy.html`, `terms.html`, `payment-terms.html`
2. On the server, copy `api/config.example.php` → `api/config.php` and set `SUPABASE_ANON_KEY` (and URL if needed)
3. Confirm PHP has **curl** enabled (default on most cPanel hosts)
4. Smoke-test:
   - `https://lifemaxxing.io/legal/privacy/`
   - `https://lifemaxxing.io/legal/terms/`
   - `https://lifemaxxing.io/legal/eula/`
   - `https://lifemaxxing.io/legal/community/`
   - `https://lifemaxxing.io/legal/data-collection/`
   - `https://lifemaxxing.io/support/`
   - `https://lifemaxxing.io/account/delete/`
   - founding-member form → `POST /api/subscribe` (rewritten to `api/subscribe.php`)

`.htaccess` enables directory indexes, blocks `api/config.php`, and maps `/api/subscribe` → PHP.

## Structure

- `index.html` — single-page landing site
- `legal/{privacy,terms,eula,community,data-collection}/` — app legal docs (App Store / Play URLs)
- `support/` · `account/delete/` — store support + account deletion pages
- `privacy.html` / `terms.html` / `payment-terms.html` — founding-member marketing supplements
- `api/subscribe.php` — cPanel PHP → Supabase `landing-waitlist` function
- `api/subscribe.js` — optional Vercel serverless equivalent (not used on cPanel)
- `supabase/functions/landing-waitlist/` — source for the edge function (deployed on the **lifemaxxing** Supabase project)
- `assets/` — images, brand icon and logo

## Founding-member waitlist

Signups go into a **separate** table `public.landing_waitlist` on the existing **lifemaxxing** Supabase project (`wxyoaxyksrxnojnevbgc`). It does not touch app tables (`profiles`, `experiences`, auth, etc.).

### View / download the email list

1. Open the correct project: **[lifemaxxing](https://supabase.com/dashboard/project/wxyoaxyksrxnojnevbgc)** (not another app project).
2. Go to **Table Editor**.
3. In the left list, open either:
   - **`landing_waitlist`** (the real table), or
   - **`founding_waitlist_emails`** (same data, sorted newest-first — under Views if Studio groups them)
4. To download: open the table → **…** / export → **Download as CSV** (or select rows → Export).

Quick SQL (SQL Editor → New query → Run → Download CSV):

```sql
select created_at, name, email, phone, source, welcome_email_status, welcome_email_sent_at
from public.landing_waitlist
order by created_at desc;
```

Direct links:
- Project: https://supabase.com/dashboard/project/wxyoaxyksrxnojnevbgc
- Table Editor: https://supabase.com/dashboard/project/wxyoaxyksrxnojnevbgc/editor
- SQL Editor: https://supabase.com/dashboard/project/wxyoaxyksrxnojnevbgc/sql/new

### Security (RLS)

The waitlist is **private**:

- RLS is **enabled + forced** on `landing_waitlist`
- **No** SELECT/INSERT/UPDATE/DELETE grants for `anon` or `authenticated`
- Clients cannot read or write the list via the REST API (verified blocked)
- Only the **`landing-waitlist` edge function** (`service_role`) writes/reads rows; you view/export in the Dashboard
- View `founding_waitlist_emails` uses `security_invoker` and is also revoked from public client roles

Do **not** grant `anon`/`authenticated` access to this table or view.

Flow:

1. Form → `POST /api/subscribe` (cPanel PHP via `.htaccess`, or Vercel if used)
2. Proxy → `landing-waitlist` edge function
3. Function inserts the row and sends a **LifeMaxxing-branded** welcome email (Resend) — not Supabase Auth mail
4. Status lands on the row: `welcome_email_status` = `pending` | `sent` | `failed`

### cPanel / PHP config (`api/config.php`)

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | `https://wxyoaxyksrxnojnevbgc.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | publishable/anon key |

### Vercel env vars (optional alternative host)

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | `https://wxyoaxyksrxnojnevbgc.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | publishable/anon key |

### Supabase Edge Function secrets

Set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or CLI):

| Secret | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | yes | `re_...` from https://resend.com/api-keys |
| `LANDING_FROM_EMAIL` | yes (after DNS) | must be on verified domain: `hello@lifemaxxing.com` |
| `LANDING_FROM_NAME` | optional | default `LifeMaxxing Team` |
| `LANDING_REPLY_TO` | optional | default = from email → `hello@lifemaxxing.com` |
| `LANDING_LOGO_URL` | optional | default `https://lifemaxxing.io/assets/logo.png` |

Canonical From address: **LifeMaxxing Team &lt;hello@lifemaxxing.com&gt;**.  
Site/legal live on **lifemaxxing.io**; waitlist mail sends as **@lifemaxxing.com**.

### DNS for Resend (Namecheap → `lifemaxxing.com`)

DNS host for `lifemaxxing.com` is **Namecheap** (`dns1/dns2.registrar-servers.com`).  
You do **not** need Vercel for this — only Namecheap Advanced DNS.

1. Open https://resend.com/domains (same Resend account as `RESEND_API_KEY`).
2. **Add Domain** → `lifemaxxing.com` (or open it if already added).
3. Open the **DNS Records** table Resend shows. Copy each value with the copy button.
4. In Namecheap → Domain List → **lifemaxxing.com** → **Advanced DNS** → add/update:

| Type | Host (Namecheap) | Value (from Resend — examples) | Priority |
|---|---|---|---|
| **TXT** (DKIM) | `resend._domainkey` | long `p=MIGf...` key from Resend | — |
| **TXT** (SPF) | `send` | `v=spf1 include:amazonses.com ~all` | — |
| **MX** (SPF/feedback) | `send` | e.g. `feedback-smtp.us-east-1.amazonses.com` | `10` |
| **TXT** (DMARC, optional) | `_dmarc` | `v=DMARC1; p=none;` | — |

Namecheap notes:
- Host is **only** `send` / `resend._domainkey` / `_dmarc` — do **not** append `.lifemaxxing.com`
- Paste DKIM/SPF values exactly; don’t truncate
- If Resend shows **CNAME** instead of TXT/MX, add those CNAMEs instead (DNS proxy off)

5. Back in Resend → **Verify DNS Records** (often ~15 min, up to 72h).
6. Confirm secrets: `LANDING_FROM_EMAIL=hello@lifemaxxing.com`, `RESEND_API_KEY=re_...`
7. Test a new signup → row in `landing_waitlist` should show `welcome_email_status=sent`.

Live check (already present on `lifemaxxing.com` as of setup):

- `send` TXT + MX → Amazon SES / Resend-style SPF
- `resend._domainkey` TXT → DKIM
- `_dmarc` TXT → `v=DMARC1; p=none;`

If Resend still fails verify, the DKIM `p=` key in Namecheap may be from an **old** Resend project — replace it with the key shown in **your** Resend Domains page, then re-verify.

Canonical contact in the app is `hello@lifemaxxing.com`. Logo URL default: `https://lifemaxxing.io/assets/logo.png`.

Local preview skips the API call and simulates success (no 404 noise in the console).

## Console warnings from extensions

Warnings like `contentscript.js`, `ObjectMultiplex`, or `MaxListenersExceededWarning` come from browser extensions (e.g. crypto wallets), not this site. Test in a private window with extensions disabled to verify a clean console.
