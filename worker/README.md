# The editor's backend — setting it up once

This folder is **not part of the website**. The site is still plain static
files that open from the file system with no build step. This is a separate
small program that gets deployed once, so that publishing from `admin.html`
no longer needs a GitHub token on your phone or laptop.

## What it does

You open `https://admin.tahirqadri.com.pk`, sign in, edit, and press
**Publish**. The page posts the files to the Worker; the Worker checks the
sign-in is genuine, checks `content.js` actually parses, and commits to GitHub
using a token that lives in Cloudflare and never leaves it.

Nothing that can write to your repository is ever stored on a phone or laptop.

The public site at `tahirqadri.com.pk` is untouched by all of this.

## Two ways to sign in — pick one

|  | **Firebase** | **Cloudflare Access** |
| --- | --- | --- |
| Card on file | not needed | needed, even on the free plan |
| Guards the editor page | no — the page loads, then asks | yes — the page is not served at all |
| Guards publishing | yes, checked by the Worker | yes, checked by the Worker |
| Signing in | your email and password | email, then a code they send you |

**Firebase is the one to choose if you already have a Firebase project** — you
know the console, and it costs nothing. Access is stronger by one step, in
that a stranger never receives `admin.html` at all; but the editor holds
nothing private, so what actually matters is that both check *publishing* on
the server.

Sections 1 and 6 below are common to both. Then do **either** section 2F
(Firebase) **or** 2A (Access).

## Setting it up

Once. About fifteen minutes.

### 1. The DNS record

Cloudflare dashboard → your domain → **DNS** → **Add record**

| | |
| --- | --- |
| Type | `CNAME` |
| Name | `admin` |
| Target | `tahirqadri.com.pk` |
| Proxy status | **Proxied** (orange cloud) — this one *must* be orange |

The apex record stays **DNS only** (grey). Do not change it. The public site
keeps being served straight from GitHub Pages exactly as now.

### 2F. Firebase — if you picked Firebase

In the [Firebase console](https://console.firebase.google.com), open your
project (an existing one is fine — this only borrows its sign-in).

**Authentication → Sign-in method →** enable **Email/Password**.

**Authentication → Users → Add user:** your email, and a password you choose.
That single user is who may publish.

**Authentication → Settings → Authorized domains → Add domain:**
`admin.tahirqadri.com.pk`

Then two values into `admin.js`, near the top, under `var FIREBASE`:

```js
var FIREBASE = {
  apiKey: 'AIza…',              // Project settings → General → Web API Key
  project: 'your-project-id'    // Project settings → General → Project ID
};
```

`apiKey` is **not a secret**. A Firebase web key identifies a project; it does
not authorise anything. What authorises is the signed-in user, and the Worker
checks that. It is meant to sit in the page.

Skip section 2A. Go to section 3.

### 2A. Cloudflare Access — if you picked Access

Cloudflare dashboard → **Zero Trust** → **Access** → **Applications** →
**Add an application** → **Self-hosted**

| | |
| --- | --- |
| Application name | `Editor` |
| Session duration | 24 hours is comfortable |
| Subdomain / domain | `admin` · `tahirqadri.com.pk` |

Then **Add policy**:

| | |
| --- | --- |
| Policy name | `Only me` |
| Action | Allow |
| Include | **Emails** → your address |

Save. On the application's **Overview** tab, copy the **Application Audience
(AUD) Tag** — a long string of letters and numbers. You need it in a moment.

You also need your team name: it is the `something` in
`something.cloudflareaccess.com`, shown under **Zero Trust → Settings →
Custom Pages**, or in the URL when the login page appears.

The free plan covers up to 50 users. You are one.

### 3. The GitHub token

This is the only token, and it lives in Cloudflare rather than on a device.

GitHub → **Settings → Developer settings → Personal access tokens →
Fine-grained** → **Generate new token**

- **Repository access:** Only select repositories → `PersonalWebsite`
- **Repository permissions:** **Contents: Read and write**
- Give it an expiry you will remember — a year is reasonable

Nothing else is needed and nothing less will work. Copy it; GitHub shows it
once.

### 4. Fill in `wrangler.toml`

Open it beside this file and set the three empty values:

With **Firebase**:

```toml
FIREBASE_PROJECT = "your-project-id"
EDITOR_EMAIL     = "you@example.com"
```

With **Access**:

```toml
ACCESS_TEAM  = "your-team-name"     # from something.cloudflareaccess.com
ACCESS_AUD   = "the-long-aud-tag"   # from the Access application overview
EDITOR_EMAIL = "you@example.com"
```

`EDITOR_EMAIL` is a second lock. Whichever service did the signing in, only
that address may publish — so another account in the same Firebase project, or
an Access policy widened by accident, still cannot.

### 5. Deploy

From inside this folder:

```
npx wrangler login
npx wrangler secret put GITHUB_TOKEN     # paste the token from step 3
npx wrangler deploy
```

`wrangler login` opens a browser once. The token goes in as a **secret**, so
it is never written into `wrangler.toml` and never appears in this repository.

### 6. Check it

Open `https://admin.tahirqadri.com.pk`. You are asked to sign in — email and
password with Firebase, email and a code with Access. After that the editor
appears. Change something small, press
**Publish**, and watch for *"Published. The site rebuilds in about a
minute."*

Then open the same address in a private window and confirm you are asked to
sign in again rather than being let straight through.

## Running the tests

```
node test.mjs
```

No dependencies and no network — Cloudflare's signing keys and the GitHub API
are both stood in for. Thirty-one checks, most of them proving the Worker
refuses things — for both ways of signing in: an absent token, a forged one,
an expired one, one for a different project or application, one for a
different person, an Access token offered where a Firebase one is wanted, an
attempt to write a file outside the three it is allowed to touch, and a
`content.js` that would not parse. Also that a Worker with neither configured
refuses everything rather than falling open.

Run it after changing anything in `src/`.

## What it will and will not write

Only these, and nothing else, whatever it is asked for:

- `content.js`
- `sitemap.xml`
- `posts/<name>.html`

A single request may carry all of them and they are committed together, so
`content.js` and `sitemap.xml` can never land out of step. `content.js` is
executed before the commit is made — if it would not parse, nothing is sent
at all, because a broken `content.js` empties the library for every visitor.

## If something goes wrong

The editor prints what happened on the line under its opening paragraph.

| It says | What to do |
| --- | --- |
| *not signed in — sign in and try again* | The session expired. Reload the page and sign in. |
| *the sign-in is for a different application* | `FIREBASE_PROJECT` or `ACCESS_AUD` does not match. |
| *the sign-in came from somewhere else* | `FIREBASE_PROJECT` or `ACCESS_TEAM` does not match. |
| *…may not publish* | You are signed in as a different address than `EDITOR_EMAIL`. |
| *That email and password do not match* | Firebase said no. Check the user exists under Authentication → Users. |
| *the stored GitHub token was refused* | It expired. Make a new one and `wrangler secret put GITHUB_TOKEN` again. |
| *content.js did not parse* | Nothing was committed. Something in the form is malformed. |
| *the Worker has no way to check who you are* | Section 4 was skipped. It refuses rather than run unprotected. |

**Files…** always works regardless, and needs no token and no Worker — it
hands you the text to paste into GitHub by hand.
