# Scholarly Works and Research — project notes

Personal scholarly library for **Abul Laith Muḥammad Ṭāhir Qādrī An-Naʿīmī**
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
fatawa/        index.html — every ruling on one page, generated
author/        index.html — the author's introduction on a page of its own
styles.css     all design, in 13 numbered sections
404.html robots.txt sitemap.xml CNAME
share-card.html share-card.png   the one card for a link to the site itself,
                  not to a record. The .html is its source: it is shot at
                  1200×630 and saved over the .png, and nothing reads it.
                  Re-shoot it whenever the display face or its wording changes
                  — it was left on Newsreader for a while after the rest moved,
                  and the fonts guard in test/homepage.mjs is what found that.
files/images/   the seal used as favicon and header mark, and the calligraphed name
files/cards/    one link-preview picture per post/work/fatwa, drawn by admin.js
files/fonts/    Mehr Nastaliq Web (CC BY-SA, credited in the footer) and Aslam
                  (no open license found — used anyway; see its NOTICE.txt).
                  Each ships as .woff2 with the .ttf behind it as a fallback.
                  Neither is on Google's CDN, so each gets its own @font-face
                  in styles.css instead of a <link> in every page's <head>.
                  Also ayn-and-hamza-400/700.woff2 — two glyphs, 672 and 664
                  bytes, cut from Cardo under the OFL because Gentium has
                  neither. See its NOTICE.txt and the rule below.
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

**A font stack is a claim about coverage, and a claim is worth
measuring.** The English and the Arabic transliteration are
**Gentium Book Plus**. Newsreader was here, and it had no glyph for
eight of the characters this library is written in — `ʿ ḍ Ḥ ḥ Ṣ ṣ ṭ ẓ`,
**353 uses** across the site — so each one was drawn by whatever serif
the reader's device happened to have, in the middle of a word, while
`ā ī ū` beside them came from Newsreader. In `Ṣaḥīḥ` three of six
letters were a different typeface.

Nothing in the source said so, and this is the part worth remembering:
Newsreader's `latin-ext` subset **declares** `U+1E00-1E9F` and
`U+02BD-02C5` and holds neither. A declared `unicode-range` is a
statement about which file to fetch, not a promise that the glyph is
in it. So the CSS looked right, the HTML looked right, and the whole
test suite passed. The author reported it by eye, from a phone.

**Check a candidate by reading its cmap, not its reputation.** Twelve
serifs and twelve sans were pulled from Google and their character maps
read directly. The results overturned three plausible answers in a row:

- **Playfair Display** is missing the same eight. **Playfair** (the
  variable family) has them but is a Didone, and its hairlines break up
  at the 265px WhatsApp size — the same argument that put Aslam rather
  than Nastaliq on the cards.
- **EB Garamond** has all of them and sets the macron of `ī` into the
  `ʿ` beside it, so `Sharīʿah` — the most-used term here — collides into
  a blob. Found by looking, not by measuring.
- **Gentium**, the face designed for exactly this, is missing the **ayn**
  and the **hamza** in the build Google serves. Both Gentium families
  carry five glyphs from the whole `U+02B0-02FF` block. Three of the six
  words offered as its strength — `Qurʾān`, `ʿilm`, `muʿāmalāt` — fell
  back. Reputation is not coverage.
- **Cardo** was the only candidate with no gap at all (76 glyphs from
  that block), and is what the patch below is cut from. It lost on looks:
  it reads small at this body size and took an English post's h1 to a
  fourth line.

So Gentium is used **with its gap filled deliberately**: `Ayn and hamza`
in `styles.css` is two glyphs cut from Cardo, self-hosted, scoped by
`unicode-range: U+02BE-02BF` so it can draw nothing else. 1.3KB for both
weights — less than the icon sprite — and no extra CDN request. The
order in the stack matters and is guarded: Gentium first, the patch
behind it.

**Prose is the serif; the chrome is the sans.** `body` carries
`--font-display` and `--font-ui` is pinned back onto the wordmark, the
nav, the eyebrows, the labels, the buttons, the counts and the footer.
That pin list is necessary rather than tidy, and it was **measured**:
every text-owning element on five pages was walked with the block lifted,
and these are the ones that changed family and should not have. Setting
`body` alone swept the wordmark into the serif and grew the header from
**68px to 83px**. `.category-arrow` is deliberately *not* in the list — a
`<button>` does not inherit `font-family`, so it has always drawn its
arrow in the UA default, and naming it would change a glyph this had no
business touching.

Body is **17px**, not 16: Gentium's x-height is 454 against DM Sans's
526, so the same number reads 14% smaller. Exact parity would be 18.5px,
which is a larger body than this page wants; 17 is a deliberate middle.

**The hero costs 27px and the budget moved for it.** Gentium is wider
than DM Sans, so the hero's paragraph takes four lines where it took
three — measured at 16, 16.5 and 17px, where the hero is 752px at all
three, so it is the face and not the size. The library-top budget in
`test/homepage.mjs` went 1940 → 1970 for that, deliberately, the way the
strip's own budget moved once before. The strip did not move: it is still
408px.

**The suite could not have caught any of this, and still cannot see
Gentium.** `open()` in `test/homepage.mjs` turns Google's CDN away, so
every one of its assertions has always been measured on fallback faces.
That is right for the rest of the suite — what it asserts is which side
of a box something landed on — and it is why the fault lived here for
months. What *can* be guarded is the committed half, and is: the ayn is
self-hosted, so the browser really draws it in the suite, and CDP's
`getPlatformFontsForNode` is asked which face did it. Take the patch out
of the stack and that assertion reports `drawn by Liberation Serif` and
fails. The run proving that is the only reason it is worth having.

**The same gap was in the sans all along, and nobody had re-checked
it.** The Gentium work above fixed the serif and stopped there.
**DM Sans** — which draws the whole chrome, and with it the one personal
name on the site — has `ā ī ū` and has **none** of `ḥ Ḥ ṭ Ṭ ṣ Ṣ ḍ ẓ`,
nor the ayn. Its `latin-ext` **declares** `U+1E00-1E9F` and `U+02BD-02C5`
and holds neither: Newsreader's fault exactly, in the face sitting beside
it the whole time. So *Abul Laith Muḥammad Ṭāhir Qādrī An-Naʿīmī* —
in the hero above the headline, in the footer beside the copyright, and
baked into the byline of all thirty share cards — had the **ḥ**, the
**Ṭ** and the **ʿ** drawn by the device while the `ā` and `ī` next to
them came from DM Sans. Three letters of a name in another typeface.

`Latin marks sans` in `styles.css` is the answer, cut from **Noto Sans**,
the only sans measured that had all fifteen. It carries the whole
`U+1E00-1E9F` block rather than the ten characters used today — 12KB for
both weights, against 4.6KB for the ten, measured — because that makes it
cover **exactly what Gentium covers** on the display side, so a word in a
label can never come out in a different face from the same word in the
prose beside it. A `unicode-range` is only ever as honest as the file: it
declares 162 code points and the file holds 162, read off the cmap.

**Order in a stack is not the same as a `unicode-range`, and the
superscripts are where that bites.** Gentium has `¹ ² ³ ⁴` and does
**not** have `⁰ ⁵ ⁶ ⁷ ⁸ ⁹`. The posts number their references `¹` to
`⁷`, so markers 1–4 were Gentium and 5, 6, 7 a system serif — twelve
characters down two lists, in the one place a reader compares two marks
directly. `Superscript digits` (1.4KB, cut from Noto Serif, which is the
only serif measured that has all ten) is named **before** Gentium in
`--font-display`, and that is the whole point: a `unicode-range` says
what a face is *allowed* to draw, never that it is preferred. Behind
Gentium the file would be fetched and then never used for `¹ ² ³ ⁴`, and
the list would still be set in two faces. Noto Serif had to be built from
**two** of Google's subsets — `¹ ² ³` are in `latin` and the rest in
`latin-ext`, so no single file it serves holds all ten.

**Arabic inside an English sentence had no face at all.** The honorifics
— `(رضي الله عنه)`, `(عليه السلام)` — are a few words inside a Latin
paragraph, so they carry no `.arabic` class, inherit `--font-display`,
and fell out of it to DejaVu Sans. `Amiri` is last in that stack now. It
sits after Gentium and both patches, so it is never reached for Latin.

**`document.fonts.load()` without its second argument is the subtlest
trap here, and it had caught three faces.** It fetches only the files the
text it is given needs, and the text it assumes is `BESbswy`. So
`ensureCardFonts` named `Ayn and hamza` and never loaded it; it named
`Latin marks sans` and would not have; and — the one that had actually
shipped — it named **Amiri**, fetched Amiri's *latin* file, and drew
every Arabic card title with no Arabic glyph in the family it had just
"loaded". `document.fonts.check` answered `true` throughout, which this
file already records as what it does for a family that was never loaded.

**`files/cards/bustan-bani-amir.jpg` was published that way**, in the
browser's own Arabic face — heavy and geometric where Amiri is a fine
traditional Naskh — and a card is a PNG, so it stayed wrong. It was
visible only by putting the old card beside the new one and **looking**;
no measurement of the card said anything. The other two Arabic cards come
back byte-identical once Amiri is asked for properly, which is what
proves the fix rather than a third opinion about the shapes.

Aslam and Mehr need no text and that is not because they are Arabic: they
are self-hosted as one file each, with no `unicode-range` to split them,
so any load fetches the whole face. **The difference is the subsetting,
not the script** — which means every face Google serves needs asking in
the script it will draw.

The regeneration harness had the same bug in its own proof, and that is
why this survived: it checked `amiri` with the default probe and printed
`true` while writing cards drawn without it. A proof that asks the wrong
question is worse than no proof, because the run looks verified.

**How all of this was found, and the probe that had to be thrown away
twice.** Not by reading stacks — every one of them *looked* right. The
sweep wraps nothing and asks `CSS.getPlatformFontsForNode` of the element
that **owns** the text, then fails on any family the site does not name.
Three earlier versions were wrong, each in a way that reads exactly like
a fault:

- `(none)` from that call means *no glyphs were painted*, which is a
  hidden element, not a fallback. The library rows are shut `<details>`
  and `.print-credit` exists only in `@media print`. Open the first;
  emulate print for the second — in a **separate pass**, because print
  media hides the library you just opened.
- `scrollIntoView` is defeated here: the page scrolls smoothly, which is
  asynchronous, and the category rail listens on scroll. `window.scrollTo`
  on the document, then two frames.
- Wrapping each mark in its own `<span>` **splits the shaping run**, and
  Chromium then reports the glyphs against the parent — so a span sitting
  mid-word answers "no fonts" on text that is drawn perfectly well. This
  one reported 284 false faults and is the same mistake as the
  `getClientRects()` probe above: when a fresh probe reports a large fault
  rate, suspect the probe.

**A width measured without the real font is not a width, and this cost a
wrong comment before it cost anything else.** The hero name was measured
with Google's CDN turned away — the suite's own default — and the numbers
said the name needed 402px against a 328px column and that *no* step
could bring it onto one line. With DM Sans actually served it is
**355px**, and the graded form is 322. The first account was written into
two comments as fact before the second measurement contradicted it. The
suite cannot be used for this: what decides the wrap is DM Sans's width,
and `open()` never loads DM Sans.

**The hero name is graded, and 0.78 is a measurement not a taste.** The
kunya and the nisba are `0.78em` of the name proper — one line from
**390px** up, where the plain name needs 430. The ladder is shallow,
because the two outer names are only 146px of the 355: `0.82` gives 328
against a 328px column, which is a fit by exactly nothing, and `0.74`
gives 317. `0.78` is 322, six pixels clear. Below 390px it is two lines
and no step mends it — the middle name and its spaces are 209px alone
against 302px at 360px, so the flanks would have to go under `0.64em`, a
9.6px name.

Written from `eyebrowParts` in `content.js`, which must spell `eyebrow`
exactly or `heroName` writes the plain string instead — so a name edited
in the editor cannot publish a hero that disagrees with the byline, the
card and the introduction. The guard asserts the **structure**, never the
line count, for the reason above.

**The nav had two copies of its own words.** `indexNav` reads
`model.nav`; `pageNav` held its own list — so the same link was `Fatāwā`
on the homepage and `Fatawa` on all thirty-three generated pages, and on
the fatāwā page's own `<title>`. `pageNav` takes the text from
`content.js` now, matched by the anchor each link answers to on the
homepage, and keeps only the hrefs, which really are structure: a
generated page sits one folder down and climbs out with `../`.

**The chrome was reading at 0.71 of the prose on a phone.** The body went
to 17px with the face change and the chrome did not follow. Raised a step
at each band — and the narrow bands had to be measured, because at
**390px**, the width where all four nav links first appear, the three
claims on the header's 358px content box are exact: a 125px wordmark at
its `15ch` cap, the row's own 12px gap, and the links. At 13px the links
want 222, so the sum came to 359 and Contact sat **one pixel** off the
edge. The nav's own gap went 12 → 10px, which gives 6px back across three
gaps and lands it at 216 of 221. Nothing is lost for it: the invisible tap
pad is `inset: -8px 0`, vertical only, so a narrower gap cannot make two
targets overlap — the warning beside it is about widening the links
sideways, which is a different thing. The three alternatives were measured
and each costs something: the row gap gives only 2px, a `14ch` wordmark
risks the wrap that drives header height at 480–620, and leaving the links
at 12px gives up the readability on the one screen the raise was for.

**Share and Print are drawn now, and the rule under them is 2px.** They
were two words with a 1px hairline, which at 15px on cream read as text
rather than as controls. Both icons are in the same sprite as the rest —
no new request — and the rule doubled, which is the same argument the
search box's own 2px gold edge already makes.

**Every page asks for its fonts with one URL now.** There were five
variants, two disagreeing about a weight and one on a page nobody had
looked at in a while. The guard reads every `.html` in the repository and
refuses more than one distinct URL — and it earned itself immediately, by
failing on `share-card.html`, which a `grep` over the four pages I
thought existed had missed.

**`ch` is the width of the font's own zero, so a measure pegged to it
moves when the face does.** This is the bill for the change above, and it
arrived as *the subtitle wraps despite space* and *use the full
horizontal width*. Both were one cause: `1ch` is **11px in DM Sans at
16px and 8px in Gentium at 17px**, so every `ch` cap on the site shrank
by about 27% the moment the face changed. The body column went **744px →
496px**, the standfirst **408 → 272** — and 272px is just under what
*"For a Muslim, that power is an amanah."* needs, so it broke to two
lines at **every width from 390 to 1680**, which is why it looked like a
bug rather than a cap.

Measured, pooling every English paragraph of the technology post: the old
744px column was **70 characters a line**, which is right; 496px was 62
and read cramped inside an 1100px page. The caps are in **`em`** now —
`em = ch × 0.70`, which reproduces every old width within a few pixels
and cannot move again unless the size does. `.post-body` is `43em`
(731px, 70 characters) and the standfirst `24em` (408px, one line).

Left in `ch` deliberately: `.hero-urdu`, `.post-body.arabic`,
`.app-tagline.urdu`, `.app-about p.arabic` and `.brand`, because those
are measured in Mehr's, Amiri's and DM Sans's digits and none of those
faces changed. `.work-hero h1` keeps its `22ch` too — the comment beside
it says it is Aslam's digit width, and a Latin title still fits one line
at every width swept.

**English is justified from 760px up, and that bound is the gap not the
fill** — the third time that lesson has been paid for here, after
`CARD_STRETCH` and `CARD_FILL`. Worst word gap against the face's own
space, measured on the longest English paragraph with the inline Arabic
runs excluded, because a gap beside an RTL run is a bidi artefact of the
measurement and not a hole in the setting:

```
 360px → 302px column → 4.07x      620px → 521px → 2.27x
 390px → 328px        → 3.53x      820px → 689px → 1.59x
 480px → 403px        → 3.15x     1280px → 731px → 1.34x
```

Four times a space is a bar of white with a word at each end. The 2× bar
is crossed at a column of about 600px, so the rule starts at 760px and a
phone keeps its ragged edge, which is what a 328px column wants anyway.
`hyphens: auto` is kept for where it helps and is **unverified**:
headless Chromium here ships no hyphenation dictionary, so `auto` and
`none` render identically. Do not write a number for it without a real
browser.

An English block inside an Urdu post is **not** justified: those are
bibliography entries, and a justified numbered reference list is a state
this site has never been in.

**`own-edge` had a mirror and it was missing for years.** The rule above
it in `styles.css` said so in as many words — *"it also mirrors the case
where an English paragraph sits in a right-reading column, which this
does not"* — and `proseBlock` is where that bit. For an Urdu record it
handed **both** halves of the description panel a flat `align-right`,
which is correct for the Urdu and rags the edge English begins from. The
falaq/nas ruling's English description started its ten lines at
`[511, 618, 529, 493, 526, 543, 517, 502, 575, 674]`, a spread of 181px;
the qaṭʿ-e-taʿalluq one at `[874, 1101]`. Reported as *the cards look
misaligned*.

Two faults, not one, and the first hid the second: the rtl row of
`proseBlock` handed `record.description` — the **English** one — the
*record's* language, which is `ur`. So `edge()` was told the English
paragraph read right-to-left, and a new branch for it could not fire
until the pair was labelled by what each half is written in.

