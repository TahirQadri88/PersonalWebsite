# Scholarly Works and Research — site guide

A plain static website. No build step, no framework, no server code. Double-click
`index.html` to open it locally; upload the folder to publish it.

## The files

| File | What it is |
| --- | --- |
| `content.js` | **Everything you edit.** All works, categories, fatawa, links |
| `admin.html` | A form for editing `content.js` without touching the code |
| `worker/` | The editor's backend, so publishing needs no token on your device |
| `posts/` | One HTML file per post — written by `admin.html`, not by hand |
| `works/` | One HTML file per work and fatwa — also written by `admin.html`, not by hand |
| `files/` | Put your PDFs and documents here |
| `index.html` | The homepage |
| `work.html` | Kept for an old `work.html?work=<id>` link — sends it on to the work's real page in `works/` when one exists, or shows the work itself when it doesn't yet |
| `common.js` · `script.js` · `work.js` | The code that builds the pages from `content.js` |
| `styles.css` | All the design, organised into numbered sections |
| `404.html` · `robots.txt` · `sitemap.xml` · `share-card.png` · `CNAME` | Supporting files |
| `files/images/` | The seal and the calligraphed name — the site's own artwork, not works |

## Adding a work

**The easy way:** open `admin.html` — in the browser, from the repo or just by
double-clicking it. Every work and fatwa appears as a form. Add, edit, reorder
or delete, then press **Publish** and it commits to GitHub for you. It checks
the file parses before sending anything, so a stray comma cannot take the
library down, and it writes `content.js` and `sitemap.xml` in the same commit,
so they cannot fall out of step.

**Files…** does the same work but hands you the text instead, to paste in by
hand — useful if you would rather not keep a token.

**By hand**, if you prefer:

1. Copy the PDF into the `files/` folder. Use a lowercase name with hyphens and
   no spaces — `ilm-ul-meerath.pdf`, not `Ilm ul Meerath Final (2).pdf`.
2. Open `content.js`, find the right category, and add an entry to its `works` list:

```js
{
  id: "ilm-ul-meerath",
  title: "علم المیراث",
  language: "ur",
  kind: "رسالہ",
  description: "One or two lines about it.",
  descriptionUr: "وہی بات اردو میں۔",
  tags: ["میراث"],
  files: [
    { label: "Urdu PDF", url: "files/ilm-ul-meerath.pdf" },
    { label: "Slides", url: "files/ilm-ul-meerath-slides.pdf" }
  ]
}
```

3. Add a matching line to `sitemap.xml`, copying one of the existing `<url>`
   blocks and changing the id. Without it search engines will not find the
   new work.
4. Save and refresh the page.

Added this way, the work shows up right away — `work.html?work=ilm-ul-meerath`
renders it on the spot when it finds no `works/ilm-ul-meerath.html` yet.
What it will not have until then is a proper preview: WhatsApp, Facebook and
the like read a page's file directly and never run its script, so a work
added by hand looks generic if shared before its page exists. Open
`admin.html` once, over the same content, and press **Publish** — or
**Files…** and paste in the one extra page it now offers alongside
`content.js` and `sitemap.xml` — and the entry you typed by hand gets the
same page every other work has.

**`language`** picks the font: `"ur"` gives Nastaleeq, `"ar"` gives Naskh, `"en"`
gives the English serif.

**`id`** must be unique and use only English letters, numbers and hyphens. It
becomes the shareable address: `works/ilm-ul-meerath.html`, written by
`admin.html` alongside `content.js` and `sitemap.xml` whenever you press
**Publish**. Once you have shared a link, don't change its `id` — the old
link will stop working.

Each of these pages carries its own title, description and picture for
WhatsApp, Google and the rest to read straight off the file — they never run
the page's script, so those three things have to already be in the file they
fetch, not filled in afterwards. That's also why `admin.html` regenerates
every one of them on every **Publish**: nothing about a work is written down
anywhere except `content.js`, so keeping its page correct just means building
it again from there each time, the same as `sitemap.xml` already is.

