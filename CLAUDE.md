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
test/          the browser suites — see "The suites" under Working on this
posts/         one HTML file per post — the writing is the page, not a download
works/         one HTML file per work and fatwa — written by admin.html
apps/          one HTML file per app — built from fields, not written
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

**Missing files are a normal state.** A work with no `files` array renders as
"Not published here yet". Do not delete such entries or invent placeholder URLs.

**Escape user content.** All strings from `content.js` go through
`site.escapeHtml` before reaching `innerHTML`.

**Typography is not cosmetic.** Urdu must render in Nastaleeq and Arabic in
Naskh (`Amiri`). Set `language: "ur" | "ar" | "en"` on every entry; the code
derives font, `dir` and size from it. Nastaliq needs generous line-height
(~2.0) and vertical room for descenders — check any spacing change against a
long Urdu title. Urdu body text is Mehr Nastaliq Web (`--font-urdu`); a
record's own title — and an in-prose subheading inside a post — is Aslam
(`--font-urdu-heading`) instead, a bold Naskh face, since Nastaliq mostly has
no bold cut of its own to set a heading apart from the body under it. Both
fall back to Noto Nastaliq Urdu, already loaded regardless, if their own file
is ever slow or unreachable. `.record-title` in `common.js` is the class that
carries the heading font, on every title the site renders, wherever shown.

**A line can be marked inside, not only as a whole.** Bold, italic,
underline and two size steps apply to the words picked out. They are kept
in the page itself — `<b>`, `<i>`, `<u>`, `span.text-small`,
`span.text-large` — since a post's own HTML file is the store. Between
reading that file and writing it again the text passes through `bodies`,
which is memory and never a file, so the marks travel there as two
characters no keyboard produces (U+0002 opens and names a run, U+0003
closes it) and nothing needs escaping.

The sizes are steps in `em`, never pixels: "one larger" has to hold
whether the line is Nastaliq at 21px, Naskh at 23 or English at 15.

Bold inside Urdu is Mehr with the weight the browser synthesises. Mehr
has exactly one weight — one file upstream, not variable. Noto Nastaliq
Urdu's real 700 was tried and measured against it: **45% wider and 40%
taller** at the same size, because Noto's letterforms run larger at the
same declared size (the same reason the body size here was tuned up for
Mehr). A bold word came out heavier *and* bigger, which breaks the line
instead of emphasising part of it. The synthesised one measures **0%
wider**. Less contrast, and right: emphasis inside a sentence must not
resize the sentence.

**`text-wrap: balance` on a heading stays, and a measurement said
otherwise once.** `h1, h2, h3` set it, and `text-wrap` inherits, so an
in-prose subheading gets it too. On a heading that is a whole sentence —
the shares post has three over 96 characters — it leaves the first line
short: one measured `200, 175` in a 328px column, 128px unused, because
the words were moved down to even the two lines. That looks wrong and was
reported as wrong.

`pretty` and plain filling were both tried and both look **worse**. They
strand the tail of the sentence on a line of its own — `موقوف نہیں۔` under
a full line, `شرعی ”ضرورت“ نہیں۔` under two. Two even lines beat one full
line and a stub.

The lesson is the measurement, not the setting. First-line fill was the
wrong quantity: by that number `pretty` won, and rendering the three side
by side at 390px showed within seconds that it lost. **A typographic
judgement needs looking at, not only measuring** — screenshot the element
and read it. Line count, worth knowing: identical under all three, so
balance was only ever redistributing.

The under-filled first line is real and `text-wrap` cannot fix it — it
is the heading being too long for the column at 20px. What fixes it is
the text fitting: under 620px an in-prose Urdu heading is 17px and h2
20px, which is where the shortest of the three comes back onto one line
(it needs 381px at 20px against a 328px column). Three headings on that
post lost a line outright. The heading goes *under* the 21px body rather
than over it, which it already did at 20px — what sets one apart here is
bold Aslam against Mehr, not size.

**Mehr and Aslam carry Latin, and Mehr's had to be taken away.** An
English term inside an Urdu sentence — `board of directors`, `legal
entity`, `screening criteria`, and this library is full of them — was
being drawn by Mehr itself at the Urdu's own 21px. Measured: `HHHH` in
Mehr is 60px against Arial's 61, while three letters of Mehr are 12px.
Beside Nastaliq that is enormous, and in a printed capture of the shares
article the English is the first thing the eye meets in every paragraph
holding any.