`.own-edge-latin` is the mirror, and **all three of its declarations do
work, depending on whether the text wraps**. It was nearly shipped as
`text-align` alone on a measurement taken only on a wrapping block:
there `fit-content` collapses to the available width and the margin has
nothing to distribute. On **one line** it shrinks the box to the words
and `margin-left: auto` puts the ink on the column's right, which is the
edge its Urdu sibling begins on — and the stacked-pairs guard compares
ink when a block is one line and treats opposite edges as the fault
itself. Simplifying the rule failed that guard on the Farewell Sermon
row. `margin-left` is physical so it cannot be read two ways.

**Three things in that guard had to learn the difference, and each was
caught by running it.** Which edge a *placed* box sits against was
inferred from the parent's direction; that held while the only placed box
was Urdu in an LTR panel, and broke when an English box was placed right
inside a container still `ltr` — six correct work rows reported 161 to
619px apart. It measures the edge now. A box that **spans** the column is
placed against both and cannot disagree with its sibling; the first
version of that tie-break called every LTR row a fault. And the ink
comparison only means anything when **both** blocks hug their words — one
line of Urdu beside four lines of English whose right edge reached the
same pixel was reported as pulled apart.

**The group that should have caught this did not exist.** *urdu sets
flush on the edge it reads from* measures Urdu blocks, so a ragged
**English** one was invisible to it — "a guard that inspects only what is
marked cannot see what is not", again. *english sets flush on the edge it
reads from* is the mirror: 200 multi-line Latin blocks, lines grouped
with a tolerance on `top` so an inline Arabic run on its own baseline is
not mistaken for a line of its own. Restoring the fault reports
`spread: 596`. Note what it took to know the guard was worth having:
with the fault put back, the **stacked-pairs** group still passed, 206
green. It asks where a block *begins*, and in the faulty state both
blocks did begin on the same edge.

It also found the only other ragged English on the site: `.record-meta`
inherited `right` under an Urdu title and wrapped on a phone, two-line
labels beginning 45px and 192px apart. It is `direction: ltr` now, the
same argument `.more-like` already makes — the site's own words about a
record, set in the site's own direction as well as its own face.

**A control is not a prose block.** The pairing guard was comparing the
Urdu call to action on the app page against the **Open the app** button
below it, which has no answer: a button is sized by what it does. It
passed only because the old parent-direction shortcut called both
"left". Excluded by name now.

**The share cards are not byte-identical between runs.** Regenerating
moved the two whose titles carry an ayn by a pixel or two vertically —
same size, same breaks, same glyphs. Nothing had changed about them, so
they were left out of the commit rather than churning two binaries. If
cards appear in a diff after an unrelated change, check whether anything
actually differs before committing them.

**The mixed-script alignment was audited and is sound — and the
hand-rolled probe that said otherwise was the thing that was wrong.** It
reported 284 of 525 blocks misaligned. `getClientRects()` over a range
returns a rect per **inline fragment**, not per line, so every paragraph
holding a link or an `<i>` reported mid-line starts as line starts. The
honest check was to run the suite's own two vetted groups — *Urdu stacked
against english* (89 pairs) and *Urdu sets flush on the edge it reads
from* (64 blocks) — with the real fonts served instead of turned away.
All 206 assertions passed. **Prefer re-running a vetted assertion over
writing a new probe**, and when a fresh probe reports a fault rate that
large, suspect the probe.

That run is also the recipe when a face changes: copy `test/homepage.mjs`,
pin `ROOT` to the repository, and fulfil `fonts.googleapis.com` from a
local bundle of the real woff2 files rather than aborting it. Worth doing
once per font change; not worth making the default, which would tie the
suite to someone else's uptime for assertions that are about geometry.

**The cards were being drawn without their fonts.** `drawCard` asks for
`700 34px "DM Sans"` for the byline, and every committed card had it in a
fallback serif — the font had not loaded when the card was drawn. Only
visible by comparing the regenerated card against the old one. Whatever
regenerates the cards has to **prove the faces are loaded before
drawing**, because a canvas bakes in whatever is there and says nothing.
`document.fonts.check()` is not that proof: it answers `true` for a
family that was never loaded, which is how this was missed twice.

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

**And the browser will make up an italic, which is the same bargain
refused.** Nastaliq has no italic cut, so `font-style: italic` — one of
the five marks the writing box puts on a picked-out run — was being
answered by Chromium **shearing the glyphs**. Reported from the live
site and measured there: the Urdu quotation in `hunar-nahin-amanat`
came out leaning, drawn by Jameel at `font-style: italic` with the
default `font-synthesis: weight style small-caps`, which permits
exactly that. Emphasis in this script is **kasheeda**, the elongation
of a joining stroke — a property of the letterforms, and not something
a transform can fake. The author's instruction was the right one: if
the face has no italic, show none.

`font-synthesis-style: none`, and **never the `font-synthesis`
shorthand**, which would take the synthesised *weight* with it and undo
the paragraph above in the one mark an author reaches for most. The
guard measures the shear rather than the declaration: the real `<i>` is
cloned, one copy forced back to `font-style: normal`, and the two are
screenshotted and compared byte for byte. A computed
`font-synthesis-style: none` would also go red when the rule comes out,
but it says nothing about whether the glyphs moved — and this
repository has shipped a stack that *declared* coverage it did not
have. Nine italic runs across the posts, exactly one of them Urdu,
which the guard counts so a rewrite that loses it fails rather than
passes on an empty set.

**An in-prose Urdu heading is justified, like the prose under it.**
The body has been justified all along and the headings were not, so they
sat ragged above justified paragraphs with the first line short. Setting
them the same way fills every line but the last. `text-wrap: wrap` goes
with it to cancel the inherited `balance` — justification would otherwise
stretch lines balance had deliberately shortened. It outranks the
`align-right` the editor writes onto a heading, deliberately.

This is what three rounds of `balance` / `pretty` / font size were
circling without reaching. The question to ask first is *how is the text
around it set* — not *how should this break*.

**`text-wrap: balance` elsewhere stays, and a measurement said
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
bracket in an Urdu clause set at 71% would be a new fault. Aslam still
has its Latin; nothing has asked for it yet.

**That fallback was `local()`, and `local()` is a claim about the
reader's device.** The same class of fault as the declared
`unicode-range` above, one layer out: the stack named DM Sans, Segoe
UI, Roboto, Helvetica and Arial, and the first of those is a *webfont*.
Nobody has DM Sans installed. So every reader got a different sans
depending on what their device happened to carry — Liberation Sans in
the test container, Roboto on the author's phone — and every one of
them got a **sans**, inside a page whose English everywhere else is
Gentium, a serif. Asked of the rendered page with
`getPlatformFontsForNode`: **330 glyphs drawn by Liberation Sans** in
the middle of the shares article's Urdu. Reported as *the articles seem
unattractive, not a professional readable format*, which is what a
paragraph looks like when the terms inside it are in somebody else's
typeface.

It is a self-hosted cut of **Gentium** now — the site's own English
face, 406 codepoints, 16.9KB, renamed inside the font because
*Gentium* is SIL's Reserved Font Name. Same pattern as the other three
patches, and the fourth time this repository has paid for the lesson
that **a font stack is a claim and a claim is worth measuring**.

**78%, not 71%, and the number moved because the face did.** 71% was
DM Sans's; Gentium's x-height is 454 against DM Sans's 526, so the same
apparent size needs a larger em — 82% is the arithmetic match. 78, 82
and 88 were drawn and **looked at**: 78 reads better here and keeps the
worst justification gap where it already was (9.6px at 390px, against
12.3 at 82).

**It makes the page lighter, which is the whole argument for it.**
`«` and `»` wrap an Arabic quotation inside an Urdu paragraph; Mehr
*declares* them and does not hold them, so they fell past `Latin in
Urdu` (letters only) to **Noto Nastaliq Urdu — 20KB over the wire to
draw two characters**, more than a third of Mehr itself. `Urdu
guillemets` is a second `@font-face` on the same file, so one fetch,
and it carries **no** `size-adjust`: those are punctuation belonging to
the Urdu clause, exactly the reason brackets were left with Mehr.
Measured off the wire, the post's fonts went **363KB → 360KB** and
Noto is no longer fetched at all.

Two consequences of sharing one file. CDP reports the family name
*inside* the font, so both rules answer `Latin in Urdu` and the guard
cannot tell the guillemets apart by name — what it asserts is that
nothing off the device drew them, with the size half read out of the
stylesheet. And no em-dash was added to the range, deliberately: the
note below about not patching Mehr's dashes still holds, and at 78% a
dash would be a *shorter* bar than the Urdu around it wants.

**`Ayn and hamza` was named in `--font-display` and never in
`--font-urdu`.** The patch has been sitting in the repository fixing
one side of the site and not the other. An ayn in an Urdu sentence fell
past Mehr (declares the block, holds neither mark), past `Latin in
Urdu`, past Noto Nastaliq, to the device. 672 bytes to fix, and it is
in the Urdu stack now.

**No Urdu paragraph on the site carries one yet**, which is why the
guard writes the mark into the page itself and measures that. All eight
ayns on the shares article sit in its English reference entries, which
are `.latin` and take the display stack. Same move the background rule
already makes for a combination the library has not written — inventing
a post to hold one would be the expensive way round. Stated plainly
because the fix is **correct and latent**, and a note that implied
otherwise would be the false account this file keeps warning about.

**A paragraph break has to be bigger than a line break, and in Nastaliq
it was half of one.** `.post-body > *` carries `margin: 0 0 1.1em`,
which is sane under the 1.5 line-height English has. The Urdu body is
21px at 2.15, so the line pitch is **45.15px and the paragraph gap was
23.1px** — paragraphs stopped reading as paragraphs and the article
came out as one grey slab. That is the first thing a reader notices and
the hardest to name; it arrived as the same sentence about the articles
not looking professional, and it is a *second* cause, not the same one.
`1.6em` is 33.6px and the article grows 4%.

Not `li` — a list wants its items closer than its paragraphs, which is
the shape of a list. Not `.latin` either: a block of English in an Urdu
piece is 15px at 1.5 and already has this ratio, and the fourteen
bibliography entries at the foot of an Urdu article should stay a list
rather than fourteen paragraphs.

**Removing the justification was tried and is worse — keep it.** The
obvious thing to reach for, and the measurement says it is inert for
pure Urdu anyway: median gap = worst gap = **0.5px**, Mehr's own
natural space, because Nastaliq separates words by letterform and not
by an advance. It only stretches around the Latin terms. But with it
off, `جانچ Shariah` **collides** — the justification is supplying the
only separation at the Urdu/Latin boundary. Found by rendering it and
looking, not by the 9.8 → 6.7px the gap measurement reported, which
says the change was an improvement.

**Jameel Noori is the Urdu face, and Mehr is what holds the page while
it arrives.** The author wanted it and was right to: beside Mehr at
21px it is plainly more open and more legible. It is also **6.57MB as
woff2**, a hundred and twenty times Mehr.

It shipped behind a control first, opt-in, and the author came back
having tried it: *Jameel loaded without taking time — can we make it
default.* His experience was not the one to design for — the file was
already in his cache and his connection is not a student's — so the
question was measured on the live site with a cold cache before the
default moved:

```
 3G  ~0.4 Mbps   words on screen while waiting: yes   Jameel usable  33.7s
 slow 4G ~1.6    words on screen while waiting: yes   Jameel usable  31.8s
 4G  ~8 Mbps     words on screen while waiting: yes   Jameel usable   9.1s
 wifi ~40        words on screen while waiting: yes   Jameel usable   2.9s
```

**Nobody ever waits to read**, and that is the whole of why the default
is safe. `font-display: swap` with **`Mehr` named inside the same
stack** draws the article in Mehr from the first paint and replaces it
when the file lands. Mehr in that line is load-bearing, not tidy: take
it out and a reader on 3G gets thirty-three seconds of a system face.
There is a guard reading that one stack for it.

What a reader does pay is 6.5MB of their own data and a reflow when it
lands. So there is one line of restraint and only one: if their own
browser says their data is precious — `saveData`, or a 2g
`effectiveType` — we believe it and stay on Mehr. Neither is a guess
about who they are; `saveData` is a setting a person turns on
themselves. An explicit tap outranks both, because somebody who asks
for it on a metered phone has answered better than we can.

**The class is what makes that restraint real.** `common.js` adds
`jameel` before first paint unless the reader has said no or the
connection has; nothing in the stylesheet names the family except the
one rule behind it. On `:root` the browser would be away with 6.5MB
before any script could speak, so the Save-Data branch would be a
comment rather than a behaviour.

**The negative assertion did not go away, it moved.** It used to be
*nobody gets it unless they ask*; it is now *nobody gets it who has
said no, or whose browser has said no for them*. That is the branch a
later change breaks silently — the happy path announces itself and the
Save-Data path does not.

**`'mehr'` is stored, not an empty key.** Clearing it would hand the
reader back to the default, so a tap meant to turn the face off would
last exactly one page load. Both answers are answers now; only the
absence of one asks the connection.

**The cost of the class, stated rather than hidden:** a reader with
JavaScript off keeps Mehr. That is a complete, correct page — the one
the site shipped for years — and it is the right thing to lose, because
the alternative spends 6.5MB with no way to decline it.

**A condition written twice came apart within a day.** The default
shipped and the live check found the **English** vegetarianism fatwa
pulling the whole 6.57MB. Its page carries the اردو میں پڑھیے link to
its twin and five Urdu tag pills and nothing else in Urdu — fourteen
characters and five labels. This file already recorded that exact
reasoning about *offering the control* on such a page; the default was
given its own copy of the test and did not get it. One string now,
`URDU_PROSE` in `common.js`, read to decide whether to spend the bytes
and read again to decide whether to offer the control.

The consequence, said rather than found later: **the homepage, the
fatāwā index and the author page stay in Mehr.** Their Urdu is titles,
one-line descriptions and tags — a catalogue, not reading — and the
front door is the worst place on the site to spend six and a half
megabytes. The face is for the pieces. Both cases are guarded, and
taking the one line out fails them together.

**Making it the default turned three assertions red in other groups,
for one reason.** They named `Mehr Nastaliq Web` literally, from when it
was the only face the site set Urdu body text in — the Latin-in-Urdu
probe, the guillemets probe and the background's prose. Three literals
going red together is the signal that the name belonged in a constant:
`URDU_BODY_FACES` in `test/homepage.mjs`. **Aslam is deliberately not in
it** — a heading is told from the body under it by being a bold Naskh
rather than by being bigger, and an assertion that accepted Aslam as a
body face would stop saying so.

**A seed that does nothing is the same family as a test that cannot
fail.** The Save-Data guard failed on its first run and read exactly
like the code being wrong. It was the test: `addInitScript` runs a
string as a *script*, so the `() => { … }` it was given was an
expression that evaluated to a function and was never called. The page
saw the container's real connection. It is an IIFE now, and the guard
asserts **that the page really sees the faked link** before asserting
what the page did about it — because a seed that silently no-ops turns
a green run into a lie in whichever direction the code happens to go.

**It withholds the Latin letters, exactly as Mehr does.** Jameel
carries 196 non-Arabic codepoints of its own, read off the cmap, so
without the `unicode-range` turning the toggle on would quietly undo
the work that put an English term in an Urdu sentence into the site's
own serif — it would go back to being drawn at the Urdu's full size,
by the Urdu face this time.

**That also corrects a number measured too early.** The first
measurement said Jameel ran the article 5% *longer*; it was taken
before the Latin was withheld, so Jameel was setting the English at
21px too. With the range on it is **13,465 → 12,842px, 4.6% shorter**.
A measurement taken in the wrong configuration is not a measurement,
and the first version of this paragraph would have been false.

**It is the whole font, not a subset, and that is the measurement
too.** Cutting it to the 92 Arabic-script characters the site uses
today saves **1.3%** — 6,802,296 against 6,889,712 — because the file
is 25,269 pre-drawn ligatures and the GSUB closure keeps nearly all of
them from almost any Urdu. 87KB is not worth a face that silently lacks
a glyph the first time an article uses a character the subsetter was
not told about. Contrast Gulzar below, where the same operation saved
18%, which is the structural difference showing itself.

**Offered where the reading matter is Urdu, which is not "wherever
there is Urdu".** Asking for `.urdu` anywhere was written first and is
wrong: every English post carries one — the اردو میں پڑھیے link to its
twin — so the English pieces each offered a 6.5MB download to re-typeset
fourteen characters of chrome. Found by looking at what the selector
matched. It asks for Urdu in `#post-body`, the work description, the
background or the work's own title.


**The control that offers it was in the wrong category, and only one of
its three faults was the wording.** It was a button in the Share/Print
row reading `Jameel Noori · on`, with `6.5 MB, downloaded once` in a
`title`. Reported as *bad labels and at the wrong place*, which was
right on both counts and understated the third:

- **A `title` never appears on a phone.** There is no hover. So the one
  place the cost was stated was invisible to exactly the readers paying
  it — which makes *the size is on the control before it is spent*, this
  file's own rule, false in practice rather than in wording.
- **It was filed with the wrong things.** Share and Print act on the
  page as an object; this is a reading setting. Measured at 390px: it
  sat **2259px down a 2970px article, 76% of the way**, offered after
  the reader had read the whole piece in whatever face they got. It is
  at **13%** now, above the body.
