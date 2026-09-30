/* Tests for the library on the homepage.  Run with:  node test/homepage.mjs

   Not part of the website, the same way editor.mjs and worker/test.mjs are
   not. Needs Playwright:  npm i -D playwright

   Why this exists. Eight faults have been found here by measuring the
   rendered page, and every one of them was invisible in the source: a grid
   whose column count happened to leave a card orphaned, a label sent to
   the far edge of its block by a rule written for something else, a row
   with its title on one side and the label naming it on the other, two
   names for one category set 900px apart, a strip that took two thirds of
   the screen, the hero's Urdu line beginning 234px in from where every
   line above it began, an open library row setting its two descriptions at
   opposite edges, and a paragraph of Urdu pinned left so that every line
   began somewhere different. The sixth and seventh this file found itself;
   the eighth the author found by reading the page, and it is measured
   here now.
   None of them would fail a linter and none of them changed a single
   string. They were all geometry.

   So this asks the browser where things actually landed. Everything here
   is something a reader would notice if it broke again. */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4322);

/* Same three places editor.mjs looks, and the same reason: Playwright is a
   developer's tool, not a dependency of anything the site serves. */
const require = createRequire(import.meta.url);
let chromium;
for (const where of ['playwright', 'playwright-core',
                     '/opt/node22/lib/node_modules/playwright',
                     '/usr/lib/node_modules/playwright']) {
  try { ({ chromium } = require(where)); break; } catch { /* try the next */ }
}
if (!chromium) {
  console.error('Playwright is not installed. Run:  npm i -D playwright\n' +
    'It is only needed to run this test — the site itself has no dependencies.');
  process.exit(1);
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };

/* Straight off the repository — nothing here needs standing in for, so
   what is tested is exactly what is deployed. */
