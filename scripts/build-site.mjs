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
const rootBookFiles = catalogEntries.filter(function (entry) {
  return entry.isFile() && entry.name.endsWith(".json");
});
if (rootBookFiles.length) {
  throw new Error("Move catalog JSON files into per-book folders named after their slug.");
}

const bookSlugs = catalogEntries
  .filter(function (entry) { return entry.isDirectory(); })
  .map(function (entry) { return entry.name; })
  .sort();

const bookFiles = bookSlugs.map(function (slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid book folder in catalog/: " + slug);
  }
  const filename = slug + ".json";
  const directory = path.join(catalogDirectory, slug);
  const filepath = path.join(directory, filename);
  if (!fs.existsSync(filepath) || !fs.statSync(filepath).isFile()) {
    throw new Error("catalog/" + slug + "/ must contain " + filename + ".");
  }
  const unexpectedFiles = fs.readdirSync(directory).filter(function (name) {
    return name !== filename && name !== slug + ".pdf";
  });
  if (unexpectedFiles.length) {
    throw new Error("catalog/" + slug + "/ may contain only " + filename + " and " + slug + ".pdf.");
  }
  return { slug: slug, filename: filename, directory: directory, filepath: filepath };
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
  const expectedPdfPath = path.join(entry.directory, slug + ".pdf");
  if (book.pdf === undefined && fs.existsSync(expectedPdfPath)) {
    throw new Error(filename + " must reference " + slug + ".pdf in its pdf field.");
  }
  if (book.pdf !== undefined) {
    if (book.pdf !== slug + ".pdf") {
      throw new Error(filename + " must reference " + slug + ".pdf in its pdf field.");
    }
    const pdfPath = path.join(entry.directory, book.pdf);
    if (!fs.existsSync(pdfPath) || !fs.statSync(pdfPath).isFile()) {
      throw new Error(filename + " references a missing catalog/" + slug + "/" + book.pdf + ".");
    }
    const signature = Buffer.alloc(5);
    const pdf = fs.openSync(pdfPath, "r");
    try {
      if (fs.readSync(pdf, signature, 0, signature.length, 0) !== signature.length ||
        signature.toString("ascii") !== "%PDF-") {
        throw new Error("catalog/" + slug + "/" + book.pdf + " does not have a valid PDF header.");
      }
    } finally {
      fs.closeSync(pdf);
    }
    pdfFiles.push({ slug: slug, filename: book.pdf, path: pdfPath });
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
  const outputBookDirectory = path.join(outputCatalogDirectory, book.slug);
  fs.mkdirSync(outputBookDirectory, { recursive: true });
  fs.copyFileSync(book.filepath, path.join(outputBookDirectory, book.filename));
});
pdfFiles.forEach(function (book) {
  fs.copyFileSync(book.path, path.join(outputCatalogDirectory, book.slug, book.filename));
});
fs.writeFileSync(
  path.join(outputDirectory, "catalog-index.json"),
  JSON.stringify({ books: bookSlugs }, null, 2) + "\n"
);

console.log("Built static site with " + bookSlugs.length + " book(s) in _site/.");
