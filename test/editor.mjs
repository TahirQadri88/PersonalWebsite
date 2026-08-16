/* Tests for the editor's writing box.  Run with:  node test/editor.mjs

   Not part of the website. The site is still plain static files with no
   build step; this drives a real browser over them, the way worker/test.mjs
   drives the Worker. Needs Playwright:  npm i -D playwright

   Why this exists. The check that ran before every commit for months
   loaded admin.html, measured that it did not scroll sideways at five
   widths, and ran an accessibility pass. It never typed a character into
   the writing box, never pressed a toolbar button, never exported a post
   and read it back. So it was thorough about how the editor looked and
   silent about what it did, and three bugs lived in that silence for
   weeks — the Script buttons clearing a block's language instead of
   setting it, a heading ignoring the script marked on it, and a publish
   grown larger than the Worker would accept. Each was found by the
   author, mid-sentence, in a piece they were trying to write.

   Everything here is a behaviour someone relies on to write a post. */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 4321);
const PASS = 'open';

/* Playwright is a developer's tool, not a dependency of anything the site
   serves. Where it lives varies — beside this folder, or installed once
   for the whole machine — so try both, and say so plainly rather than
   throwing a module-resolution error at whoever runs this. `require`
   rather than `import`: it will resolve a package folder by its own
   package.json, which an ES import refuses to do. */
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

/* ---- the site, with two things stood in for --------------------------

   admin.js as shipped signs in against Firebase, which wants a real
   password from a real person. Blanking the key drops it back to the
   passphrase latch, and a known hash opens that. Nothing else is
   altered, so what is tested is the file that gets deployed.

   Served from memory rather than copied to a temp folder: the repository
   is never written to, so a test that dies half way leaves nothing
   behind to clean up or to commit by accident. */
const overlay = new Map();

async function patchedAdminJs() {
  const source = await readFile(join(ROOT, 'admin.js'), 'utf8');
  const hash = createHash('sha256').update(PASS).digest('hex');
  const out = source
    .replace(/var PASS_HASH = '[a-f0-9]*';/, `var PASS_HASH = '${hash}';`)
    .replace(/apiKey: '[^']*',/, "apiKey: '',");
  if (!out.includes(`var PASS_HASH = '${hash}';`) || !out.includes("apiKey: '',")) {
    throw new Error('could not stand in for the gate — admin.js has changed shape');
  }
  return out;
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.txt': 'text/plain; charset=utf-8' };

function serve() {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    if (overlay.has(path)) {
      res.writeHead(200, { 'content-type': MIME[extname(path)] || 'text/plain', 'cache-control': 'no-store' });
      res.end(overlay.get(path));
      return;
    }
    const file = join(ROOT, path);
    if (!existsSync(file)) { res.writeHead(404).end('not here'); return; }
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(await readFile(file));
  });
  return new Promise((ok) => server.listen(PORT, () => ok(server)));
}

/* ---- saying what happened -------------------------------------------- */

let passed = 0;
const failed = [];
function t(name, ok, detail) {
  if (ok) { passed++; console.log('  ✓ ' + name); }
  else { failed.push(name); console.log('  ✗ ' + name + (detail ? '\n      ' + detail : '')); }
}

/* ---- reaching into the box ------------------------------------------- */

const POST = 'kitabein-mashin-ki-khurak';

/* The buttons carry their own words for the kinds and the scripts, and a
   drawing for the alignments — so the alignments are found by the label
   read out to a screen reader, which is the only text they have. */
/* Anchored, not a substring: "Heading" is inside "Sub-heading", so a
   loose match would find two buttons and act on whichever came first. */
const kindButton = (row, word) =>
  row.locator('.writing-tool', { hasText: new RegExp('^\\s*' + word + '\\s*$') });
const alignButton = (row, which) => row.locator(`.writing-tool[aria-label="${which}"]`);

/* Every row has a writing box; only the open one is on screen, so each
   of these reaches for the box inside the row that is open rather than
   the first in the document, which belongs to a row nobody has touched. */
const OPEN_CANVAS = '.admin-row[open] .writing-canvas';

