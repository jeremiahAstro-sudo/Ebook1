import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDirectory = path.join(repositoryRoot, "catalog");
const outputDirectory = path.join(repositoryRoot, "_site");
const siteFiles = ["index.html", "app.js", "styles.css", "favicon.svg"];

const catalogExists = fs.existsSync(catalogDirectory);
if (catalogExists && !fs.statSync(catalogDirectory).isDirectory()) {
  throw new Error("catalog/ exists but is not a directory.");
}

const catalogEntries = catalogExists ? fs.readdirSync(catalogDirectory, { withFileTypes: true }) : [];
const catalogDirectories = catalogEntries.filter(function (entry) { return entry.isDirectory(); });
if (catalogDirectories.length) {
  throw new Error("Book files must be placed directly in catalog/ using matching .json and .pdf filenames.");
}
const rootBookFiles = catalogEntries.filter(function (entry) {
  return entry.isFile() && entry.name.endsWith(".json");
});
const bookSlugs = rootBookFiles.map(function (entry) {
  return entry.name.slice(0, -".json".length);
}).sort();
const pdfNames = new Set(catalogEntries.filter(function (entry) {
  return entry.isFile() && entry.name.endsWith(".pdf");
}).map(function (entry) { return entry.name; }));

const bookFiles = bookSlugs.map(function (slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid book filename in catalog/: " + slug + ".json");
  }
  const filename = slug + ".json";
  const filepath = path.join(catalogDirectory, filename);
  return { slug: slug, filename: filename, filepath: filepath };
});

const seenSlugs = new Set();
const pdfFiles = [];
bookFiles.forEach(function (entry) {
  const slug = entry.slug;
  const filename = entry.filename;
  const book = JSON.parse(fs.readFileSync(entry.filepath, "utf8"));
  if (!book || typeof book !== "object" || Array.isArray(book) || book.slug !== slug) {
    throw new Error("catalog/" + slug + "/" + filename + " must contain a book with a matching slug.");
  }
  if (seenSlugs.has(slug)) throw new Error("Duplicate book slug: " + slug);
  seenSlugs.add(slug);
  const expectedPdfPath = path.join(catalogDirectory, slug + ".pdf");
  if (book.pdf === undefined && pdfNames.has(slug + ".pdf")) {
    throw new Error(filename + " must reference " + slug + ".pdf in its pdf field.");
  }
  if (book.pdf !== undefined) {
    if (book.pdf !== slug + ".pdf") {
      throw new Error(filename + " must reference " + slug + ".pdf in its pdf field.");
    }
    const pdfPath = path.join(catalogDirectory, book.pdf);
    if (!fs.existsSync(pdfPath) || !fs.statSync(pdfPath).isFile()) {
      throw new Error(filename + " references a missing catalog/" + book.pdf + ".");
    }
    const signature = Buffer.alloc(5);
    const pdf = fs.openSync(pdfPath, "r");
    try {
      if (fs.readSync(pdf, signature, 0, signature.length, 0) !== signature.length ||
        signature.toString("ascii") !== "%PDF-") {
        throw new Error("catalog/" + book.pdf + " does not have a valid PDF header.");
      }
    } finally {
      fs.closeSync(pdf);
    }
    pdfFiles.push({ filename: book.pdf, path: pdfPath });
  }
});

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });
siteFiles.forEach(function (filename) {
  fs.copyFileSync(path.join(repositoryRoot, filename), path.join(outputDirectory, filename));
});
const outputCatalogDirectory = path.join(outputDirectory, "catalog");
fs.mkdirSync(outputCatalogDirectory, { recursive: true });
bookFiles.forEach(function (book) {
  fs.copyFileSync(book.filepath, path.join(outputCatalogDirectory, book.filename));
});
pdfFiles.forEach(function (book) {
  fs.copyFileSync(book.path, path.join(outputCatalogDirectory, book.filename));
});
fs.writeFileSync(
  path.join(outputDirectory, "catalog-index.json"),
  JSON.stringify({ books: bookSlugs }, null, 2) + "\n"
);

console.log("Built static site with " + bookSlugs.length + " book(s) in _site/.");
