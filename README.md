# Garden Reading Room

This is a static site. GitHub Actions builds and deploys it to GitHub Pages whenever `main` changes. The build creates a small static index of the book files in `catalog/`; the published site does not need a server or API.

## Add a book

Use the **Admin** link in the site navigation. Import a `.docx` file with each chapter title formatted as **Heading 1**, fill in its catalog details and settings, then select **Prepare book file**. The imported chapter text is embedded in the generated JSON; the original Word file is not needed by the published reader.

Each book lives in its own JSON file in [`catalog/`](./catalog/), named to match its slug (for example, `the-gentle-table.json`). To publish a book, download the file from Admin, upload that new file into the repository's `catalog/` folder, and commit it. Do not replace or edit the other book files. The GitHub Actions workflow automatically rebuilds the static book index and deploys the updated site to GitHub Pages.

## GitHub Pages setup

In the repository settings, open **Pages** and set the build and deployment source to **GitHub Actions**. Push this workflow to the `main` branch. From then on, adding and committing one JSON file under `catalog/` triggers its build and deployment. The generated index is part of the deployed static site and is not a file you need to edit or upload. No public API, token, or server is needed.

For a local preview, run `node scripts/build-site.mjs` and serve the generated `_site/` folder over HTTP. Older `books.json` files and per-book files under `books/` are not used by the current site.

The reader enters a nickname and token. The nickname is remembered only in that browser, and access expires after the book's configured `inactiveMinutes` without activity. Existing sessions and reading notes are stored on the device and do not sync between devices.

Word files are parsed in the browser using Mammoth.js. The parser is loaded from jsDelivr, so opening a `.docx` requires an internet connection.

## Admin workspace

The admin workspace runs entirely in the browser and downloads a new book JSON file; it does not directly write to your repository or deploy the site. Adding and committing that one file is the publishing step. The admin page is not password protected, and all published book content and access tokens can be inspected by visitors; this workflow does not make private distribution possible.

## Access limits

This is still a static website. Book files and token strings are publicly downloadable by anyone who can inspect the site, and browser-local access checks can be bypassed. Tokens provide convenience-level access, not private or secure distribution. Use a server-side service if the book files must be protected.
