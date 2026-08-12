# Testing the editor

This folder is **not part of the website**, the same way `worker/` is not.
The site stays plain static files that open from the file system with no
build step. This is a test that drives a real browser over `admin.html`.

```
npm install          # once, in this folder — fetches Playwright
node editor.mjs      # from anywhere in the repository
```

It serves the repository over `http://127.0.0.1:4321` from memory, with
`admin.js` altered in exactly two ways: the Firebase key is blanked and the
passphrase hash is one this file knows, so the gate opens without a real
account. Nothing is written to the repository, so a run that dies half way
leaves nothing behind.

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

The last of those is why the box and the file must agree down to the order
of the classes on an element. Nothing renders differently for it, but a
comparison loose enough to ignore class order is loose enough to miss a
block losing its script — so `makeBlock` writes them in the order
`bodyToHtml` does, rather than the test being weakened to accept both.

## When it fails

It names the test and, for the round trip, the exact character where the
two versions part with the text either side. That is usually enough to see
which block kind or which mark was dropped.

A test that cannot fail is worth nothing, so the three bugs above were put
back one at a time to confirm each is caught before this was committed.
