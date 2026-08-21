/* The editor.

   Reads content.js into a working copy, lets you change it through forms,
   and writes the file back out as text for you to paste into GitHub. It
   never saves anything by itself — a static site has nothing to save to —
   so nothing you do here can break the live site until you choose to
   commit it.

   Fields are built with DOM methods rather than innerHTML, so a title
   containing a quote or an angle bracket is never parsed as markup. */

(function () {
  'use strict';

  /* ---- The latch ----------------------------------------------------

     A static site has no server, so this cannot be a lock. The passphrase
     is compared against a SHA-256 digest held below; anyone who opens the
     browser's developer tools can read past it. What it does do is keep a
     casual visitor out of the editor, and that is all it is claimed to do.

     It is enough here because the editor holds nothing private — every
     word in it is already published — and it can save nothing. The thing
     that actually protects the library is that only you can push to
     GitHub.

     To change the passphrase, open any page of the site, paste this in the
     browser console, and put the line it prints in place of PASS_HASH:

       crypto.subtle.digest('SHA-256', new TextEncoder().encode('your new words'))
         .then(h => console.log([...new Uint8Array(h)]
           .map(b => b.toString(16).padStart(2,'0')).join('')))

     For real protection, put the site behind Cloudflare Access — free,
     and it authenticates before the page is ever served. */
  var PASS_HASH = '747402f385b5ce61e73972374c7749ecc86fda520bb7f0980deae111611d7207';

  /* Each set in the script it names, so the button for Urdu is written in
     Nastaleeq and the choice can be made by looking rather than by
     knowing what Nastaleeq means. */
  var LANGUAGES = [
    { value: 'ur', label: 'اردو', cls: 'urdu' },
    { value: 'ar', label: 'عربی', cls: 'arabic' },
    { value: 'en', label: 'English', cls: '' }
  ];

  var source = window.siteContent || {};
  /* Deep copy, so the page you are editing is never the page you are
     reading from. */
  var model = JSON.parse(JSON.stringify({
    site: source.site || {},
    /* The homepage's own words. They are edited here and written back
       into index.html on publish — see buildIndex — so they belong in
       the model beside the records, not in the page. */
    nav: source.nav || [],
    hero: source.hero || {},
    about: source.about || {},
    contact: source.contact || {},
    footer: source.footer || {},
    categories: source.categories || [],
    rulings: source.rulings || []
  }));

  /* Ids are permanent — they are in links already shared. Remember the
     ones we loaded so a rename can be flagged rather than silently made. */
  var originalIds = {};
  eachRecord(function (record) {
    originalIds[record.id] = true;
  });

  var dirty = false;
  var editor = document.getElementById('editor');
  var dirtyNote = document.getElementById('dirty-note');
  var filterInput = document.getElementById('filter');

  /* ---- Walking the model ---- */

  function eachRecord(fn) {
    (model.categories || []).forEach(function (category) {
      (category.works || []).forEach(function (work, index) {
        fn(work, category.works, index, category);
      });
    });
    (model.rulings || []).forEach(function (ruling, index) {
      fn(ruling, model.rulings, index, null);
    });
  }

  function allRecords() {
    var out = [];
    eachRecord(function (record, list, index, category) {
      out.push({ record: record, list: list, index: index, category: category });
    });
    return out;
  }

  function markDirty() {
    dirty = true;
    dirtyNote.textContent = 'Unsaved changes';
  }

  /* Today, where the person editing is — not in UTC. toISOString() gives
     UTC, and Karachi is five hours ahead of it, so a post written between
     midnight and five in the morning was stamped with yesterday. */
  function today() {
    var now = new Date();
    return now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }

  /* A record that was just changed is a record that was just updated, and
     the strip on the homepage reads that.

     Stamped as it is edited rather than at publish time. A publish
     rewrites every page in the library whether or not anything about it
     changed — that is deliberate, and it is why there is never a "does
     this still match" question to answer by hand — so stamping there
     would mark all twenty-three as new, every time, and the strip would
     say nothing at all. */
  function touch(record) {
    if (!record || !record.id) return;
    record.updated = today();
  }

  /* ---- Small builders ---- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var fieldSerial = 0;

  /* The label was never joined to its control — a sighted mouse user
     never notices, because the text sits right above the box either way,
     but a screen reader announces the field as unlabelled, and a click on
     the words does nothing. `wrap.own(control)` closes that: it gives the
     control the id the label already points to, on whichever element in
     the field is the one a person actually types into. */
  function field(labelText, hintText) {
    var wrap = el('div', 'admin-field');
    var label = el('label', null, labelText);
    if (hintText) {
      var hint = el('span', 'hint', ' — ' + hintText);
      label.appendChild(hint);
    }
    wrap.appendChild(label);
    var id = 'field-' + (++fieldSerial);
    label.id = id + '-label';
    label.htmlFor = id;
    /* The one-control case: the field has a single input or textarea, and
       the label's `for` points straight at it. */
    wrap.own = function (control) {
      control.id = id;
      return control;
    };
    /* The several-controls case — a row of chip buttons, a tag box with
       its own input inside. `for` needs one target and there isn't one,
       so the row is a labelled group instead; each button or pill still
       carries its own text, so nothing inside goes unnamed. */
    wrap.group = function (container) {
      container.setAttribute('role', 'group');
      container.setAttribute('aria-labelledby', label.id);
      return container;
    };
    return wrap;
  }

  /* Keeps a text input in the right script, direction and font for the
     language chosen — the same rule the site itself follows. */
  function applyScript(input, language) {
    input.classList.remove('urdu', 'arabic', 'latin');
    input.classList.add(language === 'ur' ? 'urdu' : language === 'ar' ? 'arabic' : 'latin');
    input.setAttribute('dir', language === 'ur' || language === 'ar' ? 'rtl' : 'ltr');
    input.setAttribute('lang', language || 'en');
  }

  function textInput(value, onInput) {
    var input = document.createElement('input');
    input.type = 'text';
    input.value = value == null ? '' : value;
    input.addEventListener('input', function () {
      onInput(input.value);
      markDirty();
    });
    return input;
  }

  function textArea(value, onInput) {
    var area = document.createElement('textarea');
    area.value = value == null ? '' : value;
    area.addEventListener('input', function () {
      onInput(area.value);
      markDirty();
    });
    return area;
  }

  /* A row of buttons where a dropdown would have been. One is on; pressing
     it again turns it off where that is allowed, which is how the kind is
     cleared without selecting an empty option nobody can see. */
  function chipGroup(items, value, onPick, clearable) {
    var box = el('div', 'chip-group');
    var buttons = [];

    function select(chosen) {
      buttons.forEach(function (entry) {
        entry.button.setAttribute('aria-pressed', entry.value === chosen ? 'true' : 'false');
      });
    }

    items.forEach(function (item) {
      var button = el('button', 'chip' + (item.cls ? ' ' + item.cls : ''));
      button.type = 'button';
      button.textContent = item.text;
      /* A chip that names a drawing shows it. Eleven names in a row say
         nothing about which is a book and which is a pen, and the whole
         point of choosing one is what it looks like. */
      if (item.icon) button.insertAdjacentHTML('afterbegin', site.icon(item.icon, 'icon-inline'));
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', function () {
        var next = clearable && button.getAttribute('aria-pressed') === 'true' ? '' : item.value;
        select(next);
        onPick(next);
      });
      buttons.push({ button: button, value: item.value });
      box.appendChild(button);
    });

    select(value);
    box.select = select;
    return box;
  }

  /* Every kind already used in the library, so the buttons offer the
     author's own vocabulary rather than a list guessed here. */
  function kindsInUse() {
    var seen = {};
    var out = [];
    eachRecord(function (record) {
      if (record.kind && !seen[record.kind]) {
        seen[record.kind] = true;
        out.push(record.kind);
      }
    });
    return out;
  }

  /* Tags as pills, each with its own ×, and a box that takes one at a
     time. Enter or a comma commits it; backspace in an empty box takes
     the last one back, which is what every tag field anyone has used
     does. */
  function tagBox(record) {
    var box = el('div', 'tag-box');
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-input';
    input.placeholder = 'add a tag';
    /* The group's aria-labelledby names the box as a whole — "Tags" — not
       this input specifically, so the input still needs a name of its own
       to announce what typing into it does. */
    input.setAttribute('aria-label', 'Add a tag');

    function draw() {
      Array.prototype.slice.call(box.querySelectorAll('.tag-pill')).forEach(function (node) {
        box.removeChild(node);
      });
      (record.tags || []).forEach(function (tag, index) {
        /* An English tag in Nastaliq is unreadable, so each pill takes the
           script it is written in — the same test the site itself uses. */
        var pill = el('span', 'tag-pill' + (/[؀-ۿݐ-ݿ]/.test(tag) ? ' urdu' : ''));
        pill.appendChild(document.createTextNode(tag));
        var kill = el('button', 'tag-kill', '×');
        kill.type = 'button';
        kill.title = 'Remove ' + tag;
        kill.setAttribute('aria-label', 'Remove ' + tag);
        kill.addEventListener('click', function () {
          record.tags.splice(index, 1);
          if (!record.tags.length) record.tags = undefined;
          draw();
          markDirty();
        });
        pill.appendChild(kill);
        box.insertBefore(pill, input);
      });
    }

    function commit() {
      var value = input.value.trim().replace(/[,،]+$/, '').trim();
      if (!value) { input.value = ''; return; }
      if (!record.tags) record.tags = [];
      if (record.tags.indexOf(value) === -1) record.tags.push(value);
      input.value = '';
      draw();
      markDirty();
    }

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ',' || event.key === '،') {
        event.preventDefault();
        commit();
        return;
      }
      if (event.key === 'Backspace' && !input.value && (record.tags || []).length) {
        record.tags.pop();
        if (!record.tags.length) record.tags = undefined;
        draw();
        markDirty();
      }
    });
    /* Clicking away should not throw away what was typed. */
    input.addEventListener('blur', commit);

    box.appendChild(input);
    draw();

    /* The one way in besides typing: a suggestion accepted whole, still
       just a pill with the same × as one typed by hand. */
    box.addTags = function (list) {
      list.forEach(function (tag) {
        if (!record.tags) record.tags = [];
        if (record.tags.indexOf(tag) === -1) record.tags.push(tag);
      });
      draw();
      markDirty();
    };
    return box;
  }

  /* ---- Posts ----

     A post is a page of writing rather than a record of a file, so its
     words live in its own HTML file and not in content.js. The editor
     holds them here while you work, keyed by id. */

  var POSTS_CATEGORY = 'posts';
  var bodies = {};

  /* The homepage as it currently stands, read back so a publish can write
     its own blocks into it and leave every other line exactly as it is.
     The same reason a post's writing is read back before it is edited:
     the file is the store, and the editor may only rewrite the parts it
     owns.

     Over file:// there is nothing to fetch. That is not a fault of the
     page, but it does mean the homepage cannot be published from there,
     and problems() says so rather than letting an edit to the author's
     introduction quietly go nowhere. */
  var indexHtml = null;
  var indexTrouble = '';

  function loadIndex() {
    return fetch('index.html', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.text();
      })
      .then(function (html) { indexHtml = html; indexTrouble = ''; })
      .catch(function () {
        indexHtml = null;
        indexTrouble = 'index.html could not be read, so nothing on the homepage — the ' +
          'introduction, the hero, the contact lines — can be published from here. ' +
          'Open this editor over http rather than from a file.';
      });
  }

  /* ---- The writing box ------------------------------------------------

     What the author sees is the piece, set the way the page will set it:
     Nastaliq in Nastaliq, a heading at heading size, a quotation indented
     from the reading edge. Not a box of `## ` and `[ur] ` marks with the
     result somewhere else, which is what this was, and which asked
     someone who does not write code to hold the page in their head.

     It is the same model underneath. The box is a `contenteditable`
     whose children are exactly the blocks a post page is made of — `p`,
     `h2`, `blockquote`, carrying the same `urdu`/`arabic`/`latin` and
     `align-*` classes — so the two functions that already existed do the
     reading and the writing: `bodyToHtml` fills it, `htmlToBody` reads it
     back out. Nothing can be expressed in here that the file cannot
     hold, which is why opening a post and publishing it untouched still
     gives back the same bytes.

     There was deliberately no Bold for a long time, for a good reason:
     the format had nowhere to keep it, so the button would have set
     something on screen that the file dropped without saying so. What
     the format grew was somewhere to keep it — see "Marks inside a
     line" below — and the four buttons in the Emphasis group act on the
     words picked out rather than on the block. Ctrl+B, I and U do the
     same thing now instead of explaining why they cannot. */

  var TOOL_GROUPS = [
    { field: 'kind', label: 'Style', menu: true, items: [
      { value: 'p', text: 'Text', title: 'Ordinary paragraph' },
      /* "Heading" and "Sub-heading" rather than "Heading 1" and
         "Heading 2". Numbered, nothing said that the first has to come
         before the second, and two pieces were written using only
         Heading 2 — which publishes a page that jumps from its title
         straight to a third-level heading, so a reader listening to it
         hears a level missing. A sub-heading is plainly something that
         sits under a heading; a Heading 2 is just a smaller one. */
      { value: 'h2', text: 'Heading', title: 'A section heading inside the piece', cls: 'is-heading' },
      { value: 'h3', text: 'Sub-heading', title: 'A heading under a Heading — use one of those first', cls: 'is-heading' },
      { value: 'blockquote', text: 'Quote', title: 'A quotation, set apart', cls: 'is-quote' },
      { value: 'footnote', text: 'Footnote', title: 'A citation or footnote, set apart from the body', cls: 'is-footnote' }
    ] },
    { field: 'language', label: 'Script', menu: true, items: [
      { value: 'ur', text: 'اردو', title: 'Set this block in Urdu — Nastaleeq', cls: 'urdu' },
      { value: 'ar', text: 'عربی', title: 'Set this block in Arabic — Naskh', cls: 'arabic' },
      { value: 'en', text: 'English', title: 'Set this block in English' }
    ] },
    /* These four act on the words picked out, not on the whole line, so
       they are a different kind of button from the three groups around
       them — `inline: true` is what tells the toolbar to leave the block
       alone and work on the selection. Size is two steps rather than a
       number of pixels: a word set larger stays in proportion whether the
       line is Nastaliq, Naskh or English, which a chosen pixel size
       cannot be in all three at once. */
    { field: 'mark', label: 'Emphasis', inline: true, items: [
      { value: 'b', text: 'B', title: 'Bold the words picked out', cls: 'is-bold' },
      { value: 'i', text: 'I', title: 'Italicise the words picked out', cls: 'is-italic' },
      { value: 'u', text: 'U', title: 'Underline the words picked out', cls: 'is-underline' }
    ] },
    /* Size gets a menu rather than two buttons, because a menu can show
       what the line already is and offer the way back to it. Two toggles
       could say "smaller" and "larger" but never "neither", which is the
       state most words are in. */
    { field: 'mark', label: 'Size', inline: true, menu: true, items: [
      { value: '', text: 'Normal size', title: 'The size the line is set in' },
      { value: 's', text: 'One step smaller', title: 'Set the words picked out a step smaller', cls: 'is-smaller' },
      { value: 'l', text: 'One step larger', title: 'Set the words picked out a step larger', cls: 'is-bigger' }
    ] },
    { field: 'align', label: 'Align', items: [
      { value: 'r', icon: 'r', title: 'Align this block to the right', cls: 'is-align' },
      { value: 'c', icon: 'c', title: 'Centre this block', cls: 'is-align' },
      { value: 'l', icon: 'l', title: 'Align this block to the left', cls: 'is-align' },
      { value: 'j', icon: 'j', title: 'Justify this block — both edges straight', cls: 'is-align' }
    ] }
  ];

  /* Four lines of text, ragged on whichever side is not being aligned to.
     Drawn rather than lettered: there is no character that means "centred"
     and a word for each would need reading, in a language that is not
     necessarily the one being typed. Every word processor draws these,
     which is the point — they are already known. */
  var ALIGN_LINES = {
    l: [14, 9, 14, 9],
    r: [14, 9, 14, 9],
    c: [14, 9, 14, 9],
    j: [14, 14, 14, 14]
  };

  function alignIcon(kind) {
    var rows = ALIGN_LINES[kind].map(function (width, index) {
      var x = kind === 'r' ? 15 - width : kind === 'c' ? (16 - width) / 2 : 1;
      return '<rect x="' + x + '" y="' + (1 + index * 3) + '" width="' + width +
        '" height="1.6" rx="0.8" />';
    });
    return '<svg viewBox="0 0 16 12.6" width="17" height="13" aria-hidden="true" focusable="false" fill="currentColor">' +
      rows.join('') + '</svg>';
  }

  /* A footnote is a paragraph — a citation reads as prose, just set
     apart from the body around it — so it shares p's tag and is told
     apart by the 'footnote' class makeBlock and htmlToBody both check
     for below, the same way a block's script or alignment already is. */
  var BLOCK_TAG = { p: 'p', h2: 'h2', h3: 'h3', blockquote: 'blockquote', footnote: 'p' };

  /* The block the caret is in: the direct child of the box that contains
     it. Anything deeper is inside one of them. */
  function caretBlock(canvas) {
    var selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    var node = selection.getRangeAt(0).startContainer;
    if (!canvas.contains(node)) return null;
    while (node && node.parentNode !== canvas) node = node.parentNode;
    return node && node.nodeType === 1 ? node : null;
  }

  /* What one block already is, read off the element — the same three
     things the marks in the file record. */
  function blockState(node) {
    var state = { kind: 'p', language: '', align: '' };
    if (!node) return state;
    if (node.tagName === 'H2') state.kind = 'h2';
    else if (node.tagName === 'H3') state.kind = 'h3';
    else if (node.tagName === 'BLOCKQUOTE') state.kind = 'blockquote';
    else if (node.classList.contains('footnote')) state.kind = 'footnote';
    else state.kind = 'p';
    Object.keys(SCRIPTS).forEach(function (key) {
      if (node.classList.contains(SCRIPTS[key].cls)) state.language = key;
    });
    Object.keys(ALIGN).forEach(function (key) {
      if (node.classList.contains('align-' + ALIGN[key])) state.align = key;
    });
    return state;
  }

  /* The classes go on in the order bodyToHtml writes them — script, then
     alignment, then footnote. Nothing renders differently for it: a class
     list is a set, and CSS reads it as one. It matters because the box on
     screen and the file on disk are meant to be the same document, and
     the test that proves it compares them as text. Left disagreeing, that
     test can only be loosened to ignore the order, and a test loose
     enough to ignore this is loose enough to miss a block quietly losing
     its script. */
  function makeBlock(state, html) {
    var node = document.createElement(BLOCK_TAG[state.kind] || 'p');
    if (state.language && SCRIPTS[state.language]) {
      node.classList.add(SCRIPTS[state.language].cls);
      node.setAttribute('lang', state.language);
      node.setAttribute('dir', SCRIPTS[state.language].dir);
    }
    if (state.align && ALIGN[state.align]) node.classList.add('align-' + ALIGN[state.align]);
    if (state.kind === 'footnote') node.classList.add('footnote');
    if (html != null) node.innerHTML = html;
    fillEmpty(node);
    return node;
  }

  /* An empty block needs a `br` inside it or it has no height, and a block
     with no height cannot hold a caret — the browser quietly moves it to
     the end of the block above instead. That is what made Enter appear to
     do nothing: the split happened, and everything typed afterwards went
     on the end of the paragraph that had just been split.

     An empty text node counts as a child but draws nothing, so it defeats
     a plain `firstChild` test. `extractContents` leaves them behind all
     the time, which is why this has to clear them first. */
  function fillEmpty(node) {
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3 && !child.textContent) node.removeChild(child);
    });
    if (!node.firstChild) node.appendChild(document.createElement('br'));
  }

  /* Replacing an element throws the caret away, so its place is measured
     in characters before and put back after. Counting characters rather
     than remembering the node survives the element being a different
     element afterwards, which is the whole point of the operation. */
  function caretOffset(block) {
    var selection = window.getSelection();
    if (!selection || !selection.rangeCount) return 0;
    var range = selection.getRangeAt(0);
    var measure = document.createRange();
    measure.selectNodeContents(block);
    try { measure.setEnd(range.endContainer, range.endOffset); } catch (error) { return 0; }
    return measure.toString().length;
  }

  function putCaret(block, offset) {
    var walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null);
    var seen = 0;
    var node;
    var range = document.createRange();
    while ((node = walker.nextNode())) {
      if (seen + node.length >= offset) {
        range.setStart(node, Math.max(0, offset - seen));
        range.collapse(true);
        select(range);
        return;
      }
      seen += node.length;
    }
    range.selectNodeContents(block);
    range.collapse(false);
    select(range);
  }

  function select(range) {
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  /* One of the three things about a block, set or taken off again,
     leaving the other two alone — a verse is a quotation and Arabic and
     centred all at once.

     Script is the one exception: Enter carries the block before's
     script onto the new one, so by the time a hand reaches for the
     Script row the block already has one — often already the one about
     to be clicked. Toggling that off, the way Quote or Centre do, would
     silently drop the block back to the piece's own base language
     instead of setting the one just clicked, which reads as the wrong
     line suddenly changing font. A click on Script always sets. */
  function setBlockField(canvas, field, value, exact) {
    var block = caretBlock(canvas) || canvas.firstElementChild;
    if (!block) return;
    var offset = caretOffset(block);
    var state = blockState(block);
    /* A menu says what it wants and means it. A button toggles, because
       pressing the one already on is how you take it off again. */
    state[field] = !exact && field !== 'language' && state[field] === value
      ? (field === 'kind' ? 'p' : '')
      : value;
    var next = makeBlock(state, block.innerHTML);
    /* A Script press settles the language for good. Any other button
       leaves the guess standing, since making a line a Quote says
       nothing about which language it is in. */
    if (field !== 'language' && guessed.has(block)) guessed.add(next);
    block.parentNode.replaceChild(next, block);
    canvas.focus();
    putCaret(next, offset);
  }

  /* Which blocks hold a script they were handed rather than one anybody
     chose. A set rather than an attribute on the element: this is the
     state of an edit in progress, not part of the piece, and an
     attribute would have ridden along into the box's HTML — where the
     test that compares what was written with what is read back would
     see a difference that is not in either file. */
  var guessed = new WeakSet();

  /* A block made by Enter carries the script of the line above it, and
     that is a guess. Both Urdu pieces here end in an English citation,
     so the line after one starts marked English and set left to right —
     and Urdu typed into it came out in DM Sans with the space bar
     appearing to walk the caret backwards, because a space typed at the
     end of right-to-left words inside a left-to-right block belongs on
     the other side of them. Nothing on screen said why: an empty block
     shows no sign of the language it is holding.

     So while the script is still a guess, the words decide it — the
     first Urdu letter turns the line round, mid-sentence, with the caret
     kept where it was. Pressing a Script button settles the matter and
     this stops interfering. A block read in from a file is never a
     guess: what it was marked as was meant. */
  function adoptScript(canvas, prefer) {
    var block = caretBlock(canvas);
    if (!block || !guessed.has(block)) return false;
    var state = blockState(block);
    var found = scriptOf(block.textContent, prefer);
    /* Only ever into Urdu or Arabic, never into English. An English term
       inside an Urdu sentence — AAOIFI, a book title, a web address — is
       a term, not a change of language, and turning the line round at the
       first Latin letter and back again at the next Urdu one would make
       the direction flicker while someone is still typing the sentence.
       Writing a line that really is English is a decision, and there is a
       button for it. */
    if (found !== 'ur' && found !== 'ar') return false;
    if (found === state.language) return false;
    var offset = caretOffset(block);
    state.language = found;
    var next = makeBlock(state, block.innerHTML);
    guessed.add(next);
    block.parentNode.replaceChild(next, block);
    canvas.focus();
    putCaret(next, offset);
    return true;
  }

  /* Enter. Left to the browser this copies the element it was pressed in,
     so Enter at the end of a heading gives a second heading — which is
     never what was meant, and is what every word processor learnt not to
     do. The split is done here instead: what follows the caret moves into
     a new block, and that block is ordinary text unless a quotation or a
     footnote was being written, where carrying on as the same kind is the
     likelier want — a citation is rarely alone. Script and alignment
     carry over either way. */
  function splitBlock(canvas) {
    var block = caretBlock(canvas);
    if (!block) return false;
    var selection = window.getSelection();
    if (!selection.rangeCount) return false;
    var range = selection.getRangeAt(0);

    var tail = document.createRange();
    tail.selectNodeContents(block);
    try { tail.setStart(range.endContainer, range.endOffset); } catch (error) { return false; }
    var moved = tail.extractContents();

    var state = blockState(block);
    var next = makeBlock({
      kind: (state.kind === 'blockquote' || state.kind === 'footnote') ? state.kind : 'p',
      language: state.language,
      align: state.align
    }, null);
    /* Whatever script this block has, it came from the line above rather
       than from anyone deciding. Saying so is what lets the first words
       typed here change it. */
    guessed.add(next);
    next.textContent = '';
    next.appendChild(moved);
    fillEmpty(next);
    fillEmpty(block);

    block.parentNode.insertBefore(next, block.nextSibling);
    putCaret(next, 0);
    return true;
  }

  /* Anything the browser leaves behind that is not one of the three
     blocks — a bare `div` from a paste, loose text after a delete —
     becomes a paragraph. Run after every change, so the box can never
     hold a shape the file has no way to record. */
  function tidy(canvas) {
    var children = Array.prototype.slice.call(canvas.childNodes);
    children.forEach(function (node) {
      if (node.nodeType === 1 && BLOCK_TAG[node.tagName.toLowerCase()]) return;
      if (node.nodeType === 3 && !node.textContent.trim()) {
        canvas.removeChild(node);
        return;
      }
      var replacement = makeBlock(blockState(node.nodeType === 1 ? node : null), null);
      replacement.textContent = '';
      if (node.nodeType === 1) {
        while (node.firstChild) replacement.appendChild(node.firstChild);
      } else {
        replacement.appendChild(document.createTextNode(node.textContent));
      }
      fillEmpty(replacement);
      canvas.replaceChild(replacement, node);
    });
    if (!canvas.firstElementChild) canvas.appendChild(makeBlock({ kind: 'p' }, null));
  }

  /* Pasted text arrives as whatever the other program wrote — Word's
     markup, a WhatsApp message, a web page. Most of that can't be kept,
     but WhatsApp's own marks say something real about shape: a line that
     is nothing but *this* is meant to stand out, the way a heading does;
     one that is nothing but _this_, or every line of it starting with
     '>', is a quotation set apart. Both become the block that already
     means that here, rather than punctuation nobody asked to see in the
     finished piece. Anything else is a paragraph with the marks removed,
     since the format still has nowhere to put mid-sentence emphasis. */
  function stripInlineMarks(text) {
    return text
      .replace(/```([^`]*)```/g, '$1')
      .replace(/`([^`\n]+)`/g, '$1')
      .replace(/\*([^*\n]+)\*/g, '$1')
      .replace(/_([^_\n]+)_/g, '$1')
      .replace(/~([^~\n]+)~/g, '$1');
  }

  var QUOTE_PREFIX = /^>\s?/;

  function parseWhatsAppChunk(raw) {
    var lines = String(raw || '').split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
    var joined = lines.join(' ');

    var wholeBold = /^\*([^*]+)\*$/.exec(joined);
    if (wholeBold) return { kind: 'h2', text: wholeBold[1].trim() };

    var wholeItalic = /^_([^_]+)_$/.exec(joined);
    if (wholeItalic) return { kind: 'blockquote', text: wholeItalic[1].trim() };

    if (lines.length && lines.every(function (line) { return QUOTE_PREFIX.test(line); })) {
      return {
        kind: 'blockquote',
        text: lines.map(function (line) { return line.replace(QUOTE_PREFIX, ''); }).join(' ').trim()
      };
    }

    return { kind: 'p', text: stripInlineMarks(joined).replace(/\s+/g, ' ').trim() };
  }

  /* Which script some pasted text is in, so a paste can mark its own
     blocks rather than take on whatever the caret happened to be sitting
     in. That inheritance is what made pasting an article go in
     backwards: at the end of a piece whose last line is an English
     citation, Enter carries "English" onto the new block, and an Urdu
     article pasted there arrived inside a block marked English and set
     left to right. The words rendered in DM Sans, right to left reading
     broke, and the space bar appeared to walk the caret backwards —
     with nothing on screen saying why, because the block looked empty
     when it was marked.

     Urdu is told from Arabic by the letters Urdu added and Arabic does
     not use — ٹ ڈ ڑ ں ھ ہ ے ژ گ چ پ. A Qur'anic verse has none of them
     and stays Arabic, which is what a verse quoted inside an Urdu piece
     needs. Counting, not detecting: a line is whichever script most of
     its letters belong to, so an Urdu sentence with one English term in
     it stays Urdu. */
  var ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

  /* The two alphabets overlap almost entirely, so telling them apart is
     done on the letters where they differ — and the decisive pair is the
     commonest letters in both. Urdu writes ی and ک where Arabic writes
     ي and ك; they look nearly the same and are different characters.
     Leaving those two out was enough to call "ایک دو تین" Arabic and set
     three ordinary Urdu words in Amiri.

     Counted rather than tested for, since a piece of Urdu quoting Arabic
     has some of both and should come out as whichever it mostly is. */
  var URDU_LETTERS = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06A9\u06AF\u06BA\u06BE\u06C1\u06C2\u06C3\u06CC\u06D2\u06D3]/g;
  var ARABIC_LETTERS = /[\u0623\u0625\u0629\u0643\u064A]/g;

  function scriptOf(text, prefer) {
    var body = String(text || '');
    var rtl = (body.match(ARABIC_SCRIPT) || []).length;
    var latin = (body.match(/[A-Za-z]/g) || []).length;
    if (!rtl && !latin) return '';
    if (rtl < latin) return 'en';
    var urdu = (body.match(URDU_LETTERS) || []).length;
    var arabic = (body.match(ARABIC_LETTERS) || []).length;
    if (urdu > arabic) return 'ur';
    if (arabic > urdu) return 'ar';
    /* Neither said anything — a line of ا, د, و and the like belongs to
       both. The piece's own language is the best answer available. */
    return prefer === 'ar' ? 'ar' : 'ur';
  }

  function pastePlain(canvas, text, prefer) {
    var chunks = String(text || '')
      .split(/\n\s*\n/)
      .map(parseWhatsAppChunk)
      .filter(function (chunk) { return chunk.text; });
    if (!chunks.length) return;

    var block = caretBlock(canvas) || canvas.firstElementChild;
    if (!block) return;
    var state = blockState(block);

    /* A single ordinary phrase — the common case of pasting a few words
       mid-sentence — splices into the block the caret is already in and
       leaves its kind, script and alignment untouched. Anything with
       structure of its own (a detected heading or quote, or more than
       one paragraph) replaces that block instead, the way starting a new
       piece over a single empty line would. */
    /* Only when there are already words here to splice into. Dropping a
       line into an empty block goes the other way instead, so the block
       can be marked with the script that arrived rather than keep one
       it was handed by the line above. */
    if (chunks.length === 1 && chunks[0].kind === 'p' && block.textContent.trim()) {
      var selection = window.getSelection();
      if (!selection.rangeCount) return;
      var range = selection.getRangeAt(0);
      range.deleteContents();
      var head = document.createTextNode(chunks[0].text);
      range.insertNode(head);
      range.setStartAfter(head);
      range.collapse(true);
      select(range);
      return;
    }

    /* Each block takes the script of its own words. A pasted article
       that turns from Urdu to an Arabic verse and back marks all three
       correctly without anyone pressing a button; a line with no letters
       either way — a row of numbers, a rule — keeps the script of the
       block it replaced. */
    var first = makeBlock({ kind: chunks[0].kind, language: scriptOf(chunks[0].text, prefer) || state.language, align: state.align }, null);
    first.textContent = chunks[0].text;
    block.parentNode.replaceChild(first, block);

    var after = first;
    chunks.slice(1).forEach(function (chunk) {
      var next = makeBlock({ kind: chunk.kind, language: scriptOf(chunk.text, prefer) || state.language, align: state.align }, null);
      next.textContent = chunk.text;
      after.parentNode.insertBefore(next, after.nextSibling);
      after = next;
    });
    putCaret(after, after.textContent.length);
  }

  /* ---- First guesses from a paste ---------------------------------

     Not analysis — a frequency count and a length limit, the same kind
     of thing a person would do by eye on a short piece. Wrong less often
     than empty, and a wrong tag costs one click to remove, the same as
     one that was never suggested — which is the whole point of guessing
     out loud instead of asking an AI to guess quietly. */

  function truncateWords(text, limit) {
    if (text.length <= limit) return text;
    var cut = text.slice(0, limit);
    var lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > limit * 0.6) cut = cut.slice(0, lastSpace);
    return cut.replace(/[,;:—-]+$/, '').trim() + '…';
  }

  /* The first paragraph that isn't a heading or a quote — what a reader
     coming in from a search result would see first. */
  function firstPlainParagraph(text) {
    var chunks = String(text || '').split(/\n\s*\n/).map(parseWhatsAppChunk).filter(function (c) { return c.text; });
    var plain = chunks.filter(function (c) { return c.kind === 'p'; })[0];
    return (plain || chunks[0] || { text: '' }).text;
  }

  function suggestDescription(pastedText) {
    return truncateWords(firstPlainParagraph(pastedText), 160);
  }

  var STOP_EN = ['the', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'in', 'on', 'at', 'for',
    'with', 'from', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its', 'this',
    'that', 'these', 'those', 'as', 'not', 'no', 'so', 'than', 'then', 'too', 'very', 'can',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'do', 'does', 'did',
    'has', 'have', 'had', 'i', 'you', 'he', 'she', 'we', 'they', 'them', 'his', 'her', 'their',
    'our', 'your', 'my', 'me', 'us', 'which', 'who', 'whom', 'what', 'when', 'where', 'why',
    'how', 'all', 'each', 'other', 'some', 'such', 'only', 'own', 'same', 'because', 'about',
    'into', 'over', 'after', 'before', 'between', 'through', 'during', 'without', 'within',
    'under', 'again', 'once', 'there', 'here', 'more', 'most', 'also'];
  var STOP_UR = ['کے', 'کی', 'کا', 'کو', 'میں', 'سے', 'پر', 'ہے', 'ہیں', 'تھا', 'تھی', 'تھے',
    'اور', 'یا', 'اگر', 'بھی', 'نہیں', 'تو', 'یہ', 'وہ', 'ان', 'اس', 'ایک', 'کچھ', 'جو', 'جس',
    'کہ', 'لیے', 'لئے', 'بعد', 'پہلے', 'ساتھ', 'اپنے', 'اپنی', 'اپنا', 'گیا', 'گئی', 'گئے', 'ہو',
    'ہوں', 'ہوا', 'ہوئی', 'ہوئے', 'کر', 'کرتے', 'کرتا', 'کرتی'];
  var STOP_AR = ['في', 'من', 'إلى', 'على', 'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي',
    'الذين', 'هو', 'هي', 'هم', 'كان', 'كانت', 'لا', 'ما', 'إن', 'أن', 'ثم', 'أو', 'و', 'بل',
    'قد', 'لم', 'لن', 'كل', 'بعض', 'غير', 'عند', 'بين', 'قبل', 'بعد'];
  var TAG_STOP = {};
  STOP_EN.concat(STOP_UR, STOP_AR).forEach(function (word) { TAG_STOP[word] = true; });

  /* Whatever repeats is more likely to be what the piece is about than
     whatever appears once — a word seen only once could be anything.
     Arabic-range script gets a shorter minimum length since its words
     run shorter than Latin ones. */
  function suggestTags(pastedText) {
    var counts = {};
    var order = [];
    var display = {};
    var words = stripInlineMarks(String(pastedText || '')).match(/[\p{L}\p{M}]+/gu) || [];
    words.forEach(function (word) {
      var key = word.toLowerCase();
      var minLen = /[؀-ۿ]/.test(word) ? 2 : 3;
      if (word.length < minLen || TAG_STOP[key]) return;
      if (!counts[key]) { counts[key] = 0; order.push(key); display[key] = word; }
      counts[key]++;
    });

    return order
      .filter(function (key) { return counts[key] > 1; })
      .sort(function (a, b) { return counts[b] - counts[a] || order.indexOf(a) - order.indexOf(b); })
      .slice(0, 5)
      .map(function (key) { return display[key]; });
  }

  /* The box, its buttons, and the two ways in and out of it. `onPaste`,
     if given, is told the raw text of a real paste — not every
     keystroke — so the fields outside the box (description, tags) can
     take a first guess at themselves without another trip through the
     text. */
  function writingBox(record, onChange, onPaste) {
    var wrap = el('div', 'writing');
    var bar = el('div', 'writing-tools');
    var buttons = [];
    var menus = [];

    var canvas = el('div', 'writing-canvas post-body');
    canvas.contentEditable = 'true';
    canvas.spellcheck = false;
    canvas.setAttribute('role', 'textbox');
    canvas.setAttribute('aria-multiline', 'true');
    canvas.setAttribute('aria-label', 'The writing');

    TOOL_GROUPS.forEach(function (group) {
      var box = el('div', 'writing-group');
      var name = el('span', 'writing-group-label');
      name.textContent = group.label;
      box.appendChild(name);

      /* A menu, where the choice is one of several and the current one is
         worth reading back — the block's style, its script, the size of
         the words picked out. A native select rather than a drawn one: it
         opens as the phone's own picker, takes the keyboard for free, and
         there is no popup here to get wrong. Buttons stay buttons where
         the answer is on or off and wanted in one press. */
      if (group.menu) {
        var menu = el('select', 'writing-menu' + (group.inline ? ' is-inline' : ''));
        menu.setAttribute('aria-label', group.label);
        group.items.forEach(function (item) {
          var choice = document.createElement('option');
          choice.value = item.value;
          choice.textContent = item.text;
          choice.title = item.title;
          if (item.cls) choice.className = item.cls;
          menu.appendChild(choice);
        });
        menu.addEventListener('change', function () {
          if (group.inline) markSelection(canvas, menu.value, true);
          else setBlockField(canvas, group.field, menu.value, true);
          changed();
          refresh();
        });
        menus.push({ menu: menu, field: group.field, inline: !!group.inline,
                     values: group.items.map(function (item) { return item.value; }) });
        box.appendChild(menu);
        bar.appendChild(box);
        return;
      }

      var row = el('div', 'writing-group-buttons');
      group.items.forEach(function (item) {
        var button = el('button', 'writing-tool' + (item.cls ? ' ' + item.cls : ''));
        button.type = 'button';
        if (item.icon) button.innerHTML = alignIcon(item.icon);
        else button.textContent = item.text;
        button.title = item.title;
        button.setAttribute('aria-label', item.title);
        button.setAttribute('aria-pressed', 'false');
        /* mousedown, not click: by the time click fires the box has lost
           the selection to the button, and there is no block to act on. */
        button.addEventListener('mousedown', function (event) {
          event.preventDefault();
          if (group.inline) markSelection(canvas, item.value);
          else setBlockField(canvas, group.field, item.value);
          changed();
          refresh();
        });
        buttons.push({ button: button, field: group.field, value: item.value, inline: !!group.inline });
        row.appendChild(button);
      });
      box.appendChild(row);
      bar.appendChild(box);
    });

    function changed() {
      tidy(canvas);
      bodies[record.id] = htmlToBody(canvas);
      onChange();
    }

    function refresh() {
      var state = blockState(caretBlock(canvas));
      var marks = marksAtCaret(canvas);
      buttons.forEach(function (entry) {
        var on = entry.inline ? marks.indexOf(entry.value) !== -1
                              : state[entry.field] === entry.value;
        entry.button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      /* Each menu shows what the caret is actually sitting in, so it can
         be read as well as used. */
      menus.forEach(function (entry) {
        var now = entry.inline
          ? (marks.indexOf('s') !== -1 ? 's' : marks.indexOf('l') !== -1 ? 'l' : '')
          : state[entry.field];
        entry.menu.value = entry.values.indexOf(now) === -1 ? entry.values[0] : now;
      });
    }

    canvas.addEventListener('input', function () {
      if (adoptScript(canvas, record.language)) refresh();
      changed();
    });
    canvas.addEventListener('keyup', refresh);
    canvas.addEventListener('mouseup', refresh);
    canvas.addEventListener('focus', refresh);

    canvas.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        if (splitBlock(canvas)) {
          event.preventDefault();
          changed();
          refresh();
        }
        return;
      }
      /* These used to say the format could not record them. It can now. */
      if ((event.ctrlKey || event.metaKey) && /^[biu]$/i.test(event.key)) {
        event.preventDefault();
        markSelection(canvas, event.key.toLowerCase());
        changed();
        refresh();
      }
    });

    canvas.addEventListener('paste', function (event) {
      event.preventDefault();
      var data = event.clipboardData || window.clipboardData;
      var text = data ? data.getData('text/plain') : '';
      pastePlain(canvas, text, record.language);
      changed();
      refresh();
      if (onPaste && text) onPaste(text);
    });

    var note = el('p', 'writing-note');

    wrap.appendChild(bar);
    wrap.appendChild(canvas);
    wrap.appendChild(note);

    return {
      node: wrap,
      note: note,
      /* The base script of the box, so an Urdu post is typed in Nastaliq
         without every block having to say so. Blocks that carry their own
         mark keep it. */
      setLanguage: function (language) {
        canvas.classList.remove('urdu', 'arabic', 'latin');
        canvas.classList.add(site.scriptClass(language));
        canvas.setAttribute('dir', site.direction(language));
        canvas.setAttribute('lang', language || 'en');
      },
      setText: function (text) {
        canvas.innerHTML = bodyToHtml(text, 0);
        tidy(canvas);
      },
      focus: function () { canvas.focus(); }
    };
  }

  function isPost(entry) {
    /* An app has a page of its own too, and is not a post: its page is
       built from fields, so there is no writing to read back and nothing
       to lose by regenerating it. */
    if (entry.record.app) return false;
    return !!(entry.record.page || (entry.category && entry.category.id === POSTS_CATEGORY));
  }

  /* ---- Applying a mark to what is picked out -------------------------

     execCommand is the old way and is deprecated, and it is still the
     only thing that will put a tag around a selection that starts in one
     element and ends in another without a great deal of code to get
     wrong. styleWithCSS off, so it writes <b> rather than a span with a
     style attribute — the file keeps tags, not inline CSS, and a policy
     that forbids inline styles later will not silently strip the marks.

     The two sizes have no command of their own, so they are wrapped by
     hand. Pressing the same size again takes it off, which is the only
     way back to the line's own size. */
  function markSelection(canvas, code, exact) {
    var selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    if (!canvas.contains(selection.getRangeAt(0).commonAncestorContainer)) return;
    canvas.focus();

    /* "Normal size" — take off whichever step is on, and leave the words
       at whatever the line itself is set in. */
    if (exact && !code) {
      var off = enclosing(canvas, 'text-small') || enclosing(canvas, 'text-large');
      if (off) unwrap(off);
      return;
    }
    if (code === 'b' || code === 'i' || code === 'u') {
      try { document.execCommand('styleWithCSS', false, false); } catch (error) { /* older browsers */ }
      document.execCommand({ b: 'bold', i: 'italic', u: 'underline' }[code]);
      return;
    }

    var className = code === 's' ? 'text-small' : 'text-large';
    var inside = enclosing(canvas, className);
    if (inside) { if (exact) return; unwrap(inside); return; }
    /* Picking one step while the other is on swaps them, rather than
       wrapping a smaller span inside a larger one. */
    var other = enclosing(canvas, code === 's' ? 'text-large' : 'text-small');
    if (other) unwrap(other);
    if (selection.isCollapsed) return;
    var range = selection.getRangeAt(0);
    var span = document.createElement('span');
    span.className = className;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    } catch (error) { return; }
    var after = document.createRange();
    after.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(after);
  }

  /* The nearest span of this kind around the caret, if the caret is in
     one — so pressing the same size again knows what to undo. */
  function enclosing(canvas, className) {
    var selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    var node = selection.getRangeAt(0).commonAncestorContainer;
    while (node && node !== canvas) {
      if (node.nodeType === 1 && node.classList.contains(className)) return node;
      node = node.parentNode;
    }
    return null;
  }

  function unwrap(node) {
    var parent = node.parentNode;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    parent.removeChild(node);
  }

  /* Which marks the caret is sitting inside, so the buttons can show it. */
  function marksAtCaret(canvas) {
    var selection = window.getSelection();
    if (!selection || !selection.rangeCount) return [];
    var node = selection.getRangeAt(0).commonAncestorContainer;
    var found = [];
    while (node && node !== canvas) {
      if (node.nodeType === 1) {
        var code = inlineCode(node);
        if (code && found.indexOf(code) === -1) found.push(code);
      }
      node = node.parentNode;
    }
    return found;
  }

  /* ---- Marks inside a line ------------------------------------------

     Until now a block was plain text: a whole line was a heading or a
     quotation or nothing, and nothing smaller could be said. Bold,
     italic, underline and a size for a few words inside a sentence need
     somewhere to live.

     They live in the page itself — a post's own HTML file is the store,
     and <b>, <i>, <u> and a span are what it holds. Between reading that
     file and writing it again the text passes through `bodies`, which is
     memory and never a file, so the marks can be carried there by two
     characters that no keyboard produces: \u0002 opens a run and names
     it with one letter, \u0003 closes it. Nothing has to be escaped,
     because nothing anyone can type collides with them.

     Sizes are steps rather than numbers — one below the line's own size
     and one above, in ems, so a word set larger stays in proportion
     whether the line around it is Nastaliq at 21px or English at 15. A
     number of pixels chosen by hand would be right in one script and
     wrong in the other two. */
  var OPEN = '\u0002';
  var CLOSE = '\u0003';
  var INLINE = {
    b: { open: '<b>', close: '</b>' },
    i: { open: '<i>', close: '</i>' },
    u: { open: '<u>', close: '</u>' },
    s: { open: '<span class="text-small">', close: '</span>' },
    l: { open: '<span class="text-large">', close: '</span>' }
  };

  function inlineCode(el) {
    var tag = el.tagName;
    if (tag === 'B' || tag === 'STRONG') return 'b';
    if (tag === 'I' || tag === 'EM') return 'i';
    if (tag === 'U') return 'u';
    if (el.classList.contains('text-small')) return 's';
    if (el.classList.contains('text-large')) return 'l';
    return '';
  }

  /* The words of a block with its marks kept — the inside of an element
     rather than its textContent, which is what used to be taken and is
     what threw the marks away. */
  function inlineToText(node) {
    var out = '';
    Array.prototype.forEach.call(node.childNodes, function (child) {
      if (child.nodeType === 3) { out += child.textContent; return; }
      if (child.nodeType !== 1) return;
      var code = inlineCode(child);
      out += code ? OPEN + code + inlineToText(child) + CLOSE : inlineToText(child);
    });
    return out;
  }

  /* And back, escaping everything that is not a mark. A stack, so a
     phrase can be bold and larger at once; anything left open at the end
     of a line is closed rather than allowed to run on. */
  function inlineToHtml(text) {
    var body = String(text || '');
    var out = '';
    var plain = '';
    var stack = [];
    for (var i = 0; i < body.length; i += 1) {
      var ch = body.charAt(i);
      if (ch === OPEN) {
        out += site.escapeHtml(plain); plain = '';
        var mark = INLINE[body.charAt(i + 1)];
        if (mark) { out += mark.open; stack.push(mark.close); }
        i += 1;
      } else if (ch === CLOSE) {
        out += site.escapeHtml(plain); plain = '';
        if (stack.length) out += stack.pop();
      } else {
        plain += ch;
      }
    }
    out += site.escapeHtml(plain);
    while (stack.length) out += stack.pop();
    return out;
  }

  /* The same words with every mark taken out, for the search index. */
  function withoutMarks(text) {
    return String(text || '').replace(new RegExp(OPEN + '.', 'g'), '').split(CLOSE).join('');
  }

  var SCRIPT_MARK = { arabic: '[ar] ', latin: '[en] ', urdu: '[ur] ' };

  /* The page back into the plain text the box shows. */
  /* The exact inverse, so opening a post and publishing it again without
     touching anything produces the same file. */
  function htmlToBody(article) {
    var blocks = [];
    Array.prototype.forEach.call(article.children, function (node) {
      var text = inlineToText(node).trim().replace(/\s+/g, ' ');
      if (!text) return;
      var mark = '';
      ['arabic', 'latin', 'urdu'].forEach(function (name) {
        if (node.classList.contains(name)) mark += SCRIPT_MARK[name];
      });
      Object.keys(ALIGN).forEach(function (key) {
        if (node.classList.contains('align-' + ALIGN[key])) mark += '[' + key + '] ';
      });
      var lead = node.tagName === 'H3' ? '### '
        : node.tagName === 'H2' ? '## '
        : node.tagName === 'BLOCKQUOTE' ? '> '
        : node.classList.contains('footnote') ? '[fn] '
        : '';
      blocks.push(lead + mark + text);
    });
    return blocks.join('\n\n');
  }

  /* And the plain text into the page. */
  /* What a block may carry, and in what order it is written.

     A Qur'anic verse inside an Urdu piece is a quotation AND Arabic AND
     usually centred — three things about one block, so they combine
     rather than replace each other:

       > [ar] [c] ٱدْعُ إِلَىٰ سَبِيلِ رَبِّكَ

     The block kind comes first because it decides the element; the rest
     are attributes of it and may be given in any order. */
  var SCRIPTS = { ar: { cls: 'arabic', dir: 'rtl' },
                  ur: { cls: 'urdu', dir: 'rtl' },
                  en: { cls: 'latin', dir: 'ltr' } };
  var ALIGN = { l: 'left', c: 'center', r: 'right', j: 'justify' };

  function readBlock(raw) {
    var block = String(raw || '').trim();
    var kind = 'p';
    if (block.indexOf('### ') === 0) { kind = 'h3'; block = block.slice(4); }
    else if (block.indexOf('## ') === 0) { kind = 'h2'; block = block.slice(3); }
    else if (block.indexOf('> ') === 0) { kind = 'blockquote'; block = block.slice(2); }
    else if (block.indexOf('[fn] ') === 0) { kind = 'footnote'; block = block.slice(5); }

    var language = '';
    var align = '';
    var token;
    while ((token = block.match(/^\[([a-z]{1,2})\]\s*/))) {
      var key = token[1];
      if (SCRIPTS[key]) language = key;
      else if (ALIGN[key]) align = key;
      else break;
      block = block.slice(token[0].length);
    }
    return { kind: kind, language: language, align: align, text: block };
  }

  /* A post's words with every mark stripped — the same parse bodyToHtml
     uses, kept to just the text, for the search index. */
  function plainTextFromBody(text) {
    return String(text || '')
      .split(/\n\s*\n/)
      .map(function (raw) { return withoutMarks(readBlock(raw).text); })
      .filter(Boolean)
      .join(' ');
  }

  function bodyToHtml(text, indent) {
    var pad = ' '.repeat(indent);
    return String(text || '')
      .split(/\n\s*\n/)
      .filter(function (raw) { return raw.trim(); })
      .map(function (raw) {
        var b = readBlock(raw);
        var classes = [];
        var attrs = '';
        if (b.language) {
          var script = SCRIPTS[b.language];
          classes.push(script.cls);
          attrs += ' lang="' + b.language + '" dir="' + script.dir + '"';
        }
        /* Alignment is a class rather than a style attribute so the
           stylesheet keeps the say, and so a post page carries no inline
           CSS for a content-security policy to object to later. */
        if (b.align) classes.push('align-' + ALIGN[b.align]);
        /* A footnote's tag is p — BLOCK_TAG says so — so it needs the
           class that tells it apart from an ordinary paragraph, the
           same way makeBlock adds it in the live box. */
        if (b.kind === 'footnote') classes.push('footnote');
        if (classes.length) attrs = ' class="' + classes.join(' ') + '"' + attrs;
        var tag = BLOCK_TAG[b.kind] || 'p';
        return pad + '<' + tag + attrs + '>' + inlineToHtml(b.text.replace(/\s+/g, ' ')) + '</' + tag + '>';
      })
      .join('\n');
  }

  /* A whole post page. Everything a reader or a crawler needs is written
     into the file — that is the point of a post having its own page
     rather than being assembled by script. */
  function buildPost(record, entry) {
    var e = site.escapeHtml;
    var base = String((model.site && model.site.baseUrl) || '').replace(/\/+$/, '') + '/';
    var url = base + record.page;
    var author = (model.site && model.site.name) || '';
    var rtl = record.language === 'ur' || record.language === 'ar';
    /* The sentence a crawler shows under the title, and the one WhatsApp
       prints beside the card. It follows the piece the same way
       site.shareCaption already does — an Urdu article had an English
       line under its Urdu title, because this only ever read
       record.description. */
    var shared = rtl
      ? record.descriptionUr || record.description
      : record.description || record.descriptionUr;
    var scriptClass = record.language === 'ur' ? 'urdu' : record.language === 'ar' ? 'arabic' : 'latin';
    var pretty = site.formatDate(record.date);
    var categoryTitle = entry.category ? entry.category.title : 'Posts, Notes & Reflections';
    var categoryId = entry.category ? entry.category.id : POSTS_CATEGORY;

    var jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: record.title,
      inLanguage: record.language || 'en',
      description: record.description || undefined,
      datePublished: record.date || undefined,
      keywords: (record.tags || []).join(', ') || undefined,
      url: url,
      author: {
        '@type': 'Person',
        name: author,
        alternateName: (model.site && model.site.nameUr) || undefined,
        url: base
      },
      isPartOf: { '@type': 'Collection', name: categoryTitle, url: base }
    });

    return [
      '<!doctype html>',
      '<html lang="' + e(record.language || 'en') + '">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '    <title>' + e(record.title) + ' — ' + e(author) + '</title>',
      record.description ? '    <meta name="description" content="' + e(record.description) + '" />' : null,
      '    <meta name="author" content="' + e(author) + '" />',
      '    <link rel="canonical" href="' + e(url) + '" />',
      '',
      '    <meta property="og:type" content="article" />',
      '    <meta property="og:title" content="' + e(record.title) + '" />',
      shared ? '    <meta property="og:description" content="' + e(shared) + '" />' : null,
      '    <meta property="og:url" content="' + e(url) + '" />',
      /* Its own card, not the one generic image every page used to
         share — rendered alongside this file at publish time, same id. */
      '    <meta property="og:image" content="' + e(base + 'files/cards/' + record.id + '.jpg') + '" />',
      '    <meta name="twitter:card" content="summary_large_image" />',
      record.date ? '    <meta property="article:published_time" content="' + e(record.date) + '" />' : null,
      '',
      '    <link rel="icon" type="image/png" sizes="32x32" href="../files/images/logo-circle-32.png" />',
      '    <link rel="apple-touch-icon" href="../files/images/logo-circle-180.png" />',
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
      '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Noto+Nastaliq+Urdu:wght@400;500;600&display=swap" rel="stylesheet" />',
      '    <link rel="stylesheet" href="../styles.css" />',
      '    <script type="application/ld+json">' + jsonLd + '</scr' + 'ipt>',
      '  </head>',
      '',
      '  <body class="work-page">',
      '    <header class="site-header">',
      '      <a class="brand" href="../index.html"><img class="brand-mark" src="../files/images/logo-circle-180.png" alt="" width="180" height="180" /> Scholarly Works and Research</a>',
      '      <nav class="header-nav" aria-label="Sections">',
      '        <a href="../index.html#about">Author</a>',
      '        <a class="nav-echo" href="../index.html#library">Library</a>',
      '        <a class="nav-echo" href="../index.html#rulings">Fatawa</a>',
      '        <a href="../index.html#contact">Contact</a>',
      '      </nav>',
      '    </header>',
      '',
      '    <main class="work-page-main">',
      /* Without dir="rtl" here, an Urdu or Arabic post still reads right
         to left sentence by sentence — every element under it sets its
         own dir — but anything that depends on inherited direction for
         layout, not text, does not: the tag row packed its pills from
         the left instead of the right, and Share/Print stayed in their
         English order and margin instead of mirroring, because the CSS
         rules for both key off `.work-hero[dir="rtl"]` and this was the
         one piece of markup buildWork already knew to write and this
         function did not. */
      '      <article class="work-hero"' + (rtl ? ' dir="rtl"' : '') + '>',
      /* The arrow points the way back, which on an RTL page is
         rightwards — same reasoning as buildWork's own back-link. */
      '        <a class="back-link" href="../index.html#' + e(categoryId) + '"><span aria-hidden="true">' +
        (rtl ? '→' : '←') + '</span> ' + e(categoryTitle) + '</a>',
      /* Same as work.js. site.kindMarkup gives the kind in the language
         the post reads in, and the script it comes out in decides the
         font, the direction and whether align-left is needed at all. */
      record.kind
        ? '        ' + site.kindMarkup(record, 'section-label' + (rtl ? '' : ' align-left'), 'p')
        : null,
      /* record-title, not just the script class — matches site.titleMarkup,
         which builds every other title on the site and is what lets an
         Urdu title take the heading face in styles.css. */
      '        <h1 class="record-title ' + scriptClass + '" lang="' + e(record.language || 'en') + '" dir="' + (rtl ? 'rtl' : 'ltr') + '">' + e(record.title) + '</h1>',
      /* formatDate always writes the month name in English, whatever the
         post's own language — under an RTL article this paragraph would
         otherwise inherit dir="rtl" with no strong character of its own
         to anchor it, and the bidi algorithm moves the leading day number
         to the end: "3 August 2026" renders as "August 2026 3". */
      pretty ? '        <p class="work-date" dir="ltr">' + e(pretty) + '</p>' : null,
      /* Through the same helper the rest of the site uses, so a description
         written in Urdu comes out in Nastaliq here too. */
      /* No summary above the writing. On a work the description says what
         is inside the download; on a post the writing is already here, so
         printing a summary of it first only makes the reader read the
         same thing twice — which is exactly what happened when a
         description was lifted verbatim from the piece.

         The descriptions still do their work where a summary belongs: the
         card on the homepage, the meta description, the sharing tags and
         the structured data above. */
      '',
      '        <div class="post-body ' + scriptClass + '" id="post-body" lang="' + e(record.language || 'en') + '" dir="' + (rtl ? 'rtl' : 'ltr') + '">',
      bodyToHtml(bodies[record.id], 10),
      '        </div>',
      '',
      /* Through the same helper the rendered pages use, so a tag takes the
         script it is actually written in. This wrote every tag lang="ur"
         dir="rtl" whatever it held, which put an English one in Nastaliq
         running the wrong way — the bug common.js had already fixed for
         the pages it builds, still here in the one place that writes a
         file. */
      (record.tags || []).length ? '        ' + site.tagMarkup(record) : null,
      '        <p class="post-foot"><a class="text-link" href="../index.html#' + e(categoryId) + '">← All posts</a></p>',
      '      </article>',
      '    </main>',
      '',
      '    <footer>',
      '      <span>© <span id="year"></span> ' + e(author) + '</span>',
      '      <a href="../index.html">All works</a>',
      '    </footer>',
      '',
      '    <script src="../content.js"></scr' + 'ipt>',
      '    <script src="../common.js"></scr' + 'ipt>',
      '  </body>',
      '</html>',
      ''
    ]
      .filter(function (line) { return line !== null; })
      .join('\n');
  }

  /* ---- An app's own page ----------------------------------------------

     An app is a record with an `app` block on it, and it gets a page of
     its own the way a post does — `page` names the file, and everything
     that already walks the library reaches it without being told: the
     sitemap line, the share card, the category pill, the search.

     It does not get the writing box, though, and that is the whole
     reason for a shape of its own. An app page is a link, a version, a
     list of what is new and the platforms it runs on. Written as prose
     it would be an essay about an app; written as fields it is an app
     page, and the next one is a form to fill in rather than a page to
     compose. */
  function isApp(entry) {
    return !!(entry && entry.record && entry.record.app);
  }

  function buildApp(record, entry) {
    var e = site.escapeHtml;
    var app = record.app || {};
    var base = String((model.site && model.site.baseUrl) || '').replace(/\/+$/, '') + '/';
    var url = base + record.page;
    var author = (model.site && model.site.name) || '';
    var rtl = record.language === 'ur' || record.language === 'ar';
    var scriptClass = record.language === 'ur' ? 'urdu' : record.language === 'ar' ? 'arabic' : 'latin';
    /* Same rule as buildPost and shareCaption: the sentence shown to a
       reader follows the piece, not the site. */
    var shared = rtl
      ? record.descriptionUr || record.description
      : record.description || record.descriptionUr;
    var categoryTitle = entry.category ? entry.category.title : 'Apps';
    var categoryId = entry.category ? entry.category.id : 'apps';
    var pretty = site.formatDate(record.date);

    /* SoftwareApplication rather than BlogPosting: it is not an article,
       and saying so is what lets a search engine show it as a thing you
       can open rather than something to read. */
    var jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: record.title,
      inLanguage: record.language || 'en',
      description: record.description || undefined,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: (app.platforms || []).join(', ') || undefined,
      softwareVersion: app.version || undefined,
      datePublished: record.date || undefined,
      url: app.url || url,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'PKR' },
      author: {
        '@type': 'Person',
        name: author,
        alternateName: (model.site && model.site.nameUr) || undefined,
        url: base
      }
    });

    /* A line of the app's own copy, in whichever script it was written
       in — the same question langAttrs asks of a homepage line. */
    function line(text, className, tag) {
      if (!text) return null;
      var element = tag || 'p';
      var script = scriptOf(String(text), 'ur');
      var cls = [className, script === 'ur' ? 'urdu' : script === 'ar' ? 'arabic' : '']
        .filter(Boolean).join(' ');
      return '<' + element + (cls ? ' class="' + cls + '"' : '') +
        langAttrs(text) + '>' + e(text) + '</' + element + '>';
    }

    var whatsNew = (app.whatsNew || []).filter(Boolean);
    var platforms = (app.platforms || []).filter(Boolean);

    return [
      '<!doctype html>',
      '<html lang="' + e(record.language || 'en') + '">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '    <title>' + e(record.title) + ' — ' + e(author) + '</title>',
      record.description ? '    <meta name="description" content="' + e(record.description) + '" />' : null,
      '    <meta name="author" content="' + e(author) + '" />',
      '    <link rel="canonical" href="' + e(url) + '" />',
      '',
      '    <meta property="og:type" content="website" />',
      '    <meta property="og:title" content="' + e(record.title) + '" />',
      shared ? '    <meta property="og:description" content="' + e(shared) + '" />' : null,
      '    <meta property="og:url" content="' + e(url) + '" />',
      '    <meta property="og:image" content="' + e(base + 'files/cards/' + record.id + '.jpg') + '" />',
      '    <meta name="twitter:card" content="summary_large_image" />',
      '',
      '    <link rel="icon" type="image/png" sizes="32x32" href="../files/images/logo-circle-32.png" />',
      '    <link rel="apple-touch-icon" href="../files/images/logo-circle-180.png" />',
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
      '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Noto+Nastaliq+Urdu:wght@400;500;600&display=swap" rel="stylesheet" />',
      '    <link rel="stylesheet" href="../styles.css" />',
      '    <script type="application/ld+json">' + jsonLd + '</scr' + 'ipt>',
      '  </head>',
      '',
      '  <body class="work-page">',
      '    <header class="site-header">',
      '      <a class="brand" href="../index.html"><img class="brand-mark" src="../files/images/logo-circle-180.png" alt="" width="180" height="180" /> Scholarly Works and Research</a>',
      '      <nav class="header-nav" aria-label="Sections">',
      '        <a href="../index.html#about">Author</a>',
      '        <a class="nav-echo" href="../index.html#library">Library</a>',
      '        <a class="nav-echo" href="../index.html#rulings">Fatawa</a>',
      '        <a href="../index.html#contact">Contact</a>',
      '      </nav>',
      '    </header>',
      '',
      '    <main class="work-page-main">',
      '      <article class="work-hero app-page"' + (rtl ? ' dir="rtl"' : '') + '>',
      '        <a class="back-link" href="../index.html#' + e(categoryId) + '"><span aria-hidden="true">' +
        (rtl ? '→' : '←') + '</span> ' + e(categoryTitle) + '</a>',
      record.kind
        ? '        ' + site.kindMarkup(record, 'section-label' + (rtl ? '' : ' align-left'), 'p')
        : null,
      '        <h1 class="record-title ' + scriptClass + '" lang="' + e(record.language || 'en') +
        '" dir="' + (rtl ? 'rtl' : 'ltr') + '">' + e(record.title) + '</h1>',
      /* The title, the words under it and the button are one block. They
         were three things at 34px apart, so the button read as the start
         of the next thing rather than the end of this one — and it is
         the only thing on the page that matters. */
      app.tagline ? '        ' + line(app.tagline, 'app-tagline') : null,
      /* align-left on an LTR page, for the reason written into CLAUDE.md:
         `.urdu` sets text-align right, so an Urdu line inside a
         left-reading column sits at the far edge of its own box —
         which here is mid-page, away from the English line above it. */
      app.taglineUr
        ? '        ' + line(app.taglineUr, 'app-tagline' + (rtl ? '' : ' align-left'))
        : null,
      /* An app is opened, not downloaded, so it is a button and not a
         file row — and it is somewhere else, so it opens in its own tab
         and says so with the drawing every offsite link here uses. */
      app.url
        ? '        <p class="app-open"><a class="button button-dark" href="' + e(app.url) + '"' +
          (site.isOffsite(app.url) ? ' target="_blank" rel="noopener"' : '') + '>Open the app ' +
          site.icon('open', 'icon-inline') + '</a></p>'
        : '        <p class="availability-note">Not published here yet.</p>',
      '',
      (app.version || platforms.length)
        ? [
            '        <dl class="app-facts">',
            app.version
              ? '          <div><dt>Version</dt><dd>' + e(app.version) + '</dd></div>'
              : null,
            platforms.length
              ? '          <div><dt>Runs on</dt><dd>' + e(platforms.join(' · ')) + '</dd></div>'
              : null,
            pretty ? '          <div><dt>Published</dt><dd>' + e(pretty) + '</dd></div>' : null,
            '          <div><dt>Built by</dt><dd>' + e(author) + '</dd></div>',
            '        </dl>'
          ].filter(function (x) { return x !== null; }).join('\n')
        : null,
      '',
      whatsNew.length
        ? [
            '        <section class="app-new">',
            '          <h2 class="app-heading">What’s new' +
              (app.version ? ' in version ' + e(app.version) : '') + '</h2>',
            '          <ul>',
            whatsNew.map(function (item) {
              return '            ' + line(item, '', 'li');
            }).join('\n'),
            '          </ul>',
            '        </section>'
          ].join('\n')
        : null,
      '',
      /* The descriptions, under the app rather than over it: a reader
         came here to open the thing, and the prose is what they read if
         they want to know more first. Both, the record's own language
         leading, through the same helper the library uses. */
      (record.description || record.descriptionUr)
        ? '        <div class="app-about">\n' +
          (rtl
            ? [record.descriptionUr, record.description]
            : [record.description, record.descriptionUr])
            .filter(Boolean)
            .map(function (text) {
              return '          ' + site.proseMarkup(text, rtl ? '' : 'align-left', record.language);
            })
            .join('\n') +
          '\n        </div>'
        : null,
      '',
      (record.tags || []).length ? '        ' + site.tagMarkup(record) : null,
      '        <p class="post-foot"><a class="text-link" href="../index.html#' + e(categoryId) + '">← All apps</a></p>',
      '      </article>',
      '    </main>',
      '',
      '    <footer>',
      '      <span>© <span id="year"></span> ' + e(author) + '</span>',
      '      <a href="../index.html">All works</a>',
      '    </footer>',
      '',
      '    <script src="../content.js"></scr' + 'ipt>',
      '    <script src="../common.js"></scr' + 'ipt>',
      '  </body>',
      '</html>',
      ''
    ]
      .filter(function (part) { return part !== null; })
      .join('\n');
  }

  /* ---- The card every link shares --------------------------------

     One static share-card.png used to stand in for every work, post and
     fatwa — whichever link a reader followed, the same picture came
     with it. Drawn instead, per record, at publish time: a canvas, not
     a template file, because it has to run in whatever browser is
     doing the publishing and nowhere else — there is no server here to
     render an image on request. */

  var CARD_W = 1200, CARD_H = 630;

  /* The card is set in the site's own faces, not in whichever family
     happened to be nearest. A record's title takes Aslam — the same bold
     Naskh `.record-title.urdu` uses — and the kind label above it takes
     Mehr, the same Nastaliq `.work-kind` uses. Before this the card drew
     both in Noto Nastaliq Urdu, which is neither, so a card looked like
     nothing on the page it linked to.

     Aslam earns the title role twice over here. It is what the site
     already uses, and it is Naskh: its counters stay open when a phone
     shrinks this card to about a fifth of its size, where Nastaliq's
     hairlines close up and the word turns into a smudge. */
  function cardTitleFont(language, px) {
    if (language === 'ur') return '400 ' + px + 'px "Aslam"';
    if (language === 'ar') return '700 ' + px + 'px "Amiri"';
    return '600 ' + px + 'px "Newsreader"';
  }

  /* The kind label, and the byline under it. Arabic script whatever the
     record's own language is — `مضمون` sits above an English title as
     readily as an Urdu one — so this reads the text, not the record. */
  /* Its own copy without the /g — ARABIC_SCRIPT above carries the flag,
     and a global regex remembers where it stopped, so .test() on one
     answers differently every other call. */
  var CARD_ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

  function cardLabelFont(text, px) {
    return CARD_ARABIC.test(String(text || ''))
      ? '500 ' + px + 'px "Mehr"'
      : '700 ' + px + 'px "DM Sans"';
  }

  /* Aslam draws a space one pixel wide — the trap styles.css names as
     --space-urdu-heading. A canvas has no stylesheet to inherit that
     from, and `ctx.wordSpacing` is not in every browser the editor gets
     opened in, so the words are placed one at a time instead. Letters
     never join across a space in either script, so nothing is reshaped
     by drawing them separately.

     Returns the width, so the wrap below can measure a line the same way
     it will later be drawn rather than trusting the two to agree. */
  function spacedWidth(ctx, text, gap) {
    /* No gap asked for means the face has a usable space of its own —
       Newsreader, Amiri, DM Sans all do. Measure the line whole, or the
       word-by-word path below would drop the space rather than widen it,
       and an English title came out as TheBooksThatAren'tComingBack. */
    if (!gap) return ctx.measureText(text).width;
    var words = String(text || '').split(' ').filter(Boolean);
    var total = 0;
    words.forEach(function (word) { total += ctx.measureText(word).width; });
    return total + gap * Math.max(0, words.length - 1);
  }

  function fillSpaced(ctx, text, x, y, gap, rtl) {
    if (!gap) { ctx.fillText(text, x, y); return; }
    var words = String(text || '').split(' ').filter(Boolean);
    var cursor = x;
    words.forEach(function (word) {
      ctx.fillText(word, cursor, y);
      var step = ctx.measureText(word).width + gap;
      cursor += rtl ? -step : step;
    });
  }

  /* admin.html already loads all four families for the editor's own
     text; this only has to wait for the weights the card itself uses
     to finish downloading before drawing with them, or the canvas
     bakes in whatever fallback font was current at the time — a system
     serif standing in for Nastaliq is wrong in a way a page's CSS
     recovering from the same race never lets a reader see. */
  function ensureCardFonts() {
    return Promise.all([
      document.fonts.load('600 100px "Newsreader"'),
      /* Aslam and Mehr are self-hosted, declared by the @font-face rules
         in styles.css, which admin.html loads — so naming them here is
         enough wherever the editor is opened. The Worker proxies every
         path through to the public site, so files/fonts/ resolves from
         admin.tahirqadri.com.pk as readily as from the site itself. */
      document.fonts.load('400 100px "Aslam"'),
      document.fonts.load('500 34px "Mehr"'),
      document.fonts.load('700 100px "Amiri"'),
      document.fonts.load('400 34px "Amiri"'),
      document.fonts.load('700 25px "DM Sans"'),
      document.fonts.load('700 34px "DM Sans"')
    ]).then(function () { return document.fonts.ready; });
  }

  /* The author's seal, the mark the rest of the site already carries. A
     shape survives being shrunk to a thumbnail where four pixels of type
     does not, which is the whole reason it is on the card.

     Resolves to null rather than rejecting: a card without the seal is a
     card, and a publish must not fail over a decoration. */
  function loadSeal() {
    return new Promise(function (resolve) {
      var image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = function () { resolve(null); };
      image.src = 'files/images/logo-circle-512.png';
    });
  }

  /* Greedy wrap, word by word. A space still separates words in Urdu
     and Arabic even though the letters within one join right to left,
     so this needs no script-specific case — only the side the finished
     lines are drawn from does. */
  function wrapLines(ctx, text, maxWidth, maxLines, gap) {
    var words = String(text || '').split(/\s+/).filter(Boolean);
    var lines = [];
    var line = '';
    words.forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (line && spacedWidth(ctx, next, gap) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    });
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/[,;:—-]+$/, '').trim() + '…';
    }
    return lines;
  }

  /* Everything on this card is sized for the one place it is actually
     looked at. WhatsApp draws a preview at the width of the bubble —
     about 265px on a phone, so roughly a fifth of the 1200 drawn here.
     At the sizes this used to use, the title landed at 13.7px against
     the 19px floor the site's own CSS keeps for Urdu, and the kind
     label at 2.9px, the byline at 6 and the address at 4.4 — three
     lines of type that could not be read at all, over a card that was
     four fifths empty with a 236px hole through the middle of it.
     Measured off the shipped JPG, not guessed at. */
  function drawCard(ctx, record, categoryTitle, seal) {
    var rtl = record.language === 'ur' || record.language === 'ar';
    var margin = 84;
    var x = rtl ? CARD_W - margin : margin;
    var away = rtl ? margin : CARD_W - margin;

    var gradient = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
    gradient.addColorStop(0, '#102f27');
    gradient.addColorStop(0.68, '#17483c');
    gradient.addColorStop(1, '#1c5346');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    /* The seal, low and on the side the words do not use. It replaces the
       faint ring this drew before, which at thumbnail size was not a ring
       — it was a smudge in the gradient. */
    if (seal) {
      var sealSize = 178;
      ctx.save();
      ctx.globalAlpha = 0.11;
      ctx.drawImage(seal, rtl ? margin - 24 : CARD_W - margin - sealSize + 24,
        CARD_H - 268, sealSize, sealSize);
      ctx.restore();
    }

    ctx.direction = rtl ? 'rtl' : 'ltr';
    ctx.textAlign = rtl ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.strokeStyle = '#b8863a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, 84);
    ctx.lineTo(rtl ? x - 58 : x + 58, 84);
    ctx.stroke();

    /* The kind, in Nastaliq. It used to be handed to DM Sans, which holds
       no Arabic at all, so the browser drew it in whatever it happened to
       substitute — the same fault the arrows on the site once had. */
    var eyebrow = site.recordKind(record) || categoryTitle || 'Scholarly Works and Research';
    ctx.fillStyle = '#e8c882';
    ctx.font = cardLabelFont(eyebrow, 34);
    ctx.fillText(eyebrow, x, 140);

    /* Take the largest size the title actually fits at, rather than
       guessing from how many characters it has — a character count says
       nothing useful across three scripts, and it was picking a size that
       then had to be ellipsized or that ran up into the eyebrow. Measure
       at each step down and stop at the first that fits the band in three
       lines or fewer. */
    var TOP = 206, BOTTOM = 462;
    var maxWidth = CARD_W - margin * 2 - 120;
    var sizes = [106, 92, 80, 70, 62];
    var titlePx, titleGap, lines, lead, i;
    for (i = 0; i < sizes.length; i += 1) {
      titlePx = sizes[i];
      titleGap = record.language === 'ur' ? titlePx * 0.22 : 0;
      ctx.font = cardTitleFont(record.language, titlePx);
      lines = wrapLines(ctx, record.title, maxWidth, 99, titleGap);
      lead = titlePx * (record.language === 'ur' ? 1.28 : 1.16);
      if (lines.length <= 3 && (lines.length - 1) * lead + titlePx <= BOTTOM - TOP) break;
    }
    /* Nothing fitted even at the smallest step: take that step and let
       wrapLines cut it, which is the one case an ellipsis is right. */
    if (i === sizes.length) {
      titlePx = sizes[sizes.length - 1];
      titleGap = record.language === 'ur' ? titlePx * 0.22 : 0;
      ctx.font = cardTitleFont(record.language, titlePx);
      lines = wrapLines(ctx, record.title, maxWidth, 3, titleGap);
      lead = titlePx * (record.language === 'ur' ? 1.28 : 1.16);
    }

    ctx.fillStyle = '#faf8f2';
    /* Centred in the band between the eyebrow and the footer rule, so a
       one-line title no longer leaves a third of the card empty under it
       and the block sits where the eye lands rather than up in a corner. */
    var middle = (TOP + BOTTOM) / 2;
    var startY = middle - ((lines.length - 1) * lead) / 2 + titlePx * 0.3;
    lines.forEach(function (line, n) {
      fillSpaced(ctx, line, x, startY + n * lead, titleGap, rtl);
    });

    ctx.strokeStyle = 'rgba(232, 200, 130, 0.26)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, CARD_H - 112);
    ctx.lineTo(CARD_W - margin, CARD_H - 112);
    ctx.stroke();

    /* One line, not two, and each half on its own edge. Two stacked lines
       of small type came out as one grey band at the size this is seen. */
    var byline = rtl
      ? (model.site && model.site.nameUr) || (model.site && model.site.name) || ''
      : (model.site && model.site.name) || '';
    ctx.fillStyle = '#faf8f2';
    /* Aslam for the name in Arabic script, whichever script the record
       itself is in — it is Naskh, and at the size a phone shrinks this to
       Naskh still has its counters where Nastaliq has closed up. The
       label face is right for the one word above the title; it is not
       right for a whole name along the foot. */
    if (CARD_ARABIC.test(byline)) {
      ctx.font = cardTitleFont('ur', 36);
      fillSpaced(ctx, byline, x, CARD_H - 52, 36 * 0.22, rtl);
    } else {
      ctx.font = '700 34px "DM Sans"';
      ctx.fillText(byline, x, CARD_H - 52);
    }

    ctx.save();
    ctx.direction = 'ltr';
    ctx.textAlign = rtl ? 'left' : 'right';
    ctx.fillStyle = 'rgba(250, 248, 242, 0.62)';
    ctx.font = '700 25px "DM Sans"';
    ctx.fillText('tahirqadri.com.pk', away, CARD_H - 56);
    ctx.restore();
  }

  /* base64 text, not raw bytes — the same shape every other file in the
     commit already has, so both publish paths (a token straight to
     GitHub, or the Worker behind admin.tahirqadri.com.pk) send this one
     JSON-serializable thing rather than two different ones. */
  function cardBlob(record, categoryTitle, seal) {
    var canvas = document.createElement('canvas');
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    drawCard(canvas.getContext('2d'), record, categoryTitle, seal);
    /* JPEG, not PNG — the card is a gradient and a few lines of type,
       nothing PNG's lossless compression suits, and the difference is
       an order of magnitude smaller for a picture nobody zooms into. */
    return new Promise(function (resolve, reject) {
      /* Throws rather than returns when the canvas has drawn a picture it
         may not read back, which is what happens to the seal when the
         editor is opened from the file system instead of over http. */
      try {
        canvas.toBlob(function (blob) { blob ? resolve(blob) : reject(new Error('no blob')); },
          'image/jpeg', 0.88);
      } catch (error) {
        reject(error);
      }
    });
  }

  function renderCardBase64(record, categoryTitle) {
    return Promise.all([ensureCardFonts(), loadSeal()]).then(function (ready) {
      return cardBlob(record, categoryTitle, ready[1]).catch(function () {
        /* A card without the seal is still a card. A publish that fails
           over a decoration is not. */
        return cardBlob(record, categoryTitle, null);
      });
    }).then(function (blob) {
      return blob.arrayBuffer();
    }).then(function (buffer) {
      return bytesToBase64(new Uint8Array(buffer));
    });
  }

  /* One card per record with a page of its own — same set filesToCommit
     and the export dialog already write an HTML page for. */
  function cardTargets() {
    var out = [];
    allRecords().forEach(function (entry) {
      var post = isPost(entry);
      if (post && (!entry.record.page || bodies[entry.record.id] === undefined)) return;
      var categoryTitle = entry.category
        ? entry.category.title
        : post ? 'Posts, Notes & Reflections' : 'Islamic rulings';
      out.push({ record: entry.record, categoryTitle: categoryTitle });
    });
    return out;
  }

  function buildCardFiles() {
    return Promise.all(
      cardTargets().map(function (target) {
        return renderCardBase64(target.record, target.categoryTitle).then(function (base64) {
          return { path: 'files/cards/' + target.record.id + '.jpg', text: base64, binary: true };
        });
      })
    );
  }

  /* A work or a fatwa's own page, works/<id>.html — the same reasoning as
     buildPost above: a crawler reads whatever is in the file, and nothing
     that runs after the page loads. This used to be work.js's job, filled
     in after work.html had already reached the browser, which is exactly
     what a link-preview bot never sticks around for — WhatsApp, Facebook,
     Telegram all read the raw file and nothing else. That is why every
     one of these looked identical when shared: the raw file was always
     the same generic template, whichever work the link named.

     What follows renders the same hero work.js used to build client-side
     — same helpers, same markup — but into a file instead of the DOM. */
  function buildWork(record, entry) {
    var e = site.escapeHtml;
    var base = String((model.site && model.site.baseUrl) || '').replace(/\/+$/, '') + '/';
    var author = (model.site && model.site.name) || '';
    var authorUr = (model.site && model.site.nameUr) || undefined;

    /* A ruling carries no category of its own in this model — eachRecord
       passes null for one, same as buildPost does for a post. The site's
       own rendering (common.js, allRecords) fills in the same two
       constants for a ruling; matched here so the page this generates
       reads exactly like the one the live site already shows. */
    var isRuling = !entry.category;
    var categoryTitle = entry.category ? entry.category.title : 'Islamic rulings';
    var categoryId = entry.category ? entry.category.id : 'rulings';
    /* site.recordKind carries the fatwa default now, and gives it in the
       language the record reads in — an English ruling said فتویٰ. */
    var kind = site.recordKind(record);

    var path = 'works/' + record.id + '.html';
    var url = base + path;
    var rtl = record.language === 'ur' || record.language === 'ar';
    /* The sentence a crawler shows under the title, and the one WhatsApp
       prints beside the card. It follows the piece the same way
       site.shareCaption already does — an Urdu article had an English
       line under its Urdu title, because this only ever read
       record.description. */
    var shared = rtl
      ? record.descriptionUr || record.description
      : record.description || record.descriptionUr;
    var scriptClass = record.language === 'ur' ? 'urdu' : record.language === 'ar' ? 'arabic' : 'latin';
    var pretty = site.formatDate(record.date);
    var backHref = isRuling ? '../index.html#rulings' : '../index.html#' + categoryId;

    /* The work's own language first, then the other — same order the
       live page uses. */
    var prose = (rtl
      ? [[record.descriptionUr, 'ur'], [record.description, record.language]]
      : [[record.description, record.language], [record.descriptionUr, 'ur']])
      .filter(function (pair) { return pair[0]; })
      .map(function (pair) { return site.proseMarkup(pair[0], 'work-page-description', pair[1]); })
      .join('');

    /* A file path in content.js — "files/booklets-authored/x.pdf" — is
       right from the site root, which is where work.html always lived.
       This page lives one folder down, in works/, so the same path now
       has to climb back out with a "../" or it resolves to
       works/files/…, which does not exist. An address that already has
       a scheme — a Google Drive link — is left exactly alone; only a
       path relative to this site is adjusted. Structured data below
       still reads the untouched record: site.absoluteUrl builds a full
       address there regardless of which page is announcing it. */
    var forPage = record;
    if (record.files && record.files.length) {
      forPage = Object.assign({}, record, {
        files: record.files.map(function (file) {
          var next = Object.assign({}, file);
          if (!site.isOffsite(file.url)) next.url = '../' + file.url;
          if (file.preview && !site.isOffsite(file.preview)) next.preview = '../' + file.preview;
          return next;
        })
      });
    }
    var files = site.fileLinks(forPage, 'button');
    var gallery = site.imageGallery(forPage);
    var tags = (record.tags || []).length ? site.tagMarkup(record) : '';

    var jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: record.title,
      inLanguage: record.language || 'en',
      description: record.description || undefined,
      genre: kind || undefined,
      keywords: (record.tags || []).join(', ') || undefined,
      url: url,
      author: { '@type': 'Person', name: author, alternateName: authorUr, url: base },
      isPartOf: { '@type': 'Collection', name: categoryTitle, url: base },
      associatedMedia: (record.files || []).map(function (file) {
        return { '@type': 'MediaObject', name: file.label, contentUrl: site.absoluteUrl(file.url) };
      })
    });

    return [
      '<!doctype html>',
      '<html lang="' + e(record.language || 'en') + '">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '    <title>' + e(record.title) + ' — ' + e(author) + '</title>',
      record.description ? '    <meta name="description" content="' + e(record.description) + '" />' : null,
      '    <meta name="author" content="' + e(author) + '" />',
      '    <link rel="canonical" href="' + e(url) + '" />',
      '',
      '    <meta property="og:type" content="article" />',
      '    <meta property="og:title" content="' + e(record.title) + '" />',
      shared ? '    <meta property="og:description" content="' + e(shared) + '" />' : null,
      '    <meta property="og:url" content="' + e(url) + '" />',
      '    <meta property="og:image" content="' + e(base + 'files/cards/' + record.id + '.jpg') + '" />',
      '    <meta name="twitter:card" content="summary_large_image" />',
      '',
      '    <link rel="icon" type="image/png" sizes="32x32" href="../files/images/logo-circle-32.png" />',
      '    <link rel="apple-touch-icon" href="../files/images/logo-circle-180.png" />',
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
      '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Noto+Nastaliq+Urdu:wght@400;500;600&display=swap" rel="stylesheet" />',
      '    <link rel="stylesheet" href="../styles.css" />',
      '    <script type="application/ld+json">' + jsonLd + '</scr' + 'ipt>',
      '  </head>',
      '',
      '  <body class="work-page">',
      '    <header class="site-header">',
      '      <a class="brand" href="../index.html"><img class="brand-mark" src="../files/images/logo-circle-180.png" alt="" width="180" height="180" /> Scholarly Works and Research</a>',
      '      <nav class="header-nav" aria-label="Sections">',
      '        <a href="../index.html#about">Author</a>',
      '        <a class="nav-echo" href="../index.html#library">Library</a>',
      '        <a class="nav-echo" href="../index.html#rulings">Fatawa</a>',
      '        <a href="../index.html#contact">Contact</a>',
      '      </nav>',
      '    </header>',
      '',
      '    <main class="work-page-main">',
      '      <article class="work-hero"' + (rtl ? ' dir="rtl"' : '') + '>',
      '        <a class="back-link" href="' + e(backHref) + '"><span aria-hidden="true">' +
        (rtl ? '→' : '←') + '</span> ' + e(categoryTitle) + '</a>',
      kind
        ? '        ' + site.kindMarkup(record, 'section-label' + (rtl ? '' : ' align-left'), 'p')
        : null,
      '        ' + site.titleMarkup(record, 'h1'),
      /* Same reasoning as buildPost: formatDate's month name is always
         English, so this needs its own dir="ltr" or an RTL article
         reorders "3 August 2026" into "August 2026 3". */
      pretty ? '        <p class="work-date" dir="ltr">' + e(pretty) + '</p>' : null,
      prose ? '        ' + prose : null,
      files
        ? '        <div class="work-page-files" id="work-page-files">' + files + '</div>'
        : '        <p class="availability-note" id="work-page-files">This one isn’t published here yet. Write to the author if you need it.</p>',
      gallery ? '        ' + gallery : null,
      tags ? '        ' + tags : null,
      '      </article>',
      '    </main>',
      '',
      '    <footer>',
      '      <span>© <span id="year"></span> ' + e(author) + '</span>',
      '      <a href="../index.html">All works</a>',
      '    </footer>',
      '',
      '    <script src="../content.js"></scr' + 'ipt>',
      '    <script src="../common.js"></scr' + 'ipt>',
      '  </body>',
      '</html>',
      ''
    ]
      .filter(function (line) { return line !== null; })
      .join('\n');
  }

  /* ---- The homepage ---------------------------------------------------

     index.html is a page a person wrote, and the editor owns only parts
     of it. Each part sits between a pair of markers — `editor:about` and
     `/editor:about` — and a publish replaces what is between them and
     touches nothing else in the file.

     That is what lets the author's introduction be edited in a form and
     still arrive as real HTML. Drawing it with a script instead would
     have been less work and would have cost the thing that matters: a
     crawler, a WhatsApp preview and a reader with JavaScript off would
     all have found the introduction missing, and it is the most-read
     prose about the author on the site.

     A missing marker writes nothing and stops the publish with a
     sentence saying which one. index.html is the front door; a half
     spliced one is worse than an unchanged one. */

  var INDEX_REGIONS = ['nav', 'hero', 'about', 'recent', 'contact', 'footer'];

  /* The script a line of the homepage is written in. scriptOf is the same
     function the writing box asks of a typed line, so a heading here and
     a heading in a post cannot disagree about what counts as Urdu.

     It answers with lang and dir only, never a class. `.urdu` carries a
     font size and `text-align: right` along with the font, and the hero's
     Urdu line has a size of its own and no alignment of its own — the
     class would send it to the far edge of its column. Which classes an
     element wears is written out below, element by element, the same ones
     the page already wears. */
  function langAttrs(text) {
    var script = scriptOf(String(text || ''), 'ur');
    if (script === 'ur') return ' lang="ur" dir="rtl"';
    if (script === 'ar') return ' lang="ar" dir="rtl"';
    return '';
  }

  function pad(indent) { return new Array(indent + 1).join(' '); }

  /* Drops the empty ones, so a block left blank in the form leaves no
     element behind rather than an empty one to wonder about. */
  function stack(indent, parts) {
    var p = pad(indent);
    return parts
      .filter(function (part) { return part !== null && part !== undefined && part !== ''; })
      .map(function (part) { return p + part; })
      .join('\n');
  }

  function indexNav(indent) {
    var e = site.escapeHtml;
    return stack(indent, (model.nav || []).map(function (link) {
      return '<a' + (link.echo ? ' class="nav-echo"' : '') + ' href="' + e(link.href) + '">' +
        e(link.text) + '</a>';
    }));
  }

  function indexHero(indent) {
    var e = site.escapeHtml;
    var hero = model.hero || {};
    return stack(indent, [
      hero.eyebrow ? '<p class="eyebrow"' + langAttrs(hero.eyebrow) + '>' + e(hero.eyebrow) + '</p>' : '',
      '<h1>' + e(hero.headline || '') +
        (hero.headlineEm ? '<em>' + e(hero.headlineEm) + '</em>' : '') + '</h1>',
      hero.copy ? '<p class="hero-copy"' + langAttrs(hero.copy) + '>' + e(hero.copy) + '</p>' : '',
      hero.urdu ? '<p class="hero-urdu"' + langAttrs(hero.urdu) + '>' + e(hero.urdu) + '</p>' : '',
      hero.cta ? '<a class="button" href="#library">' + e(hero.cta) +
        ' <span aria-hidden="true">→</span></a>' : ''
    ]);
  }

  /* The seal and the calligraphed name are the two pictures inside the
     introduction. They are not words and there is nothing to edit about
     them, so they are written out as they stand. */
  var INTRO_MARK =
    '<img class="intro-mark" src="files/images/logo-circle-180.png" ' +
    'srcset="files/images/logo-circle-180.png 180w, files/images/logo-circle-512.png 512w, ' +
    'files/images/logo-circle-1024.png 1024w" sizes="60px" ' +
    'alt="Calligraphic seal reading Abu al-Layth Muhammad Tahir al-Qadri" width="180" height="180" />';
  var BIO_CALLIGRAPHY =
    '<img class="bio-calligraphy" src="files/images/name-calligraphy.png" alt="" ' +
    'width="840" height="219" loading="lazy" />';

  function indexAbout(indent) {
    var e = site.escapeHtml;
    var about = model.about || {};
    var bio = about.bio || {};
    var i = indent;

    /* align-left on both labels, for the reason written into CLAUDE.md:
       `.urdu` sets text-align right, a label inherits it, and above an
       English heading it lands at the far edge of the block. Three of
       these went years without it. */
    var head = stack(i + 2, [
      about.label
        ? '<!-- align-left because the heading under it reads leftwards. Without\n' +
          pad(i + 2) + '     it `.urdu` sets the block right and the label lands at the far\n' +
          pad(i + 2) + '     edge of a 780px column, across from the name it introduces. -->'
        : '',
      about.label ? '<p class="section-label urdu align-left"' + langAttrs(about.label) + '>' +
        e(about.label) + '</p>' : '',
      '<h2>' + e(about.heading || '') + '</h2>',
      about.summary ? '<p' + langAttrs(about.summary) + '>' + e(about.summary) + '</p>' : ''
    ]);

    var facts = (bio.facts || []).map(function (fact) {
      return pad(i + 8) + '<div><dt>' + e(fact.term) + '</dt><dd>' + e(fact.value) + '</dd></div>';
    }).join('\n');

    var panels = (bio.panels || []).map(function (panel) {
      var tag = panel.kind === 'ol' ? 'ol' : panel.kind === 'ul' ? 'ul' : 'div';
      var items = (panel.items || []).map(function (item) {
        return pad(i + 10) + (tag === 'div' ? '<p>' + e(item) + '</p>' : '<li>' + e(item) + '</li>');
      }).join('\n');
      return [
        pad(i + 6) + '<details>',
        pad(i + 8) + '<summary class="urdu"' + langAttrs(panel.title) + '>' + e(panel.title) +
          ' <span class="toggle" aria-hidden="true">+</span></summary>',
        pad(i + 8) + '<' + tag + ' class="urdu"' + langAttrs(panel.title) + '>',
        items,
        pad(i + 8) + '</' + tag + '>',
        pad(i + 6) + '</details>'
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    var pdf = bio.pdf && bio.pdf.url
      ? [
          pad(i + 4) + '<p class="bio-source">',
          pad(i + 6) + '<a class="document-link" href="' + e(bio.pdf.url) +
            '" target="_blank" rel="noopener">',
          pad(i + 8) + e(bio.pdf.label || 'Open the PDF') +
            ' <span data-icon="open" aria-hidden="true"></span>',
          pad(i + 6) + '</a>',
          pad(i + 4) + '</p>'
        ].join('\n')
      : '';

    return [
      pad(i) + INTRO_MARK,
      pad(i) + '<div class="intro-body">',
      head,
      '',
      pad(i + 2) + '<details class="bio" id="bio">',
      pad(i + 4) + '<summary>',
      pad(i + 6) + '<span>',
      bio.openLabelUr
        ? pad(i + 8) + '<span class="section-label urdu align-left"' + langAttrs(bio.openLabelUr) +
          '>' + e(bio.openLabelUr) + '</span>'
        : '',
      pad(i + 8) + '<strong>' + e(bio.openLabel || 'Read the full introduction') + '</strong>',
      pad(i + 6) + '</span>',
      pad(i + 6) + '<span class="toggle" aria-hidden="true">+</span>',
      pad(i + 4) + '</summary>',
      '',
      pad(i + 4) + '<div class="bio-body">',
      pad(i + 6) + '<div class="bio-heading">',
      pad(i + 8) + BIO_CALLIGRAPHY,
      bio.nameUr ? pad(i + 8) + '<h3 class="urdu"' + langAttrs(bio.nameUr) + '>' + e(bio.nameUr) + '</h3>' : '',
      bio.byline ? pad(i + 8) + '<p class="bio-byline urdu"' + langAttrs(bio.byline) + '>' + e(bio.byline) + '</p>' : '',
      pad(i + 6) + '</div>',
      '',
      (bio.prose || []).length
        ? [pad(i + 6) + '<div class="bio-prose urdu"' + langAttrs((bio.prose || []).join(' ')) + '>',
           (bio.prose || []).map(function (p) { return pad(i + 8) + '<p>' + e(p) + '</p>'; }).join('\n'),
           pad(i + 6) + '</div>', ''].join('\n')
        : '',
      facts
        ? [pad(i + 6) + '<dl class="bio-facts urdu"' +
             langAttrs((bio.facts || []).map(function (f) { return f.term; }).join(' ')) + '>',
           facts,
           pad(i + 6) + '</dl>', ''].join('\n')
        : '',
      panels ? [pad(i + 4) + '<div class="bio-panels">', panels, pad(i + 4) + '</div>', ''].join('\n') : '',
      pdf,
      pad(i + 4) + '</div>',
      pad(i + 2) + '</details>',
      pad(i) + '</div>'
    ].filter(function (part) { return part !== ''; }).join('\n');
  }

  function indexContact(indent) {
    var e = site.escapeHtml;
    var contact = model.contact || {};
    return [
      pad(indent) + '<div>',
      stack(indent + 2, [
        contact.label ? '<p class="section-label"' + langAttrs(contact.label) + '>' + e(contact.label) + '</p>' : '',
        '<h2>' + e(contact.heading || '') + '</h2>',
        contact.copy ? '<p' + langAttrs(contact.copy) + '>' + e(contact.copy) + '</p>' : ''
      ]),
      pad(indent) + '</div>',
      pad(indent) + '<a class="button button-dark" id="contact-email" href="#">' +
        e(contact.button || 'Email') + '</a>'
    ].join('\n');
  }

  function indexFooter(indent) {
    var e = site.escapeHtml;
    var footer = model.footer || {};
    return stack(indent, [
      '<span>© <span id="year"></span> ' + e((model.site && model.site.name) || '') + '</span>',
      footer.credit ? '<span' + langAttrs(footer.credit) + '>' + e(footer.credit) + '</span>' : '',
      '<a href="#top">Back to top ↑</a>'
    ]);
  }

  /* ---- Recently added and updated -----------------------------------

     Eight cards, newest first, on a rail that scrolls. The date they are
     ordered by is `updated` where a record has one and `date` where it
     does not — `updated` is stamped as a record is edited, not at publish
     time, because a publish rewrites every page in the library whether or
     not anything about it changed.

     Every part of a card comes from the helper the library row uses for
     the same part — titleMarkup, kindMarkup, metaMarkup, categoryIcon —
     so a card cannot end up saying something different from the row it
     mirrors. That has already happened once on this site, when the kind
     and its English rendering each kept their own copy of a default. */
  var RECENT_MAX = 8;

  /* Fatawa are not in a category, and their drawing is looked up by one.
     The stand-in is what CATEGORY_ICON has always keyed the seal on. */
  var RULINGS_CATEGORY = { id: 'rulings' };

  function recentEntries() {
    return allRecords()
      .filter(function (entry) { return entry.record.updated || entry.record.date; })
      .sort(function (a, b) {
        var x = a.record.updated || a.record.date;
        var y = b.record.updated || b.record.date;
        /* ISO dates sort as text, which is the whole reason for the
           format — no Date object, so no timezone to shift a day by. */
        return x < y ? 1 : x > y ? -1 : 0;
      })
      .slice(0, RECENT_MAX);
  }

  function indexRecent(indent) {
    var e = site.escapeHtml;
    var entries = recentEntries();
    /* Nothing dated yet is not an empty section with a heading over it —
       it is no section. */
    if (!entries.length) return '';
    var i = indent;

    var cards = entries.map(function (entry) {
      var record = entry.record;
      var dir = site.direction(record.language);
      return [
        pad(i + 6) + '<a class="recent-card" href="' + e(site.recordHref(record)) + '">',
        pad(i + 8) + site.categoryIcon(entry.category || RULINGS_CATEGORY, 'recent-mark'),
        pad(i + 8) + '<span class="recent-card-body ' +
          (dir === 'rtl' ? 'reads-rtl' : 'reads-ltr') + '" dir="' + dir + '">',
        pad(i + 10) + site.titleMarkup(record),
        /* Kind and date, on one line, and nothing else. The full meta
           line — format, language, date — wrapped to three lines in a
           280px card and was 114px of a 245px card, taller than the
           title above it. What a card is for is what changed and when;
           what it is made of is the row's job, one section down. */
        pad(i + 10) + '<span class="work-line">' + site.kindMarkup(record) +
          (site.recordWhen(record)
            ? '<span class="record-meta" dir="ltr">' + e(site.recordWhen(record)) + '</span>'
            : '') + '</span>',
        pad(i + 8) + '</span>',
        pad(i + 6) + '</a>'
      ].join('\n');
    }).join('\n');

    return [
      pad(i) + '<section class="recent" id="recent" aria-labelledby="recent-heading">',
      pad(i + 2) + '<div class="section-heading">',
      pad(i + 4) + '<div>',
      pad(i + 6) + '<p class="section-label">Lately</p>',
      pad(i + 6) + '<h2 id="recent-heading">Recently added and updated</h2>',
      pad(i + 4) + '</div>',
      pad(i + 4) + '<p class="section-note">The most recent additions and revisions.</p>',
      pad(i + 2) + '</div>',
      '',
      pad(i + 2) + '<div class="recent-rail" id="recent-rail">',
      pad(i + 4) + '<button class="category-arrow category-arrow-start" type="button" ' +
        'id="recent-back" aria-label="Scroll back" tabindex="-1">‹</button>',
      pad(i + 4) + '<div class="recent-track" id="recent-track">',
      cards,
      pad(i + 4) + '</div>',
      pad(i + 4) + '<button class="category-arrow category-arrow-end" type="button" ' +
        'id="recent-forward" aria-label="Scroll forward" tabindex="-1">›</button>',
      pad(i + 2) + '</div>',
      pad(i) + '</section>'
    ].join('\n');
  }

  var INDEX_BUILDER = {
    nav: indexNav, hero: indexHero, about: indexAbout,
    recent: indexRecent, contact: indexContact, footer: indexFooter
  };

  /* Replaces one region and leaves the rest of the file alone. The indent
     the opening marker itself sits at is given back to the closing one,
     so the block lands where a person would have typed it and the file
     stays readable to whoever opens it on GitHub. */
  function spliceRegion(html, name, build) {
    var open = '<!-- editor:' + name + ' -->';
    var close = '<!-- /editor:' + name + ' -->';
    var start = html.indexOf(open);
    if (start === -1) return null;
    var end = html.indexOf(close, start);
    if (end === -1) return null;
    var lineStart = html.lastIndexOf('\n', start) + 1;
    var indent = /^[ \t]*/.exec(html.slice(lineStart, start))[0];
    /* The body sits at the marker's own indent, not one step in: the
       marker is a comment about the block, not a container around it. */
    var body = build(indent.length);
    return html.slice(0, start + open.length) +
      (body ? '\n' + body + '\n' + indent : '') +
      html.slice(end);
  }

  /* { text } when every region was found, { missing: [names] } otherwise.
     Never both, and never a file with some regions written and some not. */
  function buildIndex(html) {
    var out = String(html);
    var missing = [];
    INDEX_REGIONS.forEach(function (name) {
      var next = spliceRegion(out, name, INDEX_BUILDER[name]);
      if (next === null) { missing.push(name); return; }
      out = next;
    });
    return missing.length ? { missing: missing } : { text: out };
  }

  /* ---- One entry ---- */

  function buildRow(entry) {
    var record = entry.record;
    var template = document.getElementById('row-template');
    var row = template.content.firstElementChild.cloneNode(true);

    var idCell = row.querySelector('.admin-row-id');
    var titleCell = row.querySelector('.admin-row-title');
    var metaCell = row.querySelector('.admin-row-meta');
    var fields = row.querySelector('.admin-fields');

    if (!originalIds[record.id]) row.classList.add('is-new');

    /* Anything typed or pressed anywhere in this row is a change to this
       record. Delegated here rather than repeated at the twenty places a
       field is built: input and change bubble, and a listener on the row
       cannot be forgotten by whoever adds the twenty-first.

       Not the row's own tools, though. Moving a record up the page or
       into another category changes where it is read, not what it says,
       and the strip is about what was written. */
    var stamp = function (event) {
      if (event.target.closest && event.target.closest('.admin-row-tools')) return;
      touch(record);
    };
    row.addEventListener('input', stamp);
    row.addEventListener('change', stamp);
    row.addEventListener('click', function (event) {
      if (!event.target.closest || !event.target.closest('button')) return;
      stamp(event);
    });

    function refreshSummary() {
      idCell.textContent = record.id || '(no id)';
      titleCell.textContent = record.title || '(no title)';
      applyScript(titleCell, record.language);
      var count = (record.files || []).length;
      metaCell.textContent =
        (entry.category ? entry.category.title : 'Fatwa') +
        ' · ' +
        (isPost(entry)
          ? site.formatDate(record.date) || 'no date'
          : count ? count + (count === 1 ? ' file' : ' files') : 'no file');
    }
    refreshSummary();

    /* id */
    var idField = field('Id', 'permanent — this is the link students have');
    var idInput = textInput(record.id, function (value) {
      record.id = value.trim();
      refreshSummary();
    });
    idField.appendChild(idField.own(idInput));
    var idWarn = el('p', 'admin-error');
    idField.appendChild(idWarn);
    idInput.addEventListener('input', function () {
      idWarn.textContent =
        originalIds[record.id] || !idInput.dataset.was
          ? ''
          : 'Renaming an id breaks every link already shared to it.';
    });
    idInput.dataset.was = record.id || '';
    fields.appendChild(idField);

    /* language — three buttons rather than a dropdown. A dropdown hides
       two of three choices behind a click and shows the chosen one as a
       word; these show all three, each set in the script it names, so the
       answer to "which is Nastaleeq" is on the screen. */
    var languageChanged = [];
    var langField = field('Language', 'sets the font and the direction of everything below');
    langField.appendChild(
      langField.group(
        chipGroup(
          LANGUAGES.map(function (option) {
            return { value: option.value, text: option.label, cls: option.cls };
          }),
          record.language || 'en',
          function (value) {
            record.language = value;
            applyScript(titleInput, record.language);
            refreshSummary();
            languageChanged.forEach(function (fn) { fn(value); });
            markDirty();
          }
        )
      )
    );
    fields.appendChild(langField);

    /* kind — the labels already in use, as buttons, and a box for a new
       one. It was a bare text field, which means knowing the vocabulary
       by heart and matching it letter for letter or ending up with two
       spellings of رسالہ in the library. */
    var kindField = field('Kind', 'the small Urdu label above the title');
    var kindInput = textInput(record.kind, function (value) {
      record.kind = value.trim() || undefined;
      kindChips.select(record.kind);
    });
    applyScript(kindInput, 'ur');
    kindInput.placeholder = 'or type another';
    var kindChips = chipGroup(
      kindsInUse().map(function (kind) { return { value: kind, text: kind, cls: 'urdu' }; }),
      record.kind,
      function (value) {
        record.kind = value || undefined;
        kindInput.value = value || '';
        markDirty();
      },
      true
    );
    kindField.appendChild(kindField.group(kindChips));
    kindField.appendChild(kindField.own(kindInput));
    fields.appendChild(kindField);

    /* title */
    var titleField = field('Title');
    var titleInput = textInput(record.title, function (value) {
      record.title = value;
      refreshSummary();
    });
    applyScript(titleInput, record.language);
    titleField.appendChild(titleField.own(titleInput));
    fields.appendChild(titleField);

    /* description — both languages; either may be left empty */
    var descField = field('Description (English)', 'one or two lines — this is what search and Google read');
    var descArea = textArea(record.description, function (value) {
      record.description = value.trim() || undefined;
    });
    descField.appendChild(descField.own(descArea));
    fields.appendChild(descField);

    var descUrField = field('Description (Urdu)', 'the same in Urdu — shown above the English on an Urdu work');
    var descUrBox = textArea(record.descriptionUr, function (value) {
      record.descriptionUr = value.trim() || undefined;
    });
    applyScript(descUrBox, 'ur');
    descUrField.appendChild(descUrField.own(descUrBox));
    fields.appendChild(descUrField);

    /* tags — one pill each, with its own ×. A single comma-separated line
       meant deleting one tag by counting commas, and a stray comma inside
       a tag silently made two. */
    var tagField = field('Tags', 'for browsing and for the search — press Enter after each');
    var tagsBoxEl = tagBox(record);
    tagField.appendChild(tagField.group(tagsBoxEl));
    fields.appendChild(tagField);

    /* Pasting the piece in is also the first and cheapest chance to fill
       in what search and sharing read — but only ever into what's still
       blank. A description or a tag typed by hand is never overwritten,
       pasted once or pasted again. */
    function autoFillFromPaste(pastedText) {
      var rtl = record.language === 'ur' || record.language === 'ar';
      var target = rtl ? descUrBox : descArea;
      if (!target.value.trim()) {
        var description = suggestDescription(pastedText);
        if (description) {
          target.value = description;
          target.dispatchEvent(new Event('input'));
        }
      }
      if (!(record.tags || []).length) {
        var tags = suggestTags(pastedText);
        if (tags.length) tagsBoxEl.addTags(tags);
      }
    }

    /* date — posts want one; anything else may have one */
    var dateField = field('Date', 'YYYY-MM-DD, or leave empty');
    var dateInput = textInput(record.date, function (value) {
      record.date = value.trim() || undefined;
    });
    dateInput.type = 'date';
    dateField.appendChild(dateField.own(dateInput));
    fields.appendChild(dateField);

    /* An app is neither a page of writing nor a record of a file: it is a
       link, a version, a list of what is new and the platforms it runs
       on. Written as prose it would be an essay about an app; as fields
       it is an app page, and the next one is a form to fill in. */
    if (isApp(entry)) {
      var app = record.app;

      var appPageField = field('Page', 'the file this app’s page lives in');
      var appPageInput = textInput(record.page, function (value) {
        record.page = value.trim() || undefined;
      });
      appPageInput.placeholder = 'apps/name-of-app.html';
      appPageField.appendChild(appPageField.own(appPageInput));
      fields.appendChild(appPageField);

      var appField = field('The app', 'where it opens, and which version this is');
      var urlInput = textInput(app.url, function (value) { app.url = value.trim(); });
      urlInput.placeholder = 'https://…';
      urlInput.setAttribute('aria-label', 'Where the app opens');
      appField.appendChild(appField.own(urlInput));
      fields.appendChild(appField);

      var versionField = field('Version');
      var versionInput = textInput(app.version, function (value) {
        app.version = value.trim() || undefined;
      });
      versionInput.placeholder = '2';
      versionField.appendChild(versionField.own(versionInput));
      fields.appendChild(versionField);

      bound(fields, app, 'tagline', 'The line under the title');
      bound(fields, app, 'taglineUr', 'The same line in Urdu');

      if (!app.platforms) app.platforms = [];
      repeatable(fields, 'Runs on', 'one per platform — Apple, Android, Windows',
        app.platforms, '+ Add a platform',
        function (line, item, index) {
          var input = textInput(app.platforms[index], function (value) {
            app.platforms[index] = value;
          });
          input.setAttribute('aria-label', 'Platform ' + (index + 1));
          line.appendChild(input);
          return true;
        },
        function () { return ''; });

      if (!app.whatsNew) app.whatsNew = [];
      repeatable(fields, 'What’s new', 'one per line, in whichever script it is written in',
        app.whatsNew, '+ Add a line',
        function (line, item, index) {
          var input = textInput(app.whatsNew[index], function (value) {
            app.whatsNew[index] = value;
          });
          input.setAttribute('aria-label', 'What is new, line ' + (index + 1));
          var follow = function () { applyScript(input, scriptOf(input.value, 'ur') || 'en'); };
          follow();
          input.addEventListener('input', follow);
          line.appendChild(input);
          return true;
        },
        function () { return ''; });

      return finish();
    }

    /* A post is a page of writing. Everything else is a record of a file.
       The row shows one or the other, never both. */
    if (isPost(entry)) {
      var pageField = field('Page', 'the file this post lives in');
      var pageInput = textInput(record.page, function (value) {
        record.page = value.trim() || undefined;
      });
      pageInput.placeholder = 'posts/' + (record.id || 'slug') + '.html';
      pageField.appendChild(pageField.own(pageInput));
      fields.appendChild(pageField);

      var bodyField = field(
        'The writing',
        'type it as it should read, or paste a WhatsApp message — a *line like this* becomes a Heading, ' +
          'a _line like this_ or one starting with > becomes a Quote'
      );
      var writing = writingBox(record, markDirty, autoFillFromPaste);
      writing.setLanguage(record.language);
      writing.setText(bodies[record.id] || '');
      /* The canvas already names itself — aria-label="The writing", set in
         writingBox — so this only wraps the toolbar and the note into the
         same announced group rather than relabelling the canvas. */
      bodyField.appendChild(bodyField.group(writing.node));
      var bodyNote = el('p', 'hint');
      bodyField.appendChild(bodyNote);
      fields.appendChild(bodyField);

      languageChanged.push(function (language) { writing.setLanguage(language); });

      /* An existing post keeps its words in its own file, so they have to
         be read back before they can be edited. Over file:// the browser
         refuses, and the box stays empty rather than silently wiping the
         post on export. */
      if (record.page && bodies[record.id] === undefined) {
        bodyNote.textContent = 'Loading the current text…';
        fetch(record.page)
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
          })
          .then(function (html) {
            var parsed = new DOMParser().parseFromString(html, 'text/html');
            var article = parsed.getElementById('post-body');
            bodies[record.id] = article ? htmlToBody(article) : '';
            writing.setText(bodies[record.id]);
            bodyNote.textContent = '';
          })
          .catch(function () {
            bodies[record.id] = undefined;
            bodyNote.textContent =
              'Could not read ' + record.page + ' — open this editor over http, not from a file, to edit an existing post. Leaving this empty will not change the post.';
          });
      }
      return finish();
    }

    /* files */
    var filesField = field('Files', 'label, then the path under files/ — leave empty for “not published yet”');
    var filesBox = el('div', 'admin-files');
    filesField.appendChild(filesField.group(filesBox));

    function drawFiles() {
      filesBox.textContent = '';
      (record.files || []).forEach(function (file, index) {
        var line = el('div', 'admin-file');
        var label = textInput(file.label, function (value) { file.label = value; });
        label.placeholder = 'Urdu PDF';
        label.setAttribute('aria-label', 'Label for this file');
        var url = textInput(file.url, function (value) { file.url = value.trim(); });
        url.placeholder = 'files/booklets-authored/name.pdf';
        url.setAttribute('aria-label', 'Address of this file');
        var remove = el('button', 'text-link admin-danger', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', function () {
          record.files.splice(index, 1);
          if (!record.files.length) record.files = undefined;
          drawFiles();
          refreshSummary();
          markDirty();
        });
        line.appendChild(label);
        line.appendChild(url);
        line.appendChild(remove);
        filesBox.appendChild(line);

        if (site.isImage(file.url)) {
          var previewLine = el('div', 'admin-file');
          previewLine.appendChild(el('span', 'hint', 'Preview image'));
          var preview = textInput(file.preview, function (value) {
            file.preview = value.trim() || undefined;
          });
          preview.placeholder = 'optional lighter copy to show on the page';
          preview.setAttribute('aria-label', 'Preview image address, optional');
          previewLine.appendChild(preview);
          previewLine.appendChild(el('span'));
          filesBox.appendChild(previewLine);
        }
      });

      var add = el('button', 'text-link', '+ Add a file');
      add.type = 'button';
      add.addEventListener('click', function () {
        if (!record.files) record.files = [];
        record.files.push({ label: '', url: '' });
        drawFiles();
        refreshSummary();
        markDirty();
      });
      filesBox.appendChild(add);
    }
    drawFiles();
    fields.appendChild(filesField);

    return finish();

    /* Shared tail: the controls every row has, whether it is a post or a
       record of a file. */
    function finish() {
    var tools = el('div', 'admin-row-tools');

    if (entry.category) {
      var moveField = field('Category');
      var moveSelect = document.createElement('select');
      (model.categories || []).forEach(function (category) {
        var option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.title;
        moveSelect.appendChild(option);
      });
      moveSelect.value = entry.category.id;
      moveSelect.addEventListener('change', function () {
        var target = model.categories.filter(function (c) { return c.id === moveSelect.value; })[0];
        if (!target) return;
        entry.list.splice(entry.index, 1);
        if (!target.works) target.works = [];
        target.works.push(record);
        markDirty();
        render();
      });
      moveField.appendChild(moveField.own(moveSelect));
      fields.appendChild(moveField);
    }

    var up = el('button', 'text-link', '↑ Move up');
    up.type = 'button';
    up.addEventListener('click', function () {
      if (entry.index === 0) return;
      entry.list.splice(entry.index - 1, 0, entry.list.splice(entry.index, 1)[0]);
      markDirty();
      render();
    });
    var down = el('button', 'text-link', '↓ Move down');
    down.type = 'button';
    down.addEventListener('click', function () {
      if (entry.index >= entry.list.length - 1) return;
      entry.list.splice(entry.index + 1, 0, entry.list.splice(entry.index, 1)[0]);
      markDirty();
      render();
    });
    var remove = el('button', 'text-link admin-danger', 'Delete this entry');
    remove.type = 'button';
    remove.addEventListener('click', function () {
      if (!window.confirm('Delete “' + (record.title || record.id) + '”?\n\nAnyone holding a link to it will see “That work isn’t here.”')) return;
      entry.list.splice(entry.index, 1);
      markDirty();
      render();
    });
    tools.appendChild(up);
    tools.appendChild(down);
    tools.appendChild(remove);
    fields.appendChild(tools);

    /* Built in one order and best met in another. A row is opened to
       write, or to fix a title — not to look at the id, which is
       permanent and set once, and was nonetheless the first thing on
       screen every time. On a phone the writing box was the tenth field
       down: nine to scroll past before reaching the thing the row was
       opened for.

       So the writing sits under the language that decides its script and
       the title it belongs to, and everything settled once — the id, the
       file it lives in, where it sits in the library — goes to the
       bottom. Re-appending an element moves it rather than copying it,
       so this is the order itself. The conditional ones are simply
       absent on a record that has none. */
    [langField, titleField, bodyField, descField, descUrField, tagField,
     kindField, dateField, filesField, pageField, idField, moveField, tools]
      .forEach(function (part) { if (part) fields.appendChild(part); });

    return row;
    }
  }

  /* ---- Site & About ---------------------------------------------------

     Everything on the homepage that is not a record: the site's name and
     address, the header links, the hero, the author's introduction and
     the whole of the bio behind it, the contact lines, the footer credit,
     and each category's own name, blurb and drawing.

     All of it was typed into index.html and content.js by hand until now
     — the introduction included, which is the piece anyone would want to
     change and the one thing no form could reach. It is one panel above
     the library, built from the same three helpers a record's row is
     built from, so there is nothing new about how it behaves and a phone
     gets the same one-column stack it already gets everywhere here. */

  /* Which of these were open. render() runs again on every reorder, and
     a panel that shut itself each time would be unusable to reorder
     anything with. */
  var openBlocks = {};

  function block(title, note) {
    var row = el('details', 'admin-row admin-row-plain');
    row.open = !!openBlocks[title];
    row.addEventListener('toggle', function () { openBlocks[title] = row.open; });
    var summary = document.createElement('summary');
    summary.appendChild(el('span', 'admin-row-title', title));
    summary.appendChild(el('span', 'admin-row-meta', note || ''));
    var toggle = el('span', 'toggle', '+');
    toggle.setAttribute('aria-hidden', 'true');
    summary.appendChild(toggle);
    row.appendChild(summary);
    row.fields = el('div', 'admin-fields');
    row.appendChild(row.fields);
    return row;
  }

  /* A labelled box bound to one key of one object — which is what nearly
     every field in this panel is. The script follows what is typed, the
     same way a record's title does, so an Urdu line is in Nastaleeq and
     reading right to left while it is being written and not only after. */
  function bound(fields, object, key, label, hint, big) {
    var wrap = field(label, hint);
    var control = big
      ? textArea(object[key], function (value) { object[key] = value; })
      : textInput(object[key], function (value) { object[key] = value; });
    var follow = function () { applyScript(control, scriptOf(control.value, 'ur') || 'en'); };
    follow();
    control.addEventListener('input', follow);
    wrap.appendChild(wrap.own(control));
    fields.appendChild(wrap);
    return wrap;
  }

  /* A box of rows that can be added to and removed from. The Files field
     has worked this way since the editor was written; this is that
     pattern lifted out, so the introduction's paragraphs, its facts, a
     panel's items and the header's links all behave like it rather than
     each growing a shape of its own. */
  function repeatable(fields, label, hint, list, addLabel, drawRow, blank, onChange) {
    var wrap = field(label, hint);
    var box = el('div', 'admin-files');
    wrap.appendChild(wrap.group(box));
    fields.appendChild(wrap);

    function draw() {
      box.textContent = '';
      list.forEach(function (item, index) {
        var line = el('div', 'admin-file');
        var single = drawRow(line, item, index);
        if (single) line.classList.add('is-single');
        var remove = el('button', 'text-link admin-danger', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', function () {
          list.splice(index, 1);
          draw();
          markDirty();
          if (onChange) onChange();
        });
        line.appendChild(remove);
        box.appendChild(line);
      });
      var add = el('button', 'text-link', addLabel);
      add.type = 'button';
      add.addEventListener('click', function () {
        list.push(blank());
        draw();
        markDirty();
        if (onChange) onChange();
      });
      box.appendChild(add);
    }
    draw();
    return draw;
  }

  /* One line inside a repeatable row, bound the same way `bound` binds a
     field — without the label, since the box above it carries that. */
  function lineInput(object, key, placeholder, aria) {
    var input = textInput(object[key], function (value) { object[key] = value; });
    input.placeholder = placeholder || '';
    input.setAttribute('aria-label', aria || placeholder || '');
    var follow = function () { applyScript(input, scriptOf(input.value, 'ur') || 'en'); };
    follow();
    input.addEventListener('input', follow);
    return input;
  }

  function siteBlock() {
    var row = block('The site itself', 'name, email, address');
    var site_ = model.site;
    bound(row.fields, site_, 'name', 'Name', 'as it is written in English — the footer and every page’s byline read this');
    bound(row.fields, site_, 'nameUr', 'Name in Urdu');
    bound(row.fields, site_, 'email', 'Email', 'the address the Contact button opens');
    bound(row.fields, site_, 'baseUrl', 'Address',
      'the site’s own domain. Changing it here is not enough on its own — robots.txt, sitemap.xml, the CNAME file and the sharing tags in index.html all name it too');
    return row;
  }

  function navBlock() {
    var row = block('Header links', 'the four across the top');
    repeatable(row.fields, 'Links',
      'the text, then where it goes — #about, #library, #rulings, #contact, or a page',
      model.nav, '+ Add a link',
      function (line, link) {
        line.appendChild(lineInput(link, 'text', 'Author', 'What this link says'));
        line.appendChild(lineInput(link, 'href', '#about', 'Where this link goes'));
        var echo = el('label', 'admin-check');
        var box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = !!link.echo;
        box.addEventListener('change', function () {
          link.echo = box.checked || undefined;
          markDirty();
        });
        echo.appendChild(box);
        echo.appendChild(document.createTextNode(' Echoed in the category strip'));
        line.appendChild(echo);
      },
      function () { return { text: '', href: '#' }; });
    return row;
  }

  function heroBlock() {
    var row = block('The hero', 'the first screen');
    var hero = model.hero;
    bound(row.fields, hero, 'eyebrow', 'Above the headline');
    bound(row.fields, hero, 'headline', 'Headline', 'the plain half, up to the words set in italic');
    bound(row.fields, hero, 'headlineEm', 'Headline, in italic', 'the tail of the same sentence, set in the display italic and gold');
    bound(row.fields, hero, 'copy', 'The paragraph under it', null, true);
    bound(row.fields, hero, 'urdu', 'The Urdu line under that');
    bound(row.fields, hero, 'cta', 'The button');
    return row;
  }

  function aboutBlock() {
    var row = block('The author', 'the introduction, and the whole of the bio behind it');
    var about = model.about;
    if (!about.bio) about.bio = {};
    var bio = about.bio;

    bound(row.fields, about, 'label', 'Label', 'the small line above the name');
    bound(row.fields, about, 'heading', 'Heading');
    bound(row.fields, about, 'summary', 'The paragraph everyone sees',
      'what is on the page before anything is opened', true);

    row.fields.appendChild(el('p', 'hint', 'Everything below is behind “' +
      (bio.openLabel || 'Read the full introduction') + '”.'));

    bound(row.fields, bio, 'openLabel', 'What the fold says');
    bound(row.fields, bio, 'openLabelUr', 'The label above it');
    bound(row.fields, bio, 'nameUr', 'The name, in Urdu');
    bound(row.fields, bio, 'byline', 'Who wrote the introduction', 'the “از قلم” line');

    if (!bio.prose) bio.prose = [];
    proseList(row.fields, bio);

    if (!bio.facts) bio.facts = [];
    repeatable(row.fields, 'The facts panel', 'نام, کنیت, مرشدِ گرامی, تدریس — the pair of columns',
      bio.facts, '+ Add a fact',
      function (line, fact) {
        line.appendChild(lineInput(fact, 'term', 'نام', 'What this fact is called'));
        line.appendChild(lineInput(fact, 'value', '', 'The fact itself'));
      },
      function () { return { term: '', value: '' }; });

    if (!bio.panels) bio.panels = [];
    panelsList(row.fields, bio);

    if (!bio.pdf) bio.pdf = {};
    bound(row.fields, bio.pdf, 'label', 'The link at the end');
    bound(row.fields, bio.pdf, 'url', 'and what it opens', 'a path under files/, or an address');
    return row;
  }

  /* Paragraphs are long, so each gets a box it can grow in rather than
     the one-line input the shorter lists use. */
  function proseList(fields, bio) {
    var wrap = field('The introduction itself', 'one box per paragraph');
    var box = el('div', 'admin-files');
    wrap.appendChild(wrap.group(box));
    fields.appendChild(wrap);

    function draw() {
      box.textContent = '';
      bio.prose.forEach(function (text, index) {
        var line = el('div', 'admin-file is-single');
        var area = textArea(text, function (value) { bio.prose[index] = value; });
        area.setAttribute('aria-label', 'Paragraph ' + (index + 1));
        var follow = function () { applyScript(area, scriptOf(area.value, 'ur') || 'en'); };
        follow();
        area.addEventListener('input', follow);
        var remove = el('button', 'text-link admin-danger', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', function () {
          bio.prose.splice(index, 1);
          draw();
          markDirty();
        });
        line.appendChild(area);
        line.appendChild(remove);
        box.appendChild(line);
      });
      var add = el('button', 'text-link', '+ Add a paragraph');
      add.type = 'button';
      add.addEventListener('click', function () {
        bio.prose.push('');
        draw();
        markDirty();
      });
      box.appendChild(add);
    }
    draw();
  }

  var PANEL_KINDS = [
    { value: 'ol', text: 'Numbered' },
    { value: 'ul', text: 'Bulleted' },
    { value: 'prose', text: 'Paragraphs' }
  ];

  /* A panel holds a heading and a list, and each list is its own
     repeatable box — so this is a repeatable of repeatables, and the only
     part of the panel that needed more than one line to build. */
  function panelsList(fields, bio) {
    var wrap = field('The panels', 'each opens on the page — تعلیمی سفر, اجازات and the rest');
    var box = el('div', 'admin-files');
    box.classList.add('admin-panels');
    wrap.appendChild(wrap.group(box));
    fields.appendChild(wrap);

    function draw() {
      box.textContent = '';
      bio.panels.forEach(function (panel, index) {
        var card = el('div', 'admin-panel');
        var head = el('div', 'admin-file');
        head.appendChild(lineInput(panel, 'title', '', 'What this panel is called'));
        head.appendChild(chipGroup(PANEL_KINDS, panel.kind || 'ul', function (value) {
          panel.kind = value;
          markDirty();
        }));
        var remove = el('button', 'text-link admin-danger', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', function () {
          bio.panels.splice(index, 1);
          draw();
          markDirty();
        });
        head.appendChild(remove);
        card.appendChild(head);

        if (!panel.items) panel.items = [];
        var items = el('div', 'admin-files');
        card.appendChild(items);
        drawItems(items, panel);
        box.appendChild(card);
      });
      var add = el('button', 'text-link', '+ Add a panel');
      add.type = 'button';
      add.addEventListener('click', function () {
        bio.panels.push({ title: '', kind: 'ul', items: [] });
        draw();
        markDirty();
      });
      box.appendChild(add);
    }

    function drawItems(items, panel) {
      items.textContent = '';
      panel.items.forEach(function (text, index) {
        var line = el('div', 'admin-file is-single');
        var input = textInput(text, function (value) { panel.items[index] = value; });
        input.setAttribute('aria-label', 'Item ' + (index + 1) + ' of ' + (panel.title || 'this panel'));
        var follow = function () { applyScript(input, scriptOf(input.value, 'ur') || 'en'); };
        follow();
        input.addEventListener('input', follow);
        var remove = el('button', 'text-link admin-danger', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', function () {
          panel.items.splice(index, 1);
          drawItems(items, panel);
          markDirty();
        });
        line.appendChild(input);
        line.appendChild(remove);
        items.appendChild(line);
      });
      var add = el('button', 'text-link', '+ Add an item');
      add.type = 'button';
      add.addEventListener('click', function () {
        panel.items.push('');
        drawItems(items, panel);
        markDirty();
      });
      items.appendChild(add);
    }

    draw();
  }

  function contactBlock() {
    var row = block('Contact', 'the last section on the page');
    bound(row.fields, model.contact, 'label', 'Label');
    bound(row.fields, model.contact, 'heading', 'Heading');
    bound(row.fields, model.contact, 'copy', 'The paragraph', null, true);
    bound(row.fields, model.contact, 'button', 'The button');
    return row;
  }

  function footerBlock() {
    var row = block('Footer', 'the credit line');
    bound(row.fields, model.footer, 'credit', 'Credit',
      'the font Urdu is set in is licensed CC BY-SA, and the licence asks to be named');
    return row;
  }

  /* The categories themselves — their names, their blurbs, the drawing
     beside each heading, and the order they are read in. A record can be
     moved between them already; until now the category it was moved into
     could not be renamed. */
  function categoriesBlock() {
    var row = block('Categories', (model.categories || []).length + ' in the library');
    var wrap = field('Each category', 'the works inside them are edited below, in the library itself');
    var box = el('div', 'admin-files');
    box.classList.add('admin-panels');
    wrap.appendChild(wrap.group(box));
    row.fields.appendChild(wrap);

    var icons = site.iconNames().map(function (name) { return { value: name, text: name, icon: name }; });

    function draw() {
      box.textContent = '';
      (model.categories || []).forEach(function (category, index) {
        var card = el('div', 'admin-panel');
        var fields = el('div', 'admin-fields');
        card.appendChild(fields);

        bound(fields, category, 'title', 'Name');
        bound(fields, category, 'titleUr', 'Name in Urdu');
        bound(fields, category, 'blurb', 'Blurb', 'the line under the name', true);

        var iconField = field('Drawing', 'the mark beside the heading');
        iconField.appendChild(iconField.group(chipGroup(icons, category.icon || site.categoryIconName(category), function (value) {
          category.icon = value;
          markDirty();
          render();
        })));
        fields.appendChild(iconField);

        var tools = el('div', 'admin-row-tools');
        var up = el('button', 'text-link', '↑ Move up');
        up.type = 'button';
        up.addEventListener('click', function () {
          if (index === 0) return;
          model.categories.splice(index - 1, 0, model.categories.splice(index, 1)[0]);
          markDirty();
          render();
        });
        var down = el('button', 'text-link', '↓ Move down');
        down.type = 'button';
        down.addEventListener('click', function () {
          if (index >= model.categories.length - 1) return;
          model.categories.splice(index + 1, 0, model.categories.splice(index, 1)[0]);
          markDirty();
          render();
        });
        /* A category with works in it is not deleted, it is emptied
           first. Deleting it here would take every work with it and
           every link anyone holds to one of them. */
        var remove = el('button', 'text-link admin-danger', 'Delete this category');
        remove.type = 'button';
        remove.addEventListener('click', function () {
          var count = (category.works || []).length;
          if (count) {
            window.alert('“' + (category.title || category.id) + '” still holds ' + count +
              (count === 1 ? ' work' : ' works') +
              '.\n\nMove them to another category first — each row has a Category field — ' +
              'or delete them one at a time. Deleting the category here would take them with it, ' +
              'and every link already shared to one of them.');
            return;
          }
          if (!window.confirm('Delete the empty category “' + (category.title || category.id) + '”?')) return;
          model.categories.splice(index, 1);
          markDirty();
          render();
        });
        tools.appendChild(up);
        tools.appendChild(down);
        tools.appendChild(remove);
        fields.appendChild(tools);
        box.appendChild(card);
      });

      var add = el('button', 'text-link', '+ Add a category');
      add.type = 'button';
      add.addEventListener('click', function () {
        model.categories.push({ id: freshId('category'), title: 'New category', works: [] });
        markDirty();
        render();
      });
      box.appendChild(add);
    }
    draw();
    return row;
  }

  function buildSitePanel() {
    var group = el('section', 'admin-group');
    var heading = el('h2', null, 'Site & About');
    heading.appendChild(el('span', 'admin-count', 'the homepage, and the categories'));
    group.appendChild(heading);
    [siteBlock(), navBlock(), heroBlock(), aboutBlock(),
     contactBlock(), footerBlock(), categoriesBlock()]
      .forEach(function (row) { group.appendChild(row); });
    return group;
  }

  /* ---- Drawing everything ---- */

  function matchesFilter(entry, needle) {
    if (!needle) return true;
    var hay = [
      entry.record.id,
      entry.record.title,
      entry.record.description,
      entry.record.descriptionUr,
      entry.category ? entry.category.title : 'fatwa fatawa'
    ]
      .filter(Boolean)
      .join(' ');
    return site.fold(hay).indexOf(needle) !== -1;
  }

  function render() {
    var needle = site.fold(filterInput.value);
    var openIds = {};
    editor.querySelectorAll('.admin-row[open]').forEach(function (row) {
      /* The Site & About rows are .admin-row too and have no id — they
         are not records. They remember whether they were open for
         themselves, in openBlocks. */
      var id = row.querySelector('.admin-row-id');
      if (id) openIds[id.textContent] = true;
    });

    editor.textContent = '';

    /* Above the library, and only when the whole library is showing. A
       filter is a search for a record; leaving the site's own words at
       the top of the results would be answering a different question. */
    if (!needle) editor.appendChild(buildSitePanel());

    var shown = 0;
    (model.categories || []).forEach(function (category) {
      var entries = allRecords().filter(function (entry) {
        return entry.category === category && matchesFilter(entry, needle);
      });
      if (!entries.length) return;
      var group = el('section', 'admin-group');
      var heading = el('h2', null, category.title);
      heading.appendChild(el('span', 'admin-count', entries.length + ' of ' + (category.works || []).length));
      group.appendChild(heading);
      entries.forEach(function (entry) {
        var row = buildRow(entry);
        if (openIds[entry.record.id]) row.open = true;
        group.appendChild(row);
      });
      editor.appendChild(group);
      shown += 1;
    });

    var rulings = allRecords().filter(function (entry) {
      return !entry.category && matchesFilter(entry, needle);
    });
    if (rulings.length) {
      var group = el('section', 'admin-group');
      var heading = el('h2', null, 'Fatawa');
      heading.appendChild(el('span', 'admin-count', rulings.length + ' of ' + (model.rulings || []).length));
      group.appendChild(heading);
      rulings.forEach(function (entry) {
        var row = buildRow(entry);
        if (openIds[entry.record.id]) row.open = true;
        group.appendChild(row);
      });
      editor.appendChild(group);
      shown += 1;
    }

    /* Counted, not measured off the page: the Site & About panel is an
       .admin-group too, so asking whether anything was drawn would always
       answer yes and a filter matching nothing would say nothing. */
    if (!shown) {
      editor.appendChild(el('p', 'empty-state', 'Nothing matches that filter.'));
    }
  }

  /* ---- Adding ---- */

  function freshId(prefix) {
    var taken = {};
    eachRecord(function (record) { taken[record.id] = true; });
    var n = 1;
    while (taken[prefix + '-' + n]) n += 1;
    return prefix + '-' + n;
  }

  /* Opens and scrolls to a row by id — a new entry is not necessarily the
     first one on the page, since its category may sit further down. */
  function revealRow(id) {
    var rows = editor.querySelectorAll('.admin-row');
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].querySelector('.admin-row-id').textContent === id) {
        rows[i].open = true;
        rows[i].scrollIntoView({ block: 'center' });
        return;
      }
    }
  }

  document.getElementById('add-work').addEventListener('click', function () {
    var category = (model.categories || [])[0];
    if (!category) return;
    if (!category.works) category.works = [];
    var newId = freshId('new-work');
    category.works.unshift({ id: newId, title: '', language: 'ur' });
    filterInput.value = '';
    markDirty();
    render();
    revealRow(newId);
  });

  var APPS_CATEGORY = 'apps';

  document.getElementById('add-app').addEventListener('click', function () {
    var category = (model.categories || []).filter(function (c) { return c.id === APPS_CATEGORY; })[0];
    if (!category) {
      window.alert('There is no “' + APPS_CATEGORY + '” category to put it in.\n\n' +
        'Add one in Site & About → Categories first, with the id “' + APPS_CATEGORY + '”.');
      return;
    }
    var id = freshId('new-app');
    if (!category.works) category.works = [];
    category.works.unshift({
      id: id,
      title: '',
      language: 'en',
      kind: 'ایپ',
      date: today(),
      page: 'apps/' + id + '.html',
      app: { url: '', version: '', platforms: [], whatsNew: [] }
    });
    filterInput.value = '';
    markDirty();
    render();
    revealRow(id);
  });

  document.getElementById('add-post').addEventListener('click', function () {
    var category = (model.categories || []).filter(function (c) { return c.id === POSTS_CATEGORY; })[0];
    if (!category) {
      window.alert('There is no “' + POSTS_CATEGORY + '” category in content.js to put it in.');
      return;
    }
    var id = freshId('new-post');
    if (!category.works) category.works = [];
    category.works.unshift({
      id: id,
      title: '',
      language: 'ur',
      date: today(),
      page: 'posts/' + id + '.html'
    });
    bodies[id] = '';
    filterInput.value = '';
    markDirty();
    render();
    revealRow(id);
  });

  document.getElementById('add-ruling').addEventListener('click', function () {
    if (!model.rulings) model.rulings = [];
    var newId = freshId('new-fatwa');
    model.rulings.unshift({ id: newId, title: '', language: 'ur' });
    filterInput.value = '';
    markDirty();
    render();
    revealRow(newId);
  });

  filterInput.addEventListener('input', render);

  /* ---- Checking before writing ---- */

  /* "a, b and c" rather than "a and b and c". Three or more names read
     as one list only with the commas in. */
  function andList(items) {
    if (items.length < 2) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function problems() {
    var found = [];
    var seen = {};
    eachRecord(function (record, list, index, category) {
      var where = (category ? category.title : 'Fatawa') + ' → ' + (record.title || record.id || 'untitled');
      if (!record.id) found.push(where + ': needs an id.');
      else if (!/^[a-z0-9-]+$/.test(record.id)) found.push(where + ': the id "' + record.id + '" may use only lowercase letters, numbers and hyphens.');
      else if (seen[record.id]) found.push('Two entries share the id "' + record.id + '". Ids must be unique.');
      seen[record.id] = true;

      if (!record.title) found.push(where + ': needs a title.');
      if (['ur', 'ar', 'en'].indexOf(record.language) === -1) found.push(where + ': needs a language.');
      (record.files || []).forEach(function (file) {
        if (!file.url) found.push(where + ': a file row has no path.');
      });
      if (category && category.id === POSTS_CATEGORY && !record.page) {
        found.push(where + ': a post needs a page, e.g. posts/' + (record.id || 'slug') + '.html');
      }
      if (record.app) {
        if (!record.page) {
          found.push(where + ': an app needs a page, e.g. apps/' + (record.id || 'slug') + '.html');
        }
        /* Without an address the page has nothing to open, which is the
           one thing an app page is for. */
        if (!record.app.url) found.push(where + ': needs the address the app opens at.');
      }

      /* A post is its writing. Publishing the entry without it puts a
         link to nothing on the homepage and hands the sitemap a 404 —
         which is exactly what happened once: the page had never been
         written, the editor could not read it back, and it went out
         anyway with only the entry and the sitemap line.

         Empty counts as missing. There is no such thing as a post with
         no words in it. */
      /* An app has a page too, and no writing at all: its page is built
         from the fields beside this one and regenerated whole on every
         publish, so there is nothing to read back and nothing to lose. */
      if (record.page && !record.app) {
        var body = bodies[record.id];
        if (body === undefined) {
          found.push(where + ': its writing is not loaded, so publishing would link to a page that does not exist — open its row first.');
        } else if (!body.trim()) {
          found.push(where + ': has no writing in it yet.');
        }
      }
    });
    /* The homepage is written into index.html between markers. If the
       markers are gone the region cannot be found, and writing some
       regions and not others would leave the front door of the site half
       generated — so nothing is written and this says which are missing. */
    if (indexTrouble) {
      found.push(indexTrouble);
    } else if (indexHtml) {
      var home = buildIndex(indexHtml);
      if (home.missing) {
        found.push('index.html has lost the ' + andList(home.missing) + ' marker' +
          (home.missing.length === 1 ? '' : 's') + ' the editor writes between, so the ' +
          'homepage cannot be published. Put the pair back — the comment ' +
          'editor:' + home.missing[0] + ' and its closing half — and try again.');
      }
    }

    return found;
  }

  /* ---- Writing the files ---- */

  var HEADER = [
    '/* ============================================================',
    '   THIS IS THE ONLY FILE YOU NEED TO EDIT TO ADD OR CHANGE WORKS.',
    '   See README.md for a walkthrough, or open admin.html to edit it',
    '   through a form instead of by hand.',
    '',
    '   A work looks like this:',
    '',
    '   {',
    '     id: "unique-english-slug",        // required, becomes work.html?work=unique-english-slug',
    '     title: "عنوان",                    // required',
    '     language: "ur",                   // "ur" = Nastaleeq, "ar" = Naskh, "en" = English',
    '     kind: "رسالہ",                     // small label: رسالہ / چارٹ / پریزینٹیشن / ترجمہ و تخریج / مضمون / فتویٰ',
    '     description: "One or two lines.",  // optional, English',
    '     descriptionUr: "وہی بات اردو میں۔", // optional; on an Urdu work it',
    '                                        // is shown first, English under it',
    '     tags: ["حج و عمرہ"],               // optional, also searchable',
    '     files: [                           // optional; leave out entirely if nothing is uploaded yet',
    '       { label: "Urdu PDF", url: "files/my-file.pdf" },',
    '       { label: "English PDF", url: "https://drive.google.com/..." }',
    '     ]',
    '   }',
    '',
    '   A work with no `files` shows as "Not published yet" instead of a',
    '   download button. That is normal and safe — add the files later.',
    '   ============================================================ */',
    ''
  ].join('\n');

  var HOME_HEADER = [
    '  /* ---- The homepage\'s own words ------------------------------------',
    '',
    '     index.html holds a *rendering* of what is below, not the original:',
    '     admin.html writes the blocks between its `editor:` markers back on',
    '     every publish, exactly the way it writes works/<id>.html from a',
    '     record. So this is the one place to edit them — anything typed',
    '     into index.html between those markers is overwritten by the next',
    '     publish. Open admin.html and use the "Site & About" panel, or edit',
    '     here by hand and publish once.',
    '',
    '     No string here says which script it is in. The generator asks the',
    '     same question the writing box asks of a typed line — see scriptOf —',
    '     and writes the lang and dir out itself. */',
    '',
    ''
  ].join('\n');

  /* JSON.stringify is the escaping. It produces valid JavaScript for any
     string, keeps Urdu and Arabic readable rather than turning them into
     \u escapes, and cannot be tricked by a quote inside a title. */
  function str(value) {
    return JSON.stringify(String(value));
  }

  /* The homepage's blocks are plain data — strings, arrays of strings,
     small objects — so one writer serves all of them rather than a
     hand-written serialiser each. Unquoted keys and double-quoted values,
     to match the rest of the file; str() is still the escaping, the same
     as everywhere else here. */
  var BARE_KEY = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

  function writeValue(value, indent) {
    var p = ' '.repeat(indent);
    if (Array.isArray(value)) {
      if (!value.length) return '[]';
      /* A short list of short strings reads better on one line than as
         five lines of one word each — a nav link's two fields, say. */
      var flat = value.every(function (v) { return typeof v === 'string'; }) &&
        value.join('').length < 56;
      if (flat) return '[' + value.map(str).join(', ') + ']';
      return '[\n' + value.map(function (v) {
        return p + '  ' + writeValue(v, indent + 2);
      }).join(',\n') + '\n' + p + ']';
    }
    if (value && typeof value === 'object') {
      var keys = Object.keys(value).filter(function (key) { return value[key] !== undefined; });
      if (!keys.length) return '{}';
      var short = keys.every(function (key) { return typeof value[key] !== 'object'; }) &&
        keys.map(function (key) { return String(value[key]); }).join('').length < 56;
      var pairs = keys.map(function (key) {
        return (BARE_KEY.test(key) ? key : str(key)) + ': ' + writeValue(value[key], indent + 2);
      });
      if (short) return '{ ' + pairs.join(', ') + ' }';
      return '{\n' + pairs.map(function (pair) { return p + '  ' + pair; }).join(',\n') +
        '\n' + p + '}';
    }
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    return str(value);
  }

  function writeFiles(files, indent) {
    var pad = ' '.repeat(indent);
    return (
      'files: [\n' +
      files
        .map(function (file) {
          var parts = ['label: ' + str(file.label || 'Open'), 'url: ' + str(file.url)];
          if (file.preview) parts.push('preview: ' + str(file.preview));
          return pad + '  { ' + parts.join(', ') + ' }';
        })
        .join(',\n') +
      '\n' + pad + ']'
    );
  }

  function writeRecord(record, indent) {
    var pad = ' '.repeat(indent);
    var lines = [pad + 'id: ' + str(record.id), pad + 'title: ' + str(record.title), pad + 'language: ' + str(record.language)];
    if (record.kind) lines.push(pad + 'kind: ' + str(record.kind));
    if (record.date) lines.push(pad + 'date: ' + str(record.date));
    if (record.updated) lines.push(pad + 'updated: ' + str(record.updated));
    if (record.description) lines.push(pad + 'description: ' + str(record.description));
    if (record.descriptionUr) lines.push(pad + 'descriptionUr: ' + str(record.descriptionUr));
    if (record.tags && record.tags.length) {
      lines.push(pad + 'tags: [' + record.tags.map(str).join(', ') + ']');
    }
    if (record.page) lines.push(pad + 'page: ' + str(record.page));
    if (record.app) lines.push(pad + 'app: ' + writeValue(record.app, indent));
    if (record.files && record.files.length) {
      lines.push(pad + writeFiles(record.files, indent));
    }
    return ' '.repeat(indent - 2) + '{\n' + lines.join(',\n') + '\n' + ' '.repeat(indent - 2) + '}';
  }

  function buildContent() {
    var site_ = model.site || {};
    var out = HEADER + '\nwindow.siteContent = {\n  site: {\n';
    out += '    name: ' + str(site_.name || '') + ',\n';
    out += '    nameUr: ' + str(site_.nameUr || '') + ',\n';
    out += '    email: ' + str(site_.email || '') + ',\n';
    out += '    // Used for sharing previews, canonical links and structured data.\n';
    out += '    // Change this if the site later moves to its own domain — and change\n';
    out += '    // robots.txt and sitemap.xml with it.\n';
    out += '    baseUrl: ' + str(site_.baseUrl || '') + '\n';
    out += '  },\n\n';
    out += HOME_HEADER;
    out += '  nav: ' + writeValue(model.nav || [], 2) + ',\n\n';
    out += '  hero: ' + writeValue(model.hero || {}, 2) + ',\n\n';
    out += '  about: ' + writeValue(model.about || {}, 2) + ',\n\n';
    out += '  contact: ' + writeValue(model.contact || {}, 2) + ',\n\n';
    out += '  footer: ' + writeValue(model.footer || {}, 2) + ',\n\n';
    out += '  categories: [\n';

    out += (model.categories || [])
      .map(function (category) {
        var head =
          '    {\n' +
          '      id: ' + str(category.id) + ',\n' +
          '      title: ' + str(category.title) + ',\n' +
          (category.titleUr ? '      titleUr: ' + str(category.titleUr) + ',\n' : '') +
          (category.icon ? '      icon: ' + str(category.icon) + ',\n' : '') +
          (category.blurb ? '      blurb: ' + str(category.blurb) + ',\n' : '') +
          '      works: [\n';
        var works = (category.works || [])
          .map(function (work) { return writeRecord(work, 10); })
          .join(',\n');
        return head + works + '\n      ]\n    }';
      })
      .join(',\n\n');

    out += '\n  ],\n\n';
    out += '  /* Fatāwā. Same fields as a work — id, title, language, description, files. */\n';
    out += '  rulings: [\n';
    out += (model.rulings || []).map(function (ruling) { return writeRecord(ruling, 6); }).join(',\n');
    out += '\n  ]\n};\n\n';
    out += '/* A search index, generated at publish time from a post\'s own words —\n' +
      '   not meant to be hand-edited, and not part of the record above because\n' +
      '   the words themselves live in the post\'s own HTML file, not here. Only\n' +
      '   posts get an entry: a work or a fatwa\'s content is inside a PDF, which\n' +
      '   this cannot read into. */\n';
    out += 'window.siteContent.searchIndex = ' + JSON.stringify(buildSearchIndex(), null, 2) + ';\n';
    return out;
  }

  /* Every post's words, keyed by id, so site.searchText can find a piece
     by what it actually says and not only its title and description. */
  function buildSearchIndex() {
    var index = {};
    allRecords().forEach(function (entry) {
      if (!isPost(entry)) return;
      var body = bodies[entry.record.id];
      if (body === undefined) return;
      var text = plainTextFromBody(body);
      if (text) index[entry.record.id] = { text: text };
    });
    return index;
  }

  function buildSitemap() {
    var base = String((model.site && model.site.baseUrl) || '').replace(/\/+$/, '') + '/';
    var today = new Date().toISOString().slice(0, 10);
    /* A post has its own page at record.page; a work or a fatwa has its
       own page too now, works/<id>.html — work.html?work=<id> is a
       redirect kept only for links already shared, and offering that
       address to a crawler instead of the real page would just have it
       follow a redirect to find the same thing, for no benefit. */
    var paths = [];
    eachRecord(function (record) {
      paths.push(record.page ? record.page : 'works/' + record.id + '.html');
    });
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!-- The homepage plus one entry per work and fatwa.\n\n' +
      '     THIS LIST IS THE ONE PLACE OUTSIDE content.js THAT NAMES A WORK.\n' +
      '     When you add or remove an entry in content.js, add or remove its line\n' +
      '     here too, or the new work will not be offered to search engines.\n' +
      '     admin.html writes both files together, which is the safe way to do it.\n\n' +
      '     Change the domain here, in robots.txt and in site.baseUrl in\n' +
      '     content.js together if the site ever moves. -->\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      '  <url>\n    <loc>' + base + '</loc>\n    <lastmod>' + today + '</lastmod>\n' +
      '    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n' +
      paths
        .map(function (path) {
          return (
            '  <url>\n    <loc>' + base + path + '</loc>\n' +
            '    <lastmod>' + today + '</lastmod>\n' +
            '    <changefreq>yearly</changefreq>\n    <priority>0.8</priority>\n  </url>'
          );
        })
        .join('\n') +
      '\n</urlset>\n'
    );
  }

  /* ---- Export dialog ---- */

  var dialog = document.getElementById('export-dialog');

  document.getElementById('export').addEventListener('click', function () {
    var found = problems();
    if (found.length) {
      window.alert('Fix these first:\n\n• ' + found.join('\n• '));
      return;
    }
    var content = buildContent();

    /* Parse what we are about to hand over, in this page, before offering
       it. If it will not run, the site would go blank — better to know
       now than after committing. */
    try {
      var check = {};
      new Function('window', content).call(check, check);
      if (!check.siteContent || !check.siteContent.categories) throw new Error('no categories');
    } catch (error) {
      window.alert('The generated file did not parse: ' + error.message + '\n\nNothing has been changed. Please report this.');
      return;
    }

    document.getElementById('out-content').value = content;
    document.getElementById('out-sitemap').value = buildSitemap();

    /* One more file per record with a page of its own: a post's, if its
       words are in hand — a post whose page could not be read is left
       alone rather than overwritten with an empty one — and a work or a
       fatwa's, always, since nothing about one lives anywhere but this
       form and there is never a reason not to regenerate it. */
    var extra = document.getElementById('out-pages');
    extra.textContent = '';
    var writtenPosts = 0;
    var writtenWorks = 0;
    var offered = 0;

    function offerFile(path, text) {
      var id = 'out-file-' + (offered += 1);
      var section = document.createElement('section');
      var head = document.createElement('div');
      head.className = 'admin-file-head';
      var title = document.createElement('h3');
      title.textContent = path;
      var buttons = document.createElement('span');
      buttons.innerHTML =
        '<button class="text-link" type="button" data-copy="' + id + '">Copy</button> ' +
        '<button class="text-link" type="button" data-download="' + path.split('/').pop() +
        '" data-source="' + id + '">Download</button>';
      head.appendChild(title);
      head.appendChild(buttons);
      var area = document.createElement('textarea');
      area.id = id;
      area.readOnly = true;
      area.spellcheck = false;
      area.value = text;
      section.appendChild(head);
      section.appendChild(area);
      extra.appendChild(section);
    }

    /* A card has nothing to copy as text and no textarea to read a
       download from — the base64 sits on the button itself instead. */
    function offerImageFile(path, base64) {
      var section = document.createElement('section');
      var head = document.createElement('div');
      head.className = 'admin-file-head';
      var title = document.createElement('h3');
      title.textContent = path;
      var button = document.createElement('button');
      button.className = 'text-link';
      button.type = 'button';
      button.textContent = 'Download';
      button.setAttribute('data-download', path.split('/').pop());
      button.setAttribute('data-base64', base64);
      head.appendChild(title);
      head.appendChild(button);
      var img = document.createElement('img');
      img.className = 'admin-card-preview';
      img.alt = path;
      img.src = 'data:image/jpeg;base64,' + base64;
      section.appendChild(head);
      section.appendChild(img);
      extra.appendChild(section);
    }

    /* The homepage, first, because it is the one file here that is not
       generated whole — it is the committed page with the editor's own
       blocks written back into it. */
    if (indexHtml) {
      var home = buildIndex(indexHtml);
      if (home.text) offerFile('index.html', home.text);
    }

    allRecords().forEach(function (entry) {
      if (isApp(entry)) {
        if (!entry.record.page) return;
        writtenPosts += 1;
        offerFile(entry.record.page, buildApp(entry.record, entry));
      } else if (isPost(entry)) {
        if (!entry.record.page || bodies[entry.record.id] === undefined) return;
        writtenPosts += 1;
        offerFile(entry.record.page, buildPost(entry.record, entry));
      } else {
        writtenWorks += 1;
        offerFile('works/' + entry.record.id + '.html', buildWork(entry.record, entry));
      }
    });

    var works = 0;
    var rulings = (model.rulings || []).length;
    (model.categories || []).forEach(function (c) { works += (c.works || []).length; });
    document.getElementById('export-summary').textContent = 'Drawing the link-preview cards…';
    dialog.showModal();

    buildCardFiles().then(function (cards) {
      cards.forEach(function (card) { offerImageFile(card.path, card.text); });
      document.getElementById('export-summary').textContent =
        works + ' works and ' + rulings + ' fatawa, in ' + (model.categories || []).length +
        ' categories. Checked — the file parses. ' +
        writtenWorks + (writtenWorks === 1 ? ' work page' : ' work pages') +
        (writtenPosts ? ' and ' + writtenPosts + (writtenPosts === 1 ? ' post page' : ' post pages') : '') +
        ', and ' + cards.length + (cards.length === 1 ? ' card' : ' cards') + ', below.';
    });
  });

  document.getElementById('close-dialog').addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('click', function (event) {
    var copyTarget = event.target.getAttribute('data-copy');
    if (copyTarget) {
      var area = document.getElementById(copyTarget);
      area.select();
      try {
        document.execCommand('copy');
        event.target.textContent = 'Copied';
        setTimeout(function () { event.target.textContent = 'Copy'; }, 1600);
      } catch (error) {
        window.alert('Could not copy automatically. The text is selected — press Ctrl/Cmd+C.');
      }
      return;
    }
    var name = event.target.getAttribute('data-download');
    if (name) {
      var link = document.createElement('a');
      if (event.target.hasAttribute('data-base64')) {
        link.href = 'data:image/jpeg;base64,' + event.target.getAttribute('data-base64');
        link.download = name;
        link.click();
      } else {
        var text = document.getElementById(event.target.getAttribute('data-source')).value;
        link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
        link.download = name;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    }
  });

  window.addEventListener('beforeunload', function (event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });


  /* ---- Publishing -----------------------------------------------------

     Commits straight to GitHub so a short note does not cost three visits
     to the website. Everything changed goes into ONE commit through the
     git data API — blobs, then a tree, then a commit, then move the
     branch — so the library and its sitemap can never land half updated.

     The token is a key to the repository. It is held in sessionStorage by
     default, which the browser drops when it closes; "keep it on this
     device" moves it to localStorage, which is convenient and less safe.
     It is never written into the page or the URL. */

  var REPO = { owner: 'TahirQadri88', name: 'PersonalWebsite', branch: 'main' };

  /* ---- Where a publish goes ------------------------------------------

     Served from admin.tahirqadri.com.pk, the editor is sitting behind
     Cloudflare Access and a Worker is on the same origin. Publishing then
     means posting the files to /publish and letting the Worker commit
     them: the GitHub token lives there as a secret and never touches this
     device. The Access cookie is what identifies you, so there is nothing
     to type and nothing to keep.

     Opened any other way — from the file system, or from the public
     address — there is no Worker to call, so it falls back to asking for
     a GitHub token as before. `Files…` works everywhere regardless. */
  var BACKEND = location.protocol === 'https:' && /^admin\./.test(location.hostname)
    ? '/publish'
    : '';

  /* ---- Is the deployed Worker the one this editor expects? ------------

     The Worker is deployed by hand, on its own. This page is not: the
     Worker fetches it from the public address every time, so the editor
     is always current and the Worker may be anything. Nothing said so
     until a publish had already sent half the library and stopped on the
     rest — the Worker was a week old, and did not count works/ or
     files/cards/ among the paths it would write.

     Two questions, then, asked before anything is written rather than
     during. The version catches a Worker somebody changed and recorded.
     The paths catch one they changed and did not: whatever the version
     claims, a Worker that will not take a work page cannot publish this
     library, and it is better to hear that on load. */
  var WORKER_EXPECTS = '2026-08-21.2';

  /* This editor's own version, bumped whenever admin.js changes in a way
     a publish depends on. It exists because a tab left open goes on
     running the code it loaded with, however long ago that was, and the
     result is not an error — it is worse. The old code rebuilds every
     page exactly as it already stands, the Worker finds nothing
     differing, and the publish reports success while the edit sits in a
     browser nobody reloads. That is not a hypothetical: an update to a
     post was lost to it. */
  var EDITOR_VERSION = '2026-08-21.2';

  /* One of each kind of file a publish sends, as a specimen to test the
     Worker's own list against — not real names, just shapes. */
  var WRITES = ['content.js', 'sitemap.xml', 'index.html', 'posts/a.html', 'works/a.html',
                'apps/a.html', 'files/cards/a.jpg'];

  function workerTrouble(report) {
    var patterns = [];
    (report.writable || []).forEach(function (source) {
      try { patterns.push(new RegExp(source)); } catch (error) { /* not one we can read */ }
    });
    var refused = WRITES.filter(function (path) {
      return !patterns.some(function (pattern) { return pattern.test(path); });
    });
    if (refused.length) {
      return 'The Worker deployed at ' + location.hostname + ' will not write ' +
        refused.join(' or ') + ', which this editor publishes.';
    }
    if (report.version !== WORKER_EXPECTS) {
      return 'The Worker deployed at ' + location.hostname + ' is version ' +
        (report.version || 'unknown') + '; this editor expects ' + WORKER_EXPECTS + '.';
    }
    return '';
  }

  /* Two things check on load whether this page can publish what it thinks
     it can — the Worker's version and the editor's own — and both say so
     in the same box. Each adds a line rather than replacing what is
     there: they are independent faults, a tab old enough to matter can be
     pointed at a Worker old enough to matter, and writing textContent
     meant whichever answer came back second was the only one seen. */
  function warnOnLoad(text) {
    var box = document.getElementById('worker-status');
    if (!box) return;
    var line = document.createElement('span');
    line.className = 'admin-status-line';
    line.textContent = text;
    box.appendChild(line);
    box.hidden = false;
  }

  function sayWorkerIsOld(what) {
    /* Refused outright, not half done: the Worker checks every file
       before it writes any of them, so a publish it will not accept
       leaves the repository exactly as it was. Worth saying — the
       question on reading this is whether something is now half
       published. */
    warnOnLoad(what +
      ' Publishing will be refused, and nothing committed, until it is brought up to date:' +
      ' in Cloudflare open the Worker → Edit code, replace all of it with' +
      ' worker/src/index.js from the repository, and Deploy.');
  }

  /* Is this tab running the editor the site is currently serving?

     Asks for admin.js again, past the cache, and reads the version out of
     the text rather than trusting a header — a tab that has been open for
     hours has the old file in memory, not in any cache a header governs.
     Behind the Worker this resolves the same way, since it proxies every
     path through to the public site.

     Silent when it cannot tell. A check that fails must never block a
     publish or claim something is wrong: opened from the file system
     there is nothing to fetch, and that is not a fault. */
  function checkEditor() {
    fetch('admin.js', { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('no admin.js');
        return response.text();
      })
      .then(function (source) {
        var match = /var EDITOR_VERSION = '([^']+)'/.exec(source);
        if (!match || match[1] === EDITOR_VERSION) return;
        warnOnLoad(
          'This tab is running an older copy of the editor — version ' + EDITOR_VERSION +
          ', where the site is now serving ' + match[1] + '. Reload before publishing.' +
          ' An old tab rebuilds every page the way it used to be, which is what is' +
          ' already published, so a publish from here can report success and commit' +
          ' nothing at all.');
      })
      .catch(function () { /* cannot tell, so says nothing */ });
  }

  function checkWorker() {
    if (!BACKEND) return;
    fetch('/version')
      .then(function (response) {
        /* A Worker older than this check has no /version to answer with.
           The request falls through to its pass-through instead and comes
           back as the public site's own 404 — HTML, not JSON. Either way
           it is not a Worker that can say, which is itself the answer. */
        if (!response.ok) throw new Error('no /version');
        return response.json();
      })
      .then(function (report) {
        var trouble = workerTrouble(report);
        if (trouble) sayWorkerIsOld(trouble);
      })
      .catch(function () {
        sayWorkerIsOld('The Worker deployed at ' + location.hostname +
          ' is too old to say which version it is.');
      });
  }

  /* ---- Signing in ----------------------------------------------------

     Fill these two in and the passphrase box becomes a real login: the
     editor signs in against your Firebase project and sends the ID token
     Google issues, which the Worker verifies before it commits anything.
     Leave them empty and the passphrase latch below is all there is.

     `apiKey` is not a secret. Firebase web keys identify a project, they
     do not authorise anything — what authorises is the signed-in user,
     and the Worker checks that. It is meant to be in the page. */
  var FIREBASE = {
    apiKey: 'AIzaSyAqRt1iipb_cJXg2kmB3sN16faagl39Ibo',
    project: 'tahirqadri-website'
  };

  var SIGNED_IN = 'editor-firebase-session';

  function firebaseConfigured() {
    return Boolean(FIREBASE.apiKey && FIREBASE.project);
  }

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SIGNED_IN) || 'null');
    } catch (error) {
      return null;
    }
  }

  function writeSession(session) {
    try {
      sessionStorage.setItem(SIGNED_IN, JSON.stringify(session));
    } catch (error) { /* private mode */ }
  }

  function identityCall(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (response.ok) return data;
        var reason = (data && data.error && data.error.message) || ('HTTP ' + response.status);
        /* Google's wording is for developers. These three are the ones a
           person actually hits. */
        if (/EMAIL_NOT_FOUND|INVALID_PASSWORD|INVALID_LOGIN_CREDENTIALS/.test(reason)) {
          reason = 'That email and password do not match.';
        }
        if (/TOO_MANY_ATTEMPTS/.test(reason)) reason = 'Too many tries. Wait a few minutes.';
        throw new Error(reason);
      });
    });
  }

  function signIn(email, password) {
    return identityCall(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + encodeURIComponent(FIREBASE.apiKey),
      { email: email, password: password, returnSecureToken: true }
    ).then(function (data) {
      writeSession({
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (Number(data.expiresIn || 3600) - 120) * 1000,
        email: data.email
      });
      return data;
    });
  }

  /* An ID token lasts an hour. A long editing session outlives it, so it
     is exchanged for a fresh one before it goes rather than after — a
     publish that fails on an expired token is a publish you have to think
     about. */
  function freshToken() {
    var session = readSession();
    if (!session) return Promise.reject(new Error('not signed in'));
    if (Date.now() < session.expiresAt) return Promise.resolve(session.idToken);
    return identityCall(
      'https://securetoken.googleapis.com/v1/token?key=' + encodeURIComponent(FIREBASE.apiKey),
      { grant_type: 'refresh_token', refresh_token: session.refreshToken }
    ).then(function (data) {
      session.idToken = data.id_token;
      session.refreshToken = data.refresh_token;
      session.expiresAt = Date.now() + (Number(data.expires_in || 3600) - 120) * 1000;
      writeSession(session);
      return session.idToken;
    });
  }
  var TOKEN_KEY = 'editor-github-token';

  function readToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function writeToken(value, remember) {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, value);
    } catch (error) { /* private mode */ }
  }

  function forgetToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch (error) { /* private mode */ }
  }

  /* UTF-8 to base64, in chunks so a long file does not blow the argument
     limit of String.fromCharCode. */
  function toBase64(text) {
    return bytesToBase64(new TextEncoder().encode(text));
  }

  /* The same chunking, but for bytes already raw — a card image, not
     text re-encoded as UTF-8, which would corrupt it. */
  function bytesToBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  var status = document.getElementById('publish-status');
  var publishButton = document.getElementById('publish');

  /* The Publish button rides in the bar at the top; this line does not.
     On a phone, part way down a long piece, that meant pressing Publish
     and seeing nothing happen at all — the answer was on screen, several
     screens away. So the button says what it is doing while it does it,
     and anything final brings the line into view rather than waiting to
     be found. */
  function say(message, kind, items) {
    status.className = 'admin-status' + (kind ? ' is-' + kind : '');
    status.textContent = message;
    if (items && items.length) {
      var list = document.createElement('ul');
      list.className = 'admin-status-list';
      items.forEach(function (item) {
        var line = document.createElement('li');
        line.textContent = item;
        list.appendChild(line);
      });
      status.appendChild(list);
    }
    if (kind) bring(status);
  }

  /* Only when it is not already there — scrolling a page that is already
     showing the thing is a jolt with nothing gained. */
  function bring(node) {
    var box = node.getBoundingClientRect();
    if (box.top >= 60 && box.bottom <= window.innerHeight) return;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function busy(on, label) {
    publishButton.disabled = on;
    publishButton.textContent = on ? (label || 'Publishing…') : 'Publish';
  }

  function api(path, token, options) {
    var settings = options || {};
    return fetch('https://api.github.com/repos/' + REPO.owner + '/' + REPO.name + path, {
      method: settings.method || 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: settings.body ? JSON.stringify(settings.body) : undefined
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          var reason = data && data.message ? data.message : 'HTTP ' + response.status;
          if (response.status === 401) reason = 'the token was refused — it may be wrong or expired';
          if (response.status === 403 || response.status === 404) {
            reason = 'the token cannot write to ' + REPO.owner + '/' + REPO.name +
              ' — check it has Contents: Read and write on this repository';
          }
          throw new Error(reason);
        }
        return data;
      });
    });
  }

  /* Everything the current state of the editor should write. */
  /* A Promise, not a plain array — rendering every card is the one part
     of a publish that can't happen synchronously, since it waits on
     fonts and on the canvas itself. */
  function filesToCommit() {
    var out = [{ path: 'content.js', text: buildContent() }, { path: 'sitemap.xml', text: buildSitemap() }];
    /* problems() has already refused a publish that could not splice this,
       so reaching here with no text means there was nothing to write. */
    if (indexHtml) {
      var home = buildIndex(indexHtml);
      if (home.text) out.push({ path: 'index.html', text: home.text });
    }
    allRecords().forEach(function (entry) {
      if (isApp(entry)) {
        /* Regenerated in full every publish, like a work's own page:
           nothing about an app lives anywhere but content.js, so there is
           no "has the writing changed" question to answer for it. */
        if (entry.record.page) out.push({ path: entry.record.page, text: buildApp(entry.record, entry) });
      } else if (isPost(entry)) {
        if (!entry.record.page || bodies[entry.record.id] === undefined) return;
        out.push({ path: entry.record.page, text: buildPost(entry.record, entry) });
      } else {
        out.push({ path: 'works/' + entry.record.id + '.html', text: buildWork(entry.record, entry) });
      }
    });
    return buildCardFiles().then(function (cards) { return out.concat(cards); });
  }

  function commitAll(token, files, message) {
    var head;
    return api('/git/ref/heads/' + REPO.branch, token)
      .then(function (ref) {
        head = ref.object.sha;
        return api('/git/commits/' + head, token);
      })
      .then(function (commit) {
        var baseTree = commit.tree.sha;
        return Promise.all(
          files.map(function (file) {
            /* A card image's `text` is already base64 — see buildCardFiles
               — everything else is UTF-8 that still needs encoding. */
            var content = file.binary ? file.text : toBase64(file.text);
            return api('/git/blobs', token, {
              method: 'POST',
              body: { content: content, encoding: 'base64' }
            }).then(function (blob) {
              return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha };
            });
          })
        ).then(function (tree) {
          return api('/git/trees', token, { method: 'POST', body: { base_tree: baseTree, tree: tree } });
        });
      })
      .then(function (tree) {
        return api('/git/commits', token, {
          method: 'POST',
          body: { message: message, tree: tree.sha, parents: [head] }
        });
      })
      .then(function (commit) {
        return api('/git/refs/heads/' + REPO.branch, token, {
          method: 'PATCH',
          body: { sha: commit.sha }
        }).then(function () {
          return commit;
        });
      });
  }

  var tokenDialog = document.getElementById('token-dialog');
  var tokenInput = document.getElementById('token');
  var tokenRemember = document.getElementById('token-remember');
  var tokenError = document.getElementById('token-error');
  var publishing = false;

  /* The Worker does the same work commitAll does, on the other side of
     the wire. It answers with the commit it made, or with a sentence
     saying why it made none. */
  function commitViaBackend(files, message) {
    /* Firebase proves who you are with a token in the header. Cloudflare
       Access proves it with a cookie the browser sends by itself. */
    var withToken = firebaseConfigured() ? freshToken() : Promise.resolve('');
    return withToken.then(function (token) {
      var headers = { 'content-type': 'application/json' };
      if (token) headers.Authorization = 'Bearer ' + token;
      return fetch(BACKEND, {
        method: 'POST',
        credentials: 'include',
        headers: headers,
        body: JSON.stringify({ files: files, message: message })
      });
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (response.ok) return data;
        if (response.status === 401 || response.status === 403) {
          throw new Error((data.message || 'you are not signed in') + ' Reload the page and sign in again.');
        }
        throw new Error(data.message || 'HTTP ' + response.status);
      });
    });
  }

  function publish(token) {
    if (publishing) return;
    var found = problems();
    if (found.length) {
      say('Fix these first:', 'bad', found);
      return;
    }

    publishing = true;
    busy(true, 'Drawing…');
    say('Drawing this publish’s cards…');

    filesToCommit()
      .then(function (files) {
        var content = files[0].text;
        try {
          var check = {};
          new Function('window', content).call(check, check);
          if (!check.siteContent || !check.siteContent.categories) throw new Error('no categories');
        } catch (error) {
          var wrapped = new Error('The generated content.js did not parse, so nothing was sent: ' + error.message);
          wrapped.silent = true;
          throw wrapped;
        }

        busy(true, 'Publishing…');
        say('Publishing ' + files.length + (files.length === 1 ? ' file…' : ' files…'));
        var titles = files.map(function (file) { return file.path; }).join(', ');
        return BACKEND
          ? commitViaBackend(files, 'Update from the editor')
          : commitAll(token, files, 'Update from the editor\n\n' + titles);
      })
      .then(function (commit) {
        publishing = false;
        busy(false);
        /* Read before it is cleared, three lines down. Whether anything
           was edited is the difference between the two readings of an
           empty commit below. */
        var hadEdits = dirty;
        dirty = false;
        dirtyNote.textContent = '';
        /* The Worker sends back what it actually wrote, which is not what
           it was handed: the whole library goes over, and only the files
           that differ from the branch are committed. Saying "3 files"
           after offering 46 is the truthful number, and the one that
           makes it obvious when a change did not take. */
        var wrote = (commit.files || []).length;
        if (!commit.sha) {
          /* Nothing differing is a fine answer to a publish you made
             without changing anything. It is the opposite of fine when
             you just edited something, and this used to say so in the
             same green as a real publish — so an edit that never left the
             browser read as an edit that went out. It happened: an update
             to a post was published from a tab left open since before the
             site last changed, that tab regenerated every page exactly as
             it already stood, and the editor called it success. */
          if (!hadEdits) {
            say(commit.message || 'Nothing had changed, so nothing was published.', 'good');
            return;
          }
          say('Your changes did not go out. The publish reached the repository, ' +
            'but every file it sent was identical to what is already there — so ' +
            'nothing was committed and the site is unchanged.', 'bad', [
              'The usual cause is this tab: left open since before the site last ' +
                'changed, it rebuilds every page the old way, and the old way is ' +
                'what is already published. Reload the editor and try again.',
              'If you were editing a post, open its row after reloading so its ' +
                'writing is read back before you publish.'
            ]);
          return;
        }
        say('Published ' + wrote + (wrote === 1 ? ' file' : ' files') +
          '. The site rebuilds in about a minute. Commit ' + commit.sha.slice(0, 7) + '.', 'good');
      })
      .catch(function (error) {
        publishing = false;
        busy(false);
        say(error && error.silent ? error.message : 'Nothing was published: ' + error.message, 'bad');
        /* This dialog asks for a personal GitHub token, which only means
           anything in the no-backend path — behind the Worker there is
           nothing to type into it, and re-opening it there sends the
           same request again with the same result, which reads as the
           editor being stuck. It used to open on the word "token"
           appearing anywhere in the error, which also matched two
           messages that have nothing to do with a token this device
           could supply: the Worker's own stored GitHub secret expiring,
           and a sign-in that has lapsed. Both are real, both are already
           said plainly on the line above — reload and sign in again for
           the second, a new `wrangler secret put GITHUB_TOKEN` for the
           first, worker/README.md has both. */
        if (!BACKEND && !(error && error.silent) && /token/.test(error.message)) {
          tokenError.textContent = error.message;
          tokenDialog.showModal();
        }
      });
  }

  document.getElementById('publish').addEventListener('click', function () {
    /* Check before asking for anything. Handing over a token and only
       then being told a post has no writing in it is the wrong order to
       find that out in. */
    var found = problems();
    if (found.length) {
      say('Fix these first:', 'bad', found);
      return;
    }

    /* Behind the backend there is nothing to ask for — the Worker holds
       the token, and the sign-in says who you are. */
    if (BACKEND) {
      publish('');
      return;
    }
    var token = readToken();
    if (token) {
      publish(token);
      return;
    }
    tokenError.textContent = '';
    tokenInput.value = '';
    tokenDialog.showModal();
  });

  document.getElementById('token-form').addEventListener('submit', function () {
    var value = tokenInput.value.trim();
    if (!value) return;
    writeToken(value, tokenRemember.checked);
    tokenInput.value = '';
    publish(value);
  });

  document.getElementById('token-forget').addEventListener('click', function () {
    forgetToken();
    tokenError.textContent = 'Forgotten. You will be asked again next time you publish.';
  });

  /* ---- Unlocking ---- */

  function digest(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buffer) {
      return Array.prototype.map
        .call(new Uint8Array(buffer), function (byte) { return byte.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  function unlock() {
    document.body.classList.remove('is-locked');
    try { sessionStorage.setItem('editor-open', '1'); } catch (error) { /* private mode */ }
    render();
    loadIndex();
    checkWorker();
    checkEditor();
  }

  var gateForm = document.getElementById('gate-form');
  var gateError = document.getElementById('gate-error');
  var emailInput = document.getElementById('email');
  var passInput = document.getElementById('pass');

  /* With Firebase configured the gate is a real sign-in rather than a
     latch: the email and password go to Google, and what comes back is a
     token the Worker can check. The passphrase, which only ever hid the
     page from passers-by, is not asked for at all. */
  if (firebaseConfigured()) {
    document.getElementById('email-label').hidden = false;
    emailInput.hidden = false;
    document.getElementById('pass-label').textContent = 'Password';
    passInput.autocomplete = 'current-password';
    emailInput.focus();
    document.querySelector('.gate-note').textContent =
      'Signing in is what lets you publish. The words you type go to Firebase, ' +
      'never into this page, and nothing that can write to GitHub is kept on this device.';
  }

  gateForm.addEventListener('submit', function (event) {
    event.preventDefault();
    gateError.textContent = '';

    if (firebaseConfigured()) {
      var email = emailInput.value.trim();
      if (!email || !passInput.value) {
        gateError.textContent = 'Both, please.';
        return;
      }
      gateError.textContent = 'Signing in…';
      signIn(email, passInput.value).then(function () {
        passInput.value = '';
        gateError.textContent = '';
        unlock();
      }).catch(function (error) {
        gateError.textContent = error.message;
        passInput.select();
      });
      return;
    }

    digest(passInput.value).then(function (hash) {
      if (hash === PASS_HASH) {
        unlock();
      } else {
        gateError.textContent = 'Not that one.';
        passInput.select();
      }
    });
  });

  /* Stays open for the rest of the browser session, so a reload while
     writing does not ask again. With Firebase that shortcut is only taken
     when there is still a session to go with it — otherwise the page
     would open and the first publish would fail on a token it never had. */
  var alreadyOpen = false;
  try { alreadyOpen = sessionStorage.getItem('editor-open') === '1'; } catch (error) { /* private mode */ }
  if (firebaseConfigured() && !readSession()) alreadyOpen = false;
  if (alreadyOpen) unlock();
})();
