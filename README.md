# AXIOM

AXIOM is a browser-based data exploration app contained in `index.html`. The alternate `axiom-v2-crazy.html` currently has the same contents.

## What it does

- Loads CSV, TSV, or JSON files; pasted JSON; REST endpoints; and built-in sample data.
- Shows a searchable, sortable table, charts, summary statistics, data-quality tools, filters, grouping, and cleaning operations.
- Runs SQL queries in the browser with `sql.js` (SQLite compiled to WebAssembly).
- Includes an optional AI analyst panel. Use its **−** button to collapse it to a narrow rail and **AI ›** to reopen it.

## How data and SQL work

Loaded records are held in JavaScript memory as the current dataset. The app builds an in-memory SQLite database named `data` from those records. It creates columns based on the first row and stores their values as `TEXT`; SQLite can still perform common numeric aggregates, but explicit numeric casts may be useful for unusual input. SQL runs locally in the browser; it does not connect to a separate database server or save data after the page is closed.

Running a SQL query sends its result back through the app's table, charts, and statistics as the current view. The SQL database remains based on the originally loaded dataset until another dataset is loaded.

## Capacity and limitations

There is **no configured or verified maximum row count**. The app reads and processes data in the browser, and also holds a SQL database copy in WebAssembly memory. The practical limit depends on the device, browser, number of columns, and the length of cell values; large inputs may make the page slow or run out of memory. Parsing, type detection, statistics, and transforms can scan the full dataset.

The table renders at most 500 rows at once, and the scatter plot samples at most 500 rows. Those are display/visualization limits, not limits on rows accepted by upload. The AI analyst receives computed summaries plus up to five sample rows, not the complete dataset. Its current request uses a direct Anthropic API call without API-key authentication, so AI connectivity needs a secure server-side API proxy before it can work safely; do not add a secret key to the HTML.

To establish a real capacity target, test progressively larger representative files on the least powerful device you plan to support, while measuring load time and responsiveness. There is no benchmark in this repository that justifies a hard row limit.

## Running locally

There is no `package.json`, bundler, or compile/build step. Serve the repository as static files (for example, `python3 -m http.server 8000`) and open `http://localhost:8000`. The app loads PapaParse, Chart.js, sql.js, and fonts from CDNs, so those features require network access. No external build command is needed.