- **It was named after a font.** A reader who does not know what Jameel
  Noori is cannot act on `Jameel Noori · on`.

**`Aa` at the top of the piece, opening a panel that shows the two
faces.** `Aa` is the convention for text settings and needs no
translating on a page whose reader may want neither English chrome nor a
Nastaliq word at UI size — a pairing this file already records twice
(`.bio-facts dt`, the kind in a suggestion row). Inside the panel each
face is **its own name set in itself**, which is the one caption that
cannot disagree with what it describes: a reader who cannot evaluate the
words *Jameel Noori* can see which of two Urdu lines they prefer. **The
sample is the label.**

**The one decision the whole panel is built around.** Drawing a live
Jameel sample for a reader who has *not* got Jameel would start the
6.57MB download **from the act of opening the panel** — spending their
data before they asked, which is the single thing the control exists to
let them decline. So Jameel's sample is a **1,231-byte picture** until
Jameel is actually on, and live type once it is; Mehr is always live,
being 55KB and already drawing the page. The guard counts fonts **off
the wire** rather than reading the markup, and reports `no font` with
Jameel off.

**The picture is transparent, and that was found by looking.** On the
page's cream it drew a visible rectangle around the one row that has a
picture, and would have fought the warm ground that marks the chosen
row. Transparent is also **less than half the size** — 1,231 against
2,685 — because the ground was most of the pixels. No measurement said
any of that.

**`margin-left`, physical, for the same reason `.own-edge-latin` gives.**
The hero of an Urdu piece is `dir="rtl"` and everything in it sits
right; a full-width `ltr` block put the control alone on the far left,
reading as something that had fallen off the page.
`margin-inline-start: auto` is the trap — in a right-reading hero it
pushes a box *away* from the edge it has to sit on, which the standfirst
already paid for. The box moves; its contents stay `ltr`, because they
are the site's own words about the page.

**What the guard asserts beyond the fetch:** that the seed really took
before anything is concluded from it; that the control is above the
writing and out of the tools row; that the cost is **rendered** text of
a real size and not an attribute; that the control is 44px and the panel
stays on the screen at 390 — the Download lesson applied before a report
rather than after; and that choosing stores `'mehr'` rather than
clearing the key, since clearing hands the reader back to the default,
which *is* Jameel, so a tap meant to turn it off would last one page
load.

**The three cases hold.** No JavaScript: no control, no download, the
page exactly as it is today in Mehr. Storage blocked or refused: every
read and write is wrapped, and the choice simply lasts the one page.
Nothing starts invisible waiting for a script. The size is on the
control **before** it is spent, not only after — a button that quietly
takes 6.5MB of someone's mobile data has not asked.

What is *not* asserted, and the comment beside it says so: that the
class is on before first paint. `common.js` is one parser-blocking
script at the end of `<body>`, so applying the class at the top of the
file and applying it down in the mount both land in the same
synchronous pass and both would pass. The ordering is a reasoned claim,
not a measured one, and naming the assertion after it would be a test
that cannot fail.

**The advice that prompted this was two-thirds right, and the third
matters.** Three claims were checked rather than taken:

- *"Self-host with `Cache-Control: public, max-age=31536000, immutable`
  and after the first visit it costs nothing."* **You cannot set
  headers on GitHub Pages.** Read off the live site:
  `server: GitHub.com`, `cache-control: max-age=600`. Ten minutes. The
  domain is on Cloudflare **DNS only** — no `cf-cache-status`, and that
  `via: varnish` is GitHub's own Fastly — so there is no edge in the
  request path to put a rule on. A returning reader revalidates and
  gets a 304 *while the file is still in their browser cache*, which
  for a 6.5MB entry on a phone is not a promise. Making the advice true
  means proxying the domain through Cloudflare and adding a cache rule:
  a DNS change, not a repository change.
- *"Use Brotli or gzip on the server."* **woff2 is already a Brotli
  container.** Measured: recompressing at q11 makes it **24 bytes
  bigger**, gzip -9 adds 2KB. It also beats raw TTF + Brotli
  (7,498,520) by 700KB.
- *"Preload it, and also show the page first and swap it in."* Those
  two fight. `<link rel=preload as=font>` fetches at the highest
  priority immediately, against the HTML, the CSS and the other six
  fonts. Nothing is preloaded here.

**Gulzar was measured as the way out and is a real one, not taken.**
OFL, by Borna Izadpanah, Fiona Ross, Alice Savoie and Simon Cozens.
Component-based like Mehr — 817 glyphs and 89 GSUB lookups against
Jameel's 25,269 — so subsetting works on it: Google serves 204KB, cut
to the site's own characters it is **167KB**. It covers 89 of the 92
characters here against Mehr's 87, having `﴾ ﴿ ﷺ` that Mehr lacks. On
the test line its ink is within **1.2%** of Jameel's. The author chose
to stay on Mehr; the file is not in the repository, and this is the
note that says where to start if that is ever revisited.

One trap found while measuring it, and it is this file's own lesson in
a new place: **Gulzar's Arabic subset contains exactly one Latin letter,
`A`.** So `AAOIFI` drew its two `A`s in Gulzar at 21px and `OIFI` in the
serif at 78% — one acronym, two faces, two sizes. Any Nastaliq brought
in here needs Mehr's `unicode-range` copied onto it on the same day.

**What Amiri costs, for the record.** 118KB on that article to draw
**26 glyphs** — the single line `باسمه تعالى و تقدس الجواب:`. A third
of the page's fonts for one line. Not a fault; a real Naskh for Arabic
quotation is worth something, and the fetch is demand-driven, so a page
with no Arabic never pays it. Written down so the price is known rather
than rediscovered.

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

**How a description is written, and it is not how a summary is written.**
The author asked for this in as many words — *they should not seem
typical AI words and style; humanize texts in a proper flow and manner
every time* — and he was right about the ones that were there. Prefer
**his own words** wherever he has written any: he had already posted a
caption for the vegetarianism fatwa, *"Can a Muslim give up meat
permanently? Short answer: it depends on why"*, and it was better than
the paragraph that had replaced it. Ask for the caption before writing
a description.

The tells, every one of them taken out of this repository rather than
from a list:

- **A prefix that explains the record to whoever maintains the site.**
  Three Urdu posts opened with *"The Urdu version: …"*. A reader meeting
  that in a search result or a WhatsApp preview learns nothing; it was a
  note to self, published.
- **Em-dash asides, stacked.** *"…shapes them — and Imām al-Ghazālī's
  five aims of the Sharīʿah are the measure for anyone who builds it:
  does this protect faith, life, mind, family and wealth, or damage
  them?"* Three clauses and a rhetorical question in one breath. Two
  plain sentences say it.
- **The "N things drawn from X" formula**, and the trailing three-item
  list that always follows it: *"Eight principles of employment drawn
  from … — judging character before hiring, deciding on evidence, and
  the employer's own duty of clear terms and gentle treatment."*
- **A semicolon catalogue.** The first version of the vegetarianism
  description put all four rulings, the animal-welfare section, the
  qurbānī section and the endorsements into one sentence. That is a
  table of contents, not a description.
- **Padding for the sake of a search engine.** A short true sentence
  outranks a long complete one.

What to do instead: short sentences, a full stop where a dash was
reached for, a colon only where a list is genuinely the point, and the
concrete thing named — the sūrah and the verse, the two qualities, the
one question the piece answers. The older descriptions in `content.js`
are the model, not the newer ones: *"Establishes the weight of a ṣāʿ in
modern units from Fatāwā Raḍawiyya, working through the tola and bhar to
a figure in grams"* says exactly what the booklet does and reads like a
teacher describing his own work.

Leave the **Urdu** alone unless the change is certain. Most of the Urdu
descriptions carry the author's own phrasing out of the articles
themselves, and a stylistic improvement made in a language you cannot
hear is a risk taken with somebody else's voice. Rewrite the English,
say plainly which Urdu was left as it stood, and let him point at any he
wants changed.

**A description shown to a reader follows the piece, not the site.**
`og:description` in `buildPost` and `buildWork`, and `shareCaption` in
`common.js`, all take `descriptionUr` first for an Urdu or Arabic record
and `description` first otherwise. An Urdu article carried an English
sentence under its Urdu title for months because the meta tags read
`record.description` and nothing else.

**A passage is set in the face its own words want, and for years the
record chose instead.** `proseMarkup`'s comment said it already — *"a
hint, not an instruction — the text itself decides"* — and the text
decided only the **direction**. The `language` hint still picked the
*face*, and the four Arabic-language works carry **Urdu** descriptions:
`bay-al-hayawan`, `bustan-bani-amir`, `al-ithaf-fazail-tawaf`,
`sai-ul-ifham`. So `descriptionUr` on each came out `class="arabic"
lang="ar"` — Amiri at **29px** where Mehr Nastaliq at **19** was wanted,
and Amiri is served, so that is what a reader saw. Reported from a
screenshot of the library row.

The same sentence was already right on the work's own page, because
`buildWork` passes `'ur'` by hand while `proseBlock` passed the record's
language. One sentence, two faces, depending on which page you read it
on — and the two pages share `proseMarkup`, which is where it is fixed
now, so a builder cannot be taught it and a renderer left behind.

**`scriptOf` lives in `common.js` now, and that is the actual repair.**
Telling Urdu from Arabic needs the letters Urdu added, and that function
was in `admin.js` alone — so the site's own renderers had *no way* to ask
a passage what it was, and had to ask the record. `common.js` could only
answer Arabic-script-or-Latin, which settles direction and nothing else.
`admin.js` keeps the name as an alias; a second copy is the drift this
repository has paid for twice.

The hint is still consulted, and must be: a line of ا, د and و belongs to
both alphabets, and nothing but the record can say which. So a genuinely
Arabic description on an Arabic work still gets Naskh — it is the words
that are asked, not the field's name.

`lang` is written from the same answer as the class. They were both from
the hint, so they could not disagree; the moment one was derived they
could, and a paragraph telling a screen reader one language and a
typeface another is a worse fault than the one being fixed.

The guard reads the **rendered** text, not `content.js`: a block counts as
Urdu when it holds more of the letters Urdu added than the ones Arabic
uses in their place. So it covers records added later and cannot be
satisfied by a field being spelt right. With the fault restored it names
all four and the count it reports does not move, which is what says the
selector still found everything.

**Mehr has no em-dash, and the patch was measured, looked at and not
shipped.** Reading its cmap: 211 glyphs, and neither `—` (U+2014) nor `–`
(U+2013). **73** of them sit inside Urdu text across `content.js`, the
posts and the works, every one drawn by whatever serif the device has —
the same shape as the superscript digits, which got a 1.4KB patch for
twelve characters.

A two-glyph subset of Aslam is 752 bytes and would have slotted in behind
Mehr the way `Ayn and hamza` sits behind Gentium. It is not here, because
rendering the same Urdu line with and without it at 19px and **looking**
shows no difference worth a file: a dash is a horizontal bar in every
serif, where a missing `ḥ` is a different letterform mid-word. The
measurement and the eye disagreed and the eye won, which is the same
lesson as `pretty` beating `balance` on paper and losing on screen — in
the direction that saves a font file rather than spending one.

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

**The same piece in two languages is two records joined by `alsoIn`.**
Each is a page to be read, so each has its own id and its own file — and
nothing joined them, which meant a reader arriving on one from a
forwarded link could not learn the other existed. The field names the
other record's id; `relatedOf` resolves it and a page is never written
from an id naming nothing.

**It is not only for posts, and three things said otherwise.** The
vegetarianism ruling is an English page and an Urdu one now — one record
carrying both PDFs meant a reader in either language scrolled past the
half they could not read, and the page printed its description twice to
serve both. Making that pair work took undoing three assumptions, none of
which was about `alsoIn` itself:

- `twinOf` would not resolve a target without a `page`. See above.
- `buildWork` wrote no cross-language line and no `hreflang` at all.
  `buildPost` had both; a work simply had never been asked for them.
- the **Also in** menu was inside the editor's `isPost` branch, so a
  fatwa could not be given the field even by hand.

The visible line and the `hreflang` trio are **one helper each**, called
by both builders, rather than the same markup typed into both — this file
already records what that costs, in the standfirst that was patched in
one builder and left in the other while the test went green.

**The href is `'../' + ownPage`, and the bare filename it replaced was a
latent `undefined`.** `buildPost` took the twin's filename off
`twin.record.page` with `split('/').pop()`. That resolves only while both
ends sit in the same folder, and a fatwa has no `page` — so the moment
the pair was not two posts it wrote `href="undefined"`. Both a post and a
work sit one folder down, so `../` + `ownPage` is right from either.

The guard **clicks the link** rather than reading the href, and that is
the point: restoring the old form writes `href="undefined"`, and the test
reports landing on `/works/undefined`. A string assertion would have had
to know to look for the word *undefined* to catch it.

`buildPost` writes two things from it: the visible line under the date,
and `<link rel="alternate" hreflang>` for both sides plus `x-default`,
which is the half a crawler reads to see one piece rather than two
unrelated pages.

**`x-default` is the English page, on both sides.** It answers one
question — where a reader whose language is neither should land — so the
two halves have to give the same answer, and for as long as pairing has
existed they did not: each named *itself*, which is two pages each
claiming to be the one fallback for the same piece. English is the
author's call, being the wider-reach of the two. For a pair with no
English side, which this library has not got yet, the helper sorts the
two ids and takes the first: arbitrary about which page wins, exact about
the thing that matters, which is that both sides compute the same answer.
Naming "the page being written" there would put the fault straight back.

The guard walks **every pair in `content.js`**, not the one that happened
to prompt it — the fault was never about fatāwā, it was in the helper
both builders call, and it had been shipping on five post pairs for
months. Restoring the old line fails all five. The visible line is written **in the language it goes
to** — whoever wants it reads that language, so offering it in the one
they are already reading helps nobody. That is not the "a kind is shown
in the language the record reads in" case: a kind describes this piece,
this describes the other one. And an Urdu link on an English page takes
`align-left`, the trap above in one more place.

The **Also in** menu writes the field on *both* records and clears both,
because a one-sided pairing is the failure that matters — the reader
crosses over and the far page offers no way back. `problems()` catches
the hand-edited cases: an id naming nothing, a mate that does not point
back, and a pairing between two records in the same language.

**`seeAlso` points one way, and that is the difference from `alsoIn`.**
A chart summarising a ruling names the ruling; the ruling does not name
the chart back, because it already carries the chart's own sheets in its
gallery — the far side offers the thing itself rather than a link to it,
and a return link would only send the reader where they came from. That
is why this one has no two-sided write and no "does it point back" check.
`alsoIn` needs both because two translations each hold half a piece.

Both it and `alsoIn` resolve through `relatedOf`. There were two lookups
until the vegetarianism ruling was split: `twinOf` served `alsoIn` and
insisted the target carry a `page`, on the reasoning — written down here,
and wrong — that *a translation pair is only ever two posts*. A fatwa in
two languages is a translation pair and has no `page`. The requirement
had never been about linkability, since `site.ownPage` gives every record
one; it was about the single shape the field had been used in so far.

`problems()` catches the two states a hand-edited `content.js` can reach
— an id naming nothing, and a record naming itself — and both were
proved by writing them in and watching the publish refuse.

**A title quoted as a reference keeps the serif, and `.text-link` takes
it away.** The first version of that line borrowed `.text-link` for its
underline and got DM Sans with it, so the record's own title was drawn in
the UI face while "See also" beside it stayed in Gentium. A title is the
author's words, not chrome: `.more-like li a` sets no `font-family` at
all for exactly that reason, and those two are the only places a title is
quoted rather than set as a heading. They must not disagree, so
`.work-seealso a` carries its own colour and rule and nothing else.

**A block's script may not disagree with the words in it, and "nobody
chose this" is not the same as "Enter made this".** `guessed` in
`admin.js` is the set of blocks whose script came from the line above
rather than from anybody, and `adoptScript` lets the first Urdu letter
turn such a line round. It was written for the line after an English
citation and it fixed that. What it did not cover is a block that was
never a guess — one read in from the file, or rebuilt after a paste, or
marked English by hand and then emptied. Put the caret in one, type
Urdu, and the line stays left to right for good. Every Urdu piece here
ends in English references, so it is one tap away.

The reader's word for that state is *the space bar deletes my word*. It
does not: the text is always right, measured with plain keys and with
IME composition both. What moves is the caret — a space at the end of
right-to-left words inside a left-to-right block is a neutral character
and takes the block's own direction, so it lands past everything just
typed. Measured across four keystrokes it went **52, 83, 52, 116**:
bouncing between the column's left edge and the middle. Corrected, the
same four give 315, 320, 292, 297 — marching leftwards, identical to a
block that was right all along.

`correctScript` closes it, and the narrowness is the whole design:
**Latin into Urdu or Arabic only, and only on the majority `scriptOf`
counts.** Three Urdu letters typed into an English reference entry still
leave it English — *a line read in from the piece keeps the script it
was saved with* is a real rule and still passes. A line that is
*nothing but* Urdu was never a decision. The other direction stays a
decision with a button behind it: an English term inside an Urdu
sentence is a term, not a change of language. And it reads
`state.language || prefer`, not the class alone — an unmarked block is
the piece's own language, which is what makes a marker unnecessary on
most of them; asking the element would have left every unmarked block in
an English piece out, and written a marker onto every block of every
Urdu post on first edit.