function serve() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    const file = join(ROOT, path);
    if (!existsSync(file)) { res.writeHead(404).end('not here'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

let passed = 0;
const failed = [];
function t(name, ok, detail) {
  if (ok) { passed++; console.log('  ✓ ' + name); }
  else { failed.push(name); console.log('  ✗ ' + name + (detail ? '\n      ' + detail : '')); }
}
/* How long each group takes, so a slow one can be found rather than
   guessed at. The suite runs a real browser over five pages at up to
   nine widths; without this, "the tests are slow" has no answer. */
let groupAt = Date.now();
let groupName = '';
function group(name) {
  if (groupName) console.log(`    (${((Date.now() - groupAt) / 1000).toFixed(1)}s)`);
  groupName = name;
  groupAt = Date.now();
  console.log('\n' + name);
}

const server = await serve();
const browser = await chromium.launch();
const threw = [];

/* Google's CDN is turned away, the same way editor.mjs turns it away: the
   test then needs no network at all, and everything asserted below is
   which side of a box something landed on or how many columns a grid
   resolved to — neither of which the typeface decides. Waiting on a real
   round trip to another origin would only make the run slow and its
   result dependent on someone else's uptime. */
async function open(width, path) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.route('https://fonts.g**', (r) => r.abort());
  const page = await context.newPage();
  page.on('pageerror', (e) => threw.push(width + 'px: ' + e.message));
  /* domcontentloaded, not networkidle. Google's CDN is turned away a few
     lines above, so networkidle has nothing to go quiet about and simply
     waits out its own settling period on every load — and this suite
     opens a page more than thirty times, at up to nine widths. The page
     is rendered by script.js at the end of <body>, so by the time the
     document has loaded the library is drawn; `fonts.ready` covers the
     two self-hosted faces, which is all that is left to wait for. Seven
     and a half minutes to about one. */
  await page.goto(`http://127.0.0.1:${PORT}${path || '/index.html'}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  return { context, page };
}

/* The strip advances on its own every few seconds. Every measurement of
   where it is sitting has to take hold of it first, or the number
   depends on how long the page took to load — the sort of flake that
   passes for weeks and then fails on a slow morning. A real pointerdown
   is what a reader's finger raises, and it is what stops it for good. */
async function stopAuto(page) {
  await page.evaluate(() => {
    const section = document.getElementById('recent');
    if (section) section.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
}

try {
  /* ---- the fatawa grid ---- */
  group('the fatawa grid');
  {
    const { context, page } = await open(1440);
    const grid = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.ruling')].map((el) => {
        const box = el.getBoundingClientRect();
        return { x: Math.round(box.x), h: Math.round(box.height) };
      });
      const columns = new Set(cards.map((c) => c.x)).size;
      return { columns, count: cards.length, heights: cards.map((c) => c.h),
               lastRow: cards.length % columns || columns };
    });
    t('resolves to three columns inside the 1180px shell',
      grid.columns === 3, JSON.stringify(grid));
    t('leaves no card alone on a row of its own',
      grid.count <= grid.columns || grid.lastRow > 1, JSON.stringify(grid));
    t('every card on a row stands the same height',
      new Set(grid.heights).size <= Math.ceil(grid.count / grid.columns), JSON.stringify(grid.heights));
    t('no description runs long enough to swell its row',
      Math.max(...grid.heights) - Math.min(...grid.heights) < 60, JSON.stringify(grid.heights));
    await context.close();
  }

  /* ---- the library rows ---- */
  group('a row reads on one axis');
  {
    const { context, page } = await open(1440);
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll('.work')].map((work) => {
        const edge = (el) => {
          if (!el) return null;
          const box = el.getBoundingClientRect();
          return { l: Math.round(box.left), r: Math.round(box.right) };
        };
        const head = work.querySelector('.work-head');
        return {
          id: work.getAttribute('data-id'),
          rtl: head.classList.contains('reads-rtl'),
          title: edge(work.querySelector('.record-title')),
          kind: edge(work.querySelector('.work-kind')),
          meta: edge(work.querySelector('.record-meta'))
        };
      }));

    t('there are rows to measure', rows.length > 0, String(rows.length));
    t('a right-to-left row ends its title and its kind label on the same edge',
      rows.filter((r) => r.rtl && r.kind).every((r) => Math.abs(r.title.r - r.kind.r) < 3),
      JSON.stringify(rows.filter((r) => r.rtl && r.kind && Math.abs(r.title.r - r.kind.r) >= 3)));
    t('a left-to-right row starts its title and its kind label on the same edge',
      rows.filter((r) => !r.rtl && r.kind).every((r) => Math.abs(r.title.l - r.kind.l) < 3),
      JSON.stringify(rows.filter((r) => !r.rtl && r.kind && Math.abs(r.title.l - r.kind.l) >= 3)));
    t('nothing on a row is stranded across it from the title',
      rows.every((r) => !r.meta || (r.rtl ? r.meta.r <= r.title.r + 3 : r.meta.l >= r.title.l - 3)),
      JSON.stringify(rows.filter((r) => r.meta && (r.rtl ? r.meta.r > r.title.r + 3 : r.meta.l < r.title.l - 3))));

    /* ---- what a row says it would open ---- */
    group('a row says what it would open');
    const meta = await page.evaluate(() =>
      [...document.querySelectorAll('.work')].map((work) => ({
        id: work.getAttribute('data-id'),
        text: (work.querySelector('.record-meta') || {}).textContent || '',
        pending: work.classList.contains('work-pending')
      })));
    t('every published record carries a metadata line',
      meta.filter((m) => !m.pending).every((m) => m.text.trim()),
      JSON.stringify(meta.filter((m) => !m.pending && !m.text.trim()).map((m) => m.id)));
    t('a record still waiting for its file claims nothing',
      meta.filter((m) => m.pending).every((m) => !m.text.trim()),
      JSON.stringify(meta.filter((m) => m.pending && m.text.trim()).map((m) => m.id)));
    t('a piece that reads on the site says so, and gives its date',
      meta.some((m) => /Read here/.test(m.text) && /\d{4}/.test(m.text)),
      JSON.stringify(meta.map((m) => m.text)));
    t('a record with several files counts them',
      meta.some((m) => /^\d+ PDFs/.test(m.text.trim())),
      JSON.stringify(meta.map((m) => m.text)));
    /* An English piece is labelled in English. The kinds are catalogued
       in Urdu, so an English essay wore مضمون on its row, its page and
       its share card until site.recordKind translated it. */
    const kinds = await page.evaluate(() =>
      [...document.querySelectorAll('.work')].map((work) => {
        const label = work.querySelector('.work-kind');
        const record = window.site.findRecord(work.getAttribute('data-id'));
        return label ? {
          id: record.id,
          language: record.language,
          text: label.textContent.trim(),
          latin: label.classList.contains('latin'),
          font: getComputedStyle(label).fontFamily,
          size: Math.round(parseFloat(getComputedStyle(label).fontSize))
        } : null;
      }).filter(Boolean));
    const arabicScript = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
    t('a left-to-right record is labelled in a script it reads',
      kinds.filter((k) => k.language === 'en').every((k) => k.latin && !arabicScript.test(k.text)),
      JSON.stringify(kinds.filter((k) => k.language === 'en')));
    t('a right-to-left record keeps its own word',
      kinds.filter((k) => k.language !== 'en').every((k) => !k.latin && arabicScript.test(k.text)),
      JSON.stringify(kinds.filter((k) => k.language !== 'en' && k.latin)));
    /* The rule that sets an English title in the display serif used to
       reach the kind beside it and set "Essay" at 19px next to a 12px
       metadata line. It is scoped to .record-title now. */
    t('an english kind is not dressed as a title',
      kinds.filter((k) => k.latin).every((k) => k.size <= 14 && !/Newsreader/.test(k.font)),
      JSON.stringify(kinds.filter((k) => k.latin)));

    t('the language named is the file’s, not the title’s',
      /* An Urdu-titled article whose only file is an English PDF must say
         English. This is the whole point of the line — it describes what
         opening it would get you, which is not always what the title is
         written in. */
      meta.some((m) => /English/.test(m.text)) && meta.some((m) => /Arabic/.test(m.text)),
      JSON.stringify(meta.map((m) => m.text)));
    await context.close();
  }

  /* ---- the section labels ---- */
  group('an urdu label stays beside what it names');
  {
    const { context, page } = await open(1440);
    const labels = await page.evaluate(() =>
      [...document.querySelectorAll('.section-label.urdu, .category-urdu')].map((el) => {
        const block = el.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(el);
        const text = range.getBoundingClientRect();
        return { text: el.textContent.trim().slice(0, 20), fromLeft: Math.round(text.left - block.left) };
      }));
    t('there are labels to measure', labels.length >= 8, String(labels.length));
    t('none of them has drifted to the far edge of its block',
      labels.every((l) => l.fromLeft < 4),
      JSON.stringify(labels.filter((l) => l.fromLeft >= 4)));
    await context.close();
  }

  /* ---- urdu stacked against english ----

     The rule above measures the labels, because labels are what went
     wrong. This measures the family they belong to: a block of Urdu with
     a block of English directly above or below it, on four pages at two
     widths. Two lines stacked in one column should begin on the same
     edge, whichever scripts they are in.

     This is where the fault keeps coming back, and it has now been found
     seven times. `.urdu` carries `text-align: right` along with the
     font, and an Urdu element also carries `dir="rtl"`, which turns even
     an inherited `text-align: start` into right — so the words go to the
     far edge of their own box while the English line above starts at the
     column edge. Nothing in the markup says so. Two of the seven were
     found by this check and by nothing else: the hero's Urdu line, wrong
     since the day it was written, and every open row in the library,
     where the two descriptions of one work sat at opposite edges.

     Deliberately not a sweep of every Urdu element. A block of Urdu
     among other Urdu — the bio, a post's body — is right-aligned because
     that is how the script sets, and flagging it would be flagging the
     language for being itself. It is only when the two are stacked that
     they have an edge to share. */
  group('urdu stacked against english starts on the same edge');
  {
    const PAGES = ['/index.html', '/apps/zakat-calculator.html',
                   '/posts/reservations-shariah-screening-stocks.html',
                   /* The only page carrying an Arabic footnote *and* an
                      English cross-link inside an RTL container — neither
                      arrangement had ever been measured. */
                   '/posts/log-barabar-kyun-nahin.html',
                   /* The first pages putting Arabic honorifics inside
                      English prose — an RTL run of a *third* script in a
                      left-reading paragraph, which neither the Urdu nor
                      the Latin cases above had ever covered. */
                   '/posts/the-strong-and-the-trustworthy.html',
                   '/posts/qawi-aur-ameen.html',
                   '/works/saa-ki-tahqeeq.html',
                   /* Both landing pages. The fatawa page stacks an Urdu
                      description against its English one inside every
                      card — six of them, the arrangement this group was
                      written for — and the author page is a column of
                      Urdu prose under English headings. Neither had ever
                      been measured, because neither existed. */
                   '/fatawa/index.html',
                   '/author/index.html'];
    const measure = () => {
      const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
      const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3)
        .map((n) => n.textContent).join('').trim();
      const script = (text) => {
        const rtl = (text.match(ARABIC) || []).length;
        const lat = (text.match(/[A-Za-z]/g) || []).length;
        if (!rtl && !lat) return '';
        return rtl > lat ? 'rtl' : 'ltr';
      };
      /* Where the words are, not where the box is. */
      const ink = (el) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const x = [...r.getClientRects()].filter((v) => v.width > 0.5 && v.height > 0.5);
        if (!x.length) return null;
        return { left: Math.min(...x.map((v) => v.left)), right: Math.max(...x.map((v) => v.right)),
                 top: Math.min(...x.map((v) => v.top)), bottom: Math.max(...x.map((v) => v.bottom)) };
      };
      const isBlock = (el) => {
        const d = getComputedStyle(el).display;
        return d === 'block' || d === 'flex' || d === 'grid' || d === 'list-item';
      };
      const resolved = (el) => {
        const cs = getComputedStyle(el);
        let a = cs.textAlign;
        if (a === 'start' || a === '') a = cs.direction === 'rtl' ? 'right' : 'left';
        if (a === 'end') a = cs.direction === 'rtl' ? 'left' : 'right';
        return a;
      };
      /* A box shrunk to its own longest line is *placed*, not aligned. A
         work's page does this deliberately — section 11 of styles.css
         explains why — so that the box ends at the page's margin while a
         long run of English still reads from its own left. Judge those on
         where the box sits, not on which way the text runs inside it. */
      const fits = (el) => {
        const b = el.getBoundingClientRect(), k = ink(el);
        return !!k && b.width - (k.right - k.left) < 10;
      };

      const pairs = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.getClientRects().length) continue;
        const text = own(el);
        if (script(text) !== 'rtl' || !isBlock(el)) continue;
        /* A tag is a pill in a wrapping row, not a line of a column. A
           post's body carries the alignment its author chose block by
           block in the writing box — a decision, not a default. */
        if (el.closest('.tag-row, .post-body, .writing-canvas')) continue;

        for (const sib of [el.previousElementSibling, el.nextElementSibling]) {
          if (!sib || !sib.getClientRects().length) continue;
          /* The sibling's own words, or those of the one thing inside it
             — a paragraph holding a single link still counts. */
          const sibText = own(sib) || (sib.children.length === 1 ? sib.textContent.trim() : '');
          if (script(sibText) !== 'ltr' || !isBlock(sib)) continue;
          const a = ink(el), b = ink(sib);
          if (!a || !b) continue;
          /* Stacked, not side by side. Two things on one line of a flex
             row are siblings too, and of course they do not start
             together — that is what a row is. */
          if (a.top < b.bottom - 2 && b.top < a.bottom - 2) continue;

          const ea = resolved(el), eb = resolved(sib);
          if (/center|justify/.test(ea) || /center|justify/.test(eb)) continue;

          const one = { urdu: text.replace(/\s+/g, ' ').slice(0, 24),
                        cls: String(el.className).slice(0, 34),
                        english: sibText.replace(/\s+/g, ' ').slice(0, 24) };

          const parent = el.parentElement;
          const ps = getComputedStyle(parent);

          /* A box that hugs its own longest line is placed rather than
             aligned, and that is true whether it holds one line or four —
             so this has to be asked before anything below it. */
          if (fits(el) || fits(sib)) {
            const ab = el.getBoundingClientRect(), bb = sib.getBoundingClientRect();
            const side = ps.direction === 'rtl' ? 'right' : 'left';
            pairs.push({ ...one, edge: 'box-' + side,
              apart: Math.round(side === 'right' ? ab.right - bb.right : ab.left - bb.left) });
            continue;
          }

          /* Two stacked blocks in different scripts do not share an
             alignment — each sets on its own reading edge, which is what
             `own-edge` is for and what the group below measures. What
             they must share is where the *block* begins in the column.

             Which edge to compare depends on how many lines the Urdu
             takes. On one line the block hugs its words, so the ink is
             the block and comparing ink catches a line that has drifted
             — the hero's did, by 234px, and nothing else found it. On
             several lines the ink is legitimately ragged on that side,
             so the block's own edge is the honest measure. */
          const lines = (() => {
            const rows = [];
            const rr = document.createRange();
            rr.selectNodeContents(el);
            for (const x of [...rr.getClientRects()].filter((v) => v.width > 0.5 && v.height > 0.5)) {
              if (!rows.some((y) => Math.abs(y - x.top) < Math.max(4, x.height * 0.5))) rows.push(x.top);
            }
            return rows.length;
          })();
          if (lines > 1) {
            /* The edge the block *begins* on, which is the right one in a
               right-reading column — not the left one always.
               Hardcoding left was wrong and said so the first time a
               title grew long enough to wrap: the Urdu title of a post
               and the date under it were reported 78px apart while their
               right edges — where the script starts, and where a reader
               looks — sat at exactly the same pixel. The 78 was on the
               far side, where Urdu *ends*, and it was there because the
               two blocks carry different max-widths, which is a layout
               fact and not a fault.
               Nothing is weakened by this: in a left-reading column,
               where every fault this group has caught actually lived,
               "begins" is still the left edge and the measure is
               unchanged. */
            const ab = el.getBoundingClientRect(), bb = sib.getBoundingClientRect();
            const side = ps.direction === 'rtl' ? 'right' : 'left';
            pairs.push({ ...one, edge: 'block-' + side, lines,
              apart: Math.round(side === 'right' ? ab.right - bb.right : ab.left - bb.left) });
            continue;
          }
          /* Pulling to opposite edges is the fault itself, not a distance
             — there is no tolerance that makes it acceptable. */
          pairs.push({ ...one, edge: ea === eb ? ea : ea + '/' + eb,
            apart: ea !== eb ? 9999 : Math.round(ea === 'right' ? a.right - b.right : a.left - b.left) });
        }
      }
      return pairs;
    };

    /* One context per width walked across the four pages, rather than a
       fresh browser for each — and domcontentloaded plus a real wait on
       the fonts rather than networkidle, which here only waits out a
       timeout because Google's CDN is already turned away. */
    let seen = 0;
    const apart = [];
    for (const width of [1440, 380]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.route('https://fonts.g**', (r) => r.abort());
      const page = await context.newPage();
      page.on('pageerror', (e) => threw.push(width + 'px: ' + e.message));
      for (const path of PAGES) {
        await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        /* Every fold open, or half the Urdu on the site is never seen. */
        await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
        await page.waitForTimeout(120);
        const rows = await page.evaluate(measure);
        seen += rows.length;
        rows.filter((r) => Math.abs(r.apart) > 8).forEach((r) => apart.push({ width, path, ...r }));
      }
      await context.close();
    }
    t(`there are stacked pairs to measure — ${seen} of them`, seen >= 40, String(seen));
    t('every one of them begins on the same edge as the line it sits with',
      apart.length === 0, JSON.stringify(apart.slice(0, 6), null, 1));
  }

  /* ---- urdu sets on its own edge ----

     The check above asks whether two stacked lines *start* together. It
     is not the whole question, and the Zakat app's page proved it: the
     Urdu description passed that check while reading badly, because
     `align-left` on a paragraph of Urdu pins every line at the left —
     which means every line *begins*, on the right where the script
     begins, in a different place. The English equivalent is a paragraph
     set ragged-left.

     So this asks the other half: a block of Urdu or Arabic that takes
     more than one line must be flush on the edge its own script begins
     from. Ragged on the far side is right; ragged on the reading side is
     the fault.

     A post's body is exempt. The writing box has alignment buttons and
     an author who presses one has made a decision; this is about what
     the site does when nobody chose. */
  group('urdu sets flush on the edge it reads from');
  {
    /* The shares post is here because it is the longest run of Urdu prose
       on the site — forty-odd paragraphs and ten headings — and because
       it is where the last two faults of this kind actually landed. */
    const PAGES = ['/index.html', '/apps/zakat-calculator.html',
                   '/works/saa-ki-tahqeeq.html',
                   '/posts/reservations-shariah-screening-stocks.html',
                   '/posts/log-barabar-kyun-nahin.html',
                   '/posts/the-strong-and-the-trustworthy.html',
                   '/posts/qawi-aur-ameen.html',
                   '/fatawa/index.html',
                   '/author/index.html'];
    const measure = () => {
      const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.getClientRects().length) continue;
        /* A post's body used to be exempt whole, on the grounds that its
           author pressed the alignment buttons themselves. That was too
           broad: the site *interprets* those buttons, and for months it
           ignored them outright — every Urdu paragraph came out justified
           whatever was chosen, and when that was fixed, `align-left` read
           literally and ragged the edge four paragraphs begin from. So
           the body is measured too. Only a centred block is exempt, since
           centring rags both edges by definition, and the editor's live
           canvas, which is mid-edit and not a published page. */
        if (el.closest('.writing-canvas')) continue;
        if (el.closest('.align-center') || /\balign-center\b/.test(String(el.className))) continue;
        const text = [...el.childNodes].filter((n) => n.nodeType === 3)
          .map((n) => n.textContent).join('').trim();
        if (!text) continue;
        const rtl = (text.match(ARABIC) || []).length;
        const lat = (text.match(/[A-Za-z]/g) || []).length;
        if (rtl <= lat) continue;

        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden') continue;
        /* Blocks only. An Arabic phrase quoted inside an English
           sentence — a book title, a line of hadith — flows with the
           line it sits in and cannot be flush with anything; that is
           what `.arabic-inline` is for, and it is not this rule's
           business. */
        if (cs.display.indexOf('inline') === 0) continue;
        let align = cs.textAlign;
        if (align === 'start' || align === '') align = cs.direction === 'rtl' ? 'right' : 'left';
        if (align === 'end') align = cs.direction === 'rtl' ? 'left' : 'right';
        if (align === 'center' || align === 'justify') continue;

        /* Runs grouped into visual lines: getClientRects gives one rect
           per directional run, so a line holding a digit or a full stop
           comes back as three. */
        const r = document.createRange();
        r.selectNodeContents(el);
        const rects = [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5);
        const lines = [];
        for (const x of rects) {
          const line = lines.find((l) => Math.abs(l.top - x.top) < Math.max(4, x.height * 0.5));
          if (line) { line.left = Math.min(line.left, x.left); line.right = Math.max(line.right, x.right); }
          else lines.push({ top: x.top, left: x.left, right: x.right });
        }
        if (lines.length < 2) continue;

        /* Flush on the reading edge — the right, for these. */
        const rights = lines.map((l) => l.right);
        const spread = Math.max(...rights) - Math.min(...rights);
        out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 40),
                   text: text.replace(/\s+/g, ' ').slice(0, 26),
                   align, lines: lines.length, spread: Math.round(spread) });
      }
      return out;
    };

    let seen = 0;
    const ragged = [];
    for (const width of [1440, 380]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      await context.route('https://fonts.g**', (r) => r.abort());
      const page = await context.newPage();
      page.on('pageerror', (e) => threw.push(width + 'px: ' + e.message));
      for (const path of PAGES) {
        await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'domcontentloaded' });
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
        await page.waitForTimeout(120);
        const rows = await page.evaluate(measure);
        seen += rows.length;
        rows.filter((x) => x.spread > 3).forEach((x) => ragged.push({ width, path, ...x }));
      }
      await context.close();
    }
    t(`there are multi-line urdu blocks to measure — ${seen} of them`, seen >= 8, String(seen));
    t('every one of them is flush where its script begins, ragged on the far side',
      ragged.length === 0, JSON.stringify(ragged.slice(0, 6), null, 1));
  }

  /* ---- a category head ---- */
  group('a category is named once, in two scripts');
  {
    const { context, page } = await open(1440);
    const heads = await page.evaluate(() =>
      [...document.querySelectorAll('.work-category-head')].map((head) => {
        const left = (el) => (el ? Math.round(el.getBoundingClientRect().left) : null);
        return {
          english: left(head.querySelector('h3')),
          urdu: left(head.querySelector('.category-urdu')),
          count: (head.querySelector('.work-category-count') || {}).textContent || '',
          works: head.closest('.work-category').querySelectorAll('.work').length
        };
      }));
    t('both names start from the same edge',
      heads.every((h) => h.urdu === null || Math.abs(h.english - h.urdu) < 4),
      JSON.stringify(heads));
    t('the count matches the rows under it',
      heads.every((h) => h.count.trim() === h.works + (h.works === 1 ? ' work' : ' works')),
      JSON.stringify(heads));
    await context.close();
  }

  /* ---- search ---- */
  group('the search still works');
  {
    const { context, page } = await open(1440);
    const total = await page.evaluate(() => document.querySelectorAll('.work').length);
    await page.fill('#work-search', 'zakat');
    await page.waitForTimeout(200);
    const hit = await page.evaluate(() => ({
      count: document.getElementById('search-count').textContent,
      marks: document.querySelectorAll('.record-title mark').length,
      shownRulings: [...document.querySelectorAll('.ruling')].filter((e) => !e.hidden).length
    }));
    t('a word in a fatwa finds the fatwa', /fatwa/.test(hit.count), JSON.stringify(hit));
    t('the word typed is marked inside the title it was found in', hit.marks > 0, JSON.stringify(hit));
    t('a fatwa the search hid really is hidden', hit.shownRulings < 5, JSON.stringify(hit));

    await page.fill('#work-search', 'xyzzy');
    await page.waitForTimeout(200);
    t('nothing matching says so',
      /Nothing matches/.test(await page.evaluate(() => document.getElementById('search-count').textContent)));

    await page.fill('#work-search', '');
    await page.waitForTimeout(200);
    t('clearing it brings everything back',
      (await page.evaluate(() => [...document.querySelectorAll('.work')].filter((e) => !e.hidden).length)) === total);
    await context.close();
  }

  /* ---- opening a row ---- */
  group('opening a row');
  {
    const { context, page } = await open(1440);
    await page.locator('.work').first().locator('summary').click();
    await page.waitForTimeout(250);
    const open1 = await page.evaluate(() => {
      const detail = document.querySelector('.work[open] .work-detail');
      const box = detail.getBoundingClientRect();
      const card = detail.closest('.work-category').getBoundingClientRect();
      return { rtl: detail.classList.contains('reads-rtl'),
               fromRight: Math.round(card.right - box.right),
               links: detail.querySelectorAll('a').length,
               share: detail.querySelectorAll('[data-share]').length };
    });
    t('a right-to-left detail block follows its title to the right',
      !open1.rtl || open1.fromRight < 40, JSON.stringify(open1));
    t('the detail still carries its links and its share button',
      open1.links >= 1 && open1.share === 1, JSON.stringify(open1));

    await page.locator('.work').nth(1).locator('summary').click();
    await page.waitForTimeout(250);
    t('only one work stays open at a time',
      (await page.evaluate(() => document.querySelectorAll('.work[open]').length)) === 1);
    await context.close();
  }

  /* ---- room for the script's own overhang ----

     Mehr draws up to 4.75px past the right edge of the box that lays it
     out — measured at 19px by scanning rendered pixels, on a line
     beginning with ک, where the overhang is worst. A right-aligned block
     set flush against the card therefore put the stroke through the
     card's own edge. Asking for 5px of clearance is asking for exactly
     that measurement back, so the guard means something rather than
     restating whatever the stylesheet currently says. */
  group('nastaliq has room for its own overhang');
  for (const width of [1440, 390]) {
    const { context, page } = await open(width);
    const tight = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.work').forEach((work) => { work.open = true; });
      document.querySelectorAll('.work-detail p.urdu, .work-detail p.arabic').forEach((p) => {
        const card = p.closest('.work-category');
        const style = getComputedStyle(card);
        const edge = card.getBoundingClientRect().right - parseFloat(style.paddingRight);
        /* The line boxes, not the element box. Padding is what moves the
           text, and it moves it inside a border box that has not shifted —
           so measuring the element would report the same number either
           way, which is exactly the mistake this line exists to avoid. */
        const range = document.createRange();
        range.selectNodeContents(p);
        const rects = [...range.getClientRects()];
        if (!rects.length) return;
        const clear = edge - Math.max(...rects.map((r) => r.right));
        if (clear < 5) {
          out.push({ id: p.closest('.work').getAttribute('data-id'), clear: +clear.toFixed(2) });
        }
      });
      return { tight: out, total: document.querySelectorAll('.work-detail p.urdu, .work-detail p.arabic').length };
    });
    t('at ' + width + 'px, every right-aligned line clears the card edge',
      tight.tight.length === 0 && tight.total > 0, JSON.stringify(tight));
    await context.close();
  }

  /* ---- the icons ----

     Drawn marks rather than borrowed characters. Every one is decorative:
     it sits beside a word that already says the same thing, so it must
     stay out of the accessible name entirely. */
  group('the icons');
  {
    const { context, page } = await open(1440);
    const icons = await page.evaluate(() => {
      const sprites = document.querySelectorAll('#icon-sprite');
      const all = [...document.querySelectorAll('svg.icon')];
      const heads = [...document.querySelectorAll('.work-category-head')]
        .map((h) => h.querySelectorAll('svg.icon').length);
      return {
        sprites: sprites.length,
        symbols: sprites.length ? sprites[0].querySelectorAll('symbol').length : 0,
        total: all.length,
        hidden: all.filter((s) => s.getAttribute('aria-hidden') === 'true').length,
        focusable: all.filter((s) => s.getAttribute('focusable') === 'false').length,
        resolved: all.filter((s) => {
          const id = (s.querySelector('use') || {}).getAttribute
            ? s.querySelector('use').getAttribute('href') : null;
          return id && document.querySelector(id);
        }).length,
        heads,
        search: document.querySelectorAll('.search-box svg.icon').length,
        fatawa: document.querySelectorAll('.rulings h2 svg.icon').length,
        /* Stroke, not fill, and taking its colour from the text around it —
           that is what lets one drawing serve the cream and the green. */
        strokes: all.filter((s) => {
          const cs = getComputedStyle(s);
          return cs.fill === 'none' && cs.stroke !== 'none';
        }).length
      };
    });
    t('the sprite is written in exactly once', icons.sprites === 1, JSON.stringify(icons));
    /* Counted out of common.js rather than written down here. A number in
       this file goes stale the moment a drawing is added, and what is
       being checked is that the sprite holds them all — not that there
       are eleven of them. */
    const drawings = (/var ICONS = \{([\s\S]*?)\n  \};/.exec(
      await readFile(join(ROOT, 'common.js'), 'utf8')) || [, ''])[1]
      .split('\n').filter((l) => /^    [a-z]+: \[/.test(l)).length;
    t(`it holds every drawing in the set — ${drawings} of them`,
      drawings > 0 && icons.symbols === drawings, `${icons.symbols} in the sprite, ${drawings} in ICONS`);
    t('there are icons on the page', icons.total > 10, String(icons.total));
    t('every <use> resolves to a symbol that exists',
      icons.resolved === icons.total, JSON.stringify(icons));
    t('every icon is hidden from a reader who is listening',
      icons.hidden === icons.total && icons.focusable === icons.total, JSON.stringify(icons));
    t('every icon is stroked in currentColor, not filled',
      icons.strokes === icons.total, JSON.stringify(icons));
    t('every category head carries exactly one',
      icons.heads.length > 0 && icons.heads.every((n) => n === 1), JSON.stringify(icons.heads));
    t('the search box and the fatawa heading have theirs',
      icons.search === 1 && icons.fatawa === 1, JSON.stringify(icons));

    /* An icon must add nothing to what a link is called. "Download ↓" was
       a character inside the text; a drawing must not become one. */
    const names = await page.evaluate(() =>
      [...document.querySelectorAll('.work-category-head, .search-box, .rulings h2')]
        .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
        .filter((text) => /[<>]|svg|use href/i.test(text)));
    t('no icon leaks into the text beside it', names.length === 0, JSON.stringify(names));
    await context.close();
  }

  /* ---- what the page weighs ----

     Read off the filesystem, not the browser: this is the check that would
     have caught a 518KB decorative PNG and two fonts shipped as TTF. */
  group('the page is not carrying dead weight');
  {
    const weigh = async (path) => Math.round((await stat(join(ROOT, path))).size / 1024);
    const mehr = await weigh('files/fonts/mehr-nastaliq-web.woff2');
    const aslam = await weigh('files/fonts/Aslam.woff2');
    const callig = await weigh('files/images/name-calligraphy.png');
    const css = await readFile(join(ROOT, 'styles.css'), 'utf8');
    t('both self-hosted fonts are served as woff2 first',
      /mehr-nastaliq-web\.woff2"\) format\("woff2"\)/.test(css) &&
      /Aslam\.woff2"\) format\("woff2"\)/.test(css));
    t('…with the ttf still behind them as a fallback',
      /mehr-nastaliq-web\.ttf"\) format\("truetype"\)/.test(css) &&
      /Aslam\.ttf"\) format\("truetype"\)/.test(css));
    t(`Mehr is ${mehr}KB, under 70`, mehr < 70, String(mehr));
    t(`Aslam is ${aslam}KB, under 70`, aslam < 70, String(aslam));
    t(`the calligraphy is ${callig}KB, under 40`, callig < 40, String(callig));
  }

  /* ---- the rhythm between sections ---- */
  group('the page breathes without falling apart');
  {
    /* Which of a section's elements are actually ink. A <summary> renders
       whether its <details> is open or not, so a closed row's title
       counts — but the summary of a details nested inside a closed one
       does not. Getting this wrong is what made the first two attempts at
       this measurement report gaps of -1508px. */
    const gapsAt = async (width) => {
      const { context, page } = await open(width);
      const out = await page.evaluate(() => {
        const shown = (el) => {
          if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
          let viaSummary = false;
          for (let n = el; n; n = n.parentElement) {
            if (n.tagName === 'SUMMARY') viaSummary = true;
            else if (n.tagName === 'DETAILS') {
              if (!n.open && !viaSummary) return false;
              viaSummary = false;
            }
          }
          return true;
        };
        const band = (sec) => {
          const leaves = [...sec.querySelectorAll('*')].filter((k) =>
            k.children.length === 0 && k.textContent.trim() && shown(k));
          if (!leaves.length) return null;
          const bx = leaves.map((k) => k.getBoundingClientRect());
          return { top: Math.min(...bx.map((b) => b.top)) + scrollY,
                   bottom: Math.max(...bx.map((b) => b.bottom)) + scrollY };
        };
        const secs = [...document.querySelectorAll('main > section')];
        const gaps = [];
        for (let i = 0; i < secs.length - 1; i++) {
          const a = band(secs[i]), z = band(secs[i + 1]);
          if (a && z) gaps.push(Math.round(z.top - a.bottom));
        }
        return { gaps, block: getComputedStyle(document.querySelector('.library')).paddingTop };
      });
      await context.close();
      return out;
    };

    const wide = await gapsAt(1440);
    const phone = await gapsAt(390);
    t('--block resolves to at most 96px on a desktop',
      parseFloat(wide.block) <= 96, wide.block);
    t('…and still to the 56px floor on a phone',
      Math.round(parseFloat(phone.block)) === 56, phone.block);
    /* 250px is about 15 body lines. Above that the sections stop reading
       as one document and start reading as separate slabs. */
    t('no gap between sections runs past 250px at 1440',
      wide.gaps.every((g) => g < 250), JSON.stringify(wide.gaps));
    t('and none has collapsed below 120px either',
      wide.gaps.every((g) => g > 120), JSON.stringify(wide.gaps));
  }

  /* ---- the icons drawing themselves ----

     The one thing that must hold however this is reached: an icon ends up
     drawn. The dash that hides a stroke is added by script, so no script,
     no observer or a reader who asked for less motion must all leave the
     drawing whole. These three cases are the entire safety argument. */
  group('an icon always ends up drawn');
  {
    const readIcons = () => {
      const all = [...document.querySelectorAll('.category-icon')];
      return {
        count: all.length,
        drawClass: all.filter((s) => s.classList.contains('icon-draw')).length,
        whole: all.filter((s) => {
          const cs = getComputedStyle(s);
          return cs.strokeDasharray === 'none' || parseFloat(cs.strokeDashoffset) === 0;
        }).length
      };
    };
    const readerScroll = async (page) => {
      await page.evaluate(async () => {
        const end = document.body.scrollHeight;
        for (let y = 0; y < end; y += 400) {
          window.scrollTo({ top: y, behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 55));
        }
      });
      await page.waitForTimeout(1500);
    };

    {
      const { context, page } = await open(1440);
      await readerScroll(page);
      const r = await page.evaluate(readIcons);
      t('scrolling the page draws every one of them',
        r.count > 0 && r.drawClass === r.count && r.whole === r.count, JSON.stringify(r));
      await context.close();
    }
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
      await context.route('https://fonts.g**', (r) => r.abort());
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      await readerScroll(page);
      const r = await page.evaluate(readIcons);
      t('a reader who asked for less motion gets them drawn, unanimated',
        r.count > 0 && r.drawClass === 0 && r.whole === r.count, JSON.stringify(r));
      await context.close();
    }
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: false });
      await context.route('https://fonts.g**', (r) => r.abort());
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      /* Nothing renders without script here, so the check is that the dash
         lives only on a class no markup carries — never on .icon itself. */
      const css = await readFile(join(ROOT, 'styles.css'), 'utf8');
      const iconRule = /\.icon\s*\{[^}]*\}/.exec(css)[0];
      t('without script, nothing is hiding: the dash is on .icon-draw alone',
        !/stroke-dash/.test(iconRule) && /\.icon-draw\s*\{[^}]*stroke-dasharray/.test(css),
        iconRule.replace(/\s+/g, ' '));
      await context.close();
    }
  }

  /* ---- recently added and updated ----

     The cards are written into index.html at publish time rather than
     drawn by script, which is the whole reason the homepage's words moved
     into content.js. So the strongest case here is the last one: with
     JavaScript turned off the cards are still on the page and still
     readable, where the library below renders nothing at all.

     How they move is the other half. It is a carousel: the browser snaps
     the track to a card, a button steps it either way, and a row of dots
     says how many there are and which is in view. Nothing is cloned and
     nothing drifts — a reader without script, and a crawler, get each
     card once, and get a track they can still swipe. */
  group('recently added and updated');
  {
    const { context, page } = await open(1440);
    await stopAuto(page);

    /* A shelf on the way past, not a screen to scroll through. It was
       575px — 64% of a 900px viewport, against an author introduction of
       591px — and it pushed the library, which is the point of the site,
       down to y=2021. A number here so it cannot creep back, the same
       way the page's weight has one.

       The budget moved once, from 400 to 430, and that is the whole of
       what the dots cost: a 44px row plus its margin, less the 8px taken
       back off the rail above it. It bought the thing the strip did not
       have — how many cards there are, and which one you are looking at
       — and it was paid for deliberately rather than crept into. 408px
       is 45% of a 900px viewport, so the sentence at the top of this
       comment is still true. Trim the margins before the tap target if
       it ever has to come down again. */
    const size = await page.evaluate(() => {
      const r = document.querySelector('.recent').getBoundingClientRect();
      const card = document.querySelector('.recent-card').getBoundingClientRect();
      const lib = document.querySelector('.library').getBoundingClientRect();
      return { section: Math.round(r.height), card: Math.round(card.height),
               share: r.height / window.innerHeight,
               libraryTop: Math.round(lib.top + window.scrollY) };
    });
    t(`the strip is ${size.section}px, and stays under 430`, size.section < 430, JSON.stringify(size));
    t(`  …under half the screen — ${Math.round(size.share * 100)}%`, size.share < 0.5, JSON.stringify(size));
    t(`  …a card is ${size.card}px, and stays under 190`, size.card < 190, JSON.stringify(size));
    t(`  …and the library starts by ${size.libraryTop}px, within 1940`,
      size.libraryTop < 1940, JSON.stringify(size));

    const strip = await page.evaluate(() => {
      /* The real cards only. The clones repeat them by design. */
      const cards = [...document.querySelectorAll('.recent-card')].filter((c) => !c.hasAttribute('aria-hidden'));
      return {
        cards: cards.length,
        titled: cards.filter((c) => (c.querySelector('.record-title') || {}).textContent).length,
        linked: cards.filter((c) => c.getAttribute('href')).length,
        kinds: cards.filter((c) => c.querySelector('.work-kind')).length,
        marks: cards.filter((c) => c.querySelector('svg use')).length,
        dates: cards.map((c) => (c.querySelector('.record-meta') || {}).textContent || ''),
        /* One line, not three: a card says what changed and when, and
           leaves the format and the language to the row below. */
        metaLines: cards.map((c) => {
          const m = c.querySelector('.record-meta');
          return m ? Math.round(m.getBoundingClientRect().height) : 0;
        }),
        axes: cards.map((c) => {
          const body = c.querySelector('.recent-card-body');
          const title = c.querySelector('.record-title');
          const rtl = body.getAttribute('dir') === 'rtl';
          const b = body.getBoundingClientRect(), tl = title.getBoundingClientRect();
          return rtl ? Math.abs(b.right - tl.right) < 2 : Math.abs(b.left - tl.left) < 2;
        })
      };
    });
    t('the strip lists what changed most recently', strip.cards > 0, JSON.stringify(strip));
    t('  …every card has a title, a link, a kind and a drawing',
      strip.titled === strip.cards && strip.linked === strip.cards &&
      strip.kinds === strip.cards && strip.marks === strip.cards, JSON.stringify(strip));
    t('  …and says when, on every one of them',
      strip.dates.every((d) => /\d{4}/.test(d)), JSON.stringify(strip.dates));
    t('  …on one line, not three', strip.metaLines.every((h) => h > 0 && h < 30),
      JSON.stringify(strip.metaLines));
    t('  …each reading from the side its own script starts from',
      strip.axes.every(Boolean), JSON.stringify(strip.axes));

    const order = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('.recent-card')]
        .filter((c) => !c.hasAttribute('aria-hidden'))
        .map((c) => c.getAttribute('href'));
      const by = {};
      const walk = (list) => list.forEach((r) => {
        by[r.page || ('works/' + r.id + '.html')] = r.updated || r.date || '';
      });
      (window.siteContent.categories || []).forEach((c) => walk(c.works || []));
      walk(window.siteContent.rulings || []);
      return ids.map((href) => by[href] || '');
    });
    t('  …newest first', order.every((d, i) => i === 0 || order[i - 1] >= d), JSON.stringify(order));

    /* The carousel. What was here drifted on its own and took the arrows
       away while it did — `startTicker` removed the very attributes the
       arrows are shown by — so eight cards slid past with no way to step
       back to one, and no way to stop them at all on a phone, where
       there is no hover. */
    const car = await page.evaluate(async () => {
      const track = document.getElementById('recent-track');
      const cards = [...document.querySelectorAll('.recent-card')];
      const dots = [...document.querySelectorAll('.rail-dot')];
      const shown = (el) => el && getComputedStyle(el).display !== 'none';
      const forward = document.getElementById('recent-forward');
      const first = cards[0].getBoundingClientRect();
      const style = getComputedStyle(cards[0]);
      const step = first.width + (parseFloat(style.marginRight) || 0) +
        (parseFloat(track).gap || parseFloat(getComputedStyle(track).gap) || 0);
      const before = track.scrollLeft;
      forward.click();
      await new Promise((r) => setTimeout(r, 800));
      const after = track.scrollLeft;
      return {
        ticker: !!document.querySelector('.recent-ticker'),
        clones: cards.filter((c) => c.hasAttribute('aria-hidden')).length,
        cards: cards.length,
        dots: dots.length,
        dotHeight: dots.length ? Math.round(dots[0].getBoundingClientRect().height) : 0,
        marked: dots.filter((d) => d.hasAttribute('aria-current')).length,
        at: dots.findIndex((d) => d.hasAttribute('aria-current')),
        snap: getComputedStyle(track).scrollSnapType,
        cardSnap: style.scrollSnapAlign,
        forwardShown: shown(forward),
        moved: Math.round(after - before),
        step: Math.round(step)
      };
    });
    t('there is no conveyor any more', !car.ticker && car.clones === 0, JSON.stringify(car));
    /* The whole complaint: a strip that moved by itself and offered
       nothing to move it with. */
    t('  …the step forward is there and works', car.forwardShown && car.moved > 0, JSON.stringify(car));
    t('  …moving exactly one card, not a fraction of the window',
      Math.abs(car.moved - car.step) <= 2, 'moved ' + car.moved + ' against a card of ' + car.step);
    t('  …and the track snaps, so nothing comes to rest half off the edge',
      car.snap === 'x mandatory' && car.cardSnap === 'start', JSON.stringify(car));
    /* How many there are and how far along you have got — the thing the
       strip never said. */
    t('  …with one dot per card', car.dots === car.cards, JSON.stringify(car));
    t('  …exactly one of them marked, and it moved with the press',
      car.marked === 1 && car.at === 1, JSON.stringify(car));
    t('  …each dot a 44px tap target', car.dotHeight >= 44, car.dotHeight + 'px');

    /* Scrolled to the end, the last card should sit flush against the end
       of the track. The rail carried a gutter of right padding, so it
       stopped 31px short — a strip of nothing after the last card, which
       reads as more to come when there is not.

       This assertion is written about the *gap*, and the first version
       was written about the scroll position instead — `scrollLeft`
       reaching its own maximum. That could not fail: the maximum is
       reached either way, padding or no padding, because the padding is
       part of what is scrolled. It was only by restoring the padding and
       watching the test stay green that the measurement moved onto the
       thing that actually differs. */
    {
      const { context, page } = await open(390);
      await stopAuto(page);
      const far = await page.evaluate(async () => {
        const bar = document.getElementById('recent-rail');
        const track = document.getElementById('recent-track');
        track.scrollLeft = track.scrollWidth;
        await new Promise((r) => setTimeout(r, 900));
        const cards = [...document.querySelectorAll('.recent-card')];
        const last = cards[cards.length - 1].getBoundingClientRect();
        const port = track.getBoundingClientRect();
        return {
          at: Math.round(track.scrollLeft),
          max: Math.round(track.scrollWidth - track.clientWidth),
          after: bar.getAttribute('data-more-after'),
          deadSpace: Math.round(port.right - last.right)
        };
      });
      t('  …and scrolls right to its end', far.at >= far.max - 1 && far.after === 'false',
        'stopped at ' + far.at + ' of ' + far.max + ', forward arrow still showing: ' + far.after);
      t('  …leaving no strip of nothing after the last card',
        far.deadSpace <= 2, far.deadSpace + 'px of empty track beyond the last card');
      await context.close();
    }
    await context.close();
  }

  /* Reduced motion: no clones, nothing animating, and the rail is the
     scrollable one it has always been — arrows and all. */
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('https://fonts.g**', (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.locator('#recent').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.recent-card')];
      return { count: cards.length,
               clones: cards.filter((c) => c.hasAttribute('aria-hidden')).length,
               ticker: !!document.querySelector('.recent-ticker'),
               risen: cards.filter((c) => c.classList.contains('card-rise')).length,
               solid: cards.filter((c) => getComputedStyle(c).opacity === '1').length };
    });
    t('a reader who asked for less motion gets the cards, unmoving',
      r.count > 0 && !r.ticker && r.clones === 0 && r.risen === 0 && r.solid === r.count,
      JSON.stringify(r));


    /* And the rail still works by hand, which is the only way left to
       reach the far end of it. */
    const ends = await page.evaluate(() => {
      const bar = document.getElementById('recent-rail');
      const track = document.getElementById('recent-track');
      const before = bar.getAttribute('data-more-before');
      track.scrollLeft = track.scrollWidth;
      return new Promise((done) => setTimeout(() => done({
        before,
        thenBefore: bar.getAttribute('data-more-before'),
        thenAfter: bar.getAttribute('data-more-after'),
        scrolls: track.scrollWidth > track.clientWidth
      }), 900));
    });
    t('  …and can still scroll it by hand, ends and all',
      !ends.scrolls || (ends.before === 'false' && ends.thenBefore === 'true' && ends.thenAfter === 'false'),
      JSON.stringify(ends));
    /* Last in this block, deliberately: it presses the step button, and
       the check above reads the rail from a standing start. Written
       above it first, and it left `data-more-before` already true — a
       probe that quietly moved the thing the next probe was measuring.

       The carousel is still there and still steps — it is navigation, not
       decoration, and taking it away would leave this reader with less
       than everybody else. What goes is the *slide*: `scrollBy` with
       `behavior: smooth` is motion like any other, and it is the kind
       this site kept forgetting to ask about because it is written in
       JavaScript rather than CSS. */
    const quiet = await page.evaluate(async () => {
      const track = document.getElementById('recent-track');
      const forward = document.getElementById('recent-forward');
      const dots = document.querySelectorAll('.rail-dot').length;
      if (!forward || getComputedStyle(forward).display === 'none') return { skip: true, dots };
      const before = track.scrollLeft;
      forward.click();
      /* Far too soon for a smooth scroll to have finished, and no time at
         all for an instant one to need. */
      await new Promise((r) => setTimeout(r, 60));
      return { dots, jumped: Math.round(track.scrollLeft - before) };
    });
    t('  …and still gets the carousel, stepping without the slide',
      quiet.skip || (quiet.dots > 0 && quiet.jumped > 0),
      JSON.stringify(quiet));
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: false });
    await context.route('https://fonts.g**', (r) => r.abort());
    const page = await context.newPage();
    await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('.recent-card')];
      return { count: cards.length,
               clones: cards.filter((c) => c.hasAttribute('aria-hidden')).length,
               solid: cards.filter((c) => {
                 const cs = getComputedStyle(c);
                 return cs.opacity === '1' && cs.visibility === 'visible' && c.getBoundingClientRect().width > 40;
               }).length,
               titles: cards.map((c) => (c.querySelector('.record-title') || {}).textContent || '') };
    });
    /* This is the argument for the whole splice. The library below is
       drawn by script and is simply not here without one; the strip is in
       the file, so it is. */
    t('with JavaScript off the cards are still on the page, and readable',
      r.count > 0 && r.solid === r.count, JSON.stringify(r).slice(0, 240));
    t('  …with their titles in them', r.titles.every((x) => x.length > 0), JSON.stringify(r.titles));
    /* The clones are made in the browser, so there are none here. Baked
       into the page they would give this reader every card twice. */
    t('  …exactly once each, with no clones baked into the file', r.clones === 0, JSON.stringify(r));
    t('  …while the library below needs script and has none',
      (await page.locator('.work-category').count()) === 0);
    await context.close();
  }

  /* ---- an app's row ----

     A row in the library is written for a document: it says what opening
     it would get you, and its link goes to the record's own page, where
     the document is. An app is not a document. Its row said "Read here"
     and offered nothing but a page about the app — you could not reach
     the app itself from the homepage at all. */
  group("an app's row opens the app");
  {
    const { context, page } = await open(1440);
    await page.evaluate(() => {
      const d = document.querySelector('.work[data-id="zakat-calculator"]');
      if (d) d.open = true;
    });
    await page.waitForTimeout(250);
    const row = await page.evaluate(() => {
      const d = document.querySelector('.work[data-id="zakat-calculator"]');
      if (!d) return null;
      const links = [...d.querySelectorAll('.work-actions a')];
      return {
        meta: (d.querySelector('.record-meta') || {}).textContent || '',
        first: links[0] ? { text: links[0].textContent.trim(), href: links[0].getAttribute('href'),
                            target: links[0].getAttribute('target'), rel: links[0].getAttribute('rel'),
                            icon: !!links[0].querySelector('svg use') } : null,
        second: links[1] ? { text: links[1].textContent.trim(), href: links[1].getAttribute('href') } : null,
        count: links.length
      };
    });
    t('the app has a row in the library', !!row, 'no row with that id');
    t('  …whose first link goes straight to the app, in its own tab',
      row && row.first && /^https?:\/\//.test(row.first.href) &&
      row.first.target === '_blank' && /noopener/.test(row.first.rel || '') && row.first.icon,
      JSON.stringify(row && row.first));
    t('  …with the page about it beside, not instead',
      row && row.second && /apps\/zakat-calculator\.html$/.test(row.second.href),
      JSON.stringify(row && row.second));
    /* "Read here" is what a post's row says. You do not read a
       calculator, and it has no one language to name: this one has two. */
    t('  …and the line under the title says it opens rather than reads',
      row && /Opens in a browser/.test(row.meta) && !/Read here/.test(row.meta), row && row.meta);
    t('  …and names no single language for an app that has two',
      row && !/English|Urdu|Arabic/.test(row.meta), row && row.meta);
    await context.close();
  }

  /* ---- the rail marking your place ---- */
  group('the rail says where you are');
  {
    const { context, page } = await open(1440);
    const marks = [];
    for (const id of ['charts', 'posts', 'rulings']) {
      await page.evaluate((id) => {
        const s = document.getElementById(id);
        window.scrollTo({ top: s.getBoundingClientRect().top + scrollY - 140, behavior: 'instant' });
      }, id);
      await page.waitForTimeout(400);
      marks.push(await page.evaluate(() => {
        const on = [...document.querySelectorAll('.category-nav a[aria-current]')];
        return { n: on.length, href: on.map((a) => a.getAttribute('href')).join(',') };
      }));
    }
    t('exactly one link is marked at a time',
      marks.every((m) => m.n === 1), JSON.stringify(marks));
    t('and it is the section actually being read',
      marks[0].href === '#charts' && marks[1].href === '#posts' && marks[2].href === '#rulings',
      JSON.stringify(marks));

    /* The obvious call here is scrollIntoView, and it is wrong: it scrolls
       every scrollable ancestor including the document, so the rail drags
       the page back to whatever it just marked and the reader cannot get
       past the first category. */
    const drift = await page.evaluate(async () => {
      /* Land somewhere the mark has to change, then watch the page for
         half a second without touching it. Anything that moves is the
         rail moving it. */
      const s = document.getElementById('ilmi-mawad');
      window.scrollTo({ top: s.getBoundingClientRect().top + scrollY - 140, behavior: 'instant' });
      const start = scrollY;
      let worst = 0;
      for (let i = 0; i < 25; i++) {
        await new Promise((r) => setTimeout(r, 20));
        worst = Math.max(worst, Math.abs(scrollY - start));
      }
      return worst;
    });
    t('marking a section never scrolls the page itself', drift < 4, 'drifted ' + drift + 'px');
    await context.close();
  }

  /* ---- widths ---- */
  /* ---- a footnote is quieter than the prose ----

     A footnote is the quieter register, and three times now it has been
     published louder than the piece it annotates: an in-prose heading
     took the body size that had grown for Mehr, a Latin citation inside
     an Urdu piece came out at 17px against the 15px its prose gets, and
     an Arabic reference at the foot of an Urdu piece took the size meant
     for a quoted verse — 23px against a 21px body.

     Each was fixed by naming one more script combination in a selector,
     and each time the next combination was left uncovered. So this
     asserts the rule rather than a number: whatever script a footnote is
     in, and whatever the piece around it, it is smaller than the prose it
     sits in. There is no selector list to keep current. */
  group('a footnote is quieter than the prose it annotates');
  {
    const PAGES = ['/posts/log-barabar-kyun-nahin.html',
                   '/posts/wisdom-behind-our-differences.html',
                   '/posts/reservations-shariah-screening-stocks.html',
                   '/posts/kitabein-mashin-ki-khurak.html',
                   /* Six Arabic references apiece, the most any page here
                      carries, and on the English one they sit inside a
                      Latin container. */
                   '/posts/the-strong-and-the-trustworthy.html',
                   '/posts/qawi-aur-ameen.html'];
    let seen = 0;
    const louder = [];
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 } });
    await context.route('https://fonts.g**', (r) => r.abort());
    const page = await context.newPage();
    page.on('pageerror', (e) => threw.push('390px: ' + e.message));
    for (const path of PAGES) {
      await page.goto(`http://127.0.0.1:${PORT}${path}`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready);
      const rows = await page.evaluate(() => {
        const body = document.querySelector('.post-body');
        if (!body) return [];
        const base = parseFloat(getComputedStyle(body).fontSize);
        return [...document.querySelectorAll('.footnote')].map((f) => ({
          cls: String(f.className),
          size: Math.round(parseFloat(getComputedStyle(f).fontSize) * 100) / 100,
          body: base,
          text: (f.textContent || '').trim().slice(0, 26)
        }));
      });
      seen += rows.length;
      rows.filter((r) => r.size >= r.body).forEach((r) => louder.push({ path, ...r }));
    }
    await context.close();
    /* Three today: the Arabic reference on the Urdu post, and the English
       line with the Arabic one beneath it on its twin. The other two
       pages carry none — a floor, not a count, so writing a piece without
       a footnote does not turn this red. */
    t(`there are footnotes to measure — ${seen} of them`, seen >= 3, String(seen));
    t('every one is set smaller than the prose it annotates',
      louder.length === 0, JSON.stringify(louder.slice(0, 6), null, 1));
  }

  /* ---- the two landing pages ----

     They are the site's only navigational surfaces other than the
     homepage, and the three things that would quietly break them are all
     invisible in the source: a header that clips on a phone, a link the
     homepage stopped writing, and an address that goes through the old
     redirect. */
  group('the two landing pages');
  {
    /* The header on a generated page carries four links and has no
       category strip under it to repeat any of them. Four need 207px
       beside a 141px wordmark: measured, that fits from 390px up and
       clips by 56px at 320, which is why two of them stand down below
       390. What must never happen at any width is the header clipping —
       a link half off the edge of the screen is not a link. */
    for (const width of [320, 360, 375, 390, 414, 1280]) {
      const { context, page } = await open(width, '/fatawa/index.html');
      const nav = await page.evaluate(() => {
        const n = document.querySelector('.header-nav');
        const shown = [...n.querySelectorAll('a')]
          .filter((a) => a.getBoundingClientRect().width > 0)
          .map((a) => a.textContent.trim());
        return { over: Math.round(n.scrollWidth - n.clientWidth), shown };
      });
      t('the header does not clip at ' + width + 'px', nav.over <= 0,
        'overflows by ' + nav.over + 'px, showing ' + nav.shown.join(', '));
      /* Whatever else is dropped, the two that are pages of their own
         stay: nothing else on the site links to them. */
      t('  …and still offers Author and Fatawa at ' + width + 'px',
        nav.shown.includes('Author') && nav.shown.includes('Fatawa'),
        nav.shown.join(', '));
      await context.close();
    }

    /* A page in the sitemap that nothing links to is an orphan, and both
       of these were built to be arrived at. The homepage is the only
       place a reader stands, so the homepage has to carry both links —
       and index.html is generated, so a builder that stopped writing one
       would take it away silently. */
    {
      const { context, page } = await open(1280);
      const links = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
      t('the homepage links to the fatawa page', links.includes('fatawa/index.html'),
        'no link to it — it is in the sitemap and reachable from nowhere');
      t('the homepage links to the author page', links.includes('author/index.html'),
        'no link to it — it is in the sitemap and reachable from nowhere');
      await context.close();
    }

    /* Every fatwa on the homepage used to be linked as
       work.html?work=<id> — the redirect kept for addresses already
       shared — while every work beside it went straight to its own page.
       The same address was handed to a crawler as the canonical one for
       all twenty-four records, each of which redirects to a page whose
       own canonical tag says something else. Both are fixed; this is
       what says so. Asserted against the filesystem, because a href that
       resolves is not the same as a href that is the right one. */
    {
      const { context, page } = await open(1280);
      const found = await page.evaluate(() => ({
        cards: [...document.querySelectorAll('.ruling')].map((a) => a.getAttribute('href')),
        parts: (JSON.parse([...document.querySelectorAll('script[type="application/ld+json"]')]
          .map((s) => s.textContent)
          .find((text) => text.includes('CollectionPage'))).hasPart || []).map((p) => p.url)
      }));
      const redirects = found.cards.concat(found.parts).filter((u) => /work\.html\?/.test(u));
      t('there were fatawa and records to check',
        found.cards.length === 6 && found.parts.length > 20,
        found.cards.length + ' cards, ' + found.parts.length + ' records');
      t('no fatwa is linked through the old redirect', redirects.length === 0,
        redirects.slice(0, 3).join(' | '));
      const missing = found.cards
        .filter((href) => !existsSync(join(ROOT, href.replace(/^\//, ''))));
      t('  …and every one of them points at a page that exists',
        missing.length === 0, missing.join(' | '));
      await context.close();
    }

    /* The same again on the fatawa page itself, whose six cards are
       generated by a different function from the homepage's six. */
    {
      const { context, page } = await open(1280, '/fatawa/index.html');
      const hrefs = await page.evaluate(() =>
        [...document.querySelectorAll('.ruling')].map((a) => a.getAttribute('href')));
      t('the fatawa page carries every ruling', hrefs.length === 6, hrefs.length + ' cards');
      const bad = hrefs.filter((h) => !existsSync(join(ROOT, h.replace(/^\.\.\//, ''))));
      t('  …each pointing at the ruling’s own page', bad.length === 0, bad.join(' | '));
      await context.close();
    }
  }

  /* ---- what a finger actually lands on ----

     Measured by tapping, not by reading a box. Three of these carry an
     invisible pad — an `::after` stretched past the text — so the box a
     bounding rect reports is nothing like the area that answers a tap.
     The first version of this measurement read the box, called four
     healthy controls broken, and missed the one that really was: the
     header links, whose pad is CLIPPED because `overflow-x: auto` on
     their container makes `overflow-y` auto as well. 46px at 620, 29 at
     390, and nothing in the source says so. */
  group('a tap lands on the thing it looks like');
  {
    const FLOOR = 44;
    const WANTED = ['.header-nav a', '.category-nav a', '.search-box input',
                    '.text-link', '.button'];
    for (const width of [390, 620]) {
      const { context, page } = await open(width);
      const found = await page.evaluate((WANTED) => {
        /* scroll-behavior is smooth here, so scrollIntoView does not
           finish before the next line reads the rect. */
        document.documentElement.style.scrollBehavior = 'auto';
        const hit = (el) => {
          el.scrollIntoView({ block: 'center', inline: 'center' });
          const r = el.getBoundingClientRect();
          const x = Math.round(r.left + r.width / 2);
          const cy = Math.round(r.top + r.height / 2);
          /* Off the edge of the window, or scrolled out of a rail that
             does not scroll far enough — nothing to probe, not a fault. */
          if (x < 1 || x > innerWidth - 2 || cy < 1 || cy > innerHeight - 2) return null;
          const owns = (n) => n && (n === el || el.contains(n));
          if (!owns(document.elementFromPoint(x, cy))) return null;
          let up = cy, down = cy;
          while (up > 0 && owns(document.elementFromPoint(x, up - 1))) up--;
          while (down < innerHeight - 1 && owns(document.elementFromPoint(x, down + 1))) down++;
          return down - up + 1;
        };
        const out = {};
        for (const sel of WANTED) {
          const hs = [...document.querySelectorAll(sel)]
            .filter((e) => e.getBoundingClientRect().width > 0)
            .map(hit).filter((h) => h !== null);
          if (hs.length) out[sel] = { n: hs.length, min: Math.min(...hs) };
        }
        return out;
      }, WANTED);
      const names = Object.keys(found);
      t('there were controls to probe at ' + width + 'px', names.length >= 4,
        'only found ' + names.join(', '));
      const short = names.filter((k) => found[k].min < FLOOR);
      t('  …and every one answers a tap ' + FLOOR + 'px tall at ' + width + 'px',
        short.length === 0,
        short.map((k) => k + ' ' + found[k].min + 'px').join(' | '));
      await context.close();
    }
  }

  /* ---- a jump to a section can be seen ----

     Two bars are sticky — the header and the category strip — and
     `scroll-padding-top` is a number typed in by hand that has to clear
     both. It did not: 128 against a 142px stack on a desktop, 116
     against 148 between 480 and 620 where the wordmark wraps and the
     header grows. So every deep link, and every tap on a category pill,
     put the heading it aimed at *underneath* the strip. Nothing about
     the source says the two are related, which is why this is measured
     on the rendered page at the widths where the stack changes height. */
  group('a jump to a section lands where it can be read');
  for (const width of [390, 480, 620, 768, 1024, 1440]) {
    const { context, page } = await open(width);
    const m = await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      const stack = Math.round(
        document.querySelector('.site-header').getBoundingClientRect().height +
        document.querySelector('.category-bar').getBoundingClientRect().height);
      location.hash = '';
      location.hash = '#rulings';
      return { stack, top: Math.round(document.getElementById('rulings').getBoundingClientRect().top) };
    });
    t('at ' + width + 'px the section clears the two sticky bars', m.top >= m.stack,
      'section top ' + m.top + 'px, bars ' + m.stack + 'px — hidden by ' + (m.stack - m.top) + 'px');
    await context.close();
  }

  /* ---- the way onward ---- */
  group('a record page offers somewhere to go next');
  {
    const PAGES = ['/works/nfts.html', '/works/otherthan-falaq-nas-dam.html',
                   '/posts/qawi-aur-ameen.html'];
    for (const path of PAGES) {
      const { context, page } = await open(390, path);
      const m = await page.evaluate(() => {
        const box = document.querySelector('.more-like');
        if (!box) return { none: true };
        const rows = [...box.querySelectorAll('li a')];
        /* A Range, not the element: getClientRects on a block returns one
           rect for the whole box, which is how an earlier check of this
           kind skipped every element it was written for. */
        const ragged = [];
        box.querySelectorAll('.record-title').forEach((e) => {
          const rng = document.createRange();
          rng.selectNodeContents(e);
          const rects = [...rng.getClientRects()].filter((r) => r.width > 1);
          if (rects.length < 2) return;
          const rtl = getComputedStyle(e).direction === 'rtl';
          const starts = rects.slice(0, -1).map((r) => Math.round(rtl ? r.right : r.left));
          if (new Set(starts).size > 1) ragged.push(e.textContent.trim().slice(0, 20) + ' [' + starts + ']');
        });
        return {
          rows: rows.map((a) => ({ href: a.getAttribute('href'), h: Math.round(a.getBoundingClientRect().height) })),
          dir: getComputedStyle(box).direction,
          /* Where the arrow LANDS, not where it sits in the markup.
             Asserting the text ended in → could not fail: textContent is
             source order, and direction changes only what is painted. A
             restored fault sailed past it. */
          arrow: (function () {
            const link = box.querySelector('.text-link');
            const mark = link.querySelector('span[aria-hidden]');
            if (!mark) return null;
            const l = link.getBoundingClientRect(), m = mark.getBoundingClientRect();
            return { past: Math.round(m.left - l.left), half: Math.round(l.width / 2) };
          })(),
          ragged
        };
      });
      t(path + ' offers more in its category', !m.none && m.rows.length > 0,
        'no .more-like block — the page is a dead end');
      if (m.none) { await context.close(); continue; }
      const missing = m.rows.filter((r) => !existsSync(join(ROOT, r.href.replace(/^\.\.\//, ''))));
      t('  …every one pointing at a page that exists', missing.length === 0,
        missing.map((r) => r.href).join(' | '));
      t('  …each a row a finger can land on', m.rows.every((r) => r.h >= 44),
        m.rows.map((r) => r.h).join(', '));
      /* The block is the site's own English words about the library, so
         it is set in Latin whatever the piece is — exactly the decision
         .record-meta already makes. Inheriting the page flipped an
         English heading flush right and mirrored the arrow to the front
         of the phrase it was meant to lead away from. */
      t('  …set in Latin whatever the piece is', m.dir === 'ltr', m.dir);
      t('  …with the arrow drawn after the words, not before',
        m.arrow && m.arrow.past > m.arrow.half,
        'arrow starts ' + (m.arrow && m.arrow.past) + 'px into a ' +
        (m.arrow && m.arrow.half * 2) + 'px link — it is in front of the phrase');
      t('  …and a title that wraps still starts on one edge',
        m.ragged.length === 0, m.ragged.join(' | '));
      await context.close();
    }
    /* One app, alone in its category. An empty "More in …" heading is
       worse than no heading, so the block is not written at all. */
    const { context, page } = await open(390, '/apps/zakat-calculator.html');
    const alone = await page.evaluate(() => !document.querySelector('.more-like'));
    t('a record alone in its category writes no empty block', alone,
      'the app page wrote a More-in block with nothing to put in it');
    await context.close();
  }

  /* ---- what a file button says it will do ---- */
  group('a file button says whether it opens or saves');
  {
    const { context, page } = await open(1280, '/works/commodity-exchange.html');
    const m = await page.evaluate(() => {
      /* The first link in each file-item is the one that opens; the
         second saves. Not `.document-link` — a work page asks fileLinks
         for the class `button` instead, so that selector found nothing
         and the two assertions under it passed over an empty list. The
         count above is the only reason that showed. */
      const open = [...document.querySelectorAll('#work-page-files .file-item')]
        .map((item) => item.querySelector('a'))
        .filter(Boolean);
      return open.map((a) => ({
        text: a.textContent.trim().replace(/\s+/g, ' '),
        name: (a.getAttribute('aria-label') || a.textContent).trim().replace(/\s+/g, ' '),
        blank: a.getAttribute('target'),
        downloads: a.hasAttribute('download')
      }));
    });
    t('the work has file buttons to read', m.length === 2, m.length + ' found');
    /* It has always opened in the browser and the one beside it has
       always saved. Nothing said so, and "Urdu PDF" next to "Download"
       reads as a name beside an action rather than two different
       offers. */
    t('  …the reading one says it reads, and online',
      m.every((f) => /^Read .* online$/.test(f.text)), m.map((f) => f.text).join(' | '));
    t('  …and opens in the browser rather than saving',
      m.every((f) => f.blank === '_blank' && !f.downloads), JSON.stringify(m));
    await context.close();
  }

  /* ---- the shelf says it is a shelf ----

     Two reports, months apart, that are the same report. First the strip
     drifted for ever and could not be steered; then it could be steered
     and did not move at all, and read as a static row with no sign there
     were more. A shelf of recent things has to say it is a shelf, and a
     row says that by moving and by showing the next thing along. */
  group('the recent strip says there is more');
  {
    /* The peek. It used to be whatever was left over after the cards —
       measured, 42px at 1280 with a 44px arrow sitting on top of it,
       which is as good as nothing. It is derived from the card width
       now, so it is the same at every width. */
    for (const width of [390, 768, 1280, 1920]) {
      const { context, page } = await open(width);
      await stopAuto(page);
      const m = await page.evaluate(() => {
        const track = document.getElementById('recent-track');
        const port = track.getBoundingClientRect();
        let peek = 0;
        [...document.querySelectorAll('.recent-card')].forEach((c) => {
          const r = c.getBoundingClientRect();
          if (r.right > port.right + 1 && r.left < port.right) {
            peek = Math.max(peek, Math.round(port.right - r.left));
          }
        });
        const fade = getComputedStyle(document.getElementById('recent-rail'), '::after');
        return { peek, fade: Math.round(parseFloat(fade.width)), shown: fade.opacity };
      });
      t('at ' + width + 'px the next card shows past the edge', m.peek >= 60,
        'only ' + m.peek + 'px of it');
      /* And is not painted out by the thing that is meant to soften it.
         The fade was written for the conveyor, where a card was supposed
         to dissolve; on a carousel it was erasing the only hint there
         was. */
      t('  …and is not swallowed by the fade over it', m.fade < m.peek,
        m.fade + 'px of gradient over ' + m.peek + 'px of card');
      await context.close();
    }

    /* It moves again — and this time the controls survive it, which is
       the whole difference from the conveyor. That animated a transform
       on a cloned track, so the arrows had to be removed; this scrolls
       the real track by the same step the buttons use. */
    {
      const { context, page } = await open(390);
      const ran = await page.evaluate(async () => {
        const track = document.getElementById('recent-track');
        const bar = document.getElementById('recent-rail');
        const first = track.scrollLeft;
        await new Promise((r) => setTimeout(r, 5200));
        const moved = track.scrollLeft;
        /* Taking hold of it stops it — for good, not until the next tick. */
        document.getElementById('recent').dispatchEvent(
          new PointerEvent('pointerdown', { bubbles: true }));
        const held = track.scrollLeft;
        await new Promise((r) => setTimeout(r, 5200));
        return {
          marked: bar.getAttribute('data-moving'),
          advanced: Math.round(moved - first),
          afterHold: Math.round(track.scrollLeft - held),
          stillMarked: bar.getAttribute('data-moving'),
          arrowsAlive: [...document.querySelectorAll('.recent-rail .category-arrow')]
            .filter((a) => getComputedStyle(a).display !== 'none').length,
          dots: document.querySelectorAll('.rail-dot').length
        };
      });
      t('the strip moves on its own again', ran.advanced > 100, JSON.stringify(ran));
      /* The conveyor took these away. Nothing here does. */
      t('  …without taking the controls away',
        ran.arrowsAlive > 0 && ran.dots > 0, JSON.stringify(ran));
      t('  …and stops for good the moment a reader takes hold',
        ran.afterHold === 0 && ran.stillMarked === null, JSON.stringify(ran));
      await context.close();
    }

    /* Motion written in JavaScript is still motion, and the stylesheet's
       reduced-motion block cannot reach a timer. */
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
      await context.route('https://fonts.g**', (r) => r.abort());
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => document.fonts.ready).catch(() => {});
      const still = await page.evaluate(async () => {
        const track = document.getElementById('recent-track');
        const first = track.scrollLeft;
        await new Promise((r) => setTimeout(r, 5200));
        return { moved: Math.round(track.scrollLeft - first),
                 marked: document.getElementById('recent-rail').getAttribute('data-moving') };
      });
      t('  …and never starts at all for a reader who asked for less motion',
        still.moved === 0 && still.marked === null, JSON.stringify(still));
      await context.close();
    }
  }

  /* ---- searching the fatawa ---- */
  group('the fatawa page can be searched');
  {
    const { context, page } = await open(390, '/fatawa/index.html');
    const type = (term) => page.evaluate((term) => {
      const box = document.getElementById('fatawa-search');
      box.value = term;
      box.dispatchEvent(new Event('input', { bubbles: true }));
      return {
        shown: [...document.querySelectorAll('.ruling')].filter((c) => !c.hidden).length,
        say: document.getElementById('fatawa-count').textContent
      };
    }, term);

    const rest = await type('');
    t('all the rulings are there before a word is typed', rest.shown === 6, JSON.stringify(rest));
    const english = await type('commodity');
    t('  …an English word finds its ruling', english.shown === 1, JSON.stringify(english));
    /* The library is catalogued in Urdu, and a reader who types in it
       must be answered. This is the half a search built on English
       titles alone would have missed. */
    const urdu = await type('زکوٰۃ');
    t('  …and so does an Urdu one', urdu.shown === 1, JSON.stringify(urdu));
    /* Transliteration never agrees about vowels, so the second pass
       matches consonant skeletons — and says that it has, rather than
       passing looser results off as what was asked for. */
    const loose = await type('zakaat');
    t('  …a misspelt transliteration still finds it', loose.shown === 1, JSON.stringify(loose));
    t('  …and says so rather than pretending it matched',
      /closest/.test(loose.say), loose.say);
    const none = await type('qqqq');
    t('  …nothing matching says nothing matched', none.shown === 0 && /Nothing/.test(none.say),
      JSON.stringify(none));
    const back = await type('');
    t('  …and clearing it brings them all back', back.shown === 6, JSON.stringify(back));
    await context.close();
  }

  /* ---- a control that cannot show what it is asking for ---- */
  group('a search box says what it is');
  for (const [path, id] of [['/index.html', 'work-search'], ['/fatawa/index.html', 'fatawa-search']]) {
    const { context, page } = await open(390, path);
    const m = await page.evaluate((id) => {
      const input = document.getElementById(id);
      const box = input.closest('.search-box');
      const style = getComputedStyle(box);
      /* Does the placeholder fit? Measured by drawing it in the input's
         own font rather than trusting the string's length — the old one
         was "Search titles, subjects, descriptions — Urdu, Arabic or
         English" and a phone showed "…descriptio". */
      const ctx = document.createElement('canvas').getContext('2d');
      const f = getComputedStyle(input);
      ctx.font = f.fontStyle + ' ' + f.fontWeight + ' ' + f.fontSize + ' ' + f.fontFamily;
      return {
        wants: Math.ceil(ctx.measureText(input.placeholder).width),
        has: Math.floor(input.getBoundingClientRect().width),
        border: parseFloat(style.borderTopWidth),
        colour: style.borderTopColor,
        page: (function () {
          let n = box.parentElement;
          while (n) {
            const v = getComputedStyle(n).backgroundColor;
            if (v && !/rgba\(0, 0, 0, 0\)/.test(v)) return v;
            n = n.parentElement;
          }
          return '';
        })()
      };
    }, id);
    t(path + ' shows its placeholder whole', m.wants <= m.has,
      'needs ' + m.wants + 'px of ' + m.has + 'px — it is cut off');
    /* It was 1px of #b8beb5 around white on cream: three tones within
       six points of each other, and the one control on the page read as
       a faint rectangle. The author's words were "mixed with the
       website". */
    const far = (a, b) => {
      const n = (c) => (c.match(/\d+/g) || []).slice(0, 3).map(Number);
      const [x, y] = [n(a), n(b)];
      return x.length === 3 && y.length === 3 &&
        Math.max(...x.map((v, i) => Math.abs(v - y[i]))) > 40;
    };
    t('  …with an edge that stands off the page behind it',
      m.border >= 2 && far(m.colour, m.page), m.border + 'px ' + m.colour + ' on ' + m.page);
    await context.close();
  }

  group('nothing pushes the page sideways');
  for (const width of [1920, 1440, 1280, 1024, 900, 768, 620, 420, 380]) {
    const { context, page } = await open(width);
    const over = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth
    }));
    t('at ' + width + 'px', over.scroll <= over.client, JSON.stringify(over));
    await context.close();
  }

  t('nothing threw along the way', threw.length === 0, threw.join(' | '));
} finally {
  await browser.close();
  server.close();
}

console.log('\n' + (failed.length ? 'FAIL (' + failed.length + '): ' + failed.join(', ')
                                  : 'PASS (' + passed + ')'));
process.exit(failed.length ? 1 : 0);
