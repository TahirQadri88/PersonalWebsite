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
  var startSpy = null;

  /* A strip holding more than fits, with a fade and an arrow at whichever
     end still has something. Written for the category bar; the recently
     updated rail behaves the same way and there is no reason for it to
     learn the behaviour again.

     It scrolls the track and nothing else. scrollIntoView was the obvious
     call and it is the wrong one: it scrolls every scrollable ancestor,
     the document included, so the rail dragged the page back to whatever
     it had just moved to and a reader could not get past it. */
  function rail(bar, track, back, forward) {
    if (!bar || !track) return null;

    var refreshEnds = function () {
      /* A pixel of slack: browsers round fractional scroll positions, and
         an arrow that never quite goes away looks broken. */
      var max = track.scrollWidth - track.clientWidth;
      bar.setAttribute('data-more-before', String(track.scrollLeft > 1));
      bar.setAttribute('data-more-after', String(track.scrollLeft < max - 1));
    };

    var nudge = function (direction) {
      return function () {
        track.scrollBy({ left: direction * Math.max(160, track.clientWidth * 0.7),
                         behavior: 'smooth' });
      };
    };

    if (back) back.addEventListener('click', nudge(-1));
    if (forward) forward.addEventListener('click', nudge(1));
    track.addEventListener('scroll', refreshEnds, { passive: true });
    window.addEventListener('resize', refreshEnds);
    refreshEnds();
    return refreshEnds;
  }

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
      var refreshEnds = rail(bar, nav,
        document.getElementById('cat-back'), document.getElementById('cat-forward'));

      /* Which section you are actually in. The strip has listed all seven
         since it was written and never said which one you were reading;
         on a page this long that is the one thing it could usefully do.

         aria-current rather than a class of our own: it is what the
         attribute means, a reader using a screen reader gets told, and
         the styling hook comes free with it.

         Held rather than called: six of the seven sections it watches are
         written by the loop further down, so starting it here would find
         only the fatawa — which is exactly what it did. */
      startSpy = function () { markPlace(nav, refreshEnds); };
    }
  }

  /* Marked from the section that is nearest the top of what you can see,
     not merely the one that is visible — several are, on a wide screen. */
  function markPlace(nav, refreshEnds) {
    if (!window.IntersectionObserver) return;
    var links = {};
    Array.prototype.forEach.call(nav.querySelectorAll('a[href^="#"]'), function (link) {
      links[link.getAttribute('href').slice(1)] = link;
    });

    var watched = [];
    var current = null;

    /* The header is 72px and this strip about 55 — the same 128 that
       `scroll-padding-top` already reserves, plus a little, so a section
       counts as reached once its heading has cleared the chrome. */
    var LINE = 150;

    var settle = function () {
      /* Read the page rather than remember it. The observer says when to
         look; where things are is a question only the current geometry
         can answer, and a stored top goes stale the moment you scroll.
         An earlier version sorted stored tops and picked the smallest,
         which is a section long since scrolled past — it marked the first
         category whatever you were actually reading. */
      var next = null;
      for (var i = 0; i < watched.length; i += 1) {
        if (watched[i].getBoundingClientRect().top <= LINE) next = watched[i].id;
      }
      /* Nothing has reached the line yet — you are above the first
         section, so nothing is marked rather than the wrong thing. */
      if (next === current) return;
      current = next;
      Object.keys(links).forEach(function (id) {
        if (id === current) links[id].setAttribute('aria-current', 'true');
        else links[id].removeAttribute('aria-current');
      });
      if (!current || !links[current]) return;

      /* Bring the marked pill into the strip — and only the strip.
         scrollIntoView was the obvious call and it is the wrong one: it
         scrolls every scrollable ancestor, the document included, so the
         rail kept dragging the page back to whatever it had just marked
         and the reader could not scroll past the first category. This
         moves the one element that should move. */
      var pill = links[current];
      var left = pill.offsetLeft;
      var right = left + pill.offsetWidth;
      var view = nav.scrollLeft;
      var edge = view + nav.clientWidth;
      /* Room for the fade and arrow the strip draws over its own ends. */
      var margin = 48;
      var to = null;
      if (left - margin < view) to = Math.max(0, left - margin);
      else if (right + margin > edge) to = right + margin - nav.clientWidth;
      if (to === null) return;

      var quiet = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      nav.scrollTo({ left: to, behavior: quiet ? 'auto' : 'smooth' });
      if (refreshEnds) refreshEnds();
    };

    /* 128px is what `scroll-padding-top` already reserves for the sticky
       header and this strip — one number for the same thing, rather than
       a second one that could drift from it. */
    var watcher = new IntersectionObserver(settle, { threshold: [0, 0.02, 0.5, 1] });

    Array.prototype.forEach.call(
      document.querySelectorAll('.work-category[id], #rulings'),
      function (section) {
        if (!links[section.id]) return;
        watched.push(section);
        watcher.observe(section);
      }
    );
    /* A section taller than the window fires nothing while you scroll
       through the middle of it, so the observer alone leaves the mark
       stuck. The scroll listener is the one that keeps it honest; the
       observer is what starts it and what catches a resize reflow. */
    window.addEventListener('scroll', settle, { passive: true });
    settle();
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
    /* own-edge, not align-left, for the left-reading case: a paragraph
       of Urdu pinned at the left has every line *beginning* in a
       different place, because an Urdu line begins on its right. See
       styles.css. */
    var edge = rtl ? 'align-right' : 'align-left own-edge';
    return (rtl
      ? [[record.descriptionUr, 'ur'], [record.description, record.language]]
      : [[record.description, record.language], [record.descriptionUr, 'ur']])
      .filter(function (pair) { return pair[0]; })
      .map(function (pair) { return site.proseMarkup(pair[0], edge, pair[1]); })
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
      /* An app is opened, and the point of its row is to open it — so the
         first thing on the row goes straight to the app, and the page
         about it comes second. Everything else here reaches its own page
         first because its own page is where the document is. */
      (work.app && work.app.url
        ? '<a class="text-link" href="' + site.escapeHtml(work.app.url) + '"' +
          (site.isOffsite(work.app.url) ? ' target="_blank" rel="noopener"' : '') +
          '>Open the app ' + site.icon('open', 'icon-inline') + '</a>' +
          '<a class="text-link" href="' + site.escapeHtml(site.recordHref(work)) + '">About this app →</a>'
        : '<a class="text-link" href="' + site.escapeHtml(site.recordHref(work)) + '">' +
          (work.page ? 'Read →' : 'Open details →') +
          '</a>') +
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
          (category.titleUr ? '<p class="category-urdu urdu align-left own-edge" lang="ur" dir="rtl">' + site.escapeHtml(category.titleUr) + '</p>' : '') +
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

  /* Both watchers need the categories to exist, and the loop above is
     what writes them — so both start here rather than where they are
     defined. */
  site.drawIconsOnEntry();
  if (startSpy) startSpy();

  /* ---- The strip of recently changed things ----

     Its cards are written into index.html at publish time, not by this
     file, so a crawler and a reader with no JavaScript both get them.
     What happens here is only how they move.

     Two behaviours, and the quiet one is the default. Left alone the
     strip is a rail you scroll, with the arrows and the fades the
     category strip already taught. Where motion is allowed and there is
     more than fits, it becomes a ticker instead: the set of cards is
     cloned once and the pair drifts leftwards for ever.

     The clones are made here and never written into the page. That
     matters — the cards are in index.html so that a reader without
     JavaScript gets them, and baking the duplicates in would give that
     reader, and a crawler, every card twice. Made here, they exist only
     where they are actually moving.

     Each clone is hidden from assistive technology and taken out of the
     tab order, so a screen reader and the keyboard meet each card once
     however many copies are on screen. */
  var recentRail = document.getElementById('recent-rail');
  var recentTrack = document.getElementById('recent-track');

  if (!startTicker(recentRail, recentTrack)) {
    rail(recentRail, recentTrack,
         document.getElementById('recent-back'), document.getElementById('recent-forward'));
    /* The cards rise as you reach them — but only when they are standing
       still. Under the ticker they are already arriving, and two
       movements at once is neither. */
    site.revealOnEntry('.recent-card');
  }

  /* True when the ticker took over. It declines, leaving the rail as it
     is, when a reader has asked for less motion, when there are no cards,
     or when they all fit — there is nothing to drift past. */
  function startTicker(bar, track) {
    if (!bar || !track) return false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

    var cards = Array.prototype.slice.call(track.children);
    if (!cards.length) return false;
    if (track.scrollWidth <= track.clientWidth + 1) return false;

    var ticker = document.createElement('div');
    ticker.className = 'recent-ticker';
    cards.forEach(function (card) { ticker.appendChild(card); });

    /* Exactly once. The pair is translated by half its own width, so one
       copy is what makes the seam land where the first card began —
       three copies, or one and a half, would not. */
    var twin = ticker.cloneNode(true);
    Array.prototype.forEach.call(twin.children, function (card) {
      card.setAttribute('aria-hidden', 'true');
      card.setAttribute('tabindex', '-1');
    });
    while (twin.firstChild) ticker.appendChild(twin.firstChild);

    track.appendChild(ticker);

    /* A constant speed rather than a constant duration: four cards and
       twenty should drift past at the same pace, which means the time
       has to come from the width. */
    var PIXELS_PER_SECOND = 42;
    var half = ticker.scrollWidth / 2;
    if (!half) return false;
    ticker.style.setProperty('--drift-seconds', Math.round(half / PIXELS_PER_SECOND) + 's');

    /* The arrows and the manual scroll go together with it: a drag and an
       animation cannot share one track, and an arrow that scrolls a track
       whose contents are being translated underneath does nothing useful.
       Hovering or tabbing into it pauses the drift instead — which is
       also what is owed to anything that moves by itself. */
    bar.setAttribute('data-ticker', 'on');
    bar.removeAttribute('data-more-before');
    bar.removeAttribute('data-more-after');
    return true;
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
