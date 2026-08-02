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

  /* True when a string is written in Arabic script. Used for file labels,
     which the author writes in whichever script suits the document — a
     label reading احرام کیا ہے must not come out in the Latin UI font. */
  var ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

  function isArabicScript(value) {
    return ARABIC_SCRIPT.test(String(value == null ? '' : value));
  }

  /* Download / open buttons. Returns '' when nothing is attached yet. */
  function fileLinks(record, className) {
    if (!record.files || !record.files.length) return '';
    return record.files
      .map(function (file) {
        var label = file.label || 'Open';
        /* file.language wins if the author set it; otherwise the script is
           read off the label, so no existing entry needs editing. */
        var language = file.language || (isArabicScript(label) ? 'ur' : 'en');
        var rtl = language === 'ur' || language === 'ar';
        return (
          '<a class="' + (className || 'document-link') + (rtl ? ' ' + scriptClass(language) : '') + '"' +
          (rtl ? ' lang="' + language + '" dir="rtl"' : '') +
          ' href="' + escapeHtml(file.url) + '" target="_blank" rel="noopener">' +
          escapeHtml(label) + ' <span aria-hidden="true">↗</span></a>'
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
     the system happened to substitute rather than in Nastaliq. */
  function proseMarkup(text, className) {
    var rtl = isArabicScript(text);
    var classes = [className, rtl ? 'urdu' : ''].filter(Boolean).join(' ');
    return (
      '<p' + (classes ? ' class="' + classes + '"' : '') +
      (rtl ? ' lang="ur" dir="rtl"' : '') + '>' +
      escapeHtml(text) +
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
