# AXIOM

AXIOM is a browser-based data exploration app contained in `index.html`. The alternate `axiom-v2-crazy.html` currently has the same contents.

For a detailed walkthrough of the architecture, data handling, AI API, limits, troubleshooting, and improvement ideas, see the [AI analyst FAQ](./AI_ANALYST_FAQ.md).

## What it does

- Loads CSV, TSV, or JSON files; pasted JSON; REST endpoints; and built-in sample data.
- Shows a searchable, sortable table, charts, summary statistics, data-quality tools, filters, grouping, and cleaning operations.
- Runs SQL queries in the browser with `sql.js` (SQLite compiled to WebAssembly).
- Includes an optional AI analyst panel. Use its **−** button to collapse it to a narrow **AI ANALYST ›** rail and click the rail to reopen it.

## Built-in sample datasets

The welcome message in the analyst panel has **Sales dataset** and **Workforce dataset** buttons. These buttons call `loadSample(...)` in the page: the app generates randomized demo rows locally (300 sales rows or 180 workforce rows), then passes them through the same ingest and SQL initialization as uploaded data. They are not downloaded from an AI service, and they are not real business data. The workforce dataset contains employee, salary, and departmental spending fields.

## How data and SQL work

Loaded records are held in JavaScript memory as the current dataset. The app builds an in-memory SQLite database named `data` from those records. It creates columns based on the first row and stores their values as `TEXT`; SQLite can still perform common numeric aggregates, but explicit numeric casts may be useful for unusual input. SQL runs locally in the browser; it does not connect to a separate database server or save data after the page is closed.

Running a SQL query sends its result back through the app's table, charts, and statistics as the current view. The SQL database remains based on the originally loaded dataset until another dataset is loaded.

## Capacity and limitations

There is **no configured or verified maximum row count**. The app reads and processes data in the browser, and also holds a SQL database copy in WebAssembly memory. The practical limit depends on the device, browser, number of columns, and the length of cell values; large inputs may make the page slow or run out of memory. Parsing, type detection, statistics, and transforms can scan the full dataset.

The table renders at most 500 rows at once, and the scatter plot samples at most 500 rows. Those are display/visualization limits, not limits on rows accepted by upload. For AI questions, AXIOM sends the complete dataset when its compact JSON representation is at most 30,000 characters. Larger datasets send computed summaries plus the first five rows, so answers about data outside those summaries and sample rows may be incomplete. In either case, the context is sent to Groq for analysis; do not use sensitive data unless that sharing is permitted by your data-handling requirements.

To establish a real capacity target, test progressively larger representative files on the least powerful device you plan to support, while measuring load time and responsiveness. There is no benchmark in this repository that justifies a hard row limit.

## Connecting the AI analyst

The browser sends the analyst question and generated dataset context to the same-origin `/api/analyze` endpoint. `server.mjs` keeps the Groq API key on the server and calls Groq's OpenAI-compatible chat completions API. The key is never embedded in either HTML file.

1. Create an API key in the [Groq Console](https://console.groq.com/keys) and confirm your account has access to the selected model.
2. Open the ignored `.env` file in the project folder and set:

   ```sh
   GROQ_API_KEY=your_groq_api_key
   GROQ_MODEL=qwen/qwen3.8-27b
   ```

   Keep `.env` private: it is excluded by `.gitignore`. Do not paste the key into chat or commit it. The `.env` file is stored as plain text on your machine, so protect access to your account and workspace. `.env.example` shows the expected variable names. Existing `XAI_API_KEY` values beginning with `gsk_` are temporarily supported for migration, but rename the variable to `GROQ_API_KEY`.
3. Start AXIOM with `npm start`, then open `http://localhost:3000`. If port 3000 is already in use, start with `PORT=3001 npm start` and open `http://localhost:3001`.
4. Load a dataset and ask a question in the AI analyst panel. Without a configured key, the app still loads, but the analyst displays a setup error.

If AXIOM still gets 401 after changing `.env`, a shell or VS Code terminal may have an older `GROQ_API_KEY` exported; Node uses inherited environment variables before values from `.env`. Stop the server, run `unset GROQ_API_KEY XAI_API_KEY`, then run `npm start` in that same terminal.

Do not put the key in HTML or send it from the browser. The server binds to `127.0.0.1` by default. Before exposing this service to other users or the public internet, add authentication and production-grade rate limiting, use HTTPS, and configure the hosting platform's secret manager. Larger datasets are summarized rather than fully sent, so answers about individual rows or patterns absent from the summary may be incomplete.

Run the automated server/API tests with `npm test`. No third-party Node packages are required.

## Running locally

There is no bundler or compile step. Use Node.js 22.9 or newer and `npm start`; the start script reads the ignored `.env` file and serves the same-origin AI API endpoint. Serving the HTML with a static-only server such as `python3 -m http.server` will not enable AI. The app loads PapaParse, Chart.js, sql.js, and fonts from CDNs, so those features require network access.
