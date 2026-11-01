# AXIOM project and AI analyst FAQ

This guide explains how the app works, what data it retains, how the Groq connection is configured, what the AI can answer, and how the project could be improved.

## Project overview

### What is AXIOM?

AXIOM is a browser-based data exploration app. The main interface is `index.html`; `axiom-v2-crazy.html` is an alternate page that currently contains the same app. The browser handles data loading, table display, charts, statistics, cleaning tools, and SQL. A small Node.js server serves the pages and proxies AI questions to Groq.

### What are the main project files?

| File | Purpose |
| --- | --- |
| `index.html` | Main app UI and browser-side data, SQL, and AI request logic. |
| `axiom-v2-crazy.html` | Alternate copy of the app page. |
| `server.mjs` | Node.js HTTP server and server-side Groq API proxy. |
| `server.test.mjs` | Automated tests for the server and AI endpoint. |
| `package.json` | `npm start` and `npm test` commands; no third-party Node packages are required. |
| `.env` | Local API key and optional model setting. It is ignored by Git and must stay private. |
| `.env.example` | Safe template showing the expected environment variable names. |
| `grok_api.py` | Separate Python example; the normal app flow uses `server.mjs`, not this script. |

### How do I start and stop the app?

From the project directory:

```sh
npm start
```

Open `http://localhost:3000`. If the terminal already has a server running, press **Ctrl+C** in that terminal to stop it. A successful page response (`HTTP 200`) means the web server is running; it does not, by itself, prove that Groq analysis is configured.

To check the server from another terminal:

```sh
curl -i http://localhost:3000/
```

To run the automated tests:

```sh
npm test
```

## Data loading, SQL, and temporary storage

### What data sources does the app accept?

The browser app supports CSV and TSV files, JSON files or pasted JSON, JSON REST endpoints, and built-in Sales and Workforce demo datasets. The built-in datasets are randomly generated in the browser; they are not downloaded from Groq and are not real business records.

### Where is uploaded data stored?

The current dataset is held in browser JavaScript memory. AXIOM also builds an in-memory SQLite database using `sql.js` (SQLite compiled to WebAssembly). There is no app database server or permanent save feature. Closing or refreshing the page loses the in-memory dataset unless you load it again.

When you ask the AI analyst a question, the selected dataset context and question are sent from the browser to the local Node server, then to Groq. Avoid sending confidential or personal data unless that transfer is allowed by your data-handling rules.

### How does SQL work?

SQL runs locally in the browser against an in-memory table named `data`. The table is built from the loaded dataset, with columns created from the first record and stored as `TEXT`. Numeric aggregate queries often work, but explicit casts may be needed for unusual values.

SQL results are displayed as the current view. The SQL database remains based on the original loaded dataset while a query result is displayed; loading another dataset rebuilds it. SQL data is not saved when the page closes.

### What is the maximum data size?

There is no benchmarked maximum row count or file-size limit established by this project. The practical browser limit depends on available memory, row and column counts, cell sizes, and device performance. AXIOM keeps both JavaScript records and a SQL.js database copy in memory, so very large files can slow down or exhaust browser memory.

The current code has these specific limits:

| Area | Current behavior or limit |
| --- | --- |
| AI full-data context | Includes the complete dataset if `JSON.stringify(raw)` is at most 30,000 characters. |
| AI context for larger datasets | Includes calculated summaries and the first five rows, not every record. |
| Server request context | At most 200,000 characters. |
| HTTP request body | At most 256 KiB. |
| Question | 1–4,000 characters. |
| AI response | Requests at most 1,000 completion tokens; Groq/model limits may also apply. |
| Table rendering | At most 500 rows displayed at a time. This is a display limit, not a row-upload limit. |
| Scatter plot | Samples at most 500 rows. |

These are not a promise that every dataset under a particular row count will work. Character counts are not the same as model tokens; long text fields can use many tokens.

## AI analyst and Groq

### Which AI API does this project use?

The browser sends a same-origin `POST /api/analyze` request to `server.mjs`. The server sends a chat-completions request to Groq at `https://api.groq.com/openai/v1/chat/completions`. The API key is attached by the server, not sent to or embedded in the HTML. The current default model is `qwen/qwen3.8-27b`; `GROQ_MODEL` can override it.

### How do I configure the API key?

