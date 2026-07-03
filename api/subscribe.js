const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  /* Wire to SendGrid (or your ESP) when ready:
     PUT https://api.sendgrid.com/v3/marketing/contacts
     Authorization: Bearer process.env.SENDGRID_API_KEY
     Body: { list_ids: [process.env.SENDGRID_LIST_ID], contacts: [{ email }] }
  */

  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_LIST_ID) {
    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          list_ids: [process.env.SENDGRID_LIST_ID],
          contacts: [{ email }],
        }),
      });
      if (!sgRes.ok) throw new Error('sendgrid_failed');
    } catch {
      return res.status(502).json({ error: 'Subscription service unavailable' });
    }
  }

  return res.status(200).json({ ok: true });
}
