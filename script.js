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

    /* One card, not a fraction of the window. The old step was 70% of
       the track's width, which on a desktop moved two and a half cards
       and left the third cut in half at the edge — the thing that makes
       a strip look like it is holding more than it can. With scroll-snap
       under it the browser settles on a card boundary anyway, so the two
       have to agree about what a step is. */
    var step = function () {
      var first = track.querySelector(':scope > *');
      if (!first) return Math.max(160, track.clientWidth * 0.7);
      var box = first.getBoundingClientRect();
      var style = getComputedStyle(first);
      return box.width + (parseFloat(style.marginRight) || 0) + (parseFloat(style.marginLeft) || 0);
    };

    /* A reader who has asked for less motion gets the same journey
       without the slide. `scrollBy` with `smooth` is motion like any
       other, and it is the one kind this site kept forgetting to ask
       about because it is written in JavaScript rather than CSS. */
    var gently = function () {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto' : 'smooth';
    };

    var nudge = function (direction) {
      return function () {
        track.scrollBy({ left: direction * step(), behavior: gently() });
      };
    };

    if (back) back.addEventListener('click', nudge(-1));
    if (forward) forward.addEventListener('click', nudge(1));
    track.addEventListener('scroll', refreshEnds, { passive: true });
    window.addEventListener('resize', refreshEnds);
    refreshEnds();
    /* The step goes out with it: whatever else moves this track has to
       move it by the same amount the buttons do, or the snapping and the
       controls end up arguing about where a card begins. */
    return { ends: refreshEnds, step: step, gently: gently };
  }

  /* ---- Moving on its own, without taking the wheel ----------------

     The strip used to drift for ever and could not be steered; then it
     was steerable and did not move at all, and read as a static row of
     cards with no sign there were more. Both reports are the same
     report: a shelf of recent things has to *say* it is a shelf, and
     movement is how a row says that.

     The difference from the conveyor is what it moves. That one animated
     a CSS transform on a cloned track, which is why the arrows had to be
     taken away — a transform and a drag cannot share one element. This
     scrolls the real track by one real card, which is exactly what the
     buttons do, so every control keeps working while it runs and the
     dots follow it without being told.

     It gives way immediately. Hovering or tabbing in pauses it; taking
     hold of it at all — a button, a dot, a finger on the track — stops
     it for good, because someone steering does not want to be steered.
     It never runs under `prefers-reduced-motion`, never when everything
     already fits, and never while the tab is in the background. */
  var ADVANCE_MS = 4500;

  function autoAdvance(section, bar, track, rails) {
    if (!section || !bar || !track || !rails) return null;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
    /* Nothing to advance past, so nothing to say. */
    if (track.scrollWidth <= track.clientWidth + 1) return null;

    var timer = null;
    var stopped = false;

    var tick = function () {
      var max = track.scrollWidth - track.clientWidth;
      /* Round to the start rather than reversing. A shelf that walks
         backwards reads as a fault; one that comes round again reads as
         a loop, which is what it is. */
      if (track.scrollLeft >= max - 1) track.scrollTo({ left: 0, behavior: rails.gently() });
      else track.scrollBy({ left: rails.step(), behavior: rails.gently() });
    };

    var pause = function () { window.clearInterval(timer); timer = null; };
    var start = function () {
      if (stopped || timer || document.hidden) return;
      timer = window.setInterval(tick, ADVANCE_MS);
    };
    var stop = function () {
      stopped = true;
      pause();
      bar.removeAttribute('data-moving');
    };

    /* The section, not the rail: the dots are written in beside it, and a
       tap on one is a reader taking hold as surely as a tap on an arrow. */
    section.addEventListener('mouseenter', pause);
    section.addEventListener('mouseleave', start);
    section.addEventListener('focusin', pause);
    section.addEventListener('focusout', start);
    section.addEventListener('pointerdown', stop);
    section.addEventListener('keydown', stop);
    /* A wheel or a trackpad swipe over the track is steering too, and it
       raises no pointer event. */
    track.addEventListener('wheel', stop, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause(); else start();
    });

    bar.setAttribute('data-moving', 'on');
    start();
    return stop;
  }

  /* ---- Where you are in a carousel ----

     A row of dots under the track, one per card, the one you are on
     marked. Instagram's, and it is the part that was missing: the strip
     said nothing about how much of it there was or how far along you
     had got, so eight cards drifting past read as an endless supply.

     Built here rather than written into index.html, deliberately. A dot
     does nothing without script — it is a control, not content — and a
     reader without JavaScript gets the cards and a track they can still
     swipe, which is the whole of what the dots were offering. Nothing
     starts invisible waiting for this to run. */
  function dots(bar, track, refreshEnds, onTake) {
    if (!bar || !track) return;
    var cards = Array.prototype.slice.call(track.children);
    if (cards.length < 2) return;

    var strip = document.createElement('div');
    strip.className = 'rail-dots';
    strip.setAttribute('role', 'tablist');
    strip.setAttribute('aria-label', 'Position in the list');

    var marks = cards.map(function (card, index) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'rail-dot';
      dot.setAttribute('role', 'tab');
      /* The card's own title, so a screen reader is told where a dot
         goes rather than "button 3 of 8". */
      var title = card.querySelector('.record-title');
      dot.setAttribute('aria-label',
        'Show ' + ((title && title.textContent.trim()) || 'item ' + (index + 1)));
      dot.addEventListener('click', function () {
        if (onTake) onTake();
        track.scrollTo({
          left: card.offsetLeft - track.offsetLeft,
          behavior: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto' : 'smooth'
        });
      });
      strip.appendChild(dot);
      return dot;
    });

    /* Read off live geometry on every scroll rather than counted from a
       step — the same decision markPlace makes, and for the same reason:
       a remembered position goes stale the moment anything resizes, and
       the browser's own snapping is what actually decides where a card
       came to rest. */
    var mark = function () {
      /* The card nearest the track's own left edge, not the one nearest
         its middle. The cards snap on `start`, so this is the edge the
         browser actually comes to rest against — and on a desktop, where
         four cards are in view at once, measuring from the middle put
         the mark on the third one after a single press forward. The dot
         has to answer "how far along am I", which is a question about
         where the run of cards begins. */
      var edge = track.scrollLeft;
      var nearest = 0;
      var best = Infinity;
      cards.forEach(function (card, index) {
        var start = card.offsetLeft - track.offsetLeft;
        var gap = Math.abs(start - edge);
        if (gap < best) { best = gap; nearest = index; }
      });
      marks.forEach(function (dot, index) {
        if (index === nearest) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
        dot.setAttribute('aria-selected', String(index === nearest));
      });
    };

    track.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('resize', mark);
    bar.insertAdjacentElement('afterend', strip);
    mark();
    if (refreshEnds) refreshEnds();
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
      /* `.ends` — rail() hands back its step as well now, for the timer
         that moves the strip below. Reading the object as though it were
         still the bare function threw on every page load, which is what
         the "nothing threw" guard is there to catch. */
      var refreshEnds = rail(bar, nav,
        document.getElementById('cat-back'), document.getElementById('cat-forward')).ends;

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

    /* Measured at 390px the header is 68 and this strip 69, and
       `scroll-padding-top` reserves 152 for the pair — so a section counts
       as reached once its heading has cleared the chrome, at roughly the
       same line a jump to it would put it. (Those numbers were 72 and 55
       when this was written, and 128 was the reservation; the comment said
       so long after all three had moved. The number below is the only one
       of them that does anything.) */
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
      site.proseBlock(work) +
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

  /* Both watchers need the categories to exist, and the loop above is
     what writes them — so both start here rather than where they are
     defined. */
  site.drawIconsOnEntry();
  if (startSpy) startSpy();

  /* ---- The strip of recently changed things ----

     Its cards are written into index.html at publish time, not by this
     file, so a crawler and a reader with no JavaScript both get them.
     What happens here is only how they move.

     It is a carousel: a track the browser snaps to a card boundary, a
     step either way, and a row of dots under it saying how many cards
     there are and which one is in view. All three are the same rail the
     category strip uses, which is why `rail()` is written once and
     called twice.

     Everything added here is a control rather than content, so a reader
     without JavaScript loses none of the cards — they are in the file —
     and keeps the one thing that needs no script at all: a track they
     can still swipe. */
  var recentRail = document.getElementById('recent-rail');
  var recentTrack = document.getElementById('recent-track');

  /* A carousel, not a conveyor. What was here drifted on its own and
     took the arrows away while it did — `startTicker` removed the very
     attributes the arrows are shown by — so the strip could not be
     scrolled, could not be stepped through, and could not be stopped at
     all on a phone, where there is no hover to pause it with. Eight
     cards sliding past with no way to go back to one is the "overloaded"
     the author reported, and it was the right word.

     Now it is a track you swipe, with a step either way and a dot per
     card saying how many there are and which one you are on. The cards
     still rise as they arrive; that was never the problem, and it is a
     decoration that costs nothing when it does not run. */
  var recentRails = rail(recentRail, recentTrack,
       document.getElementById('recent-back'), document.getElementById('recent-forward'));
  var stopMoving = autoAdvance(document.getElementById('recent'), recentRail, recentTrack, recentRails);
  dots(recentRail, recentTrack, recentRails && recentRails.ends, stopMoving);
  site.revealOnEntry('.recent-card');

  /* The ticker that used to live here is gone, and with it the clone of
     the whole set, the seam arithmetic that made the loop join, and the
     hover-to-pause that a touchscreen could never reach. What replaced
     it is smaller and does more: the browser's own scroll-snap, two
     buttons and a row of dots.

     Worth knowing if it is ever missed: the drift was real motion on
     something a reader had not asked to move, and the only way to read a
     card was to wait for it to come round again.

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
          /* The ruling's own page. This said work.html?work=<id> — the
             redirect kept for links already shared — so every fatwa on
             the homepage went out through a redirect while every work
             beside it went straight to its page. recordHref is what the
             library rows have always used; the fatawa were simply
             missed when works gained pages of their own. */
          '<a class="ruling" href="' + site.escapeHtml(site.recordHref(ruling)) + '"' + searchAttr(ruling.id) + '>' +
          /* div, not span: these hold an h3 and paragraphs, which a span
             may not carry. The card is an <a>, whose content model is
             whatever surrounds it — flow content here — so a div inside
             one is right where a span would not be. */
          '<div class="ruling-body">' +
          site.titleMarkup(ruling, 'h3') +
          site.proseBlock(ruling) +
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

    /* Whether a search is already running, so the box is brought to the
       top of the screen on the way into one and not on every keystroke.
       `site.anchorSearch` says why, and the fatawa page's own filter calls
       the same helper — a search on one page that moves the reader and a
       search on the other that does not is exactly the drift this file
       and `common.js` have already been bitten by. */
    var searching = false;

    searchInput.addEventListener('input', function () {
      /* Every word has to appear, but not in the order given and not next
         to each other. "zakat tax", "tax zakat" and "fatwa zakat" all find
         the same ruling, which one long substring could not. */
      var words = site.fold(searchInput.value).split(' ').filter(Boolean);
      var term = words.length > 0;
      if (term && !searching) site.anchorSearch(searchInput);
      searching = term;

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

        /* The badge counts the category, and during a search the category
           is not what is on the screen. Looking at the filtered page, the
           head read "2 works" over one row — which says the library lost
           something rather than that the search hid it. "1 of 2 works"
           says both: how many matched, and that the rest are still there.
           The whole count is kept on the element, since the markup it came
           from is written once and the search runs on every keystroke. */
        var badge = category.querySelector('.work-category-count');
        if (!badge) return;
        if (!badge.hasAttribute('data-all')) badge.setAttribute('data-all', badge.textContent);
        var all = badge.getAttribute('data-all');
        badge.textContent = term ? visibleHere + ' of ' + all : all;
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
        /* The record's own page, not the redirect. This told a crawler
           that the address of every one of the twenty-four records was
           work.html?work=<id>, each of which redirects to a page whose
           own canonical tag says something else. */
        url: site.absoluteUrl(site.recordHref(record))
      };
    })
  });

  /* ---- Deep links ---- */

  var bio = document.getElementById('bio');
  if (bio && (window.location.hash === '#bio' || window.location.hash === '#about')) bio.open = true;
})();
