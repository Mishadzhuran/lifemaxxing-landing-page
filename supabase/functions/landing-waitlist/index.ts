import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Landing-page founding-member signup.
 * Saves to public.landing_waitlist and sends a LifeMaxxing-branded welcome email via Resend.
 * Tracks delivery state in DB (pending | sent | failed) for ops + retries at scale.
 */
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_LOGO_URL = "https://lifemaxxing.io/assets/logo.png";
const DEFAULT_ICON_URL = "https://lifemaxxing.io/assets/app-icon.png";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function firstName(name: string): string {
  const part = name.trim().split(/\s+/)[0] ?? "there";
  return part || "there";
}

function buildWelcomeEmail(name: string, logoUrl: string, iconUrl: string) {
  const safeFirst = escapeHtml(firstName(name));
  const subject = "You're on the LifeMaxxing founding list";
  const text = [
    `Hey ${firstName(name)},`,
    "",
    "Thanks for registering as a LifeMaxxing founding member.",
    "We're putting the finishing touches on the app.",
    "We'll email you as soon as early access is ready so you can download it.",
    "",
    "The LifeMaxxing team",
    "Life is the ultimate sport.",
  ].join("\n");

  // App Main 2 tokens: black / #121214 / #5B9AE8 / #2F6BC4
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#000000;color:#F4F2EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    You're in as a founding member. We'll tell you when early access is ready.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121214;border:1px solid #2A2A2E;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="height:3px;background:#2F6BC4;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:36px 32px 0;text-align:center;">
              <img src="${escapeHtml(iconUrl)}" alt="LifeMaxxing" width="72" height="72" style="display:inline-block;border-radius:18px;border:0;background:#FFFFFF;">
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 0;text-align:center;">
              <img src="${escapeHtml(logoUrl)}" alt="LifeMaxxing" width="180" style="display:inline-block;height:auto;max-width:180px;border:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;text-align:center;">
              <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8B9BB8;font-weight:600;">Founding member</p>
              <h1 style="margin:0 0 14px;font-size:28px;line-height:1.2;font-weight:650;color:#F4F2EF;">You're in, ${safeFirst}.</h1>
              <p style="margin:0 auto 8px;max-width:400px;font-size:16px;line-height:1.6;color:#98948E;">Thanks for registering your interest in LifeMaxxing. Spots are limited, and you're on the list.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;border:1px solid #2A2A2E;border-radius:16px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#F4F2EF;"><span style="color:#5B9AE8;">●</span>&nbsp; We'll email you the moment early access opens</p>
                    <p style="margin:0 0 10px;font-size:15px;line-height:1.55;color:#F4F2EF;"><span style="color:#5B9AE8;">●</span>&nbsp; Download link and founding badge on your profile</p>
                    <p style="margin:0;font-size:15px;line-height:1.55;color:#F4F2EF;"><span style="color:#5B9AE8;">●</span>&nbsp; No spam. Just one note when it's your turn</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 8px;text-align:center;">
              <p style="margin:0;font-size:15px;line-height:1.5;color:#F4F2EF;">The LifeMaxxing team</p>
              <p style="margin:8px 0 0;font-size:13px;color:#98948E;">Life is the ultimate sport.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 32px 28px;text-align:center;border-top:1px solid #2A2A2E;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#98948E;">Questions? Reply to this email or write<br>
              <a href="mailto:hello@lifemaxxing.io" style="color:#5B9AE8;text-decoration:none;">hello@lifemaxxing.io</a></p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;font-size:11px;color:#5C5A56;">© ${new Date().getFullYear()} LifeMaxxing</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

type SendResult = { ok: boolean; id?: string; error?: string };

async function sendViaResend(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}): Promise<SendResult> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: opts.from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      reply_to: opts.replyTo,
    }),
  });

  const raw = await res.text().catch(() => "");
  let parsed: { id?: string; message?: string; name?: string } = {};
  try {
    parsed = raw ? JSON.parse(raw) : {};
  } catch {
    /* ignore */
  }

  if (res.ok) {
    return { ok: true, id: parsed.id };
  }

  return {
    ok: false,
    error: parsed.message || raw.slice(0, 400) || `http_${res.status}`,
  };
}

