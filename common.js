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
          escapeHtml(label) + ' <span aria-hidden="true">↗</span></a>';
        if (OFFSITE.test(String(file.url || ''))) return '<span class="file-item">' + open + '</span>';
        return (
          '<span class="file-item">' + open +
          '<a class="file-download" href="' + url + '" download' +
          ' aria-label="Download ' + escapeHtml(label) + '">' +
          'Download <span aria-hidden="true">↓</span></a>' +
          '</span>'
        );
      })
      .join('');
  }

  /* Most entries are a record about a file, and open work.html. A post is
     its own page — the writing is in the HTML, not behind a download — so
     it names that page and links straight to it. */
  function recordHref(record) {
    return record.page ? record.page : 'work.html?work=' + encodeURIComponent(record.id);
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
          .join(' ')
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
    formatDate: formatDate,
    isImage: isImage,
    imageGallery: imageGallery,
    proseMarkup: proseMarkup,
    tagMarkup: tagMarkup,
    allRecords: allRecords,
    findRecord: findRecord,
    fold: fold,
    skeleton: skeleton,
    searchText: searchText
  };

  /* Footer year and the mailto link, on every page that has them. */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  var emailLink = document.getElementById('contact-email');
  if (emailLink && content.site && content.site.email) {
    emailLink.href = 'mailto:' + content.site.email;
    emailLink.textContent = content.site.email;
  }
})();
