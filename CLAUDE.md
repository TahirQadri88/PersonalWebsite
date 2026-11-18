# Scholarly Works and Research — project notes

Personal scholarly library for **Abul Laith Muḥammad Ṭāhir Qādrī An-Naʿīmī**
(أبو اللّیث محمد طاہر القادری النّعیمی), teacher of dars-e-niẓāmī at Jamia tun Noor,
Karachi: his booklets, edited Ḥanafī manuscripts, charts, articles and fatāwā in
Urdu, Arabic and English. Replaces an older Notion/Super site.

## Stack

Plain static HTML, CSS and vanilla JS. **No build step, no framework, no
dependencies.** Opening `index.html` from the file system must keep working —
do not introduce anything that requires bundling, `npm run`, or a dev server.
Deployed on GitHub Pages.

The one exception is `worker/`, which is not part of the site: a Cloudflare
Worker so the editor can publish without a GitHub token sitting on a phone.
Delete it and every page still works. Never let it become a dependency.

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
share-card.html share-card.png   the card for a link to the site itself
files/images/   the seal used as favicon and header mark, and the calligraphed name
files/cards/    one link-preview picture per post/work/fatwa, drawn by admin.js
files/fonts/    Mehr Nastaliq Web, Aslam, and four small patch faces
```

## Where the long memory lives

Everything this project has learned — every rule, measurement and mistake, word
for word — is in **`docs/LESSONS.md`**: 5,400 lines, to search rather than read.
**Before changing an area, grep `docs/LESSONS.md` for that area's lessons. Don't
read the whole file.** `grep -n "search box" docs/LESSONS.md` finds one area;
`grep -n "^### " docs/LESSONS.md` lists every lesson title.

## Rules that matter — the short list

Each line is the rule; the reasoning is in `docs/LESSONS.md` under the same name.

**Content and structure**

- All content lives in `content.js`. Never hardcode a work into `index.html`.
- IDs are permanent. Never regenerate them from array position, never rename one.
- A work with no files renders as "Not published here yet". That is a normal state.
- All strings from `content.js` go through `site.escapeHtml` before `innerHTML`.
- Adding a work by hand means editing `sitemap.xml` too.
- A new field must be added to `writeRecord` in `admin.js` or a publish drops it.
- A field the form offers and the page ignores is a button that does not do what it says.
- A kind, a description and a date are each shown in the language the record reads in.
- The site's own words about the library — the way back, More in, the meta line —
  are set in the site's own direction, whatever the piece is.
- A publish sends only the records whose signature moved, plus the files built from
  the whole library. No baseline means send everything; **Rebuild every page** forces it.

**Typography**

- Urdu renders in Nastaleeq, Arabic in Naskh. Set `language` on every entry.
- A font stack is a claim about coverage, and a claim is worth measuring — read the
  cmap, not the reputation. This has been paid for five times.
- Never put `.urdu` on something that has a size or an alignment of its own: it brings both.
- The same goes for any class borrowed so a selector can find it. Take a selector instead.
- Urdu in a left-reading column needs `align-left`; a *paragraph* needs `own-edge` beside it.
- Do not add `text-align: right` to an Urdu selector "for safety". It outranks `align-left`.
- A typographic judgement needs looking at, not only measuring. Render it and read it.
- A number tuned for one face does not survive the face changing.
- A mark beside a label is larger than the words; beside a heading it is smaller.

**Colour and theme**

- The two golds exist because each fails where the other works. Never collapse them.
- Ask of every token whether it is ink, a ground, or a control's face. A token doing
  two of those cannot have one night value.
- A ground that does not change theme must not carry contents that do (the hero, the footer).
- There are four kinds of colour literal: `#hex`, `rgba()`, a `filter:` chain, and a
  `box-shadow`. A sweep that looks for one will not see the others.
- Contrast says whether a word can be read. It says nothing about whether a card
  looks like a card.
- An ornament goes where the words are not, and the width it is safe at is a
  measurement. The site has one figure of its own; do not draw a second.

**Motion and behaviour**

- Three cases, always: no JavaScript, no `IntersectionObserver`, and
  `prefers-reduced-motion` must each leave the thing exactly as it should look.
- Nothing may start invisible waiting for a script to reveal it.
- A scroll written in JavaScript is motion too.
- A scroll-driven animation (`animation-timeline`) ignores the reduced-motion block's
  duration rule. `auto` hands it back to the clock; `none` pins it invisible for ever.
- A rule that fails to animate is still a rule. A progress bar that fails to animate
  is a false statement — put that one behind `@supports`.
- A stagger says "these arrived together". Count it per arrival, never for the
  life of the page, or a thing that arrives alone is held back for a group of one.
- A control that fails must say so. A silent control is indistinguishable from a broken one.
- An error should name its own remedy.

**Measuring**

- When a fresh probe reports a large fault rate, suspect the probe.
- A ratio near 1.00 on text means the probe is wrong, not the page.
- Measure a tap target by tapping it (`elementFromPoint`), not by its box.
- The measurement outranks the inference: arithmetic saying a control is too small
  is not a fault until a finger fails to land on it.
- When a change makes a string longer, measure the box it has to fit in.
- When a measurement needs a tolerance, find out what is filling it.
- When a report says something is wrong and the measurement says it is right,
  ask *when* the measurement was taken.

**Tests**

- Put the fault back once, and watch the new test fail. A test that cannot fail is
  worse than no test: it says the fault is guarded.
- Count what you matched, in every group that matches a set.
- A guard that inspects only what is marked cannot see what is not.
- A guard whose subject the fixture cannot produce asserts nothing. Label it a
  companion, or verify that half outside the suite, and say which.
- Measure the ink, not the element's box. A box is wider than its words.
- Do not reach for `networkidle` in these suites.

## Testing — what to run and when

**While editing, do not run the suites after every small change.** Run only the
suite for the files you touched, once, at the end, before you push.

| If you changed | Run |
| --- | --- |
| `script.js`, `common.js`, or the library's CSS | `node test/homepage.mjs` |
| `admin.js` | `node test/editor.mjs` |
| `worker/` | `node worker/test.mjs` |

- **Content-only changes** — a new post, a PDF, a text fix, nothing in JS or
  CSS — skip the browser suites entirely.
- If a test fails, fix it and **rerun only that suite**. `test/README.md` says
  what each suite covers and why.

## Working on this

- Preview: open `index.html` directly, or `python -m http.server 4173`.
- Check Urdu at ~380px after any layout change — that is where Nastaliq breaks first.
- Search with `grep` and read only the parts of files you need; these files are large.
- Work on a branch. Small commits, plain language — the author reads the history.
- The address `https://tahirqadri.com.pk/` is written in five places that change
  together: `site.baseUrl` in `content.js`, `robots.txt`, `sitemap.xml`, the
  canonical and sharing tags in `index.html`, and `CNAME`.

## Outstanding

The live list is the **Outstanding** section at the foot of `docs/LESSONS.md`. In
short: a fatwa still cannot be written in the editor, the attestation block is
unbuilt, the twenty-two works carry no date.
