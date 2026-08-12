/* The editor's backend.

   One Cloudflare Worker sitting on admin.tahirqadri.com.pk. It does two
   things and refuses everything else:

     POST /publish   commits the files the editor sends, to GitHub
     anything else   fetches the same path from the public site

   The second is what makes the first simple. The editor is served through
   this Worker rather than from the public address, so the page and the
   endpoint share an origin: no CORS, no preflight, and Cloudflare Access
   stands in front of both. A visitor who has not signed in never receives
   admin.html at all, let alone reaches /publish.

   The GitHub token lives here as a Worker secret. It is never sent to a
   browser and never stored on a phone or a laptop, which is the whole
   point of there being a Worker.

   Nothing in this folder is part of the website. The site stays plain
   static files that open from the file system; this is a separate thing
   that gets deployed separately. See README.md beside this file. */

const GITHUB = 'https://api.github.com';

/* Bumped whenever this file changes in a way the editor depends on.

   This file is deployed by hand to Cloudflare, separately from the site.
   The editor is not — it is fetched fresh from the public address on
   every load — so the two drift apart silently, and the first sign of it
   is a publish stopping half way on a path the deployed copy has never
   heard of. That is not a hypothetical: this sat a week behind, without
   works/ or files/cards/ among the paths below, and every publish died
   on the first work page it was handed. The editor asks /version on
   load now, so the drift is said plainly before anything is sent. */
const WORKER_VERSION = '2026-08-12';

/* The token here can write to the repository, so this endpoint must not
   become a way to write anything anywhere. Only what the editor
   legitimately produces is accepted: content.js and sitemap.xml, a
   post's own page, and — since every work and fatwa got one too, so a
   shared link carries a real title and picture instead of the same
   generic preview whichever one it named — a work's own page as well. */
const WRITABLE = [
  /^content\.js$/,
  /^sitemap\.xml$/,
  /^posts\/[a-z0-9-]+\.html$/,
  /^works\/[a-z0-9-]+\.html$/,
  /^files\/cards\/[a-z0-9-]+\.jpg$/
];

const MAX_FILE_BYTES = 512 * 1024;
/* Every publish regenerates content.js, sitemap.xml, every work and post's
   own page, and every record's card — the whole library, not just what
   changed, so there is never a "does this still match" question to answer
   by hand. That means the count grows with the library itself: it was
   already past 40 with 22 works and posts (2 + 22 pages + 22 cards = 46),
   which made an ordinary publish fail as "too many files." Room for the
   library to keep growing for years, not a number sized to today's count. */
const MAX_FILES = 1000;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

/* ---- Who is asking -----------------------------------------------------

   Two ways of proving it, and the Worker takes whichever is configured.

   Firebase — the editor signs in against a Firebase project and sends the
   ID token Google issues. Free, no card, and if you already run a Firebase
   project you already have the console for it.

   Cloudflare Access — Access puts a signed assertion on every request it
   lets through, and guards the page itself rather than only the publish.
   Needs a payment method on file even on the free plan.

   Either way the Worker verifies the signature itself rather than trusting
   that something upstream already did. A route can be misconfigured, and a
   Worker that assumes it is protected when it is not hands its token to
   the internet. */

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeSegment(value) {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(value)));
}

/* Both issuers publish their public keys as JWKS and rotate them, so the
   set is fetched rather than pinned, and kept for an hour. */
const keyCache = new Map();

async function signingKeys(url) {
  const held = keyCache.get(url);
  if (held && Date.now() - held.at < 60 * 60 * 1000) return held.keys;
  const response = await fetch(url);
  if (!response.ok) throw new HttpError(500, 'could not read the signing keys');
  const body = await response.json();
  const keys = body.keys || [];
  keyCache.set(url, { keys, at: Date.now() });
  return keys;
}

async function verifyJwt(token, options) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new HttpError(401, 'the sign-in token is malformed');

  /* Anything at all can arrive in that header. Garbage is a refusal, not
     an error report — decoding it must not be allowed to fall through to
     the 500 handler and describe the insides of the parser. */
  let header;
  let payload;
  try {
    header = decodeSegment(parts[0]);
    payload = decodeSegment(parts[1]);
  } catch (error) {
    throw new HttpError(401, 'the sign-in token is malformed');
  }
  if (!header || !payload || typeof payload !== 'object') {
    throw new HttpError(401, 'the sign-in token is malformed');
  }
  if (header.alg !== 'RS256') throw new HttpError(401, 'the sign-in token is signed the wrong way');

  const keys = await signingKeys(options.jwksUrl);
  const key = keys.find((candidate) => candidate.kid === header.kid);
  if (!key) throw new HttpError(401, 'the sign-in token was signed by an unknown key');

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    { kty: key.kty, n: key.n, e: key.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, fromBase64Url(parts[2]), signed);
  if (!ok) throw new HttpError(401, 'the sign-in token did not verify');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new HttpError(401, 'the sign-in has expired — sign in again');
  if (payload.nbf && payload.nbf > now + 60) throw new HttpError(401, 'the sign-in is not valid yet');

  const audience = [].concat(payload.aud || []);
  if (!audience.includes(options.audience)) throw new HttpError(401, 'the sign-in is for a different application');
  if (payload.iss !== options.issuer) throw new HttpError(401, 'the sign-in came from somewhere else');

  return payload;
}

