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
    var navItems = (content.categories || [])
      .filter(function (category) {
        return (category.works || []).length > 0;
      })
      .map(function (category) {
        return '<a href="#' + site.escapeHtml(category.id) + '">' + site.escapeHtml(category.title) + '</a>';
      });
    navItems.push('<a href="#rulings">Fatawa</a>');
    nav.innerHTML = navItems.join('');

    /* The strip scrolls when it holds more than fits. Tell the reader so:
       a fade and an arrow appear at whichever end still has something,
       and both go when there is nothing more that way. Marked on the bar
       so it is CSS that decides how to show it. */
    var bar = document.getElementById('category-bar');
    if (bar) {
      var back = document.getElementById('cat-back');
      var forward = document.getElementById('cat-forward');

      var refreshEnds = function () {
        /* A pixel of slack: browsers round fractional scroll positions,
           and an arrow that never quite goes away looks broken. */
        var max = nav.scrollWidth - nav.clientWidth;
        bar.setAttribute('data-more-before', String(nav.scrollLeft > 1));
        bar.setAttribute('data-more-after', String(nav.scrollLeft < max - 1));
      };

      var nudge = function (direction) {
        return function () {
          nav.scrollBy({ left: direction * Math.max(160, nav.clientWidth * 0.7), behavior: 'smooth' });
        };
      };

      if (back) back.addEventListener('click', nudge(-1));
      if (forward) forward.addEventListener('click', nudge(1));
      nav.addEventListener('scroll', refreshEnds, { passive: true });
      window.addEventListener('resize', refreshEnds);
      refreshEnds();
    }
  }

  /* ---- The library ---- */

  /* What each entry can be found by, keyed on its id. Built once from
     content.js through the same helper the detail page uses, so the
     search never disagrees with what is on the page. */
  var searchIndex = {};
  var skeletonIndex = {};
  site.allRecords().forEach(function (record) {
    searchIndex[record.id] = site.searchText(record);
    skeletonIndex[record.id] = site.skeleton(searchIndex[record.id]);
  });

  function searchAttr(id) {
    return (
      ' data-search="' + site.escapeHtml(searchIndex[id] || '') + '"' +
      ' data-skeleton="' + site.escapeHtml(skeletonIndex[id] || '') + '"'
    );
  }

  function workMarkup(work) {
    /* A post has no file and needs none — the writing is the page. Only a
       record that is waiting for a document says so. */
    var published = (work.files && work.files.length) || work.page;
    var status = published ? '' : '<p class="availability-note">Not published here yet.</p>';
    var date = site.formatDate(work.date);
    return (
      '<details class="work' + (published ? '' : ' work-pending') + '"' + searchAttr(work.id) + '>' +
      '<summary>' +
      (work.kind ? '<span class="work-kind" lang="ur" dir="rtl">' + site.escapeHtml(work.kind) + '</span>' : '<span class="work-kind"></span>') +
      site.titleMarkup(work) +
      '<span class="toggle" aria-hidden="true">+</span>' +
      '</summary>' +
      '<div class="work-detail">' +
      (date ? '<p class="work-date">' + site.escapeHtml(date) + '</p>' : '') +
      (work.description ? site.proseMarkup(work.description) : '') +
      status +
      '<div class="work-actions">' +
      '<a class="text-link" href="' + site.escapeHtml(site.recordHref(work)) + '">' +
      (work.page ? 'Read →' : 'Open details →') +
      '</a>' +
      site.fileLinks(work) +
      '</div>' +
      /* Tags sit below the download, not above it. They are for browsing,
         not for reading before you reach the file. */
      site.tagMarkup(work) +
      '</div></details>'
    );
  }

  if (library) {
    library.innerHTML = (content.categories || [])
      /* A category with nothing in it yet renders as a heading over empty
         space, so it waits until it has something to show. */
      .filter(function (category) {
        return (category.works || []).length > 0;
      })
      .map(function (category) {
        return (
          '<section class="work-category" id="' + site.escapeHtml(category.id) + '">' +
          '<header class="work-category-head">' +
          '<h3>' + site.escapeHtml(category.title) + '</h3>' +
          (category.titleUr ? '<p class="category-urdu urdu" lang="ur" dir="rtl">' + site.escapeHtml(category.titleUr) + '</p>' : '') +
          (category.blurb ? site.proseMarkup(category.blurb, 'category-blurb') : '') +
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
          '<a class="ruling" href="work.html?work=' + encodeURIComponent(ruling.id) + '"' + searchAttr(ruling.id) + '>' +
          site.titleMarkup(ruling, 'h3') +
          (ruling.description ? site.proseMarkup(ruling.description) : '') +
          '<span class="ruling-open">Read →</span>' +
          '</a>'
        );
      })
      .join('');
  }

  /* ---- Search ---- */

  if (searchInput && library) {
    var rulingsSection = document.getElementById('rulings');

    searchInput.addEventListener('input', function () {
      /* Every word has to appear, but not in the order given and not next
         to each other. "zakat tax", "tax zakat" and "fatwa zakat" all find
         the same ruling, which one long substring could not. */
      var words = site.fold(searchInput.value).split(' ').filter(Boolean);
      var term = words.length > 0;

      /* Skeletons of the words typed, kept only where they are long enough
         to mean something. "saa" leaves "s", which would match half the
         library, so anything under two consonants is dropped. */
      var loose = words
        .map(function (word) { return site.skeleton(word); })
        .filter(function (word) { return word.length >= 2; });

      /* Two passes. Exact first: every word must appear somewhere in the
         entry. Only if that finds nothing anywhere does the search fall
         back to skeletons, and it says so rather than pretending the
         looser results were what was asked for. */
      var approximate = false;

      function hits(element, attribute, needles) {
        if (!needles.length) return false;
        var hay = element.getAttribute(attribute) || '';
        return needles.every(function (needle) {
          return hay.indexOf(needle) !== -1;
        });
      }

      function matches(element) {
        if (!term) return true;
        if (approximate) return hits(element, 'data-skeleton', loose);
        return hits(element, 'data-search', words);
      }

      function countAll() {
        var n = 0;
        library.querySelectorAll('.work').forEach(function (work) {
          if (matches(work)) n += 1;
        });
        if (rulingsGrid) {
          rulingsGrid.querySelectorAll('.ruling').forEach(function (ruling) {
            if (matches(ruling)) n += 1;
          });
        }
        return n;
      }

      if (term && loose.length && countAll() === 0) approximate = true;

      var works = 0;
      var rulings = 0;

      library.querySelectorAll('.work-category').forEach(function (category) {
        var visibleHere = 0;
        category.querySelectorAll('.work').forEach(function (work) {
          var hit = matches(work);
          work.hidden = !hit;
          if (hit) visibleHere += 1;
        });
        category.hidden = visibleHere === 0;
        works += visibleHere;
      });

      /* The fatawa are part of the library too — they used to sit below
         the search ignoring it entirely, so a search for "zakat" said
         nothing matched while a fatwa on zakat was on screen. */
      if (rulingsGrid) {
        rulingsGrid.querySelectorAll('.ruling').forEach(function (ruling) {
          var hit = matches(ruling);
          ruling.hidden = !hit;
          if (hit) rulings += 1;
        });
        if (rulingsSection) rulingsSection.hidden = term && rulings === 0;
      }

      if (!searchCount) return;
      if (!term) {
        searchCount.textContent = '';
        return;
      }
      if (works + rulings === 0) {
        searchCount.textContent = 'Nothing matches “' + searchInput.value.trim() + '”. Try a shorter word.';
        return;
      }
      var parts = [];
      if (works) parts.push(works + (works === 1 ? ' work' : ' works'));
      if (rulings) parts.push(rulings + (rulings === 1 ? ' fatwa' : ' fatawa'));
      searchCount.textContent =
        (approximate ? 'No exact match — closest: ' : '') + parts.join(' and ');
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
    name: 'Scholarly Works and Research — ' + ((content.site && content.site.name) || ''),
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