async function markEmailAttempt(
  admin: ReturnType<typeof createClient>,
  rowId: string,
  patch: Record<string, unknown>,
) {
  const { error } = await admin
    .from("landing_waitlist")
    .update(patch)
    .eq("id", rowId);
  if (error) console.error("db_email_status_update_failed", error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json(503, { error: "misconfigured" });
  }

  let body: {
    name?: unknown;
    email?: unknown;
    phone?: unknown;
    source?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const source =
    typeof body.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, 80)
      : "founding-member-landing";
  const phoneDigits = phone.replace(/\D/g, "");

  if (name.length < 2) return json(400, { error: "invalid_name" });
  if (!EMAIL_RE.test(email)) return json(400, { error: "invalid_email" });
  if (phoneDigits.length < 7) return json(400, { error: "invalid_phone" });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: existingErr } = await admin
    .from("landing_waitlist")
    .select(
      "id, name, welcome_email_sent_at, welcome_email_status, welcome_email_attempts",
    )
    .eq("email", email)
    .maybeSingle();

  if (existingErr) {
    console.error("db_lookup_failed", existingErr.message);
    return json(500, { error: "db_lookup_failed" });
  }

  let rowId = existing?.id as string | undefined;
  let alreadyRegistered = Boolean(existing);
  let attempts = Number(existing?.welcome_email_attempts ?? 0);

  if (!existing) {
    const { data: inserted, error: insertErr } = await admin
      .from("landing_waitlist")
      .insert({
        name,
        email,
        phone,
        source,
        welcome_email_status: "pending",
        welcome_email_attempts: 0,
      })
      .select("id")
      .single();

    if (insertErr) {
      // Concurrent signup race on unique email — reload and continue.
      if (insertErr.code === "23505") {
        alreadyRegistered = true;
        const { data: raced } = await admin
          .from("landing_waitlist")
          .select(
            "id, welcome_email_sent_at, welcome_email_status, welcome_email_attempts",
          )
          .eq("email", email)
          .maybeSingle();
        rowId = raced?.id;
        attempts = Number(raced?.welcome_email_attempts ?? 0);
        if (raced?.welcome_email_sent_at) {
          return json(200, {
            ok: true,
            already_registered: true,
            emailed: true,
            email_status: "sent",
          });
        }
      } else {
        console.error("db_insert_failed", insertErr.message);
        return json(500, { error: "db_insert_failed" });
      }
    } else {
      rowId = inserted?.id;
    }
  } else if (existing.welcome_email_sent_at) {
    return json(200, {
      ok: true,
      already_registered: true,
      emailed: true,
      email_status: "sent",
    });
  }

  if (!rowId) {
    return json(500, { error: "db_row_missing" });
  }

  // Keep contact details fresh on re-submit (scale-safe upsert behavior).
  if (alreadyRegistered) {
    await admin
      .from("landing_waitlist")
      .update({ name, phone, source })
      .eq("id", rowId);
  }

  const logoUrl = Deno.env.get("LANDING_LOGO_URL") ?? DEFAULT_LOGO_URL;
  const iconUrl = Deno.env.get("LANDING_ICON_URL") ?? DEFAULT_ICON_URL;
  const { subject, text, html } = buildWelcomeEmail(name, logoUrl, iconUrl);

  const fromName = Deno.env.get("LANDING_FROM_NAME") ?? "LifeMaxxing Team";
    const fromEmail =
      Deno.env.get("LANDING_FROM_EMAIL") ?? "hello@lifemaxxing.io";
  const replyTo = Deno.env.get("LANDING_REPLY_TO") ?? fromEmail;
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";

  let emailed = false;
  let emailStatus: "pending" | "sent" | "failed" = "pending";
  let emailError: string | undefined;

  if (!resendKey) {
    emailStatus = "failed";
    emailError = "resend_api_key_missing";
    await markEmailAttempt(admin, rowId, {
      welcome_email_status: "failed",
      welcome_email_error: emailError,
      welcome_email_attempts: attempts + 1,
    });
  } else {
    try {
      let result = await sendViaResend({
        apiKey: resendKey,
        from: `${fromName} <${fromEmail}>`,
        to: email,
        subject,
        text,
        html,
        replyTo,
      });

      // Temporary fallback only while domain DNS is unverified.
      if (!result.ok && /domain is not verified/i.test(result.error ?? "")) {
        result = await sendViaResend({
          apiKey: resendKey,
          from: `${fromName} <onboarding@resend.dev>`,
          to: email,
          subject,
          text,
          html,
          replyTo,
        });
      }

      attempts += 1;

      if (result.ok) {
        emailed = true;
        emailStatus = "sent";
        await markEmailAttempt(admin, rowId, {
          welcome_email_status: "sent",
          welcome_email_sent_at: new Date().toISOString(),
          welcome_email_provider_id: result.id ?? null,
          welcome_email_error: null,
          welcome_email_attempts: attempts,
        });
      } else {
        emailStatus = "failed";
        emailError = result.error ?? "send_failed";
        console.error("resend_failed", emailError);
        await markEmailAttempt(admin, rowId, {
          welcome_email_status: "failed",
          welcome_email_error: emailError.slice(0, 500),
          welcome_email_attempts: attempts,
        });
      }
    } catch (err) {
      emailStatus = "failed";
      emailError = err instanceof Error ? err.message : "send_exception";
      console.error("resend_exception", emailError);
      await markEmailAttempt(admin, rowId, {
        welcome_email_status: "failed",
        welcome_email_error: emailError.slice(0, 500),
        welcome_email_attempts: attempts + 1,
      });
    }
  }

  return json(200, {
    ok: true,
    already_registered: alreadyRegistered,
    emailed,
    email_status: emailStatus,
    // Safe, high-level hint for the UI — never leak provider internals.
    email_error: emailed
      ? null
      : emailError?.includes("verify a domain") ||
          emailError?.includes("only send testing emails")
        ? "domain_unverified"
        : "send_failed",
  });
});
