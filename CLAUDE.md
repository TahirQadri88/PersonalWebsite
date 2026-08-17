# Scholarly Works and Research — project notes

Personal scholarly library for **Abul Laith Muhammad Tahir Qadri An-Naeemi**
(أبو اللّیث محمد طاہر القادری النّعیمی), teacher of dars-e-niẓāmī at Jamia tun Noor,
Karachi. Publishes his booklets, edited Ḥanafī manuscripts, charts, articles and
fatāwā in Urdu, Arabic and English.

Replaces an older Notion/Super site (`tahirqadri.super.site`) and complements a
Google Site (`sites.google.com/view/tahirqadri88`).

## Stack

Plain static HTML, CSS and vanilla JS. **No build step, no framework, no
dependencies.** Opening `index.html` from the file system must keep working —
do not introduce anything that requires bundling, `npm run`, or a dev server.
Deployed on GitHub Pages.

The one exception is `worker/`, and it is not part of the site. It is a
Cloudflare Worker that exists so the editor can publish without a GitHub token
sitting on a phone. Nothing the site serves depends on it; delete it and every
page still works, and `admin.html` falls back to asking for a token. Do not
let anything from `worker/` become a dependency of the pages.

## Layout

```
content.js     the only file that holds content — works, categories, fatawa
files/         PDFs and documents
index.html     homepage
work.html      an old work.html?work=<id> link — redirects to works/, or renders
                 the record itself when that page does not exist yet
common.js      shared helpers (escaping, script/direction, file links, lookup)
script.js      homepage rendering, category nav, search
work.js        the work.html fallback above — nothing else uses it
admin.html     form editor — publishes to GitHub, or hands you the files
admin.css admin.js   its styles and logic, loaded by nothing else
worker/        the editor's backend — Cloudflare Worker, deployed separately
test/          drives a browser over admin.html and over the homepage —
                 editor.mjs after touching the editor, homepage.mjs after
                 touching script.js, common.js or the library's CSS
posts/         one HTML file per post — the writing is the page, not a download
works/         one HTML file per work and fatwa — written by admin.html, same as posts/
styles.css     all design, in 13 numbered sections
404.html robots.txt sitemap.xml share-card.png CNAME
files/images/   the seal used as favicon and header mark, and the calligraphed name
files/cards/    one link-preview picture per post/work/fatwa, drawn by admin.js
files/fonts/    Mehr Nastaliq Web (CC BY-SA, credited in the footer) and Aslam
                  (no open license found — used anyway; see its NOTICE.txt).
                  Neither is on Google's CDN, so each gets its own @font-face
                  in styles.css instead of a <link> in every page's <head>.
```

## Rules that matter

**One source of truth.** All content lives in `content.js`. Never hardcode a work
into `index.html` — an earlier version did, and a work went missing because the
two lists drifted.

**IDs are permanent.** Each work and fatwa has an explicit `id` and its own
page, `works/<id>.html`. Links get shared with students. Never regenerate IDs
from array position, and never rename an existing one.

**Typography is not cosmetic.** Urdu must render in Nastaleeq and Arabic in
Naskh (`Amiri`). Set `language: "ur" | "ar" | "en"` on every entry; the code
derives font, `dir` and size from it. Nastaliq needs generous line-height
(~2.0) and vertical room for descenders — check any spacing change against a
long Urdu title. Urdu body text is Mehr Nastaliq Web (`--font-urdu`); a
record's own title — and an in-prose subheading inside a post — is Aslam
(`--font-urdu-heading`) instead, a bold Naskh face, since Nastaliq mostly has
no bold cut of its own to set a heading apart from the body under it. Both
fall back to Noto Nastaliq Urdu, already loaded regardless, if their own file
is ever slow or unreachable. See `.record-title` in common.js — that's the
class that carries the heading font, on every title the site renders,
wherever it's shown.

