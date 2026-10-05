/* Shared helpers. Loaded by both index.html and work.html. */

(function () {
  'use strict';

  var content = window.siteContent || { categories: [], rulings: [], site: {} };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function scriptClass(language) {
    if (language === 'ur') return 'urdu';
    if (language === 'ar') return 'arabic';
    return 'latin';
  }

  function direction(language) {
    return language === 'ur' || language === 'ar' ? 'rtl' : 'ltr';
  }

  /* Renders a title in the right script, direction and font. `record-title`
     is what lets an Urdu title take the heading face — see styles.css —
     without touching an in-prose subheading or a label that happens to
     share the same script class. */
  function titleMarkup(record, tag) {
    var element = tag || 'span';
    var language = record.language || 'en';
    return (
      '<' + element + ' class="record-title ' + scriptClass(language) + '" lang="' + language + '" dir="' + direction(language) + '">' +
      escapeHtml(record.title) +
      '</' + element + '>'
    );
  }

  /* True when a string contains any Arabic-script letter. Used for file
     labels, which the author writes in whichever script suits the
     document — a label reading احرام کیا ہے must not come out in the
     Latin UI font. */
  var ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
  var ARABIC_CHARS = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/g;
  var LATIN_CHARS = /[A-Za-zÀ-ɏḀ-ỿ]/g;

  function isArabicScript(value) {
    return ARABIC_SCRIPT.test(String(value == null ? '' : value));
  }

  /* Which script a passage is mostly written in.

     "A restructured summary of Aʿlā Ḥaḍrat's أجلى الإعلام" is an English
     sentence with an Arabic title quoted inside it. Asking only whether
     any Arabic letter was present called the whole thing Arabic, so the
     sentence was set right to left in Nastaliq and came out reversed on
     the page. Counting decides it instead: the script that owns most of
     the letters owns the paragraph. */
  function dominantScript(value) {
    var text = String(value == null ? '' : value);
    var arabic = (text.match(ARABIC_CHARS) || []).length;
    if (!arabic) return 'latin';
    return arabic >= (text.match(LATIN_CHARS) || []).length ? 'arabic' : 'latin';
  }

  /* `dominantScript` answers Arabic-script or Latin, which settles the
     *direction*. It cannot settle the *face*, because Urdu and Arabic are
     the same script and want different ones — Nastaliq and Naskh. This is
     what tells them apart, and it lived in `admin.js` alone, which is why
     the site's own renderers could only ever ask the record what language
     a passage was in. See `proseMarkup`.

     Urdu is told from Arabic by the letters Urdu added and Arabic does
     not use — ٹ ڈ ڑ ں ھ ہ ے ژ گ چ پ. A Qur'anic verse has none of them
     and stays Arabic, which is what a verse quoted inside an Urdu piece
     needs. Counting, not detecting: a line is whichever script most of
     its letters belong to, so an Urdu sentence with one English term in
     it stays Urdu. */
  var SCRIPT_RANGE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;

  /* The two alphabets overlap almost entirely, so telling them apart is
     done on the letters where they differ — and the decisive pair is the
     commonest letters in both. Urdu writes ی and ک where Arabic writes
     ي and ك; they look nearly the same and are different characters.
     Leaving those two out was enough to call "ایک دو تین" Arabic and set
     three ordinary Urdu words in Amiri.

     Counted rather than tested for, since a piece of Urdu quoting Arabic
     has some of both and should come out as whichever it mostly is. */
  var URDU_LETTERS = /[ٹپچڈڑژکگںھہۂۃیےۓ]/g;
  var ARABIC_LETTERS = /[أإةكي]/g;

  function scriptOf(text, prefer) {
    var body = String(text || '');
    var rtl = (body.match(SCRIPT_RANGE) || []).length;
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

  /* Escapes a passage, wrapping each Arabic-script run in a span so it
     takes an Arabic face. Neither Newsreader nor DM Sans has any Arabic
     in it, so a phrase quoted inside an English line fell to whatever
     the system happened to substitute. The paragraph itself stays left
     to right — only the run inside it is marked. */
  var ARABIC_RUN = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿][؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿  ]*/g;

  function mixedMarkup(value) {
    var text = String(value == null ? '' : value);
    var out = '';
    var last = 0;
    var match;
    ARABIC_RUN.lastIndex = 0;
    while ((match = ARABIC_RUN.exec(text))) {
      /* A run may have swallowed the space that separates it from the
         next English word. Give it back, or the two collide. */
      var run = match[0].replace(/[\s ]+$/, '');
      out += escapeHtml(text.slice(last, match.index));
      out += '<span class="arabic-inline" lang="ar" dir="rtl">' + escapeHtml(run) + '</span>';
      last = match.index + run.length;
      ARABIC_RUN.lastIndex = last;
    }
    return out + escapeHtml(text.slice(last));
  }

  /* A link to a file, and beside it a link that saves it.

     Clicking a PDF used to open it in the browser's viewer and nothing
     else, so a reader who wanted the file on their device had to wait
     for the whole thing to render first — slow work on a phone with a
     long booklet. The two are now separate: the title opens it to read,
     the second link puts it on the device.

     `download` only works on files served from this site. A link to
     Google Drive or anywhere else is another origin, and the browser
     ignores the attribute there — so that file offers opening only,
     rather than a Save that quietly does something else. */
  var OFFSITE = /^[a-z][a-z0-9+.-]*:/i;

  /* Drawn, not typed. These were an arrow and a down-arrow borrowed from
     the UI font, with U+FE0E after each to ask for the written shape —
     because neither Nastaliq nor Naskh contains an arrow, so inside an
     Urdu-labelled link the browser went hunting and on an iPhone found
     Apple Color Emoji and drew a blue tile. A drawing has no such
     problem: it is the same mark in every face and every script, and it
     matches the rest of the set instead of borrowing a character's
     weight. Called where they are used, not stored in a var — ICONS is
     declared further down, and a var read at load time would be reading
     it before it exists. */

  function fileLinks(record, className) {
    if (!record.files || !record.files.length) return '';
    return record.files
      /* A picture is left to imageGallery, which shows it and links the
         thumbnail to the full-size original. It used to come out twice —
         once as a button reading "Read Part 1 online" and again as the
         thumbnail of the very same file directly underneath. The
         halloween ruling has shipped three of those for months; this
         fatwa would have added four more.

         The gallery is the better half of the pair: it shows what the
         thing is instead of naming it, and a reader who wants the file
         itself opens it from there. */
      .filter(function (file) { return !isImage(file.url); })
      .map(function (file) {
        var label = file.label || 'Open';
        /* file.language wins if the author set it; otherwise the script is
           read off the label, so no existing entry needs editing. */
        var language = file.language || (isArabicScript(label) ? 'ur' : 'en');
        var rtl = language === 'ur' || language === 'ar';
        var url = escapeHtml(file.url);
        /* This link has always opened the document in the browser —
           target="_blank", no `download` attribute — and the one beside
           it has always been the one that saves a copy. Nothing said so.
           A reader looking at "Urdu PDF" next to "Download" has to guess
           what the first one does, and the guess most people make is
           that it does the same thing.

           So the button says what it does. "Read Urdu PDF online" beside
           "Download" is two different offers rather than a name and an
           action.

           Only where the label is Latin, and this is not tidiness. When
           the label is one of the six Urdu chart names the whole anchor
           carries dir="rtl", and English words placed inside it are laid
           out by that direction — "Read" and "online" would be reordered
           around the name rather than reading as a sentence. There the
           name stands alone, which is what it already was, and the
           sentence goes where it can be read in one script: the
           accessible name, which a screen reader announces on its own. */
        var says = 'Read ' + label + ' online';
        var open =
          '<a class="' + (className || 'document-link') + (rtl ? ' ' + scriptClass(language) : '') + '"' +
          (rtl ? ' lang="' + language + '" dir="rtl" aria-label="' + escapeHtml(says) + '"' : '') +
          ' title="' + escapeHtml(says) + '"' +
          ' href="' + url + '" target="_blank" rel="noopener">' +
          escapeHtml(rtl ? label : says) + ' ' + icon('open', 'icon-inline') + '</a>';
        if (OFFSITE.test(String(file.url || ''))) return '<span class="file-item">' + open + '</span>';
        return (
          '<span class="file-item">' + open +
          '<a class="file-download" href="' + url + '" download' +
          ' aria-label="Download ' + escapeHtml(label) + '">' +
          'Download ' + icon('download', 'icon-inline') + '</a>' +
          '</span>'
        );
      })
      .join('');
  }

  /* Every record has its own page now, generated once and committed —
     `posts/<id>.html` for a post, `works/<id>.html` for anything else, so
     a work or a fatwa has real title, description and image tags a
     crawler can read without running a script. `work.html?work=<id>`
     still exists and still opens the right thing — old links, already
     shared, must not break — but it is a redirect now, not the page. */
  function ownPage(record) {
    return record.page || 'works/' + record.id + '.html';
  }

  function recordHref(record) {
    return ownPage(record);
  }

  function isOffsite(url) {
    return OFFSITE.test(String(url || ''));
  }

  /* "2026-08-02" -> "2 August 2026". Returns '' for anything unparseable
     rather than the word Invalid. */
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  function formatDate(value) {
    var parts = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!parts) return '';
    var month = MONTHS[Number(parts[2]) - 1];
    if (!month) return '';
    return Number(parts[3]) + ' ' + month + ' ' + parts[1];
  }

  /* What a record is, in one line: how many files and in what format, the
     languages they are in, and the date if there is one. Nothing here is a
     new field — it is all read off what content.js already holds, so no
     existing entry has to be edited for a row to start saying it.

     Set in Latin whatever the piece is written in. This line is 12px,
     uppercase and tracked, which is a Latin device; Nastaliq at that size
     and with that tracking cannot be read, and giving it the leading it
     needs would make the line twice the height of the title above it. */
  /* Every `kind` in content.js is written in Urdu, because Urdu is the
     language the library is catalogued in. A piece that reads left to
     right needs the same word in English: an English essay was labelled
     مضمون on its own row, on its page and on its share card, and the
     caption dropped the label altogether rather than translate it.

     A table here rather than a second field on every entry — the kinds
     are a small closed set the author reuses, so this is written once
     instead of twenty-three times, and no entry in content.js changes.
     A kind with no line here falls through as itself, which is the right
     way to fail: the Urdu word is better than no word at all.

     These are renderings, not the author's own English. Change them
     here and every place that shows a kind follows. */
  var KIND_IN_ENGLISH = {
    'رسالہ': 'Booklet',
    'تحقیقی رسالہ': 'Research booklet',
    'فتویٰ': 'Fatwa',
    'ترجمہ و تخریج': 'Translation & takhrīj',
    'چارٹس': 'Charts',
    'پریزینٹیشن': 'Presentation',
    'معلوماتی پمفلٹ': 'Information pamphlet',
    'رسالہ و پریزینٹیشن': 'Booklet & presentation',
    'تلخیص': 'Summary',
    'مضمون': 'Essay',
    'ایپ': 'App'
  };

  /* The kind a record should show, in the language the record reads in.
     The fatwa default lives here too, so the row, the page and the card
     cannot disagree about what an untitled ruling is called — they each
     used to carry their own copy of that fallback, and one of them
     didn't have it. */
  function recordKind(record) {
    if (!record) return '';
    var kind = record.kind;
    if (!kind && (content.rulings || []).some(function (ruling) { return ruling.id === record.id; })) {
      kind = 'فتویٰ';
    }
    if (!kind) return '';
    return direction(record.language) === 'rtl' ? kind : (KIND_IN_ENGLISH[kind] || kind);
  }

  /* The kind as an element, in whichever script it came out in — the
     three places that show one (the library row, a record's own page,
     the page work.js falls back to) each wrote this markup themselves,
     and each had to remember that the Urdu word needs `lang`, `dir` and
     a font the Latin one must not take. */
  function kindMarkup(record, className, tag) {
    var kind = recordKind(record);
    if (!kind) return '';
    var element = tag || 'span';
    var rtl = isArabicScript(kind);
    return (
      '<' + element + ' class="' + (className || 'work-kind') + ' ' + (rtl ? 'urdu' : 'latin') + '"' +
      ' lang="' + (rtl ? 'ur' : 'en') + '" dir="' + (rtl ? 'rtl' : 'ltr') + '">' +
      escapeHtml(kind) +
      '</' + element + '>'
    );
  }

  /* ---- The icon set -------------------------------------------------

     Line drawings, one grid: 24x24, no fill, stroke in currentColor at
     1.5, round caps and joins. Stroke-only and currentColor together mean
     one drawing serves everywhere — gold on a category head, moss inside
     a link, cream on the dark fatawa panel — with no second copy per
     surface and no colour to keep in step with the tokens.

     Inline, as one hidden sprite of <symbol>s written into the page once,
     and then ~55 bytes wherever an icon is used. That is the whole cost:
     no request, no icon font, no build step, and `<use href="#id">` is
     same-document so index.html still opens straight off the disk. An
     icon font would be twenty to forty kilobytes and a request; eleven
     .svg files would be eleven requests; both are dependencies the site
     does not take.

     Same shape as `alignIcon` in admin.js, which already draws the
     editor's own toolbar this way. */
  var ICONS = {
    /* An open book — رسائل و تالیفات */
    booklet: [
      'M12 7v12',
      'M12 7c-1.6-1.4-3.8-2.1-6.5-2.1H3v12h2.5c2.7 0 4.9.7 6.5 2.1',
      'M12 7c1.6-1.4 3.8-2.1 6.5-2.1H21v12h-2.5c-2.7 0-4.9.7-6.5 2.1'
    ],
    /* A bound volume with a bookmark in it — تحقیق، تخریج و ترجمہ */
    manuscript: [
      'M5.5 3.5h13A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V5a1.5 1.5 0 0 1 1.5-1.5z',
      'M7.5 3.5v17',
      'M12.5 3.5v7l2.2-1.7 2.2 1.7v-7'
    ],
    /* A folded pamphlet, three panels — نقشہ جات و معلوماتی پمفلٹس */
    chart: [
      'M9 4.5 3.5 6.5v13L9 17.5z',
      'M9 4.5l6 2v13l-6-2z',
      'M15 6.5l5.5-2v13l-5.5 2z'
    ],
    /* Books on a shelf, one leaning — آسان علمی مواد */
    books: [
      'M4 8h3.5v11.5H4z',
      'M8.5 5.5H12v14H8.5z',
      'M13.6 8.3l3.3-.9 3.1 11.3-3.3.9z',
      'M3 20.5h18'
    ],
    /* A qalam — مضامین و خیالات */
    pen: [
      'M4 20.2l1.2-3.7L16.4 5.3a1.7 1.7 0 0 1 2.4 0l.5.5a1.7 1.7 0 0 1 0 2.4L8.1 19.4z',
      'M14.9 6.8l2.9 2.9'
    ],
    /* A handset with a row of keys on it — ایپس. Not a magnifying glass
       or a cog: what these are is something you open on a phone, and the
       keys say a calculation without needing a calculator's own grid,
       which at 24px closes up into a smudge. */
    app: [
      'M7.5 2.8h9A1.7 1.7 0 0 1 18.2 4.5v15A1.7 1.7 0 0 1 16.5 21.2h-9A1.7 1.7 0 0 1 5.8 19.5v-15A1.7 1.7 0 0 1 7.5 2.8z',
      'M8.8 7.2h6.4',
      'M9.2 11.4h.1M12 11.4h.1M14.8 11.4h.1',
      'M9.2 15.2h.1M12 15.2h.1M14.8 15.2h.1'
    ],
    /* A reply with words in it — مضامین و جوابات */
    response: [
      'M4.5 4.5h15A1.5 1.5 0 0 1 21 6v8.5a1.5 1.5 0 0 1-1.5 1.5H10.5L6 20v-4H4.5A1.5 1.5 0 0 1 3 14.5V6a1.5 1.5 0 0 1 1.5-1.5z',
      'M6.5 9h11',
      'M6.5 12h7'
    ],
    /* A seal with its ribbons — فتاویٰ */
    seal: [
      'M12 3.5a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6z',
      'M9.4 9.3l1.8 1.8 3.4-3.4',
      'M8.7 14.8L7 20.5l5-2.2 5 2.2-1.7-5.7'
    ],
    /* Three nodes and the two lines between them. Not an arrow: the
       comment in `pageTools` rules out a *third arrow*, because ↗ and ↓
       already each say one specific thing and a vague third would weaken
       both. A drawing of the action says what the action is, which is the
       opposite problem, so it is allowed where an arrow was not. */
    share: [
      'M18 2.6a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
      'M6 9.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
      'M18 16.4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z',
      'M8.2 10.9l7.6-4.3',
      'M8.2 13.1l7.6 4.3'
    ],
    /* A sheet going in, the body, and the sheet coming out. */
    print: [
      'M7.5 9.5V4.5h9v5',
      'M7.5 15.5h-2A1.5 1.5 0 0 1 4 14v-3A1.5 1.5 0 0 1 5.5 9.5h13A1.5 1.5 0 0 1 20 11v3a1.5 1.5 0 0 1-1.5 1.5h-2',
      'M7.5 13.5h9v6h-9z'
    ],
    search: [
      'M10.8 4.5a6.3 6.3 0 1 1 0 12.6 6.3 6.3 0 0 1 0-12.6z',
      'M15.4 15.4l4.6 4.6'
    ],
    /* An arrow leaving its frame */
    open: [
      'M13.5 4.5h6v6',
      'M19.5 4.5L11 13',
      'M17 13.5v5A1.5 1.5 0 0 1 15.5 20h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7h5'
    ],
    /* An arrow into a tray */
    download: [
      'M12 3.5v11',
      'M7.6 10.1L12 14.5l4.4-4.4',
      'M4 16.5v2.5A1.5 1.5 0 0 0 5.5 20.5h13a1.5 1.5 0 0 0 1.5-1.5v-2.5'
    ],
    /* A page with a folded corner */
    document: [
      'M6.5 3.5h7l5 5v11a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 5 19.5V5a1.5 1.5 0 0 1 1.5-1.5z',
      'M13.5 3.5v5h5',
      'M8.5 13.5h7',
      'M8.5 16.5h4.5'
    ]
  };

  /* Which drawing belongs to which category, by id. A closed table rather
     than a field on every category, the same way KIND_IN_ENGLISH is —
     content.js does not change, and a category with no line here simply
     shows no icon rather than a wrong one. */
  var CATEGORY_ICON = {
    talifat: 'booklet',
    tahqeeq: 'manuscript',
    charts: 'chart',
    'ilmi-mawad': 'books',
    posts: 'pen',
    apps: 'app',
    maqalat: 'response',
    rulings: 'seal'
  };

  var SPRITE_ID = 'icon-sprite';

  function iconSprite() {
    return Object.keys(ICONS).map(function (name) {
      return '<symbol id="i-' + name + '" viewBox="0 0 24 24">' +
        /* pathLength="1" normalises every stroke to one unit, whatever it
           actually measures. That is what lets one dash pattern draw any
           of these on — see .icon-draw in styles.css — without measuring a
           single path at runtime. */
        ICONS[name].map(function (d) { return '<path pathLength="1" d="' + d + '"/>'; }).join('') +
        '</symbol>';
    }).join('');
  }

  /* Written in once, before anything asks for an icon. Hidden with
     `aria-hidden` as well as `display:none`, since a <symbol> that is
     never <use>d still carries text nodes to some readers. */
  function injectSprite() {
    if (!document.body || document.getElementById(SPRITE_ID)) return;
    var host = document.createElement('div');
    host.id = SPRITE_ID;
    host.setAttribute('aria-hidden', 'true');
    host.style.display = 'none';
    host.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg">' + iconSprite() + '</svg>';
    document.body.insertBefore(host, document.body.firstChild);
  }

  /* Draws each icon on as it arrives, and only then.

     Everything about this is arranged so that not running costs nothing.
     The dash that hides a stroke is applied by a class added here, so the
     default state — no JavaScript, no IntersectionObserver, a reader who
     asked for less motion — is the icon already drawn, exactly as it is
     without this function. Nothing on the page starts invisible waiting
     for a script to reveal it; that is the difference between animating a
     decoration and animating content.

     `stroke-dasharray` and `stroke-dashoffset` are inherited properties,
     which is the only reason this reaches inside <use> at all: the clone
     lives in a shadow tree that outside CSS cannot select, and inheritance
     is the same door `currentColor` already comes through. */
  function drawIconsOnEntry(root) {
    if (!window.IntersectionObserver) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var targets = (root || document).querySelectorAll('.category-icon');
    if (!targets.length) return;

    var seen = 0;
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        /* A short stagger so seven of them read as one movement rather
           than seven. Capped: past a handful the last would be waiting
           long enough to look broken. */
        entry.target.style.setProperty('--draw-delay', Math.min(seen, 5) * 90 + 'ms');
        entry.target.classList.add('icon-draw');
        seen += 1;
        /* Once. An icon that redraws every time it scrolls back into view
           stops being an arrival and becomes a fidget. */
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.5 });

    Array.prototype.forEach.call(targets, function (node) { watcher.observe(node); });
  }

  /* Cards arriving as you reach them — the same argument as the icons
     above, and built the same way round.

     The class this adds is what carries the movement *and* the state it
     moves from. Nothing on the page starts shifted or faded waiting to be
     revealed, so no JavaScript, no IntersectionObserver, or a reader who
     asked for less motion all leave the cards simply where they are.
     That is the difference between animating a decoration and hiding
     content behind a script. */
  function revealOnEntry(selector, root) {
    if (!window.IntersectionObserver) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var targets = (root || document).querySelectorAll(selector);
    if (!targets.length) return;

    var seen = 0;
    var watcher = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        /* Capped, for the same reason the icons' stagger is: past a
           handful the last one waits long enough to look broken. */
        entry.target.style.setProperty('--rise-delay', Math.min(seen, 5) * 70 + 'ms');
        entry.target.classList.add('card-rise');
        seen += 1;
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.2 });

    Array.prototype.forEach.call(targets, function (node) { watcher.observe(node); });
  }

  /* Always decorative: every icon here sits beside a word that already
     says the same thing, so it is hidden from a reader who is listening
     rather than looking, and taken out of the tab order. */
  function icon(name, className) {
    if (!name || !ICONS[name]) return '';
    return (
      '<svg class="icon' + (className ? ' ' + className : '') + '"' +
      ' aria-hidden="true" focusable="false"><use href="#i-' + name + '"/></svg>'
    );
  }

  /* A category's drawing. CATEGORY_ICON is the table that has always
     named one per id; `icon` on the category itself overrules it, so a
     category made in the editor can be given a drawing without anyone
     editing this file. The table stays because the six that were here
     first should not each have to carry a field saying what they have
     always been. */
  function categoryIconName(category) {
    return (category && category.icon) || CATEGORY_ICON[category && category.id] || '';
  }

  function categoryIcon(category, className) {
    return icon(categoryIconName(category), className);
  }

  /* Every drawing there is, for the editor to offer. */
  function iconNames() {
    return Object.keys(ICONS);
  }

  var LANGUAGE_NAMES = { ur: 'Urdu', ar: 'Arabic', en: 'English' };

  /* The label says so on every file here — "Urdu PDF", "English PDF",
     "Arabic PDF" — so read it from there first. A label written in
     Arabic script and nothing else names an Urdu document. Failing both,
     the record's own language, which is never worse than a guess. */
  function fileLanguage(file, fallback) {
    if (file.language) return file.language;
    var label = String(file.label || '');
    if (/urdu/i.test(label)) return 'ur';
    if (/arabic/i.test(label)) return 'ar';
    if (/english/i.test(label)) return 'en';
    if (isArabicScript(label)) return 'ur';
    return fallback || 'en';
  }

  function fileFormat(file) {
    /* A Google Drive link has no extension to read. It is still a document
       — it just cannot say which kind, so it says the honest thing. */
    var match = String(file.url || '').split('?')[0].match(/\.([a-z0-9]+)$/i);
    if (!match) return 'Link';
    var format = match[1].toUpperCase();
    return format === 'JPEG' ? 'JPG' : format;
  }

  /* When a record last said something new: the date it carries, or the
     day it was last edited if it carries none. A work added before there
     was a date field has no `date` and will not gain one until someone
     types it; `updated` is stamped by the editor the moment anything
     about it changes, and is the truer answer to "when was this touched"
     anyway.

     Its own function because two places want it and only one of them
     wants the rest of the meta line: a card in the recently-updated strip
     says kind and date and nothing else, since the format and the
     language are what the library row below it is for. One answer to
     "when", so the row, the card and the page cannot disagree. */
  function recordWhen(record) {
    return formatDate(record.date) || formatDate(record.updated);
  }

  function recordMeta(record) {
    var files = record.files || [];
    /* A work still waiting for its document says "Not published here yet"
       already. A second line naming a language it cannot yet be read in
       would be worse than silence. */
    if (!record.page && !files.length) return [];

    var parts = [];
    /* An app is opened, not read and not downloaded, so neither of the
       other two answers fits it — and it has no single language to name
       either: this one has two, and saying "English" because the title
       happens to be in English describes nothing a reader would get. */
    if (record.app) {
      parts.push('Opens in a browser');
      var when = recordWhen(record);
      if (when) parts.push(when);
      return parts;
    }
    if (record.page) {
      parts.push('Read here');
    } else {
      var formats = [];
      files.forEach(function (file) {
        var format = fileFormat(file);
        if (formats.indexOf(format) === -1) formats.push(format);
      });
      parts.push(
        files.length === 1
          ? formats[0]
          : files.length + ' ' + (formats.length === 1 ? formats[0] + 's' : 'files')
      );
    }

    var languages = [];
    (files.length ? files : [{}]).forEach(function (file) {
      var name = LANGUAGE_NAMES[fileLanguage(file, record.language)];
      if (name && languages.indexOf(name) === -1) languages.push(name);
    });
    parts = parts.concat(languages);

    var date = recordWhen(record);
    if (date) parts.push(date);
    return parts;
  }

  /* Always ltr, whatever the record is: the parts are Latin words, and a
     right-to-left container would reverse their order and put the date
     first. */
  function metaMarkup(record, className) {
    var parts = recordMeta(record);
    if (!parts.length) return '';
    return (
      '<span class="' + (className || 'record-meta') + '" dir="ltr">' +
      parts.map(escapeHtml).join('<span aria-hidden="true"> · </span>') +
      '</span>'
    );
  }

  var IMAGE_FILE = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

  function isImage(url) {
    return IMAGE_FILE.test(String(url || '').split('?')[0]);
  }

  /* Charts and pamphlets are pictures. Showing them beats asking someone
     to download three files to find out what they say. Each thumbnail is
     a link to the full-size original; `preview` names a lighter copy to
     display, and falls back to the file itself when there is none. */
  /* `id` is for the one case where the gallery is the *only* thing a
     record offers: halloween is three infographics and nothing else, so
     with pictures no longer doubling as buttons there is no
     `.work-page-files` div to carry `#work-page-files` — and that id is
     where common.js mounts Share and Print. Exactly one element on the
     page has to have it, and when the pictures are all there is, the
     pictures are that element. It also puts the buttons *after* them,
     which is where a reader who has just looked at three charts is. */
  function imageGallery(record, id) {
    var images = (record.files || []).filter(function (file) {
      return isImage(file.url);
    });
    if (!images.length) return '';
    return (
      '<ul class="work-page-gallery"' + (id ? ' id="' + escapeHtml(id) + '"' : '') + '>' +
      images
        .map(function (file) {
          var label = file.label || '';
          var url = escapeHtml(file.url);
          /* The thumbnail opens the sheet; the link under it saves one.
             Without that second link the only way to keep a chart was to
             open it and long-press, which is the whole point of a sheet
             drawn to be forwarded. The PDFs beside it have had both
             offers since the day the buttons were relabelled — a picture
             simply never got them, because it had left `fileLinks`
             before that line was written.

             Offsite files get the thumbnail alone, the same decision
             `fileLinks` makes one function above: `download` is ignored
             across origins, so the link would say it saves a copy and
             then open a tab instead. */
          var offsite = OFFSITE.test(String(file.url || ''));
          var language = file.language || (isArabicScript(label) ? 'ur' : 'en');
          var rtl = language === 'ur' || language === 'ar';
          /* The label is announced by the image's own alt, so the copy
             of it under the picture is hidden from a screen reader
             rather than read out a second time before a link that names
             it a third. What it is for is the eye: six sheets in two
             languages are six pictures of the same shape, and which one
             you are looking at is otherwise guesswork. */
          var caption =
            '<p class="gallery-caption">' +
            '<span class="gallery-label' + (rtl ? ' ' + scriptClass(language) : '') + '"' +
            (rtl ? ' lang="' + language + '" dir="rtl"' : '') +
            ' aria-hidden="true">' + escapeHtml(label) + '</span>' +
            (offsite ? '' :
              '<a class="file-download" href="' + url + '" download' +
              ' aria-label="Download ' + escapeHtml(label) + '">' +
              'Download ' + icon('download', 'icon-inline') + '</a>') +
            '</p>';
          return (
            '<li><a class="gallery-sheet" href="' + url + '" target="_blank" rel="noopener">' +
            '<img src="' + escapeHtml(file.preview || file.url) + '" alt="' + escapeHtml(label) + '" loading="lazy" />' +
            '</a>' + caption + '</li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }

  /* The description(s) under a title in a row or on a card, both scripts,
     each on the axis the record itself reads from.

     It lived in script.js while the homepage was the only place a card
     was drawn. The fatawa index generates the same card into a file, so
     the rule about which edge each paragraph takes now has two callers
     and belongs where neither of them owns it. A card on /fatawa/ that
     disagreed with the same card on the homepage is exactly the drift
     this file exists to prevent. */
  function proseBlock(record) {
    var rtl = direction(record.language) === 'rtl';
    /* Both descriptions on the one axis the record itself reads from —
       the same rule the row above them already follows. Without it the
       panel set its Urdu flush right and its English flush left, two
       paragraphs of the same thing at opposite edges of one box. The
       summary was fixed for this long ago; the panel under it was not,
       and nothing said so until every stacked pair on the site was
       measured.

       `.align-left` and `.align-right` are declared after `.urdu` in
       styles.css, so they win over the alignment the script class
       carries — which is the only reason one class can settle both. */
    /* `own-edge` belongs to the paragraph that reads the other way, and
       to no other. A paragraph of Urdu pinned left has every line
       *beginning* in a different place, because an Urdu line begins on
       its right — so the Urdu one in a left-reading panel takes it. The
       English one alongside it must not: `.own-edge` is scoped to
       `.urdu`/`.arabic` and cannot match Latin, so writing it there put
       a class with no rule behind it on fourteen paragraphs. Decided per
       string, not per record, because a panel holds one of each. */
    /* Both branches are the same rule, reflected: the paragraph that
       reads the *other* way from the record gets its box shrunk to its
       own longest line and placed on the record's reading edge, with its
       words set on the edge they begin from inside it.

       The `rtl` half used to be a flat `align-right`, which is right for
       the Urdu and wrong for the English beside it — an English paragraph
       pinned right rags the edge English begins from, and that is what a
       reader sees as the block looking centred. Two fatāwā cards shipped
       that way; see `.own-edge-latin` in styles.css for the measurements. */
    var edge = function (lang) {
      if (rtl) {
        return direction(lang) === 'rtl' ? 'align-right' : 'align-right own-edge-latin';
      }
      return direction(lang) === 'rtl' ? 'align-left own-edge' : 'align-left';
    };
    /* Which language each half is written in, not which language the
       record is. `description` is the English one and `descriptionUr` the
       Urdu one whichever way the record reads — the same assumption
       `og:description` and `shareCaption` already make.

       The rtl row used to hand `record.description` the *record's*
       language, which is `ur`, so `edge()` was told the English paragraph
       read right-to-left and gave it `align-right`. That is the whole
       reason the mirror below could not fire: the fault was not only a
       missing branch, it was a pair labelled wrong. */
    return (rtl
      ? [[record.descriptionUr, record.language], [record.description, 'en']]
      : [[record.description, record.language], [record.descriptionUr, 'ur']])
      .filter(function (pair) { return pair[0]; })
      .map(function (pair) { return proseMarkup(pair[0], edge(pair[1]), pair[1]); })
      .join('');
  }

  /* A paragraph of prose from content.js, in whatever script it is
     written in. Descriptions and blurbs were assumed to be English —
     every one of them was — so an Urdu description came out in whatever
     the system happened to substitute rather than in Nastaliq.

     `language` is a hint, not an instruction — the text decides, and for
     a long time it decided only the *direction* while the hint still
     chose the **face**. That is the fault this paragraph used to carry:
     the four Arabic-language works have Urdu descriptions, so
     `descriptionUr` was handed `language: "ar"` and came out in Amiri at
     the Arabic size instead of Mehr Nastaliq at the Urdu one. The same
     sentence read as Nastaliq on the work's own page and as Naskh in the
     homepage row beside it, because `buildWork` passes `'ur'` by hand and
     `proseBlock` passed the record's language.

     `scriptOf` counts the letters Urdu added and Arabic has not, and the
     hint is consulted only when the letters are silent — a line of ا, د
     and و belongs to both alphabets and nothing but the record can say
     which. So a genuinely Arabic description on an Arabic work still gets
     Naskh; it is the words that are asked, not the field's name. */
  function proseMarkup(text, className, language) {
    var rtl = dominantScript(text) === 'arabic';
    /* One answer, used for the class and for `lang` both. They were
       written from two different things — the class from the hint and the
       attribute from the hint as well — and the moment the class started
       being derived they could have disagreed, which is a paragraph
       telling a screen reader one language and a typeface another. */
    var tongue = rtl ? (scriptOf(text, language) === 'ar' ? 'ar' : 'ur') : '';
    var script = rtl ? (tongue === 'ar' ? 'arabic' : 'urdu') : '';
    var classes = [className, script].filter(Boolean).join(' ');
    /* dir is always written out, never left to be inherited. The work
       page sets itself right to left for an Urdu work, and an English
       paragraph that said nothing about itself was inheriting that and
       coming out reversed. */
    return (
      '<p' + (classes ? ' class="' + classes + '"' : '') +
      (rtl ? ' lang="' + tongue + '" dir="rtl"' : ' dir="ltr"') + '>' +
      (rtl ? escapeHtml(text) : mixedMarkup(text)) +
      '</p>'
    );
  }

  /* Tags were assumed to be Urdu and marked lang="ur" dir="rtl" whatever
     they held, so an English one came out in Nastaliq running right to
     left. Each tag now takes the script it is actually written in. */
  function tagMarkup(record) {
    if (!record.tags || !record.tags.length) return '';
    return (
      '<ul class="tag-row">' +
      record.tags
        .map(function (tag) {
          var rtl = isArabicScript(tag);
          return (
            '<li class="tag ' + (rtl ? 'urdu' : 'latin') + '"' +
            ' lang="' + (rtl ? 'ur' : 'en') + '" dir="' + (rtl ? 'rtl' : 'ltr') + '">' +
            escapeHtml(tag) +
            '</li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }

  /* Every work and every ruling, flattened, each carrying its category. */
  function allRecords() {
    var records = [];
    (content.categories || []).forEach(function (category) {
      (category.works || []).forEach(function (work) {
        records.push(Object.assign({}, work, { category: category }));
      });
    });
    (content.rulings || []).forEach(function (ruling) {
      records.push(
        Object.assign({}, ruling, {
          category: {
            id: 'rulings',
            title: 'Islamic rulings',
            titleUr: 'فتاویٰ',
            /* Searched but never shown. The heading says "Islamic rulings"
               and the nav says "Fatawa"; a reader may type either. */
            keywords: 'fatwa fatawa ruling'
          },
          kind: ruling.kind || 'فتویٰ'
        })
      );
    });
    return records;
  }

  function findRecord(id) {
    return allRecords().filter(function (record) {
      return record.id === id;
    })[0];
  }

  /* Folds a string down to what someone actually types.

     Descriptions here are full of scholarly transliteration — ṭawāf,
     iḥrām, ṣāʿ, Ḥanafī, Raḍawiyya — and nobody types the dots and
     macrons. Urdu carries its own marks: فتاویٰ ends in a superscript
     alef, so a reader typing فتاوی would miss it. Both are combining
     characters, so decomposing and dropping the marks makes the two
     forms match. Latin letters that do not decompose are mapped by hand. */
  function fold(value) {
    return String(value == null ? '' : value)
      .toLocaleLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')       // Latin combining marks
      .replace(/[ً-ْٰ]/g, '') // Arabic harakat and superscript alef
      .replace(/[‘’ʿʾ']/g, '') // ʿayn, hamza, apostrophes
      .replace(/[ـ]/g, '')              // tatweel
      .replace(/[^\p{L}\p{N}]+/gu, ' ')      // punctuation, so "N.F.Ts" matches "nfts"
      .trim();
  }

  /* Strips a word to its consonants.

     Roman Urdu has no fixed spelling. The same work is tahqeeq or tahqiq,
     ehram or ihram, zakat or zakaat, meerath or meeraas — and readers
     type whichever they learnt. Arabic-script languages carry their sense
     in the consonants, so dropping the vowels and the doubled letters
     leaves a skeleton the variants share: tahqeeq and tahqiq both give
     thq. It absorbs ordinary typos for free, since most are vowels or a
     doubled letter. Arabic script has no Latin vowels, so it passes
     through untouched and Urdu queries are unaffected. */
  function skeleton(value) {
    return fold(value)
      .split(' ')
      .map(function (word) {
        /* Vowels first, then doubles — that order also folds gemination
           away, so presentation and presentaion land on the same key. */
        return word.replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1');
      })
      .filter(Boolean)
      .join(' ');
  }

  /* Decomposes text one character at a time and remembers which
     original character each decomposed character came from — safe
     because canonical decomposition never depends on a character's
     neighbours, only on itself. A match found in the decomposed copy
     can still be pointed back at the span of the real, undecomposed
     text it came from. */
  function decomposeWithMap(text) {
    var str = String(text == null ? '' : text);
    var out = '';
    var map = [];
    for (var i = 0; i < str.length; i++) {
      var piece = str[i].normalize('NFD');
      for (var j = 0; j < piece.length; j++) {
        out += piece[j];
        map.push(i);
      }
    }
    return { text: out, map: map };
  }

  var COMBINING_MARKS = '[̀-ًͯ-ٰٟۖ-ۭ]*';

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /* fold()'s own words, turned into a pattern that finds them inside
     ordinary text that still has its diacritics: each letter, with
     whatever mark fold() would have stripped allowed right after it —
     the same tolerance fold() has, run in the other direction. */
  function fuzzyWordPattern(word) {
    return Array.prototype.map
      .call(word, function (ch) { return escapeRegExp(ch) + COMBINING_MARKS; })
      .join('');
  }

  /* A title or description, with whichever already-fold()ed search
     words appear in it wrapped in <mark>. Matching runs against a
     decomposed, lowercased copy, so a search that ignores diacritics
     still finds and highlights the word carrying them; the match is
     then translated back to a span of the real text, which is what
     actually gets escaped and marked up. At worst this misses a match
     fold() only reached by collapsing punctuation — a smaller loss
     than a mark landing on the wrong letters would be. */
  function highlightText(text, words) {
    var raw = String(text == null ? '' : text);
    if (!words || !words.length) return escapeHtml(raw);

    var decomposed = decomposeWithMap(raw);
    var hay = decomposed.text.toLocaleLowerCase();
    var pattern = words
      .map(function (w) { return fuzzyWordPattern(String(w).toLocaleLowerCase()); })
      .filter(Boolean)
      .join('|');
    if (!pattern) return escapeHtml(raw);

    var re = new RegExp(pattern, 'gu');
    var ranges = [];
    var match;
    while ((match = re.exec(hay))) {
      if (!match[0]) { re.lastIndex += 1; continue; }
      ranges.push([decomposed.map[match.index], decomposed.map[match.index + match[0].length - 1] + 1]);
    }
    if (!ranges.length) return escapeHtml(raw);

    /* Two query words can land on overlapping letters once diacritics
       are allowed to float between them, so touching or overlapping
       ranges merge into one mark rather than nesting or colliding. */
    ranges.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [ranges[0]];
    ranges.slice(1).forEach(function (r) {
      var last = merged[merged.length - 1];
      if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else merged.push(r);
    });

    var out = '';
    var cursor = 0;
    merged.forEach(function (r) {
      out += escapeHtml(raw.slice(cursor, r[0]));
      out += '<mark>' + escapeHtml(raw.slice(r[0], r[1])) + '</mark>';
      cursor = r[1];
    });
    out += escapeHtml(raw.slice(cursor));
    return out;
  }

  /* Everything a search should look inside. */
  function searchText(record) {
    /* A post's own words, or whatever text layer a work's or fatwa's PDF
       carries — generated at publish time, in searchIndex, keyed by id,
       because neither lives in the record itself: a post's prose is in
       its own HTML file, and a PDF's is inside the PDF. Empty for a
       scanned PDF with no text layer — there was nothing to extract. */
    var indexed = content.searchIndex && content.searchIndex[record.id];
    return fold(
      [
        /* The id is a roman transliteration of the title — saa-ki-tahqeeq,
           ilm-ul-meerath — so indexing it lets a reader find an Urdu work
           by typing what they would say aloud. */
        String(record.id || '').replace(/-/g, ' '),
        record.title,
        record.description,
        record.descriptionUr,
        record.kind,
        (record.tags || []).join(' '),
        record.category && record.category.title,
        record.category && record.category.titleUr,
        record.category && record.category.keywords,
        (record.files || []).map(function (f) { return f.label; }).join(' '),
        /* File paths are roman even when the label is Urdu, so indexing
           them keeps the Hajj charts reachable by "ehram" or "kaffaray". */
        (record.files || [])
          .map(function (f) { return String(f.url || '').replace(/[\/\-_.]/g, ' '); })
          .join(' '),
        indexed && indexed.text
      ]
        .filter(Boolean)
        .join(' ')
    );
  }

  /* An absolute address for a page or file, for canonical links, sharing
     cards and structured data. Relative paths are fine inside the site but
     no social scraper will follow one. */
  function absoluteUrl(path) {
    var base = (content.site && content.site.baseUrl) || '';
    if (!base) return path;
    return base.replace(/\/+$/, '') + '/' + String(path).replace(/^\/+/, '');
  }

  /* Sets <meta name=...> or <meta property=...>, creating it if absent. */
  function setMeta(key, value) {
    if (!value) return;
    var attribute = key.indexOf('og:') === 0 ? 'property' : 'name';
    var tag = document.head.querySelector('meta[' + attribute + '="' + key + '"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attribute, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', value);
  }

  function setCanonical(url) {
    var link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /* Structured data. Written with textContent, never innerHTML — the
     values come from content.js and JSON.stringify is the escaping. */
  function addJsonLd(data) {
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  function author() {
    return {
      '@type': 'Person',
      name: (content.site && content.site.name) || '',
      alternateName: (content.site && content.site.nameUr) || undefined,
      jobTitle: 'Teacher of dars-e-niẓāmī',
      worksFor: { '@type': 'Organization', name: 'Jamia tun Noor, Karachi' },
      url: absoluteUrl('')
    };
  }

  /* ---- Sending a piece on, and taking it off the screen -------------

     What gets shared is usually a bare address, and the person on the
     other end has no idea what is behind it before they tap. So the
     caption is written here rather than left to whoever is sharing: the
     title, the one line that says what it is, the author, and then the
     link.

     The line comes in the script the piece is written in — an Urdu post
     is introduced in Urdu — because the caption is read before the page
     is opened, by someone who may not open it at all.

     `navigator.share` gets the caption without the address, since every
     sheet appends the link itself and it would otherwise arrive twice.
     Only the clipboard copy carries both. */
  /* Kind, title, byline, tight together — the way a masthead reads: what
     this is, what it's called, who wrote it — then a blank line, the
     description, another blank line, the address. A bare name sitting
     on its own line before the link read like a signature that had
     wandered off from what it was signing; "by" or "از" says plainly
     what the line is.

     `kind` is always written in Urdu — رسالہ, فتویٰ, مضمون — whatever
     script the piece itself is in; that is the whole site's own
     convention, and it reads fine as a small label above a title on the
     page itself. A plain-text message is a different medium: an Urdu
     word leading an English piece's caption, with nothing near it to
     say why, just reads as a mistake. So this only carries `kind` when
     the piece itself is Urdu or Arabic — there is no English word for
     it to fall back to.

     The title is wrapped in *asterisks* — WhatsApp, Telegram and Signal
     all render that as bold in plain text, and between the three of
     them that covers most of where a share sheet actually sends this.
     Anywhere else it does nothing worse than show the asterisks. */
  function shareCaption(record, url, withUrl) {
    var rtl = direction(record.language) === 'rtl';
    var intro = rtl
      ? record.descriptionUr || record.description
      : record.description || record.descriptionUr;
    var who = rtl
      ? (content.site && content.site.nameUr) || (content.site && content.site.name)
      : (content.site && content.site.name);

    var lines = [];
    /* The kind, in the caption's own language. It used to be pushed only
       for a right-to-left piece, so an English essay's caption opened on
       its title with nothing to say what it was. */
    var kind = recordKind(record);
    if (kind) lines.push(kind);
    lines.push('*' + String(record.title || '').replace(/\*/g, '') + '*');
    if (who) lines.push((rtl ? 'از ' : 'by ') + who);
    if (intro) lines.push('', intro);
    if (withUrl) lines.push('', url);
    return lines.join('\n');
  }

  /* Clipboard, by whichever route this browser allows.

     Asking first — `isSecureContext`, feature tests — gets it wrong:
     Chrome calls a page opened from the file system secure and then
     refuses the write anyway, and these pages do get opened that way.
     So it tries the modern call and, if that is refused for any reason,
     the old one. If neither works the caller says so rather than
     claiming a copy that never happened. */
  function copyBySelection(text) {
    return new Promise(function (resolve, reject) {
      var box = document.createElement('textarea');
      box.value = text;
      box.setAttribute('readonly', '');
      box.style.position = 'fixed';
      box.style.top = '-1000px';
      document.body.appendChild(box);
      box.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (error) { done = false; }
      document.body.removeChild(box);
      done ? resolve() : reject(new Error('copy refused'));
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        return copyBySelection(text);
      });
    }
    return copyBySelection(text);
  }

  function copyCaption(record, url) {
    return copyText(shareCaption(record, url, true)).then(
      function () { return 'Caption and link copied — paste it anywhere.'; },
      function () { return 'Could not copy. The address is ' + url; }
    );
  }

  /* Sharing one record, from wherever the button was pressed — the row on
     the homepage, the work page, the foot of a post. Resolves with the
     line to show the reader, which is empty when the system sheet took
     it and there is nothing left to say.

     The system sheet is offered first everywhere it exists — WhatsApp,
     Messages, whatever the device has — and copying the caption is the
     fallback for the browsers that never had one, chiefly on a computer.
     A phone that exposes `navigator.share` always gets the sheet.

     Two things narrow that further, both worth naming because a silent
     no-op reads as a broken button: the API needs a secure page, so it
     is absent over plain `http://`; and it is missing inside some
     in-app browsers (Instagram, Facebook) that a link can be opened in
     without ever reaching the device's own browser. Neither has a code
     fix — the fallback below is what a reader in either case gets. */
  function shareRecord(record, url) {
    if (navigator.share) {
      var opened;
      try {
        /* The link goes inside `text`, not in its own `url` field. Handed
           over separately, WhatsApp's own share handler was rejoining the
           two with a single space rather than the blank line the caption
           was written with, so the address ran straight into the last
           sentence. Folded into the text there is nothing left to
           rejoin — and WhatsApp still turns a plain-text address into a
           link and a preview card on its own, the same as pasting one. */
        opened = navigator.share({ title: record.title, text: shareCaption(record, url, true) });
      } catch (error) {
        opened = Promise.reject(error);
      }
      return opened.then(
        function () { return ''; },
        function (error) {
          /* Closing the sheet without picking anything is not a failure —
             it is the whole point of a sheet, and saying so would scold a
             reader for changing their mind. Anything else means the sheet
             most likely never opened, so the caption still has to reach
             them some way. */
          if (error && error.name === 'AbortError') return '';
          return copyCaption(record, url);
        }
      );
    }
    return copyCaption(record, url);
  }

  /* Share everywhere; Print only where there is a page worth printing.

     A work or a fatwa is a record of a PDF — the page holds a title, a
     line or two, a button to the actual document. Printing that page
     prints a stub with a download button that does nothing on paper; the
     PDF is what a reader wants on paper, and it already prints itself.
     A post has no PDF — the writing IS the page, so printing the page
     prints the piece. `record.page` is exactly that distinction; it is
     the same field the rest of the codebase already reads to tell a post
     from a download (see CLAUDE.md, "A post is a page, not a download"). */
  function pageTools(record, url) {
    var box = document.createElement('div');
    box.className = 'page-tools';
    /* An app has a page of its own too, and it is not writing. Printing
       it prints a stub with a button that does nothing on paper — the
       same argument as a work's page, which is why `record.page` alone
       stopped being the whole test once apps arrived. */
    var printable = !!record.page && !record.app;

    /* No *arrow* on these two, and that is still the rule: ↗ says "away
       from here" and ↓ says "onto the device", each one specific, and a
       vague third would weaken both. A drawing of the action is the
       opposite case — it says what the action is — so these two get the
       `share` and `print` marks from the sprite instead.

       They are here because the words alone were measured and found
       wanting, not on taste. Every control on the site passes WCAG AA —
       Share is 7.69:1, the worst anywhere is 5.03 — so contrast was
       never the fault. What the measurement showed is that at the foot
       of a post the *tag pills* above these two carry a filled
       background while the only two things a reader can actually do are
       bare 14px words: the decoration outranked the action. An icon and
       a 2px rule put that back the right way up.

       Decorative, like every other icon here — the word beside it says
       the same thing — so `icon()` writes `aria-hidden` and the button's
       accessible name stays the word. */
    var share = document.createElement('button');
    share.type = 'button';
    share.className = 'text-link';
    share.innerHTML = icon('share', 'icon-inline') + ' Share';

    /* Spoken when it changes, so the copy is confirmed to a reader who
       cannot see the line appear. */
    var say = document.createElement('p');
    say.className = 'page-tools-note';
    say.setAttribute('role', 'status');
    say.setAttribute('aria-live', 'polite');

    share.addEventListener('click', function () {
      shareRecord(record, url).then(function (line) { say.textContent = line; });
    });

    box.appendChild(share);

    if (printable) {
      var print = document.createElement('button');
      print.type = 'button';
      print.className = 'text-link';
      print.innerHTML = icon('print', 'icon-inline') + ' Print';
      print.addEventListener('click', function () { window.print(); });
      box.appendChild(print);
    }

    box.appendChild(say);

    /* Paper carries no address, so a printed page would have no way back
       to the site it came from. Hidden on screen; the print rules show
       it. Written even where the button above is absent — Ctrl+P has
       always worked regardless of what this row offers, and a work page
       printed that way still deserves a way back to where it came from. */
    var credit = document.createElement('p');
    credit.className = 'print-credit';
    credit.textContent = ((content.site && content.site.name) || '') + ' · ' + url;
    box.appendChild(credit);

    return box;
  }

  /* ---- Searching takes you to the results ----------------------------

     A search that filters a page you cannot see reads as a search that
     did nothing. The homepage's box sits 2040px down at 390px — the hero,
     the introduction and the recent strip are above it — and the fatawa
     are a section below the library, so `commodities`, which matches one
     work and one fatwa, filtered the page and left both matches below the
     fold with only a count to say they existed. Reported as *it filters
     the page but mobile screens have the fatwa scrolled down*.

     So typing brings the box to the top of the screen, which puts the
     whole viewport under it for results to land in. Two things about how:

     `window.scrollTo` on the document, never `scrollIntoView` — this file
     already records what that costs, since it scrolls every scrollable
     ancestor and the header's nav is one of them under 420px.

     And **no `behavior` at all**, which is the one case where the
     stylesheet can reach a scripted scroll. `behavior: 'auto'` is defined
     as "use the scrolling box's own `scroll-behavior`", and `html` carries
     `scroll-behavior: smooth` with the reduced-motion block setting it
     back to `auto`. So this is smooth for a reader who wants motion and
     instant for one who does not, with nothing here asking the question.
     Writing `'smooth'` would have put it beyond the stylesheet's reach,
     which is the trap the carousel's own scrolls had to ask `matchMedia`
     about. */
  function anchorSearch(input) {
    var row = input.closest ? input.closest('.search-row') : null;
    var box = (row || input).getBoundingClientRect();
    /* The one number that already knows how tall the two sticky bars are:
       `scroll-padding-top` on the root, 152px and 158 in the band where
       the wordmark wraps. Read rather than copied, so a change to the
       header or the category strip cannot leave this behind — those
       numbers have been wrong here once already. */
    var clear = parseFloat(
      getComputedStyle(document.documentElement).scrollPaddingTop
    ) || 0;
    window.scrollTo({ top: Math.max(0, box.top + window.scrollY - clear) });
  }

  /* ---- The list under the box ----------------------------------------

     Asked for in as many words: *the search bar should open a drop-down
     type thing listing things*. Filtering the page answers "show me
     everything about X"; it does not answer "which one is it" without a
     scroll, and on a phone the second question is the one being asked.

     **It lists what the filter matched — it does not match anything
     itself.** Both searches hand it the ids they have just decided to
     keep, in the order they kept them, so a list that disagreed with the
     page underneath it is not a state this can reach. That is the same
     argument that put `mountCardSearch` in this file rather than in
     `script.js`, and it is why this takes ids rather than a query.

     Every part of a row comes from the helper the library row uses for
     the same part — `titleMarkup` for the title with its own face and
     direction, `highlightText` for the words typed inside it. A row cannot
     end up saying something the record's own row does not.

     Nothing here is content: a reader with no JavaScript gets no panel
     and loses nothing, because the library is the page. Nothing animates,
     so the reduced-motion case needs no asking — a list that re-filters
     on every keystroke must not fade, which this file already records. */
  var SUGGEST_MAX = 8;

  function suggestionBox(input) {
    var row = input.closest ? input.closest('.search-row') : null;
    var box = row && row.querySelector('.search-box');
    if (!row || !box) return function () {};

    var panel = document.createElement('div');
    panel.className = 'suggestions';
    panel.id = (input.id || 'search') + '-suggestions';
    panel.setAttribute('role', 'listbox');
    panel.setAttribute('aria-label', 'Matches');
    panel.hidden = true;
    box.insertAdjacentElement('afterend', panel);

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', panel.id);
    input.setAttribute('aria-autocomplete', 'list');

    var options = [];
    var at = -1;

    var mark = function () {
      options.forEach(function (option, i) {
        if (i === at) option.setAttribute('aria-selected', 'true');
        else option.removeAttribute('aria-selected');
        option.classList.toggle('is-active', i === at);
      });
      if (at >= 0 && options[at]) {
        input.setAttribute('aria-activedescendant', options[at].id);
        /* The panel scrolls when there are more rows than fit, so a row
           reached by the keyboard has to be brought into it — and into it
           alone. `scrollIntoView` would take the document with it, which
           is the fault the category rail already records. */
        var option = options[at];
        var top = option.offsetTop;
        var bottom = top + option.offsetHeight;
        if (top < panel.scrollTop) panel.scrollTop = top;
        else if (bottom > panel.scrollTop + panel.clientHeight) {
          panel.scrollTop = bottom - panel.clientHeight;
        }
      } else {
        input.removeAttribute('aria-activedescendant');
      }
    };

    var close = function () {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      at = -1;
      mark();
    };

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        /* A `type="search"` field clears itself on Escape — that is the
           browser, not us, and measured: the first press emptied the box
           and un-filtered the page when all the reader wanted was the list
           out of the way. So while the list is open Escape shuts it and
           the query stands; pressing it again, with nothing to shut, lets
           the native clear through. Two steps, which is what a reader
           dismissing something expects. */
        if (!panel.hidden) event.preventDefault();
        close();
        return;
      }
      if (panel.hidden || !options.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        at = at + 1 >= options.length ? 0 : at + 1;
        mark();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        at = at <= 0 ? options.length - 1 : at - 1;
        mark();
      } else if (event.key === 'Enter' && at >= 0) {
        /* Only when a row has been reached deliberately. Enter on a plain
           query is the reader saying "that is my search", and the page
           below is already filtered to it — jumping them into the first
           match would take a decision they did not make. */
        event.preventDefault();
        options[at].click();
      }
    });

    /* A tap on a row must not blur the box before the link is followed,
       which on a phone is what a plain blur handler costs. */
    panel.addEventListener('pointerdown', function (event) { event.preventDefault(); });
    document.addEventListener('pointerdown', function (event) {
      if (!row.contains(event.target)) close();
    });
    input.addEventListener('blur', function () {
      if (!row.contains(document.activeElement)) close();
    });

    return function (cards, words, approximate) {
      options = [];
      at = -1;
      if (!cards || !cards.length) { close(); return; }
      var shown = cards.slice(0, SUGGEST_MAX);
      var rest = cards.length - shown.length;
      panel.innerHTML =
        shown
          .map(function (card, i) {
            var record = findRecord(card.getAttribute('data-id'));
            if (!record) return '';
            /* The card's own address wherever it has one, and only then
               `recordHref`, which is relative to the site root. The fatāwā
               page sits a folder down and its cards already climb out with
               `../`; building the href here instead sent every row on that
               page to `/fatawa/works/…`. Taking what the page has already
               decided is the same rule the ids follow, and it needs no
               arithmetic about how deep the page is — which would have been
               wrong again the moment `index.html` was opened from a file
               system, as it must keep working. */
            var href = card.getAttribute('href') || recordHref(record);
            var language = record.language || 'en';
            /* The same two decisions the library row makes, for the same
               reasons: the title is the author's words and keeps its own
               face and direction; the line under it is the site's words
               about the record and is set in Latin whatever the record is
               — 12px tracked Nastaliq cannot be read. */
            var title =
              '<span class="record-title ' + scriptClass(language) + '"' +
              ' lang="' + language + '" dir="' + direction(language) + '">' +
              (approximate ? escapeHtml(record.title) : highlightText(record.title, words)) +
              '</span>';
            /* The category and nothing else. The kind was here first and
               had to come out: `recordKind` answers in the language the
               record reads in, which is right and is why the library row
               shows `مضمون` in Mehr — but this line is 12px, uppercase and
               letter-spaced, and an Urdu word set that way has its joined
               letters pulled apart. `.bio-facts dt` learned the same thing
               about نام and کنیت. Rendering it in English instead would
               have been a second answer to a question `recordKind` already
               settles, so the line simply does not ask it; the category
               names a chart a chart and a ruling a ruling anyway. */
            var where = record.category && record.category.title;
            return (
              '<a class="suggestion" role="option" id="' + panel.id + '-' + i + '"' +
              ' href="' + escapeHtml(href) + '">' +
              title +
              (where ? '<span class="suggestion-meta">' + escapeHtml(where) + '</span>' : '') +
              '</a>'
            );
          })
          .join('') +
        (rest > 0
          ? '<p class="suggestion-rest">' + rest +
            (rest === 1 ? ' more match' : ' more matches') + ' in the library below</p>'
          : '');
      options = Array.prototype.slice.call(panel.querySelectorAll('.suggestion'));
      panel.hidden = false;
      panel.scrollTop = 0;
      input.setAttribute('aria-expanded', 'true');
      mark();
    };
  }

  /* ---- A search box on a page that is not the homepage --------------

     The fatāwā page got one because more fatāwā are coming: "six on a
     page three screens tall is not a haystack" was a fair argument about
     six and stops being one at twenty, and a reader who arrives looking
     for a ruling on a named subject should not have to read the list.

     The matching is the homepage's, deliberately, and it is here rather
     than in `script.js` because `script.js` is the homepage's own file
     and this page does not load it. Two passes: every typed word must
     appear somewhere in the entry, and only if that finds nothing
     anywhere does it fall back to skeletons — consonant shapes, which
     forgive the vowels Urdu transliteration never agrees about — and it
     says when it has, rather than passing looser results off as what was
     asked for.

     Wired from the markup, not from a page: any page that writes an
     input with `data-card-search` naming a container gets it. Nothing
     starts hidden — with no script the cards are all simply there, which
     is the state the filter returns them to anyway. */
  function mountCardSearch() {
    var input = document.querySelector('[data-card-search]');
    if (!input) return;
    var scope = document.getElementById(input.getAttribute('data-card-search'));
    if (!scope) return;
    var cards = Array.prototype.slice.call(scope.querySelectorAll('[data-search]'));
    if (!cards.length) return;
    var count = document.getElementById(input.getAttribute('data-card-count') || '');
    var noun = input.getAttribute('data-card-noun') || 'item';
    var plural = input.getAttribute('data-card-plural') || noun + 's';

    var hits = function (card, attribute, needles) {
      if (!needles.length) return false;
      var hay = card.getAttribute(attribute) || '';
      return needles.every(function (needle) { return hay.indexOf(needle) !== -1; });
    };

    /* Only on the way in: once per search, not once per keystroke, and
       never when the box is cleared. A reader correcting a query has
       usually scrolled down into the results, and hauling them back to
       the box on every letter is the opposite of helping. */
    var searching = fold(input.value).split(' ').filter(Boolean).length > 0;
    var suggest = suggestionBox(input);

    var run = function (event) {
      var words = fold(input.value).split(' ').filter(Boolean);
      var term = words.length > 0;
      if (event && term && !searching) anchorSearch(input);
      searching = term;
      var loose = words
        .map(function (word) { return skeleton(word); })
        .filter(function (word) { return word.length >= 2; });

      var exact = term ? cards.filter(function (c) { return hits(c, 'data-search', words); }) : cards;
      var approximate = false;
      var keep = exact;
      if (term && !exact.length && loose.length) {
        keep = cards.filter(function (c) { return hits(c, 'data-skeleton', loose); });
        approximate = keep.length > 0;
      }

      cards.forEach(function (card) { card.hidden = keep.indexOf(card) === -1; });

      /* The list is given the cards that were kept, in the order they were
         kept — it decides nothing of its own, down to the address each row
         points at. */
      suggest(term ? keep : [], words, approximate);

      if (!count) return;
      if (!term) { count.textContent = ''; return; }
      if (!keep.length) { count.textContent = 'Nothing matches those words.'; return; }
      count.textContent = keep.length + ' ' + (keep.length === 1 ? noun : plural) +
        (approximate ? '. Nothing matched exactly, so these are the closest.' : '');
    };

    input.addEventListener('input', run);
    run();
  }

  /* ---- The way onward ------------------------------------------------

     Every record page was a dead end. You opened a ruling from the
     homepage, read it, and the only ways out were the browser's Back
     button and the header — nothing said there were five more rulings,
     or three more booklets in the same category, and the library a
     reader had just come from was two taps and a scroll away.

     Mounted from here rather than written into the pages, for the same
     reason Share and Print are: it reaches all twenty-four pages already
     committed without regenerating one of them, and the next thing it
     learns to do reaches them too.

     Up to four siblings, taken from the one *after* this record and
     wrapping round, so a record near the end of its category offers the
     start of it rather than nothing. Self is never in the list. A
     category holding nothing else writes no block at all — an empty
     "More in …" heading is worse than no heading. */
  var MORE_MAX = 4;

  function moreLike(record) {
    /* allRecords() here hands back flat records carrying a `category`
       property — not the { record, category } entry admin.js builds.
       The two shapes have always differed; this read the wrong one
       first and every record page threw on load. */
    var family = allRecords().filter(function (other) {
      return other.category && record.category
        ? other.category.id === record.category.id
        : false;
    });
    if (family.length < 2) return null;
    var group = record.category;

    var start = 0;
    for (var j = 0; j < family.length; j++) {
      if (family[j].id === record.id) { start = j; break; }
    }
    var picked = [];
    for (var k = 1; k < family.length && picked.length < MORE_MAX; k++) {
      picked.push(family[(start + k) % family.length]);
    }

    var box = document.createElement('section');
    box.className = 'more-like';

    var head = document.createElement('h2');
    head.textContent = 'More in ' + group.title;
    box.appendChild(head);

    var list = document.createElement('ul');
    /* Every record page sits exactly one folder down — posts/, works/,
       apps/ — so the way back to the site root is the same from all of
       them. Not an absolute address: these pages have to keep working
       opened straight off the file system, which is the rule the whole
       site is built to. */
    picked.forEach(function (other) {
      var item = document.createElement('li');
      var link = document.createElement('a');
      link.href = '../' + recordHref(other);
      link.innerHTML = titleMarkup(other, 'span') + kindMarkup(other, 'more-kind');
      item.appendChild(link);
      list.appendChild(item);
    });
    box.appendChild(list);

    /* The fatawa have a page of their own now; every other category is
       still a section of the homepage. */
    var all = document.createElement('a');
    all.className = 'text-link';
    all.href = group.id === 'rulings' ? '../fatawa/index.html' : '../index.html#' + group.id;
    all.innerHTML = 'All of ' + escapeHtml(group.title) + ' <span aria-hidden="true">\u2192</span>';
    box.appendChild(all);

    return box;
  }


  window.site = {
    content: content,
    escapeHtml: escapeHtml,
    absoluteUrl: absoluteUrl,
    setMeta: setMeta,
    setCanonical: setCanonical,
    addJsonLd: addJsonLd,
    author: author,
    scriptClass: scriptClass,
    direction: direction,
    titleMarkup: titleMarkup,
    fileLinks: fileLinks,
    recordHref: recordHref,
    ownPage: ownPage,
    isOffsite: isOffsite,
    formatDate: formatDate,
    isArabicScript: isArabicScript,
    icon: icon,
    categoryIcon: categoryIcon,
    categoryIconName: categoryIconName,
    iconNames: iconNames,
    drawIconsOnEntry: drawIconsOnEntry,
    revealOnEntry: revealOnEntry,
    recordKind: recordKind,
    kindMarkup: kindMarkup,
    recordMeta: recordMeta,
    recordWhen: recordWhen,
    metaMarkup: metaMarkup,
    isImage: isImage,
    imageGallery: imageGallery,
    proseMarkup: proseMarkup,
    proseBlock: proseBlock,
    moreLike: moreLike,
    scriptOf: scriptOf,
    mountCardSearch: mountCardSearch,
    suggestionBox: suggestionBox,
    anchorSearch: anchorSearch,
    tagMarkup: tagMarkup,
    allRecords: allRecords,
    findRecord: findRecord,
    fold: fold,
    skeleton: skeleton,
    highlightText: highlightText,
    searchText: searchText,
    shareCaption: shareCaption,
    shareRecord: shareRecord,
    pageTools: pageTools
  };

  /* A post or a work is a file of its own, written once by the editor and
     then left alone. Putting the buttons in from here rather than into
     the generated markup means every page already written has them, and
     no page has to be rewritten to gain the next thing they learn to do.

     The record is found by the address, matched against `ownPage` —
     `record.page` for a post, `works/<id>.html` for everything else.
     Nothing is added if no entry claims this file — better no button
     than one captioned with the wrong piece. */
  var here = location.pathname;
  var mine = allRecords().filter(function (record) {
    var path = ownPage(record);
    return here.slice(-(path.length + 1)) === '/' + path;
  })[0];
  if (mine) {
    var canonical = document.head.querySelector('link[rel="canonical"]');
    var address = (canonical && canonical.getAttribute('href')) || absoluteUrl(ownPage(mine));
    var tools = pageTools(mine, address);

    /* Written once and used at both mount points below, so a post and a
       work cannot end up offering different things. */
    var onward = moreLike(mine);

    var postBody = document.getElementById('post-body');
    if (postBody) {
      var article = postBody.closest('article');
      if (article) {
        var foot = article.querySelector('.post-foot');
        foot ? article.insertBefore(tools, foot) : article.appendChild(tools);
        /* After the whole article, including whatever foot it has — this
           is where a reader who has finished is looking. */
        if (onward) article.appendChild(onward);
      }
    } else {
      /* A work page: right after the download buttons, or the "not
         published yet" note when there is nothing to download — see the
         same reasoning in buildWork, admin.js. */
      var filesAnchor = document.getElementById('work-page-files');
      if (filesAnchor) {
        filesAnchor.insertAdjacentElement('afterend', tools);
      } else {
        var hero = document.querySelector('.work-hero');
        if (hero) hero.appendChild(tools);
      }
      var workHero = document.querySelector('.work-hero');
      if (onward && workHero) workHero.appendChild(onward);
    }
  }

  mountCardSearch();

  /* The icon sprite, before anything that might reference it. */
  injectSprite();

  /* Any mark written by hand into a page — the search box, the link to the
     introduction — asks for its drawing with `data-icon` rather than
     carrying the SVG inline, so the markup stays readable and the set
     stays in one place. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-icon]'), function (slot) {
    slot.innerHTML = icon(slot.getAttribute('data-icon'), slot.getAttribute('data-icon-class') || '');
  });

  /* Footer year and the mailto link, on every page that has them. */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var emailLink = document.getElementById('contact-email');
  if (emailLink && content.site && content.site.email) {
    emailLink.href = 'mailto:' + content.site.email;
    emailLink.textContent = content.site.email;
  }
})();
