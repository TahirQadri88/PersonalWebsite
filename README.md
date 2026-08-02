# Scholarly Works and Research — site guide

A plain static website. No build step, no framework, no server code. Double-click
`index.html` to open it locally; upload the folder to publish it.

## The files

| File | What it is |
| --- | --- |
| `content.js` | **Everything you edit.** All works, categories, fatawa, links |
| `admin.html` | A form for editing `content.js` without touching the code |
| `posts/` | One HTML file per post — written by `admin.html`, not by hand |
| `files/` | Put your PDFs and documents here |
| `index.html` | The homepage |
| `work.html` | One page that renders any single work or fatwa |
| `common.js` · `script.js` · `work.js` | The code that builds the pages from `content.js` |
| `styles.css` | All the design, organised into numbered sections |
| `404.html` · `robots.txt` · `sitemap.xml` · `share-card.png` · `CNAME` | Supporting files |
| `files/images/` | The seal and the calligraphed name — the site's own artwork, not works |

## Adding a work

**The easy way:** open `admin.html` — in the browser, from the repo or just by
double-clicking it. Every work and fatwa appears as a form. Add, edit, reorder
or delete, then press **Save changes**: it writes a new `content.js` *and* a
matching `sitemap.xml` for you to paste into GitHub. It checks the file parses
before handing it over, so a stray comma cannot take the library down, and it
keeps the sitemap in step, which is the easiest thing to forget by hand.

It saves nothing by itself — a static site has nothing to save to — so nothing
you do in it touches the live site until you commit the two files.

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

**`language`** picks the font: `"ur"` gives Nastaleeq, `"ar"` gives Naskh, `"en"`
gives the English serif.

**`id`** must be unique and use only English letters, numbers and hyphens. It
becomes the shareable address: `work.html?work=ilm-ul-meerath`. Once you have
shared a link, don't change its `id` — the old link will stop working.

**`files`** can point at a Google Drive link just as easily as a local file. Leave
the whole `files` line out if nothing is ready yet; the work then shows as
"Not published here yet", which is a normal state, not a mistake.

**`kind`** is the small Urdu label beside the title — رسالہ, چارٹ, پریزینٹیشن,
ترجمہ و تخریج, مضمون. It tells the reader what form the work takes.

**`tags`** appear as small pills and are included in the search.

## Writing a post

Posts, notes and reflections are different from everything else here: the
writing *is* the page, so each one is its own HTML file in `posts/` rather
than a download.

1. Open `admin.html` and press **+ Add a post**. It fills in today's date and a
   file name for you.
2. Give it a title, a one-line description, and write the piece in **The
   writing** box. Blank line between paragraphs. `## ` at the start of a line
   makes a heading, `> ` makes a quote, and `[ar] ` or `[en] ` at the start of a
   block switches script for that block — for an Arabic citation inside an Urdu
   piece.
3. **Save changes** now gives you three things: `content.js`, `sitemap.xml`, and
   the post's own page. Create that page on GitHub with **Add file → Create new
   file**, typing the full path shown, e.g. `posts/my-post.html`.

To edit a post later, open `admin.html` **over the web** (not by double-clicking
the file) — it reads the existing page back into the box. Opened from the file
system the browser will not let it read the file, and it says so rather than
quietly emptying your post.

## Adding a fatwa

Same shape, added to the `rulings` list at the bottom of `content.js`. Fatawa get
their own detail pages too, so `files` works there as well.

## Adding a category

Copy a whole category block in `content.js` and give it a new English `id`. It
appears in the category bar automatically. To reorder categories, move the blocks
— the page follows the file.

## The editor's passphrase

`admin.html` asks for a passphrase. It is **maktaba** — change it. The word is
compared against a SHA-256 digest at the top of `admin.js`, and the comment
there gives the one line to run in the browser console to make a new one.

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
