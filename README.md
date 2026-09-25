# LifeMaxxing Landing Page

Marketing site for [LifeMaxxing](https://github.com/Mishadzhuran/lifemaxxing) — log your life, max it out.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Structure

- `index.html` — single-page landing site
- `privacy.html` / `terms.html` / `payment-terms.html` — legal
- `api/subscribe.js` — Vercel serverless → Supabase `landing-waitlist` function
- `supabase/functions/landing-waitlist/` — source for the edge function (deployed on the **lifemaxxing** Supabase project)
- `assets/` — images, brand icon and logo

## Founding-member waitlist

Signups go into a **separate** table `public.landing_waitlist` on the existing **lifemaxxing** Supabase project. It does not touch app tables (`profiles`, `experiences`, auth, etc.).

Flow:

1. Form → `POST /api/subscribe` (Vercel)
2. Vercel → `landing-waitlist` edge function
3. Function inserts the row and sends a **LifeMaxxing-branded** welcome email (Resend or SendGrid) — not Supabase Auth mail

### Vercel env vars

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | yes | `https://wxyoaxyksrxnojnevbgc.supabase.co` |
| `SUPABASE_ANON_KEY` | yes | publishable/anon key |

### Supabase Edge Function secrets

Set in **Supabase Dashboard → Project Settings → Edge Functions → Secrets** (or CLI):

| Secret | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | one of Resend/SendGrid | preferred |
| `SENDGRID_API_KEY` | one of Resend/SendGrid | fallback |
| `LANDING_FROM_EMAIL` | recommended | verified sender, e.g. `hello@lifemaxxing.com` |
| `LANDING_FROM_NAME` | optional | default `LifeMaxxing Team` |
| `LANDING_REPLY_TO` | optional | default = from email |

Verify the From domain in Resend so mail arrives as **LifeMaxxing Team &lt;hello@lifemaxxing.com&gt;**. Until `lifemaxxing.com` is verified at https://resend.com/domains, the function falls back to Resend’s `onboarding@resend.dev` sender (HTML stays branded; Reply-To stays `hello@lifemaxxing.com`).

Canonical contact in the app is `hello@lifemaxxing.com`. Logo/icon URLs default to `https://lifemaxxing.io/assets/...`.

Local preview skips the API call and simulates success (no 404 noise in the console).

## Console warnings from extensions

Warnings like `contentscript.js`, `ObjectMultiplex`, or `MaxListenersExceededWarning` come from browser extensions (e.g. crypto wallets), not this site. Test in a private window with extensions disabled to verify a clean console.
