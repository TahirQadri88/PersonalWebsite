/* Tests for the library on the homepage.  Run with:  node test/homepage.mjs

   Not part of the website, the same way editor.mjs and worker/test.mjs are
   not. Needs Playwright:  npm i -D playwright

   Why this exists. Seven faults have been found here by measuring the
   rendered page, and every one of them was invisible in the source: a grid
   whose column count happened to leave a card orphaned, a label sent to
   the far edge of its block by a rule written for something else, a row
   with its title on one side and the label naming it on the other, two
   names for one category set 900px apart, a strip that took two thirds of
   the screen, the hero's Urdu line beginning 234px in from where every
   line above it began, and an open library row setting its two
   descriptions at opposite edges. The last two this file found itself.
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
                   '/works/saa-ki-tahqeeq.html'];
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

          const parent = el.parentElement;
          const ps = getComputedStyle(parent);
          const one = { urdu: text.replace(/\s+/g, ' ').slice(0, 24),
                        cls: String(el.className).slice(0, 34),
                        english: sibText.replace(/\s+/g, ' ').slice(0, 24) };

          if (fits(el) || fits(sib)) {
            const ab = el.getBoundingClientRect(), bb = sib.getBoundingClientRect();
            const side = ps.direction === 'rtl' ? 'right' : 'left';
            pairs.push({ ...one, edge: 'box-' + side,
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

     How they move is the other half. Left alone the strip is a rail you
     scroll; where motion is allowed and there is more than fits, script
     clones the set once and the pair drifts. The clones are made in the
     browser and never written into the file — a reader without script,
     and a crawler, must get each card once. */
  group('recently added and updated');
  {
    const { context, page } = await open(1440);

    /* A shelf on the way past, not a screen to scroll through. It was
       575px — 64% of a 900px viewport, against an author introduction of
       591px — and it pushed the library, which is the point of the site,
       down to y=2021. A number here so it cannot creep back, the same
       way the page's weight has one. */
    const size = await page.evaluate(() => {
      const r = document.querySelector('.recent').getBoundingClientRect();
      const card = document.querySelector('.recent-card').getBoundingClientRect();
      const lib = document.querySelector('.library').getBoundingClientRect();
      return { section: Math.round(r.height), card: Math.round(card.height),
               share: r.height / window.innerHeight,
               libraryTop: Math.round(lib.top + window.scrollY) };
    });
    t(`the strip is ${size.section}px, and stays under 400`, size.section < 400, JSON.stringify(size));
    t(`  …under half the screen — ${Math.round(size.share * 100)}%`, size.share < 0.5, JSON.stringify(size));
    t(`  …a card is ${size.card}px, and stays under 190`, size.card < 190, JSON.stringify(size));
    t(`  …and the library starts by ${size.libraryTop}px, within 1900`,
      size.libraryTop < 1900, JSON.stringify(size));

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

    /* The ticker. The set is cloned once and both copies drift; half the
       pair's own width is exactly one set, so the loop has no seam. */
    const drift = await page.evaluate(() => {
      const bar = document.getElementById('recent-rail');
      const ticker = document.querySelector('.recent-ticker');
      const cards = [...document.querySelectorAll('.recent-card')];
      const at = () => {
        const t = ticker && getComputedStyle(ticker).transform;
        return t && t !== 'none' ? parseFloat(t.split(',')[4]) : null;
      };
      const first = at();
      return new Promise((done) => setTimeout(() => done({
        on: bar.getAttribute('data-ticker'),
        real: cards.filter((c) => !c.hasAttribute('aria-hidden')).length,
        clones: cards.filter((c) => c.hasAttribute('aria-hidden')).length,
        focusable: cards.filter((c) => c.getAttribute('tabindex') !== '-1').length,
        name: ticker && getComputedStyle(ticker).animationName,
        moved: first !== null && at() !== first,
        /* No arrows while it drifts: a drag and an animation cannot share
           one track. */
        arrows: [...document.querySelectorAll('.recent-rail .category-arrow')]
          .filter((a) => getComputedStyle(a).display !== 'none').length
      }), 1200));
    });
    t('the cards drift on their own', drift.on === 'on' && drift.name === 'recent-drift' && drift.moved,
      JSON.stringify(drift));
    t('  …the set is cloned exactly once', drift.clones === drift.real, JSON.stringify(drift));
    t('  …and every clone is hidden from a screen reader',
      drift.clones > 0 && drift.focusable === drift.real, JSON.stringify(drift));
    t('  …with no arrows to fight the animation', drift.arrows === 0, JSON.stringify(drift));

    /* Owed to anything that moves by itself: a way to stop it. */
    const paused = await page.evaluate(() => {
      const bar = document.getElementById('recent-rail');
      const ticker = document.querySelector('.recent-ticker');
      bar.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      const css = [...document.styleSheets].some(() => true);
      return { css, rule: getComputedStyle(ticker).animationPlayState };
    });
    const cssText = await readFile(join(ROOT, 'styles.css'), 'utf8');
    t('  …and hovering or tabbing into it pauses it',
      /\[data-ticker="on"\]:hover[\s\S]{0,120}animation-play-state:\s*paused/.test(cssText) &&
      /:focus-within[\s\S]{0,120}animation-play-state:\s*paused/.test(cssText),
      paused.rule);
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
