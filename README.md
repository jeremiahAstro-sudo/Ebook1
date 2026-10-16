# Eden Publications

This is a static site deployed to GitHub Pages by GitHub Actions. The build generates a catalog index from the JSON files in `catalog/`; the published site does not need a server or API.

## Add a book

Open **Admin**, unlock the publishing workspace, and import a `.docx` file with each chapter title formatted as **Heading 1**. Fill in the catalog details and either design a text-and-color cover or upload a PNG, JPEG, or WebP cover image (up to 1 MB). The image is embedded in the exported book JSON. Select **Prepare book file**, then download the result.

Each book lives in its own JSON file in `catalog/`, named to match its slug (for example, `the-gentle-table.json`). To publish a book, add the file to `catalog/`, creating the folder first if it is absent, then commit and push. GitHub Actions rebuilds the site and deploys the new catalog. If the last catalog file is deleted, Git removes the now-empty folder; the build treats the missing folder as an empty catalog.

## Remove a book

In Admin, select **Delete book** next to a published title and confirm with the admin password. The book is hidden from the public library on that browser immediately, remains visible in Admin, and can be restored there. This does not change the catalog files or affect other visitors' browsers; it remains possible to open the book by direct link.

This is a static website, so a browser-only removal cannot update what other visitors see. Hiding the book for all visitors would require changing and redeploying the site's catalog.

## Reader

Each imported paragraph is shown as one reading page, sized to fill a screen where the content allows. Use the page controls to move through a chapter. The reader includes Paper, Warm, Night, Light, and Dark themes. Turn on **Highlight** in the top ribbon, then select text to mark it; use **Add a note** at the bottom of a page to keep a device-local note.

Reader progress, highlights, notes, and saved books are stored in that browser and do not sync between devices.

## GitHub Pages setup

In the repository settings, open **Pages** and set the build and deployment source to **GitHub Actions**. The workflow in `.github/workflows/deploy-pages.yml` runs `node scripts/build-site.mjs`, which validates the catalog and produces `_site/`. For a local preview, run `node scripts/build-site.mjs` and serve `_site/` over HTTP.

## Admin and access limitations

The admin password check is implemented in browser JavaScript using a salted password verifier. This can deter casual access, but it is **not secure authentication**: visitors can inspect or modify client-side code, and a verifier can be attacked offline. The published books and access tokens are also publicly downloadable, and browser-based book-access checks can be bypassed. Do not use this site to protect confidential content or sensitive credentials.

Word files are parsed in the browser using Mammoth.js from jsDelivr, so importing a `.docx` requires an internet connection.
