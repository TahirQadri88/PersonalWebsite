# My Works — site guide

A plain static website. No build step, no framework, no server code. Double-click
`index.html` to open it locally; upload the folder to publish it.

## The files

| File | What it is |
| --- | --- |
| `content.js` | **Everything you edit.** All works, categories, fatawa, links |
| `files/` | Put your PDFs and documents here |
| `index.html` | The homepage |
| `work.html` | One page that renders any single work or fatwa |
| `common.js` · `script.js` · `work.js` | The code that builds the pages from `content.js` |
| `styles.css` | All the design, organised into numbered sections |
| `404.html` · `robots.txt` · `sitemap.xml` · `share-card.png` · `CNAME` | Supporting files |
| `files/images/` | The seal and the calligraphed name — the site's own artwork, not works |

## Adding a work

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

## Adding a fatwa

Same shape, added to the `rulings` list at the bottom of `content.js`. Fatawa get
their own detail pages too, so `files` works there as well.

## Adding a category

Copy a whole category block in `content.js` and give it a new English `id`. It
appears in the category bar automatically. To reorder categories, move the blocks
— the page follows the file.

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
