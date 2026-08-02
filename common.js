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

  /* Download / open buttons. Returns '' when nothing is attached yet. */
  function fileLinks(record, className) {
    if (!record.files || !record.files.length) return '';
    return record.files
      .map(function (file) {
        return (
          '<a class="' + (className || 'document-link') + '" href="' + escapeHtml(file.url) + '" target="_blank" rel="noopener">' +
          escapeHtml(file.label || 'Open') + ' <span aria-hidden="true">↗</span></a>'
        );
      })
      .join('');
  }

  function tagMarkup(record) {
    if (!record.tags || !record.tags.length) return '';
    return (
      '<ul class="tag-row">' +
      record.tags
        .map(function (tag) {
          return '<li class="tag" lang="ur" dir="rtl">' + escapeHtml(tag) + '</li>';
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
          category: { id: 'rulings', title: 'Islamic rulings', titleUr: 'فتاویٰ' },
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

  /* Everything a search should look inside. */
  function searchText(record) {
    return [record.title, record.description, record.kind, (record.tags || []).join(' '), record.category && record.category.title]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
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
      jobTitle: 'Teacher of Dars-e-Nizami',
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
    tagMarkup: tagMarkup,
    allRecords: allRecords,
    findRecord: findRecord,
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