Create a key in the [Groq Console](https://console.groq.com/keys), then put it in the ignored local `.env` file:

```dotenv
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=qwen/qwen3.8-27b
```

Do not paste the real key into chat, HTML, source control, or screenshots. If it has been exposed, revoke it and create a replacement. `.env` is plain text on your machine, so protect access to the computer and workspace.

### Why can a valid `.env` key still get a 401?

The server process may have inherited a different `GROQ_API_KEY` from its terminal or environment. Inherited environment variables take precedence over values loaded from `.env`. Also, a running Node process does not reload `.env` after the file changes.

Stop the server with **Ctrl+C**, then in the same terminal run:

```sh
unset GROQ_API_KEY XAI_API_KEY
npm start
```

The app also temporarily accepts an old `XAI_API_KEY` environment variable if its value has the Groq `gsk_` prefix. Prefer migrating to `GROQ_API_KEY` and removing the old variable.

### Why can the page load while AI does not work?

The page and `/api/analyze` are served by the local Node server; the Groq connection is a separate outbound request. The page can return HTTP 200 while an AI request fails because the key, selected model, account access, network, rate limit, or quota is different. The AI panel should display a connection error with the server's reported cause.

### How much can the AI answer?

There is no fixed “number of questions” guarantee in the code. Each question makes a separate request to Groq, and availability/usage depends on Groq account limits and the selected model. AXIOM sets a 1,000-token completion limit for each reply, but model or provider limits can further affect it.

The AI answers based on the context sent with that individual question. For datasets with at most 30,000 characters of compact JSON, that context includes all rows. For larger datasets, it includes summaries plus only five sample rows. Therefore:

- It can explain trends and summarize the data it receives.
- It can answer exact questions about rows only when those rows are included in the context.
- It may miss patterns or records in large datasets that are not in the summaries or sample.
- It can make mistakes; verify important conclusions with SQL or another trusted calculation.
- It does not get the full dataset just because it is visible in the app.
- The current browser request sends the current question and dataset context, not a transcript of earlier questions.
- It is not guaranteed to answer arbitrary questions about private data or current events; no web-search integration is configured here.

### How do I ask better questions?

Load the relevant dataset first, name the field or group of interest, and ask a specific question. Examples:

- “Using the `revenue` column, which category has the highest total? Show the amount.”
- “Compare average salary by department. Mention if the context is incomplete.”
- “Summarize the main patterns and distinguish facts from suggestions.”

For exact calculations over larger data, run SQL first and ask the analyst to explain the smaller query result. For example:

```sql
SELECT category, SUM(CAST(revenue AS REAL)) AS total_revenue
FROM data
GROUP BY category
ORDER BY total_revenue DESC;
```

## Known limitations and possible improvements

### What would make answers more accurate?

1. **Run calculations locally first.** Add query tools or deterministic aggregate functions so questions such as totals, rankings, and averages are computed from every row rather than inferred from a sample.
2. **Choose context based on the question.** Include relevant columns, grouped results, filtered rows, and time windows instead of always sending general summaries and the first five rows.
3. **Make context coverage visible.** Show whether the AI received all rows or a summary/sample, and warn when the question asks about data not included.
4. **Improve summary statistics.** Include missing-value counts, medians, quantiles, date ranges, and category counts for useful columns. Clearly mark truncation.
5. **Add model and quota diagnostics.** A server health/status endpoint could report whether a key is configured and which model is selected without ever returning the key. It could also distinguish authentication, model access, rate limits, and network failures.
6. **Reduce data-transfer costs.** Let users choose the columns and rows to include; avoid resending large repeated context; keep output limits appropriate for the task.

### What is needed before putting AXIOM online for multiple users?

The current server is intended for local use and binds to `127.0.0.1`. Before exposing it publicly, add user authentication, request and usage quotas, HTTPS, abuse protection, secure deployment secrets, and a clear data-retention/privacy policy. Do not rely on a local `.env` file as a hosted secrets-management strategy.

## Questions from the project setup and troubleshooting

### Are sample datasets loaded from the AI?

No. The Sales and Workforce samples are generated locally in the browser. The AI receives data only when you submit a question.

### Does this project connect to a remote SQL database?

No. SQL is an in-browser SQLite database powered by sql.js. It is temporary and is not a server database.

### Does the AI automatically inspect every uploaded row?

Only when the compact dataset JSON is at most 30,000 characters. Above that threshold, the AI gets summaries and five example rows. Use SQL for exact large-dataset calculations.

### How do I confirm the API works?

Start AXIOM, open the app on the same host and port, load a dataset, and ask a short question about it. A successful AI answer means the browser reached the local server and the server completed a Groq request. Do not test by pasting a key into a browser console or chat.

### Can AXIOM run using only a static file server?

The tables and other browser features may load from a static server, but AI will not work because the `/api/analyze` endpoint is provided by `server.mjs`. Start the project with `npm start`.