**`files`** can point at a Google Drive link just as easily as a local file. Leave
the whole `files` line out if nothing is ready yet; the work then shows as
"Not published here yet", which is a normal state, not a mistake.

**`kind`** is the small Urdu label beside the title — رسالہ, چارٹ, پریزینٹیشن,
ترجمہ و تخریج, مضمون. It tells the reader what form the work takes.

**`descriptionUr`** is the same sentence in Urdu, and either may be left
out. On an Urdu or Arabic work the Urdu is shown first and the English under
it; on an English fatwa it is the other way round. Both are searchable.

**`tags`** appear as small pills and are included in the search.

**Each file gets two links** — the label opens it to read, and *Download* puts
it on the device without waiting for the browser's viewer. The second link
only appears for files kept in `files/`; a link out to Google Drive cannot be
made to save, so it offers opening alone rather than a button that lies.

## Writing a post

Posts, notes and reflections are different from everything else here: the
writing *is* the page, so each one is its own HTML file in `posts/` rather
than a download.

1. Open `admin.html` and press **+ Add a post**. It fills in today's date and a
   file name for you.
2. Give it a title, a one-line description, and write the piece in **The
   writing** box. A blank line starts a new paragraph; the buttons above the
   box do the rest. Put the cursor in a block and the buttons light up to
   show what that block already is.

   Three rows, and they **combine** — a Qur'anic verse is a quotation *and*
   Arabic *and* centred, all at once:

   | Row | Choices |
   | --- | --- |
   | Block | ¶ Paragraph · Heading · Quote |
   | Script | اردو · عربی · English |
   | Align | Right · Centre · Left |

   Press a button again to take that one thing off; the other two stay.

   They only type what you could type by hand: `## ` for a heading, `> ` for a
   quote, `[ur] ` `[ar] ` `[en] ` for script, `[r] ` `[c] ` `[l] ` for
   alignment. So `> [ar] [c] …` is a centred Arabic quotation. The file is
   the same either way, and opening a post and republishing it untouched
   gives back exactly the same file.
3. Press **Publish**. It commits everything — the entry, the sitemap line and
   the page — to GitHub in a single commit, and the site is live a minute later.
   **Files…** still gives you the same files to paste in by hand if you prefer.

The description does **not** appear on the post's own page — the writing is
already there, and a summary above it would only be read twice. It is used for
the card on the homepage, for what Google shows, and for the preview when the
link is shared. So it can safely repeat a line from the piece.

To edit a post later, open `admin.html` **over the web** (not by double-clicking
the file) — it reads the existing page back into the box. Opened from the file
system the browser will not let it read the file, and it says so rather than
quietly emptying your post.

## Sharing and printing

Every work, every fatwa and every post carries a **Share** button — on its
own page and next to it in the library list on the homepage. A post also
carries **Print**; a work or a fatwa does not, because its page is a record
of a PDF, not the thing itself, and printing that page would only print a
Download button that does nothing on paper. The PDF already prints itself.

**Share** writes the caption for you, so what arrives is not a bare address:

```
مضمون
The Books That Aren’t Coming Back
by Abul Laith Muhammad Tahir Qadri An-Naeemi

Books are being bought and shredded to feed machines — what the court
allowed, what it cost, and why a printed copy still matters.

https://tahirqadri.com.pk/posts/books-that-arent-coming-back.html
```

**Kind**, **title**, **by** whoever wrote it — read top to bottom the way a
masthead does — then the **description** from `content.js`, the same one
Google shows, so a description worth reading is worth writing. On an Urdu or
Arabic piece the Urdu description leads and the byline reads **از** rather
than **by**, because whoever receives it reads the caption before deciding
whether to open the page. `kind` is always the small Urdu label, whatever
script the piece itself is in — the same as the page shows it — so it stays
on its own line above the title rather than beside it.

On a phone it opens the usual sharing sheet, so WhatsApp is one tap. On a
computer it copies the caption and the link together, ready to paste. A
share sheet that fails to open for a real reason — not the reader simply
closing it — falls back to the copy too, so a tap never does nothing.

