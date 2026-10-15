import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDirectory = path.join(repositoryRoot, "catalog");
const outputDirectory = path.join(repositoryRoot, "_site");
const siteFiles = ["index.html", "app.js", "styles.css", "favicon.svg"];

if (!fs.existsSync(catalogDirectory) || !fs.statSync(catalogDirectory).isDirectory()) {
  throw new Error("The catalog/ directory does not exist.");
}

const bookFiles = fs.readdirSync(catalogDirectory)
  .filter(function (filename) { return filename.endsWith(".json"); })
  .sort();

const seenSlugs = new Set();
bookFiles.forEach(function (filename) {
  const slug = filename.slice(0, -".json".length);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Invalid book filename in catalog/: " + filename);
  }
  const book = JSON.parse(fs.readFileSync(path.join(catalogDirectory, filename), "utf8"));
  if (!book || typeof book !== "object" || Array.isArray(book) ||
    book.slug !== slug || !Array.isArray(book.chapters)) {
    throw new Error(filename + " must contain a book with a matching slug and chapters array.");
  }
  if (seenSlugs.has(slug)) throw new Error("Duplicate book slug: " + slug);
  seenSlugs.add(slug);
});

fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.mkdirSync(outputDirectory, { recursive: true });
siteFiles.forEach(function (filename) {
  fs.copyFileSync(path.join(repositoryRoot, filename), path.join(outputDirectory, filename));
});
const outputCatalogDirectory = path.join(outputDirectory, "catalog");
fs.mkdirSync(outputCatalogDirectory, { recursive: true });
bookFiles.forEach(function (filename) {
  fs.copyFileSync(path.join(catalogDirectory, filename), path.join(outputCatalogDirectory, filename));
});
fs.writeFileSync(
  path.join(outputDirectory, "catalog-index.json"),
  JSON.stringify({ books: bookFiles }, null, 2) + "\n"
);

console.log("Built static site with " + bookFiles.length + " book(s) in _site/.");
