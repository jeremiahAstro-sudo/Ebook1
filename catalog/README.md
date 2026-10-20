# Published book catalog

Add each published book as two files directly in this folder: `<slug>.json` and `<slug>.pdf` (for example, `my-book.json` and `my-book.pdf`). The JSON should use `"slug": "my-book"` and `"pdf": "my-book.pdf"`.

The static-site build discovers metadata files, checks that PDF filenames match their IDs, and copies both files into the deployed site. This README keeps the catalog folder present when there are no books.