**A line can be marked inside, not only as a whole.** Bold, italic,
underline and two size steps apply to the words picked out. They are kept
in the page itself — `<b>`, `<i>`, `<u>`, `span.text-small`,
`span.text-large` — since a post's own HTML file is the store. Between
reading that file and writing it again the text passes through `bodies`,
which is memory and never a file, so the marks travel there as two
characters no keyboard produces (`\u0002` opens and names a run,
`\u0003` closes it) and nothing needs escaping. The sizes are steps in
`em`, never pixels: "one larger" has to hold whether the line is Nastaliq
at 21px, Naskh at 23 or English at 15. Bold inside Urdu is Mehr with the
weight the browser synthesises: Mehr has exactly one weight, its upstream
package ships one file and it is not variable, so there is no bold of its
own. Noto Nastaliq Urdu's real 700 was tried and measured against it —
45% wider and 40% taller at the same size, because Noto's letterforms run
larger at the same declared size, which is the same reason the body size
here was tuned up for Mehr. A bold word came out heavier *and* bigger,
which breaks the line instead of emphasising part of it. The synthesised
one measures 0% wider. Less contrast, and right: emphasis inside a
sentence must not resize the sentence.

**A post is a page, not a download.** Entries in the `posts` category carry
`page` and `date` instead of `files`, and their words live in the HTML file, not
in `content.js`. `admin.html` writes that file; editing one needs the editor
opened over http so it can read the page back.

**A work or a fatwa also has its own page.** `works/<id>.html`, written by
`buildWork` in `admin.js` and regenerated in full on every publish — nothing
about one lives anywhere but `content.js`, so there is no "has it changed"
question the way there is for a post's free-text body. This exists because a
crawler — WhatsApp, Facebook, Telegram — reads only the file it fetches and
never runs its script; before this, every work and fatwa shared the same
generic preview, whichever one the link actually named, because the real
title and description were filled in by `work.js` after the page had already
loaded. `work.html?work=<id>` still answers an old link — it redirects to the
real page when one exists, and renders the record itself, exactly as it used
to, when a record has been added straight into `content.js` and not yet
published through the editor. Relative file paths inside a work page climb
back out with `../`, since the page now lives one folder down; an offsite
link (Google Drive) is left alone. See `site.isOffsite`.

**Missing files are a normal state.** A work with no `files` array renders as
"Not published here yet". Do not delete such entries or invent placeholder URLs.

**Escape user content.** All strings from `content.js` go through
`site.escapeHtml` before reaching `innerHTML`.

**Share and Print are mounted, not written.** `common.js` adds them to any
page whose address matches a record's own page — `site.ownPage`, `record.page`
for a post or `works/<id>.html` otherwise — finding the mount point by
`#post-body` for a post and `#work-page-files` for a work. Nothing is baked
into the generated files themselves, so a change here reaches every post and
work already written without regenerating one of them. Print only ever
appears on a post — `record.page` is the same field that says a page holds
the whole piece rather than a download. The caption reads kind, title, byline
("by" / "از"), a blank line, the description, in the piece's own script —
`shareCaption` in `common.js`. `navigator.share` gets it without the link,
since every sheet appends one; a real failure (not the reader cancelling)
falls back to copying it instead of doing nothing. Printing is section 13 of
`styles.css` and needs no script.

**A row says what it would open, and nothing new was added to say it.**
The line under a title in the library — `PDF · Urdu`, `6 PDFs · Urdu`,
`Reads here · English · 4 August 2026` — is `site.recordMeta` in
`common.js`, derived entirely from what an entry already holds: `files[]`
gives the count and the format, the file's own label gives its language
("Urdu PDF", "English PDF"), `page` says it reads here, `date` gives the
date. No entry needs editing for its row to start saying this, and a work
still waiting for its document says nothing rather than naming a language
it cannot yet be read in. The language named is the **file's**, not the
title's: an Urdu-titled article whose only file is an English PDF says
English, because the line describes what opening it would get you. It is
set in Latin whatever the piece is, since it is 12px, uppercase and
tracked — Nastaliq at that size cannot be read.

**A label written by hand into `index.html` needs `align-left` too.**
`.urdu` sets `text-align: right`, and a section label inherits it, so above
an English heading the label lands at the far edge of its block. `work.js`
and `admin.js` add `align-left` for the pages they generate. The labels
typed into `index.html` do not get it for free — three of them went years
without it, up to 1180px from the words they named. `test/homepage.mjs`
measures every Urdu label on the page now, so a fourth cannot happen
quietly.

