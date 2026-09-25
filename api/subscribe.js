const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://wxyoaxyksrxnojnevbgc.supabase.co';
// Publishable anon key (safe in serverless). Override via env if rotated.
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4eW9heHlrc3J4bm9qbmV2YmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NzI5MzAsImV4cCI6MjA5NjE0ODkzMH0.UiWn3dEnY73jq1SnDHAXKIdpacF1l8FpvudhC6n-mQ8';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
  const source =
    typeof req.body?.source === 'string' && req.body.source.trim()
      ? req.body.source.trim()
      : 'founding-member-landing';
  const phoneDigits = phone.replace(/\D/g, '');

  if (name.length < 2) {
    return res.status(400).json({ error: 'Invalid name' });
  }

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  if (phoneDigits.length < 7) {
    return res.status(400).json({ error: 'Invalid phone' });
  }

  try {
    const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/landing-waitlist`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, phone, source }),
    });

    const payload = await fnRes.json().catch(() => ({}));

    if (!fnRes.ok) {
      const status = fnRes.status >= 400 && fnRes.status < 500 ? fnRes.status : 502;
      return res.status(status).json({
        error: payload.error || 'Subscription service unavailable',
      });
    }

    return res.status(200).json({
      ok: true,
      already_registered: Boolean(payload.already_registered),
      emailed: Boolean(payload.emailed),
      email_status: payload.email_status || null,
      email_error: payload.email_error || null,
    });
  } catch {
    return res.status(502).json({ error: 'Subscription service unavailable' });
  }
}
