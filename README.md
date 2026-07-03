# LifeMaxxing Landing Page

Marketing site for [LifeMaxxing](https://github.com/Mishadzhuran/lifemaxxing) — log your life, max it out.

## Local preview

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Structure

- `index.html` — single-page landing site
- `privacy.html` — privacy policy
- `api/subscribe.js` — Vercel serverless waitlist endpoint
- `assets/` — images, brand icon and logo

## Waitlist API (production)

Deploy to Vercel so `/api/subscribe` is available. Optional env vars:

- `SENDGRID_API_KEY`
- `SENDGRID_LIST_ID`

Local preview skips the API call and simulates success (no 404 noise in the console).

## Console warnings from extensions

Warnings like `contentscript.js`, `ObjectMultiplex`, or `MaxListenersExceededWarning` come from browser extensions (e.g. crypto wallets), not this site. Test in a private window with extensions disabled to verify a clean console.
