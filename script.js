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
      ' data-id="' + site.escapeHtml(id) + '"' +
      ' data-search="' + site.escapeHtml(searchIndex[id] || '') + '"' +
      ' data-skeleton="' + site.escapeHtml(skeletonIndex[id] || '') + '"'
    );
  }

  /* Both descriptions, the record's own language first. A work written
     in Urdu leads with the Urdu; an English fatwa leads with the English. */
  function prose(record) {
    var rtl = site.direction(record.language) === 'rtl';
    return (rtl
      ? [[record.descriptionUr, 'ur'], [record.description, record.language]]
      : [[record.description, record.language], [record.descriptionUr, 'ur']])
      .filter(function (pair) { return pair[0]; })
      .map(function (pair) { return site.proseMarkup(pair[0], '', pair[1]); })
      .join('');
  }

  function workMarkup(work) {
    /* A post has no file and needs none — the writing is the page. Only a
       record that is waiting for a document says so. */
    var published = (work.files && work.files.length) || work.page;
    var status = published ? '' : '<p class="availability-note">Not published here yet.</p>';
    /* Everything about a row now travels on the one axis its own script
       starts from. The kind label used to be pinned to the left edge in a
       column of its own while an Urdu title sat flush right 600px away, and
       an English title in the same list aligned left instead — so the row
       read as two things at opposite edges, and which edge changed row to
       row. Only the toggle stays put, so the column of + still lines up. */
    var reads = site.direction(work.language) === 'rtl' ? 'reads-rtl' : 'reads-ltr';
    return (
      '<details class="work' + (published ? '' : ' work-pending') + '"' + searchAttr(work.id) + '>' +
      '<summary>' +
      '<span class="work-head ' + reads + '" dir="' + site.direction(work.language) + '">' +
      site.titleMarkup(work) +
      '<span class="work-line">' +
      site.kindMarkup(work) +
      site.metaMarkup(work) +
      '</span>' +
      '</span>' +
      '<span class="toggle" aria-hidden="true">+</span>' +
      '</summary>' +
      '<div class="work-detail ' + reads + '">' +
      /* The date used to be repeated here. It is on the row itself now,
         where it can be read without opening anything. */
      prose(work) +
      status +
      '<div class="work-actions">' +
      '<a class="text-link" href="' + site.escapeHtml(site.recordHref(work)) + '">' +
      (work.page ? 'Read →' : 'Open details →') +
      '</a>' +
      /* Sharing from the list, without opening the piece first. Someone
         who knows the library is usually looking for the one thing a
         student asked about, and making them open it to find the button
         is a step for nothing. */
      '<button class="text-link share-button" type="button" data-share="' + site.escapeHtml(work.id) + '">Share</button>' +
      '<span class="share-note" role="status" aria-live="polite"></span>' +
      '</div>' +
      /* The files are their own block, not more things on the end of that
         row. Six charts wrapped into it came out ragged — every Download
         landed wherever the title before it happened to finish. */
      (site.fileLinks(work) ? '<div class="work-files">' + site.fileLinks(work) + '</div>' : '') +
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
        /* The two names are the same name twice. Set one under the other on
           the same edge — they were at opposite ends of a 1130px head, which
           stopped them reading as a pair. align-left for the same reason the
           labels in index.html carry it: `.urdu` would otherwise send the
           block right, away from the English heading above it. */
        var count = (category.works || []).length;
        return (
          '<section class="work-category" id="' + site.escapeHtml(category.id) + '">' +
          '<header class="work-category-head">' +
          '<div class="work-category-names">' +
          /* A drawing beside the name: seven cards carry the whole
             library and were told apart by nothing but their headings,
             so a reader scrolling had no landmark to aim at. */
          '<h3>' + site.categoryIcon(category, 'category-icon') +
          site.escapeHtml(category.title) + '</h3>' +
          (category.titleUr ? '<p class="category-urdu urdu align-left" lang="ur" dir="rtl">' + site.escapeHtml(category.titleUr) + '</p>' : '') +
          (category.blurb ? site.proseMarkup(category.blurb, 'category-blurb') : '') +
          '</div>' +
          '<span class="work-category-count">' + count + (count === 1 ? ' work' : ' works') + '</span>' +
          '</header>' +
          (category.works || []).map(workMarkup).join('') +
          '</section>'
        );
      })
      .join('');
  }

  /* One listener for the whole library rather than one per row: the list
     is rebuilt whenever a category is chosen, and handlers attached to
     rows would have to be attached again every time. */
  if (library) {
    library.addEventListener('click', function (event) {
      var button = event.target.closest('[data-share]');
      if (!button) return;
      var record = site.findRecord(button.getAttribute('data-share'));
      if (!record) return;
      var note = button.parentNode.querySelector('.share-note');
      site.shareRecord(record, site.absoluteUrl(site.recordHref(record))).then(function (line) {
        if (note) note.textContent = line;
      });
    });
  }

  /* ---- Fatawa ---- */

  if (rulingsGrid) {
    rulingsGrid.innerHTML = (content.rulings || [])
      .map(function (ruling) {
        return (
          '<a class="ruling" href="work.html?work=' + encodeURIComponent(ruling.id) + '"' + searchAttr(ruling.id) + '>' +
          /* div, not span: these hold an h3 and paragraphs, which a span
             may not carry. The card is an <a>, whose content model is
             whatever surrounds it — flow content here — so a div inside
             one is right where a span would not be. */
          '<div class="ruling-body">' +
          site.titleMarkup(ruling, 'h3') +
          prose(ruling) +
          '</div>' +
          '<div class="ruling-foot">' +
          site.metaMarkup(ruling) +
          '<span class="ruling-open">Read →</span>' +
          '</div>' +
          '</a>'
        );
      })
      .join('');
  }

  /* ---- Search ---- */

  if (searchInput && library) {
    var rulingsSection = document.getElementById('rulings');
    var librarySection = document.getElementById('library');

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

      /* The word actually typed, wherever it survives in a visible
         title — not the id, the tags or a file label the search also
         looks inside, since only the title is ever shown in the list.
         approximate results use the skeleton, which no longer
         resembles what was typed closely enough to mark inside the
         real spelling, so those go back to plain text. */
      function highlight(element, hit) {
        var title = element.querySelector('.record-title');
        if (!title) return;
        var record = site.findRecord(element.getAttribute('data-id'));
        if (!record) return;
        title.innerHTML = (hit && term && !approximate)
          ? site.highlightText(record.title, words)
          : site.escapeHtml(record.title);
      }

      var works = 0;
      var rulings = 0;

      library.querySelectorAll('.work-category').forEach(function (category) {
        var visibleHere = 0;
        category.querySelectorAll('.work').forEach(function (work) {
          var hit = matches(work);
          work.hidden = !hit;
          highlight(work, hit);
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
          highlight(ruling, hit);
          if (hit) rulings += 1;
        });
        if (rulingsSection) rulingsSection.hidden = term && rulings === 0;
      }

      /* While a search is running these two are results, not chapters of a
         page being browsed. Left at chapter spacing, a search that matched
         only a fatwa put it a screen and a half below the count that said
         it was there — so the page read as empty. */
      document.body.classList.toggle('is-searching', term);
      if (librarySection) librarySection.classList.toggle('is-empty', term && works === 0);

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
