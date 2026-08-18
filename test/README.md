# Tests

This folder is **not part of the website**, the same way `worker/` is not.
The site stays plain static files that open from the file system with no
build step. These are tests that drive a real browser over it.

```
npm install          # once, in this folder — fetches Playwright
node editor.mjs      # the editor          — from anywhere in the repository
node homepage.mjs    # the library         — likewise
npm test             # both
```

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

Four faults were found in the library by measuring the rendered page, and
every one of them was invisible in the source:

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
  opposite ends of a 1130px head.

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
- **Nothing pushes the page sideways**, at nine widths from 1920 to 380.

## When it fails

It prints the boxes it measured. A row whose title and kind label parted
company shows both edges, so it is usually clear at a glance which side
each went to.
