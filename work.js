/* Detail page: work.html?work=<id>. Works and fatawa both resolve here. */

(function () {
  'use strict';

  var site = window.site;
  var main = document.getElementById('work-page-main');
  if (!site || !main) return;

  var id = new URLSearchParams(window.location.search).get('work');
  var record = id ? site.findRecord(id) : null;

  if (!record) {
    main.innerHTML =
      '<section class="work-hero">' +
      '<p class="section-label">Not found</p>' +
      '<h1>That work isn’t here.</h1>' +
      '<p class="work-page-description">The link may be out of date, or the work may not be published yet.</p>' +
      '<a class="button" href="index.html#library">Browse all works →</a>' +
      '</section>';
    return;
  }

  /* A post keeps its own page. If a link to the template arrives anyway,
     send it on rather than showing a second, emptier version of it. */
  if (record.page) {
    window.location.replace(record.page);
    return;
  }

  document.title = record.title + ' — Abul Laith Muhammad Tahir Qadri';

  /* Each work is its own page as far as search and sharing are concerned.
     Everything here is derived from content.js — nothing is written twice. */
  var pageUrl = site.absoluteUrl('work.html?work=' + encodeURIComponent(record.id));
  site.setCanonical(pageUrl);
  if (record.description) site.setMeta('description', record.description);
  site.setMeta('og:type', 'article');
  site.setMeta('og:title', record.title);
  site.setMeta('og:description', record.description || '');
  site.setMeta('og:url', pageUrl);
  site.setMeta('og:image', site.absoluteUrl('share-card.png'));
  site.setMeta('twitter:card', 'summary_large_image');

  site.addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: record.title,
    inLanguage: record.language || 'en',
    description: record.description || undefined,
    genre: record.kind || undefined,
    keywords: (record.tags || []).join(', ') || undefined,
    url: pageUrl,
    author: site.author(),
    isPartOf: { '@type': 'Collection', name: record.category.title, url: site.absoluteUrl('') },
    associatedMedia: (record.files || []).map(function (file) {
      return { '@type': 'MediaObject', name: file.label, contentUrl: site.absoluteUrl(file.url) };
    })
  });

  var backHref = record.category.id === 'rulings' ? 'index.html#rulings' : 'index.html#' + record.category.id;
  var files = site.fileLinks(record, 'button');

  /* An Urdu booklet's page should read as an Urdu page. The kind label
     and the title were already set right to left, but everything under
     them — the description, the buttons, the tags — still began at the
     left margin, so the page had two edges and belonged to neither. The
     whole block now takes the direction of the work itself. */
  var rtl = site.direction(record.language) === 'rtl';

  /* The work's own language first, then the other. */
  var prose = (rtl
    ? [[record.descriptionUr, 'ur'], [record.description, record.language]]
    : [[record.description, record.language], [record.descriptionUr, 'ur']])
    .filter(function (pair) { return pair[0]; })
    .map(function (pair) { return site.proseMarkup(pair[0], 'work-page-description', pair[1]); })
    .join('');

  main.innerHTML =
    '<section class="work-hero"' + (rtl ? ' dir="rtl"' : '') + '>' +
    /* The arrow points the way back, which on a right-to-left page is
       rightwards. Written first either way: bidi puts the first thing
       at the reading edge, so it lands left on one and right on the
       other without a second rule. */
    '<a class="back-link" href="' + site.escapeHtml(backHref) + '">' +
    '<span aria-hidden="true">' + (rtl ? '→' : '←') + '</span> ' +
    site.escapeHtml(record.category.title) +
    '</a>' +
    /* The label is Urdu whatever the work is, so on an English page `.urdu`
       would strand it at the far margin, across the column from the title
       it names. It stays Urdu — Nastaliq, right to left within itself —
       and moves to the margin the page is read from. */
    (record.kind
      ? '<p class="section-label urdu' + (rtl ? '' : ' align-left') + '" lang="ur" dir="rtl">' +
        site.escapeHtml(record.kind) + '</p>'
      : '') +
    site.titleMarkup(record, 'h1') +
    (site.formatDate(record.date) ? '<p class="work-date">' + site.escapeHtml(site.formatDate(record.date)) + '</p>' : '') +
    prose +
    (files
      ? '<div class="work-page-files" id="work-page-files">' + files + '</div>'
      : '<p class="availability-note" id="work-page-files">This one isn’t published here yet. Write to the author if you need it.</p>') +
    site.imageGallery(record) +
    site.tagMarkup(record) +
    '</section>';

  /* Built as a DOM node rather than a string, because the buttons carry
     their own listeners — same helper the post pages use.

     A work page has no Print (see pageTools: it only ever offers that
     where the writing itself is the page), so what lands here is a lone
     Share button. Set at the very end of the section it would read as an
     afterthought, stranded below tags that have nothing to do with it —
     it belongs with the thing it shares, which is the file above, not
     with the metadata below. So it goes right after the download
     buttons — or the "not published yet" note, when there is nothing to
     download — and before the gallery and tags. */
  var tools = site.pageTools(record, pageUrl);
  var anchor = document.getElementById('work-page-files');
  if (anchor) anchor.insertAdjacentElement('afterend', tools);
  else main.querySelector('.work-hero').appendChild(tools);
})();
