(function () {
  "use strict";

  const app = document.getElementById("app");
  let books = [];
  let adminImportedFile = null;
  let adminImportedChapters = null;
  let adminBookExport = null;
  let adminCoverImage = "";
  let coverImageLoadId = 0;
  let removedBookSlugs = [];
  let adminStatus = "";
  let highlightMode = false;
  const ADMIN_PASSWORD_SALT = "2d467fd52422102e4358c7a85d28b7f5";
  const ADMIN_PASSWORD_HASH = "f00956aa31840a1bee406403e51f2aa3d6e64eac4b6b6d1928fce84805528d6d";
  const ADMIN_PASSWORD_ITERATIONS = 210000;
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

  async function verifyAdminPassword(candidate) {
    const key = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(candidate),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await window.crypto.subtle.deriveBits({
      name: "PBKDF2",
      salt: hexToBytes(ADMIN_PASSWORD_SALT),
      iterations: ADMIN_PASSWORD_ITERATIONS,
      hash: "SHA-256"
    }, key, 256);
    const actual = new Uint8Array(bits);
    const expected = hexToBytes(ADMIN_PASSWORD_HASH);
    let difference = actual.length ^ expected.length;
    for (let index = 0; index < Math.min(actual.length, expected.length); index++) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0;
  }

  function hexToBytes(value) {
    const bytes = new Uint8Array(value.length / 2);
    for (let index = 0; index < bytes.length; index++) {
      bytes[index] = parseInt(value.slice(index * 2, index * 2 + 2), 16);
    }
    return bytes;
  }

  function adminUnlocked() {
    try {
      return sessionStorage.getItem("eden-admin-unlocked") === "true";
    } catch (error) {
      return false;
    }
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

  function docxChapters(html, bookTitle) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const chapters = [];
    let current = null;
    let hasChapterHeading = false;

    function addParagraph(text) {
      const value = String(text || "").trim();
      if (!value) return;
      if (!current) {
        current = { slug: "introduction", title: "Introduction", paragraphs: [] };
        chapters.push(current);
      }
      current.paragraphs.push(value);
    }

    Array.from(parsed.body.children).forEach(function (element) {
      if (element.tagName === "H1") {
        const title = element.textContent.trim();
        if (!title) return;
        hasChapterHeading = true;
        const baseSlug = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chapter";
        let slug = baseSlug;
        let suffix = 2;
        while (chapters.some(function (chapter) { return chapter.slug === slug; })) slug = baseSlug + "-" + suffix++;
        current = { slug: slug, title: title, paragraphs: [] };
        chapters.push(current);
      } else if (element.tagName === "UL" || element.tagName === "OL") {
        Array.from(element.querySelectorAll("li")).forEach(function (item) { addParagraph(item.textContent); });
      } else {
        addParagraph(element.textContent);
      }
    });

    if (!hasChapterHeading) throw new Error("No Heading 1 chapter titles were found in the Word file.");
    return chapters;
  }

  async function loadBookContent(book) {
    if (Array.isArray(book.chapters) && book.chapters.length) return;
    if (!book.file) {
      book.chapters = [];
      return;
    }
    if (!window.mammoth) throw new Error("The Word document parser could not be loaded. Check your internet connection and try again.");
    const fileUrl = new URL(book.file, document.baseURI);
    const response = await fetch(fileUrl.href);
    if (!response.ok) throw new Error("The Word file could not be found at " + book.file + ".");
    const result = await window.mammoth.convertToHtml({ arrayBuffer: await response.arrayBuffer() });
    book.chapters = docxChapters(result.value, book.title);
  }

  function currentProgress(book) {
    const progress = store.read("progress", {});
    const chapters = Array.isArray(book.chapters) ? book.chapters : [];
    if (!chapters.length) return 0;
    const total = chapters.reduce(function (sum, chapter) {
      return sum + (progress[chapterKey(book, chapter)] || 0);
    }, 0);
    return Math.round(total / book.chapters.length);
  }

  function inactiveTimeoutMs(book) {
    return Math.max(1, Number(book && book.inactiveMinutes) || 30) * 60000;
  }

  function accessSession(book) {
    if (!book.accessTokens || !book.accessTokens.length) return null;
    const sessions = store.read("book-access-sessions", {});
    const session = sessions[book.slug];
    const lastActivity = Number(session && session.lastActivity);
    if (!session || !Number.isFinite(lastActivity) || Date.now() - lastActivity >= inactiveTimeoutMs(book)) {
      if (session) {
        delete sessions[book.slug];
        store.write("book-access-sessions", sessions);
      }
      return null;
    }
    return session;
  }

  function isUnlocked(book) {
    if (!book.accessTokens || !book.accessTokens.length) return true;
    return Boolean(accessSession(book));
  }

  async function loadCatalog() {
    const indexResponse = await fetch("./catalog-index.json");
    if (!indexResponse.ok) throw new Error("catalog-index.json could not be loaded.");
    const index = await indexResponse.json();
    if (!index || !Array.isArray(index.books) ||
      index.books.some(function (name) { return typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.json$/.test(name); })) {
      throw new Error("catalog-index.json must contain a books array of book filenames.");
    }
    const savedHiddenBooks = store.read("hidden-books", []);
    if (!Array.isArray(savedHiddenBooks) ||
      savedHiddenBooks.some(function (slug) { return typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); })) {
      throw new Error("The saved hidden book list is invalid. Clear this site's local storage and try again.");
    }
    removedBookSlugs = savedHiddenBooks.slice();
    books = await Promise.all(index.books.map(async function (name) {
      const response = await fetch("./catalog/" + encodeURIComponent(name));
      if (!response.ok) throw new Error("Could not load catalog/" + name + ".");
      const book = await response.json();
      const expectedSlug = name.replace(/\.json$/i, "");
      if (!book || typeof book !== "object" || Array.isArray(book) ||
        book.slug !== expectedSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.slug)) {
        throw new Error("catalog/" + name + " must contain a book whose slug matches its filename.");
      }
      if (!Array.isArray(book.chapters)) throw new Error("catalog/" + name + " must contain a chapters array.");
      return book;
    }));
    books.sort(function (first, second) { return first.title.localeCompare(second.title); });
    await Promise.all(books.map(async function (book) {
      if (!isUnlocked(book)) return;
      try {
        await loadBookContent(book);
      } catch (error) {
        book.loadError = error.message;
      }
    }));
    render();
  }

  function updateAccessSessions(recordActivity) {
    const sessions = store.read("book-access-sessions", {});
    const now = Date.now();
    let changed = false;
    const expired = [];
    Object.keys(sessions).forEach(function (slug) {
      const session = sessions[slug];
      const lastActivity = Number(session && session.lastActivity);
      const book = findBook(slug);
      if (!Number.isFinite(lastActivity) || now - lastActivity >= inactiveTimeoutMs(book)) {
        delete sessions[slug];
        expired.push(slug);
        changed = true;
      } else if (recordActivity) {
        session.lastActivity = now;
        changed = true;
      }
    });
    if (changed) store.write("book-access-sessions", sessions);
    if (expired.length) {
      const parts = route().split("/").filter(Boolean);
      const bookSlug = parts[0] === "read" ? parts[1] : parts[0] === "book" ? parts[1] : "";
      if (bookSlug && expired.includes(bookSlug)) render({ preserveScroll: true });
    }
  }

  let lastActivityWrite = 0;
  function recordReadingActivity() {
    const now = Date.now();
    if (now - lastActivityWrite < 10000) return;
    lastActivityWrite = now;
    updateAccessSessions(true);
  }

  function brand(compact) {
    return '<a href="#/" class="brand-link ' + (compact ? "brand-compact" : "") +
      '" data-action="home"><span class="brand-mark">' + icon("leaf", 18) +
      '</span><span class="brand-name">Eden <em>Publications</em></span></a>';
  }

  function header() {
    const isHome = route() === "/";
    const isAdmin = route() === "/admin";
    return '<header class="site-header"><div class="header-inner">' + brand(false) +
      '<nav class="main-nav" id="main-nav" aria-label="Main navigation">' +
      '<a href="#/" class="nav-link ' + (isHome ? "active" : "") + '" data-action="home">The library</a>' +
      '<a href="#about" class="nav-link" data-action="about">Our approach</a>' +
      '<a href="#/admin" class="nav-link ' + (isAdmin ? "active" : "") + '">Admin</a>' +
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
    const coverImage = typeof coverData.image === "string" &&
      /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(coverData.image)
      ? ';background-image:linear-gradient(0deg,rgb(0 0 0 / 38%),transparent 68%),url(&quot;' +
        escapeHtml(coverData.image) + '&quot;);background-size:cover;background-position:center'
      : "";
    return '<div class="cover-art cover-' + (size || "card") + '" style="background:' +
      escapeHtml(coverData.background || "linear-gradient(150deg,#d8e0bd,#79947d)") +
      ';color:' + escapeHtml(coverData.ink || "#274b3b") + coverImage + '">' +
      '<div class="cover-sprig" aria-hidden="true"><span></span><span></span><span></span></div>' +
      '<span class="cover-eyebrow">' + escapeHtml(coverData.eyebrow || "A SMALL GUIDE TO") + '</span>' +
      '<div class="cover-title serif">' + escapeHtml(coverData.motif || book.title) + '</div>' +
      '<div class="cover-rule"></div><span class="cover-author">' + escapeHtml(book.author) + '</span>' +
      '<span class="cover-edition">EDEN PUBLICATIONS · ' + escapeHtml(book.category.toUpperCase()) + "</span></div>";
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
    const publicBooks = books.filter(function (book) { return !removedBookSlugs.includes(book.slug); });
    const categories = ["All"].concat(Array.from(new Set(publicBooks.map(function (book) { return book.category; }))));
    return categories.map(function (category) {
      return '<button type="button" class="category-tab ' + (state.category === category ? "selected" : "") +
        '" data-action="category" data-category="' + escapeHtml(category) + '" aria-pressed="' +
        (state.category === category) + '">' + escapeHtml(category) + "</button>";
    }).join("");
  }

  function catalogResults() {
    const query = state.query.trim().toLowerCase();
    const publicBooks = books.filter(function (book) { return !removedBookSlugs.includes(book.slug); });
    const filtered = publicBooks.filter(function (book) {
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
    const savedBooks = publicBooks.filter(function (book) { return store.read("saved-books", []).includes(book.slug); });
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
    const publicBooks = books.filter(function (book) { return !removedBookSlugs.includes(book.slug); });
    const demo = publicBooks.some(function (book) { return book.isDemo; });
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
      '<span class="shelf-count"><strong id="book-count">' + String(publicBooks.length).padStart(2, "0") + '</strong> small book' +
      (publicBooks.length === 1 ? "" : "s") + '<br>and growing slowly</span></div><div class="library-controls">' +
      '<div class="category-tabs" id="category-tabs" role="group" aria-label="Filter books by category">' + categoryButtons() +
      '</div><label class="search-field">' + icon("search", 16) +
      '<input type="search" id="book-search" placeholder="Find a title…" aria-label="Search books"></label></div>' +
      '<div id="catalog-results">' + catalogResults() + '</div></section><section class="about-strip" id="about">' +
      '<div class="about-stamp">' + icon("leaf", 22) + '<span>GROW<br>GENTLY</span></div><div><div class="eyebrow">A NOTE FROM THE READING ROOM</div>' +
      '<h2 class="serif">No perfect routines.<br><i>Just good company.</i></h2></div>' +
      '<p>These pages are here to offer useful ideas without the noise. Take what feels helpful, leave what doesn’t, and remember that care can be wonderfully ordinary.</p></section>' +
      (demo ? '<div class="demo-note"><span class="demo-pip"></span><strong>DEMO EDITION</strong><span>An illustrative sample is included in <code>catalog/</code>.</span></div>' : "") +
      '</main>' + footer() + "</div>";
  }

  function adminLoginPage() {
    return '<div class="page-enter">' + header() + '<main class="admin-main admin-login-main">' +
      '<div class="admin-panel admin-login-panel"><div class="eyebrow muted-eyebrow">RESTRICTED WORKSPACE</div>' +
      '<h1 class="serif admin-title">Admin <i>sign in.</i></h1>' +
      '<p class="admin-intro">Enter the administrator password to open the publishing workspace.</p>' +
      '<form class="admin-unlock-form"><label for="admin-password">Admin password</label>' +
      '<input id="admin-password" name="password" type="password" autocomplete="current-password" required>' +
      '<button class="button-primary" type="submit">Unlock admin ' + icon("arrowRight", 16) + '</button>' +
      '<p class="form-message" id="admin-unlock-message" role="status" aria-live="polite"></p></form></div>' +
      '</main>' + footer() + '</div>';
  }

  function adminPublishedBookCard(book) {
    const hidden = removedBookSlugs.includes(book.slug);
    return '<div class="admin-published-card ' + (hidden ? "book-hidden-from-library" : "") + '">' + bookCard(book) +
      (hidden ? '<p class="admin-hidden-label">Hidden from the public library on this browser.</p>' : "") +
      '<button class="' + (hidden ? "button-secondary" : "button-danger") + '" type="button" data-action="' +
      (hidden ? "restore-book" : "delete-book") + '" data-book="' + escapeHtml(book.slug) + '">' +
      (hidden ? "Show in library" : "Delete book") + '</button></div>';
  }

  function adminPage() {
    if (!adminUnlocked()) return adminLoginPage();
    return '<div class="page-enter">' + header() + '<main class="admin-main">' +
      '<a href="#/" class="back-link">' + icon("arrowLeft", 15) + "Back to the library</a>" +
      '<div class="eyebrow muted-eyebrow">STATIC PUBLISHING WORKSPACE</div>' +
      '<h1 class="serif admin-title">Prepare a <i>new book.</i></h1>' +
      '<p class="admin-intro">Import a Word document, add its catalog details, and download one book file to add to your library.</p>' +
      '<aside class="admin-notice"><strong>Static-site limitation:</strong> this password gate is a browser-only deterrent, not secure authentication. Hiding a book only changes the public library in this browser; it remains accessible to other visitors and by direct link.</aside>' +
      (adminStatus ? '<p class="admin-status" role="status">' + escapeHtml(adminStatus) + '</p>' : "") +
      '<form class="admin-form" id="admin-form">' +
      '<section class="admin-panel"><div class="admin-section-heading"><span>01</span><div><h2 class="serif">Import your manuscript</h2><p>Use a Word document with each chapter title formatted as Heading 1.</p></div></div>' +
      '<label class="admin-field admin-file-field"><span>Word document (.docx)</span><input type="file" name="document" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required><small id="import-status" aria-live="polite">Text and paragraph breaks are imported; images, tables, and complex formatting are not included. The document is parsed in this browser and embedded in the exported JSON.</small></label></section>' +
      '<section class="admin-panel"><div class="admin-section-heading"><span>02</span><div><h2 class="serif">Book details</h2><p>These details appear in the catalog and on the book page.</p></div></div>' +
      '<div class="admin-fields-grid">' +
      '<label class="admin-field"><span>Title</span><input name="title" type="text" maxlength="120" required></label>' +
      '<label class="admin-field"><span>Book ID</span><input name="slug" type="text" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="a-short-book-id" required data-auto="true"><small>Lowercase letters, numbers, and single hyphens only.</small></label>' +
      '<label class="admin-field"><span>Subtitle</span><input name="subtitle" type="text" maxlength="180" required></label>' +
      '<label class="admin-field"><span>Author</span><input name="author" type="text" maxlength="120" required></label>' +
      '<label class="admin-field"><span>Category</span><input name="category" type="text" maxlength="80" required></label>' +
      '<label class="admin-field"><span>Estimated reading time (minutes)</span><input name="readingMinutes" type="number" min="1" max="10000" value="20" required></label>' +
      '<label class="admin-field admin-field-wide"><span>Catalog description</span><textarea name="description" rows="3" maxlength="500" required></textarea></label>' +
      '<label class="admin-field admin-field-wide"><span>Access tokens <em>(optional; one per line)</em></span><textarea name="accessTokens" rows="3" placeholder="Leave blank for an open book"></textarea><small>Tokens are included in public JSON files and are convenience-level access only.</small></label>' +
      '</div></section>' +
      '<section class="admin-panel"><div class="admin-section-heading"><span>03</span><div><h2 class="serif">Catalog and cover settings</h2><p>Design a text-and-color cover or upload an image to use as the cover.</p></div></div>' +
      '<div class="admin-fields-grid">' +
      '<label class="admin-field"><span>Cover phrase</span><input name="coverMotif" type="text" maxlength="90" value="A softer way to read" required></label>' +
      '<label class="admin-field"><span>Cover eyebrow</span><input name="coverEyebrow" type="text" maxlength="50" value="A SMALL GUIDE TO" required></label>' +
      '<label class="admin-field"><span>Cover background · first color</span><input name="coverColorStart" type="color" value="#d8e0bd"></label>' +
      '<label class="admin-field"><span>Cover background · second color</span><input name="coverColorEnd" type="color" value="#79947d"></label>' +
      '<label class="admin-field"><span>Cover text color</span><input name="coverInk" type="color" value="#274b3b"></label>' +
      '<label class="admin-field admin-field-wide admin-file-field"><span>Cover image (optional)</span><input name="coverImage" type="file" accept="image/png,image/jpeg,image/webp"><small id="cover-image-status" aria-live="polite">PNG, JPEG, or WebP up to 1 MB. The image is embedded in the downloaded book file. Uploading one uses it instead of the designed color background.</small></label>' +
      '<label class="admin-field"><span>Access inactivity timeout (minutes)</span><input name="inactiveMinutes" type="number" min="1" max="10080" value="30" required><small>Used by the browser-based token prompt; it does not secure public files.</small></label>' +
      '</div></section>' +
      '<div class="admin-submit-row"><p id="admin-message" role="status" aria-live="polite"></p><button class="button-primary" type="submit">Prepare book file ' + icon("arrowRight", 16) + '</button></div>' +
      '</form><section id="admin-output" aria-live="polite"></section>' +
      '<section class="admin-published"><div class="admin-section-heading"><span>LIBRARY</span><div><h2 class="serif">Currently published</h2><p>' + books.length + (books.length === 1 ? " book" : " books") + ' in <code>catalog/</code>. Hide or restore books in the public catalog on this browser.</p></div></div>' +
      (books.length ? '<div class="admin-published-grid">' + books.map(adminPublishedBookCard).join("") + '</div>' : '<p class="empty-state">No books have been published yet.</p>') +
      '</section><dialog class="admin-delete-dialog" id="admin-delete-dialog"><form class="admin-delete-form">' +
      '<h2 class="serif">Take down this book?</h2><p id="admin-delete-book-title"></p>' +
      '<input type="hidden" name="slug"><label for="admin-delete-password">Admin password</label>' +
      '<input id="admin-delete-password" name="password" type="password" autocomplete="current-password" required>' +
      '<p class="form-message" id="admin-delete-message" role="status" aria-live="polite"></p>' +
      '<div><button class="button-secondary" type="button" data-action="cancel-delete">Cancel</button>' +
      '<button class="button-danger" type="submit">Prepare removal</button></div></form></dialog>' +
      '</main>' + footer() + '</div>';
  }

  function showAdminExport(book) {
    adminBookExport = book;
    const output = document.getElementById("admin-output");
    if (!output) return;
    output.innerHTML = '<section class="admin-panel admin-result"><div class="admin-section-heading"><span>' +
      icon("check", 16) + '</span><div><h2 class="serif">Your book file is ready</h2><p>Review the preview, then download its JSON file. Existing catalog files stay untouched.</p></div></div>' +
      '<div class="admin-preview"><div class="admin-preview-cover">' + cover(book, "admin") + '</div><div><div class="eyebrow muted-eyebrow">' +
      escapeHtml(book.category) + ' · ' + book.chapters.length + (book.chapters.length === 1 ? ' CHAPTER' : ' CHAPTERS') +
      '</div><h3 class="serif">' + escapeHtml(book.title) + '</h3><p>' + escapeHtml(book.subtitle) +
      '</p><p class="admin-preview-description">' + escapeHtml(book.description) + '</p></div></div>' +
      '<div class="admin-downloads"><button type="button" class="button-primary" data-action="download-book">Download ' + escapeHtml(book.slug) + '.json</button></div>' +
      '<ol class="admin-publish-steps"><li>Upload <code>' + escapeHtml(book.slug) + '.json</code> into the repository’s <code>catalog/</code> folder. Do not replace any other book file.</li>' +
      '<li>Commit and push the new file. GitHub Pages will deploy the updated site.</li>' +
      '<li>After deployment, the new book will appear in the library for all visitors.</li></ol></section>';
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function readFileDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onerror = function () { reject(reader.error || new Error("The cover image could not be read.")); };
      reader.onload = function () {
        if (typeof reader.result !== "string") {
          reject(new Error("The cover image could not be converted."));
          return;
        }
        resolve(reader.result);
      };
      reader.readAsDataURL(file);
    });
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
    const chapterRows = chapters.map(function (chapter, index) {
      const done = (store.read("progress", {})[chapterKey(book, chapter)] || 0) >= 95;
      return '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(chapter.slug)) +
        '" class="chapter-list-item"><span class="chapter-number">' + String(index + 1).padStart(2, "0") +
        '</span><span class="chapter-list-title">' + escapeHtml(chapter.title) + '</span><span class="chapter-status">' +
        (done ? icon("check", 15) : "Read chapter") + '</span>' + icon("arrowRight", 16) + "</a>";
    }).join("");
    const readingAction = unlocked && chapters.length
      ? '<div class="detail-actions"><a href="' + (chapters[0] ? hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(chapters[0].slug)) : "#") +
        '" class="button-primary">' + (percent ? "Continue reading" : "Begin reading") + " " + icon("arrowRight", 16) +
        '</a><button class="save-button ' + (saved ? "is-saved" : "") + '" type="button" data-action="save-book" data-book="' +
        escapeHtml(book.slug) + '">' + icon("bookmark", 16, saved) + (saved ? "Saved to your shelf" : "Save for later") + "</button>" +
        "</div>"
      : unlocked
        ? '<p class="form-message" role="alert">' + escapeHtml(book.loadError || "No chapters are available for this book yet.") + "</p>"
        : '<form class="unlock-form" data-book="' + escapeHtml(book.slug) + '"><label for="reader-nickname">Your nickname</label>' +
        '<input id="reader-nickname" name="nickname" autocomplete="nickname" maxlength="40" placeholder="How should we address you?" value="' +
        escapeHtml(store.read("reader-nickname", "")) + '" required><label for="access-token">Book access token</label>' +
        '<div><input id="access-token" name="token" autocomplete="off" placeholder="Enter access token" required>' +
        '<button type="submit" class="button-primary">Unlock ' + icon("arrowRight", 15) + '</button></div>' +
        '<p class="privacy-warning">' + icon("lock", 14) +
        '<span>Access stays open while you are active and expires after ' + Number(book.inactiveMinutes || 30) + ' minutes of inactivity on this device. This is not secure access control.</span></p>' +
        '<span class="form-message" id="token-message" role="status"></span></form>';

    return '<div class="page-enter">' + header() + '<main class="detail-main"><a href="#/" class="back-link" data-action="home">' +
      icon("arrowLeft", 15) + " Back to the shelves</a><section class=\"detail-hero\"><div class=\"detail-cover-wrap\">" +
      cover(book, "detail") + '<div class="cover-caption">AN EDEN PUBLICATIONS EDITION</div></div><div class="detail-copy">' +
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
      (chapters.length ? chapterRows : unlocked
        ? '<p class="empty-state">' + escapeHtml(book.loadError || "No chapters are available for this book yet.") + "</p>"
        : '<p class="empty-state">Unlock this book to open its chapters.</p>') +
      '</div></section></main>' + footer() + "</div>";
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
    const rangesByParagraph = store.read("highlight-ranges", {});
    const notes = store.read("notes", {});
    const bookmarks = store.read("chapter-bookmarks", []);
    const fontSize = Math.max(16, Math.min(25, Number(store.read("font-size", 19)) || 19));
    const themes = ["paper", "warm", "night", "light", "dark"];
    let theme = store.read("reader-theme", "paper");
    if (!themes.includes(theme)) theme = "paper";
    const themeLabels = { paper: "Paper", warm: "Warm", night: "Night", light: "Light", dark: "Dark" };
    const previous = chapters[index - 1];
    const next = chapters[index + 1];
    const pageCount = Math.max(1, (chapter.paragraphs || []).length);
    const pageMap = store.read("reader-pages", {});
    const pageIndex = Math.max(0, Math.min(pageCount - 1,
      Number.isInteger(Number(pageMap[key])) ? Number(pageMap[key]) : 0));
    const paragraph = (chapter.paragraphs || [])[pageIndex] || "";
    const paragraphKey = key + ":" + pageIndex;
    const isMarked = marks.includes(paragraphKey);
    const savedRanges = Array.isArray(rangesByParagraph[paragraphKey]) ? rangesByParagraph[paragraphKey] : [];
    const normalizedRanges = (isMarked ? [{ start: 0, end: paragraph.length }] : savedRanges)
      .filter(function (range) {
        return range && Number.isInteger(range.start) && Number.isInteger(range.end) &&
          range.start >= 0 && range.end <= paragraph.length && range.start < range.end;
      }).sort(function (first, second) { return first.start - second.start; })
      .reduce(function (result, range) {
        const last = result[result.length - 1];
        if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
        else result.push({ start: range.start, end: range.end });
        return result;
      }, []);
    let paragraphHtml = "";
    let textOffset = 0;
    normalizedRanges.forEach(function (range) {
      paragraphHtml += escapeHtml(paragraph.slice(textOffset, range.start)) +
        "<mark>" + escapeHtml(paragraph.slice(range.start, range.end)) + "</mark>";
      textOffset = range.end;
    });
    paragraphHtml += escapeHtml(paragraph.slice(textOffset));
    const noteExists = Object.prototype.hasOwnProperty.call(notes, paragraphKey);
    const noteOpen = Boolean(store.read("open-notes", {})[paragraphKey]);
    const chapterBookmark = bookmarks.includes(key);
    const themeName = themeLabels[theme];
    const toc = chapters.map(function (item, chapterIndex) {
      return '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(item.slug)) +
        '" class="contents-popover-link ' + (item.slug === chapter.slug ? "current" : "") + '"><span>' +
        String(chapterIndex + 1).padStart(2, "0") + "</span>" + escapeHtml(item.title) + "</a>";
    }).join("");
    const previousPage = pageIndex > 0
      ? '<button class="chapter-pager previous" type="button" data-action="reader-page" data-page="' +
        (pageIndex - 1) + '">' + icon("arrowLeft", 16) + '<span><small>PREVIOUS PAGE</small>Page ' +
        pageIndex + "</span></button>"
      : previous
        ? '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(previous.slug)) +
          '" class="chapter-pager previous">' + icon("arrowLeft", 16) + '<span><small>PREVIOUS CHAPTER</small>' +
          escapeHtml(previous.title) + "</span></a>"
        : '<a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
          '" class="chapter-pager previous">' + icon("arrowLeft", 16) + "<span><small>BACK TO BOOK</small>Contents</span></a>";
    const nextPage = pageIndex < pageCount - 1
      ? '<button class="chapter-pager next" type="button" data-action="reader-page" data-page="' +
        (pageIndex + 1) + '"><span><small>NEXT PAGE</small>Page ' + (pageIndex + 2) +
        "</span>" + icon("arrowRight", 16) + "</button>"
      : next
        ? '<a href="' + hashLink("read/" + encodeURIComponent(book.slug) + "/" + encodeURIComponent(next.slug)) +
          '" class="chapter-pager next"><span><small>UP NEXT</small>' + escapeHtml(next.title) +
          "</span>" + icon("arrowRight", 16) + "</a>"
        : '<a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
          '" class="chapter-pager next"><span><small>THAT’S A WRAP</small>Return to the book</span>' +
          icon("check", 16) + "</a>";

    return '<div class="reader-shell reader-' + escapeHtml(theme) + '" data-reader-key="' + escapeHtml(key) +
      '" data-page-index="' + pageIndex + '" data-page-count="' + pageCount + '">' +
      '<header class="reader-header"><a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
      '" class="reader-back">' + icon("arrowLeft", 16) + "<span>Book details</span></a>" +
      '<div class="reader-book-label">' + icon("book", 15) + "<span>" + escapeHtml(book.title) +
      '</span><span class="reader-label-separator">/</span><strong>' + escapeHtml(chapter.title) + "</strong></div>" +
      '<div class="reader-tools"><button class="reader-tool highlight-tool ' + (highlightMode ? "tool-active" : "") +
      '" type="button" data-action="toggle-highlight" aria-pressed="' + highlightMode +
      '" aria-label="Highlight selected text" title="Select text to highlight">' + icon("marker", 17) +
      '<span>Highlight</span></button><button class="reader-tool" type="button" data-action="contents">' + icon("menu", 17) +
      '<span>Contents</span></button><button class="reader-tool reader-bookmark ' + (chapterBookmark ? "bookmark-on" : "") +
      '" type="button" data-action="bookmark-chapter" aria-label="' + (chapterBookmark ? "Remove chapter bookmark" : "Bookmark chapter") +
      '">' + icon("bookmark", 16, chapterBookmark) + "<span>" + (chapterBookmark ? "Saved" : "Bookmark") +
      '</span></button><button class="reader-tool" type="button" data-action="font-down" aria-label="Decrease text size">' +
      icon("minus", 17) + '</button><span class="font-size-label" id="font-size-label">' + fontSize +
      '</span><button class="reader-tool" type="button" data-action="font-up" aria-label="Increase text size">' +
      icon("plus", 17) + '</button><button class="reader-tool theme-tool" type="button" data-action="theme" aria-label="Reader theme: ' +
      themeName + '">' + icon(theme === "night" || theme === "dark" ? "sun" : "moon", 17) + '<span>' + themeName +
      '</span>' + icon("chevron", 13) + '</button></div></header>' +
      '<div class="contents-popover hidden" id="contents-popover"><div class="contents-popover-head"><strong>In this book</strong>' +
      '<button type="button" data-action="close-contents" aria-label="Close contents">' + icon("close", 16) +
      "</button></div>" + toc + '</div><div class="reading-progress-top"><span id="reading-progress" style="width:' +
      (progress[key] || 0) + '%"></span></div><main class="reader-content"><section class="reader-page">' +
      '<div class="reader-page-heading"><div class="reader-kicker"><span>CHAPTER ' +
      String(index + 1).padStart(2, "0") + '</span><span class="kicker-rule"></span><span>' +
      escapeHtml(book.category.toUpperCase()) + '</span><span class="reader-page-count">PAGE ' +
      (pageIndex + 1) + ' / ' + pageCount + '</span></div><h1 class="reader-title serif">' +
      escapeHtml(chapter.title) + '<span>.</span></h1><div class="reader-byline"><span>A page from <i>' +
      escapeHtml(book.title) + '</i></span><span>' + icon("clock", 13) + " " +
      Number(book.readingMinutes || 1) + ' min read</span></div></div>' +
      '<div class="reader-prose" id="reader-prose" style="font-size:' + fontSize + 'px"><p data-paragraph="' +
      pageIndex + '">' + paragraphHtml + '</p></div>' +
      '<section class="page-notes"><div class="page-notes-heading"><div><strong>Notes for this page</strong>' +
      '<span>Saved on this device</span></div>' + (!noteExists || !noteOpen
        ? '<button class="paragraph-action" type="button" data-action="add-note" data-index="' + pageIndex +
          '">' + icon("note", 15) + '<span>' + (noteExists ? "Edit note" : "Add a note") + '</span></button>'
        : "") + '</div>' +
      (noteExists && noteOpen ? '<textarea id="note-' + pageIndex + '" data-note-index="' + pageIndex +
        '" placeholder="Keep a thought here…">' + escapeHtml(notes[paragraphKey]) + '</textarea>' : "") +
      '</section><div class="reader-page-bottom"><nav class="chapter-pagination" aria-label="Page navigation">' +
      previousPage + nextPage + '</nav></div></section></main><div class="reader-footer"><a href="#/" data-action="home">' +
      icon("leaf", 15) + " Eden Publications</a><span>Your reading place is saved on this device.</span></div></div>";
  }

  function render(options) {
    const current = route();
    if (current !== "/admin") {
      adminCoverImage = "";
      coverImageLoadId++;
      adminImportedFile = null;
      adminImportedChapters = null;
      adminBookExport = null;
      try {
        sessionStorage.removeItem("eden-admin-unlocked");
      } catch (error) {
        console.error("Could not clear the admin session.", error);
      }
    }
    let content;
    if (current === "/") content = catalog();
    else if (current === "/admin") content = adminPage();
    else {
      const parts = current.split("/").filter(Boolean).map(decodeURIComponent);
      if (parts[0] === "book" && parts[1]) content = bookDetail(parts[1]);
      else if (parts[0] === "read" && parts[1] && parts[2]) content = reader(parts[1], parts[2]);
      else content = notFound();
    }
    app.innerHTML = content;
    if (!(options && options.preserveScroll)) window.scrollTo(0, 0);
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
    const pageIndex = Number(shell.dataset.pageIndex);
    const pageCount = Number(shell.dataset.pageCount);
    const percent = Math.round(((pageIndex + 1) / pageCount) * 100);
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
    if (action === "download-book" && adminBookExport) {
      downloadJson(adminBookExport.slug + ".json", adminBookExport);
    } else if (action === "delete-book") {
      const book = findBook(control.dataset.book);
      const dialog = document.getElementById("admin-delete-dialog");
      const form = dialog && dialog.querySelector(".admin-delete-form");
      if (!book || !dialog || !form) return;
      form.elements.namedItem("slug").value = book.slug;
      form.elements.namedItem("password").value = "";
      document.getElementById("admin-delete-book-title").textContent =
        "Hide “" + book.title + "” from the public library on this browser? It will remain available in Admin.";
      document.getElementById("admin-delete-message").textContent = "";
      dialog.showModal();
      form.elements.namedItem("password").focus();
    } else if (action === "restore-book") {
      const slug = control.dataset.book;
      removedBookSlugs = removedBookSlugs.filter(function (item) { return item !== slug; });
      store.write("hidden-books", removedBookSlugs);
      adminStatus = "The book is visible in the public library again on this browser.";
      render({ preserveScroll: true });
    } else if (action === "cancel-delete") {
      document.getElementById("admin-delete-dialog")?.close();
    } else if (action === "home") {
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
    } else if (action === "toggle-highlight") {
      highlightMode = !highlightMode;
      control.classList.toggle("tool-active", highlightMode);
      control.setAttribute("aria-pressed", String(highlightMode));
      control.setAttribute("title", highlightMode ? "Select text to highlight" : "Turn highlighting on");
      const label = control.querySelector("span");
      if (label) label.textContent = highlightMode ? "Select text" : "Highlight";
    } else if (action === "font-down") {
      setReaderFont(-1);
    } else if (action === "font-up") {
      setReaderFont(1);
    } else if (action === "theme") {
      const currentTheme = store.read("reader-theme", "paper");
      const themes = ["paper", "warm", "night", "light", "dark"];
      const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
      const labels = { paper: "Paper", warm: "Warm", night: "Night", light: "Light", dark: "Dark" };
      store.write("reader-theme", nextTheme);
      const shell = document.querySelector(".reader-shell");
      if (shell) {
        shell.classList.remove("reader-paper", "reader-warm", "reader-night", "reader-light", "reader-dark");
        shell.classList.add("reader-" + nextTheme);
        const button = document.querySelector('[data-action="theme"]');
        if (button) {
          button.innerHTML = icon(nextTheme === "night" || nextTheme === "dark" ? "sun" : "moon", 17) +
            "<span>" + labels[nextTheme] + "</span>" + icon("chevron", 13);
          button.setAttribute("aria-label", "Reader theme: " + labels[nextTheme]);
        }
      }
    } else if (action === "reader-page") {
      const shell = document.querySelector(".reader-shell");
      if (!shell) return;
      const pageMap = store.read("reader-pages", {});
      pageMap[shell.dataset.readerKey] = Number(control.dataset.page);
      store.write("reader-pages", pageMap);
      render();
    } else if (action === "bookmark-chapter") {
      const shell = document.querySelector(".reader-shell");
      if (!shell) return;
      const key = shell.dataset.readerKey;
      const bookmarks = store.read("chapter-bookmarks", []);
      store.write("chapter-bookmarks", bookmarks.includes(key)
        ? bookmarks.filter(function (item) { return item !== key; })
        : bookmarks.concat(key));
      render({ preserveScroll: true });
    } else if (action === "add-note") {
      const index = Number(control.dataset.index);
      const shell = document.querySelector(".reader-shell");
      if (!shell) return;
      const key = shell.dataset.readerKey + ":" + index;
      const notes = store.read("notes", {});
      const openNotes = store.read("open-notes", {});
      openNotes[key] = true;
      store.write("open-notes", openNotes);
      if (!Object.prototype.hasOwnProperty.call(notes, key)) {
        notes[key] = "";
        store.write("notes", notes);
      }
      render({ preserveScroll: true });
      window.setTimeout(function () { document.getElementById("note-" + index)?.focus(); }, 0);
    }
  });

  function applyTextHighlight() {
    if (!highlightMode) return;
    const shell = document.querySelector(".reader-shell");
    const selection = window.getSelection();
    if (!shell || !selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const paragraph = (range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement)?.closest("[data-paragraph]");
    if (!paragraph || !paragraph.contains(range.startContainer) || !paragraph.contains(range.endContainer)) return;
    const beforeStart = range.cloneRange();
    beforeStart.selectNodeContents(paragraph);
    beforeStart.setEnd(range.startContainer, range.startOffset);
    const beforeEnd = range.cloneRange();
    beforeEnd.selectNodeContents(paragraph);
    beforeEnd.setEnd(range.endContainer, range.endOffset);
    const start = beforeStart.toString().length;
    const end = beforeEnd.toString().length;
    if (start >= end) return;
    const key = shell.dataset.readerKey + ":" + paragraph.dataset.paragraph;
    const rangesByParagraph = store.read("highlight-ranges", {});
    const marks = store.read("marks", []);
    const isLegacyMarked = marks.includes(key);
    const ranges = isLegacyMarked
      ? [{ start: 0, end: paragraph.textContent.length }]
      : Array.isArray(rangesByParagraph[key]) ? rangesByParagraph[key].filter(function (item) {
        return item && Number.isInteger(item.start) && Number.isInteger(item.end) &&
          item.start >= 0 && item.end <= paragraph.textContent.length && item.start < item.end;
      }) : [];
    const fullyHighlighted = ranges.some(function (item) {
      return item && item.start <= start && item.end >= end;
    });
    let updatedRanges;
    if (fullyHighlighted) {
      updatedRanges = ranges.reduce(function (result, item) {
        if (item.end <= start || item.start >= end) result.push(item);
        else {
          if (item.start < start) result.push({ start: item.start, end: start });
          if (item.end > end) result.push({ start: end, end: item.end });
        }
        return result;
      }, []);
    } else {
      updatedRanges = ranges.concat({ start: start, end: end });
    }
    if (isLegacyMarked) store.write("marks", marks.filter(function (item) { return item !== key; }));
    rangesByParagraph[key] = updatedRanges;
    store.write("highlight-ranges", rangesByParagraph);
    selection.removeAllRanges();
    render({ preserveScroll: true });
  }

  document.addEventListener("mouseup", applyTextHighlight);
  document.addEventListener("touchend", applyTextHighlight, { passive: true });

  document.addEventListener("input", function (event) {
    const adminForm = event.target.closest(".admin-form");
    if (adminForm) {
      if (event.target.name === "title") {
        const slugField = adminForm.elements.namedItem("slug");
        if (slugField.dataset.auto === "true") {
          slugField.value = event.target.value.toLowerCase().normalize("NFKD")
            .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
      } else if (event.target.name === "slug") {
        event.target.dataset.auto = "false";
      }
      adminBookExport = null;
      const output = document.getElementById("admin-output");
      if (output) output.innerHTML = "";
      const message = document.getElementById("admin-message");
      if (message) message.textContent = "";
      return;
    }
    if (event.target.id === "book-search") {
      state.query = event.target.value;
      updateCatalogResults();
    } else if (event.target.matches("[data-note-index]")) {
      saveNote(Number(event.target.dataset.noteIndex), event.target.value);
    }
  });

  document.addEventListener("change", async function (event) {
    const input = event.target;
    if (input.matches('.admin-form input[name="coverImage"]')) {
      adminCoverImage = "";
      const loadId = ++coverImageLoadId;
      adminBookExport = null;
      const output = document.getElementById("admin-output");
      if (output) output.innerHTML = "";
      const message = document.getElementById("admin-message");
      if (message) message.textContent = "";
      const status = document.getElementById("cover-image-status");
      const file = input.files && input.files[0];
      if (!file) {
        if (status) status.textContent = "No uploaded image. The designed color cover will be used.";
        return;
      }
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
        input.value = "";
        if (status) status.textContent = "Choose a PNG, JPEG, or WebP image no larger than 1 MB.";
        return;
      }
      if (status) status.textContent = "Reading " + file.name + "…";
      try {
        const image = await readFileDataUrl(file);
        if (loadId !== coverImageLoadId) return;
        adminCoverImage = image;
        if (status) status.textContent = file.name + " is ready and will be embedded in the downloaded book file.";
      } catch (error) {
        if (loadId !== coverImageLoadId) return;
        input.value = "";
        if (status) status.textContent = error.message;
      }
      return;
    }
    if (!input.matches('.admin-form input[name="document"]')) return;
    const file = input.files && input.files[0];
    adminImportedFile = null;
    adminImportedChapters = null;
    adminBookExport = null;
    const output = document.getElementById("admin-output");
    if (output) output.innerHTML = "";
    const status = document.getElementById("import-status");
    if (!file) {
      if (status) status.textContent = "Choose a .docx file to import.";
      return;
    }
    if (!window.mammoth) {
      if (status) status.textContent = "The Word document parser could not be loaded. Check your internet connection and try again.";
      return;
    }
    if (status) status.textContent = "Importing " + file.name + "…";
    try {
      const result = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const chapters = docxChapters(result.value, "");
      adminImportedChapters = chapters.filter(function (chapter) { return chapter.paragraphs.length > 0; });
      if (!adminImportedChapters.length) throw new Error("The Word file needs at least one non-empty Heading 1 chapter.");
      adminImportedFile = file;
      if (status) status.textContent = "Imported " + file.name + " · " + adminImportedChapters.length +
        (adminImportedChapters.length === 1 ? " chapter found." : " chapters found.");
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  });

  document.addEventListener("submit", async function (event) {
    const adminUnlockForm = event.target.closest(".admin-unlock-form");
    if (adminUnlockForm) {
      event.preventDefault();
      const message = document.getElementById("admin-unlock-message");
      const password = adminUnlockForm.elements.namedItem("password").value;
      try {
        if (!(await verifyAdminPassword(password))) {
          if (message) message.textContent = "That password did not match.";
          adminUnlockForm.elements.namedItem("password").select();
          return;
        }
        sessionStorage.setItem("eden-admin-unlocked", "true");
        adminStatus = "";
        render();
      } catch (error) {
        if (message) message.textContent = "Admin sign-in is unavailable in this browser: " + error.message;
      }
      return;
    }
    const adminDeleteForm = event.target.closest(".admin-delete-form");
    if (adminDeleteForm) {
      event.preventDefault();
      const message = document.getElementById("admin-delete-message");
      const slug = adminDeleteForm.elements.namedItem("slug").value;
      const book = findBook(slug);
      if (!book) {
        if (message) message.textContent = "That book is no longer in the published catalog.";
        return;
      }
      try {
        const password = adminDeleteForm.elements.namedItem("password").value;
        if (!(await verifyAdminPassword(password))) {
          if (message) message.textContent = "That password did not match. The book was not removed.";
          adminDeleteForm.elements.namedItem("password").select();
          return;
        }
        removedBookSlugs = Array.from(new Set(removedBookSlugs.concat(slug))).sort();
        store.write("hidden-books", removedBookSlugs);
        adminStatus = "The book is now hidden from the public library on this browser. It remains available in Admin and can be restored.";
        document.getElementById("admin-delete-dialog")?.close();
        render({ preserveScroll: true });
      } catch (error) {
        if (message) message.textContent = "The removal could not be prepared: " + error.message;
      }
      return;
    }
    const adminForm = event.target.closest(".admin-form");
    if (adminForm) {
      event.preventDefault();
      const message = document.getElementById("admin-message");
      const fileInput = adminForm.elements.namedItem("document");
      const file = fileInput.files && fileInput.files[0];
      const value = function (name) { return String(adminForm.elements.namedItem(name).value || "").trim(); };
      if (!file || file !== adminImportedFile || !adminImportedChapters) {
        if (message) message.textContent = "Import a valid Word document before preparing the book.";
        return;
      }
      const slug = value("slug");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        if (message) message.textContent = "Use a book ID with lowercase letters or numbers separated by single hyphens.";
        return;
      }
      const requiredFields = ["title", "subtitle", "author", "category", "description", "coverMotif", "coverEyebrow"];
      if (requiredFields.some(function (name) { return !value(name); })) {
        if (message) message.textContent = "Fill in each required book detail before preparing the files.";
        return;
      }
      if (books.some(function (book) { return book.slug === slug; }) || removedBookSlugs.includes(slug)) {
        if (message) message.textContent = "That book ID is already published or has been removed. Choose a different ID.";
        return;
      }
      const readingMinutes = Number(value("readingMinutes"));
      const inactiveMinutes = Number(value("inactiveMinutes"));
      if (!Number.isInteger(readingMinutes) || readingMinutes < 1 || readingMinutes > 10000 ||
        !Number.isInteger(inactiveMinutes) || inactiveMinutes < 1 || inactiveMinutes > 10080) {
        if (message) message.textContent = "Enter valid reading time and access timeout values.";
        return;
      }
      const tokens = value("accessTokens").split(/\r?\n/).map(function (token) { return token.trim(); })
        .filter(function (token, index, list) {
          return token && list.findIndex(function (item) { return item.toLowerCase() === token.toLowerCase(); }) === index;
        });
      const book = {
        slug: slug,
        isDemo: false,
        title: value("title"),
        subtitle: value("subtitle"),
        author: value("author"),
        category: value("category"),
        description: value("description"),
        cover: {
          background: "linear-gradient(150deg, " + value("coverColorStart") + " 0%, " + value("coverColorEnd") + " 100%)",
          ink: value("coverInk"),
          eyebrow: value("coverEyebrow"),
          motif: value("coverMotif"),
          image: adminCoverImage
        },
        readingMinutes: readingMinutes,
        inactiveMinutes: inactiveMinutes,
        accessTokens: tokens,
        chapters: adminImportedChapters
      };
      showAdminExport(book);
      if (message) message.textContent = "Ready to download. Add this JSON file to catalog/ and deploy it to publish the book.";
      return;
    }
    const form = event.target.closest(".unlock-form");
    if (!form) return;
    event.preventDefault();
    const book = findBook(form.dataset.book);
    const field = form.querySelector('[name="token"]');
    const candidate = String(field.value || "").trim().toLowerCase();
    const nicknameField = form.querySelector('[name="nickname"]');
    const nickname = String(nicknameField && nicknameField.value || "").trim();
    const allowedTokens = book && Array.isArray(book.accessTokens) ? book.accessTokens : [];
    const match = allowedTokens.some(function (entry) {
      const token = typeof entry === "string" ? entry : entry && (entry.token || entry.code);
      return String(token || "").trim().toLowerCase() === candidate;
    });
    const message = document.getElementById("token-message");
    if (!nickname) {
      if (message) message.textContent = "Add a nickname to continue.";
      return;
    }
    if (!match) {
      if (message) message.textContent = "That token didn’t match. Check it and try again.";
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Opening book…";
    }
    try {
      await loadBookContent(book);
      if (!book.chapters || !book.chapters.length) throw new Error("No chapters are available in this book.");
    } catch (error) {
      if (message) message.textContent = error.message;
      if (button) {
        button.disabled = false;
        button.textContent = "Unlock";
      }
      return;
    }
    book.loadError = "";
    store.write("reader-nickname", nickname);
    const sessions = store.read("book-access-sessions", {});
    sessions[book.slug] = { nickname: nickname, lastActivity: Date.now() };
    store.write("book-access-sessions", sessions);
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
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(function (eventName) {
    document.addEventListener(eventName, recordReadingActivity, { passive: true });
  });
  window.setInterval(function () { updateAccessSessions(false); }, 15000);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") updateAccessSessions(false);
  });

  loadCatalog().catch(function (error) {
    app.innerHTML = '<main class="loading-screen" role="alert">The reading room could not load its books: ' +
      escapeHtml(error.message) + '</main>';
  });
})();
