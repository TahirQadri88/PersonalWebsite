/* Tests for the library on the homepage.  Run with:  node test/homepage.mjs

   Not part of the website, the same way editor.mjs and worker/test.mjs are
   not. Needs Playwright:  npm i -D playwright

   Why this exists. Four faults were found here by measuring the rendered
   page, and every one of them was invisible in the source: a grid whose
   column count happened to leave a card orphaned, a label sent to the far
   edge of its block by a rule written for something else, a row with its
   title on one side and the label naming it on the other, two names for
   one category set 900px apart. None of them would fail a linter and none
   of them changed a single string. They were all geometry.

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
function group(name) { console.log('\n' + name); }

const server = await serve();
const browser = await chromium.launch();
const threw = [];

/* Google's CDN is turned away, the same way editor.mjs turns it away: the
   test then needs no network at all, and everything asserted below is
   which side of a box something landed on or how many columns a grid
   resolved to — neither of which the typeface decides. Waiting on a real
   round trip to another origin would only make the run slow and its
   result dependent on someone else's uptime. */
async function open(width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  await context.route('https://fonts.g**', (r) => r.abort());
  const page = await context.newPage();
  page.on('pageerror', (e) => threw.push(width + 'px: ' + e.message));
  await page.goto(`http://127.0.0.1:${PORT}/index.html`, { waitUntil: 'networkidle' });
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
    t('it holds every drawing in the set', icons.symbols === 11, String(icons.symbols));
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
