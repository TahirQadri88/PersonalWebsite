/* Homepage: builds the library, the category nav and the search. */

(function () {
  'use strict';

  var site = window.site;
  if (!site) return;

  var content = site.content;
  var library = document.getElementById('work-library');
  var nav = document.getElementById('category-nav');
  var rulingsGrid = document.getElementById('rulings-library');
  var searchInput = document.getElementById('work-search');
  var searchCount = document.getElementById('search-count');

  /* ---- Category navigation ---- */

  if (nav) {
    var navItems = (content.categories || []).map(function (category) {
      return '<a href="#' + site.escapeHtml(category.id) + '">' + site.escapeHtml(category.title) + '</a>';
    });
    navItems.push('<a href="#rulings">Fatawa</a>');
    nav.innerHTML = navItems.join('');
  }

  /* ---- The library ---- */

  function workMarkup(work) {
    var status = work.files && work.files.length ? '' : '<p class="availability-note">Not published here yet.</p>';
    return (
      '<details class="work' + (work.files && work.files.length ? '' : ' work-pending') + '">' +
      '<summary>' +
      (work.kind ? '<span class="work-kind" lang="ur" dir="rtl">' + site.escapeHtml(work.kind) + '</span>' : '<span class="work-kind"></span>') +
      site.titleMarkup(work) +
      '<span class="toggle" aria-hidden="true">+</span>' +
      '</summary>' +
      '<div class="work-detail">' +
      (work.description ? '<p>' + site.escapeHtml(work.description) + '</p>' : '') +
      site.tagMarkup(work) +
      status +
      '<div class="work-actions">' +
      '<a class="text-link" href="work.html?work=' + encodeURIComponent(work.id) + '">Open details →</a>' +
      site.fileLinks(work) +
      '</div></div></details>'
    );
  }

  if (library) {
    library.innerHTML = (content.categories || [])
      .map(function (category) {
        return (
          '<section class="work-category" id="' + site.escapeHtml(category.id) + '">' +
          '<header class="work-category-head">' +
          '<h3>' + site.escapeHtml(category.title) + '</h3>' +
          (category.titleUr ? '<p class="category-urdu urdu" lang="ur" dir="rtl">' + site.escapeHtml(category.titleUr) + '</p>' : '') +
          (category.blurb ? '<p class="category-blurb">' + site.escapeHtml(category.blurb) + '</p>' : '') +
          '</header>' +
          (category.works || []).map(workMarkup).join('') +
          '</section>'
        );
      })
      .join('');
  }

  /* ---- Fatawa ---- */

  if (rulingsGrid) {
    rulingsGrid.innerHTML = (content.rulings || [])
      .map(function (ruling) {
        return (
          '<a class="ruling" href="work.html?work=' + encodeURIComponent(ruling.id) + '">' +
          site.titleMarkup(ruling, 'h3') +
          (ruling.description ? '<p>' + site.escapeHtml(ruling.description) + '</p>' : '') +
          '<span class="ruling-open">Read →</span>' +
          '</a>'
        );
      })
      .join('');
  }

  /* ---- Search ---- */

  if (searchInput && library) {
    searchInput.addEventListener('input', function () {
      var term = searchInput.value.trim().toLocaleLowerCase();
      var matches = 0;

      library.querySelectorAll('.work-category').forEach(function (category) {
        var visibleHere = 0;
        category.querySelectorAll('.work').forEach(function (work) {
          var hit = !term || work.textContent.toLocaleLowerCase().indexOf(term) !== -1;
          work.hidden = !hit;
          if (hit) visibleHere += 1;
        });
        category.hidden = visibleHere === 0;
        matches += visibleHere;
      });

      if (!searchCount) return;
      if (!term) searchCount.textContent = '';
      else if (matches === 0) searchCount.textContent = 'Nothing matches “' + searchInput.value.trim() + '”. Try a shorter word.';
      else searchCount.textContent = matches + (matches === 1 ? ' work' : ' works');
    });
  }

  /* ---- One work open at a time ---- */

  if (library) {
    library.addEventListener('toggle', function (event) {
      var opened = event.target;
      if (!opened.classList.contains('work') || !opened.open) return;
      library.querySelectorAll('.work[open]').forEach(function (other) {
        if (other !== opened) other.removeAttribute('open');
      });
    }, true);
  }

  /* ---- Structured data ----
     The library as a collection, with every work and fatwa listed, so a
     search engine can see the titles even though the markup above is built
     at runtime. Generated from content.js, so it cannot drift. */

  site.addJsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'My Works — ' + ((content.site && content.site.name) || ''),
    url: site.absoluteUrl(''),
    inLanguage: ['ur', 'ar', 'en'],
    author: site.author(),
    about: site.author(),
    hasPart: site.allRecords().map(function (record) {
      return {
        '@type': 'CreativeWork',
        name: record.title,
        inLanguage: record.language || 'en',
        genre: record.kind || undefined,
        description: record.description || undefined,
        url: site.absoluteUrl('work.html?work=' + encodeURIComponent(record.id))
      };
    })
  });

  /* ---- Deep links ---- */

  var bio = document.getElementById('bio');
  if (bio && (window.location.hash === '#bio' || window.location.hash === '#about')) bio.open = true;
})();
