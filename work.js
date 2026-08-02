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

  document.title = record.title + ' — Abul Laith Muhammad Tahir Qadri';
  var description = document.querySelector('meta[name="description"]');
  if (description && record.description) description.setAttribute('content', record.description);

  var backHref = record.category.id === 'rulings' ? 'index.html#rulings' : 'index.html#' + record.category.id;
  var files = site.fileLinks(record, 'button');

  main.innerHTML =
    '<section class="work-hero">' +
    '<a class="back-link" href="' + site.escapeHtml(backHref) + '">← ' + site.escapeHtml(record.category.title) + '</a>' +
    (record.kind ? '<p class="section-label urdu" lang="ur" dir="rtl">' + site.escapeHtml(record.kind) + '</p>' : '') +
    site.titleMarkup(record, 'h1') +
    (record.description ? '<p class="work-page-description">' + site.escapeHtml(record.description) + '</p>' : '') +
    site.tagMarkup(record) +
    (files
      ? '<div class="work-page-files">' + files + '</div>'
      : '<p class="availability-note">This one isn’t published here yet. Write to the author if you need it.</p>') +
    '</section>';
})();