It waits for `compositionend` rather than running on `input` while a
soft keyboard is mid-word. Replacing the element an IME is composing
inside is how characters get lost, and the author writes on a phone.

**`tidy` runs on every keystroke, so it has to carry the caret.** It
turns anything that is not one of the blocks — a bare `div`, loose text
at the box's level — back into a paragraph, and it replaced the node and
restored nothing. Every other place in the file that replaces an element
measures the caret in characters first and puts it back:
`setBlockField`, `adoptScript`, `turn`. This one did the surgery and
dropped the selection **out of the writing box entirely**, which is what
the test reports with the fix taken out again.

A desktop almost never reaches the replacing path — well-formed blocks
leave nothing to tidy, which is why typing whole paragraphs a key at a
time through all twenty-one blocks of the Urdu post never showed it. A
soft keyboard does: Chrome on Android wraps what you type in a `div` of
its own whenever it dislikes the block structure. Then the caret was
gone and the next key landed wherever the browser had left the
selection.

**This is not a proven account of the report**, and it should not be
written up as one. The symptom could not be reproduced with key events
anywhere in that post — every space measured a clean +5px, wraps
included. What it is, is an unambiguous defect on the path every
keystroke takes, whose failure looks exactly like the thing being
described. `caretChild` is the one helper it needed: `caretBlock`
answers only for an element, and loose text is precisely what `tidy` is
there to clear up.

**A typed space must be a space, not a no-break space — and this was
the reported fault all along.** `white-space` on `.writing-canvas.post-body`
is `pre-wrap`, and that one line is *the space bar going backwards*.

At `normal`, a typed space is one the browser is allowed to collapse,
so every browser inserts **U+00A0** instead to protect it. Measured
mid-paragraph in the Urdu post: three presses left two no-break spaces
behind, and the caret moved **+3 to +5px rightwards** — backwards, in a
line that reads right to left — creeping the wrong way until the next
letter jumped it forward. NBSP is a neutral carrying no break
opportunity, so a run of them beside an em-dash (that paragraph has
two) is a long neutral run between two RTL runs, and where a caret sits
inside one of those is exactly what browsers are unreliable about. At
`pre-wrap` the browser inserts a plain `U+0020`, no NBSP is ever made,
and the same presses move the caret **−1px each — forwards**.

Safe because `bodyToHtml` keeps every block's text on one line, so
there are no newlines inside a block for `pre-wrap` to begin honouring;
the whitespace between blocks sits at the box's own level, where `tidy`
removes it before anything is painted.

**No published page was ever harmed** — something normalises the NBSPs
on the way out and all six posts hold none. It was only ever the
experience of typing, which is the part nobody had measured. Hence how
long it took: the text was always right, `selectionStart` was always at
the end, and **no assertion about the string could see it**. Three
rounds went looking in `admin.js` for something that was in
`admin.css`.

**What that cost, and the lesson.** Two other real faults were found
and fixed on the way — a block marked English holding Urdu, and `tidy`
dropping the caret — and neither was this one. Both were reported as
though they might be, which was fair at the time and wrong. When a
reader says *the caret goes the wrong way*, **measure the caret, in the
direction the script runs**, before anything else; and when a symptom
survives two plausible fixes, the next move is not a third guess but
the reader's own screenshot of the exact spot, which is what finally
placed it.

**Not every space that jumps is ours, though.** In a correctly marked
Urdu block a space typed after an *English term* — `board`, `legal
entity` — still leaps to the far end of the line. That one is Unicode
bidi's L1 rule: trailing whitespace takes the paragraph's embedding
level. `unicode-bidi: isolate`, `plaintext` and wrapping the Latin run
in `<bdi>` were all measured and none of them changes it. That is a
different thing from the NBSP fault above, and it is genuinely not
fixable here.

**Every control in the bar acts on the range the box remembers, and the
fix went on the thing they share rather than on the one that was
reported.** *The Size menu is not changing the size of an inline
citation* — and it **could not be reproduced**, which is worth writing
down as plainly as a fix: in headless Chromium here, on that exact run
inside the `<b>` of `درر الحکام`, opening the menu leaves the words
selected and the mark lands, with `selectOption`, with the select
focused first, and with a real click on it.

What is not in doubt is the asymmetry the report points at. A toolbar
**button** acts on `mousedown` and calls `preventDefault`, with a
comment beside it saying in as many words that by the time `click` fires
the box has lost the selection. A **`<select>`** has no such defence:
its popup is the platform's and takes focus how it likes, and there is
no event to prevent. Three rounds of fixes had each gone on the control
that was complained about. So the box now holds the last range that was
inside it — cloned, from `selectionchange` on the document, which is the
only event that fires for every way a selection can move, a soft
keyboard's own handles included — and `markSelection` restores it before
doing anything. Who has focus stops being a question each control
answers for itself.

**And the half that is the whole complaint: four of the five ways a size
could fail returned in silence.** Nothing picked out, a selection
crossing two blocks, a step already on, a range the box no longer owns —
each one did nothing and said nothing, which from the outside is
indistinguishable from a broken control. That is what *half-baked band
aids* describes, and no amount of making the happy path work would have
answered it. `markSelection` returns an outcome now and the bar says
why.

It says it in the line `writingBox` was **already creating, styling,
returning — and that nothing had ever written to**. A second element was
added beside it first, which redeclared `var note` in the same scope, so
the sentence landed in whichever of the two the closure happened to hold
by the time a handler ran, and `.writing-note` had two competing rules.
The guard counts the lines in the bar for that reason. It also holds its
height whether or not there is anything to say: on a phone, where the
box fills the screen, a line that comes and goes lurches the page under
the caret.

The two guards take the selection away in a way the editor cannot
defend against — `blur()` on the canvas and focus moved to another field
entirely, which is stronger than anything a popup does — and then assert
the mark still lands. The second presses Larger on a collapsed caret and
reads the sentence back. That second one is the guard that would have
caught the whole class, and it is the one that could not have existed
while a failed press was silent: there was nothing to assert.

Both faults were restored and the run reports **exactly two** failures —
the mark not landing, and the bar going quiet. The third assertion
beside them, *takes the sentence back once a press works*, passes
vacuously in that state: an always-empty line is always clear. It is a
companion, not a guard, and the comment beside it says so.

**A box you type Urdu into has to take the script too, not only what it
writes out.** The tag box was the plainest case: each finished pill
already took the script it was written in — the comment above `draw()`
says why — while the input the tags are *typed into* stayed left to
right. Every tag in this library is Urdu, `سورۂ زخرف` has a space in
it, and a space at the end of RTL words inside an LTR box lands on the
far side of them and takes the caret with it. It follows the content
now, the same `follow` as `lineInput`, falling back to the *record's*
language rather than English so an empty box on an Urdu post already
reads right to left.

The boxes that stay Latin are the ones holding a path, an id, a version
or the English half of a paired description — probing every text box in
the editor turned up 317, and those are the only ones that should not
follow what is typed into them.

**The editor has two addresses and only one of them can publish.**
`admin.html` is committed, so GitHub Pages serves it at the public
address as well; `BACKEND` is set only over https on `admin.`, where the
Worker holding the GitHub token is. The two copies are identical to look
at, and the difference showed up at the one moment it cost most — a
Publish asking for a token nobody had on them, read as the editor
malfunctioning. `checkAddress` says so on load, and the token dialog now
says why it is asking. Same rule as the Worker's own errors: an error
should name its own remedy.

**The toolbar's order is a claim about what is reached for while
writing.** On a phone it is one rail that swipes sideways — deliberate,
because stacked it stood 380px tall on an 820px screen — and the rail
holds about **312px** before a swipe. So the order decides what is
usable without one.

Style led, and at the 132px "Sub-heading" genuinely needs it and Script
filled the rail between them: Underline ended **18px past the edge**, so
all three emphasis marks needed a swipe. They are reached for constantly
— this library's Urdu is full of English terms — while Style is once a
section and Size and Align rarer still. Script and Emphasis now lead,
which puts B, I and U 134–224px inside the rail with Style still 100%
in view beside them.

Shrinking the controls was the first answer and it was wrong twice:
at a 120px cap "Sub-heading" needs 88px of the 80 left after the padding
and the arrow, so the control can no longer say what the block is — and
the buttons are already narrower than a fingertip at 21–29px. **Ordering
costs nothing and takes nothing away.** The gap (6→4) and the group
separator (6+2→4+1) were kept; they are worth 12px between them and
nothing reads differently for it.

**A control has to be able to show what it is holding.** Size's options
read *One step smaller* and *One step larger*, which need 119 and 109px
of the 104 a phone gives that menu — so the only value that fitted was
the one most words are *not* in, and the other two were shown cut off.
They are *Smaller* and *Larger* now; the menu's own name says Size, in
the label on a desktop and in `aria-label` everywhere, so the options do
not have to repeat it and the full sentence stays on each one's title.
`test/editor.mjs` measures every option of every menu against the box
showing it — which is what caught the 120px cap above.

**A field the order in `finish()` forgets floats to the top.** `alsoIn`
did: the least-used control on a post sat above its Language and Title,
81px of the 248 between the row's summary and the writing box. Same
shape as a field missing from `writeRecord`, so the same answer — the
named order first, then **anything else still in the box**, which lands
a forgotten field at the bottom where a field nobody has thought about
belongs.

**The toolbar does not hide the caret, and `scroll-padding-top` is why.**
It is `116px` on the root, for the 55px bar plus the 51px rail, and a
screenshot mid-scroll shows static text behind the sticky rail and looks
like a fault. Measured: **0 of 40** caret positions overlapped it. Do
not go looking for this one either.


**A fatwa's answer is a numbered list, and the writing box had none.**
Asked for as *extensive formatting options like my pdf fatawa*, and
answered by reading one rather than guessing: `zakat-tax-credit-urdu`
has an `الاستفتاء`, a named questioner, `الجواب بعون الملك الوهاب`, the
ruling **in numbered points**, Arabic quotations in Naskh with their
citations in the quieter register, `یعنی` renderings in Urdu, and a
two-column attestation with seal and date. Of those, the box already
had the quotation (`blockquote` + عربی), the citation (`.footnote`) and
the headings. What it had no way to write was the **numbering** — which
is the shape of the answer itself.

**An item is a `p` in the box and an `li` in the file, and that
asymmetry is the design.** Every block in the writing box is a direct
child of the canvas: `caretBlock` walks up to it, and `tidy` rebuilds
anything whose tag is not in `BLOCK_TAG`. Real `<ul>`/`<li>` nesting
breaks both, and with them the caret handling this file has already
paid for twice. So an item is flat while it is being written, told
apart by its class exactly as a footnote is, and `bodyToHtml` gathers a
**run** of them into one real list on the way out. A reader's page gets
proper markup — "list, three items" to a screen reader, the numbering
the browser's rather than typed into the words.

**One function filled both, and teaching it the page broke the box.**
`bodyToHtml` writes the published page *and* fills the canvas through
`setText`. The first version gathered items into an `<ol>` for the page
and forgot the second caller, so the canvas received a list element,
`tidy` tore it down, and the items came back as one mashed paragraph.
Written, published, reopened: **three items in, zero out.** The
generated markup was perfect throughout. Only the round trip — box →
file → box — showed it, which is why the guard does exactly that
instead of reading the markup and calling it correct. `flat` is the
parameter that separates the two jobs.

**`display: block` is what was eating the numerals.**
`.post-body .urdu { display: block }` exists so an inline script-marked
run takes its own line — and it matches `li.urdu` too, which turns the
item into a plain block. **A marker is only ever drawn on a list item.**
The computed `list-style-type` read back correctly the whole time and
the page drew nothing: the markup was right, the stylesheet was right
to read, and the page was wrong. Found by rendering the list and
**looking at it**. `display: list-item` is put back at (0,2,1) rather
than narrowing the rule above, which would change what an inline run
does for a reason that has nothing to do with inline runs. The guard
compares **ink** — the same element with its marker suppressed must
look different — because a declaration assertion would have passed on
the broken page.

**`urdu-points` is declared rather than borrowed.** CSS's built-in
`urdu` counter numbers ۱ ۲ ۳ and follows them with a Latin full stop;
the fatāwā write `۱۔` with the danda. Same argument the guillemets and
the brackets already make: the punctuation belongs to the script around
it.

**What this does not yet reach, said plainly.** The attestation block —
کتبہ, الجواب صحیح, the muftī's name and title, the institution, the
reference number, the two calendar dates, the seal — is a *structured*
thing and belongs in fields, the way an app's `verifiedBy[]` already
does, not in free writing. And a fatwa still has no written page at
all: `isPost` gates the writing box on `record.page`, which a fatwa
does not carry, so today these lists can only be used in a post. Both
are real next steps and neither is started.

**The editor had no undo, and that is not a missing convenience.**
Asked for as *all the working functionality of a basic word processor
— fonts size paragraphs spacing bullets alignment styles language
direction*. Measured against what the box already had — script, bold,
italic, underline, five block styles, two size steps, four alignments
and lists — the two real gaps were **undo** and the inline marks.

Almost every edit in this editor is **direct DOM surgery outside the
browser's own stack**: `setBlockField`, `turn`, `adoptScript`,
`correctScript`, `tidy`, `splitBlock` and `pastePlain` all replace
elements wholesale, and the stack a browser keeps is a record of *its*
edits, not ours. So Ctrl+Z was not merely absent — it was
**unpredictable**, undoing a keystroke from before a block was turned
round and leaving the box in a state the document had never been in.

**What is remembered is the body text, not the box's HTML.** That is
the document's own representation — the thing `bodies` holds and a
file is written from — so a restored state cannot reach a shape the
format could not have stored, and `bodyToHtml(…, flat)` puts it back
exactly as opening the post would. An innerHTML stack would also carry
the browser's own scratch markup back in. The caret is kept as a block
index and a character offset, the pair every other replacement here
already measures, because the elements are rebuilt and remembering a
node would remember nothing.

A step is a **burst of typing**, not a keystroke — 700ms of quiet
closes one, and any toolbar press closes the open step first, so a
press is always its own step. Otherwise a word typed just before
pressing Bold is undone along with it. The stack is capped at 80: it
lives in a phone's tab for as long as the piece is open.

**Buttons, pinned beside the rail rather than in it.** An undo that
exists only as Ctrl+Z exists for nobody who writes on a phone, which
is who writes here. And it is the one control reached for *when
something has already gone wrong* — the worst moment to ask somebody
to go hunting along a rail — so it sits outside the scroller. That
meant splitting the bar into a pinned group and a `.writing-rail`
that is now the thing which scrolls.

**Raised, lowered, struck through, and Plain.** Four marks a person
coming from Word reaches for without thinking, and none existed.
Raised has a real job in this library: a post's references are
numbered **in the words themselves**, which is why this repository
carries a font subset patched to draw all ten superscript digits. A
`<sup>` numbers anything, not only the ten somebody thought to patch.
They are one menu rather than four buttons for the reason Size is a
menu — it can show what the words are already in — and because four
more buttons would push Bold off the phone's rail.

The codes stored are `~ ^ _`, the characters every markup language
already uses for these, so a stored body can be read by eye.
`inlineCode` folds `<s>`, `<strike>` and `<del>` into one mark:
Chromium's `strikeThrough` writes `<strike>`, other engines write
`<s>`, a paste can bring `<del>`, and the file is written back as
`<s>` whichever arrived.

**Three faults found by running it, not by reading it.**

- **`removeFormat` empties a tag and leaves it.** Plain left
  `marked<b></b> up heavily` — invisible, and not nothing:
  `inlineToText` reads it as a mark with no words in it and writes
  `<b></b>` into the published page. Empty marks are dropped in the box
  *and* again in `inlineToText`, which is the one path every block takes
  to a file, so whatever leaves one behind cannot get it into a page.
- **The new marks went silent on a collapsed caret.** `execCommand`
  sets a *pending* style — nothing moves, the next letter typed comes
  out raised, and the press returns success. That is precisely the
  silence this bar already had to be fixed for once. The Mark menu now
  says *Pick out the words first*; the **B/I/U buttons keep** the
  pending behaviour deliberately, because pressing bold and then typing
  is what a button is for.
- **The menu read-back named the two size codes literally.** A second
  inline menu therefore reported the *size* of the words instead of its
  own mark, with every assertion about the tag still passing. Three
  assertions go red with that one line put back.

**`line-height: 0` is the whole of why the `sup` rule exists.**
Without it the browser counts the raised box's own line box into the
line it sits in, so one reference numeral opens that line. Real here:
the Urdu body is 21px at 2.15 and the line pitch is 45px, where a
single grown line stands out at once. `vertical-align` does the same
thing even with the line-height taken away, so the shift is
`position: relative` and an explicit offset instead.

**The rail is now at its limit, and that guard was re-argued rather
than relaxed.** *Style is mostly in view* asked for **80%**; measured
at 390px it is **46%**, because the bar carried five groups and now
carries six with two pinned ahead of all of them. The floor is a
third, with ten points of room, and the assertion is still named for
**Style specifically** rather than "something is cut" — something is
always cut, and the control that has to be findable is that one. What
it does *not* cover is Underline being pushed off, which the assertion
above it covers and which still fails if broken.

