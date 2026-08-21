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
    .replace(/apiKey: '[^']*',/, "apiKey: '',")
    /* The third stand-in. BACKEND is only set over https on an admin.*
       host, which a test server is not, and without it the publish path
       goes straight to GitHub instead of the Worker — so the answer the
       Worker gives when nothing differs is unreachable, and that answer
       is exactly what the tests below are about. */
    .replace(/var BACKEND = [^;]+;/, "var BACKEND = '/publish';");
  if (!out.includes(`var PASS_HASH = '${hash}';`) || !out.includes("apiKey: '',") ||
      !out.includes("var BACKEND = '/publish';")) {
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
   loose match would find two of them and act on whichever came first. */
const exactly = (word) => new RegExp('^\\s*' + word + '\\s*$');

/* The toolbar is a mixture: a menu where the answer is one of several
   and worth reading back, a button where it is on or off. A test should
   say what it wants set, not which kind of control happens to set it —
   so this finds either and uses it the right way. */
async function use(page, row, word) {
  const button = row.locator('.writing-tool', { hasText: exactly(word) });
  if (await button.count()) { await button.click(); await page.waitForTimeout(110); return; }
  const menu = row.locator('.writing-menu').filter({ has: page.locator('option', { hasText: exactly(word) }) }).first();
  if (!(await menu.count())) throw new Error('no control named ' + word);
  await menu.selectOption({ label: word });
  await page.waitForTimeout(110);
}

/* What a menu is showing, for the tests that read a control back. */
async function showing(page, row, label) {
  const menu = row.locator(`.writing-menu[aria-label="${label}"]`);
  return menu.evaluate((el) => el.options[el.selectedIndex].textContent.trim());
}
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

/* ---- the generator agrees with the repository -----------------------

   content.js and index.html are both written by this editor, and both are
   committed. If what it writes today differs from what is in the branch,
   every publish carries files nobody edited — and worse, the reverse is
   invisible: a generator quietly drifting from the committed page is only
   found when someone reads a diff.

   So this runs first, before any test below has typed a character. Once
   they have, "unchanged" is no longer the question. */
console.log('\nwhat the editor writes, against what is committed');
{
  await page.click('#export');
  await page.waitForSelector('#out-pages section', { timeout: 30000 });
  await page.waitForTimeout(800);
  const made = await page.evaluate(() => {
    const home = [...document.querySelectorAll('#out-pages section')]
      .find((x) => x.querySelector('h3').textContent.trim() === 'index.html');
    return { content: document.getElementById('out-content').value,
             home: home ? home.querySelector('textarea').value : null };
  });
  const onDisk = {
    content: await readFile(join(ROOT, 'content.js'), 'utf8'),
    home: await readFile(join(ROOT, 'index.html'), 'utf8')
  };
  t('the content.js it writes is the content.js in the branch',
    made.content === onDisk.content,
    made.content === onDisk.content ? '' : firstDifference(onDisk.content, made.content));
  t('the index.html it writes is the index.html in the branch',
    made.home === onDisk.home,
    made.home === onDisk.home ? '' : firstDifference(onDisk.home, made.home || ''));
  await page.evaluate(() => document.getElementById('export-dialog').close());
  await page.waitForTimeout(150);
}

console.log('\nthe Style buttons');

for (const [word, tag, cls] of [['Heading', 'H2', ''], ['Sub-heading', 'H3', ''],
                                ['Quote', 'BLOCKQUOTE', ''], ['Footnote', 'P', 'footnote']]) {
  await newBlock(page, 'a line');
  await use(page, row, word);
  const at = await page.evaluate(CARET);
  t(`${word} makes a ${tag.toLowerCase()}${cls ? '.' + cls : ''}`,
    at.tag === tag && (!cls || at.cls.split(' ').includes(cls)), JSON.stringify(at));
  t(`  …and the Style menu says so`, await showing(page, row, 'Style') === word);
}

await newBlock(page, 'a line');
await use(page, row, 'Heading');
await use(page, row, 'Text');
t('choosing Text puts a heading back to ordinary text',
  (await page.evaluate(CARET)).tag === 'P');

console.log('\nthe Script buttons');

/* The bug this exists for. Enter carries the script of the block above
   onto the new one, so the button a hand reaches for is often already
   the one the block has. That press has to confirm the script, not take
   it off: taking it off drops the block silently to the language of the
   whole piece, which is read as the wrong line changing font by itself. */
await newBlock(page, 'ایک سطر');
await use(page, row, 'اردو');
const urduOnce = await page.evaluate(CARET);
await use(page, row, 'اردو');
const urduTwice = await page.evaluate(CARET);
t('Urdu once marks the block Urdu', urduOnce.cls.includes('urdu'), JSON.stringify(urduOnce));
t('Urdu twice leaves it Urdu — choosing a script sets, never clears',
  urduTwice.cls.includes('urdu') && urduTwice.dir === 'rtl', JSON.stringify(urduTwice));

await use(page, row, 'عربی');
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
await use(page, row, 'Heading');
const urduHeading = await page.evaluate(CARET);
await use(page, row, 'English');
const latinHeading = await page.evaluate(CARET);
t('an unmarked heading in an Urdu piece is drawn in the Urdu heading face',
  /Aslam/.test(urduHeading.font), urduHeading.font);
t('a heading marked English is drawn in the Latin face',
  !/Aslam|Nastaliq|Mehr/.test(latinHeading.font), latinHeading.font);

console.log('\nEnter');

for (const [word, carries] of [['Heading', 'P'], ['Quote', 'BLOCKQUOTE'], ['Footnote', 'P']]) {
  await newBlock(page, 'first');
  await use(page, row, word);
  await use(page, row, 'عربی');
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
await use(page, row, 'Quote');
await use(page, row, 'عربی');
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
  await use(page, row, 'English');
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
await use(page, row, 'اردو');
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
await use(page, row, 'اردو');
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
  await use(page, row, button);
  await page.waitForTimeout(120);
  const html = await page.evaluate(() =>
    document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML);
  t(label + ' marks only the words picked out',
    new RegExp('one <' + tag.toLowerCase() + '>two</' + tag.toLowerCase() + '> three', 'i').test(html), html);
}

for (const [button, cls, label] of [['One step smaller', 'text-small', 'a step smaller'],
                                    ['One step larger', 'text-large', 'a step larger']]) {
  await newBlock(page, 'one two three');
  await pickOut(page, 4, 7);
  await use(page, row, button);
  await page.waitForTimeout(120);
  let html = await page.evaluate(() =>
    document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML);
  t(label + ' wraps the words picked out', html.indexOf('class="' + cls + '"') !== -1, html);
  await use(page, row, 'Normal size');
  await page.waitForTimeout(120);
  html = await page.evaluate(() =>
    document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML);
  t('  …and Normal size takes it off again', html.indexOf(cls) === -1, html);
}

/* Bold inside Urdu, since Nastaliq has no bold of its own and the page
   answers with the heading face instead of a synthesised smear. */
await newBlock(page, 'ایک دو تین');
await pickOut(page, 4, 6);
await use(page, row, 'B');
await page.waitForTimeout(120);
t('bold works inside an Urdu line too', await page.evaluate(() =>
  /<b>/i.test(document.querySelector('.admin-row[open] .writing-canvas').lastElementChild.innerHTML)));

/* And the marks have to reach the published page, not just the box. */
await newBlock(page, 'published emphasis here');
await pickOut(page, 10, 18);
await use(page, row, 'B');
await page.waitForTimeout(150);

/* ---- the Site & About panel -----------------------------------------

   The homepage's words are in content.js now, and this is the form that
   edits them. What matters is the whole way through: a word typed into a
   field reaches the generated content.js, and from there the generated
   index.html — three files and two generators between the keystroke and
   the page. Checking only that the field accepts text would prove none
   of it. */
console.log('\nthe Site & About panel');

const panel = page.locator('.admin-group').first();
t('the panel is above the library',
  (await panel.locator('h2').textContent()).startsWith('Site & About'),
  await panel.locator('h2').textContent());

const blocks = await page.locator('.admin-row-plain .admin-row-title').allTextContents();
for (const name of ['The site itself', 'Header links', 'The hero', 'The author',
                    'Contact', 'Footer', 'Categories']) {
  t(`  …with a row for ${name}`, blocks.includes(name), blocks.join(' | '));
}

/* A filter is a search for a record. Leaving the site's own words on top
   of the results would be answering a different question. */
await page.fill('#filter', 'saa-ki');
await page.waitForTimeout(120);
t('  …and it steps out of the way when the library is filtered',
  await page.locator('.admin-row-plain').count() === 0);
t('  …without the filter claiming nothing matched',
  await page.locator('.empty-state').count() === 0);
await page.fill('#filter', 'zzzznothing');
await page.waitForTimeout(120);
t('  …and a filter that really matches nothing still says so',
  await page.locator('.empty-state').count() === 1);
await page.fill('#filter', '');
await page.waitForTimeout(150);

/* Typing into the author's introduction, and following it out. */
const AUTHOR_BLOCK = '.admin-row-plain:has(.admin-row-title:text-is("The author"))';
await page.locator(AUTHOR_BLOCK + ' > summary').click();
await page.waitForTimeout(150);
const headingBox = page.locator(AUTHOR_BLOCK + ' .admin-field:has(label:text-is("Heading")) input');
const headingWas = await headingBox.inputValue();
await headingBox.fill('Abul Laith Muhammad Tahir Qadri An-Naeemi, teacher');
await page.waitForTimeout(120);

/* The Urdu fields are in Nastaleeq and read right to left while they are
   being typed, not only once published. */
const labelBox = page.locator(AUTHOR_BLOCK + ' .admin-field:has(label:text-is("Label")) input');
const script = await labelBox.evaluate((el) => ({
  dir: el.getAttribute('dir'), cls: el.className, font: getComputedStyle(el).fontFamily
}));
t('  …an Urdu field is right to left and in Nastaleeq as it is typed',
  script.dir === 'rtl' && /urdu/.test(script.cls), JSON.stringify(script));

await page.locator(AUTHOR_BLOCK + ' .admin-files button:text("+ Add a paragraph")').first().click();
await page.waitForTimeout(120);
const added = page.locator(AUTHOR_BLOCK + ' .admin-file.is-single textarea').last();
await added.fill('ایک نیا پیراگراف جو صفحے پر آنا چاہیے۔');
await page.waitForTimeout(150);
t('  …a paragraph added to the introduction is in Nastaleeq too',
  /urdu/.test(await added.getAttribute('class') || ''), await added.getAttribute('class'));

/* And out the other end. */
await page.click('#export');
await page.waitForSelector('#out-pages section', { timeout: 30000 });
await page.waitForTimeout(800);
const reached = await page.evaluate(() => {
  const sections = Array.from(document.querySelectorAll('#out-pages section'));
  const home = sections.find((s) => s.querySelector('h3').textContent.trim() === 'index.html');
  return { content: document.getElementById('out-content').value,
           home: home ? home.querySelector('textarea').value : '' };
});
t('  …an edit reaches the generated content.js',
  reached.content.includes('Abul Laith Muhammad Tahir Qadri An-Naeemi, teacher'));
t('  …and the generated index.html',
  reached.home.includes('Abul Laith Muhammad Tahir Qadri An-Naeemi, teacher'));
t('  …a new paragraph reaches both',
  reached.content.includes('ایک نیا پیراگراف') && reached.home.includes('ایک نیا پیراگراف'));
t('  …and it lands inside the introduction, not loose on the page',
  /<div class="bio-prose[^>]*>[\s\S]*?ایک نیا پیراگراف[\s\S]*?<\/div>/.test(reached.home));
/* content.js is loaded by every visitor. A field that can put an
   apostrophe or a quote into it must not be able to break it. */
/* Editing a record stamps the day it was edited on it, which is what the
   strip on the homepage is ordered by. Stamped here rather than at
   publish time: a publish rewrites every page in the library whether or
   not anything about it changed, so stamping there would mark the whole
   library as new every time and the strip would say nothing. */
{
  const now = new Date();
  const stamp = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  t('  …and the record typed into earlier carries the day it was edited',
    reached.content.includes('updated: "' + stamp + '"'), stamp);
  /* In the author's own day, not UTC's. Karachi is five hours ahead, so
     a post written before five in the morning used to be stamped
     yesterday. */
  t('  …in the day where the editor is, not UTC\u2019s',
    !reached.content.includes('updated: "' + new Date(Date.now() - 864e5).toISOString().slice(0, 10) + '"') ||
    stamp === new Date(Date.now() - 864e5).toISOString().slice(0, 10), stamp);
}

t('  …and the generated content.js still parses after all of that',
  (() => { try { const c = {}; new Function('window', reached.content).call(c, c);
    return !!(c.siteContent && c.siteContent.about); } catch { return false; } })());

/* The dialog is modal — nothing behind it can be clicked while it is
   open, and the restoring below is all behind it. */
await page.evaluate(() => document.getElementById('export-dialog').close());

/* Put back what this section typed. Everything below writes the same
   files out again and compares them with what is committed, and a
   heading left edited here would read as the generator disagreeing with
   the repository when it is only this test still holding a pen. */
await headingBox.fill(headingWas);
await page.locator(AUTHOR_BLOCK + ' .admin-file.is-single:has(textarea) .admin-danger').last().click();
await page.waitForTimeout(150);
await page.locator(AUTHOR_BLOCK + ' > summary').click();
await page.waitForTimeout(120);

/* Filtering rebuilt the library three times just now, and a rebuild
   closes every row that is not in view — the post the tests below write
   into among them. Open it again before carrying on, and only if it is
   shut: a row is a <details>, and clicking an open one closes it. */
if (!(await row.evaluate((el) => el.open))) {
  await row.locator('summary').click();
  await page.waitForTimeout(400);
}
await row.locator('.writing-canvas').waitFor();

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

/* ---- the homepage --------------------------------------------------

   The author's introduction, the hero, the contact lines and the footer
   all live in content.js now, and index.html carries a rendering of them
   between markers the editor writes into. That is the awkward way round
   — drawing them with a script at load would have been three lines — and
   it is the right way round: the introduction is the most-read prose
   about the author on the site, and a crawler, a WhatsApp preview and a
   reader with JavaScript off never run a script.

   So what these check is that the awkward part works: the words go in,
   the marked region comes out holding them, and everything outside the
   markers is left exactly as it was. */
console.log('\nthe homepage');

const home = await page.evaluate(() => {
  const sections = Array.from(document.querySelectorAll('#out-pages section'));
  const mine = sections.find((s) => s.querySelector('h3').textContent.trim() === 'index.html');
  return mine ? mine.querySelector('textarea').value : null;
});
t('index.html is among the files a publish would write', typeof home === 'string' && home.length > 0);

for (const region of ['nav', 'hero', 'about', 'recent', 'contact', 'footer']) {
  t(`  …the ${region} region survives being written`,
    (home || '').includes(`<!-- editor:${region} -->`) &&
    (home || '').includes(`<!-- /editor:${region} -->`));
}

/* The words themselves, out of content.js and into the page — the whole
   point of the exercise. */
const words = await page.evaluate(() => {
  const c = window.siteContent;
  return { label: c.about.label, byline: c.about.bio.byline,
           fact: c.about.bio.facts[0].value, panel: c.about.bio.panels[0].title,
           item: c.about.bio.panels[0].items[0], urdu: c.hero.urdu,
           contact: c.contact.heading, credit: c.footer.credit };
});
for (const [name, text] of Object.entries(words)) {
  t(`  …the ${name} from content.js is in the page`, (home || '').includes(text), text);
}

/* Nothing outside a marker moved. The <head>, the category bar, the
   library and the fatawa panel are hand-written and stay that way. */
for (const untouched of ['<meta property="og:image"', 'id="category-bar"',
                         'id="work-library"', 'id="rulings-library"', '<script src="content.js">']) {
  t(`  …and ${untouched.slice(0, 28)}… is left alone`, (home || '').includes(untouched));
}

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

/* ---- an app ----------------------------------------------------------

   An app is a record with an `app` block on it. It gets a page of its own
   the way a post does, so everything that already walks the library
   reaches it untold — the sitemap line, the share card, the category
   pill, the search — but its page is built from fields rather than
   written, because an app page is a link, a version and a list of what is
   new. Written as prose it would be an essay about an app. */
console.log('\nan app');

const APP = 'zakat-calculator';
{
  const appRow = page.locator('.admin-row').filter({ hasText: APP }).first();
  await appRow.locator('summary').click();
  await page.waitForTimeout(250);
  t('an app row has no writing box — there is no writing in an app',
    await appRow.locator('.writing-canvas').count() === 0);
  t('  …it has the address the app opens at instead',
    await appRow.locator('input[placeholder="https://…"]').count() === 1);
  t('  …a version, the platforms and what is new',
    await appRow.locator('.admin-field:has(label:text-is("Version"))').count() === 1 &&
    await appRow.locator('.admin-field:has(label:text-is("Runs on"))').count() === 1 &&
    (await appRow.locator('.admin-field label').allTextContents()).some((x) => /What.s new/.test(x)));
  await appRow.locator('summary').click();
  await page.waitForTimeout(150);
}

await page.click('#export');
await page.waitForSelector('#out-pages section', { timeout: 30000 });
await page.waitForTimeout(900);
const appOut = await page.evaluate((id) => {
  const sections = [...document.querySelectorAll('#out-pages section')];
  const mine = sections.find((s) => s.querySelector('h3').textContent.trim() === 'apps/' + id + '.html');
  return { page: mine ? mine.querySelector('textarea').value : null,
           paths: sections.map((s) => s.querySelector('h3').textContent.trim()),
           sitemap: document.getElementById('out-sitemap').value };
}, APP);

t('a publish writes the app its own page under apps/',
  typeof appOut.page === 'string' && appOut.page.length > 0, appOut.paths.join(', '));
t('  …and not a post page as well', !appOut.paths.includes('posts/' + APP + '.html'));
t('  …nor a works page', !appOut.paths.includes('works/' + APP + '.html'));
t('  …the sitemap names it', appOut.sitemap.includes('apps/' + APP + '.html'));
t('  …its own share card is drawn for it',
  appOut.paths.includes('files/cards/' + APP + '.jpg'), appOut.paths.join(', '));

t('  …the page opens the app, away from here',
  /<a class="button button-dark" href="https:\/\/[^"]+"[^>]*target="_blank"[^>]*rel="noopener"/.test(appOut.page || ''),
  (appOut.page || '').slice(0, 0) + 'no offsite open button');
t('  …says which version, and what runs it',
  /<dt>Version<\/dt>/.test(appOut.page || '') && /Apple/.test(appOut.page || ''));
t('  …lists what is new', /What.s new in version/.test(appOut.page || ''));
t('  …calls itself a SoftwareApplication, not an article',
  /"@type":"SoftwareApplication"/.test(appOut.page || '') &&
  !/BlogPosting/.test(appOut.page || ''));
t('  …and its description follows the app, both scripts',
  /class="urdu"/.test(appOut.page || '') && /zak/.test(appOut.page || ''));
/* An app is not a piece of writing, so its page carries no Print — the
   same reason a work's page does not. */
t('  …and nothing on it claims to be printable',
  !/id="post-body"/.test(appOut.page || ''));

await page.evaluate(() => document.getElementById('export-dialog').close());
await page.waitForTimeout(150);
/* Open only if it is not already — a row is a <details>, and clicking
   the summary of an open one shuts it. */
if (!(await row.evaluate((el) => el.open))) {
  await row.locator('summary').click();
  await row.locator('.writing-canvas').waitFor();
  await page.waitForTimeout(300);
}

/* ---- a publish that changed nothing ----------------------------------

   The Worker is handed the whole library every time and commits only the
   files that differ, so "nothing differed" is a real answer. It is a fine
   answer to a publish made without editing anything, and a bad one to a
   publish made straight after an edit — there it means the edit never
   left the browser. Both used to read as success, in the same green.

   Not hypothetical. An update to a post was published from a tab left
   open since before the site last changed; that tab rebuilt every page
   the old way, which is exactly what was already committed, so nothing
   differed and the editor said so approvingly. The author had no way to
   know the change had not gone out. */

/* The Worker answers here instead of Cloudflare. One route, and what it
   replies with is a variable, so registering it does not stack. */
let workerReply = { files: [] };
await page.route('**/publish', (route) => route.fulfill({
  status: 200, contentType: 'application/json', body: JSON.stringify(workerReply)
}));

async function publishAndRead(page) {
  await page.evaluate(() => {
    const box = document.getElementById('publish-status');
    box.textContent = '';
    box.className = 'admin-status';
  });
  await page.click('#publish');
  /* Drawing every card takes a while, and until it is done the box only
     says what it is doing. Wait for a sentence that is an outcome. */
  await page.waitForFunction(() => {
    const box = document.getElementById('publish-status');
    return box && /did not go out|Nothing had changed|Published |Nothing was published|Fix these first/.test(box.textContent);
  }, null, { timeout: 90000 });
  return page.evaluate(() => {
    const box = document.getElementById('publish-status');
    return { text: box.textContent,
             bad: box.classList.contains('is-bad'),
             good: box.classList.contains('is-good') };
  });
}

console.log('\na publish that committed nothing');

/* Every post's words are read back from its own page as the rows are
   built. Publishing before they arrive is refused, with a sentence
   saying so — which is right, and not what these two are about. */
await page.waitForFunction(
  () => !/Loading the current text/.test(document.body.textContent), null, { timeout: 20000 });

const calm = await publishAndRead(page);
t('with nothing edited, a publish that committed nothing says so calmly',
  calm.good && !calm.bad && /Nothing had changed/.test(calm.text), JSON.stringify(calm));

await newBlock(page, 'a line that will not go out');
const lost = await publishAndRead(page);
t('  …after an edit, the same answer is a failure, not a success',
  lost.bad && !lost.good, JSON.stringify(lost));
t('  …and it says plainly that the changes did not go out',
  /did not go out/.test(lost.text), lost.text);
t('  …and names the tab, which is what it usually is',
  /[Rr]eload/.test(lost.text), lost.text);

/* ---- a tab older than the editor the site is serving ------------------

   The same failure, caught before the publish rather than after it. The
   page asks for admin.js again on load and reads the version out of the
   text; here the answer carries a version this tab is not running, which
   is what a tab left open across a deploy would get.

   Routed on the fetch only. The same URL loads the editor itself, and
   answering that with a stub would leave nothing to test. */
console.log('\na tab older than the site');

await page.route('**/admin.js', (route, request) => {
  if (request.resourceType() !== 'fetch') return route.fallback();
  route.fulfill({ status: 200, contentType: 'text/javascript',
    body: "var EDITOR_VERSION = 'a-later-one';" });
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.admin-row');
const staleBox = await page.evaluate(() => new Promise((done) => {
  const box = document.getElementById('worker-status');
  const started = Date.now();
  const look = () => {
    if (!box.hidden && /older copy of the editor/.test(box.textContent)) return done(box.textContent);
    if (Date.now() - started > 5000) return done(box.hidden ? '(nothing shown)' : box.textContent);
    setTimeout(look, 50);
  };
  look();
}));
t('a tab older than the served editor is told so, and told to reload',
  /older copy of the editor/.test(staleBox) && /Reload/.test(staleBox), staleBox);

/* Both checks write into that one box, and both can be true at once —
   this tab is also talking to a /version that is not a Worker. Neither
   may erase the other. */
t('  …without erasing what the Worker check had already said',
  /Worker deployed at/.test(staleBox), staleBox);

/* And when it cannot tell, it says nothing at all. A version check that
   fails must never stand in front of a publish. */
await page.unroute('**/admin.js');
await page.route('**/admin.js', (route, request) => {
  if (request.resourceType() !== 'fetch') return route.fallback();
  route.fulfill({ status: 500, contentType: 'text/plain', body: 'no' });
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.admin-row');
await page.waitForTimeout(2000);
const quietBox = await page.evaluate(() => {
  const box = document.getElementById('worker-status');
  return box.hidden ? '' : box.textContent;
});
t('  …and stays quiet when it cannot tell which version the site serves',
  !/older copy of the editor/.test(quietBox), quietBox);


/* ---- a homepage the editor cannot splice ----------------------------

   index.html is the front door of the site. Writing some of its regions
   and not others would leave it half generated, so a missing marker
   writes nothing at all and stops the publish with a sentence naming it.

   Routed on the fetch only, the same way the version check above is: the
   page under test is admin.html, and index.html reaches it only through
   the one fetch the editor makes for it. */
console.log('\na homepage the editor cannot splice');

await page.unroute('**/admin.js');
await page.route('**/index.html', async (route, request) => {
  if (request.resourceType() !== 'fetch') return route.fallback();
  const real = await readFile(join(ROOT, 'index.html'), 'utf8');
  route.fulfill({ status: 200, contentType: 'text/html',
    body: real.replace('<!-- editor:about -->', '') });
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('.admin-row');
await page.waitForFunction(
  () => !/Loading the current text/.test(document.body.textContent), null, { timeout: 20000 });
await page.click('#publish');
await page.waitForFunction(() => /\S/.test(document.getElementById('publish-status').textContent),
  null, { timeout: 15000 });
const broke = await page.evaluate(() => document.getElementById('publish-status').textContent);
t('a homepage missing a marker stops the publish rather than half writing it',
  /marker/.test(broke) && /about/.test(broke), broke);
t('  …and names the marker, so it can be put back', /editor:about/.test(broke), broke);
t('  …and nothing was sent — it did not report a publish',
  !/Published /.test(broke), broke);

t('nothing threw along the way', jsErrors.length === 0, jsErrors.join(' | '));

await browser.close();
server.close();

console.log('\n' + (failed.length ? `FAILED (${failed.length}):\n  ` + failed.join('\n  ') : `PASS (${passed})`));
process.exit(failed.length ? 1 : 0);
