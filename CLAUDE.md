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
                  Each ships as .woff2 with the .ttf behind it as a fallback.
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

**The homepage's words live in `content.js`, and `index.html` is a
rendering of them.** The hero, the author's introduction and the whole
collapsible bio, the header links, the contact lines and the footer
credit are `hero`, `about`, `nav`, `contact` and `footer` in `content.js`.
`index.html` carries them between marker comments — `<!-- editor:about -->`
and its closing half — and a publish replaces what is between each pair
and touches nothing else in the file. Editing between the markers by hand
is editing a generated file: the next publish overwrites it.

Drawing them with a script at load would have been three lines and is the
wrong answer. The introduction is the most-read prose about the author on
the site, and a crawler, a WhatsApp preview and a reader with JavaScript
off never run one — the library can afford to be JS-rendered because
`sitemap.xml` and every work's own page carry it; the introduction has no
such second copy.

`buildIndex` in `admin.js` does the splice, and it is all-or-nothing: a
missing marker writes **no** region and stops the publish with a sentence
naming it. `index.html` is the front door; a half-generated one is worse
than an unchanged one. The editor reads the committed page back over
http, the same way it reads a post's writing back, so this needs the
editor opened over http and not from the file system.

None of these strings says which script it is in. `langAttrs` asks
`scriptOf` — the same function the writing box asks of a typed line — and
writes `lang` and `dir` out itself. It never writes a **class**: `.urdu`
carries a font size and `text-align: right` along with the font, and the
hero's Urdu line has a size of its own and no alignment of its own, so
the class would send it to the far edge of its column. Which classes an
element wears is written out element by element in the builders.

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

**A record carries the day it was last edited, and the editor stamps
it.** `updated` is written by `touch(record)` in `admin.js`, from a
listener delegated on the row — so a field added later cannot be
forgotten — and it is what the *Recently added and updated* strip is
ordered by, newest first, `updated || date`. Not stamped at publish
time: a publish rewrites every page in the library whether or not
anything about it changed, which is deliberate, so stamping there would
mark all twenty-three as new every time and the strip would say nothing.
Moving a record up the page or into another category does **not** stamp
it — that changes where it is read, not what it says.

The date is `today()`, built from local date parts. `toISOString()` is
UTC and Karachi is five hours ahead of it, so a post written before five
in the morning was stamped with yesterday. `site.formatDate` has never
had that fault — it parses `"2026-08-04"` with a regex and never builds
a `Date` — and `recordMeta` falls back to `updated` when a record has no
`date` of its own, so the row, the card and the page all say the same
thing from one function.

**The recently-added strip is in the file, not drawn by a script.** It is
generated into `index.html` by `indexRecent` at publish time like every
other marked region, which is why `test/homepage.mjs` can turn
JavaScript off and still find the cards with their titles in them —
where the library below it renders nothing at all. Every part of a card
comes from the helper the library row uses for the same part —
`titleMarkup`, `kindMarkup`, `metaMarkup`, `categoryIcon` — so a card
cannot end up saying something different from the row it mirrors.

`rail()` in `script.js` is the category strip's own scrolling behaviour,
extracted and used twice. It scrolls the *track*, never
`scrollIntoView` — same reason as the rail that marks your place.

The cards rise as they arrive, and `card-rise` carries both the movement
**and** the state it moves from. Putting `opacity: 0` on `.recent-card`
itself was tried and the tests caught it: no JavaScript, no
`IntersectionObserver`, or `prefers-reduced-motion` must each leave the
cards exactly where they already are. Same argument as the icons.

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

**A share card is sized for a thumbnail, not for the 1200×630 it is drawn
at.** WhatsApp renders the preview at the width of the bubble — about
265px on a phone, so roughly **0.22×**. Every size in `drawCard` has to be
divided by five before you judge it. The card once set its title at 62px,
which arrives as 13.7px against the 19px floor the site keeps for Urdu
everywhere else, and its kind label at 13px, which arrives as 2.9px.
The card is set in the site's own faces: a title in **Aslam**
(`cardTitleFont`), the same face `.record-title.urdu` uses and a Naskh,
whose counters survive the shrink where Nastaliq's hairlines close up; the
kind label in **Mehr** (`cardLabelFont`), the same Nastaliq `.work-kind`
uses. Both are self-hosted, so `ensureCardFonts` names them and the Worker
— which proxies every path through to the public site — serves them.
Two traps: DM Sans holds no Arabic at all, so a kind label handed to it is
drawn by whatever the system substitutes; and Aslam's one-pixel space
needs `--space-urdu-heading` put back, which on a canvas means placing the
words one at a time (`fillSpaced`), since `ctx.wordSpacing` is not in
every browser the editor gets opened in. The title size is **chosen by
measuring**, not from a character count — a count says nothing across
three scripts.

**A kind is shown in the language the record reads in.** Every `kind` in
`content.js` is written in Urdu, because Urdu is what the library is
catalogued in — so an English essay wore `مضمون` on its row, on its page,
on its share card, and the caption dropped the label rather than
translate it. `site.recordKind` turns it round through `KIND_IN_ENGLISH`
in `common.js`, a small closed table rather than a second field on every
entry; an unmapped kind falls through as itself, which is the right way
to fail. It carries the fatwa default (`فتویٰ` / `Fatwa`) too, so the
row, the page and the card cannot disagree about what an untitled ruling
is called — they each used to keep their own copy of that fallback and
one of them was missing it. `site.kindMarkup` writes the element, and
picks the font, `lang`, `dir` and the `urdu`/`latin` class off the script
the word actually came out in. Translations are renderings, not the
author's own English: change them in that one table.

