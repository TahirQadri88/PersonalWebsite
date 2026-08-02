# My Works — project notes

Personal scholarly library for **Abul Laith Muhammad Tahir Qadri Al-Naeemi**
(أبو اللّیث محمد طاہر القادری النّعیمی), teacher of Dars-e-Nizami at Jamia tun Noor,
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
styles.css     all design, in 12 numbered sections
404.html favicon.svg robots.txt sitemap.xml share-card.png
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

## Outstanding

- Ten works and all five fatāwā have no file attached yet. Adding one is a
  `files: [{ label, url }]` line — see README.md.
- `robots.txt`, `sitemap.xml` and `site.baseUrl` in `content.js` still say
  `example.com`; replace once the domain is decided.
- Categories from the Google Site not yet represented: Presentations, Notes for
  Students, Apps.
- Verify the name of the introduction's author: the source PDF reads
  **علّامہ سیّد محمد منیر شاہ**.
