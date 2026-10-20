# Eden Publications

This is a static site deployed to GitHub Pages by GitHub Actions. The build generates a catalog index from the JSON files in `catalog/`; the published site does not need a server or API.

## Add a book

Open **Admin**, unlock the publishing workspace, and upload the original `.pdf` file. The PDF is not converted or edited; the reader embeds the source file so its pages, images, fonts, colors, and layout remain intact. Fill in the catalog details and either design a text-and-color cover or upload a PNG, JPEG, or WebP cover image (up to 1 MB). Select **Prepare book file**, then download both the JSON metadata and the PDF.

Each book has its own folder under `catalog/`, named to match its slug (for example, `catalog/the-gentle-table/`). Put the matching JSON metadata and PDF files in that folder (`the-gentle-table.json` and `the-gentle-table.pdf`), then commit and push. GitHub Actions rebuilds the site and deploys the new catalog. If there are no book folders, the build treats the catalog as empty.

## Remove a book

In Admin, select **Delete book** next to a published title and confirm with the admin password. The book is hidden from the public library on that browser immediately, remains visible in Admin, and can be restored there. This does not change the catalog files or affect other visitors' browsers; it remains possible to open the book by direct link.

This is a static website, so a browser-only removal cannot update what other visitors see. Hiding the book for all visitors would require changing and redeploying the site's catalog.

## Reader

The catalog opens directly to the book details; the generated chapter list has been removed. **Open book** displays the original PDF in the browser’s built-in PDF viewer, which provides page navigation without changing the document.

Saved books are stored in that browser and do not sync between devices.

## GitHub Pages setup

In the repository settings, open **Pages** and set the build and deployment source to **GitHub Actions**. The workflow in `.github/workflows/deploy-pages.yml` runs `node scripts/build-site.mjs`, which validates the catalog and produces `_site/`. For a local preview, run `node scripts/build-site.mjs` and serve `_site/` over HTTP.

## Admin and access limitations

The admin password check is implemented in browser JavaScript using a salted password verifier. This can deter casual access, but it is **not secure authentication**: visitors can inspect or modify client-side code, and a verifier can be attacked offline. The published books and access tokens are also publicly downloadable, and browser-based book-access checks can be bypassed. Do not use this site to protect confidential content or sensitive credentials.

The PDF is stored as a separate file from its JSON metadata so larger books do not need to be embedded in the catalog data.
