# Scholarly Works and Research — project notes

Personal scholarly library for **Abul Laith Muhammad Tahir Qadri An-Naeemi**
(أبو اللّیث محمد طاہر القادری النّعیمی), teacher of dars-e-niẓāmī at Jamia tun Noor,
Karachi. Publishes his booklets, edited Ḥanafī manuscripts, charts, articles and
fatāwā in Urdu, Arabic and English.

Replaces an older Notion/Super site (`tahirqadri.super.site`) and complements a
Google Site (`sites.google.com/view/tahirqadri88`).

## Stack

Plain static HTML, CSS and vanilla JS. **No build step, no framework, no
dependencies, no server code.** Opening `index.html` from the file system must
keep working — do not introduce anything that requires bundling, `npm run`, or a
dev server. Deployed on GitHub Pages.

## Layout

```
content.js     the only file that holds content — works, categories, fatawa
files/         PDFs and documents
index.html     homepage
work.html      one template rendering any single work or fatwa
common.js      shared helpers (escaping, script/direction, file links, lookup)
script.js      homepage rendering, category nav, search
work.js        detail page rendering
admin.html     form editor — publishes to GitHub, or hands you the files
admin.css admin.js   its styles and logic, loaded by nothing else
posts/         one HTML file per post — the writing is the page, not a download
styles.css     all design, in 12 numbered sections
404.html robots.txt sitemap.xml share-card.png CNAME
files/images/   the seal used as favicon and header mark, and the calligraphed name
```

## Rules that matter

**One source of truth.** All content lives in `content.js`. Never hardcode a work
into `index.html` — an earlier version did, and a work went missing because the
two lists drifted.

**IDs are permanent.** Each work and fatwa has an explicit `id` used in
`work.html?work=<id>`. Links get shared with students. Never regenerate IDs from
array position, and never rename an existing one.

**Typography is not cosmetic.** Urdu must render in Nastaleeq (`Noto Nastaliq
Urdu`) and Arabic in Naskh (`Amiri`). Set `language: "ur" | "ar" | "en"` on every
entry; the code derives font, `dir` and size from it. Nastaliq needs generous
line-height (~2.0) and vertical room for descenders — check any spacing change
against a long Urdu title.

**A post is a page, not a download.** Entries in the `posts` category carry
`page` and `date` instead of `files`, and their words live in the HTML file, not
in `content.js`. `admin.html` writes that file; editing one needs the editor
opened over http so it can read the page back.

**Missing files are a normal state.** A work with no `files` array renders as
"Not published here yet". Do not delete such entries or invent placeholder URLs.

**Escape user content.** All strings from `content.js` go through
`site.escapeHtml` before reaching `innerHTML`.

**Colour contrast.** `--gold-on-light` and `--gold-on-dark` are two different
values for a reason. Do not collapse them into one.

## Working on this

- Preview: open `index.html` directly, or `python -m http.server 4173`.
- Check Urdu at mobile width (~380px) after any layout change — that is where
  Nastaliq breaks first.
- Keep commits small and in plain language; the author reads the history.

**Adding a work means editing sitemap.xml too.** It is the one file outside
`content.js` that names a work, one `<url>` per id. Search engines find the
detail pages through it — the homepage list is built by JS, so a crawler that
does not run scripts sees nothing there. Miss the sitemap line and the work is
published but unfindable.

## Outstanding

- Every work and fatwa has its files. Nothing is owed.
- The `posts` category is empty and hidden. The machinery is all there —
  `page`/`date` entries, the editor's writing box, the page generator — and the
  author will start writing when the way in is easier than it is now. The plan
  is a GitHub Action: commit one Markdown file from the phone app, and it builds
  the page, the entry and the sitemap line.
- The address is `https://tahirqadri.com.pk/` — a PKNIC domain on Cloudflare
  DNS, served by GitHub Pages. It is written in five places: `site.baseUrl` in
  `content.js`, `robots.txt`, `sitemap.xml`, the canonical and sharing tags in
  `index.html`, and the `CNAME` file. They all change together.