Two numbers worth keeping: with the Mark menu placed **before** Style
the figure is **0%**, which is how the ordering was settled; and the
guard now measures against the **rail's** right edge rather than the
bar's, since those stopped being the same box. The next group added
will not fit, and the answer then is **a second row on the phone** —
the four-row stack this file records rejecting was 380px tall, and two
rows is about 92. Do not buy the width by narrowing the buttons; they
are at the tap minimum and that was tried and measured once already.

**Two of the new guards could not fail, and both were caught the same
way.** Restoring a fault in the **key handler alone** left every
assertion green, because all of them pressed the buttons — the keys
are a second path to the same two functions and needed a guard of
their own.

And the assertion that the stack winds forward again asked whether
Redo had greyed itself out, which is true the moment there is nothing
left to redo **including when the stack was thrown away**. That is
exactly what happened: an edit made while the history is wound back
clears the redo stack, deliberately, the way every editor does — and
the key test was sitting between the rewind and the wind-forward,
doing precisely that. The piece never came back, *the marks reach the
published page* failed three groups later, and the assertion written
to catch it reported success. It compares the **box** against what was
in it before now.

That comparison also has to be taken at the **top** of the stack. With
one undo still outstanding above it, winding fully forward correctly
replays that undo and the comparison fails on a perfectly restored
document — which it did, reporting `after 53 presses the box is not
what it was`. **Eighty blocks compared, one differing, and that one
was the test's own trailing keypress.** Which is also the measurement
that says the restoration is exact rather than approximate: the other
seventy-nine came back byte for byte through fifty-three replays.

**Two more of the new guards said nothing, and for two different
reasons.** Running the whole set of restorations is what found both;
neither was visible from the assertions.

Taking the history buttons out of the bar **crashed** the run — a
30-second Playwright click timeout, a stack trace, and no account of
which assertion had broken. That is this file's own lesson about a
guard that threw inside the page rather than going red, in a second
place: a crash reads as the harness being broken, not the code. Both
controls are found before anything presses one now, and the same fault
reports **four** named failures.

And the second layer that keeps an empty mark out of a file — the one
in `inlineToText` — failed nothing, because with the box cleaned there
is no empty mark left for it to catch. It was a claim with no test
behind it. The answer is the move the ayn patch already makes for a
combination this library has not written: **put the thing into the
page by hand and measure it**, rather than inventing a way for the
editor to produce one. The block is removed again afterwards, and that
is not tidiness — the round-trip group compares the box against itself
after a publish, and an empty mark is deliberately present on one side
of that comparison and absent on the other.

The whole set, with each fault put back one at a time: the menu
look-up reports 3, the keys 1, the collapsed caret 1, the box cleanup
1, the file cleanup 1, the pinned buttons 4. Before the last three
guards existed those faults reported **0, 0 and a crash**.

**A divider and a link, which are the two of the four that a fatwa
actually needs.** A ruling puts a break between the question and the
answer; a scholarly article cites a source that lives at an address.

**A divider is the box/file asymmetry a third time**: a `p.rule` in
the BOX, an `<hr>` in the FILE. An `hr` cannot be a block here at all
— it is void, so `fillEmpty` cannot give it the `br` that lets a block
hold a caret, and `tidy` keeps a child only when its *tag* is named in
`BLOCK_TAG`. A paragraph carrying the class is both things a divider
has to be: a line the caret can step over, and a rule drawn across the
column. Stored as `---`, the spelling every markup language uses and
one no sentence reaches by accident.

It is `contenteditable="false"`, because nothing typed into it would
survive — the file writes an `<hr>`, which carries no words. A block
that silently drops what is typed into it is this file's own *button
that does not do what it says*. And turning a line that **had** words
into one takes them, which is allowed now that undo exists and is one
press away — but it is **said**, because a paragraph vanishing under a
press otherwise reads as the editor eating it.

**The guard found the fault that made it unusable.** With the caret
put into the rule — which cannot hold one — the next key landed
wherever the browser had last left the selection, so *you could not
type under a divider*. The caret goes to the line after it now, and
one is made when there is none: inserting a rule at the foot of a
piece has to leave somewhere to go on writing.

**A link is the one mark that carries something besides itself.** The
others are a single letter between OPEN and the words; this one is
`OPEN a <href> UNIT <words> CLOSE`, with a third control character no
keyboard produces holding the address apart from the text. A second
table keyed by some id was the alternative, and that is a second place
for the two to drift apart.

Three things that needed saying in code rather than reasoning:

- **`withoutMarks` strips the address first.** It is the only mark
  whose opener is longer than two characters, so the general rule
  below it would take the `a` and leave the whole URL — and the search
  index would fill up with them.
- **`safeHref` refuses anything but http, https, mailto and a plain
  relative path.** The editor publishes straight to a page anybody can
  open, so a `javascript:` href is a different class of thing from a
  link that goes somewhere. Refusing **says why**, because a reader who
  typed one and saw nothing happen concludes the control is broken.
- **A body hand-edited into a state with no unit separator** would
  otherwise swallow the rest of the piece into an href. A missing one
  drops the mark instead.

It is in the **Mark menu**, not a sixth button: the rail is full —
Style is 46% visible at 390px — and a button here pushes Bold off it.
`prompt` asks for the address, which is the one dialog a phone draws
itself; a written one would have to be built, placed, dismissed and
kept above a soft keyboard, which is the Download lesson in a new
place and worth more than this control is.

`.post-body a` did not exist, because no piece could carry a link — so
one would have been drawn in the browser's blue with a hairline under
it, on a cream page whose every other link is moss over a 2px rule.
Matched to `.work-seealso a`, the only other place a link sits inside
prose, and setting no `font-family` for the same reason: the words are
the author's, not the site's.

**The crash-instead-of-fail lesson, in a third place.** Restoring the
divider's caret fix reported **no failures** and then died four
assertions later inside `pickOut`, on a Playwright stack trace naming
the helper rather than the fault. `pickOut` threw when a block held no
text node — which is exactly the state the fault produces. It selects
the block itself now and the run survives, and the same fault reports
**ten** named failures, the first being the assertion written for it.

Two harness notes worth keeping. The suite's one dialog handler treats
every dialog as an error, which was right until a control legitimately
asked a question; it has a slot a test fills just before pressing
Link, cleared as it is used, so an **unexpected** prompt still fails
the run. A `page.once` beside it does not work — both handlers answer
and the second throws *Cannot accept dialog which is already handled*,
which kills the run and reads like the editor misbehaving.

With each fault put back: the divider written as a paragraph 1, the
divider unread on the way back in 1, the caret 10, an unchecked
address 2, the link's payload dropped 1, the link toggle 2.

**Sub-points, and a bigger gap after a block.** The last two of the
four. A ruling is built from points with sub-points under them, and
the box held every item at one level.

**An item's level is the box/file asymmetry a fourth time.** Flat in
the box with a class saying which level it is; real nesting in the
file — and real nesting in HTML means the inner list sits **inside**
the `li` it belongs to, not beside it. So an item's `</li>` cannot be
written until it is known whether a deeper item follows, which is why
that is a small state machine rather than a map over the run.

`inlineToText` had to learn to **skip a nested list**. Without it
every sub-point is read into the words of the point above it, and a
ruling comes back as one run-on line.

**Two steps and no more.** Nothing here has ever carried a
sub-sub-point, and an unbounded ladder is a column with no room left
in it on a 328px phone. Indent and Outdent **step** rather than
toggle — `setBlockField` toggles a field off when the value pressed is
the one already there, which is right for Quote and wrong here, where
pressing twice has to mean two steps. They say when they are at an end
rather than going quiet, and they carry no `aria-pressed`: a step has
no state to be in, and marking one pressed would claim the block is
indented when all it means is that the button exists.

**The box needs a second counter.** It numbers its own items, because
the real `<ol>` exists only in the file — and one counter runs 1 2 3 4
straight through, telling the author their ruling is numbered in a way
it is not. `counter-reset` scopes to the element *and* its following
siblings, which is what makes each run of sub-points start again.

**Extra space is one bounded step, not a menu of sizes.** The 1.6em
between paragraphs is not a taste but a measurement — half of it
stopped reading as a paragraph break at all in Nastaliq, which this
file records — and a control offering arbitrary spacing invites a
piece to drift out of the setting the whole site is in. One step says
*a bigger break here* and cannot say anything else.

**And that class was a lie until the rule above it excused it by
name.** `.post-body.urdu > p:not(.latin)` is **(0,3,1)** against the
class's **(0,2,0)**, so the button left exactly the gap it always did:
measured **33.6px before, 67.2 after**. Exactly the pattern the
alignment defaults already use, and the reason they name their
exceptions in the selector that sets the default rather than reaching
for `!important` elsewhere.

**The marker guard had to measure ink, and then had to look in the
right place.** `getComputedStyle(el, '::before').content` returns the
**declaration** — both sub-points read back
`counter(writing-sub, urdu) "۔"` whether they draw ۱ ۲ or ۱ ۱ — so the
first version compared two identical strings and went red on a box
numbered correctly. A test looking at the stylesheet while claiming to
look at the page, which is the list marker's lesson in a second place.

The screenshot that replaced it clipped the **padding** rather than
the marker: in a right-reading block the numeral is the first thing in
the *content* box, which begins where the padding ends. Two blank
images, equal, **144 bytes each** — and a solid-colour PNG at that size
is the tell.

**A group that adds to the piece changes what a later group counts.**
This one writes six blocks, and a later group counted every `<ol>` on
the published page and asserted one. It reported `3 lists` and read as
a regression in the gathering, which it was not. That assertion now
finds **its own** run by the words it was written with — count what
you matched.

**The file→box direction was measured by nothing, and three attempts
at it failed before one worked.** Everything above goes box→file; the
other direction is the one this file names as worth the trouble, and
two faults restored in it — a sub-list read into the words of the
point above it, and the depth never written into the body — failed
**nothing**.

- Setting the page's markup into the canvas and raising an edit does
  not do it. `changed()` runs `tidy` first, which rebuilds the `<ol>`
  into a paragraph before `htmlToBody` sees it: the probe reported 0
  items on an editor that was working.
- Leaving the blocks in the piece for *the piece read back is the
  piece that was written*, near the end of the suite, does not either:
  a later group reloads the editor, and a reload discards a box that
  was never published. Measured — the words are not there by then.
- So the round trip lives in the group that owns the feature: write
  the file, serve it back through the overlay, **open** it. That is
  the real path — fetch, parse, `htmlToBody`, `setText`.

**And it must compare the WORDS, not the box's innerHTML.** That
comparison was tried and needed three excuses in one assertion — a
`<strike>` normalised to the `<s>` the format stores, an empty
trailing paragraph the file rightly does not publish, and a `style=""`
the browser leaves on a non-editable block. **Three excuses is the
signal that an assertion is measuring something other than its name.**
The same comparison is correct near the end of the suite, where the
box has been reloaded and carries no scratch.

**It found a real disagreement first, though.** A divider built from
an Urdu paragraph kept `urdu`, `lang` and `dir`, while the file writes
a bare `<hr>` that can carry none of them — so the box and the file
said different things about the same block. `makeBlock` builds a rule
clean now. Nothing but opening the written page again could have seen
that.

Both toolbar additions went into the **Layout** group — renamed from
Align, since it is about where the *block* sits now and not only where
its words sit — rather than into a seventh group, because a seventh is
what needs the two-row rail. Style is still visibly cut at 390px.

**Not reached, and not started:** no font-family control and no point
sizes, deliberately — the face follows the script and the sizes are
steps, which is this file's own typography doctrine and not an
omission. And a fatwa still has no written page at all, since `isPost`
gates the writing box on `record.page`, so everything in these four
sections reaches posts only.

**A guard that inspects only what is marked cannot see what is not.**
A post's references are the quieter register — `.footnote` is 17px
against a 21px Urdu body — and a block that loses that mark falls
through to the size an Arabic *quotation* gets, 23px. The references
then come out **louder than the article they annotate**. All seven on
the Urdu article shipped that way, because pasting rich text into the
writing box brings the words and not the marks.

`test/homepage.mjs` measures every `.footnote` against the prose it
sits in, and with the class gone there was **nothing left to measure**:
the count fell from sixteen to ten and the assertion passed, green.
That is the general lesson and it is worth more than the fix — a test
keyed on a class is blind to the absence of that class, and the count
it reports is the only thing that would have shown it.

So the check is `unmarkedReferences` in `admin.js`, inside `problems()`,
where a publish is refused and the piece is still open to correct. Two
signals, both deliberately narrow, because it **blocks**:

- the line opens with a reference numeral (¹ ² ³ …), which no ordinary
  sentence does, so it needs no other evidence and holds anywhere;
- the line sits in the closing run after a References heading **and is
  in the other right-to-left script** — Arabic inside an Urdu piece, or
  the reverse. That is the state that renders *upward*. This is what
  catches a reference carrying no numeral at all.

The scripts must be the RTL pair, not merely different: English inside
an Urdu piece is already quieter at 15px through `.post-body .latin`,
so the shares post's fourteen English entries read correctly whether or
not they are footnotes. Headings and quotations inside the reference
section are skipped — that post groups its entries under four of them.

**Every narrowing above was forced by running it over the whole
library, not reasoned out.** The first version flagged two posts that
read perfectly well; a check that refuses to publish the library as it
already stands is a check nobody can keep, and the temptation is then
to delete it rather than narrow it.

**A standfirst is a field, not the first block of the writing.**
`subtitle` on a record becomes `.record-subtitle` in the hero, directly
under the title and above the date. Written as the opening block of the
piece instead — which is where it had to go while there was no field —
it landed **82 to 95px** below the title with the date *and* the
cross-language link between it and the line it belongs to.

The workaround reached for instead is the tell: the Urdu article's
subtitle was appended to its **title** with a hyphen. That makes the
title long enough to wrap, and carries the subtitle into the share
card, the library row and the browser tab, none of which want it. It is
12px under the title now, with nothing in between, and the title is
short again.

It takes the **piece's** script, not `scriptOf` of its own words: a
standfirst is the author's sentence about their own article, so it reads
in the language the article is in even when it quotes a term in another.
And it is not the description — a description is written for somebody
who has *not* opened the piece, and is what a card and a search result
show.

**Its own margin rule was the RTL trap again, in one more place.**
`margin-inline-start: auto` was written on it to hold the box at the
page's margin. In a right-reading hero the inline *start* is the right —
the edge Urdu begins on — so `auto` pushed it away from exactly the edge
it had to sit on, and the stacked-pairs guard measured the standfirst
**496px** adrift of the date beside it. There is no margin rule now: a
block narrower than its container already sits on the start edge, which
is the right one in an RTL hero and the left one in an LTR hero.

**A fatwa answers a situation, not only a sentence, and there was
nowhere to say what the situation was.** `background` / `backgroundUr`
is several paragraphs on the record's own page, between the description
and the file buttons. It exists because neither of the two things that
were there would hold it: a description is one line written for somebody
who has **not** opened the piece, and a work has no writing of its own
the way a post does, because a work's words live in its PDF.

An array in `content.js`, the shape `about.bio.prose` already uses, and
a blank line between paragraphs in the editor. Not the writing box: that
is for a piece whose text carries marks, and this is plain prose.

**Four things about it were wrong on the day it shipped, and a review
found all four.** They are worth keeping together, because every one is a
rule this file already states, broken within a few lines of where it is
written down.

- **The boxes were offered on a post and an app**, which nothing renders:
  only `buildWork` writes a background. Type one and `writeRecord` stores
  it in `content.js` and the page never shows it. The Urdu standfirst
  three fields above had the gate for exactly this reason, added the same
  afternoon. *A field the form offers and the page ignores is a button
  that does not do what it says* — and it was broken beside its own
  statement.
- **A hand-written string threw.** `background: "one paragraph"` is the
  obvious thing to type into a hand-edited `content.js`, and a string has
  a truthy `.length`, so every `x && x.length` guard waves it through and
  the `.join` or `.map` behind it dies — the row mid-render, the publish
  mid-build, with no sentence naming the record. Proved by writing one in
  and watching the Files… dialog never finish.

  `paragraphList` reads it as the one paragraph it plainly is, and
  `writeRecord` serialises what it was given, so **the file repairs its
  own shape on the next publish**. Refusing it in `problems()` was the
  other option and is worse: a check that refuses what it could simply
  understand makes work for the author instead of doing it.
- **The heading took its script from the field, the prose from the
  words.** `proseMarkup` asks the text; the heading asked which of the
  two fields it was sitting in. Put Urdu in `background` — nothing stops
  you, the names are a convention — and an `ltr` heading, pushed to the
  column's left by `margin-inline-start: auto`, sat above its own
  flush-right Urdu paragraphs. Measured both ways: pre-fix
  `lang="en" dir="ltr">Background` over two `dir="rtl"` paragraphs,
  after it `lang="ur" dir="rtl">پس منظر`. It is `scriptOf` of the prose
  now, with the field only as the fallback for when the letters are
  silent — and being a *majority* count, one Urdu paragraph among two
  English ones correctly leaves the heading English.
