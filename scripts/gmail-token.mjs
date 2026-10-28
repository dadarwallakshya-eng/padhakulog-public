#!/usr/bin/env node
// One-time helper: gets a Gmail API refresh token so the site can send
// sign-in codes from the project Gmail account.
//
// Usage (run it yourself, in your own terminal):
//   node scripts/gmail-token.mjs <CLIENT_ID> <CLIENT_SECRET> <SENDER_GMAIL>
//
// It saves the four GMAIL_* values into .dev.vars (local) and uploads them as
// Cloudflare secrets, without printing the refresh token. That token is a
// password: never paste it in chat or commit it.
import fs from 'node:fs';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { URL } from 'node:url';

const [clientId, clientSecret, sender] = process.argv.slice(2);
if (!clientId || !clientSecret || !sender?.includes('@')) {
  console.error('Usage: node scripts/gmail-token.mjs <CLIENT_ID> <CLIENT_SECRET> <SENDER_GMAIL>');
  process.exit(1);
}

function saveDevVars(values) {
  const file = '.dev.vars';
  let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}=${JSON.stringify(v)}`;
    const re = new RegExp(`^${k}=.*$`, 'm');
    text = re.test(text) ? text.replace(re, line) : `${text.replace(/\n?$/, '\n')}${line}\n`;
  }
  fs.writeFileSync(file, text, { mode: 0o600 });
}

const PORT = 53682;
const redirectUri = `http://localhost:${PORT}/callback`;
const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
auth.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/gmail.send', // send only: it can't read your mail
  access_type: 'offline',
  prompt: 'consent',
}).toString();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/callback') return res.writeHead(404).end();
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400).end('No code. Close this tab and try again.');
    return;
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const data = await tokenRes.json();
  if (!data.refresh_token) {
    res.writeHead(500).end('Google did not return a refresh token. See the terminal.');
    console.error('\nNo refresh_token in the response:', data);
    process.exit(1);
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Done. You can close this tab and go back to the terminal.');
  const values = { GMAIL_CLIENT_ID: clientId, GMAIL_CLIENT_SECRET: clientSecret, GMAIL_REFRESH_TOKEN: data.refresh_token, GMAIL_SENDER: sender };
  saveDevVars(values);
  console.log('\nSaved to .dev.vars. Uploading to Cloudflare...');
  const up = spawnSync('npx', ['wrangler', 'secret', 'bulk'], { input: JSON.stringify(values), stdio: ['pipe', 'inherit', 'inherit'] });
  console.log(up.status === 0 ? '\nAll set. Codes will now be emailed from ' + sender : '\nCloudflare upload failed. Run: npx wrangler login, then this script again.');
  server.close();
});

server.listen(PORT, () => {
  console.log('Open this link, sign in with the Gmail that should send the codes, and allow "Send email":\n');
  console.log(auth.toString(), '\n');
});