**Print** gives a clean sheet: no header, no menus, no buttons — the title,
the date, the writing, the tags, and one line at the foot with the author's
name and the page's address, so a printed copy can be traced back. Choose
*Save as PDF* in the print dialog and you have a PDF to send or keep. Urdu
prints in Nastaleeq at a size that survives paper.

Nothing needs to be done to a post — or a work, for Share — to give it
these. They are added by `common.js` when the page opens, so everything
written before this feature existed has them too, and everything written
after it will as well.

## Adding a fatwa

Same shape, added to the `rulings` list at the bottom of `content.js`. Fatawa get
their own detail pages too, so `files` works there as well.

## Adding a category

Copy a whole category block in `content.js` and give it a new English `id`. It
appears in the category bar automatically. To reorder categories, move the blocks
— the page follows the file.

## Publishing from the editor

**The short version:** open `https://admin.tahirqadri.com.pk`, sign in, edit,
press **Publish**. The GitHub token lives in Cloudflare, not on your phone.
Signing in is either a Firebase email and password or a code Cloudflare emails
you — `worker/README.md` compares the two and has the one-time setup, about
fifteen minutes.

Everything below applies only when the editor is opened some other way — by
double-clicking the file, or from the public address — where there is no
backend to call.

The first time you press **Publish** it asks for a GitHub token. Make a
**fine-grained** one at *Settings → Developer settings → Personal access tokens
→ Fine-grained*: **Only select repositories** → this one, and under *Repository
permissions* set **Contents: Read and write**. Give it an expiry. Nothing else
is needed, and nothing less will work.

Leave *Keep it on this device* unticked and the browser forgets the token when
it closes. Tick it only on a device that is yours alone — a stored token can
push to your repository, so it is a key, not a password. **Forget stored token**
in the same dialog clears it.

Everything goes in one commit, so `content.js` and `sitemap.xml` can never land
out of step with each other.

## The editor's passphrase

`admin.html` asks for a passphrase. The word itself is written down nowhere —
what `admin.js` holds is a SHA-256 digest of it, which cannot be turned back
into the word. The comment beside that digest gives the one line to run in the
browser console if you ever want to change it.

It is a latch, not a lock: the site is static, so there is no server to check
anything, and anyone determined can read past it in the developer tools. That
is acceptable because the editor holds nothing private — every word in it is
already published — and it cannot save anything. What actually protects the
library is that only you can push to GitHub. For real authentication, put the
site behind Cloudflare Access, which is free and checks before the page is
served.

## Publishing on GitHub Pages

The repository is `TahirQadri88/PersonalWebsite` and the site is served at
**https://tahirqadri.com.pk**, a PKNIC domain whose DNS is run by Cloudflare.

1. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder
   `/ (root)`.
2. Settings → Pages → Custom domain: `tahirqadri.com.pk`. The `CNAME` file in
   this folder holds that name — do not delete it, Pages reads it.
3. Wait for the DNS check to pass, then tick **Enforce HTTPS**. The certificate
   takes a few minutes and cannot be issued while Cloudflare's proxy is on.

DNS lives in Cloudflare: four `A` records on the apex pointing at
`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`, and a `CNAME` on `www`
pointing at `tahirqadri88.github.io`. Keep them **DNS only** (grey cloud) until
GitHub has issued the certificate. If you later switch the proxy on, set
SSL/TLS to *Full (strict)* — *Flexible* causes an endless redirect.

The nameservers at PKNIC are the two Cloudflare gives you for this zone.

## After publishing

- Submit the site once in Google Search Console so it can be found. Verify by
  DNS TXT record, which Cloudflare can add for you in one click.
- The address is set in four places — `site.baseUrl` in `content.js`,
  `robots.txt`, `sitemap.xml`, and the canonical and sharing tags in
  `index.html` — plus the `CNAME` file. All five change together if the
  domain ever changes.
- Add a link to the new site from your Google Site and your Super page, so
  existing readers follow across.
