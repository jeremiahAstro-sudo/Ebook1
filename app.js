(function () {
  "use strict";

  const app = document.getElementById("app");
  let books = [];
  let adminPdfFile = null;
  let adminBookExport = null;
  let adminCoverImage = "";
  let coverImageLoadId = 0;
  let removedBookSlugs = [];
  let adminStatus = "";
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

  function hashLink(path) {
    return "#/" + String(path || "").replace(/^\/+/, "");
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
      index.books.some(function (slug) { return typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); })) {
      throw new Error("catalog-index.json must contain a books array of book folder slugs.");
    }
    const savedHiddenBooks = store.read("hidden-books", []);
    if (!Array.isArray(savedHiddenBooks) ||
      savedHiddenBooks.some(function (slug) { return typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug); })) {
      throw new Error("The saved hidden book list is invalid. Clear this site's local storage and try again.");
    }
    removedBookSlugs = savedHiddenBooks.slice();
    books = await Promise.all(index.books.map(async function (slug) {
      const filename = slug + ".json";
      const bookPath = "./catalog/" + encodeURIComponent(slug) + "/" + encodeURIComponent(filename);
      const response = await fetch(bookPath);
      if (!response.ok) throw new Error("Could not load " + bookPath + ".");
      const book = await response.json();
      if (!book || typeof book !== "object" || Array.isArray(book) ||
        book.slug !== slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(book.slug)) {
        throw new Error("catalog/" + slug + "/" + filename + " must contain a book whose slug matches its folder.");
      }
      if (book.pdf !== undefined &&
        book.pdf !== slug + ".pdf") {
        throw new Error("catalog/" + slug + "/" + filename + " must reference " + slug + ".pdf in its pdf field.");
      }
      return book;
    }));
    books.sort(function (first, second) { return first.title.localeCompare(second.title); });
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
    return '<article class="book-card"><a href="' + hashLink("book/" + encodeURIComponent(book.slug)) +
      '" class="book-cover-link">' + cover(book, "card") + '</a><div class="book-card-copy">' +
      '<div class="book-meta"><span>' + escapeHtml(book.category) + '</span>' +
      (saved ? icon("bookmark", 14, true) : "") + '</div><a href="' +
      hashLink("book/" + encodeURIComponent(book.slug)) + '" class="book-title-link"><h3 class="serif">' +
      escapeHtml(book.title) + '</h3></a><p class="book-subtitle">' + escapeHtml(book.subtitle) +
      '</p><div class="book-card-bottom"><span>' + icon("clock", 13) + " " +
      Number(book.readingMinutes || 1) + ' min read</span><a href="' +
      hashLink("book/" + encodeURIComponent(book.slug)) + '" class="text-link">Open book ' +
      icon("arrowRight", 14) + '</a></div></div></article>';
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
      '<p class="admin-intro">Upload the original PDF, add its catalog details, and download the files to add to your library.</p>' +
      '<aside class="admin-notice"><strong>Static-site limitation:</strong> this password gate is a browser-only deterrent, not secure authentication. Hiding a book only changes the public library in this browser; it remains accessible to other visitors and by direct link.</aside>' +
      (adminStatus ? '<p class="admin-status" role="status">' + escapeHtml(adminStatus) + '</p>' : "") +
      '<form class="admin-form" id="admin-form">' +
      '<section class="admin-panel"><div class="admin-section-heading"><span>01</span><div><h2 class="serif">Upload the original book</h2><p>The PDF is kept unchanged and displayed page-by-page in its original layout.</p></div></div>' +
      '<label class="admin-field admin-file-field"><span>Book PDF · required</span><input type="file" name="pdf" accept=".pdf,application/pdf" required><small id="import-status" aria-live="polite">Upload the final PDF. Its pages, images, colors, fonts, and layout are displayed directly without editing.</small></label></section>' +
      '<section class="admin-panel"><div class="admin-section-heading"><span>02</span><div><h2 class="serif">Book details</h2><p>These details appear in the catalog and on the book page.</p></div></div>' +
      '<div class="admin-fields-grid">' +
      '<label class="admin-field"><span>Title <em>(optional)</em></span><input name="title" type="text" maxlength="120" placeholder="Defaults to the PDF filename"></label>' +
      '<label class="admin-field"><span>Book ID <em>(optional)</em></span><input name="slug" type="text" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="80" placeholder="Defaults to the title" data-auto="true"><small>Lowercase letters, numbers, and single hyphens only.</small></label>' +
      '<label class="admin-field"><span>Subtitle <em>(optional)</em></span><input name="subtitle" type="text" maxlength="180"></label>' +
      '<label class="admin-field"><span>Author <em>(optional)</em></span><input name="author" type="text" maxlength="120" placeholder="Eden Publications"></label>' +
      '<label class="admin-field"><span>Category <em>(optional)</em></span><input name="category" type="text" maxlength="80" placeholder="Uncategorized"></label>' +
      '<label class="admin-field"><span>Estimated reading time (minutes) <em>(optional)</em></span><input name="readingMinutes" type="number" min="1" max="10000" placeholder="20"></label>' +
      '<label class="admin-field admin-field-wide"><span>Catalog description <em>(optional)</em></span><textarea name="description" rows="3" maxlength="500"></textarea></label>' +
      '<label class="admin-field admin-field-wide"><span>Access tokens <em>(optional; one per line)</em></span><textarea name="accessTokens" rows="3" placeholder="Leave blank for an open book"></textarea><small>Tokens are included in public JSON files and are convenience-level access only.</small></label>' +
      '</div></section>' +
      '<section class="admin-panel"><div class="admin-section-heading"><span>03</span><div><h2 class="serif">Catalog and cover settings</h2><p>Design a text-and-color cover or upload an image to use as the cover.</p></div></div>' +
      '<div class="admin-fields-grid">' +
      '<label class="admin-field"><span>Cover phrase <em>(optional)</em></span><input name="coverMotif" type="text" maxlength="90" placeholder="Defaults to the book title"></label>' +
      '<label class="admin-field"><span>Cover eyebrow <em>(optional)</em></span><input name="coverEyebrow" type="text" maxlength="50" placeholder="A SMALL GUIDE TO"></label>' +
      '<label class="admin-field"><span>Cover background · first color</span><input name="coverColorStart" type="color" value="#d8e0bd"></label>' +
      '<label class="admin-field"><span>Cover background · second color</span><input name="coverColorEnd" type="color" value="#79947d"></label>' +
      '<label class="admin-field"><span>Cover text color</span><input name="coverInk" type="color" value="#274b3b"></label>' +
      '<label class="admin-field admin-field-wide admin-file-field"><span>Cover image (optional)</span><input name="coverImage" type="file" accept="image/png,image/jpeg,image/webp"><small id="cover-image-status" aria-live="polite">PNG, JPEG, or WebP up to 1 MB. The image is embedded in the downloaded book file. Uploading one uses it instead of the designed color background.</small></label>' +
      '<label class="admin-field"><span>Access inactivity timeout (minutes) <em>(optional)</em></span><input name="inactiveMinutes" type="number" min="1" max="10080" placeholder="30"><small>Used by the browser-based token prompt; it does not secure public files.</small></label>' +
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
      icon("check", 16) + '</span><div><h2 class="serif">Your book files are ready</h2><p>Download both files and add them to a new folder named for the book ID.</p></div></div>' +
      '<div class="admin-preview"><div class="admin-preview-cover">' + cover(book, "admin") + '</div><div><div class="eyebrow muted-eyebrow">' +
      escapeHtml(book.category) + ' · PDF BOOK' +
      '</div><h3 class="serif">' + escapeHtml(book.title) + '</h3><p>' + escapeHtml(book.subtitle) +
      '</p><p class="admin-preview-description">' + escapeHtml(book.description) + '</p></div></div>' +
      '<div class="admin-downloads"><button type="button" class="button-primary" data-action="download-book">Download ' + escapeHtml(book.slug) + '.json</button>' +
      '<button type="button" class="button-secondary" data-action="download-pdf">Download ' + escapeHtml(book.slug) + '.pdf</button></div>' +
      '<ol class="admin-publish-steps"><li>Create <code>catalog/' + escapeHtml(book.slug) + '/</code>, then put both <code>' +
      escapeHtml(book.slug) + '.json</code> and <code>' + escapeHtml(book.slug) +
      '.pdf</code> in that folder. Do not replace any other book folder.</li>' +
      '<li>Commit and push the new file. GitHub Pages will deploy the updated site.</li>' +
      '<li>After deployment, the new book will appear in the library for all visitors.</li></ol></section>';
  }

  function downloadPdf(filename, file) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
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
    const unlocked = isUnlocked(book);
    const readingAction = unlocked && book.pdf
      ? '<div class="detail-actions"><a href="' + hashLink("read/" + encodeURIComponent(book.slug)) +
        '" class="button-primary">Open book ' + icon("arrowRight", 16) +
        '</a><button class="save-button ' + (saved ? "is-saved" : "") + '" type="button" data-action="save-book" data-book="' +
        escapeHtml(book.slug) + '">' + icon("bookmark", 16, saved) + (saved ? "Saved to your shelf" : "Save for later") + "</button></div>"
      : unlocked
        ? '<p class="form-message" role="alert">The original PDF is not available yet. Add the book PDF to catalog/ to enable reading.</p>'
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
      '</p><div class="detail-facts"><span>' + icon("book", 15) + " Original PDF</span><span>" +
      icon("clock", 15) + " " + Number(book.readingMinutes || 1) + ' min read</span><span>By ' +
      escapeHtml(book.author) + "</span></div>" +
      readingAction + '</div></section></main>' + footer() + "</div>";
  }

  function reader(bookSlug) {
    const book = findBook(bookSlug);
    if (!book) return notFound();
    if (!isUnlocked(book)) {
      window.setTimeout(function () { window.location.hash = hashLink("book/" + encodeURIComponent(book.slug)); }, 0);
      return "";
    }
    if (!book.pdf) {
      return '<div class="not-found-page">' + header() + '<main class="not-found-content"><h1 class="serif">PDF not available yet.</h1>' +
        '<p>Add the original PDF to this book’s catalog entry to read it here.</p><a href="' +
        hashLink("book/" + encodeURIComponent(book.slug)) + '" class="button-primary">Back to book details</a></main>' + footer() + '</div>';
    }
    const pdfUrl = "./catalog/" + encodeURIComponent(book.slug) + "/" +
      encodeURIComponent(book.pdf) + "#view=FitH&page=1";
    return '<div class="pdf-reader-shell"><header class="reader-header"><a href="' +
      hashLink("book/" + encodeURIComponent(book.slug)) + '" class="reader-back">' +
      icon("arrowLeft", 16) + "<span>Book details</span></a>" +
      '<div class="reader-book-label">' + icon("book", 15) + "<strong>" + escapeHtml(book.title) + "</strong></div>" +
      '<a class="button-secondary" href="' + pdfUrl + '" target="_blank" rel="noopener">Open PDF separately</a></header>' +
      '<iframe class="pdf-viewer" title="' + escapeHtml(book.title) +
      ' — original PDF" src="' + pdfUrl + '"></iframe></div>';
  }

  function render(options) {
    const current = route();
    if (current !== "/admin") {
      adminCoverImage = "";
      coverImageLoadId++;
      adminPdfFile = null;
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
      else if (parts[0] === "read" && parts[1]) content = reader(parts[1]);
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

  document.addEventListener("click", function (event) {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "download-book" && adminBookExport) {
      downloadJson(adminBookExport.slug + ".json", adminBookExport);
    } else if (action === "download-pdf" && adminBookExport && adminPdfFile) {
      downloadPdf(adminBookExport.slug + ".pdf", adminPdfFile);
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
    }
  });

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
    if (!input.matches('.admin-form input[name="pdf"]')) return;
    const file = input.files && input.files[0];
    adminPdfFile = null;
    adminBookExport = null;
    const output = document.getElementById("admin-output");
    if (output) output.innerHTML = "";
    const status = document.getElementById("import-status");
    if (!file) {
      if (status) status.textContent = "Choose the original PDF to upload.";
      return;
    }
    if (!/\.pdf$/i.test(file.name)) {
      input.value = "";
      if (status) status.textContent = "Choose a PDF file.";
      return;
    }
    if (status) status.textContent = "Checking " + file.name + "…";
    try {
      const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
      if (String.fromCharCode.apply(null, signature) !== "%PDF-") {
        throw new Error("The selected file does not contain a valid PDF header.");
      }
      if (input.files[0] !== file) return;
      adminPdfFile = file;
      if (status) status.textContent = file.name + " is ready. The PDF will be downloaded unchanged.";
    } catch (error) {
      if (input.files[0] !== file) return;
      input.value = "";
      if (status) status.textContent = "The PDF could not be checked: " + error.message;
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
      const fileInput = adminForm.elements.namedItem("pdf");
      const file = fileInput.files && fileInput.files[0];
      const value = function (name) { return String(adminForm.elements.namedItem(name).value || "").trim(); };
      if (!file || file !== adminPdfFile) {
        if (message) message.textContent = "Upload a valid PDF before preparing the book.";
        return;
      }
      const slug = value("slug");
      const title = value("title") || file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      const effectiveSlug = slug || title.toLowerCase().normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(effectiveSlug)) {
        if (message) message.textContent = "Add a title or book ID using lowercase letters and numbers separated by single hyphens.";
        return;
      }
      if (books.some(function (book) { return book.slug === effectiveSlug; }) || removedBookSlugs.includes(effectiveSlug)) {
        if (message) message.textContent = "That book ID is already published or has been removed. Choose a different ID.";
        return;
      }
      const readingMinutes = value("readingMinutes") ? Number(value("readingMinutes")) : 20;
      const inactiveMinutes = value("inactiveMinutes") ? Number(value("inactiveMinutes")) : 30;
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
          slug: effectiveSlug,
        isDemo: false,
          title: title,
        subtitle: value("subtitle"),
          author: value("author") || "Eden Publications",
          category: value("category") || "Uncategorized",
        description: value("description"),
        cover: {
          background: "linear-gradient(150deg, " + value("coverColorStart") + " 0%, " + value("coverColorEnd") + " 100%)",
          ink: value("coverInk"),
          eyebrow: value("coverEyebrow"),
          motif: value("coverMotif") || title,
          image: adminCoverImage
        },
        readingMinutes: readingMinutes,
        inactiveMinutes: inactiveMinutes,
        accessTokens: tokens,
        pdf: effectiveSlug + ".pdf"
      };
      showAdminExport(book);
      if (message) message.textContent = "Ready to download. Add both files to catalog/ and deploy them to publish the book.";
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
