# Tests

This folder is **not part of the website**, the same way `worker/` is not.
The site stays plain static files that open from the file system with no
build step. These are tests that drive a real browser over it.

```
npm install          # once, in this folder — fetches Playwright
node editor.mjs      # the editor          — from anywhere in the repository
node homepage.mjs    # the library         — likewise
node ../worker/test.mjs   # the editor's backend — needs nothing at all
npm test             # both browser suites
```

About thirty seconds for the editor, under two minutes for the library,
and the Worker's is instant. Keep them that way: `homepage.mjs` ran for
seven and a half minutes until every page load stopped waiting on
`networkidle` — and Google's CDN is turned away at the top of both files,
so there was never anything for it to go quiet about. `domcontentloaded`
plus `document.fonts.ready` is the right wait here; the library is drawn
by the time the document has loaded, because `script.js` runs at the end
of `<body>`.

Neither writes anything to the repository, so a run that dies half way
leaves nothing behind, and neither needs the network: both turn Google's
font CDN away and serve the repository from a local port of their own —
`4321` for the editor, `4322` for the homepage.

---

# editor.mjs

It serves the repository over `http://127.0.0.1:4321` from memory, with
`admin.js` altered in exactly three ways: the Firebase key is blanked and the
passphrase hash is one this file knows, so the gate opens without a real
account; and `BACKEND` is pointed at `/publish`, which the browser answers
itself, so the publish path the Worker sits behind can be driven without a
Worker. Nothing else is changed, so what is tested is the file that gets
deployed.

## Why it exists

The check that ran before every commit for months loaded `admin.html`,
measured that it did not scroll sideways at five widths, and ran an
accessibility pass. It never typed a character into the writing box, never
pressed a toolbar button, never exported a post and read it back — thorough
about how the editor *looked*, silent about what it *did*.

Three bugs lived in that silence for weeks, and all three were found by the
author mid-sentence, in a piece they were trying to write:

- the Script buttons cleared a block's language instead of setting it, so a
  line changed font by itself when you tried to confirm the language it was
  already in;
- a heading marked with a script of its own was drawn in the piece's script
  instead, because a rule reached through the container outranks the block's
  own class;
- a publish grew past the number of files the Worker would accept, when
  works' pages and link-preview cards were added and its ceiling was not.

A fourth was found the same way, after these were written: an update to a
post was published from a tab left open since before the site last changed.
That tab rebuilt every page the way it used to be, which is exactly what was
already committed, so the Worker found nothing differing and committed
nothing — and the editor reported that in the same green it reports a real
publish in. The one message that means *your edit did not go out* was
coloured like the one that means *it did*.

Each is a test here now. Adding `works/<id>.html` and `files/cards/<id>.jpg`
to what a publish sends is what broke the last one, and the file that holds
the ceiling was open at the time — so the last test reads `MAX_FILES` and
`MAX_FILE_BYTES` out of `worker/src/index.js` and counts a real publish
against them, rather than trusting anyone to look up.

## What it covers

- **Style** — each button makes the right element, says so on itself, and
  pressing it twice goes back to ordinary text.
- **Script** — a press sets and never clears, one script replaces another,
  and neither reaches the line beside it.
- **A block's own script wins** over the piece's, for a heading as well as
  a paragraph — the CSS specificity trap above.
- **Enter** — a heading gives ordinary text, a quote and a footnote carry
  on as themselves, and the script of the line above comes with them.
- **Kind, script and alignment are separate** and combine on one block.
- **Paste** — WhatsApp's own marks for a heading and a quotation.
- **Written out and read back** — the strongest one. Everything above is
  built up in the box, exported, served back, and opened again; the box has
  to be identical, character for character. The failure it guards against
  has a name: opening a finished piece to fix a comma and finding the verse
  in the middle of it has quietly become a paragraph.
- **A publish fits** what the Worker will accept, in file count and size.
- **A publish that committed nothing** reads as calm when nothing was
  edited and as a failure when something was — the fourth bug below.
- **A tab older than the served editor** says so on load, without erasing
  what the Worker check said in the same box, and says nothing at all when
  it cannot tell.

The round trip is why the box and the file must agree down to the order
of the classes on an element. Nothing renders differently for it, but a
comparison loose enough to ignore class order is loose enough to miss a
block losing its script — so `makeBlock` writes them in the order
`bodyToHtml` does, rather than the test being weakened to accept both.

