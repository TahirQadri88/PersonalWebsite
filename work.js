/* work.html?work=<id> — kept only because an address in this shape has
   already been shared. Every record published through admin.html now has
   a real page of its own — works/<id>.html for a work or a fatwa,
   record.page for a post — with its title, description and picture
   written into the file, which is what a crawler actually reads. See
   admin.js's buildWork for what that page contains, and common.js for
   the same redirect a post already makes.

   A record added straight into content.js by hand, the way the README
   still allows, has no such file yet — nothing here builds one, and the
   site's own rule is that nothing has to be built for it to work. So
   this checks first: if the real page exists, it sends the visitor
   straight there; if it does not, this page renders the record itself,
   exactly as it always did before those pages existed. Either way the
   record shows up. Only the crawler-friendly file is missing until an
   editor session publishes it once. */

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

  var target = site.ownPage(record);

  fetch(target, { method: 'HEAD' })
    .then(function (response) {
      if (response.ok) window.location.replace(target);
      else render();
    })
    .catch(render); // file:// blocks the check outright — render is right there too

  /* The record has no page of its own yet. Show it here, the way this
     page always did before admin.html started writing one — nothing a
     reader does should depend on whether that has happened. */
  function render() {
    document.title = record.title + ' — Abul Laith Muhammad Tahir Qadri';

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
    var rtl = site.direction(record.language) === 'rtl';

    var prose = (rtl
      ? [[record.descriptionUr, 'ur'], [record.description, record.language]]
      : [[record.description, record.language], [record.descriptionUr, 'ur']])
      .filter(function (pair) { return pair[0]; })
      .map(function (pair) { return site.proseMarkup(pair[0], 'work-page-description', pair[1]); })
      .join('');

    main.innerHTML =
      '<section class="work-hero"' + (rtl ? ' dir="rtl"' : '') + '>' +
      '<a class="back-link" href="' + site.escapeHtml(backHref) + '">' +
      '<span aria-hidden="true">' + (rtl ? '→' : '←') + '</span> ' +
      site.escapeHtml(record.category.title) +
      '</a>' +
      /* align-left only when the label is Urdu and the page is not:
         `.urdu` would otherwise set it against the far margin. An English
         kind on an English page needs nothing — it is already there. No
         `own-edge`: a kind is one or two words from a closed list and
         has never taken a second line. */
      site.kindMarkup(record, 'section-label' + (rtl ? '' : ' align-left'), 'p') +
      site.titleMarkup(record, 'h1') +
      (site.formatDate(record.date) ? '<p class="work-date">' + site.escapeHtml(site.formatDate(record.date)) + '</p>' : '') +
      prose +
      (files
        ? '<div class="work-page-files" id="work-page-files">' + files + '</div>'
        : '<p class="availability-note" id="work-page-files">This one isn’t published here yet. Write to the author if you need it.</p>') +
      site.imageGallery(record) +
      site.tagMarkup(record) +
      '</section>';

    var tools = site.pageTools(record, pageUrl);
    var anchor = document.getElementById('work-page-files');
    if (anchor) anchor.insertAdjacentElement('afterend', tools);
    else main.querySelector('.work-hero').appendChild(tools);
  }
})();