/* The block the caret is in, described the way the file will record it. */
const CARET = () => {
  const canvas = document.querySelector('.admin-row[open] .writing-canvas');
  const sel = window.getSelection();
  let node = sel && sel.rangeCount ? sel.getRangeAt(0).startContainer : null;
  while (node && node.parentNode !== canvas) node = node.parentNode;
  if (!node || node.nodeType !== 1) return null;
  const style = getComputedStyle(node);
  return { tag: node.tagName, cls: node.className, dir: node.getAttribute('dir'),
           lang: node.getAttribute('lang'), font: style.fontFamily, align: style.textAlign };
};

async function openEditor(page) {
  await page.goto(`http://127.0.0.1:${PORT}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(150);
  /* The gate stays open for the rest of the browser session, so a reload
     part way through does not ask again — and there is nothing to fill. */
  if (await page.locator('#pass').isVisible()) {
    await page.fill('#pass', PASS);
    await page.click('#gate-form button[type="submit"]');
  }
  await page.waitForSelector('.admin-row');
  const row = page.locator('.admin-row').filter({ hasText: POST }).first();
  await row.locator('summary').click();
  await row.locator('.writing-canvas').waitFor();
  await page.waitForTimeout(400);
  return row;
}

/* Put the caret in a chosen line, so a test can say which one it means
   rather than trusting whatever the last Enter happened to leave behind
   — Enter carries the script of the line above onto the new one, so
   "the end of the piece" is not a known starting state. */
async function caretInto(page, within, atEnd) {
  const found = await page.evaluate(([sel, end]) => {
    const canvas = document.querySelector('.admin-row[open] .writing-canvas');
    const block = canvas.querySelector(sel);
    if (!block) return false;
    const range = document.createRange();
    range.selectNodeContents(block);
    range.collapse(!end);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    canvas.focus();
    return true;
  }, [within, !!atEnd]);
  if (!found) throw new Error('no line matching ' + within);
  await page.waitForTimeout(60);
}

/* A fresh block at the end of the piece, with the given words in it. */
async function newBlock(page, text) {
  await page.locator(OPEN_CANVAS).click();
  await page.keyboard.press('Control+End');
  await page.keyboard.press('Enter');
  await page.keyboard.type(text);
  await page.waitForTimeout(80);
}

/* ---- the tests -------------------------------------------------------- */

const server = await serve();
overlay.set('admin.js', await patchedAdminJs());

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
/* Fonts are somebody else's server and nothing here depends on the glyphs
   arriving — only on which family the stylesheet asks for, which is
   readable whether or not the file loads. */
await context.route('https://fonts.g**', (r) => r.abort());
const page = await context.newPage();
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(e.message));
/* The editor asks before you leave with work in hand. Dismissing that
   one cancels the navigation, which reads later as the page refusing to
   load; every other dialog is something nobody asked for. */
page.on('dialog', async (d) => {
  if (d.type() === 'beforeunload') { await d.accept(); return; }
  jsErrors.push('unexpected dialog: ' + d.message());
  await d.dismiss();
});

let row = await openEditor(page);

console.log('\nthe Style buttons');

for (const [word, tag, cls] of [['Heading', 'H2', ''], ['Sub-heading', 'H3', ''],
                                ['Quote', 'BLOCKQUOTE', ''], ['Footnote', 'P', 'footnote']]) {
  await newBlock(page, 'a line');
  await kindButton(row, word).click();
  const at = await page.evaluate(CARET);
  t(`${word} makes a ${tag.toLowerCase()}${cls ? '.' + cls : ''}`,
    at.tag === tag && (!cls || at.cls.split(' ').includes(cls)), JSON.stringify(at));
  t(`  …and the ${word} button shows it is on`,
    await kindButton(row, word).getAttribute('aria-pressed') === 'true');
}

await newBlock(page, 'a line');
await kindButton(row, 'Heading').click();
await kindButton(row, 'Heading').click();
t('pressing a Style twice puts it back to ordinary text',
  (await page.evaluate(CARET)).tag === 'P');

console.log('\nthe Script buttons');

/* The bug this exists for. Enter carries the script of the block above
   onto the new one, so the button a hand reaches for is often already
   the one the block has. That press has to confirm the script, not take
   it off: taking it off drops the block silently to the language of the
   whole piece, which is read as the wrong line changing font by itself. */
await newBlock(page, 'ایک سطر');
await kindButton(row, 'اردو').click();
const urduOnce = await page.evaluate(CARET);
await kindButton(row, 'اردو').click();
const urduTwice = await page.evaluate(CARET);
t('Urdu once marks the block Urdu', urduOnce.cls.includes('urdu'), JSON.stringify(urduOnce));
t('Urdu twice leaves it Urdu — a Script press sets, never clears',
  urduTwice.cls.includes('urdu') && urduTwice.dir === 'rtl', JSON.stringify(urduTwice));

await kindButton(row, 'عربی').click();
const swapped = await page.evaluate(CARET);
t('another Script swaps it rather than adding to it',
  swapped.cls.includes('arabic') && !swapped.cls.includes('urdu'), JSON.stringify(swapped));

/* The other half of the same complaint: a script marked on one block
   must not reach the block beside it. */
const neighbours = await page.evaluate(() => {
  const kids = document.querySelector('.admin-row[open] .writing-canvas').children;
  const last = kids[kids.length - 1], before = kids[kids.length - 2];
  return { last: last.className, before: before.className };
});
t('the block before it is untouched',
  !neighbours.before.includes('arabic'), JSON.stringify(neighbours));

console.log('\na block’s own script beats the piece’s');

/* This piece is Urdu, so a heading with nothing marked on it is drawn in
   the Urdu heading face. One marked English has to be drawn in the Latin
   one — it was not, for as long as headings existed: a rule reached
   through the container and a bare tag outranks the block's own class. */
/* A line of the piece itself, carrying no script of its own — so what
   draws it is the piece's language and nothing else. */
await caretInto(page, 'p:not([class])');
await kindButton(row, 'Heading').click();
const urduHeading = await page.evaluate(CARET);
await kindButton(row, 'English').click();
const latinHeading = await page.evaluate(CARET);
t('an unmarked heading in an Urdu piece is drawn in the Urdu heading face',
  /Aslam/.test(urduHeading.font), urduHeading.font);
t('a heading marked English is drawn in the Latin face',
  !/Aslam|Nastaliq|Mehr/.test(latinHeading.font), latinHeading.font);

console.log('\nEnter');

for (const [word, carries] of [['Heading', 'P'], ['Quote', 'BLOCKQUOTE'], ['Footnote', 'P']]) {
  await newBlock(page, 'first');
  await kindButton(row, word).click();
  await kindButton(row, 'عربی').click();
  await page.keyboard.press('Enter');
  await page.keyboard.type('second');
  await page.waitForTimeout(80);
  const next = await page.evaluate(CARET);
  const isFootnote = word === 'Footnote';
  t(`Enter after a ${word} gives ${isFootnote ? 'another footnote' : carries === 'P' ? 'ordinary text' : 'another quote'}`,
    next.tag === carries && (isFootnote ? next.cls.includes('footnote') : !next.cls.includes('footnote')),
    JSON.stringify(next));
  t('  …keeping the script of the line above', next.cls.includes('arabic'), JSON.stringify(next));
}

console.log('\nkind, script and alignment are three separate things');

await newBlock(page, 'a verse');
await kindButton(row, 'Quote').click();
await kindButton(row, 'عربی').click();
await alignButton(row, 'Centre this block').click();
const three = await page.evaluate(CARET);
t('a quotation can be Arabic and centred at once',
  three.tag === 'BLOCKQUOTE' && three.cls.includes('arabic') && three.align === 'center',
  JSON.stringify(three));

console.log('\nwhat a paste is understood to mean');

for (const [pasted, tag, why] of [['*A bold line*', 'H2', 'a whole line in asterisks is a heading'],
                                  ['_An aside_', 'BLOCKQUOTE', 'a whole line in underscores is a quotation'],
                                  ['> Someone said this', 'BLOCKQUOTE', 'a line starting with > is a quotation']]) {
  await newBlock(page, 'x');
  await page.evaluate((text) => {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    document.querySelector('.admin-row[open] .writing-canvas')
      .dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, pasted);
  await page.waitForTimeout(120);
  const got = await page.evaluate(() => {
    const kids = document.querySelector('.admin-row[open] .writing-canvas').children;
    return kids[kids.length - 1].tagName;
  });
  t(why, got === tag, 'got ' + got);
}

console.log('\nwhat script a paste is in');

/* The fault this section is for. At the end of a piece whose last line
   is an English citation, Enter carries "English" onto the new block —
   so an Urdu article pasted there landed inside a block marked English
   and set left to right. It rendered in DM Sans, and the space bar
   appeared to walk the caret backwards, because a space typed at the end
   of right-to-left text inside a left-to-right block belongs on the
   other side. Nothing on screen said so: an empty block shows no sign of
   the language it is holding. */

async function pasteInto(page, text) {
  await page.evaluate((t) => {
    const data = new DataTransfer();
    data.setData('text/plain', t);
    document.querySelector('.admin-row[open] .writing-canvas')
      .dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, text);
  await page.waitForTimeout(120);
}

/* An empty block that has been handed English by the line above it. */
async function emptyEnglishBlock(page) {
  await newBlock(page, 'x');
  await kindButton(row, 'English').click();
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(60);
}

const URDU = 'اسلامی اسٹاک اسکریننگ میں عموماً مشترکہ سرمایہ کمپنی کے بنیادی کاروبار';
const ARABIC = 'ٱدْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِٱلْحِكْمَةِ وَٱلْمَوْعِظَةِ ٱلْحَسَنَةِ';
const ENGLISH = 'Reservations on conventional Shariah screening of stocks.';

for (const [text, cls, dir, label] of [
  [URDU, 'urdu', 'rtl', 'Urdu pasted into a block marked English comes out Urdu, right to left'],
  [ARABIC, 'arabic', 'rtl', 'an Arabic verse comes out Arabic, not Urdu'],
  [ENGLISH, 'latin', 'ltr', 'English comes out English']]) {
  await emptyEnglishBlock(page);
  await pasteInto(page, text);
  const at = await page.evaluate(CARET);
  t(label, at.cls.split(' ').includes(cls) && at.dir === dir, JSON.stringify(at));
}

/* A whole article at once: the case actually complained about. */
await emptyEnglishBlock(page);
await pasteInto(page, [URDU, ARABIC, ENGLISH].join('\n\n'));
const pasted = await page.evaluate(() => {
  const kids = [...document.querySelector('.admin-row[open] .writing-canvas').children].slice(-3);
  /* The script only — a block may also be carrying an alignment from
     whatever it replaced, which is none of this test's business. */
  return kids.map((k) => ['urdu', 'arabic', 'latin'].find((c) => k.classList.contains(c)) + '|' + k.getAttribute('dir'));
});
t('an article that changes script part way marks each block for itself',
  pasted.join(' ') === 'urdu|rtl arabic|rtl latin|ltr', JSON.stringify(pasted));

/* And the other half of it: a block with words of its own keeps them. */
await newBlock(page, 'ایک جملہ');
await kindButton(row, 'اردو').click();
await pasteInto(page, ' (screening criteria)');
const spliced = await page.evaluate(CARET);
t('an English term pasted into an Urdu sentence leaves the line Urdu',
  spliced.cls.split(' ').includes('urdu') && spliced.dir === 'rtl', JSON.stringify(spliced));

console.log('\nwhat script is being typed');

/* The other half of the same fault, and the one actually complained
   about twice: typing, not pasting. Enter carries the script of the line
   above onto the new block, both Urdu pieces here end in an English
   citation, and so the line after one began marked English and set left
   to right. Urdu typed into it stayed left to right — DM Sans, and a
   space at the end of right-to-left words belonging on the other side of
   them, which is the space bar appearing to go backwards. */

/* Enter at the end of a real English line in the piece, which is how the
   block gets its English marking in life — pressing the English button
   would be the author deciding, and a decision is meant to stick. */
async function typeAfterEnglishLine(page, text) {
  await caretInto(page, 'p.latin', true);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(80);
  /* Spaces between the words but not after the last: the space bar is
     the whole point of this section, and a trailing one is held as
     &nbsp; while editing and trimmed when the piece is written, which
     the round trip further down would then report as a difference this
     test had made. */
  const words = text.split(' ');
  for (let i = 0; i < words.length; i += 1) {
    if (i) await page.keyboard.press('Space');
    await page.keyboard.type(words[i]);
    await page.waitForTimeout(50);
  }
}

await typeAfterEnglishLine(page, 'ایک دو تین');
let typed = await page.evaluate(CARET);
t('Urdu typed under an English line turns the line round',
  typed.cls.split(' ').includes('urdu') && typed.dir === 'rtl', JSON.stringify(typed));
t('  …in Urdu, not Arabic — ی and ک are what tell them apart',
  /Mehr/.test(typed.font), typed.font);

await typeAfterEnglishLine(page, 'إنَّ مِنَ البَيَانِ لَسِحْرًا');
typed = await page.evaluate(CARET);
t('an Arabic sentence typed the same way comes out Arabic',
  typed.cls.split(' ').includes('arabic') && typed.dir === 'rtl', JSON.stringify(typed));

/* And it must stop the moment the author says otherwise. */
await newBlock(page, 'x');
await kindButton(row, 'اردو').click();
await page.keyboard.press('Backspace');
await page.keyboard.type('Alsup');
await page.waitForTimeout(120);
typed = await page.evaluate(CARET);
t('a script chosen by hand is not overruled by what is typed next',
  typed.cls.split(' ').includes('urdu'), JSON.stringify(typed));

/* A line already in the piece was marked deliberately when it was
   written, so editing it must not move it either. */
/* At the end, and with no leading space: a space typed at the very start
   of a block is held as &nbsp; while it is being edited and trimmed when
   the piece is written out, so the round trip below would part over a
   character this test put there rather than anything the editor did. */
await caretInto(page, 'p.latin', true);
await page.keyboard.type('اور');
await page.waitForTimeout(120);
typed = await page.evaluate(CARET);
t('a line read in from the piece keeps the script it was saved with',
  typed.cls.split(' ').includes('latin'), JSON.stringify(typed));

console.log('\nmarks inside a line');

/* Until now a whole line could be a heading or a quotation and nothing
   smaller could be said, because a block was plain text with nowhere to
   put a mark on three words in the middle of it. */

/* Pick out characters from..to inside the last block, the way a hand
   would drag across them. */
async function pickOut(page, from, to) {
  await page.evaluate(([a, b]) => {
    const canvas = document.querySelector('.admin-row[open] .writing-canvas');
    const block = canvas.lastElementChild;
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
    const node = walker.nextNode();
    const range = document.createRange();
    range.setStart(node, a);
    range.setEnd(node, Math.min(b, node.length));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    canvas.focus();
  }, [from, to]);
  await page.waitForTimeout(60);
}

for (const [button, tag, label] of [['B', 'B', 'bold'], ['I', 'I', 'italic'], ['U', 'U', 'underline']]) {
  await newBlock(page, 'one two three');
  await pickOut(page, 4, 7);
  await kindButton(row, button).click();
  await page.waitForTimeout(120);
  const html = await page.evaluate(() =>
    document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML);
  t(label + ' marks only the words picked out',
    new RegExp('one <' + tag.toLowerCase() + '>two</' + tag.toLowerCase() + '> three', 'i').test(html), html);
}

for (const [button, cls, label] of [['a', 'text-small', 'a step smaller'], ['A', 'text-large', 'a step larger']]) {
  await newBlock(page, 'one two three');
  await pickOut(page, 4, 7);
  await kindButton(row, button).click();
  await page.waitForTimeout(120);
  let html = await page.evaluate(() =>
    document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML);
  t(label + ' wraps the words picked out', html.indexOf('class="' + cls + '"') !== -1, html);
  await kindButton(row, button).click();
  await page.waitForTimeout(120);
  html = await page.evaluate(() =>
    document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML);
  t('  …and pressing it again takes it off', html.indexOf(cls) === -1, html);
}

/* Bold inside Urdu, since Nastaliq has no bold of its own and the page
   answers with the heading face instead of a synthesised smear. */
await newBlock(page, 'ایک دو تین');
await pickOut(page, 4, 6);
await kindButton(row, 'B').click();
await page.waitForTimeout(120);
t('bold works inside an Urdu line too', await page.evaluate(() =>
  /<b>/i.test(document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML)));

/* And the marks have to reach the published page, not just the box. */
await newBlock(page, 'published emphasis here');
await pickOut(page, 10, 18);
await kindButton(row, 'B').click();
await page.waitForTimeout(150);

console.log('\nwriting it out and reading it back');

/* The strongest thing here. Everything above is built out of the block
   kinds, the scripts and the alignments in combination; if writing the
   page loses any of it, opening the piece again shows something other
   than what was written, and the next publish saves the loss. So: what
   is in the box now, written out, served back, and opened again, has to
   be the same box.

   It is worth this much trouble because the reverse has a name — the
   author opening a finished piece to fix a comma and finding the verse
   in the middle of it has quietly become a paragraph. */
const before = await page.evaluate(() => document.querySelector('.admin-row[open] .writing-canvas').innerHTML);

await page.click('#export');
await page.waitForSelector('#out-pages section', { timeout: 20000 });
await page.waitForTimeout(1200);

const written = await page.evaluate((post) => {
  const sections = Array.from(document.querySelectorAll('#out-pages section'));
  const mine = sections.find((s) => s.querySelector('h3').textContent.includes(post));
  return mine ? mine.querySelector('textarea').value : null;
}, POST);
t('the piece is among the files a publish would write', typeof written === 'string' && written.length > 0);
t('  …with the marks inside its lines, not only in the box',
  /<b>emphasis<\/b>/.test(written || ''), (written || '').slice(0, 0) + 'no <b>emphasis</b> in the written page');

/* Every file the same publish would send, against what the Worker will
   take. This is the check that was missing when the library grew past
   the Worker's own ceiling and publishing stopped for a week. */
const publish = await page.evaluate(() => {
  const sections = Array.from(document.querySelectorAll('#out-pages section'));
  const texts = sections.map((s) => {
    const area = s.querySelector('textarea');
    return { path: s.querySelector('h3').textContent.trim(),
             bytes: area ? new TextEncoder().encode(area.value).length : 0 };
  });
  return { count: texts.length + 2, paths: ['content.js', 'sitemap.xml'].concat(texts.map((x) => x.path)),
           biggest: texts.reduce((a, b) => (b.bytes > a.bytes ? b : a), { bytes: 0 }) };
});
const worker = await readFile(join(ROOT, 'worker/src/index.js'), 'utf8');
const maxFiles = Number(/const MAX_FILES = (\d+)/.exec(worker)[1]);
const maxBytes = eval(/const MAX_FILE_BYTES = ([^;]+);/.exec(worker)[1]);

/* Every path a publish would send, against the list the Worker will
   actually match it with. Counting the files was not enough: one post
   had capitals in its file name and the list had none, so a publish
   carrying it was refused whole, every time, however few files it was.
   A page unwritable to the Worker cannot be found by looking at that
   page — the whole library goes or none of it does — so the check has
   to be every path, not a specimen of each shape. */
const writable = [...worker.matchAll(/^\s*(\/\^.*\$\/),?$/gm)]
  .map((m) => new RegExp(m[1].slice(1, -1)));
t('the Worker\u2019s list of writable paths was read', writable.length >= 5, String(writable.length));
const unwritable = publish.paths.filter((path) => !writable.some((allow) => allow.test(path)));
t('every file a publish sends is one the Worker will write', unwritable.length === 0,
  unwritable.join(', ') + ' \u2014 the publish is refused whole, and every other file with it');
t(`a publish sends ${publish.count} files, and the Worker takes ${maxFiles}`,
  publish.count <= maxFiles, `${publish.count} > ${maxFiles} — publishing is refused outright`);
t(`the largest file is ${Math.round(publish.biggest.bytes / 1024)}KB, and the Worker takes ${Math.round(maxBytes / 1024)}KB`,
  publish.biggest.bytes <= maxBytes, publish.biggest.path);

/* Serve back what was just written, and open it again. */
overlay.set(`posts/${POST}.html`, written);
row = await openEditor(page);
const after = await page.evaluate(() => document.querySelector('.admin-row[open] .writing-canvas').innerHTML);
t('the piece read back is the piece that was written', after === before,
  after === before ? '' : firstDifference(before, after));

function firstDifference(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return 'they part at character ' + i + ':\n      was:  …' + a.slice(Math.max(0, i - 60), i + 90) +
         '\n      now:  …' + b.slice(Math.max(0, i - 60), i + 90);
}

t('nothing threw along the way', jsErrors.length === 0, jsErrors.join(' | '));

await browser.close();
server.close();

console.log('\n' + (failed.length ? `FAILED (${failed.length}):\n  ` + failed.join('\n  ') : `PASS (${passed})`));
process.exit(failed.length ? 1 : 0);