`font-size-adjust` cannot fix it — measured, it scales Mehr by the same
proportion, because Mehr reports an x-height. So Mehr's `@font-face`
carries a `unicode-range` that withholds **Latin letters only**, and they
fall through to `Latin in Urdu`: the same system face at `size-adjust:
71%`, which is the site's own ratio (a block of English in an Urdu piece
is 15px against the body's 21px). Digits, brackets and punctuation stay
with Mehr deliberately — they are shared with the Urdu around them, and a
bracket in an Urdu clause set at 71% would be a new fault. `local()`
throughout, so a device with none of the named faces simply renders as
before. Aslam still has its Latin; nothing has asked for it yet.

**A class the editor writes must outrank the stylesheet's default, or
the button is a lie — except where the class is the context leaking.** Three rules were quietly beating the writing
box's alignment classes, all found by measuring one post:
`.post-body.urdu p:not(.latin)` (0,3,1) justified every Urdu paragraph
whatever was chosen; `.post-body .latin` (0,2,0) pinned every English
block left, so `(مصادر و مراجع )` centred and `References:` beside it did
not; and `align-left` read literally rags the edge Urdu *begins* from, so
in a post body it means `own-edge` — the block at the column's left, the
words on their own reading edge. `admin.js` writes an alignment class
only when someone picks one (`if (b.align)`), so every one in a file is a
decision. Each default now excuses `.align-left`/`-center`/`-right`/
`-justify` by name, which keeps the default visible in the selector that
sets it.

One exception, learned by breaking it: a Latin block does **not** get
`align-right`. All fourteen in that post carry it, and all fourteen are
English bibliography entries; honouring it set a numbered reference list
flush right and ragged down the left, a state the site had never been in.
An English line inside an Urdu piece is surrounded by right-set text, so
`right` is the context leaking into the block rather than a decision
about it. Centre and justify are still honoured — `References:` beside
`(مصادر و مراجع )` was genuinely not being centred. The flush group in `test/homepage.mjs` measures post bodies for
this reason — it used to exempt them whole, and all three faults lived in
that exemption.

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

**Urdu in a left-reading column.** This one rule has been broken eight
times, so it is stated once here rather than told as eight stories.

`.urdu` carries `text-align: right` *and* a font size. An Urdu element
also carries `dir="rtl"`, which turns even an inherited `text-align:
start` into **right** — so a line of Urdu inside a left-reading column
goes to the far edge of its own box with no rule saying so anywhere.
The four consequences:

- Never put `.urdu` on something that has a size or an alignment of its
  own; it brings both.
- Anything Urdu in a left-reading column needs `align-left`, even where
  nothing sets alignment at all. That is what hid in the hero: its Urdu
  line began 234px in while the eyebrow, the headline and the paragraph
  above it all began at the column edge. A label typed by hand into
  `index.html` is the same case and does not get it for free — three of
  them went years without it, up to 1180px from the words they named.
