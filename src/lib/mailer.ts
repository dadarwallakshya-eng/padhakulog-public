import { EMAIL_LOGO } from './email-logo';
import { env } from './env';

// Sends the sign-in code over HTTPS (Cloudflare Workers can't use SMTP).
// Picks a provider from the environment:
//   GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN (+ GMAIL_SENDER)
//       -> Gmail API from the project's Gmail / Google Workspace account
//   RESEND_API_KEY (+ EMAIL_FROM) -> Resend
// With neither set, nothing is sent and the code is shown on the page in dev.

export type MailProvider = 'gmail' | 'resend' | null;

export function mailProvider(): MailProvider {
  // DISABLE_EMAIL=1 in .dev.vars keeps local testing from mailing real inboxes.
  if (env('DISABLE_EMAIL') === '1') return null;
  if (env('GMAIL_CLIENT_ID') && env('GMAIL_CLIENT_SECRET') && env('GMAIL_REFRESH_TOKEN')) return 'gmail';
  if (env('RESEND_API_KEY')) return 'resend';
  return null;
}

// withLogo: the logo is attached inline as cid:logo (Gmail path). Without it, a text wordmark.
export function otpEmail(code: string, withLogo = false) {
  const subject = `${code} is your Padhaku Log code`;
  const text = [
    'Padhaku Log',
    '',
    `Your sign-in code: ${code}`,
    '',
    'Type it on the sign-in page. It works for 10 minutes, one time only.',
    '',
    'Never share this code. Padhaku Log will never ask you for it on chat or call.',
    "Didn't try to sign in? Ignore this email, your account is safe.",
    '',
    'Chalo, baat karein.',
    'Sirf IIT aur IIM walon ke liye.',
  ].join('\n');

  // Same look as the site: ink on paper, thick outlines, a highlighter swipe.
  // Email clients ignore <style>, web fonts and SVG, so everything is inline and table-based.
  const ink = '#17181C';
  const paper = '#FBFAF6';
  const marker = '#FCE07A';
  const pencil = '#4A4C52';
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const hand = "'Kalam','Comic Sans MS','Chalkboard SE','Segoe Print',cursive";
  const digits = code
    .split('')
    .map((d) => `<td style="width:44px;height:58px;background:#FFFFFF;border:2px solid ${ink};border-radius:12px;font-family:${font};font-size:30px;font-weight:800;color:${ink};text-align:center">${d}</td>`)
    .join('<td style="width:8px"></td>');
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:${paper};font-family:${font};color:${ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your code works for 10 minutes. Never share it with anyone.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper}"><tr><td align="center" style="padding:36px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px">

<tr><td style="padding:0 4px 22px">
  ${withLogo
    ? `<img src="cid:logo@padhakulog" width="${EMAIL_LOGO.width}" height="${EMAIL_LOGO.height}" alt="Padhaku Log" style="display:block;border:0;width:${EMAIL_LOGO.width}px;height:${EMAIL_LOGO.height}px">`
    : `<span style="display:inline-block;background:${marker};border-radius:6px;padding:2px 10px;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:${ink}">Padhaku Log</span>`}
</td></tr>

<tr><td style="background:#FFFFFF;border:2px solid ${ink};border-radius:24px;padding:34px 30px;box-shadow:6px 6px 0 ${marker}">
  <div style="font-size:26px;font-weight:800;letter-spacing:-0.5px;line-height:1.15">Ye raha tumhara code</div>
  <div style="padding-top:8px;font-size:15px;line-height:1.55;color:${pencil}">Your sign-in code. Type it on the sign-in page. It works for <b style="color:${ink}">10 minutes</b>, one time only.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;background:${marker};border-radius:18px"><tr><td align="center" style="padding:22px 10px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
  </td></tr></table>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:26px;border-top:1.5px solid #E6E3DA"><tr><td style="padding-top:18px;font-size:13px;line-height:1.6;color:${pencil}">
    <b style="color:${ink}">Never share this code.</b> Padhaku Log will never ask you for it on chat or call.<br>
    Didn't try to sign in? Ignore this email, your account is safe.
  </td></tr></table>
</td></tr>

<tr><td align="center" style="padding:26px 16px 0;line-height:1.5">
  <span style="font-family:${hand};font-size:19px;font-weight:700;color:${ink}">Chalo, baat karein.</span><br>
  <span style="font-size:13px;color:${pencil}">Sirf IIT aur IIM walon ke liye.</span>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}

const b64url = (s: string) => Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function gmailAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('GMAIL_CLIENT_ID')!,
      client_secret: env('GMAIL_CLIENT_SECRET')!,
      refresh_token: env('GMAIL_REFRESH_TOKEN')!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const { subject, text, html } = otpEmail(code);
  const provider = mailProvider();

  if (provider === 'gmail') {
    const { subject: subj, text: plain, html: rich } = otpEmail(code, true);
    const from = env('GMAIL_SENDER') ? `Padhaku Log <${env('GMAIL_SENDER')}>` : 'Padhaku Log <me>';
    const related = `pl_rel_${crypto.randomUUID()}`;
    const alt = `pl_alt_${crypto.randomUUID()}`;
    const mime = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subj}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/related; boundary="${related}"`,
      '',
      `--${related}`,
      `Content-Type: multipart/alternative; boundary="${alt}"`,
      '',
      `--${alt}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      plain,
      `--${alt}`,
      'Content-Type: text/html; charset="UTF-8"',
      '',
      rich,
      `--${alt}--`,
      `--${related}`,
      'Content-Type: image/png; name="padhakulog.png"',
      'Content-Transfer-Encoding: base64',
      'Content-ID: <logo@padhakulog>',
      'Content-Disposition: inline; filename="padhakulog.png"',
      '',
      EMAIL_LOGO.base64.replace(/.{76}/g, '$&\r\n'),
      `--${related}--`,
    ].join('\r\n');
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await gmailAccessToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64url(mime) }),
    });
    if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
    return;
  }

  if (provider === 'resend') {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env('EMAIL_FROM') || 'Padhaku Log <onboarding@resend.dev>', to: [to], subject, text, html }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
    return;
  }

  throw new Error('No email provider configured');
}
