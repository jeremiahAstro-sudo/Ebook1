# Published book catalog

Add each published book in its own subfolder named for its `slug` (for example, `my-book/`). Put `my-book.json` and `my-book.pdf` in that folder; the JSON file should use `"slug": "my-book"` and `"pdf": "my-book.pdf"`.

The static-site build discovers and validates each book folder. This README keeps the catalog folder present when there are no books.