- **A paragraph needs `own-edge` beside it, and `align-left` alone is
  wrong for one.** `align-left` pins every line at the left, which means
  every line *begins* — on the right, where the script begins — in a
  different place. That is a paragraph set ragged-left, and it is what
  the Zakat app's description was doing: `[192→808], [192→828],
  [192→678]`. `.own-edge.urdu` shrinks the box to its own longest line
  (`fit-content`) and sets the words right inside it, so the block starts
  at the column edge and the words fall back from it as Urdu should. One
  line renders identically to `align-left`, which is why it is safe to
  write anywhere `align-left` goes on Urdu.

  **A paragraph takes it; a label does not.** It went on ten call sites
  first, and measuring found only three where anything wrapped: the two
  descriptions, `.app-about` and the app's tagline. A kind, a category
  name and a record's title are drawn short by construction and have
  never taken a second line, so there `align-left` alone is the whole
  answer and `own-edge` is a `width: fit-content` nobody asked for.
  Author-typed running text — the hero's Urdu line, the app's call to
  action — keeps it, because those can grow.

  Decide per **string**, not per record. A panel holds an Urdu
  description and an English one; `.own-edge` is scoped to
  `.urdu`/`.arabic` and cannot match Latin, so writing it on the English
  half put a class with no rule behind it on fourteen paragraphs.
  `prose()` in `script.js` and the `.app-about` loop in `admin.js` both
  ask `site.direction` of the string they are about to write.

  Where it is written it is written **beside** `align-left`, never
  instead: `.own-edge.urdu` (0,2,0) outbids `.align-left` (0,1,0) only
  when the content really is Urdu. `.align-left` itself could not simply
  be redefined — the writing box authors it onto a post's blocks as the
  author's own choice, and that must stand.
- Do not set `text-align: right` on an Urdu selector "for safety". It
  buys nothing — the direction already does it — and it outranks
  `align-left`, which is how the two descriptions in an open library row
  ended up at opposite edges of one panel.

Two limits on all of the above. **Urdu among Urdu keeps its own edge** —
a block of Urdu surrounded by Urdu is right-set because that is how the
script sets; it is only when the two scripts stack in one column that
they have an edge to share. And **a box shrunk to its own longest line
is *placed*, not aligned**: a work's page does this deliberately,
`fit-content` plus `margin-inline-start: auto`, so the box ends at the
page's margin while a long run of English still reads from its own left
— easier to read than it is tidy. Section 11 of `styles.css`.

Two groups in `test/homepage.mjs` hold it. *Urdu stacked against
english* measures 89 pairs across four pages at two widths — where each
block **starts**, and it found two of these faults itself. *Urdu sets
flush on the edge it reads from* measures 64 multi-line blocks and asks
whether the lines **inside** one block begin together. The first passed
the Zakat page while it read badly, which is why there are two.

**The homepage's words live in `content.js`, and `index.html` is a
rendering of them.** The hero, the author's introduction and the whole
collapsible bio, the header links, the contact lines and the footer
credit are `hero`, `about`, `nav`, `contact` and `footer` in `content.js`.
`index.html` carries them between marker comments — `<!-- editor:about -->`
and its closing half — and a publish replaces what is between each pair
and touches nothing else in the file. Editing between the markers by hand
is editing a generated file: the next publish overwrites it.

Drawing them with a script at load is the wrong answer: the introduction
is the most-read prose about the author on the site, and a crawler, a
WhatsApp preview and a reader with JavaScript off never run one. The
library can afford to be JS-rendered because `sitemap.xml` and every
work's own page carry it; the introduction has no such second copy.

`buildIndex` in `admin.js` does the splice, and it is all-or-nothing: a
missing marker writes **no** region and stops the publish with a sentence
naming it. `index.html` is the front door; a half-generated one is worse
than an unchanged one. The editor reads the committed page back over
http, so this needs the editor opened over http, not from the file system.

None of these strings says which script it is in. `langAttrs` asks
`scriptOf` — the same function the writing box asks of a typed line — and
writes `lang` and `dir` itself. It never writes a **class**: `.urdu`
brings a font size and `text-align: right` along with the font, and the
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

**An app is a record with an `app` block, and its page is built from
fields.** `apps/<id>.html`, written by `buildApp` and regenerated in full
on every publish the way a work's page is — there is no writing to read
back, so nothing to lose. `isApp` is what tells it from a post, and it is
checked first everywhere `isPost` is: an app has a `page` too, and
without that order it would be handed the writing box, blocked by
`problems()` for having no writing in it, and given a `BlogPosting` in
its structured data. It is a `SoftwareApplication`, because it is
something you open rather than something you read.

Everything else reaches it untold — the sitemap line, the share card, the
category pill, the search — because they all walk the library and an app
is in it. Two things did need telling: **Print** is mounted on
`record.page && !record.app` (an app page prints a stub with a button
that does nothing on paper, the same argument a work's page makes), and
the Worker's `WRITABLE` needs `apps/…`, which is a hand deploy.

**An app is opened, so its row opens it, and its page says who stands
behind it.** `recordMeta` answers "Opens in a browser" for a record with
an `app` block and names no language — this one has two, and calling it
English because the title is in English describes nothing a reader would
get. `workMarkup` puts **Open the app** first, straight to
`record.app.url` and offsite, with **About this app** beside it: the
request was for a direct link *as well*, not instead.

`presentedBy`, `preparedBy` and `verifiedBy[]` on the `app` block become
the پیشکش / تیار کردہ / تصدیق panel at the foot of the page. The تصدیق is
the part that matters: a zakāt calculator two muftis have checked is a
different thing from one nobody has, and a page that does not say which
leaves a reader to guess. Fields, not a sentence somebody remembers to
type. The labels are Urdu words so they are set in Urdu — `.bio-facts dt`
had to learn the same thing, where نام and کنیت were being set in the
Latin UI face at 12px with 0.08em of tracking, which pulls joined letters
apart. Who built it is said once: the *Built by* cell in the facts row is
written only when `preparedBy` is absent.

**A record carries the day it was last edited, and the editor stamps
it.** `updated` is written by `touch(record)` in `admin.js`, from a
listener delegated on the row so a field added later cannot be
forgotten. The *Recently added and updated* strip is ordered by it,
newest first, `updated || date`.

Not stamped at publish time: a publish deliberately rewrites every page
whether or not it changed, so stamping there would mark all twenty-three
as new every time and the strip would say nothing. Moving a record up the
page or into another category does **not** stamp it — that changes where
it is read, not what it says.

The date is `today()`, from local date parts. `toISOString()` is UTC and
Karachi is five hours ahead, so a post written before five in the morning
was stamped with yesterday. `site.formatDate` has never had that fault —
it parses `"2026-08-04"` with a regex and never builds a `Date` — and
`recordMeta` falls back to `updated` when a record has no `date`, so the
row, the card and the page all say the same thing from one function.

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

**A published page keeps the marks it was written with.** Nothing rendered
today writes a `.glyph` any more, but every work and post page committed
before the icons still carries the old `↗`/`↓` characters in its own HTML,
and will until the editor writes that page again. The rule stays in
`styles.css` for exactly that reason.

**Adding a work by hand means editing sitemap.xml too, and its page is
missing until admin.html writes it.** `sitemap.xml` is the one file outside
`content.js` that names a work, one `<url>` per id — the homepage list is
built by JS, so a crawler that does not run scripts sees nothing there. Miss
the sitemap line and the work is published but unfindable. `admin.html`
writes `content.js`, `sitemap.xml` and every work's own page together on
every publish, so this only matters when content.js is hand-edited outside
the editor.

**Icons are drawings, and they live in one sprite.** `ICONS` in
`common.js` holds twelve line drawings on a 24×24 grid — no fill, stroke in
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

**Motion is allowed on a decoration, never on content.** Two things move
as you scroll — the category icons and the recently-added cards — and
both are built so that not moving costs nothing. **The three cases are
the whole safety argument, and everything that moves here must pass all
three: no JavaScript, no `IntersectionObserver`, and
`prefers-reduced-motion` must each leave the thing exactly as it should
look.** Nothing on this site may start invisible waiting for a script to
reveal it.

The icons draw themselves on: `pathLength="1"` on every path in
`iconSprite` normalises each stroke, so one dash figure suits them all,
and `stroke-dasharray`/`stroke-dashoffset` being *inherited* is the only
reason they reach inside `<use>`'s shadow tree at all. Crucially the dash
lives on `.icon-draw`, a class `drawIconsOnEntry` adds — never on `.icon`
— so all three cases leave the icon simply drawn. `test/homepage.mjs`
checks all three, because that is the whole argument.

**A shelf on the way past, not a screen.** The recently-added strip went
up at 575px — 64% of a 900px viewport, against an author introduction of
591px — and pushed the library, which is the point of the site, to
y=2021. It is 368px now, 41%, with the library at 1814. Most of that was
one thing: a card's meta line was **114px**, taller than its own title,
because `Read here · Urdu · 8 August 2026` wrapped to three lines in a
280px card. A card says kind and date and nothing else —
`site.recordWhen`, which `recordMeta` also calls, so "when" still has one
answer. Format and language are the library row's job, one section down.
Its heading is sized well under a section's too: at 48px it looked like a
peer of the library it sits above. `test/homepage.mjs` holds all of it to
numbers so it cannot creep back.

**The strip is in the file; only the clones are made in the browser.** It
is generated into `index.html` by `indexRecent` at publish time like
every other marked region, which is why `test/homepage.mjs` can turn
JavaScript off and still find the cards with their titles in them — where
the library below it renders nothing at all. Every part of a card comes
from the helper the library row uses for the same part — `titleMarkup`,
`kindMarkup`, `metaMarkup`, `categoryIcon` — so a card cannot end up
saying something different from the row it mirrors.

`startTicker` in `script.js` clones the set once into `.recent-ticker`
and translates the pair by −50%; with a `margin-right` on each card
rather than a flex `gap`, half the pair's width is exactly one set and
the loop has no seam (a flex gap leaves it half a gap short, which jumps
every time round). The clones are **never written into `index.html`** —
the cards are in the file so that a reader without JavaScript gets them,
and baking the duplicates in would give that reader, and a crawler, every
card twice. Each clone carries `aria-hidden` and `tabindex="-1"`, so a
screen reader and the keyboard meet each card once. Hover and
focus-within pause it, which is owed to anything that moves by itself.
Fail any of the three cases above and there are no clones and no
animation, and the strip stays the scrollable rail with arrows that it is
otherwise.

The cards rise as they arrive, and `card-rise` carries the movement
**and** the state it moves from, together. Putting `opacity: 0` on `.recent-card`
itself was tried and the tests caught it — the three cases again.

`rail()` in `script.js` is the category strip's own scrolling behaviour,
extracted and used twice. It scrolls the *track*, never `scrollIntoView`
— same reason as the rail that marks your place.

The `app` icon is the twelfth drawing. A card's mark in the strip
deliberately does **not** carry `.category-icon`: those draw themselves
on as you reach them, and a mark sitting off the right-hand end of a rail
would never come into view to be drawn.

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
vertical padding on the four full-bleed sections; `--block-tight`
(`clamp(34px, 3.6vw, 54px)`) is its companion and is read by the
recently-updated strip alone. That strip is a band *between* two
sections, not a section: at `--block` its own 93.6px stacked against the
introduction's 93.6px and put 187px of nothing between the last line of
the introduction and the first card. Nothing else reads either one.

`--block` was `clamp(56px, 8vw, 118px)`, which gave 236–283px between
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

**The suites, and which one to run.** `test/README.md` says what each
covers in full.

- **Touching `script.js`, `common.js` or the library's CSS means running
  `node test/homepage.mjs`.** It measures where things landed on the
  rendered page, because the faults it guards against were all geometry —
  a grid whose column count orphaned a card, a label sent to the far edge
  of its block by a rule written for something else, a row with its title
  on one side and the label naming it on the other, a category named
  twice at opposite ends of its head, a paragraph of Urdu ragged on the
  edge it reads from. Not one of them changed a string or would fail a
  linter, and looking at the source could not see any of them.
- **Touching `admin.js` means running `node test/editor.mjs`.** It types
  into the writing box, presses the toolbar, exports a post and reads it
  back, and counts a publish against the Worker's own limits. It exists
  because looking at the editor was the only check there was for months,
  and looking at it cannot see a Script button that clears a block's
  language instead of setting it, a heading ignoring the script marked on
  it, or a publish grown past what the Worker will take — all three of
  which shipped.
- **Touching `worker/` means running `node worker/test.mjs`**, which the
  deploy workflow runs too, so a failure there stops the Worker going out.

**They are quick, and they should stay quick.** `test/homepage.mjs` took
seven and a half minutes because every one of its thirty-odd page loads
waited for `networkidle` — and Google's CDN is turned away at the top of
the file, so there was never anything for it to go quiet about.
`domcontentloaded` plus `document.fonts.ready` is the right wait here:
`script.js` runs at the end of `<body>`, so the library is drawn by the
time the document has loaded, and the only thing left is the two
self-hosted faces. One minute forty-nine now. Do not reach for
`networkidle` in these tests.

**A change to `worker/` deploys itself now, and it did not always.** The
Worker is a second deployment on Cloudflare, not served by GitHub Pages,
and it used to be put up by hand — so it could sit weeks behind the
repository with nothing to say so. It did, and publishing broke for a
week. `.github/workflows/deploy-worker.yml` runs the Worker's tests and
deploys it on any push to `main` touching `worker/`, so that cannot
happen again *provided* `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` are set as repository secrets; without them the
workflow fails loudly rather than skipping, because a Worker that did not
deploy must never look like one that did. `worker/README.md`, step 5, has
the setup — the token needs the zone half (Workers Routes) as well as the
account half, or the custom-domain route fails after the code uploads.

The deploy passes **`--keep-vars`**. A deploy otherwise replaces the
Worker's whole variable set with what `wrangler.toml` lists, and the three
settings this repository does not know — `EDITOR_EMAIL` and the two
`ACCESS_*` — live in the Cloudflare dashboard. Blanking `EDITOR_EMAIL`
would not fail closed: the check is `if (env.EDITOR_EMAIL && …)`, so an
empty value drops the second publish lock altogether. `worker/test.mjs`
refuses to pass if any var in the file is `""`, which stops the deploy.

**A change to the Worker's writable list is a change to what the editor
may touch.** `WRITABLE` in `worker/src/index.js` is the only thing between
"the editor may update the author's introduction" and "the editor may
replace any page it likes". `index.html` is on it; `404.html`,
`about/index.html` and `index.htm` are not, and `worker/test.mjs` checks
each of those is still refused.

**Three version numbers, and what each one guards.**

- `WORKER_VERSION` in `worker/src/index.js` and `WORKER_EXPECTS` in
  `admin.js` are bumped **together** whenever the Worker changes in a way
  the editor depends on. The editor asks `/version` on load and says
  plainly when the two have parted; `worker/test.mjs` fails when they
  disagree, so a half-bump cannot reach a deploy.
- `EDITOR_VERSION` in `admin.js` is bumped whenever `admin.js` changes in
  a way a publish depends on. **A tab left open across a deploy is not
  deployed.** It goes on running the `admin.js` it loaded, and an old
  editor rebuilds every page the way it used to be — which is exactly
  what is already committed. The Worker is handed the whole library on
  every publish and commits only what differs, so it finds nothing,
  commits nothing, and answers with no sha. That answer used to be shown
  in green, so an edit that never left the browser read as an edit that
  went out; it happened, to a post, and the author had no way to know.

Two things guard it. `dirty` is read before it is cleared, so *nothing
committed* is calm when nothing was edited and a plain failure when
something was. And `EDITOR_VERSION` is checked on load the same way as
the Worker's — `admin.js` fetched again past the cache, the constant read
out of the text — so the tab is told it is old *before* a publish rather
than after. Both notices land in `#worker-status`, and both append rather
than write, since a tab can be old *and* pointed at an old Worker and
neither may erase the other. A check that cannot run says nothing at all
— opened from the file system there is nothing to fetch, and that is not
a fault.