- **The measure was copied from the wrong neighbour.**
  `max-width: min(62ch, 100%)` came from `.work-page-description`, where
  it caps a single line. Measured on the combination: **731px as it
  stands, 507px with the cap put back**, against the same right edge — so
  the placement was never wrong, only the width. 43em is the
  70-character column; 507 is the cramped one the whole `ch`-to-`em`
  migration existed to remove.

  That rule has **no page to stand on**: each record carries a background
  in its own language only, so an English one inside a right-reading hero
  is a combination the site has never written — and it is the combination
  the rule is *for*, which is how a rule rots. The guard puts the block
  there itself and measures it, which is cheaper than inventing a record
  to hold it.

**Above the buttons at the author's word, and it costs two screens.**
Measured at 390px on the Urdu ruling: the background runs 519→1269 and
the Read PDF button went from 519 to **1291**. That is the trade he
asked for — a reader meets why the question is being asked before
deciding whether to open sixteen pages — and the number is here so the
next person knows what it buys and what it costs. Moving it below the
buttons is a one-line change in `buildWork`.

**The register is carried by the ink, not the size**, and the first
guard asserted the wrong one. It said the background must be *larger*
than the description, which is false about what was built: on an Urdu
page `.work-page-description.urdu` is already 21px, the body size, so
both are 21 and the assertion failed on a page that reads correctly. The
description is muted `#4b5852`; the background is in the body's ink. That
is what makes one a caption and the other prose, and it is what the guard
measures now.

**A record can be named in two languages at once, which the standfirst
could not express.** It takes the **piece's** script by design — the rule
written up with the field — so the four-cases chart, three English sheets
and three Urdu, could carry one name or the other and not both.
`subtitleUr` sits beside `subtitle` exactly as `descriptionUr` sits
beside `description`, and `ایک نظر میں` is the author's own name for that
chart.

Written by `buildWork` alone. **The editor offers it only where
`buildWork` writes the page**, and that was found by measuring rather
than reasoned out: on a post the control pushed the writing box to 359px
against the 300px bar `test/editor.mjs` holds, for a field a post can
never use — a post is one language and reaches its other half through
`alsoIn`, which is a whole second page rather than a second line. A field
the form offers and the page ignores is a button that does not do what it
says, which this file already records in the other direction.

**The guard that proves it and the guard that cannot.** Taking
`align-left own-edge` off that Urdu standfirst fails the class assertion
and **passes** the measurement, because `ایک نظر میں` is eleven
characters and fits one line — and a one-line Urdu block renders
identically with and without `align-left`, which this file says in as
many words. The measurement is there for the day a standfirst wraps,
which is exactly when the classes start doing work. Neither covers the
other, so neither comes out.

**A new field has to be added to `writeRecord` or a publish drops it.**
`alsoIn` was written into `content.js` first and the next regeneration
threw it away silently — `buildContent` serialises a listed set of fields
and nothing else. *The content.js it writes is the content.js in the
branch* in `test/editor.mjs` is what caught it, and is the guard for
every field added after this one.

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

**The site has three navigational surfaces, and two of them are new.**
`fatawa/index.html` and `author/index.html` are generated whole from
`content.js` on every publish, the way a work's page and an app's page
are — every ruling on one, the `about` block on the other. There is no
writing to read back and therefore no "has this changed" question, which
is why neither is spliced between markers the way `index.html` is.

They exist because the site had **one** surface. Every record already had
a permanent page and a sitemap line; what there was no way to do was ask
for *the fatāwā*, or link a reader to the author's profile on its own.
Both were a scroll down the homepage and nothing else.

Neither page introduces a class of its own, and that is the measure of
whether a new page belongs. `.intro` and `.rulings` are whole sections
carrying their own full-bleed padding, so each page is a `<main>` with
one of them inside it and the design is already right. What did need
saying in CSS: the back link on the dark panel is `--gold-on-dark`
(`--moss` is unreadable there — the two golds exist for this and must
never be collapsed), `.intro h1` beside `.intro h2` and `.bio-heading h2`
beside its `h3`, because the same block is a *section* of the homepage
and the *whole* of its own page, and a heading must not change size for
that reason.

**A page in the sitemap that nothing links to is an orphan.** Both are
linked from the homepage — `author/index.html` from inside the generated
`editor:about` region, `fatawa/index.html` from the hand-written rulings
section. `test/homepage.mjs` asserts both links, because `index.html` is
generated and a builder that quietly stopped writing one would take it
away with nothing to show for it.

**The header is one function now, and `nav-echo` is not what a generated
page wants.** `pageNav` in `admin.js` writes the banner for every
generated page; there were three identical copies of it, which is three
chances for one to go on pointing at the old place the day Author and
Fatawa stopped being anchors.

On the homepage `nav-echo` hides Library and Fatawa on a phone because
the category strip underneath repeats them. No generated page has that
strip, so the class there would hide the one link reachable no other way.
What those pages carry instead is `nav-anchor`, and which two wear it was
**measured, not chosen**: four links need 207px beside a 141px wordmark,
which fits from 390px up and clips by **56px at 320** — so below 390 the
two that stand down are the two that are *anchors on the homepage*, which
the wordmark beside them already links to. Author and Fatawa are pages
that exist nowhere else and stay at every width. A work page used to show
Author and Contact on every phone, so no width loses a link it had. The
guess before measuring was that all four would fit; they do not.

**Two lists name what a publish writes, and a page added to one is
missing from the other.** `filesToCommit` is the publish; the `Files…`
dialog builds its own. The landing pages went into the first and not the
second — and `Files…` is the fallback at every address but one, so
wherever there is no Worker the editor handed over everything except the
two new pages. `test/editor.mjs` now reads both landing pages **out of
that dialog** and holds them against the committed files, which is what
makes the divergence fail rather than pass quietly.

**A fatwa was linked through a redirect, and so was every record in the
homepage's structured data.** `script.js` built the fatāwā cards as
`work.html?work=<id>` while every work beside them used `recordHref` —
the fatāwā were simply missed when works gained pages of their own — and
the `CollectionPage` JSON-LD gave that same address as the canonical one
for all twenty-four records, each of which redirects to a page whose own
canonical tag says something else. Both read `site.recordHref` now, and
`test/homepage.mjs` asserts no `work.html?` survives in either place and
that every card points at a file that exists.

**`site.proseBlock` is in `common.js` because it has two callers.** The
description pair under a title — which edge each of the two scripts takes
— lived in `script.js` while the homepage was the only place a card was
drawn. The fatāwā page generates the same card into a file. A card on
`/fatawa/` disagreeing with the same card on `/` is exactly the drift
this codebase has already been bitten by once.

**A button says what it will do, and one of them never had.** The first
link on a file has always opened the document in the browser —
`target="_blank"`, no `download` attribute — and the one beside it has
always saved a copy. Nothing said so. "Urdu PDF" next to "Download" reads
as a *name* beside an *action*, and the guess most readers make is that
both do the same thing. It says **Read Urdu PDF online** now, which is
two offers rather than a label and a verb.

Composed in `fileLinks`, not in `content.js`: `file.label` is data, and
`recordMeta` reads it to derive the language a row announces. Only where
the label is Latin. Six of the labels are Urdu chart names, and there the
whole anchor carries `dir="rtl"` — English words put inside it are laid
out by that direction, so *Read* and *online* would be reordered around
the name instead of reading as a sentence. Those keep the name alone and
carry the sentence in `aria-label`, where it is announced in one script.
A work page's buttons are **baked in by `buildWork`**, so changing this
meant regenerating every page; the homepage's rows call `fileLinks` at
render time and changed on their own. The test read the committed page
and caught exactly that gap.

**And making the label say more broke the row it sits in.** The change
above lengthened every Latin file label — *Slides — colour print*
became *Read Slides — colour print online* — and `.work-files` is
`grid-template-columns: max-content max-content`, which says neither
column may shrink. So a label too long for the row does not wrap: it
**pushes its Download out of the card**. Reported from a phone with a
screenshot, the word Download sitting against the edge of the screen
outside the cream panel. Measured on the live site: **4 rows escaped at
390px, 12 at 360, the worst by 80px.** `minmax(0, max-content)` on the
first column, with the second left at `max-content` because
`.file-download` is `white-space: nowrap` and *Download* must not break.

**Two guards were green while it was plainly visible, and that is the
part worth keeping.** *a file button says whether it opens or saves*
measured the **words** and nothing measured the **row** — the group that
asked for the longer label had no idea the label had to fit anywhere.
And *nothing pushes the page sideways* measures the **document's**
scroll width; the overflow was inside a card and never widened the page.
A guard named for exactly this fault watched the wrong quantity.

The third reason, and the cheapest to repeat by accident: **every row in
the library is a shut `<details>`.** A guard that does not open them is
measuring nothing — the same lesson as `(none)` from
`getPlatformFontsForNode` meaning *hidden* rather than *fallback*. The
new group opens every row and measures every file link against the card
that holds it at 320, 360, 390 and 480, with the count asserted beside
it.

**The general rule this is the third instance of: when a change makes a
string longer, measure the box.** `ch`-to-`em` was this. The toolbar's
*One step larger* was this. A label is not a string, it is a thing that
has to fit.

**Measure a tap target by tapping it.** Three kinds of control here carry
an invisible pad — an `::after` stretched past the text — so the box
`getBoundingClientRect` reports is nothing like the area that answers a
finger. Measuring the box said `.file-download` was 22px and called four
healthy controls broken; walking `elementFromPoint` out from the centre
says 46px, which is what is actually true. **The claim "half the buttons
are too small" was wrong and had to be withdrawn.**

What that measurement did find is the fault the box could not see.
`.header-nav` takes `overflow-x: auto` under 420px so the links can
scroll sideways — and `overflow-x` computes `overflow-y` to auto as well,
the two axes cannot disagree, so the nav became a scroll box that
**clips**. What it clipped was the pad: 46px at 620px, **29px at 390px**,
on the only screens where it matters. Nothing in the source says the two
are connected. Fixed with `padding-block` on the scroller and an equal
negative margin, so the pad has room and the header is the height it
always was.

The category pills took real padding instead (35px → 47px): a pill is a
*drawn* button, and the thing you aim at should be the thing that is
there. That makes the strip taller, which is why the rule below moved
with it.

**`scroll-padding-top` has to clear both sticky bars, and it never did.**
The header and the category strip are both sticky, so a jump to a section
— a deep link, or a tap on a pill — has to clear the sum of them. Swept
every width from 320 to 1920: the stack is 142px on a desktop and 148px
between 480 and 620, where the wordmark wraps and the header grows to 78.
The values were **128 and 116**. So a section has always landed a little
under the strip; making the pills tappable only made it obvious. 152 and
158 now, ten pixels of air on the worst case of each band, and
`test/homepage.mjs` jumps to a section at six widths and checks it can be
seen. Judge any change to the header or the strip against that guard, not
against the numbers, which will move again.

**A phone never sees a hover.** The lift on a card and the colour change
on a link were the whole of this site's "you hit it" feedback, and a
touchscreen got none of it — a tap that navigated and a tap that missed
felt identical while the page thought about it. `:active` covers exactly
the moment the feedback is for. It is written *after* the responsive
rules because `.ruling:hover` sets a transform at the same specificity
and both states apply at once on a touchscreen. It passes the three cases
without being asked to: one pseudo-class, no script, no observer, and the
reduced-motion block collapses the transition so the state simply applies
at once — which is what feedback on a press should do anyway.

**A search that filters as you type must not animate.** A fade on the
results was planned and then dropped after looking at the interaction
rather than the idea: the list re-filters on every keystroke, so a
per-keystroke fade is a strobe. `type="search"` already gives a native
clear button, which was the thing actually missing. Not every place that
*could* move *should*.

**A record page is not a dead end any more.** `moreLike` in `common.js`
puts up to four siblings from the same category at the foot of every
work, fatwa and post — mounted from `common.js` exactly as Share and
Print are, so it reached all twenty-four committed pages without
regenerating one. It takes the siblings from the one *after* this record
and wraps round, so a record at the end of its category offers the start
of it; a record alone in its category (the one app) writes **no block**,
because an empty "More in …" heading is worse than no heading.

Two things it had to be told. `allRecords()` in `common.js` hands back
flat records carrying a `category` property — not the `{ record,
category }` entry `admin.js` builds, which is the shape this was written
against first, and every record page threw on load. And the block is set
**in Latin whatever the piece is**, the same decision `.record-meta`
already makes: the heading and the link are the site's own words about
the library, not the author's words in the piece. Inheriting the page
flipped the whole thing on an Urdu fatwa — an English heading flush
right, and the arrow in "All of Islamic rulings →" mirrored to the
*front* of the phrase it was meant to lead away from.

**Two ways a new test passed while the fault was there.** Both were
caught only by restoring the fault, and both are the same mistake in
different clothes.

`/→$/.test(textContent)` on that arrow **cannot fail**: `textContent` is
source order, and direction changes only what is *painted*. It now
measures where the arrow lands against the middle of its own link.

And the file-button group asserted over `#work-page-files .document-link`
— a selector matching **nothing**, because a work page asks `fileLinks`
for the class `button` instead. Two `every()` calls over an empty list
both passed. The only reason it showed is the assertion beside them that
counts what was found. **Count what you matched, in every group that
matches a set** — it is the cheapest guard against a green test that
looked at nothing.

**A rule added "for safety" was measured and taken out again.**
`text-align: right` was written onto the wrapping Urdu titles in that
block, against the real worry that an LTR container would pin both lines
left and leave each one *beginning*, on the right, in a different place.
Removing it on its own left the guard green — three wrapping titles at
390px, all starting together — because `.urdu` already carries the
alignment, exactly as these notes say. It is gone. This file warns
against that rule specifically, since it outranks `align-left` wherever
one is later wanted, and the warning was right.

**A search box has to say that it is one.** It was white on cream behind
a 1px `#b8beb5` border — three tones within six points of each other — so
the one control on the page read as a faint rectangle, and it was
reported as *mixed with the website*. It carries the gold rule at 2px and
a shadow now, so it sits **on** the page rather than in it. No new
colour: `--gold-rule` and `--paper-warm` were already here, which is why
it still reads as the same site rather than a widget dropped onto it. On
the fatāwā page the border is `--gold-on-dark` instead, the two-golds
rule in one more place.

**A placeholder that is cut off says less than a short one.** It read
*Search titles, subjects, descriptions — Urdu, Arabic or English*, and a
phone showed *…descriptio*. The part that was lost was the part worth
knowing, so it moved out of the box and under it as `.search-hint`, where
there is room, and the box says *Search the library*. The full sentence
stays as the input's accessible name. `test/homepage.mjs` draws the
placeholder in the input's own font and refuses one wider than the field
— a character count would not have caught it across three scripts.

**The fatāwā page has a search, and the argument for it changed.** Six
rulings on a three-screen page is a list, not a haystack, and that was
right until the author said more were coming; twenty is a haystack.
`site.mountCardSearch` in `common.js` is the homepage's own matching —
two passes, every typed word present, falling back to consonant skeletons
only when nothing matched exactly **and saying so** rather than passing
looser results off as what was asked for. It lives in `common.js` and not
`script.js` because `script.js` is the homepage's file and that page does
not load it; one implementation means the two pages cannot come to
disagree about what a word finds. `buildFatawa` writes `data-search` and
`data-skeleton` into each card, so the filter reads the file rather than
fetching anything, and a crawler sees the words too. Wired from the
markup — any page writing an input with `data-card-search` naming a
container gets it.

**A search that filters a page you cannot see has done nothing.**
Reported as *I search commodities it filters the page but mobile screens
have the fatwa scrolled down*. Measured at 390px: the box sits **2040px**
down the homepage — the hero, the introduction and the recent strip are
above it — and the fatāwā are a section *below* the library, so a term
matching one work and one fatwa put them at **2363 and 2734**. The filter
ran, the count said *1 work and 1 fatwa*, and neither was on the screen.
Nothing scrolled, so what a reader saw depended entirely on where they
were standing when they typed.

`site.anchorSearch` brings the box to the top of the screen on the way
*into* a search — once, not once per keystroke, and never when the box is
cleared, because a reader correcting a query has usually scrolled down
into the results. `window.scrollTo` on the document, never
`scrollIntoView`, for the reason already recorded about the rail.

**It passes no `behavior`, and that is the one case where the stylesheet
can reach a scripted scroll.** `behavior: 'auto'` is defined as *use the
scrolling box's own `scroll-behavior`*, and `html` carries
`scroll-behavior: smooth` with the reduced-motion block setting it back to
`auto`. So it is smooth for a reader who wants motion and instant for one
who does not, with nothing in the script asking the question. Writing
`'smooth'` would have put it beyond the stylesheet's reach — the trap the
carousel's own scrolls had to ask `matchMedia` about. The guard fails on
that one line alone.

The clearance is **read**, not copied: `scroll-padding-top` off the root,
which is the one number that already knows how tall the two sticky bars
are. Both of its values have moved once already.

**Anchoring was not enough on its own, and the rest was furniture.** With
the box at the top, the ruling still landed one pixel off the bottom of an
844px screen. `body.is-searching` compressions existed for exactly this and
covered only `.library.is-empty` — which reads as right and is half the
case: the hole is between the last result and the fatāwā heading, and it
is there whether the library matched nothing or matched one work. That,
plus hiding `.category-blurb` — a sentence explaining what a chapter of
the page collects is of no use to someone who has already named what they
want — takes the ruling to **745** on an 844px screen.

