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

/* The token here can write to the repository, so this endpoint must not
   become a way to write anything anywhere. Only the three things the
   editor legitimately produces are accepted. */
const WRITABLE = [/^content\.js$/, /^sitemap\.xml$/, /^posts\/[a-z0-9-]+\.html$/];

const MAX_FILE_BYTES = 512 * 1024;
const MAX_FILES = 40;

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

/* ---- Cloudflare Access ------------------------------------------------

   Access puts a signed assertion on every request it lets through. The
   Worker checks it rather than trusting that it is behind Access at all:
   a route can be misconfigured, and a Worker that assumes it is protected
   when it is not hands its token to the internet. */

let jwks = { keys: null, fetchedAt: 0 };

async function accessKeys(env) {
  const age = Date.now() - jwks.fetchedAt;
  if (jwks.keys && age < 60 * 60 * 1000) return jwks.keys;
  const url = `https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`;
  const response = await fetch(url);
  if (!response.ok) throw new HttpError(500, 'could not read the Access signing keys');
  const body = await response.json();
  jwks = { keys: body.keys || [], fetchedAt: Date.now() };
  return jwks.keys;
}

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

async function verifyAccess(request, env) {
  if (!env.ACCESS_TEAM || !env.ACCESS_AUD) {
    throw new HttpError(500, 'the Worker has no Access team or audience configured');
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new HttpError(401, 'not signed in — reload the page and sign in again');

  const parts = token.split('.');
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
  const keys = await accessKeys(env);
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
  if (payload.exp && payload.exp < now) throw new HttpError(401, 'the sign-in has expired — reload the page');
  if (payload.nbf && payload.nbf > now + 60) throw new HttpError(401, 'the sign-in is not valid yet');

  const audience = [].concat(payload.aud || []);
  if (!audience.includes(env.ACCESS_AUD)) throw new HttpError(401, 'the sign-in is for a different application');

  const issuer = `https://${env.ACCESS_TEAM}.cloudflareaccess.com`;
  if (payload.iss !== issuer) throw new HttpError(401, 'the sign-in came from a different team');

  /* Access already limits who may sign in. This is the second lock: if the
     policy is ever widened by accident, the Worker still only commits for
     the address named here. */
  if (env.ACCESS_EMAIL && payload.email !== env.ACCESS_EMAIL) {
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
      body: { content: file.text, encoding: 'utf-8' }
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
    if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
      throw new HttpError(400, `${path} is too large`);
    }
    return { path, text };
  });
}

/* content.js is executed by every visitor's browser. If the editor ever
   sends something that does not parse, the library goes blank for
   everyone — so it is run here, in a Function with no access to anything,
   before it is allowed anywhere near the repository. */
function checkContentParses(files) {
  const content = files.find((file) => file.path === 'content.js');
  if (!content) return;
  let holder = {};
  try {
    // eslint-disable-next-line no-new-func
    new Function('window', content.text).call(holder, holder);
  } catch (error) {
    throw new HttpError(400, `content.js did not parse, so nothing was committed: ${error.message}`);
  }
  if (!holder.siteContent || !Array.isArray(holder.siteContent.categories)) {
    throw new HttpError(400, 'content.js parsed but held no categories, so nothing was committed');
  }
}

async function publish(request, env) {
  const identity = await verifyAccess(request, env);

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
      return await passThrough(request, env);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      return json(status, { message: error.message || 'something went wrong' });
    }
  }
};