## When it fails

It names the test and, for the round trip, the exact character where the
two versions part with the text either side. That is usually enough to see
which block kind or which mark was dropped.

A test that cannot fail is worth nothing, so the four bugs above were put
back one at a time to confirm each is caught before this was committed.

---

# homepage.mjs

The same idea one floor down: it asks the browser where things on
`index.html` actually landed.

## Why it exists

Eight faults have been found in the library by measuring the rendered
page, and every one of them was invisible in the source:

- the fatawa grid resolved to four columns with five fatawa in it, so one
  card sat alone on a second row and set that row half again as tall as the
  one above;
- three Urdu section labels inherited `text-align: right` from `.urdu` and
  landed at the far edge of a block whose English heading started at the
  other — up to 1180px away from the words they named;
- every library row pinned its kind label to the left edge while setting the
  title flush right, leaving roughly 600px of nothing between them, and
  mirrored itself whenever an English title turned up in the same list;
- a category's two names, which are one name in two scripts, were set at
  opposite ends of a 1130px head;
- the recently-updated strip went up at 575px — 64% of a 900px viewport —
  and pushed the library, which is the point of the site, to y=2021;
- **the hero's Urdu line began 234px in** while the eyebrow, the headline
  and the paragraph above it all began at the column edge. It had been
  wrong since the day the hero was written, and no review had caught it:
  the line carries `dir="rtl"`, which turns even an inherited
  `text-align: start` into right, so nothing in the markup says so;
- **every open library row** set its two descriptions at opposite edges,
  the Urdu flush right and the English flush left, two accounts of one work
  in one panel;
- **the Zakat app's description** was ragged on the edge it reads from.
  `align-left` on a paragraph of Urdu pins every line at the left — which
  means every line *begins*, on the right where the script begins, in a
  different place. Its lines ran `[192→808], [192→828], [192→678]`. The
  English equivalent is a paragraph set ragged-left, and nobody would ship
  that. It had passed the stacked-pairs check below, because that check
  asks where a block *starts* and this fault is inside the block.

The two before last were found by the test itself rather than by anyone
looking, which is the whole argument for it. The last was found by the
author, reading the page — which is the argument for the group that now
measures it.

None would fail a linter. None changed a single string. They were all
geometry, which is why this test measures rather than reads.

## What it covers

- **The fatawa grid** — three columns, no card alone on a row, cards level
  within a row, and no description long enough to swell one.
- **A row reads on one axis** — title, kind label and metadata all start
  from the side the record's own script starts from, whichever that is,
  and nothing sits across the row from the title.
- **A row says what it would open** — how many files and in what format,
  the language of the files rather than of the title, and the date where
  there is one. A record still waiting for its document claims nothing.
- **Labels stay beside what they name** — every Urdu label on the page,
  section labels and category names alike.
- **A category is named once** — both names on one edge, and the count
  matching the rows actually under it.
- **The search still works** — finds, marks the word inside the title,
  hides what does not match, says so when nothing does, and restores.
- **Opening a row** — the detail block follows its title to the right on a
  right-to-left record, keeps its links and its share button, and only one
  work stays open at a time.
- **Urdu stacked against English starts on the same edge** — the big one.
  Any block of Urdu with a block of English directly above or below it, on
  four pages at two widths: 89 pairs. Two lines stacked in one column
  should begin together whatever scripts they are in.

  Which edge it compares depends on how much Urdu there is. On **one
  line** the block hugs its own words, so the ink *is* the block and
  comparing ink is what caught the hero's 234px drift. On **several** the
  ink is legitimately ragged on the far side, so the block's own left edge
  is the honest measure — comparing ink there would flag correctly set
  prose.

  It is narrow on purpose. Urdu *among* Urdu is right-set because that is
  how the script sets, and flagging it would be flagging the language for
  being itself; a box shrunk to `fit-content` and placed at the margin is
  positioned rather than aligned, which a work's page does deliberately so
  a long run of English still reads from its own left. Both are skipped —
  and the `fit-content` case is asked **first**, before the line count,
  since such a box is placed whether it holds one line or four. What is
  left is the case that has gone wrong seven times.