**The guard measures the title, not the card's top edge**, and the
difference is the point. A card whose first two pixels have cleared the
fold is not a result anybody can see; the title is 51px into a ruling's
card, so the assertion fails by **61px** when the furniture grows back
where the top edge failed by **10** and would have let half a regression
through.

**This one could not be proved with real keystrokes.** Scroll down past
the box, press a key, and Chromium scrolls the caret back into view by
itself — honouring `scroll-padding-top` doing it, so it lands within two
pixels of where our own anchor would have put it. The first version of
*correcting a query leaves the reader where they were reading* failed on
exactly that and read as our fault. It is the browser's, it is right (you
cannot type into a box you cannot see), and it is not what is under test;
the input event is raised directly instead, since that is all the handler
ever sees.

**And raising the event directly was still not enough — the browser moves
the page a second way.** The assertion that replaced it allowed 40px of
drift and explained the rest as the browser clamping a scroll position
past the end of a now-shorter document, *"8px here"*. **Both halves of
that were wrong**, and it passed for a fortnight on one container and
failed three times out of three on the next.

The cause is **scroll anchoring**. A narrower term hides cards *above*
the viewport, the document loses 300px, and Chromium moves the scroll
position to keep what you are looking at still. Measured: parked at 2276
the same keystroke lands at **1975**, and the search row goes from 262px
above the screen to 31px below its top — which reads exactly like our own
anchor firing, and is not ours at all. The clean experiment is one line:
with `overflow-anchor: none` the same press leaves **2300 at 2300**.

So the guard turns anchoring off for that one measurement, which is a
**control** rather than a convenience — it holds still the one thing that
legitimately moves the page, leaving the handler as the only thing that
could move it, and the assertion becomes exact rather than a tolerance
covering an unexplained 301px. It is named for what it proves now:
*correcting a query does not re-anchor the page*, with a second quantity
beside it — the box stays above the screen — because a clamp would move
`y` without bringing the box back, and anchoring moves both.

The lesson is the one this file keeps relearning in new clothes: **when a
measurement needs a tolerance, find out what is filling it.** A 40px
allowance hiding a 301px effect is not a tolerance, it is an unread
result; and the sentence written to excuse it taught the next reader
something false, which this file already says is worse than silence.

**A count over a filtered list must count the list.** Looking at the
fixed page — screenshotting it, which is what found this — the category
head read **2 works** above one row, which says the library lost something
rather than that the search hid it. It reads `1 of 2 works` during a
search and goes back to `2 works` when the box is cleared.

**The box opens a list of what it found, and the list decides nothing.**
Asked for as *the search bar should open a drop-down type thing listing
things* — and it is the better answer to the fault above, because
filtering the page says "here is everything about X" while a reader on a
phone is asking "which one is it".

`site.suggestionBox` is handed **the cards the filter has just kept**, in
the order it kept them, and builds a row from each. It matches nothing
itself, so a list disagreeing with the page beneath it is not a state it
can reach — the same argument that put `mountCardSearch` in `common.js`
rather than in `script.js`. Each part of a row comes from the helper the
library row uses for the same part, so a row cannot say something the
record's own row does not.

**It is handed the cards, not their ids, and the href is why.**
`recordHref` is relative to the site root; the fatāwā page sits a folder
down and its own cards already climb out with `../`. Building the address
from the record sent every row on that page to `/fatawa/works/…`. Taking
the href the card already carries needs no arithmetic about how deep the
page is — which would have been wrong again the moment `index.html` was
opened from a file system, as it must keep working. The guard **clicks**
the row, the same lesson as the cross-language link: the broken href was
perfectly well-formed and a string assertion would have had to know what
wrong looked like.

The fatāwā cards needed `data-id` for this, which the homepage's own
`.ruling` has always had. `buildFatawa` writes it and the page was
regenerated; *the fatawa page is the fatawa page in the branch* in
`test/editor.mjs` is what would have said so if it had not been.

**The kind was in a row and had to come out.** `recordKind` answers in the
language the record reads in, which is right — and the row's second line
is 12px, uppercase and letter-spaced, where an Urdu word has its joined
letters pulled apart. `.bio-facts dt` learned this about نام and کنیت.
Rendering it in English instead would have been a second answer to a
question `recordKind` already settles, so the line does not ask it: it
names the category, which calls a chart a chart anyway.

**Escape is two steps, and the second one is the browser's.** A
`type="search"` field clears itself on Escape — measured: the first press
emptied the box and un-filtered the whole page when all the reader wanted
was the list out of the way. While the list is open Escape is prevented
and only shuts it; pressing it again, with nothing to shut, lets the
native clear through.

Eight rows, then a line saying how many more are in the library below.
Past that the **panel** scrolls, never the document. Nothing animates, so
the reduced-motion case needs no asking — this file already records that
a list re-filtering on every keystroke must not fade.

**A pointer left where it was clicked is not a bug in the page.** The
first screenshots showed the third row highlighted with nothing marked. A
click leaves the virtual mouse where it landed, the search then anchors
and scrolls the page under it, and a row drifts beneath the stationary
pointer. The guard parks the mouse in a corner before it measures
anything; a harness artefact that looks exactly like a fault is worth the
two lines.

**A standfirst reaches a work and a fatwa too, and for months it did
not.** The field was built for posts and `buildPost` was taught to write
it — but the *control* is written in `buildRow`, outside any `isPost`
branch, so the editor has offered a Standfirst box on **every** record
since the day it was added, and `buildWork` threw the value away. Anybody
who typed one onto a work or a ruling watched it vanish at the next
publish with nothing to say why. Same fault as a button that does not do
what it says, and it only surfaced because a fatwa finally wanted one.

**A picture is the gallery's, not the button row's.** `fileLinks` mapped
over every file including images, so an infographic came out twice —
once as a button reading *Read Part 1 online* and again as the thumbnail
of the same file directly underneath it. The halloween ruling has shipped
three of those for months. The gallery is the better half of the pair: it
shows the thing rather than naming it, and its thumbnail already links to
the full-size original.

Two consequences had to be handled, and the first was nearly shipped
broken. **"Not published here yet" is about having nothing, not about
having nothing with a button** — halloween is three infographics and no
PDF, so reading its files through `fileLinks` alone made its own page
claim it was unpublished with three of them sitting underneath. And
`#work-page-files` is where `common.js` mounts Share and Print, so
exactly one element must carry it whichever of the three shapes a page
is: the button row when there are buttons, the **gallery** when the
pictures are all there is (`imageGallery` takes an `id` for that case,
which also puts Share after the pictures rather than before them), and
the availability note when there is genuinely nothing.

**Taking a picture out of the button row took its Download with it.**
The rule above is right and the cost of it went unnoticed for months: a
sheet had a thumbnail that *opened* it and nothing that *saved* it, while
every PDF beside it had both. The order of the two changes is the whole
explanation — images left `fileLinks` first, and "Read … online" beside
"Download" was written into `fileLinks` afterwards, so the one kind of
file on this site that exists to be forwarded was the only kind with no
way to keep it. Nobody reported it because long-pressing a picture works.

Each gallery item carries a caption now: which sheet it is, and a
`.file-download` — the same component the PDFs use, not a second one.
Offsite images get the thumbnail alone, the same decision `fileLinks`
makes, because `download` is ignored across origins and the link would
promise a copy and open a tab.

Two things that had to move with it. `.work-page-gallery a` was
unscoped, so the new link inherited the card's border, background and
hover lift and was drawn as a small empty card under every sheet; it is
`.gallery-sheet` now. And the label is `aria-hidden` — the image's own
`alt` already announces it, so without that a screen reader read the
name, then the name again, then "Download" plus the name a third time.

**A guard tuned to the size of the library stops being a guard.** Adding
a seventh ruling failed two assertions on the fatāwā grid, and neither
was about the new ruling.

*leaves no card alone on a row of its own* held while six rulings made
two clean rows of three. Measured at every width, seven give **3+3+1** at
three columns and **2+2+2+1** at two, and no column count above one
avoids an orphan for seven; the eighth moves the problem rather than
solving it. A check that refuses to publish the library as it already
stands is a check nobody can keep — the lesson `unmarkedReferences`
learned, in a second place. It asks the thing that can hold and still
catches the fault it was written for, which was a column count that
*mis-sized* a card: the lone card is the same width as its siblings and
starts on one of their column edges.

*no description runs long enough to swell its row* was a flat 60px, and
the seventh ruling hit it **exactly** — not by being long but by changing
which cards share a row, so the three shortest ended up together and the
shortest row fell to 319 against a tallest of 379. That tallest row is
driven by an Urdu title taking two lines and has been since before this
ruling existed. It is a proportion now. **Check which card is actually
driving a height before believing the assertion's name**: this one says
"its row" and compares the tallest card on the page with the shortest.

Three counts came out of the same addition — the fatāwā page's card
count, the homepage's record count, the search's — all typed in as `6`
and `> 20`. They read `content.js` now. Count what you matched, but take
the number you expect from the file that holds the answer.

**Restoring a fault only proves something if it lands in the right
function.** `buildPost` and `buildWork` write the standfirst with
deliberately identical markup, so a patch anchored on that markup removed
**buildPost's** copy and left `buildWork` alone — the fatwa page kept its
standfirst, the test stayed green, and the fault looked guarded. The same
shape as the one-line patch that hit `.header-nav a` instead of
`.recent-track`. Anchor a restoration on something unique to the function
you mean, and assert on what you removed before writing it back.

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

**The strip is in the file; only the controls are made in the browser.**
It is generated into `index.html` by `indexRecent` at publish time like
every other marked region, which is why `test/homepage.mjs` can turn
JavaScript off and still find the cards with their titles in them — where
the library below it renders nothing at all. Every part of a card comes
from the helper the library row uses for the same part — `titleMarkup`,
`kindMarkup`, `metaMarkup`, `categoryIcon` — so a card cannot end up
saying something different from the row it mirrors.

**Two reports, and they are the same report.** First the strip drifted
for ever and could not be steered — *overloaded*. Then it could be
steered and did not move at all, and read as a static row with no sign
there was more — *weird, not moving, no hint it contains more*. Both say
the same thing: **a shelf of recent things has to say it is a shelf**,
and a row says that by moving and by showing the next thing along. The
first version had movement and no controls; the second had controls and
no movement; it needs both, and they are not in tension once the right
thing is moved.

**It is a carousel, and it used to be a conveyor.** What was here drifted
leftwards for ever: `startTicker` cloned the whole set, translated the
pair by −50%, and — this is the part that mattered — **removed the very
attributes the arrows are shown by**, because a drag and an animation
cannot share one track. So the strip could not be scrolled, could not be
stepped through, and could not be stopped at all on a phone, where the
hover that paused it does not exist.

What replaced it is smaller and does more. `scroll-snap-type: x
mandatory` on the track with `scroll-snap-align: start` on the cards, so
nothing ever comes to rest half off the edge; `rail()` steps by **one
card**, measured off the card itself rather than 70% of the window, so
the button and the snapping agree about what a step is; and `dots()`
writes one dot per card under it, marked with `aria-current`, saying how
many there are and how far along you are — the question the strip never
answered. The dot follows the card nearest the track's **left edge**, not
its middle: the cards snap on `start`, and measuring from the middle put
the mark on the third card after a single press on a desktop.

Everything added is a *control*, not content, so a reader without
JavaScript loses none of the cards — they are in the file — and keeps the
one thing that needs no script: a track they can still swipe.

**The dots cost about 40px and the budget was raised to pay for it**,
from 400 to 430, deliberately rather than by drift. Trim the margins
before the 44px tap target if it ever has to come down again.

**It advances on its own again, and `autoAdvance` moves the scroll
position — not a transform.** That is the whole difference from the
conveyor, and it is why nothing has to be taken away for it to run: one
card every 4.5s by the same `step()` the buttons use, so the arrows, the
dots, the snapping and a finger on the track all keep working while it
goes. At the end it comes round to the start rather than reversing; a
shelf that walks backwards reads as a fault.

It gives way at once. Hovering or tabbing in pauses it; **taking hold of
it at all stops it for good** — a `pointerdown` anywhere in the section,
a key, a wheel over the track — because someone steering does not want to
be steered. The listeners are on the *section*, not the rail, since the
dots are written in beside the rail and a tap on one is a reader taking
hold as surely as a tap on an arrow. It never starts under
`prefers-reduced-motion`, never when everything already fits, and pauses
while the tab is in the background.

**The peek is derived, not left over.** `.recent-card`'s comment said all
along that it was "narrow enough that a second card is always showing —
which is what says the rail scrolls before any arrow does", and
`min(268px, 74vw)` only delivered that on a phone. Everywhere else the
peek was the remainder after the cards: measured, **42px at 1280 with a
44px arrow sitting exactly on it**. The width is now whatever makes
`--per` cards and one `--peek` fit the track, so the same 88px of the
next card shows at every width from 390 to 1920, and the cards stay
255–293px — within a few pixels of the 268 they have always been. Only
`--per` moves with the breakpoints.

**The fade was erasing the hint it was meant to soften.** 64px wide with
its outer 40% solid page colour — written for the conveyor, where a card
was *supposed* to dissolve as it drifted off. On a carousel the peeking
card is the whole signal, and the gradient was wider than the peek at
every width. It is 28px now with no solid run. The guard is `fade <
peek`, and note what proving it took: with the peek fixed at 88px a 64px
fade no longer swallows it, so the two faults only fail the test
**together**. Restoring one at a time is how that was found.

**The last card snaps to `end`, and the track carries no right padding.**
The padding was a gutter meant to let the last card clear the fade; what
it left was a gutter of *nothing* after the last card — scrolled fully
right at 390px, the card ended at 359 against an edge of 390. The fade is
only shown while there is more that way, so at the end there is nothing
to be clear of.

Two warnings about how that was written up. The first version of both
comments said the **end could not be reached**. It can, and could before
— that state was one the change passed *through*, padding kept and the
last card aligned to `end` together, which does strand the maximum 31px
away. And the assertion written about it could not fail, because the
maximum is reached either way: the padding is part of what is scrolled.
Only restoring the padding and watching the test stay green moved the
measurement onto the **gap after the last card**, which is the thing that
actually differs. A false account of a fault is worse than none, because
the next reader believes it.

The cards rise as they arrive, and `card-rise` carries the movement
**and** the state it moves from, together. Putting `opacity: 0` on `.recent-card`
itself was tried and the tests caught it — the three cases again.

**A scroll written in JavaScript is motion too.** `scrollBy` and
`scrollTo` with `behavior: 'smooth'` are animation like any other, and
they are the kind this site kept forgetting to ask about because they are
not in the stylesheet: the reduced-motion block cannot reach them, and
neither can it reach a `setInterval`. The step buttons and the dots ask
`matchMedia` themselves and fall back to `'auto'`, which keeps the
navigation and drops the slide; `autoAdvance` asks the same question and
simply never starts. Taking the *carousel* away from that reader would
have left them with less than everybody else, which is not what the
preference asks for — taking the **unasked-for movement** away is exactly
what it asks for. The two are different, and the line between them is
whether the reader chose it.

`rail()` in `script.js` is the category strip's own scrolling behaviour,
extracted and used twice. It scrolls the *track*, never `scrollIntoView`
— same reason as the rail that marks your place. It hands back
`{ ends, step, gently }` rather than the bare `refreshEnds` it used to,
so the timer above steps by exactly what the buttons step by. **The
category strip reads that return value too** — changing its shape threw
on every page load until the second call site was updated, and the
"nothing threw along the way" assertion is the only thing that said so.

The `app` icon is the twelfth drawing. A card's mark in the strip
deliberately does **not** carry `.category-icon`: those draw themselves
on as you reach them, and a mark sitting off the right-hand end of a rail
would never come into view to be drawn.

**A step button is a button, drawn as one.** `.category-arrow` was a bare
character on no background, 34px wide: at the edge of a rail it read as
part of whichever card sat under it, and on the strip it was taken away
altogether while the cards drifted. It is a 44px circle with a border, a
background and a shadow now — a control that moves the thing beside it
has to look like one.

**A shelf that walks while nobody is watching has spent its motion to
say the wrong thing.** `autoAdvance` paused on `document.hidden` — the
tab in the background — and had nothing to say about the strip simply
being scrolled past. Measured at 390px: a reader who goes down to the
library and reads for twenty-five seconds comes back to a strip that has
walked to **1354 of 1792**, with the newest card no longer at the left
edge. The section is called *Recently added and updated*; showing its
fifth item to somebody who has just arrived at it is worse than not
moving at all.

It **pauses, and does not rewind.** Coming back to find it reset would
undo the reader's own position — the carousel steering them, which is
the thing every other listener in that function exists to prevent.

This is the one place an `IntersectionObserver` is allowed here, and the
reason is the three cases rather than an exception to them: **nothing
depends on it.** Without JavaScript there is no motion at all and the
cards are in the file; without `IntersectionObserver` — there is a
`typeof` guard — it runs exactly as it did; under
`prefers-reduced-motion` it never starts. The observer can only ever
take motion away.

