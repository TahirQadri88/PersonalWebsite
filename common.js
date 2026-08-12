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

  /* Renders a title in the right script, direction and font. */
  function titleMarkup(record, tag) {
    var element = tag || 'span';
    var language = record.language || 'en';
    return (
      '<' + element + ' class="' + scriptClass(language) + '" lang="' + language + '" dir="' + direction(language) + '">' +
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

  /* Neither Nastaliq nor Naskh contains an arrow, so inside a link whose
     label is Urdu the browser went looking elsewhere for one — and on an
     iPhone it found Apple Color Emoji and drew a blue tile. The arrow is
     given the UI font, which has the glyph, and U+FE0E after it asks for
     the written shape rather than the emoji one. */
  var GLYPH_OPEN = '<span class="glyph" aria-hidden="true">\u2197\uFE0E</span>';
  var GLYPH_SAVE = '<span class="glyph" aria-hidden="true">\u2193\uFE0E</span>';

  function fileLinks(record, className) {
    if (!record.files || !record.files.length) return '';
    return record.files
      .map(function (file) {
        var label = file.label || 'Open';
        /* file.language wins if the author set it; otherwise the script is
           read off the label, so no existing entry needs editing. */
        var language = file.language || (isArabicScript(label) ? 'ur' : 'en');
        var rtl = language === 'ur' || language === 'ar';
        var url = escapeHtml(file.url);
        var open =
          '<a class="' + (className || 'document-link') + (rtl ? ' ' + scriptClass(language) : '') + '"' +
          (rtl ? ' lang="' + language + '" dir="rtl"' : '') +
          ' href="' + url + '" target="_blank" rel="noopener">' +
          escapeHtml(label) + ' ' + GLYPH_OPEN + '</a>';
        if (OFFSITE.test(String(file.url || ''))) return '<span class="file-item">' + open + '</span>';
        return (
          '<span class="file-item">' + open +
          '<a class="file-download" href="' + url + '" download' +
          ' aria-label="Download ' + escapeHtml(label) + '">' +
          'Download ' + GLYPH_SAVE + '</a>' +
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

  var IMAGE_FILE = /\.(jpe?g|png|gif|webp|avif|svg)$/i;

  function isImage(url) {
    return IMAGE_FILE.test(String(url || '').split('?')[0]);
  }

  /* Charts and pamphlets are pictures. Showing them beats asking someone
     to download three files to find out what they say. Each thumbnail is
     a link to the full-size original; `preview` names a lighter copy to
     display, and falls back to the file itself when there is none. */
  function imageGallery(record) {
    var images = (record.files || []).filter(function (file) {
      return isImage(file.url);
    });
    if (!images.length) return '';
    return (
      '<ul class="work-page-gallery">' +
      images
        .map(function (file) {
          return (
            '<li><a href="' + escapeHtml(file.url) + '" target="_blank" rel="noopener">' +
            '<img src="' + escapeHtml(file.preview || file.url) + '" alt="' + escapeHtml(file.label || '') + '" loading="lazy" />' +
            '</a></li>'
          );
        })
        .join('') +
      '</ul>'
    );
  }

  /* A paragraph of prose from content.js, in whatever script it is
     written in. Descriptions and blurbs were assumed to be English —
     every one of them was — so an Urdu description came out in whatever
     the system happened to substitute rather than in Nastaliq.

     `language` says which Arabic-script face to reach for when the
     passage turns out to be right-to-left: "ar" gives Naskh, anything
     else Nastaliq. It is a hint, not a instruction — the text itself
     decides the direction. */
  function proseMarkup(text, className, language) {
    var rtl = dominantScript(text) === 'arabic';
    var script = rtl ? (language === 'ar' ? 'arabic' : 'urdu') : '';
    var classes = [className, script].filter(Boolean).join(' ');
    /* dir is always written out, never left to be inherited. The work
       page sets itself right to left for an Urdu work, and an English
       paragraph that said nothing about itself was inheriting that and
       coming out reversed. */
    return (
      '<p' + (classes ? ' class="' + classes + '"' : '') +
      (rtl ? ' lang="' + (language === 'ar' ? 'ar' : 'ur') + '" dir="rtl"' : ' dir="ltr"') + '>' +
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
    if (record.kind && rtl) lines.push(record.kind);
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
    var printable = !!record.page;

    /* No arrows on these two. The glyphs elsewhere on the site say two
       specific things — ↗ opens something away from here, ↓ puts a file
       on the device — and neither of these does either. A third arrow
       meaning nothing in particular would only weaken the two that do.
       The words are unambiguous on their own. */
    var share = document.createElement('button');
    share.type = 'button';
    share.className = 'text-link';
    share.textContent = 'Share';

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
      print.textContent = 'Print';
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
    isImage: isImage,
    imageGallery: imageGallery,
    proseMarkup: proseMarkup,
    tagMarkup: tagMarkup,
    allRecords: allRecords,
    findRecord: findRecord,
    fold: fold,
    skeleton: skeleton,
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

    var postBody = document.getElementById('post-body');
    if (postBody) {
      var article = postBody.closest('article');
      if (article) {
        var foot = article.querySelector('.post-foot');
        foot ? article.insertBefore(tools, foot) : article.appendChild(tools);
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
    }
  }

  /* Footer year and the mailto link, on every page that has them. */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var emailLink = document.getElementById('contact-email');
  if (emailLink && content.site && content.site.email) {
    emailLink.href = 'mailto:' + content.site.email;
    emailLink.textContent = content.site.email;
  }
})();