async function verifyFirebase(request, env) {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'not signed in — sign in and try again');
  const payload = await verifyJwt(token, {
    jwksUrl: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
    issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT}`,
    audience: env.FIREBASE_PROJECT
  });
  if (!payload.sub) throw new HttpError(401, 'the sign-in names no one');
  return payload;
}

async function verifyAccess(request, env) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new HttpError(401, 'not signed in — reload the page and sign in again');
  return verifyJwt(token, {
    jwksUrl: `https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`,
    issuer: `https://${env.ACCESS_TEAM}.cloudflareaccess.com`,
    audience: env.ACCESS_AUD
  });
}

async function identify(request, env) {
  let payload;
  if (env.FIREBASE_PROJECT) {
    payload = await verifyFirebase(request, env);
  } else if (env.ACCESS_TEAM && env.ACCESS_AUD) {
    payload = await verifyAccess(request, env);
  } else {
    /* Refusing is the only safe thing here. A Worker holding a token that
       can write to the repository must never fall open because a variable
       was left blank. */
    throw new HttpError(500, 'the Worker has no way to check who you are — set FIREBASE_PROJECT, or ACCESS_TEAM and ACCESS_AUD');
  }

  /* The second lock. Whichever service did the signing in, only this
     address may publish — so a policy widened by accident, or another
     account in the same Firebase project, still cannot. */
  if (env.EDITOR_EMAIL && payload.email !== env.EDITOR_EMAIL) {
    throw new HttpError(403, `${payload.email || 'that account'} may not publish`);
  }
  return payload;
}

/* ---- GitHub ---------------------------------------------------------- */

async function github(env, path, options) {
  const settings = options || {};
  const response = await fetch(GITHUB + `/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}` + path, {
    method: settings.method || 'GET',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'scholarly-works-editor',
      'content-type': 'application/json'
    },
    body: settings.body ? JSON.stringify(settings.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = data && data.message ? data.message : `HTTP ${response.status}`;
    if (response.status === 401) throw new HttpError(500, 'the stored GitHub token was refused — it may have expired');
    if (response.status === 403 || response.status === 404) {
      throw new HttpError(500, 'the stored GitHub token cannot write to the repository');
    }
    throw new HttpError(502, `GitHub said: ${reason}`);
  }
  return data;
}

/* One commit holding every file, so content.js and sitemap.xml can never
   land out of step with each other. */
async function commitAll(env, files, message) {
  const branch = env.GITHUB_BRANCH || 'main';
  const ref = await github(env, `/git/ref/heads/${branch}`);
  const head = await github(env, `/git/commits/${ref.object.sha}`);

  const blobs = [];
  for (const file of files) {
    const blob = await github(env, '/git/blobs', {
      method: 'POST',
      body: { content: file.text, encoding: file.binary ? 'base64' : 'utf-8' }
    });
    blobs.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha });
  }

  const tree = await github(env, '/git/trees', {
    method: 'POST',
    body: { base_tree: head.tree.sha, tree: blobs }
  });
  const commit = await github(env, '/git/commits', {
    method: 'POST',
    body: { message, tree: tree.sha, parents: [ref.object.sha] }
  });
  await github(env, `/git/refs/heads/${branch}`, {
    method: 'PATCH',
    body: { sha: commit.sha }
  });
  return commit;
}

/* ---- Publishing ------------------------------------------------------ */

function checkFiles(files) {
  if (!Array.isArray(files) || files.length === 0) throw new HttpError(400, 'no files were sent');
  if (files.length > MAX_FILES) throw new HttpError(400, 'too many files in one publish');
  return files.map((file) => {
    const path = String((file && file.path) || '');
    const text = (file && file.text) != null ? String(file.text) : null;
    if (text === null) throw new HttpError(400, `${path || 'a file'} had no contents`);
    if (!WRITABLE.some((allowed) => allowed.test(path))) {
      throw new HttpError(400, `${path} is not a file the editor may write`);
    }
    /* A card image arrives as base64 text — file.text already holds the
       encoded string, not the picture itself, so the size ceiling is
       checked on that string the same way as any other file. */
    if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
      throw new HttpError(400, `${path} is too large`);
    }
    return { path, text, binary: !!(file && file.binary) };
  });
}