**A description shown to a reader follows the piece, not the site.**
`og:description` in `buildPost` and `buildWork`, and `shareCaption` in
`common.js`, all take `descriptionUr` first for an Urdu or Arabic record
and `description` first otherwise. An Urdu article carried an English
sentence under its Urdu title for months because the meta tags read
`record.description` and nothing else.

**Icons are drawings, and they live in one sprite.** `ICONS` in
`common.js` holds eleven line drawings on a 24×24 grid — no fill, stroke in
`currentColor` at 1.5, round caps. `injectSprite` writes them into the page
once as hidden `<symbol>`s and `site.icon(name)` emits ~55 bytes of `<use>`
wherever one is wanted, so the whole set costs about 1.3KB and **no extra
request**. Do not reach for an icon font or a `.svg` per icon: both are
requests, and both are dependencies this site does not take.
`currentColor` is what makes one drawing serve the cream and the dark
fatawa panel alike — which is also why `.rulings .category-icon` has to
name `--gold-on-dark`. A category gets its drawing from `CATEGORY_ICON`,
keyed on the category's `id`, the same closed-table pattern as
`KIND_IN_ENGLISH`; a mark written by hand into `index.html` asks for one
with `data-icon`. Every icon is decorative — it sits beside a word that
already says the same thing — so all of them carry `aria-hidden`.
`→` and `+` are deliberately still characters: `+` is rotated into `×` by
CSS, and `→` reads as punctuation inside a sentence.

**A published page keeps the marks it was written with.** Nothing rendered
today writes a `.glyph` any more, but every work and post page committed
before the icons still carries the old `↗`/`↓` characters in its own HTML,
and will until the editor writes that page again. The rule stays in
`styles.css` for exactly that reason.

**Motion is allowed on a decoration, never on content.** Two things move
as you scroll, and both are built so that not moving costs nothing. The
category icons draw themselves on — `pathLength="1"` on every path in
`iconSprite` normalises each stroke, so one dash figure suits them all,
and `stroke-dasharray`/`stroke-dashoffset` being *inherited* is the only
reason they reach inside `<use>`'s shadow tree at all. Crucially the dash
lives on `.icon-draw`, a class `drawIconsOnEntry` adds — never on `.icon`
— so no JavaScript, no `IntersectionObserver`, or `prefers-reduced-motion`
all leave the icon simply drawn. Nothing on this site may start invisible
waiting for a script to reveal it. `test/homepage.mjs` checks all three
cases, because that is the whole argument.

**The rail marks the section you are in, and moves only itself.**
`markPlace` in `script.js` sets `aria-current` on the matching pill —
the attribute, not a class of our own, so a screen reader is told too.
It reads live geometry on every scroll rather than remembering tops from
the observer: a stored top goes stale immediately, and sorting them
picked a section long scrolled past. It also must not use
`scrollIntoView` to bring the pill into the strip — that scrolls every
scrollable ancestor, the document included, so the rail dragged the page
back to whatever it had just marked and a reader could not get past the
first category. It scrolls `nav` itself. Both faults are guarded.

**Weight is a design decision, and the test measures it.** The homepage was
961KB: a decorative 518KB PNG inside the collapsed bio, and two fonts
shipped as TTF. It is ~320KB now — the fonts are woff2 (58% smaller,
measured), and the calligraphy is written at 840px and 64 colours, which is
17.6KB against 517.8KB and costs a mean shift of 0.55/255 on flat ink.
`test/homepage.mjs` reads all three off the filesystem, so none of them can
creep back. The full-resolution `*-source.*` files are **kept**: nothing
serves them, they cost a visitor nothing, and after the downsample above
they are the only originals left.

**Space between sections is a ratio, not a number.** `--block` sets the
vertical padding on the five full-bleed sections and nothing else reads
it. It was `clamp(56px, 8vw, 118px)`, which gave 236–283px between
sections at 1440 — 15 to 18 body lines — against 30px between the
category cards inside the library. Nine to one is what made the page read
as separate slabs; three to five is the usual range. `6.5vw`/`96px` brings
a desktop to 209–240px and leaves a phone untouched, where the 56px floor
already wins. Judge any change to it against the 30px card gap, not on
its own.

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

**The editor is deployed by pushing it, and an open tab is not.** A tab
left open across a deploy keeps running the `admin.js` it loaded, and an
old editor rebuilds every page the way it used to be — which is exactly
what is already committed. The Worker is handed the whole library on
every publish and commits only what differs, so it finds nothing, commits
nothing, and answers with no sha. That answer used to be shown in green,
so an edit that never left the browser read as an edit that went out; it
happened, to a post, and the author had no way to know. Two things guard
it now. `dirty` is read before it is cleared, so *nothing committed* is
calm when nothing was edited and a plain failure when something was.
And `EDITOR_VERSION` beside `WORKER_EXPECTS` is checked on load the same
way — `admin.js` fetched again past the cache, the constant read out of
the text — so the tab is told it is old *before* a publish rather than
after. Bump `EDITOR_VERSION` whenever `admin.js` changes in a way a
publish depends on. Both notices land in `#worker-status`, and both
append rather than write, since a tab can be old *and* pointed at an old
Worker and neither may erase the other. A check that cannot run says
nothing at all — opened from the file system there is nothing to fetch,
and that is not a fault.

**A change to the Worker's writable list is a change to what the editor
may touch.** `WRITABLE` in `worker/src/index.js` is the only thing between
"the editor may update the author's introduction" and "the editor may
replace any page it likes". `index.html` is on it; `404.html`,
`about/index.html` and `index.htm` are not, and `worker/test.mjs` checks
each of those is still refused.

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