**Colour contrast.** `--gold-on-light` and `--gold-on-dark` are two different
values for a reason. Do not collapse them into one.

## Working on this

- Preview: open `index.html` directly, or `python -m http.server 4173`.
- Check Urdu at mobile width (~380px) after any layout change — that is where
  Nastaliq breaks first.
- Keep commits small and in plain language; the author reads the history.

**Touching `script.js`, `common.js` or the library's CSS means running
`node test/homepage.mjs`.** It measures where things landed on the rendered
page, because the four faults it guards against were all geometry — a grid
whose column count orphaned a card, a label sent to the far edge of its
block by a rule written for something else, a row with its title on one
side and the label naming it on the other, a category named twice at
opposite ends of its head. Not one of them changed a string or would fail
a linter, and looking at the source could not see any of them.

**Touching `admin.js` means running `node test/editor.mjs`.** It types into
the writing box, presses the toolbar, exports a post and reads it back, and
counts a publish against the Worker's own limits. It exists because looking
at the editor was the only check there was for months, and looking at it
cannot see a Script button that clears a block's language instead of setting
it, a heading ignoring the script marked on it, or a publish grown past what
the Worker will take — all three of which shipped, and all three of which
the author found mid-sentence while writing. `test/README.md` says more.

**A change to `worker/` is not deployed by pushing it.** The Worker is put
up by hand in Cloudflare, separately from the site, so it can sit weeks
behind the repository with nothing to say so — it did, and publishing broke.
Bump `WORKER_VERSION` in `worker/src/index.js` and `WORKER_EXPECTS` in
`admin.js` together whenever the Worker changes in a way the editor depends
on; the editor asks `/version` on load and says plainly when the two have
parted. Then say clearly, in the reply, that the Worker still needs
deploying — pasting the file into Cloudflare → Edit code → Deploy.

**Adding a work by hand means editing sitemap.xml too, and its page is missing
until admin.html writes it.** `sitemap.xml` is the one file outside
`content.js` that names a work, one `<url>` per id — the homepage list is
built by JS, so a crawler that does not run scripts sees nothing there. Miss
the sitemap line and the work is published but unfindable. `admin.html`
writes `content.js`, `sitemap.xml` and every work's own page together on
every publish, so this only matters when content.js is hand-edited outside
the editor.

## Outstanding

- Every work and fatwa has its files. Nothing is owed.
- Every work and fatwa has its own page now, `works/<id>.html`, so a shared
  link shows the right title and description instead of the one generic
  preview every one of them used to share. `work.html?work=<id>` still
  resolves an old link and still renders a record that has been added by
  hand and not yet published — see the rule above and `work.js`.
- The picture that comes with a shared link is per-record too now, not the
  one static `share-card.png` every page used to point at. `admin.js` draws
  it on a canvas at publish time — title, kind and byline, in the record's
  own script and font — and writes it to `files/cards/<id>.jpg`; `buildPost`
  and `buildWork` point `og:image` there. Regenerated in full on every
  publish, same as a work's own page, so there is no "does this still match
  the title" question to answer by hand.
- Publishing from the editor goes through `worker/` when it is opened at
  `admin.tahirqadri.com.pk`. The Worker checks who is asking — a Firebase
  sign-in or a Cloudflare Access one, whichever is configured — and holds the
  GitHub token itself, so no device ever does. Opened any other way the editor
  falls back to asking for a token, and `Files…` works everywhere.
  `worker/README.md` has the one-time setup.
- The `posts` category holds three pieces now. Two of them are the same essay
  in English and Urdu — separate entries with separate ids, not one entry with
  two files, because each is a page to be read rather than a download to be
  picked. Nothing links one to the other yet; the block format has no way to
  write a link, and adding one is the next thing that category needs.
- Writing a post still means opening the editor. The plan is a GitHub Action:
  commit one Markdown file from the phone app, and it builds the page, the
  entry and the sitemap line.
- The address is `https://tahirqadri.com.pk/` — a PKNIC domain on Cloudflare
  DNS, served by GitHub Pages. It is written in five places: `site.baseUrl` in
  `content.js`, `robots.txt`, `sitemap.xml`, the canonical and sharing tags in
  `index.html`, and the `CNAME` file. They all change together.
