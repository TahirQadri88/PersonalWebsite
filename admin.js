/* The editor.

   Reads content.js into a working copy, lets you change it through forms,
   and writes the file back out as text for you to paste into GitHub. It
   never saves anything by itself — a static site has nothing to save to —
   so nothing you do here can break the live site until you choose to
   commit it.

   Fields are built with DOM methods rather than innerHTML, so a title
   containing a quote or an angle bracket is never parsed as markup. */

(function () {
  'use strict';

  /* ---- The latch ----------------------------------------------------

     A static site has no server, so this cannot be a lock. The passphrase
     is compared against a SHA-256 digest held below; anyone who opens the
     browser's developer tools can read past it. What it does do is keep a
     casual visitor out of the editor, and that is all it is claimed to do.

     It is enough here because the editor holds nothing private — every
     word in it is already published — and it can save nothing. The thing
     that actually protects the library is that only you can push to
     GitHub.

     To change the passphrase, open any page of the site, paste this in the
     browser console, and put the line it prints in place of PASS_HASH:

       crypto.subtle.digest('SHA-256', new TextEncoder().encode('your new words'))
         .then(h => console.log([...new Uint8Array(h)]
           .map(b => b.toString(16).padStart(2,'0')).join('')))

     For real protection, put the site behind Cloudflare Access — free,
     and it authenticates before the page is ever served. */
  /* Currently the word: maktaba — change it. */
  var PASS_HASH = 'd68e1c2dc633eef7d23409ca1c403d5131f8449d0b1c98e59a2820bfb5b72125';

  var LANGUAGES = [
    { value: 'ur', label: 'Urdu — Nastaleeq' },
    { value: 'ar', label: 'Arabic — Naskh' },
    { value: 'en', label: 'English' }
  ];

  var source = window.siteContent || {};
  /* Deep copy, so the page you are editing is never the page you are
     reading from. */
  var model = JSON.parse(JSON.stringify({
    site: source.site || {},
    categories: source.categories || [],
    rulings: source.rulings || []
  }));

  /* Ids are permanent — they are in links already shared. Remember the
     ones we loaded so a rename can be flagged rather than silently made. */
  var originalIds = {};
  eachRecord(function (record) {
    originalIds[record.id] = true;
  });

  var dirty = false;
  var editor = document.getElementById('editor');
  var dirtyNote = document.getElementById('dirty-note');
  var filterInput = document.getElementById('filter');

  /* ---- Walking the model ---- */

  function eachRecord(fn) {
    (model.categories || []).forEach(function (category) {
      (category.works || []).forEach(function (work, index) {
        fn(work, category.works, index, category);
      });
    });
    (model.rulings || []).forEach(function (ruling, index) {
      fn(ruling, model.rulings, index, null);
    });
  }

  function allRecords() {
    var out = [];
    eachRecord(function (record, list, index, category) {
      out.push({ record: record, list: list, index: index, category: category });
    });
    return out;
  }

  function markDirty() {
    dirty = true;
    dirtyNote.textContent = 'Unsaved changes';
  }

  /* ---- Small builders ---- */

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function field(labelText, hintText) {
    var wrap = el('div', 'admin-field');
    var label = el('label', null, labelText);
    if (hintText) {
      var hint = el('span', 'hint', ' — ' + hintText);
      label.appendChild(hint);
    }
    wrap.appendChild(label);
    return wrap;
  }

  /* Keeps a text input in the right script, direction and font for the
     language chosen — the same rule the site itself follows. */
  function applyScript(input, language) {
    input.classList.remove('urdu', 'arabic', 'latin');
    input.classList.add(language === 'ur' ? 'urdu' : language === 'ar' ? 'arabic' : 'latin');
    input.setAttribute('dir', language === 'ur' || language === 'ar' ? 'rtl' : 'ltr');
    input.setAttribute('lang', language || 'en');
  }

  function textInput(value, onInput) {
    var input = document.createElement('input');
    input.type = 'text';
    input.value = value == null ? '' : value;
    input.addEventListener('input', function () {
      onInput(input.value);
      markDirty();
    });
    return input;
  }

  function textArea(value, onInput) {
    var area = document.createElement('textarea');
    area.value = value == null ? '' : value;
    area.addEventListener('input', function () {
      onInput(area.value);
      markDirty();
    });
    return area;
  }

  /* ---- Posts ----

     A post is a page of writing rather than a record of a file, so its
     words live in its own HTML file and not in content.js. The editor
     holds them here while you work, keyed by id. */

  var POSTS_CATEGORY = 'posts';
  var bodies = {};

  function isPost(entry) {
    return !!(entry.record.page || (entry.category && entry.category.id === POSTS_CATEGORY));
  }

  var SCRIPT_MARK = { arabic: '[ar] ', latin: '[en] ', urdu: '[ur] ' };

  /* The page back into the plain text the box shows. */
  function htmlToBody(article) {
    var blocks = [];
    Array.prototype.forEach.call(article.children, function (node) {
      var mark = '';
      ['arabic', 'latin', 'urdu'].forEach(function (name) {
        if (node.classList.contains(name)) mark = SCRIPT_MARK[name];
      });
      var text = node.textContent.trim().replace(/\s+/g, ' ');
      if (!text) return;
      if (node.tagName === 'H2') blocks.push('## ' + mark + text);
      else if (node.tagName === 'BLOCKQUOTE') blocks.push('> ' + mark + text);
      else blocks.push(mark + text);
    });
    return blocks.join('\n\n');
  }

  /* And the plain text into the page. */
  function bodyToHtml(text, indent) {
    var pad = ' '.repeat(indent);
    return String(text || '')
      .split(/\n\s*\n/)
      .map(function (block) { return block.trim(); })
      .filter(Boolean)
      .map(function (block) {
        var tag = 'p';
        if (block.indexOf('## ') === 0) { tag = 'h2'; block = block.slice(3); }
        else if (block.indexOf('> ') === 0) { tag = 'blockquote'; block = block.slice(2); }

        var attrs = '';
        var forced = block.match(/^\[(ar|en|ur)\]\s*/);
        if (forced) {
          var language = forced[1];
          block = block.slice(forced[0].length);
          attrs =
            ' class="' + (language === 'ar' ? 'arabic' : language === 'ur' ? 'urdu' : 'latin') + '"' +
            ' lang="' + language + '" dir="' + (language === 'en' ? 'ltr' : 'rtl') + '"';
        }
        return pad + '<' + tag + attrs + '>' + site.escapeHtml(block.replace(/\s+/g, ' ')) + '</' + tag + '>';
      })
      .join('\n');
  }

  /* A whole post page. Everything a reader or a crawler needs is written
     into the file — that is the point of a post having its own page
     rather than being assembled by script. */
  function buildPost(record, entry) {
    var e = site.escapeHtml;
    var base = String((model.site && model.site.baseUrl) || '').replace(/\/+$/, '') + '/';
    var url = base + record.page;
    var author = (model.site && model.site.name) || '';
    var rtl = record.language === 'ur' || record.language === 'ar';
    var scriptClass = record.language === 'ur' ? 'urdu' : record.language === 'ar' ? 'arabic' : 'latin';
    var pretty = site.formatDate(record.date);
    var categoryTitle = entry.category ? entry.category.title : 'Posts, Notes & Reflections';
    var categoryId = entry.category ? entry.category.id : POSTS_CATEGORY;

    var jsonLd = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: record.title,
      inLanguage: record.language || 'en',
      description: record.description || undefined,
      datePublished: record.date || undefined,
      keywords: (record.tags || []).join(', ') || undefined,
      url: url,
      author: {
        '@type': 'Person',
        name: author,
        alternateName: (model.site && model.site.nameUr) || undefined,
        url: base
      },
      isPartOf: { '@type': 'Collection', name: categoryTitle, url: base }
    });

    return [
      '<!doctype html>',
      '<html lang="' + e(record.language || 'en') + '">',
      '  <head>',
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      '    <title>' + e(record.title) + ' — ' + e(author) + '</title>',
      record.description ? '    <meta name="description" content="' + e(record.description) + '" />' : null,
      '    <meta name="author" content="' + e(author) + '" />',
      '    <link rel="canonical" href="' + e(url) + '" />',
      '',
      '    <meta property="og:type" content="article" />',
      '    <meta property="og:title" content="' + e(record.title) + '" />',
      record.description ? '    <meta property="og:description" content="' + e(record.description) + '" />' : null,
      '    <meta property="og:url" content="' + e(url) + '" />',
      '    <meta property="og:image" content="' + e(base + 'share-card.png') + '" />',
      '    <meta name="twitter:card" content="summary_large_image" />',
      record.date ? '    <meta property="article:published_time" content="' + e(record.date) + '" />' : null,
      '',
      '    <link rel="icon" type="image/png" sizes="32x32" href="../files/images/logo-circle-32.png" />',
      '    <link rel="apple-touch-icon" href="../files/images/logo-circle-180.png" />',
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />',
      '    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />',
      '    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=Noto+Nastaliq+Urdu:wght@400;500;600&display=swap" rel="stylesheet" />',
      '    <link rel="stylesheet" href="../styles.css" />',
      '    <script type="application/ld+json">' + jsonLd + '</scr' + 'ipt>',
      '  </head>',
      '',
      '  <body class="work-page">',
      '    <header class="site-header">',
      '      <a class="brand" href="../index.html"><img class="brand-mark" src="../files/images/logo-circle-180.png" alt="" width="180" height="178" /> My Works</a>',
      '      <nav class="header-nav" aria-label="Sections">',
      '        <a href="../index.html#about">Author</a>',
      '        <a href="../index.html#library">Library</a>',
      '        <a href="../index.html#rulings">Fatawa</a>',
      '        <a href="../index.html#contact">Contact</a>',
      '      </nav>',
      '    </header>',
      '',
      '    <main class="work-page-main">',
      '      <article class="work-hero">',
      '        <a class="back-link" href="../index.html#' + e(categoryId) + '">← ' + e(categoryTitle) + '</a>',
      record.kind ? '        <p class="section-label urdu" lang="ur" dir="rtl">' + e(record.kind) + '</p>' : null,
      '        <h1 class="' + scriptClass + '" lang="' + e(record.language || 'en') + '" dir="' + (rtl ? 'rtl' : 'ltr') + '">' + e(record.title) + '</h1>',
      pretty ? '        <p class="work-date">' + e(pretty) + '</p>' : null,
      record.description ? '        <p class="work-page-description">' + e(record.description) + '</p>' : null,
      '',
      '        <div class="post-body ' + scriptClass + '" id="post-body" lang="' + e(record.language || 'en') + '" dir="' + (rtl ? 'rtl' : 'ltr') + '">',
      bodyToHtml(bodies[record.id], 10),
      '        </div>',
      '',
      (record.tags || []).length
        ? '        <ul class="tag-row">' +
          (record.tags || []).map(function (tag) { return '<li class="tag" lang="ur" dir="rtl">' + e(tag) + '</li>'; }).join('') +
          '</ul>'
        : null,
      '        <p class="post-foot"><a class="text-link" href="../index.html#' + e(categoryId) + '">← All posts</a></p>',
      '      </article>',
      '    </main>',
      '',
      '    <footer>',
      '      <span>© <span id="year"></span> ' + e(author) + '</span>',
      '      <a href="../index.html">All works</a>',
      '    </footer>',
      '',
      '    <script src="../content.js"></scr' + 'ipt>',
      '    <script src="../common.js"></scr' + 'ipt>',
      '  </body>',
      '</html>',
      ''
    ]
      .filter(function (line) { return line !== null; })
      .join('\n');
  }

  /* ---- One entry ---- */

  function buildRow(entry) {
    var record = entry.record;
    var template = document.getElementById('row-template');
    var row = template.content.firstElementChild.cloneNode(true);

    var idCell = row.querySelector('.admin-row-id');
    var titleCell = row.querySelector('.admin-row-title');
    var metaCell = row.querySelector('.admin-row-meta');
    var fields = row.querySelector('.admin-fields');

    if (!originalIds[record.id]) row.classList.add('is-new');

    function refreshSummary() {
      idCell.textContent = record.id || '(no id)';
      titleCell.textContent = record.title || '(no title)';
      applyScript(titleCell, record.language);
      var count = (record.files || []).length;
      metaCell.textContent =
        (entry.category ? entry.category.title : 'Fatwa') +
        ' · ' +
        (isPost(entry)
          ? site.formatDate(record.date) || 'no date'
          : count ? count + (count === 1 ? ' file' : ' files') : 'no file');
    }
    refreshSummary();

    /* id */
    var idField = field('Id', 'permanent — this is the link students have');
    var idInput = textInput(record.id, function (value) {
      record.id = value.trim();
      refreshSummary();
    });
    idField.appendChild(idInput);
    var idWarn = el('p', 'admin-error');
    idField.appendChild(idWarn);
    idInput.addEventListener('input', function () {
      idWarn.textContent =
        originalIds[record.id] || !idInput.dataset.was
          ? ''
          : 'Renaming an id breaks every link already shared to it.';
    });
    idInput.dataset.was = record.id || '';
    fields.appendChild(idField);

    /* language + kind */
    var pair = el('div', 'admin-two');

    var langField = field('Language', 'sets the font and direction');
    var langSelect = document.createElement('select');
    LANGUAGES.forEach(function (option) {
      var node = document.createElement('option');
      node.value = option.value;
      node.textContent = option.label;
      langSelect.appendChild(node);
    });
    langSelect.value = record.language || 'en';
    langField.appendChild(langSelect);
    pair.appendChild(langField);

    var kindField = field('Kind', 'the small Urdu label — رسالہ, چارٹ, فتویٰ');
    var kindInput = textInput(record.kind, function (value) {
      record.kind = value.trim() || undefined;
    });
    applyScript(kindInput, 'ur');
    kindField.appendChild(kindInput);
    pair.appendChild(kindField);
    fields.appendChild(pair);

    /* title */
    var titleField = field('Title');
    var titleInput = textInput(record.title, function (value) {
      record.title = value;
      refreshSummary();
    });
    applyScript(titleInput, record.language);
    titleField.appendChild(titleInput);
    fields.appendChild(titleField);

    langSelect.addEventListener('change', function () {
      record.language = langSelect.value;
      applyScript(titleInput, record.language);
      refreshSummary();
      markDirty();
    });

    /* description */
    var descField = field('Description', 'one or two lines — this is what search and Google read');
    descField.appendChild(
      textArea(record.description, function (value) {
        record.description = value.trim() || undefined;
      })
    );
    fields.appendChild(descField);

    /* tags */
    var tagField = field('Tags', 'separated by commas');
    tagField.appendChild(
      textInput((record.tags || []).join('، '), function (value) {
        var tags = value
          .split(/[,،]/)
          .map(function (tag) { return tag.trim(); })
          .filter(Boolean);
        record.tags = tags.length ? tags : undefined;
      })
    );
    fields.appendChild(tagField);

    /* date — posts want one; anything else may have one */
    var dateField = field('Date', 'YYYY-MM-DD, or leave empty');
    var dateInput = textInput(record.date, function (value) {
      record.date = value.trim() || undefined;
    });
    dateInput.type = 'date';
    dateField.appendChild(dateInput);
    fields.appendChild(dateField);

    /* A post is a page of writing. Everything else is a record of a file.
       The row shows one or the other, never both. */
    if (isPost(entry)) {
      var pageField = field('Page', 'the file this post lives in');
      var pageInput = textInput(record.page, function (value) {
        record.page = value.trim() || undefined;
      });
      pageInput.placeholder = 'posts/' + (record.id || 'slug') + '.html';
      pageField.appendChild(pageInput);
      fields.appendChild(pageField);

      var bodyField = field(
        'The writing',
        'blank line between paragraphs · “## ” for a heading · “> ” for a quote · “[ar] ” or “[en] ” at the start of a block to switch script'
      );
      var bodyArea = textArea(bodies[record.id] || '', function (value) {
        bodies[record.id] = value;
      });
      bodyArea.style.minHeight = '260px';
      applyScript(bodyArea, record.language);
      bodyField.appendChild(bodyArea);
      var bodyNote = el('p', 'hint');
      bodyField.appendChild(bodyNote);
      fields.appendChild(bodyField);

      langSelect.addEventListener('change', function () {
        applyScript(bodyArea, record.language);
      });

      /* An existing post keeps its words in its own file, so they have to
         be read back before they can be edited. Over file:// the browser
         refuses, and the box stays empty rather than silently wiping the
         post on export. */
      if (record.page && bodies[record.id] === undefined) {
        bodyNote.textContent = 'Loading the current text…';
        fetch(record.page)
          .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.text();
          })
          .then(function (html) {
            var parsed = new DOMParser().parseFromString(html, 'text/html');
            var article = parsed.getElementById('post-body');
            bodies[record.id] = article ? htmlToBody(article) : '';
            bodyArea.value = bodies[record.id];
            bodyNote.textContent = '';
          })
          .catch(function () {
            bodies[record.id] = undefined;
            bodyNote.textContent =
              'Could not read ' + record.page + ' — open this editor over http, not from a file, to edit an existing post. Leaving this empty will not change the post.';
          });
      }
      return finish();
    }

    /* files */
    var filesField = field('Files', 'label, then the path under files/ — leave empty for “not published yet”');
    var filesBox = el('div', 'admin-files');
    filesField.appendChild(filesBox);

    function drawFiles() {
      filesBox.textContent = '';
      (record.files || []).forEach(function (file, index) {
        var line = el('div', 'admin-file');
        var label = textInput(file.label, function (value) { file.label = value; });
        label.placeholder = 'Urdu PDF';
        var url = textInput(file.url, function (value) { file.url = value.trim(); });
        url.placeholder = 'files/booklets-authored/name.pdf';
        var remove = el('button', 'text-link admin-danger', 'Remove');
        remove.type = 'button';
        remove.addEventListener('click', function () {
          record.files.splice(index, 1);
          if (!record.files.length) record.files = undefined;
          drawFiles();
          refreshSummary();
          markDirty();
        });
        line.appendChild(label);
        line.appendChild(url);
        line.appendChild(remove);
        filesBox.appendChild(line);

        if (site.isImage(file.url)) {
          var previewLine = el('div', 'admin-file');
          previewLine.appendChild(el('span', 'hint', 'Preview image'));
          var preview = textInput(file.preview, function (value) {
            file.preview = value.trim() || undefined;
          });
          preview.placeholder = 'optional lighter copy to show on the page';
          previewLine.appendChild(preview);
          previewLine.appendChild(el('span'));
          filesBox.appendChild(previewLine);
        }
      });

      var add = el('button', 'text-link', '+ Add a file');
      add.type = 'button';
      add.addEventListener('click', function () {
        if (!record.files) record.files = [];
        record.files.push({ label: '', url: '' });
        drawFiles();
        refreshSummary();
        markDirty();
      });
      filesBox.appendChild(add);
    }
    drawFiles();
    fields.appendChild(filesField);

    return finish();

    /* Shared tail: the controls every row has, whether it is a post or a
       record of a file. */
    function finish() {
    var tools = el('div', 'admin-row-tools');

    if (entry.category) {
      var moveField = field('Category');
      var moveSelect = document.createElement('select');
      (model.categories || []).forEach(function (category) {
        var option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.title;
        moveSelect.appendChild(option);
      });
      moveSelect.value = entry.category.id;
      moveSelect.addEventListener('change', function () {
        var target = model.categories.filter(function (c) { return c.id === moveSelect.value; })[0];
        if (!target) return;
        entry.list.splice(entry.index, 1);
        if (!target.works) target.works = [];
        target.works.push(record);
        markDirty();
        render();
      });
      moveField.appendChild(moveSelect);
      fields.appendChild(moveField);
    }

    var up = el('button', 'text-link', '↑ Move up');
    up.type = 'button';
    up.addEventListener('click', function () {
      if (entry.index === 0) return;
      entry.list.splice(entry.index - 1, 0, entry.list.splice(entry.index, 1)[0]);
      markDirty();
      render();
    });
    var down = el('button', 'text-link', '↓ Move down');
    down.type = 'button';
    down.addEventListener('click', function () {
      if (entry.index >= entry.list.length - 1) return;
      entry.list.splice(entry.index + 1, 0, entry.list.splice(entry.index, 1)[0]);
      markDirty();
      render();
    });
    var remove = el('button', 'text-link admin-danger', 'Delete this entry');
    remove.type = 'button';
    remove.addEventListener('click', function () {
      if (!window.confirm('Delete “' + (record.title || record.id) + '”?\n\nAnyone holding a link to it will see “That work isn’t here.”')) return;
      entry.list.splice(entry.index, 1);
      markDirty();
      render();
    });
    tools.appendChild(up);
    tools.appendChild(down);
    tools.appendChild(remove);
    fields.appendChild(tools);

    return row;
    }
  }

  /* ---- Drawing everything ---- */

  function matchesFilter(entry, needle) {
    if (!needle) return true;
    var hay = [
      entry.record.id,
      entry.record.title,
      entry.record.description,
      entry.category ? entry.category.title : 'fatwa fatawa'
    ]
      .filter(Boolean)
      .join(' ');
    return site.fold(hay).indexOf(needle) !== -1;
  }

  function render() {
    var needle = site.fold(filterInput.value);
    var openIds = {};
    editor.querySelectorAll('.admin-row[open]').forEach(function (row) {
      openIds[row.querySelector('.admin-row-id').textContent] = true;
    });

    editor.textContent = '';

    (model.categories || []).forEach(function (category) {
      var entries = allRecords().filter(function (entry) {
        return entry.category === category && matchesFilter(entry, needle);
      });
      if (!entries.length) return;
      var group = el('section', 'admin-group');
      var heading = el('h2', null, category.title);
      heading.appendChild(el('span', 'admin-count', entries.length + ' of ' + (category.works || []).length));
      group.appendChild(heading);
      entries.forEach(function (entry) {
        var row = buildRow(entry);
        if (openIds[entry.record.id]) row.open = true;
        group.appendChild(row);
      });
      editor.appendChild(group);
    });

    var rulings = allRecords().filter(function (entry) {
      return !entry.category && matchesFilter(entry, needle);
    });
    if (rulings.length) {
      var group = el('section', 'admin-group');
      var heading = el('h2', null, 'Fatawa');
      heading.appendChild(el('span', 'admin-count', rulings.length + ' of ' + (model.rulings || []).length));
      group.appendChild(heading);
      rulings.forEach(function (entry) {
        var row = buildRow(entry);
        if (openIds[entry.record.id]) row.open = true;
        group.appendChild(row);
      });
      editor.appendChild(group);
    }

    if (!editor.children.length) {
      editor.appendChild(el('p', 'empty-state', 'Nothing matches that filter.'));
    }
  }

  /* ---- Adding ---- */

  function freshId(prefix) {
    var taken = {};
    eachRecord(function (record) { taken[record.id] = true; });
    var n = 1;
    while (taken[prefix + '-' + n]) n += 1;
    return prefix + '-' + n;
  }

  /* Opens and scrolls to a row by id — a new entry is not necessarily the
     first one on the page, since its category may sit further down. */
  function revealRow(id) {
    var rows = editor.querySelectorAll('.admin-row');
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].querySelector('.admin-row-id').textContent === id) {
        rows[i].open = true;
        rows[i].scrollIntoView({ block: 'center' });
        return;
      }
    }
  }

  document.getElementById('add-work').addEventListener('click', function () {
    var category = (model.categories || [])[0];
    if (!category) return;
    if (!category.works) category.works = [];
    var newId = freshId('new-work');
    category.works.unshift({ id: newId, title: '', language: 'ur' });
    filterInput.value = '';
    markDirty();
    render();
    revealRow(newId);
  });

  document.getElementById('add-post').addEventListener('click', function () {
    var category = (model.categories || []).filter(function (c) { return c.id === POSTS_CATEGORY; })[0];
    if (!category) {
      window.alert('There is no “' + POSTS_CATEGORY + '” category in content.js to put it in.');
      return;
    }
    var id = freshId('new-post');
    if (!category.works) category.works = [];
    category.works.unshift({
      id: id,
      title: '',
      language: 'ur',
      date: new Date().toISOString().slice(0, 10),
      page: 'posts/' + id + '.html'
    });
    bodies[id] = '';
    filterInput.value = '';
    markDirty();
    render();
    revealRow(id);
  });

  document.getElementById('add-ruling').addEventListener('click', function () {
    if (!model.rulings) model.rulings = [];
    var newId = freshId('new-fatwa');
    model.rulings.unshift({ id: newId, title: '', language: 'ur' });
    filterInput.value = '';
    markDirty();
    render();
    revealRow(newId);
  });

  filterInput.addEventListener('input', render);

  /* ---- Checking before writing ---- */

  function problems() {
    var found = [];
    var seen = {};
    eachRecord(function (record, list, index, category) {
      var where = (category ? category.title : 'Fatawa') + ' → ' + (record.title || record.id || 'untitled');
      if (!record.id) found.push(where + ': needs an id.');
      else if (!/^[a-z0-9-]+$/.test(record.id)) found.push(where + ': the id "' + record.id + '" may use only lowercase letters, numbers and hyphens.');
      else if (seen[record.id]) found.push('Two entries share the id "' + record.id + '". Ids must be unique.');
      seen[record.id] = true;

      if (!record.title) found.push(where + ': needs a title.');
      if (['ur', 'ar', 'en'].indexOf(record.language) === -1) found.push(where + ': needs a language.');
      (record.files || []).forEach(function (file) {
        if (!file.url) found.push(where + ': a file row has no path.');
      });
      if (category && category.id === POSTS_CATEGORY && !record.page) {
        found.push(where + ': a post needs a page, e.g. posts/' + (record.id || 'slug') + '.html');
      }
    });
    return found;
  }

  /* ---- Writing the files ---- */

  var HEADER = [
    '/* ============================================================',
    '   THIS IS THE ONLY FILE YOU NEED TO EDIT TO ADD OR CHANGE WORKS.',
    '   See README.md for a walkthrough, or open admin.html to edit it',
    '   through a form instead of by hand.',
    '',
    '   A work looks like this:',
    '',
    '   {',
    '     id: "unique-english-slug",        // required, becomes work.html?work=unique-english-slug',
    '     title: "عنوان",                    // required',
    '     language: "ur",                   // "ur" = Nastaleeq, "ar" = Naskh, "en" = English',
    '     kind: "رسالہ",                     // small label: رسالہ / چارٹ / پریزینٹیشن / ترجمہ و تخریج / مضمون / فتویٰ',
    '     description: "One or two lines.",  // optional',
    '     tags: ["حج و عمرہ"],               // optional, also searchable',
    '     files: [                           // optional; leave out entirely if nothing is uploaded yet',
    '       { label: "Urdu PDF", url: "files/my-file.pdf" },',
    '       { label: "English PDF", url: "https://drive.google.com/..." }',
    '     ]',
    '   }',
    '',
    '   A work with no `files` shows as "Not published yet" instead of a',
    '   download button. That is normal and safe — add the files later.',
    '   ============================================================ */',
    ''
  ].join('\n');

  /* JSON.stringify is the escaping. It produces valid JavaScript for any
     string, keeps Urdu and Arabic readable rather than turning them into
     \u escapes, and cannot be tricked by a quote inside a title. */
  function str(value) {
    return JSON.stringify(String(value));
  }

  function writeFiles(files, indent) {
    var pad = ' '.repeat(indent);
    return (
      'files: [\n' +
      files
        .map(function (file) {
          var parts = ['label: ' + str(file.label || 'Open'), 'url: ' + str(file.url)];
          if (file.preview) parts.push('preview: ' + str(file.preview));
          return pad + '  { ' + parts.join(', ') + ' }';
        })
        .join(',\n') +
      '\n' + pad + ']'
    );
  }

  function writeRecord(record, indent) {
    var pad = ' '.repeat(indent);
    var lines = [pad + 'id: ' + str(record.id), pad + 'title: ' + str(record.title), pad + 'language: ' + str(record.language)];
    if (record.kind) lines.push(pad + 'kind: ' + str(record.kind));
    if (record.date) lines.push(pad + 'date: ' + str(record.date));
    if (record.description) lines.push(pad + 'description: ' + str(record.description));
    if (record.tags && record.tags.length) {
      lines.push(pad + 'tags: [' + record.tags.map(str).join(', ') + ']');
    }
    if (record.page) lines.push(pad + 'page: ' + str(record.page));
    if (record.files && record.files.length) {
      lines.push(pad + writeFiles(record.files, indent));
    }
    return ' '.repeat(indent - 2) + '{\n' + lines.join(',\n') + '\n' + ' '.repeat(indent - 2) + '}';
  }

  function buildContent() {
    var site_ = model.site || {};
    var out = HEADER + '\nwindow.siteContent = {\n  site: {\n';
    out += '    name: ' + str(site_.name || '') + ',\n';
    out += '    nameUr: ' + str(site_.nameUr || '') + ',\n';
    out += '    email: ' + str(site_.email || '') + ',\n';
    out += '    // Used for sharing previews, canonical links and structured data.\n';
    out += '    // Change this if the site later moves to its own domain — and change\n';
    out += '    // robots.txt and sitemap.xml with it.\n';
    out += '    baseUrl: ' + str(site_.baseUrl || '') + '\n';
    out += '  },\n\n  categories: [\n';

    out += (model.categories || [])
      .map(function (category) {
        var head =
          '    {\n' +
          '      id: ' + str(category.id) + ',\n' +
          '      title: ' + str(category.title) + ',\n' +
          (category.titleUr ? '      titleUr: ' + str(category.titleUr) + ',\n' : '') +
          (category.blurb ? '      blurb: ' + str(category.blurb) + ',\n' : '') +
          '      works: [\n';
        var works = (category.works || [])
          .map(function (work) { return writeRecord(work, 10); })
          .join(',\n');
        return head + works + '\n      ]\n    }';
      })
      .join(',\n\n');

    out += '\n  ],\n\n';
    out += '  /* Fatāwā. Same fields as a work — id, title, language, description, files. */\n';
    out += '  rulings: [\n';
    out += (model.rulings || []).map(function (ruling) { return writeRecord(ruling, 6); }).join(',\n');
    out += '\n  ]\n};\n';
    return out;
  }

  function buildSitemap() {
    var base = String((model.site && model.site.baseUrl) || '').replace(/\/+$/, '') + '/';
    var today = new Date().toISOString().slice(0, 10);
    /* A post has its own page; everything else is served by the template. */
    var paths = [];
    eachRecord(function (record) {
      paths.push(record.page ? record.page : 'work.html?work=' + record.id);
    });
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!-- The homepage plus one entry per work and fatwa.\n\n' +
      '     THIS LIST IS THE ONE PLACE OUTSIDE content.js THAT NAMES A WORK.\n' +
      '     When you add or remove an entry in content.js, add or remove its line\n' +
      '     here too, or the new work will not be offered to search engines.\n' +
      '     admin.html writes both files together, which is the safe way to do it.\n\n' +
      '     Change the domain here, in robots.txt and in site.baseUrl in\n' +
      '     content.js together if the site ever moves. -->\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      '  <url>\n    <loc>' + base + '</loc>\n    <lastmod>' + today + '</lastmod>\n' +
      '    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n' +
      paths
        .map(function (path) {
          return (
            '  <url>\n    <loc>' + base + path + '</loc>\n' +
            '    <lastmod>' + today + '</lastmod>\n' +
            '    <changefreq>yearly</changefreq>\n    <priority>0.8</priority>\n  </url>'
          );
        })
        .join('\n') +
      '\n</urlset>\n'
    );
  }

  /* ---- Export dialog ---- */

  var dialog = document.getElementById('export-dialog');

  document.getElementById('export').addEventListener('click', function () {
    var found = problems();
    if (found.length) {
      window.alert('Fix these first:\n\n• ' + found.join('\n• '));
      return;
    }
    var content = buildContent();

    /* Parse what we are about to hand over, in this page, before offering
       it. If it will not run, the site would go blank — better to know
       now than after committing. */
    try {
      var check = {};
      new Function('window', content).call(check, check);
      if (!check.siteContent || !check.siteContent.categories) throw new Error('no categories');
    } catch (error) {
      window.alert('The generated file did not parse: ' + error.message + '\n\nNothing has been changed. Please report this.');
      return;
    }

    document.getElementById('out-content').value = content;
    document.getElementById('out-sitemap').value = buildSitemap();

    /* One more file for every post whose words are in hand. A post whose
       page could not be read is left alone rather than overwritten with
       an empty one. */
    var extra = document.getElementById('out-posts');
    extra.textContent = '';
    var written = 0;
    allRecords().forEach(function (entry) {
      if (!isPost(entry) || !entry.record.page) return;
      if (bodies[entry.record.id] === undefined) return;
      written += 1;
      var id = 'out-post-' + written;
      var section = document.createElement('section');
      var head = document.createElement('div');
      head.className = 'admin-file-head';
      var title = document.createElement('h3');
      title.textContent = entry.record.page;
      var buttons = document.createElement('span');
      buttons.innerHTML =
        '<button class="text-link" type="button" data-copy="' + id + '">Copy</button> ' +
        '<button class="text-link" type="button" data-download="' + entry.record.page.split('/').pop() +
        '" data-source="' + id + '">Download</button>';
      head.appendChild(title);
      head.appendChild(buttons);
      var area = document.createElement('textarea');
      area.id = id;
      area.readOnly = true;
      area.spellcheck = false;
      area.value = buildPost(entry.record, entry);
      section.appendChild(head);
      section.appendChild(area);
      extra.appendChild(section);
    });

    var works = 0;
    var rulings = (model.rulings || []).length;
    (model.categories || []).forEach(function (c) { works += (c.works || []).length; });
    document.getElementById('export-summary').textContent =
      works + ' works and ' + rulings + ' fatawa, in ' + (model.categories || []).length +
      ' categories. Checked — the file parses.' +
      (written ? ' ' + written + (written === 1 ? ' post page' : ' post pages') + ' below, one file each.' : '');

    dialog.showModal();
  });

  document.getElementById('close-dialog').addEventListener('click', function () { dialog.close(); });

  dialog.addEventListener('click', function (event) {
    var copyTarget = event.target.getAttribute('data-copy');
    if (copyTarget) {
      var area = document.getElementById(copyTarget);
      area.select();
      try {
        document.execCommand('copy');
        event.target.textContent = 'Copied';
        setTimeout(function () { event.target.textContent = 'Copy'; }, 1600);
      } catch (error) {
        window.alert('Could not copy automatically. The text is selected — press Ctrl/Cmd+C.');
      }
      return;
    }
    var name = event.target.getAttribute('data-download');
    if (name) {
      var text = document.getElementById(event.target.getAttribute('data-source')).value;
      var link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);
    }
  });

  window.addEventListener('beforeunload', function (event) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  /* ---- Unlocking ---- */

  function digest(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buffer) {
      return Array.prototype.map
        .call(new Uint8Array(buffer), function (byte) { return byte.toString(16).padStart(2, '0'); })
        .join('');
    });
  }

  function unlock() {
    document.body.classList.remove('is-locked');
    try { sessionStorage.setItem('editor-open', '1'); } catch (error) { /* private mode */ }
    render();
  }

  var gateForm = document.getElementById('gate-form');
  var gateError = document.getElementById('gate-error');

  gateForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var value = document.getElementById('pass').value;
    digest(value).then(function (hash) {
      if (hash === PASS_HASH) {
        unlock();
      } else {
        gateError.textContent = 'Not that one.';
        document.getElementById('pass').select();
      }
    });
  });

  /* Stays open for the rest of the browser session, so a reload while
     writing does not ask again. */
  var alreadyOpen = false;
  try { alreadyOpen = sessionStorage.getItem('editor-open') === '1'; } catch (error) { /* private mode */ }
  if (alreadyOpen) unlock();
})();
