# The editor's backend — setting it up once

This folder is **not part of the website**. The site is still plain static
files that open from the file system with no build step. This is a separate
small program that gets deployed once, so that publishing from `admin.html`
no longer needs a GitHub token on your phone or laptop.

## What it does

You open `https://admin.tahirqadri.com.pk`. Cloudflare asks for your email,
sends you a six-digit code, and only then serves the editor. You edit, you
press **Publish**, and the page posts the files to the Worker. The Worker
checks the sign-in is genuine, checks `content.js` actually parses, and
commits to GitHub using a token that lives in Cloudflare and never leaves it.

Nothing to type, nothing to remember, nothing stored on the device.

The public site at `tahirqadri.com.pk` is untouched by all of this.

## Setting it up

You need to do this once. About fifteen minutes.

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

### 2. Cloudflare Access

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

```toml
ACCESS_TEAM  = "your-team-name"     # from something.cloudflareaccess.com
ACCESS_AUD   = "the-long-aud-tag"   # from the Access application overview
ACCESS_EMAIL = "you@example.com"    # optional; only this address may publish
```

`ACCESS_EMAIL` is a second lock. Access already decides who may sign in; this
means that even if that policy is ever widened by accident, the Worker still
only commits for you.

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

Open `https://admin.tahirqadri.com.pk`. You should be asked for your email
and a code. After that the editor appears. Change something small, press
**Publish**, and watch for *"Published. The site rebuilds in about a
minute."*

Then open the same address in a private window and confirm you are asked to
sign in again rather than being let straight through.

## Running the tests

```
node test.mjs
```

No dependencies and no network — Cloudflare's signing keys and the GitHub API
are both stood in for. Twenty-two checks, most of them proving the Worker
refuses things: an absent sign-in, a forged one, an expired one, one for a
different application, one for a different person, an attempt to write a file
outside the three it is allowed to touch, and a `content.js` that would not
parse.

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
| *not signed in — reload the page* | Your Access session expired. Reload; sign in again. |
| *…may not publish* | You are signed in as a different address than `ACCESS_EMAIL`. |
| *the stored GitHub token was refused* | It expired. Make a new one and `wrangler secret put GITHUB_TOKEN` again. |
| *content.js did not parse* | Nothing was committed. Something in the form is malformed. |
| *the Worker has no Access team or audience configured* | Step 4 was skipped. The Worker refuses to publish rather than run unprotected. |

**Files…** always works regardless, and needs no token and no Worker — it
hands you the text to paste into GitHub by hand.
