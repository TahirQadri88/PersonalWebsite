# What makes this repository heavy

A report, written 17 November 2026. **Nothing here has been moved, renamed,
compressed or deleted.** It is for deciding later.

## The numbers

| | |
| --- | --- |
| Files over 2 MB | **21 files, 132 MB between them** |
| All PDFs anywhere in the repo | **135 MB** |
| Whole working tree (what you see in the folder) | **153 MB** |
| `.git` — **what a clone actually downloads** | **181 MB** |

So the PDFs are **88%** of the working tree. Everything else — every page, every
stylesheet, every script, every image and all seven fonts — comes to about 18 MB.

## The 21 files over 2 MB

```
  17.1 MB  files/presentations/ilm-ul-meerath-slides-colour.pdf
  12.3 MB  files/presentations/ilm-ul-meerath-slides-printable.pdf
   9.7 MB  files/researched-upon-booklets/bustan-bani-amir.pdf
   9.6 MB  files/study-notes-…-hanafi-fiqh/asbab-e-saba.pdf
   9.4 MB  files/my-fatawa/vegetarianism-and-veganism-urdu.pdf
   9.3 MB  files/my-fatawa/wealth-abdul-rehman-ibn-auf-urdu.pdf
   8.8 MB  files/my-fatawa/Otherthan-Surah-Falaq-Nas-Dam.pdf
   7.7 MB  files/study-notes-…-hanafi-fiqh/sai-ul-ifham.pdf
   7.1 MB  files/my-fatawa/qata-taalluq.pdf
   6.6 MB  files/fonts/jameel-noori-nastaleeq.woff2
   4.0 MB  files/presentations/hajj-charts/06-jurm-aur-kaffaray.pdf
   3.7 MB  files/booklets-authored/nfts.pdf
   3.7 MB  files/my-fatawa/commodity-exchange-english.pdf
   3.7 MB  files/presentations/roza-ke-ahem-masail.pdf
   3.6 MB  files/my-fatawa/commodity-exchange-urdu.pdf
   3.4 MB  files/researched-upon-booklets/bay-al-hayawan.pdf
   3.2 MB  files/researched-upon-booklets/al-ithaf-fazail-tawaf.pdf
   2.6 MB  files/presentations/hajj-charts/01-ehram-kya-hai.pdf
   2.5 MB  files/presentations/hajj-charts/02-meeqat-aur-hudood-e-haram.pdf
   2.2 MB  files/booklets-authored/khutba-hajjatul-wida.pdf
   2.0 MB  files/presentations/hajj-charts/05-ehram-ke-jaaiz-kaam.pdf
```

By folder: `my-fatawa` 41.9 MB (6) · `presentations` 33.0 MB (3) ·
`study-notes…` 17.3 MB (2) · `researched-upon-booklets` 16.3 MB (3) ·
`hajj-charts` 11.2 MB (4) · `fonts` 6.6 MB (1) · `booklets-authored` 6.0 MB (2)

## The thing that is easy to get wrong

**Moving the PDFs out of the folder today would not make the download smaller.**
Git keeps every version of every file that was ever committed, so a fresh clone
would still pull the same 181 MB out of history. Taking a file out of the folder
only stops it growing from here.

Making the *download* smaller means rewriting the repository's history, which
replaces every commit, breaks anyone else's copy, and cannot be undone casually.
That is a real option, but it is a separate decision from where the PDFs live.

## Options, with what each actually buys

**1. Host the PDFs somewhere else and keep every link working.**
This is the natural fit, because **the site already supports it.** `content.js`
stores each file's address, and `site.isOffsite` in `common.js` already handles
addresses that point away from the site — some files are on Google Drive today
and work correctly. So this is a change of addresses in `content.js`, not a
change to how the site works. A reader clicking "Read PDF" would not notice.

- Good: the folder stops growing; new rulings cost nothing.
- Cost: the files then depend on another service staying up, and the share-card
  and sitemap work stays exactly as it is.
- Where: Cloudflare R2 is the natural choice, since the domain is already on
  Cloudflare. GitHub Releases is a free alternative that keeps everything in one
  account.

**2. Make the PDFs themselves smaller, in place.**
Several of these are very likely scans or exports saved at full resolution.
A 17 MB slide deck is unusual. It is common to get 50–80% off a PDF like that
with no visible loss, and the repository's own notes record doing exactly this
successfully for the infographics (2.33 MB → 1.41 MB with *more* content).

- Good: nothing moves, no new service, every link unchanged.
- Cost: it replaces the author's own files, so each one needs looking at
  side by side before and after — this repository's rule is that a visual
  judgement is made by looking, not by a number.
- **This has not been done and should not be without your say-so.**

**3. Leave it alone.**
Worth stating plainly: 181 MB is a slow first clone and nothing worse. It costs
readers nothing — a reader downloads one PDF, never the repository. It costs you
nothing day to day. It only costs a few minutes whenever a fresh copy is made.

## The one file here that is not a PDF

`files/fonts/jameel-noori-nastaleeq.woff2`, 6.6 MB, is the Urdu reading face and
it is deliberate. `docs/LESSONS.md` carries the measurements behind it — what it
costs a reader on each kind of connection, why subsetting it saves only 1.3%, and
the Save-Data branch that withholds it from anyone whose browser asks. Do not
treat it as a file to trim; that argument has already been had and written down.