- **Urdu sets flush on the edge it reads from** — the other half of the
  same question, and the one the Zakat page needed. The check above asks
  whether two stacked blocks *start* together; this asks whether the lines
  *inside* one block do. Every block of Urdu or Arabic taking more than one
  line, on three pages at two widths — 64 of them — must have its right ink
  edges within 3px of each other. Ragged on the far side is right; ragged
  on the reading side is the fault.

  Two exemptions. A post's body is skipped: the writing box has alignment
  buttons and an author who pressed one made a decision, which is not this
  rule's business. And an inline Arabic phrase quoted inside an English
  sentence — a book title, a line of hadith — flows with the line it sits
  in and cannot be flush with anything; that is what `.arabic-inline` is
  for.
- **Recently added and updated** — the strip stays under 400px and under
  half the viewport, a card under 190px, and the library starts by 1900px,
  so it cannot grow back into a second screen. Its meta line stays one line.
  The ticker clones the card set exactly once, every clone is hidden from a
  screen reader and out of the tab order, and hovering pauses it.
- **An app's row opens the app** — straight to the app, in its own tab,
  with the page about it beside rather than instead; and the line under the
  title says it opens rather than reads, naming no language for something
  that has two.
- **An icon always ends up drawn** — the three cases that are the entire
  safety argument for animating anything here: no JavaScript, no
  `IntersectionObserver`, and a reader who asked for less motion each leave
  the drawing whole. The cards' arrival is held to the same three.
- **The icons themselves** — the sprite is written in once, holds every
  drawing in `ICONS` (counted out of `common.js`, not written down here),
  and every `<use>` resolves to a symbol that exists.
- **The page is not carrying dead weight** — the fonts are woff2 and the
  calligraphy stays under 40KB. It was 961KB once.
- **The page breathes without falling apart** — the space between sections
  measured against the space between cards inside them.
- **Nastaliq has room for its own overhang** — Mehr draws up to 4.75px past
  the right edge of the box that lays it out.
- **The rail says where you are** — `aria-current` follows the section you
  are reading, and moving it scrolls the rail and not the page.
- **Nothing pushes the page sideways**, at nine widths from 1920 to 380.

## When it fails

It prints the boxes it measured. A row whose title and kind label parted
company shows both edges, so it is usually clear at a glance which side
each went to.

---

# ../worker/test.mjs

The editor's backend, tested without a browser and without a network. It
imports the Worker directly and hands it requests, so it needs no
dependency at all — the same reason the site has none. 69 checks, instant.

## Why it matters more than it looks

It is the gate on the deploy. `.github/workflows/deploy-worker.yml` runs
this before it ships anything, so a failure here means the Worker does not
go out — which is the right way round, because the Worker is the one piece
that can write to the repository.

## What it covers

- **Who may publish** — a token from another project, another account in
  the same project, one naming nobody, an Access token where a Firebase one
  is expected: each refused with the right status. And with nothing
  configured at all it refuses rather than falls open.
- **What may be written** — every path the editor sends, against the
  Worker's own `WRITABLE` list, and the paths that must stay refused:
  `404.html`, `about/index.html`, `index.htm`, and anything trying to climb
  out of `apps/` or `files/cards/`.
- **That `content.js` parses** before it is allowed anywhere near the
  branch. If the editor ever sent something malformed the library would go
  blank for every visitor.
- **The ceiling** — file count and file size, read out of the Worker's own
  constants rather than written down twice.
- **The two constants that must move together** — `WORKER_VERSION` here
  against `WORKER_EXPECTS` in `admin.js`. They live in different files and
  have drifted before; the editor asks `/version` on load and says so, but
  only if someone bumped both. Now a half-bump cannot reach a deploy.
- **No variable in `wrangler.toml` is `""`.** A deploy replaces the
  Worker's whole variable set with what the file lists, so an empty string
  does not mean "leave alone", it means "set to nothing" — and for
  `EDITOR_EMAIL` that fails *open*, dropping the second publish lock. The
  three settings the repository does not know are commented out instead,
  and the deploy passes `--keep-vars`.

## When it fails

It names the check and prints the response it got. Every case is a request
the Worker either accepted or refused, so the fix is nearly always in
`WRITABLE` or in the sign-in checks above it.
