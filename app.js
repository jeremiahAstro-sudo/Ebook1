(function () {
  "use strict";

  const app = document.getElementById("app");
  const books = Array.isArray(window.GARDEN_BOOKS) ? window.GARDEN_BOOKS : [];
  const ICONS = {
    leaf: '<path d="M20.8 3.2C12.5 3.8 5.8 8 5.8 15.1c0 3.3 2 5.1 4.8 5.1 6.1 0 10.1-8.7 10.2-17Z"/><path d="M3.6 22.4c3.5-6 7.9-9.8 13.2-12.5"/>',
    arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
    book: '<path d="M12 7v14"/><path d="M3 18V5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a3 3 0 0 0-3 2 3 3 0 0 0-3-2H5a2 2 0 0 1-2-2Z"/>',
    bookmark: '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4V4.5Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>',
    external: '<path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
    chevron: '<path d="m7 10 5 5 5-5"/>',
    minus: '<path d="M5 12h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    moon: '<path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5a8.7 8.7 0 1 0 12 12Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
    marker: '<path d="m9 11 6-6 4 4-6 6"/><path d="m5 15 4 4"/><path d="M4 20h16"/>',
    note: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
    spark: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/>'
  };

  const state = { query: "", category: "All" };
  const store = {
    read(key, fallback) {
      try {
        const value = localStorage.getItem("garden-room:" + key);
        return value === null ? fallback : JSON.parse(value);
      } catch (_) {
        return fallback;
      }
    },
    write(key, value) {
      try { localStorage.setItem("garden-room:" + key, JSON.stringify(value)); } catch (_) {}
    }
  };

  function icon(name, size, filled) {
    return '<svg aria-hidden="true" width="' + (size || 16) + '" height="' + (size || 16) +
      '" viewBox="0 0 24 24" fill="' + (filled ? "currentColor" : "none") +
      '" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[name] || "") + "</svg>";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function route() {
    const hash = window.location.hash.slice(1);
    return hash.startsWith("/") ? hash : "/";
  }

  function findBook(slug) {
    return books.find(function (book) { return book.slug === slug; });
  }

  function chapterKey(book, chapter) {
    return book.slug + ":" + chapter.slug;
  }

  function hashLink(path) {
    return "#/" + String(path || "").replace(/^\/+/, "");
  }

  function pdfHref(book, chapter) {
    if (!book.pdfPath) return "";
    const url = new URL(book.pdfPath.replace(/^\/+/, ""), document.baseURI);
    if (chapter && chapter.pdfPage) url.hash = "page=" + chapter.pdfPage;
    return url.href;
  }

  function currentProgress(book) {
    const progress = store.read("progress", {});
    if (!book.chapters.length) return 0;
    const total = book.chapters.reduce(function (sum, chapter) {
      return sum + (progress[chapterKey(book, chapter)] || 0);
    }, 0);
    return Math.round(total / book.chapters.length);
  }

  function tokenExpiry() {
    return store.read("token-expiry", {});
  }

  function isUnlocked(book) {
    if (!book.accessTokens || !book.accessTokens.length) return true;
    return Number(tokenExpiry()[book.slug] || 0) > Date.now();
  }

  function brand(compact) {
    return '<a href="#/" class="brand-link ' + (compact ? "brand-compact" : "") +
      '" data-action="home"><span class="brand-mark">' + icon("leaf", 18) +
      '</span><span class="brand-name">Garden <em>Reading Room</em></span></a>';
  }

  function header() {
    const isHome = route() === "/";
    return '<header class="site-header"><div class="header-inner">' + brand(false) +
      '<nav class="main-nav" id="main-nav" aria-label="Main navigation">' +
      '<a href="#/" class="nav-link ' + (isHome ? "active" : "") + '" data-action="home">The library</a>' +
      '<a href="#about" class="nav-link" data-action="about">Our approach</a>' +
      '<span class="header-note"><span class="note-dot"></span>A little room to read</span></nav>' +
      '<button class="mobile-menu icon-button" type="button" aria-label="Open navigation" data-action="menu">' +
      icon("menu", 19) + '</button></div></header>';
  }

  function footer() {
    return '<footer class="site-footer"><div class="footer-inner">' + brand(true) +
      '<p>Good things grow at their own pace.</p><span>Made for reading, wherever you are.</span></div></footer>';
  }

  function cover(book, size) {
    const coverData = book.cover || {};
    return '<div class="cover-art cover-' + (size || "card") + '" style="background:' +
      escapeHtml(coverData.background || "linear-gradient(150deg,#d8e0bd,#79947d)") +
      ';color:' + escapeHtml(coverData.ink || "#274b3b") + '">' +
      '<div class="cover-sprig" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<span class="cover-eyebrow">' + escapeHtml(coverData.eyebrow || "A SMALL GUIDE TO") + '</span>' +
      '<div class="cover-title serif">' + escapeHtml(coverData.motif || book.title) + '</div>' +
      '<div class="cover-rule"></div><span class="cover-author">' + escapeHtml(book.author) + '</span>' +
      '<span class="cover-edition">GARDEN READING ROOM · ' + escapeHtml(book.category.toUpperCase()) + "</span></div>";
  }

  function bookCard(book) {
    const saved = store.read("saved-books", []).includes(book.slug);
    const percent = currentProgress(book);
    return '<article class="book-card"><a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
      '" class="book-cover-link">' + cover(book, "card") + '</a><div class="book-card-copy">' +
      '<div class="book-meta"><span>' + escapeHtml(book.category) + '</span>' +
      (saved ? icon("bookmark", 14, true) : "") + '</div><a href="' +
      hashLink("book/" + encodeURIComponent(book.slug)) + '" class="book-title-link"><h3 class="serif">' +
      escapeHtml(book.title) + '</h3></a><p class="book-subtitle">' + escapeHtml(book.subtitle) +
      '</p><div class="book-card-bottom"><span>' + icon("clock", 13) + " " +
      Number(book.readingMinutes || 1) + ' min read</span><a href="' +
      hashLink("book/" + encodeURIComponent(book.slug)) + '" class="text-link">Open book ' +
      icon("arrowRight", 14) + '</a></div>' + (percent ? '<div class="progress-track" aria-label="' +
      percent + '% read"><span style="width:' + percent + '%"></span></div>' : "") + "</div></article>";
  }

  function categoryButtons() {
    const categories = ["All"].concat(Array.from(new Set(books.map(function (book) { return book.category; }))));
    return categories.map(function (category) {
      return '<button type="button" class="category-tab ' + (state.category === category ? "selected" : "") +
        '" data-action="category" data-category="' + escapeHtml(category) + '" aria-pressed="' +
        (state.category === category) + '">' + escapeHtml(category) + "</button>";
    }).join("");
  }

  function catalogResults() {
    const query = state.query.trim().toLowerCase();
    const filtered = books.filter(function (book) {
      const matchesCategory = state.category === "All" || book.category === state.category;
      const searchText = [book.title, book.subtitle, book.category, book.author].join(" ").toLowerCase();
      return matchesCategory && searchText.includes(query);
    });
    let html = filtered.length
      ? '<div class="book-grid">' + filtered.map(bookCard).join("") + "</div>"
      : '<div class="empty-state"><div class="empty-ornament">' + icon("search", 20) +
        '</div><h3 class="serif">Nothing on this shelf yet.</h3><p>Try another phrase or choose a different shelf.</p>' +
        '<button class="text-link" type="button" data-action="clear-search">Clear your search ' +
        icon("arrowRight", 14) + "</button></div>";
    const savedBooks = books.filter(function (book) { return store.read("saved-books", []).includes(book.slug); });
    if (savedBooks.length) {
      html += '<div class="saved-row"><div><div class="eyebrow muted-eyebrow">KEPT CLOSE</div>' +
        '<h3 class="serif">Your saved shelf</h3></div><div class="saved-list">' +
        savedBooks.map(function (book) {
          return '<a href="' + hashLink("book/" + encodeURIComponent(book.slug)) + '" class="saved-book">' +
            icon("bookmark", 15, true) + '<span>' + escapeHtml(book.title) + '</span>' +
            icon("arrowRight", 14) + "</a>";
        }).join("") + "</div></div>";
    }
    return html;
  }

  function catalog() {
    const demo = books.some(function (book) { return book.isDemo; });
    return '<div class="page-enter">' + header() + '<main><section class="hero-wrap">' +
      '<div class="hero-content"><div class="eyebrow"><span class="tiny-leaf">' + icon("leaf", 13) +
      "</span> A PERSONAL LIBRARY FOR EVERYDAY WELLBEING</div><h1 class=\"serif\">A softer place<br><i>to land.</i></h1>" +
      '<p class="hero-deck">Thoughtful little books on food, health, and the everyday ways we care for ourselves. Settle in wherever you are.</p>' +
      '<a class="button-primary hero-cta" href="#books">Wander the shelves ' + icon("arrowRight", 16) +
      '</a><div class="hero-footnote"><span class="line-mark"></span> Read at your own pace <span class="foot-separator">·</span> Come back whenever</div></div>' +
      '<div class="hero-art" aria-label="Illustration of an open book and growing leaves"><div class="sun-wash"></div>' +
      '<div class="floating-label label-top">A GOOD PLACE TO BEGIN</div><div class="hero-book"><div class="hero-book-page left-page"></div>' +
      '<div class="hero-book-page right-page"></div><div class="book-spine"></div><div class="hero-book-copy serif">a little<br><i>nourishment</i><small>for every day</small></div></div>' +
      '<div class="hero-leaf leaf-a"><span></span><span></span></div><div class="hero-leaf leaf-b"><span></span><span></span></div>' +
      '<div class="hero-leaf leaf-c"><span></span><span></span></div><div class="floating-label label-bottom">OPEN A PAGE · TAKE A BREATH</div></div></section>' +
      '<section class="shelf-section" id="books"><div class="shelf-heading"><div><div class="eyebrow muted-eyebrow">THE SHELVES</div>' +
      '<h2 class="serif">Stories to <i>settle into.</i></h2><p>Short, useful reads for making a little room for yourself.</p></div>' +
      '<span class="shelf-count"><strong id="book-count">' + String(books.length).padStart(2, "0") + '</strong> small book' +
      (books.length === 1 ? "" : "s") + '<br>and growing slowly</span></div><div class="library-controls">' +
      '<div class="category-tabs" id="category-tabs" role="group" aria-label="Filter books by category">' + categoryButtons() +
      '</div><label class="search-field">' + icon("search", 16) +
      '<input type="search" id="book-search" placeholder="Find a title…" aria-label="Search books"></label></div>' +
      '<div id="catalog-results">' + catalogResults() + '</div></section><section class="about-strip" id="about">' +
      '<div class="about-stamp">' + icon("leaf", 22) + '<span>GROW<br>GENTLY</span></div><div><div class="eyebrow">A NOTE FROM THE READING ROOM</div>' +
      '<h2 class="serif">No perfect routines.<br><i>Just good company.</i></h2></div>' +
      '<p>These pages are here to offer useful ideas without the noise. Take what feels helpful, leave what doesn’t, and remember that care can be wonderfully ordinary.</p></section>' +
      (demo ? '<div class="demo-note"><span class="demo-pip"></span><strong>DEMO EDITION</strong><span>An illustrative sample book is included. Replace or remove it in <code>books.js</code> when adding your own writing.</span></div>' : "") +
      '</main>' + footer() + "</div>";
  }

  function notFound() {
    return '<div class="not-found-page">' + header() + '<main class="not-found-content"><div class="not-found-illustration">' +
      icon("book", 38) + '</div><div class="eyebrow muted-eyebrow">THIS PAGE HAS WANDERED OFF</div>' +
      '<h1 class="serif">A little <i>off the shelf.</i></h1><p>We couldn’t find that page. The good reads are still right where you left them.</p>' +
      '<a href="#/" class="button-primary" data-action="home">Return to the library ' + icon("arrowRight", 16) +
      "</a></main>" + footer() + "</div>";
  }

  function bookDetail(slug) {
    const book = findBook(slug);
    if (!book) return notFound();
    const saved = store.read("saved-books", []).includes(book.slug);
    const percent = currentProgress(book);
    const chapters = Array.isArray(book.chapters) ? book.chapters : [];
    const unlocked = isUnlocked(book);
    const pdf = pdfHref(book);
    const chapterRows = chapters.map(function (chapter, index) {
      const done = (store.read("progress", {})[chapterKey(book, chapter)] || 0) >= 95;
      return '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(chapter.slug)) +
        '" class="chapter-list-item"><span class="chapter-number">' + String(index + 1).padStart(2, "0") +
        '</span><span class="chapter-list-title">' + escapeHtml(chapter.title) + '</span><span class="chapter-status">' +
        (done ? icon("check", 15) : "Read chapter") + '</span>' + icon("arrowRight", 16) + "</a>";
    }).join("");
    const readingAction = unlocked
      ? '<div class="detail-actions"><a href="' + (chapters[0] ? hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(chapters[0].slug)) : "#") +
        '" class="button-primary">' + (percent ? "Continue reading" : "Begin reading") + " " + icon("arrowRight", 16) +
        '</a><button class="save-button ' + (saved ? "is-saved" : "") + '" type="button" data-action="save-book" data-book="' +
        escapeHtml(book.slug) + '">' + icon("bookmark", 16, saved) + (saved ? "Saved to your shelf" : "Save for later") + "</button>" +
        (pdf ? '<a class="pdf-link" href="' + escapeHtml(pdf) + '" target="_blank" rel="noreferrer">Open original PDF ' + icon("external", 14) + "</a>" : "") +
        "</div>"
      : '<form class="unlock-form" data-book="' + escapeHtml(book.slug) + '"><label for="access-token">A small key for this book</label>' +
        '<div><input id="access-token" name="token" autocomplete="off" placeholder="Enter access token" required>' +
        '<button type="submit" class="button-primary">Unlock ' + icon("arrowRight", 15) + '</button></div>' +
        '<p class="privacy-warning">' + icon("lock", 14) +
        '<span>This token is casual friction only—not privacy or enforceable expiry. Tokens and unlock state are public or stored in this browser, and can be inspected or changed.</span></p>' +
        '<span class="form-message" id="token-message" role="status"></span></form>';

    return '<div class="page-enter">' + header() + '<main class="detail-main"><a href="#/" class="back-link" data-action="home">' +
      icon("arrowLeft", 15) + " Back to the shelves</a><section class=\"detail-hero\"><div class=\"detail-cover-wrap\">" +
      cover(book, "detail") + '<div class="cover-caption">A GARDEN READING ROOM EDITION</div></div><div class="detail-copy">' +
      '<div class="eyebrow muted-eyebrow">' + escapeHtml(book.category.toUpperCase()) +
      (book.isDemo ? '<span class="eyebrow-dot">·</span> DEMO EDITION' : "") + '</div><h1 class="serif">' +
      escapeHtml(book.title) + '<span class="detail-period">.</span></h1><p class="detail-subtitle">' +
      escapeHtml(book.subtitle) + '</p><p class="detail-description">' + escapeHtml(book.description) +
      '</p><div class="detail-facts"><span>' + icon("book", 15) + " " + chapters.length + ' short chapters</span><span>' +
      icon("clock", 15) + " " + Number(book.readingMinutes || 1) + ' min read</span><span>By ' +
      escapeHtml(book.author) + "</span></div>" +
      (percent ? '<div class="detail-progress"><div class="progress-label"><span>Your reading journey</span><strong>' + percent +
        '%</strong></div><div class="progress-track"><span style="width:' + percent + '%"></span></div></div>' : "") +
      readingAction + '</div></section><section class="contents-section"><div class="contents-heading"><div>' +
      '<div class="eyebrow muted-eyebrow">INSIDE THIS BOOK</div><h2 class="serif">A few things to <i>try on.</i></h2></div>' +
      '<span>' + chapters.length + ' CHAPTERS</span></div><div class="chapter-list">' +
      (chapters.length ? chapterRows : '<p class="empty-state">Add chapters to this book in books.js.</p>') +
      '</div></section></main>' + footer() + "</div>";
  }

  function commentsMarkup(book, chapter) {
    const config = window.GARDEN_COMMENTS || {};
    const ready = config.repo && config.repoId && config.category && config.categoryId;
    return '<section class="comments-section"><div class="comments-heading"><div><div class="eyebrow muted-eyebrow">A SHARED MARGIN</div>' +
      '<h2 class="serif">Leave a thought.</h2></div><span class="public-label">PUBLIC DISCUSSION</span></div>' +
      (ready
        ? '<div id="giscus-thread" class="giscus-frame" data-book="' + escapeHtml(book.slug) + '" data-chapter="' + escapeHtml(chapter.slug) + '"></div>'
        : '<div class="giscus-setup"><div class="setup-icon">' + icon("note", 18) +
          '</div><div><strong>Comments are ready when you are.</strong><p>To enable chapter discussions, add your Giscus repository, category, repository ID, and category ID in <code>settings.js</code>.</p></div></div>') +
      '<p class="public-disclaimer">Giscus conversations are public GitHub Discussions. Anyone can read them; moderation and removal happen in GitHub.</p></section>';
  }

  function reader(bookSlug, chapterSlug) {
    const book = findBook(bookSlug);
    if (!book) return notFound();
    const chapters = book.chapters || [];
    const index = chapters.findIndex(function (item) { return item.slug === chapterSlug; });
    if (index < 0) return notFound();
    if (!isUnlocked(book)) {
      window.setTimeout(function () { window.location.hash = hashLink("book/" + encodeURIComponent(book.slug)); }, 0);
      return "";
    }
    const chapter = chapters[index];
    const key = chapterKey(book, chapter);
    const progress = store.read("progress", {});
    const marks = store.read("marks", []);
    const notes = store.read("notes", {});
    const bookmarks = store.read("chapter-bookmarks", []);
    const fontSize = Math.max(16, Math.min(25, Number(store.read("font-size", 19)) || 19));
    const theme = store.read("reader-theme", "paper");
    const previous = chapters[index - 1];
    const next = chapters[index + 1];
    const paragraphs = (chapter.paragraphs || []).map(function (paragraph, paragraphIndex) {
      const paragraphKey = key + ":" + paragraphIndex;
      const marked = marks.includes(paragraphKey);
      const note = Object.prototype.hasOwnProperty.call(notes, paragraphKey);
      return '<div class="paragraph-wrap"><p class="' + (marked ? "marked" : "") + '" data-paragraph="' +
        paragraphIndex + '">' + escapeHtml(paragraph) + '</p><div class="paragraph-actions">' +
        '<button class="paragraph-action ' + (marked ? "paragraph-active" : "") + '" type="button" data-action="mark-paragraph" data-index="' +
        paragraphIndex + '" aria-label="' + (marked ? "Remove highlight" : "Highlight paragraph") + '">' +
        icon("marker", 14) + "<span>" + (marked ? "Marked" : "Mark") + '</span></button>' +
        '<button class="paragraph-action" type="button" data-action="add-note" data-index="' + paragraphIndex +
        '">' + icon("note", 14) + "<span>Note</span></button></div>" +
        (note ? '<div class="note-box"><label for="note-' + paragraphIndex + '">A note for you</label><textarea id="note-' +
          paragraphIndex + '" data-note-index="' + paragraphIndex + '" placeholder="Keep a thought here…">' +
          escapeHtml(notes[paragraphKey]) + '</textarea><span>Private to this device</span></div>' : "") +
        "</div>";
    }).join("");
    const pdf = pdfHref(book, chapter);
    const chapterBookmark = bookmarks.includes(key);
    const themeName = theme === "night" ? "Night" : theme === "warm" ? "Warm" : "Paper";
    const toc = chapters.map(function (item, chapterIndex) {
      return '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(item.slug)) +
        '" class="contents-popover-link ' + (item.slug === chapter.slug ? "current" : "") + '"><span>' +
        String(chapterIndex + 1).padStart(2, "0") + "</span>" + escapeHtml(item.title) + "</a>";
    }).join("");

    return '<div class="reader-shell reader-' + escapeHtml(theme) + '" data-reader-key="' + escapeHtml(key) + '">' +
      '<header class="reader-header"><a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
      '" class="reader-back">' + icon("arrowLeft", 16) + "<span>Book details</span></a>" +
      '<div class="reader-book-label">' + icon("book", 15) + "<span>" + escapeHtml(book.title) +
      '</span><span class="reader-label-separator">/</span><strong>' + escapeHtml(chapter.title) + "</strong></div>" +
      '<div class="reader-tools"><button class="reader-tool" type="button" data-action="contents">' + icon("menu", 17) +
      '<span>Contents</span></button><button class="reader-tool reader-bookmark ' + (chapterBookmark ? "bookmark-on" : "") +
      '" type="button" data-action="bookmark-chapter" aria-label="' + (chapterBookmark ? "Remove chapter bookmark" : "Bookmark chapter") +
      '">' + icon("bookmark", 16, chapterBookmark) + "<span>" + (chapterBookmark ? "Saved" : "Bookmark") +
      '</span></button><button class="reader-tool" type="button" data-action="font-down" aria-label="Decrease text size">' +
      icon("minus", 17) + '</button><span class="font-size-label" id="font-size-label">' + fontSize +
      '</span><button class="reader-tool" type="button" data-action="font-up" aria-label="Increase text size">' +
      icon("plus", 17) + '</button><button class="reader-tool theme-tool" type="button" data-action="theme" aria-label="Reader theme: ' +
      themeName + '">' + icon(theme === "night" ? "sun" : "moon", 17) + '<span>' + themeName +
      '</span>' + icon("chevron", 13) + '</button></div></header>' +
      '<div class="contents-popover hidden" id="contents-popover"><div class="contents-popover-head"><strong>In this book</strong>' +
      '<button type="button" data-action="close-contents" aria-label="Close contents">' + icon("close", 16) +
      "</button></div>" + toc + '</div><div class="reading-progress-top"><span id="reading-progress" style="width:' +
      (progress[key] || 0) + '%"></span></div><main class="reader-content"><div class="reader-kicker"><span>CHAPTER ' +
      String(index + 1).padStart(2, "0") + '</span><span class="kicker-rule"></span><span>' +
      escapeHtml(book.category.toUpperCase()) + '</span></div><h1 class="reader-title serif">' +
      escapeHtml(chapter.title) + '<span>.</span></h1><div class="reader-byline"><span>A page from <i>' +
      escapeHtml(book.title) + '</i></span><span class="reader-byline-actions">' +
      (pdf ? '<a class="reader-pdf-link" href="' + escapeHtml(pdf) + '" target="_blank" rel="noreferrer">' +
        (chapter.pdfPage ? "PDF page " + chapter.pdfPage : "Open original PDF") + " " + icon("external", 12) + "</a>" : "") +
      "<span>" + icon("clock", 13) + " 3 min</span></span></div>" +
      '<div class="reader-prose" id="reader-prose" style="font-size:' + fontSize + 'px">' + paragraphs + "</div>" +
      '<div class="reader-endnote"><span class="endnote-flower">' + icon("leaf", 17) +
      '</span><span>Take what is useful. Let the rest settle.</span></div><nav class="chapter-pagination" aria-label="Chapter navigation">' +
      (previous
        ? '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(previous.slug)) +
          '" class="chapter-pager previous">' + icon("arrowLeft", 16) + '<span><small>PREVIOUS</small>' +
          escapeHtml(previous.title) + "</span></a>"
        : '<a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
          '" class="chapter-pager previous">' + icon("arrowLeft", 16) + "<span><small>BACK TO BOOK</small>All chapters</span></a>") +
      (next
        ? '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(next.slug)) +
          '" class="chapter-pager next"><span><small>UP NEXT</small>' + escapeHtml(next.title) +
          "</span>" + icon("arrowRight", 16) + "</a>"
        : '<a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
          '" class="chapter-pager next"><span><small>THAT’S A WRAP</small>Return to the book</span>' + icon("check", 16) + "</a>") +
      "</nav>" + commentsMarkup(book, chapter) + '</main><div class="reader-footer"><a href="#/" data-action="home">' +
      icon("leaf", 15) + " Garden Reading Room</a><span>Your reading place is saved on this device.</span></div></div>";
  }

  function loadGiscus() {
    const target = document.getElementById("giscus-thread");
    const config = window.GARDEN_COMMENTS || {};
    if (!target || !config.repo || !config.repoId || !config.category || !config.categoryId) return;
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", config.repo);
    script.setAttribute("data-repo-id", config.repoId);
    script.setAttribute("data-category", config.category);
    script.setAttribute("data-category-id", config.categoryId);
    script.setAttribute("data-mapping", "specific");
    script.setAttribute("data-term", "garden-reading-room:" + target.dataset.book + ":" + target.dataset.chapter);
    script.setAttribute("data-strict", "1");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "top");
    script.setAttribute("data-theme", "light");
    script.setAttribute("data-lang", config.lang || "en");
    target.appendChild(script);
  }

  function render(options) {
    const current = route();
    let content;
    if (current === "/") content = catalog();
    else {
      const parts = current.split("/").filter(Boolean).map(decodeURIComponent);
      if (parts[0] === "book" && parts[1]) content = bookDetail(parts[1]);
      else if (parts[0] === "read" && parts[1] && parts[2]) content = reader(parts[1], parts[2]);
      else content = notFound();
    }
    app.innerHTML = content;
    if (!(options && options.preserveScroll)) window.scrollTo(0, 0);
    if (document.getElementById("giscus-thread")) loadGiscus();
    if (route() === "/" && window.location.hash.slice(1) && !window.location.hash.slice(1).startsWith("/")) {
      const anchor = document.getElementById(window.location.hash.slice(1));
      if (anchor) window.setTimeout(function () { anchor.scrollIntoView(); }, 0);
    }
  }

  function updateCatalogResults() {
    const tabs = document.getElementById("category-tabs");
    const results = document.getElementById("catalog-results");
    if (tabs) tabs.innerHTML = categoryButtons();
    if (results) results.innerHTML = catalogResults();
  }

  function setReaderFont(delta) {
    const label = document.getElementById("font-size-label");
    const prose = document.getElementById("reader-prose");
    if (!label || !prose) return;
    const next = Math.max(16, Math.min(25, Number(label.textContent) + delta));
    label.textContent = next;
    prose.style.fontSize = next + "px";
    store.write("font-size", next);
  }

  function updateScrollProgress() {
    const shell = document.querySelector(".reader-shell");
    if (!shell) return;
    const key = shell.dataset.readerKey;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const percent = maxScroll <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / maxScroll) * 100));
    const progress = store.read("progress", {});
    const value = Math.max(progress[key] || 0, percent);
    if (value !== progress[key]) {
      progress[key] = value;
      store.write("progress", progress);
    }
    const bar = document.getElementById("reading-progress");
    if (bar) bar.style.width = value + "%";
  }

  function saveNote(index, text) {
    const shell = document.querySelector(".reader-shell");
    if (!shell) return;
    const notes = store.read("notes", {});
    notes[shell.dataset.readerKey + ":" + index] = text;
    store.write("notes", notes);
  }

  document.addEventListener("click", function (event) {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "home") {
      event.preventDefault();
      if (route() === "/") window.scrollTo({ top: 0, behavior: "smooth" });
      else window.location.hash = "#/";
    } else if (action === "about") {
      event.preventDefault();
      if (route() !== "/") window.location.hash = "#/";
      window.setTimeout(function () {
        const target = document.getElementById("about");
        if (target) target.scrollIntoView({ behavior: "smooth" });
      }, 40);
      document.getElementById("main-nav")?.classList.remove("nav-open");
    } else if (action === "menu") {
      const nav = document.getElementById("main-nav");
      if (nav) nav.classList.toggle("nav-open");
    } else if (action === "category") {
      state.category = control.dataset.category || "All";
      updateCatalogResults();
    } else if (action === "clear-search") {
      state.query = "";
      state.category = "All";
      const input = document.getElementById("book-search");
      if (input) input.value = "";
      updateCatalogResults();
    } else if (action === "save-book") {
      const saved = store.read("saved-books", []);
      const slug = control.dataset.book;
      store.write("saved-books", saved.includes(slug) ? saved.filter(function (item) { return item !== slug; }) : saved.concat(slug));
      render({ preserveScroll: true });
    } else if (action === "contents") {
      document.getElementById("contents-popover")?.classList.toggle("hidden");
    } else if (action === "close-contents") {
      document.getElementById("contents-popover")?.classList.add("hidden");
    } else if (action === "font-down") {
      setReaderFont(-1);
    } else if (action === "font-up") {
      setReaderFont(1);
    } else if (action === "theme") {
      const currentTheme = store.read("reader-theme", "paper");
      const nextTheme = currentTheme === "paper" ? "warm" : currentTheme === "warm" ? "night" : "paper";
      store.write("reader-theme", nextTheme);
      const shell = document.querySelector(".reader-shell");
      if (shell) {
        shell.classList.remove("reader-paper", "reader-warm", "reader-night");
        shell.classList.add("reader-" + nextTheme);
        const button = document.querySelector('[data-action="theme"]');
        if (button) button.innerHTML = icon(nextTheme === "night" ? "sun" : "moon", 17) +
          "<span>" + (nextTheme === "night" ? "Night" : nextTheme === "warm" ? "Warm" : "Paper") + "</span>" + icon("chevron", 13);
      }
    } else if (action === "bookmark-chapter") {
      const shell = document.querySelector(".reader-shell");
      if (!shell) return;
      const key = shell.dataset.readerKey;
      const bookmarks = store.read("chapter-bookmarks", []);
      store.write("chapter-bookmarks", bookmarks.includes(key)
        ? bookmarks.filter(function (item) { return item !== key; })
        : bookmarks.concat(key));
      render({ preserveScroll: true });
    } else if (action === "mark-paragraph") {
      const shell = document.querySelector(".reader-shell");
      if (!shell) return;
      const index = Number(control.dataset.index);
      const key = shell.dataset.readerKey + ":" + index;
      const marks = store.read("marks", []);
      const marked = marks.includes(key);
      store.write("marks", marked ? marks.filter(function (item) { return item !== key; }) : marks.concat(key));
      const paragraph = shell.querySelector('[data-paragraph="' + index + '"]');
      paragraph?.classList.toggle("marked", !marked);
      control.classList.toggle("paragraph-active", !marked);
      control.setAttribute("aria-label", marked ? "Highlight paragraph" : "Remove highlight");
      const label = control.querySelector("span");
      if (label) label.textContent = marked ? "Mark" : "Marked";
    } else if (action === "add-note") {
      const index = Number(control.dataset.index);
      const shell = document.querySelector(".reader-shell");
      if (!shell) return;
      const key = shell.dataset.readerKey + ":" + index;
      const notes = store.read("notes", {});
      if (!Object.prototype.hasOwnProperty.call(notes, key)) {
        notes[key] = "";
        store.write("notes", notes);
        render({ preserveScroll: true });
      }
      window.setTimeout(function () { document.getElementById("note-" + index)?.focus(); }, 0);
    }
  });

  document.addEventListener("input", function (event) {
    if (event.target.id === "book-search") {
      state.query = event.target.value;
      updateCatalogResults();
    } else if (event.target.matches("[data-note-index]")) {
      saveNote(Number(event.target.dataset.noteIndex), event.target.value);
    }
  });

  document.addEventListener("submit", function (event) {
    const form = event.target.closest(".unlock-form");
    if (!form) return;
    event.preventDefault();
    const book = findBook(form.dataset.book);
    const field = form.querySelector('[name="token"]');
    const candidate = String(field.value || "").trim().toLowerCase();
    const match = (book && book.accessTokens || []).find(function (entry) {
      return String(entry.token || entry.code || "").trim().toLowerCase() === candidate;
    });
    const message = document.getElementById("token-message");
    if (!match) {
      if (message) message.textContent = "That token didn’t match. Check it and try again.";
      return;
    }
    const expiry = tokenExpiry();
    expiry[book.slug] = Date.now() + Math.max(1, Number(match.durationDays) || 1) * 86400000;
    store.write("token-expiry", expiry);
    render({ preserveScroll: true });
  });

  window.addEventListener("hashchange", function () {
    const value = window.location.hash.slice(1);
    if (value.startsWith("/")) {
      render();
    } else if (value) {
      if (route() !== "/") window.location.hash = "#/";
      else window.setTimeout(function () {
        document.getElementById(value)?.scrollIntoView({ behavior: "smooth" });
      }, 0);
    } else {
      render();
    }
  });
  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);

  render();
})();