/* content.js is loaded by every visitor's browser. If the editor ever
   sends something malformed the library goes blank for everyone, so it is
   checked before it is allowed anywhere near the repository.

   The editor has already run it through `new Function` in the browser,
   which is the stronger test. That cannot be repeated here: the Workers
   runtime forbids building code from strings, and an earlier version of
   this file tried anyway — the refusal came back as "content.js did not
   parse", blaming the author for a check that never ran.

   So this reads the text instead of executing it: it walks the file
   tracking strings and comments, and counts the brackets. That catches
   what actually goes wrong — an upload cut short, an edit that loses a
   brace — without generating any code. */
function checkContentParses(files) {
  const content = files.find((file) => file.path === 'content.js');
  if (!content) return;
  const text = content.text;

  if (!/window\s*\.\s*siteContent\s*=/.test(text)) {
    throw new HttpError(400, 'content.js does not set window.siteContent, so nothing was committed');
  }
  if (!/categories\s*:/.test(text)) {
    throw new HttpError(400, 'content.js names no categories, so nothing was committed');
  }

  const pairs = { '}': '{', ']': '[', ')': '(' };
  const stack = [];
  let quote = '';
  let comment = '';

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (comment === 'line') {
      if (ch === '\n') comment = '';
      continue;
    }
    if (comment === 'block') {
      if (ch === '*' && next === '/') { comment = ''; i += 1; }
      continue;
    }
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { comment = 'line'; i += 1; continue; }
    if (ch === '/' && next === '*') { comment = 'block'; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }

    if (ch === '{' || ch === '[' || ch === '(') stack.push(ch);
    else if (pairs[ch]) {
      if (stack.pop() !== pairs[ch]) {
        throw new HttpError(400, `content.js has a stray ${ch}, so nothing was committed`);
      }
    }
  }

  if (quote) throw new HttpError(400, 'content.js has a quote that is never closed, so nothing was committed');
  if (comment === 'block') throw new HttpError(400, 'content.js has a comment that is never closed, so nothing was committed');
  if (stack.length) {
    throw new HttpError(400, `content.js is missing ${stack.length} closing bracket${stack.length === 1 ? '' : 's'}, so nothing was committed`);
  }
}

async function publish(request, env) {
  const identity = await identify(request, env);

  let body;
  try {
    body = await request.json();
  } catch (error) {
    throw new HttpError(400, 'the request was not JSON');
  }

  const files = checkFiles(body && body.files);
  checkContentParses(files);

  const summary = files.map((file) => file.path).join(', ');
  const message = `${(body && body.message) || 'Update from the editor'}\n\n${summary}\n\nPublished by ${identity.email || 'the editor'}`;

  const commit = await commitAll(env, files, message);
  return json(200, {
    sha: commit.sha,
    files: files.map((file) => file.path),
    message: 'Published.'
  });
}

/* ---- Everything else ------------------------------------------------- */

/* The editor and its stylesheet, the content, the fonts' stylesheet link
   — all of it comes from the public site, unchanged. Serving it through
   here rather than linking to the public address is what puts the editor
   behind Access and keeps it on one origin with /publish. */
async function passThrough(request, env) {
  /* Without this the failure is `new URL` complaining about an invalid URL
     string, which tells you nothing about the variable that is missing. */
  if (!env.SITE_ORIGIN) {
    throw new HttpError(500, 'the Worker has no SITE_ORIGIN set — add it under Settings → Variables, as https://tahirqadri.com.pk');
  }
  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, env.SITE_ORIGIN);
  if (incoming.pathname === '/') target.pathname = '/admin.html';

  const response = await fetch(target.toString(), {
    method: request.method,
    headers: request.headers,
    redirect: 'follow',
    cf: { cacheTtl: 0 }
  });
  const headers = new Headers(response.headers);
  /* The editor must never be cached or indexed, wherever it is served. */
  headers.set('cache-control', 'no-store');
  headers.set('x-robots-tag', 'noindex, nofollow');
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/publish') {
        if (request.method !== 'POST') return json(405, { message: 'POST only' });
        return await publish(request, env);
      }
      /* What is actually deployed here, for the editor to hold against
         what it expects. The paths go out as well as the version: a
         version only catches drift someone remembered to record, while
         the list answers the question that actually matters — would this
         Worker accept the files the editor is about to send.

         No sign-in needed. It discloses nothing the public site does not
         already show, and a check that fails for want of a credential is
         a check that cries stale when it is not. */
      if (url.pathname === '/version') {
        return json(200, {
          version: WORKER_VERSION,
          writable: WRITABLE.map((pattern) => pattern.source),
          maxFiles: MAX_FILES,
          maxFileBytes: MAX_FILE_BYTES
        });
      }
      return await passThrough(request, env);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return json(status, { message: error.message || 'something went wrong' });
    }
  }
};
