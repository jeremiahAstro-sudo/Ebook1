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
    return String(value == null ? "" : value).replace(/[&<>\