**The guard that already covered this was passing because of the
fault.** *the strip moves on its own again* measured at scroll 0, and at
390px the strip sits far below the fold there — so it was asserting
motion in a state the strip now deliberately holds still in. It was
right about what it wanted and wrong about where to stand; it scrolls
the strip into view first now. A guard written against the old behaviour
is the quietest way for a change like this to look like a regression.

**A title is a heading in every script it is set in, and Latin was not.**
`.urdu` carries 500 and `.arabic` 700, each written where the face is
chosen. Latin had neither, so it fell to **400** — paragraph weight on a
heading — and the library row and the fatāwā grid each patched that
locally with a `font-weight: 600` of their own while every other place a
title is rendered was left behind. Measured across six pages: the recent
strip drew its English titles at **16.5px/400** beside an Urdu sibling at
19px/500, and a work hero's cross-language title at **16px/400**.
Reported as the English cards being too light.

One rule on `.record-title.latin`, not a third local patch — the same
shape as `Ayn and hamza` being named in one stack and not the other. The
places that set a *size* still set it; none of them restates the weight,
and the library row's duplicate came out. Proved by diffing every title
on six pages before and after: **three lines moved, all 400 → 600**, and
nothing else — which is what says the removed duplicate was redundant
rather than load-bearing.

**The decoration outranked the action, in the one place this was never
carried back to.** This file already records fixing exactly that at the
foot of a post: the tag pills carried a filled background while the only
two things a reader could *do* were bare words. The library row kept the
fault. Measured in an open row: the tag beside it was 20px/500 on a
filled ground with a 999px radius and real padding, while
`Open details →` was 15px/700 with a hairline under it and **no padding
at all**.

The primary action is `.button` now — **the component the file links
already use**, not a second one invented for this row; `.work-actions
.button` only tightens the padding, because a library row is compact
where a work page has the whole column. Share stays a word on purpose: a
row offers one thing to do and one thing to do with it, and drawing both
would hand the choice back to the reader.

**Area was the wrong quantity and the run said so.** The first assertion
compared the action's area against a tag's, and the English tag
`Choose Your Words Wisely` measured **4870 against the action's 3347** on
a row that reads perfectly well — a pill is as wide as its words. What
tells a drawn control from a word is that it is *padded*, which does not
move with the label. That is what is asserted.

**A guard that crashes on the fault it is for is worse than one that
fails.** Restoring the bare word put `primary` back to null, and the
padding assertion threw inside the page rather than failing — which
killed the whole run and reported nothing at all. Null-safe now, and the
restored fault reports `padX: 0, padY: 0, filled: false` beside a tag at
`padX: 11, filled: true`, which is the fault in one line.

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

The title is justified, which on a canvas has to be done by hand: every
line but the last takes the gap that makes it exactly `maxWidth`. But
justification is the second move, not the first. **The size is stepped
down until every line but the last already fills `CARD_FILL` (0.72) on its
own**, and only then is the remainder handed out. At the size that merely
*fits*, `شیئرز کی شرعی` fills 59% of the measure and `اسبابِ سبعہ کی` 70%,
because the next word is long and will not go; stretching either opens
holes far worse than the short line. One step down each lands them at
about 95% and on one line respectively.

Both numbers came from drawing the cards and reading them, not from
arithmetic — a first-line-fill percentage said `pretty` beat `balance` for
the in-prose headings and it was wrong there too. **Screenshot the card.**

The trade this makes is deliberate and was the author's call: the shares
title now draws at 80px, which arrives as **17.6px** in a WhatsApp bubble,
under the 19px floor the rest of the site keeps for Urdu. A full line at
17.6px was judged to read better than a 59% line at 23.3px. If that ever
looks too small, bound the size loop — not the justification under it.

**Fill does not bound a hole; the stretch per gap does.** The card's
title is justified by hand — every line but the last takes the gap that
makes it exactly the measure — and `CARD_FILL` (0.72) was the only bar
on it. That bar is about the *line*, and the fault is about the *gap*:
`Technology Shapes People` put **two** words on its first line, cleared
the bar at 81% fill, and handed the whole remainder to the one gap
between them — **7.5 times a normal space**, a bar of empty card with a
word at each end. `Zakat Calculator (v2)` had shipped the same way for
as long as its card existed, and nobody had reported it.

`CARD_STRETCH` is the second bar, and **2** was chosen by drawing all
thirty cards at 2, 3, 4 and 6 and measuring every one. The worst hole
on the site: 22% at the baseline, **7% at 2**, 10% at 3 and 4, 18% at
6. Not by reasoning about typography — three attempts to model
`wrapLines` in a script all got the measure wrong (it is
`CARD_W - margin*2 - 120`, not `CARD_W - margin*2`) and produced
confident numbers for the wrong card. **Draw the cards and measure the
pixels; the model is not the thing.**

**Tightening that loop is dangerous in a way that is not obvious.** The
size ladder keeps the largest size that merely *fits* and only steps
down while looking for one that reads well — so a stricter bar makes
*more* titles fail every rung and fall back to the largest size, which
is the one that opens the widest holes. `ھیلو وین کا تہوار اور مسلمان`
sat on one line, gained the bar, and jumped to two stretched ones. The
fallback now keeps the size whose **worst gap is smallest** rather than
the first that fits. Any future bar added here has to fix the fallback
in the same breath.

**The guard reads the drawn card, not the code that drew it.** There
are at least three routes to a bad layout — the ladder, the fallback,
the justification — and a test aimed at one misses the others. So
`test/editor.mjs` decodes every committed card, finds the widest run of
columns with no ink inside the title band, and refuses more than 12% of
the title's own width. It names both faults at 22% when the old cards
are put back. The band matters: the byline and the domain share a row
at opposite ends of the card, so measuring their row reports a hole on
every card.

**An infographic is flat colour and sharp type, which is the one case
JPEG loses twice.** The charts in `files/social-media-posts-and-pamphlets/`
ship as **256-colour PNG at the author's native export size**, and every
part of that was measured rather than assumed:

- At 2160×2700, JPEG q86 is **436KB** against the source PNG's **325**,
  and it rings around the type. Quantised to 256 colours the same image
  is **137KB at a mean shift of 0.00/255** — the design has few distinct
  colours, so quantising costs nothing at all. Checked by eye as well, on
  the seal and on the smallest caption line, where nothing moved.
- **Downscaling makes it bigger.** Resized to the 1600px width the old
  files used, the same 256-colour PNG is **237KB** — resampling invents
  thousands of intermediate colours at every edge and PNG stops
  compressing. It costs fidelity too (0.17/255). So these do not get the
  downsample the calligraphy got; the rule there was about a photograph,
  and it does not generalise to flat artwork.

Twelve files at 1.41MB replaced eight at 2.33MB, with half as much again
in content. `IMAGE_FILE` in `common.js` already matched `png`, so the
gallery needed no telling.

**Weight is a design decision, and the test measures it.** The homepage was
961KB: a decorative 518KB PNG inside the collapsed bio, and two fonts
shipped as TTF. It is ~320KB now — the fonts are woff2 (58% smaller,
measured), and the calligraphy is written at 840px and 64 colours, which is
17.6KB against 517.8KB and costs a mean shift of 0.55/255 on flat ink.
`test/homepage.mjs` reads all three off the filesystem, so none of them can
creep back. The full-resolution `*-source.*` files are **kept**: nothing
serves them, they cost a visitor nothing, and after the downsample above
they are the only originals left.

The three patch faces are the only things added to that since, and what
each page actually fetches was **counted off the wire**, not reasoned
from the stacks — the first version of this paragraph guessed and got it
wrong. The homepage pulls `latin-marks-sans` at both weights (11.9KB, for
the hero name at 700 and the footer at 400) **and** both weights of `ayn
and hamza` (1.3KB), and does **not** pull `superscript-digits`: 13.2KB of
patch in all. A post pulls `latin-marks-sans` at 400 only, the ayn patch,
and `superscript-digits` (1.4KB) — 9.2KB. That asymmetry is the
`unicode-range` doing its job, and it is why one of these cannot be
weighed by its size on disk. Each has its own cap in `test/homepage.mjs`
beside the reason it exists.

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

**Colour contrast, and it had never been measured.** `--gold-on-light`
and `--gold-on-dark` are two different values for a reason. Do not
collapse them into one — and the numbers are here now rather than the
assertion alone: gold-on-light is **5.33** on the page and **2.38** on
the moss panel; gold-on-dark is **8.35** on the panel and **1.52** on
the page. Each fails where the other works, which is *why* there are
two, and the guard asserts that failure as well as the pass. An
assertion that only checked each one on its own ground would stay green
if somebody made them the same colour.

**What reasoning about contrast missed.** Every colour on six pages was
walked — the element that owns the text, its real background composited
up through the ancestors — and **858 text elements** measured. One thing
failed: `.record-meta > span`, the `·` separators, at **1.97:1**. Inside
`4 FILES · ENGLISH · 28 SEPTEMBER` that is a separator nobody can see,
so the line reads as one run of words.

The obvious repair does not survive the arithmetic, and that is the part
worth keeping. Keeping the hue and saturation and lowering the
lightness, the first value clearing 4.5 on all four creams the line
lands on is `#636D63` — and `--muted` itself measures 4.88 to 5.70 on
those same four. **There is no colour at 12px that is both legible and
visibly quieter.** So the rule is gone rather than retuned, and the dots
take the colour of their own line.

**Where the walk meets a gradient it stops, and says so.** Seven
elements sit on the hero's photograph, where no declared colour
describes the ground and a composited ratio would be a fiction. Those
were measured by **hiding each line, screenshotting the backdrop and
reading three hundred pixels under it** — worst pixel, not average:
eyebrow 9.83, h1 9.42, hero copy 6.82, the Urdu line 5.33, the gold
`em` 7.87, the graded name 11.87. The guard counts them and skips them;
repeating that in the suite would need a screenshot per page.

Two of those numbers were wrong on the first pass and impossible on
their face, which is how they were caught. `h1` read **1.26** because
the heading was made transparent and its inner `<em>` keeps its own
colour, so the sample read the em's own ink. And a second script
reported the dark panel as `#15342B on #15342B`, ratio **1.00**, seven
failures — it did not walk up to the ruling cards' own light background.
**A ratio of 1.00 on text means the probe is wrong, not the page.**

**46 distinct hex literals in `styles.css`, 11 of them tokens.** That is
the structural finding behind the separator: the fault lived in a
one-off literal rather than in the system, which is also why nothing had
ever questioned it.

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

**Put the fault back once, and watch the new test fail.** Twice now a
guard written against a real fault could not have caught it. Both times
the assertion looked obviously right and both times the *fault* was
restored and the test went on passing.

The last one is the clearest. In a block marked English holding only
Urdu, two measurements were tried before one worked. *The first word
sits to the right of the last* — true in the broken block too, since a
run of Urdu is laid out right to left inside itself wherever it is put.
*The first word ends on the block's right edge* — failed on a perfectly
correct block, at 682 against 1112, because that block had inherited
`align-center` from the tests above it; alignment confounds it, and
setting alignment to any known value makes it pass in both states.

What separated them was the space bar — the very thing the reader
complained about. Reached from the other end than the report, and only
by restoring the fault twice. **A test that cannot fail is worse than no
test:** it says the fault is guarded.

**A sleep that is usually long enough is a flake with a timer on it.**
The export dialog fills in two stages — the pages and `content.js` at
once, the link-preview cards when thirty-odd canvases have finished — and
every read in `test/editor.mjs` slept 800 or 900ms and hoped. On a slower
container that failed about one run in two, as *its own share card is
drawn for it* with no card in the export at all, passing on re-run.

The signal was already there and simply not waited on: `#export-summary`
reads *Drawing the link-preview cards…* until `buildCardFiles` settles.
`exported(page)` waits for that sentence to change. And it can now change
two ways, because the promise had no `.catch`: a canvas that failed left
the dialog on that same sentence for ever with no cards under it and
nothing saying why — a failure that looked exactly like still working. It
names the reason now, and says the rest of the publish is still good.

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

**The Worker's two locks are both required, and one of them was not.**
`verifyIdentity` refuses outright when no sign-in service is configured —
"a Worker holding a token that can write to the repository must never
fall open because a variable was left blank". Fourteen lines later the
second lock read `if (env.EDITOR_EMAIL && payload.email !== …)`, which
did exactly that: a blank or absent `EDITOR_EMAIL` skipped the check and
every account in the Firebase project could publish. Proved by restoring
it — a publish with the variable blank returned **200 and committed the
file**. It is now two checks, a 500 naming the variable and the existing
403 for a wrong address, and `worker/test.mjs` asserts both. Neither had
a test before; the `wrangler.toml` guard covered only a var set to `""`,
not one never added in the dashboard.

The Firebase **web API key in `admin.js` is not a secret** and GitHub's
secret scanning will flag it anyway. It identifies the project to
Google's client SDKs and authorises nothing; what authorises is the
signed-in user, which is what the two locks above check. Dismiss such an
alert as "won't fix", never "revoke" — and do not rotate the key, since
the replacement has to be committed too and the alert simply returns.

**An error should name its own remedy.** The Worker's *stored GitHub
token was refused* said only "it may have expired". That was read on a
phone, with the fix sitting in a README nobody opens mid-failure, and it
cost a round trip. It now names the dashboard path. The same applies to
the one above it.

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

**What to do next, in the order risk says rather than interest.** The
writing box has had four rounds of work and now holds what a word
processor holds: script, bold, italic, underline, raised, lowered,
struck, plain, five block styles, two size steps, four alignments,
bullets, numbering, two levels of sub-point, a divider, a link, a
bigger gap after a block, and undo. **Almost none of it can be used on
a fatwa**, and the thing that can lose an article outright is still
unbuilt. Both of those outrank adding anything else.

**1. Nothing saves a draft, and that can lose work.** `bodies[record.id]`
is a plain JavaScript variable. Nothing in `admin.js` writes to
`localStorage` or `sessionStorage` — the only protection is a
`beforeunload` warning, which a phone evicting a background tab does
not reliably fire. An hour of writing is one eviction from gone. This
is small, self-contained, and the only item here whose absence
destroys something: autosave `bodies` under the record's id, offer it
back on load when it differs from the committed page, clear it on a
publish that really committed. Guard the branch that matters — storage
refused or full — the way the reading-face control already does, since
that is the path that fails silently.

**2. A fatwa cannot be written at all**, which is what makes items 1
and everything above it matter less than they should. `isPost` gates
the writing box on `record.page`, and a fatwa has none — so lists,
sub-points, quotations, footnotes, the divider and the link reach
**posts only**, in a library whose subject is rulings.

There is a real design decision inside this one and it should be taken
deliberately rather than discovered. A work's page is **regenerated in
full on every publish**, and this file says why: nothing about a work
lives anywhere but `content.js`, so there is no "has this changed"
question. Free-text writing on a work breaks that — the words would
have to be read back out of `works/<id>.html`, exactly as a post's are,
and a work's page stops being purely derived. Either that invariant
moves, or a fatwa's writing lives somewhere else. Decide it before
writing code.

**3. The attestation block.** کتبہ, الجواب صحیح, the muftī's name and
title, the institution, the reference number, the two calendar dates,
the seal. **Fields, not prose** — the shape an app's `verifiedBy[]`
already has, for the reason written up there: a ruling two muftis have
signed is a different thing from one nobody has, and a page that does
not say which leaves a reader to guess. It can render on a work page
today and does not strictly wait for item 2, though it reads oddly on
a page with no ruling on it.

**4. Dates for the twenty-two works** — below, and the one item here
nobody but the author can do.

**5. Only when something else needs the toolbar.** The rail is full at
390px: Style is 46% visible and a seventh group does not fit. The
answer is a second row on the phone, measured at about 92px against
the 380px four-row stack this file records rejecting. Not worth doing
until a control actually needs the space.

Two things deliberately **not** on this list, so they are not
rediscovered as gaps: no font-family control and no point sizes. The
face follows the script and the sizes are steps, which is this file's
own typography doctrine.

- Every work and fatwa has its files. Nothing is owed.
- The twenty-two works still carry no `date`. Not cosmetic: the
  *Recently added and updated* strip is ordered by `updated || date`, so
  a work without either can never appear there however recently it is
  added. Only the author knows these.
- There is no `/library/` page and no filter UI, deliberately. At
  twenty-four records a faceted library is overhead the corpus does not
  yet earn; the homepage catalogue is the library. Revisit when it grows.
- The bio is on two pages now — the homepage's collapsed `editor:about`
  region and `author/index.html`. Both are generated from the same
  `about` block so they cannot disagree, and `/author/` is the one
  carrying `ProfilePage`. If the duplication ever matters, the move is to
  cut the homepage's copy down to the summary and let it link on; that
  costs the front door its most-read prose, which is why it was not done
  first.
- The `apps` category holds one app, the Zakat calculator, at
  `apps/zakat-calculator.html`. Adding another is a form: **+ Add an app**
  in the editor, then the address, the version, the platforms and what is
  new. No screenshot on the page yet — the author has one.
- The `posts` category's English/Urdu pairs are joined by `alsoIn`. That
  is still the right home for the *crossing* — it belongs to the record
  and not to a sentence in it — but the claim that once sat here, that
  the block format has no way to write a link inside the writing, is no
  longer true: it has one, and `alsoIn` is kept separate on purpose
  rather than for want of a mechanism.
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