## Outstanding

- Every work and fatwa has its files. Nothing is owed.
- The `apps` category holds one app, the Zakat calculator, at
  `apps/zakat-calculator.html`. Adding another is a form: **+ Add an app**
  in the editor, then the address, the version, the platforms and what is
  new. No screenshot on the page yet — the author has one.
- The `posts` category holds three pieces. Two of them are the same essay
  in English and Urdu — separate entries with separate ids, not one entry
  with two files, because each is a page to be read rather than a download
  to be picked. Nothing links one to the other yet; the block format has
  no way to write a link, and adding one is the next thing that category
  needs.
- Writing a post still means opening the editor. The plan is a GitHub
  Action: commit one Markdown file from the phone app, and it builds the
  page, the entry and the sitemap line.
- Publishing from the editor goes through `worker/` when it is opened at
  `admin.tahirqadri.com.pk`. The Worker checks who is asking — a Firebase
  sign-in or a Cloudflare Access one, whichever is configured — and holds
  the GitHub token itself, so no device ever does. Opened any other way
  the editor falls back to asking for a token, and `Files…` works
  everywhere. `worker/README.md` has the one-time setup.
- The address is `https://tahirqadri.com.pk/` — a PKNIC domain on Cloudflare
  DNS, served by GitHub Pages. It is written in five places: `site.baseUrl` in
  `content.js`, `robots.txt`, `sitemap.xml`, the canonical and sharing tags in
  `index.html`, and the `CNAME` file. They all change together.
