# axiom
My Data bot :
Data Ingestion

Upload CSV, TSV, JSON files via drag & drop or file picker
Paste raw JSON directly into the text area
Fetch from any REST API or JSON endpoint
Run SQL queries against loaded data using the in-browser sql.js engine
Load built-in sample sales and finance datasets to start instantly

Data Viewing (Table Tab)

Browse all rows with sortable columns (click any header)
Search across all columns or scope search to a specific column
See numeric values right-aligned and color-coded in cyan
Null values displayed clearly as —
Export filtered results to CSV at any time
Copy up to 100 rows as formatted JSON

Visualizations (Charts Tab)

Category distribution bar chart — auto-generated from first categorical column
Value distribution histogram — auto-generated from first numeric column
Doughnut/share chart — shows proportional breakdown of categories
Scatter plot — auto-plots first two numeric columns against each other
Time series line chart — detects date columns and plots trends over time
KPI insight strip — shows total/average for top 4 numeric columns at a glance
All charts use animated entry and hover tooltips

Statistics (Statistics Tab)

For every numeric column: count, mean, median, std deviation, min, Q1, Q3, max, IQR, outlier count, null count, sum
For every categorical column: count, unique values, mode, mode frequency, null count, % completeness
Correlation matrix — color-coded Pearson r values for all numeric column pairs, showing which metrics move together

Data Cleaning & Transform (Transform Tab)

Data quality report — visual completion bars per column showing null percentages in red/yellow/green
Row filtering — filter by equals, not equals, greater than, less than, contains, or not null
Group by & aggregate — group any column and compute SUM, AVG, COUNT, MAX, or MIN on any numeric column
Outlier detection — IQR-based detection with configurable multiplier (1.5×, 2×, 3×)
Duplicate detection — finds exact duplicate rows across the whole dataset
Cleaning operations — trim whitespace, lowercase, uppercase, fill nulls with mean/mode/zero, drop null rows, convert to number
Undo history — every cleaning operation is reversible with one click

AI Natural Language Analyst

Ask any question in plain English — "Which product category drives the most margin?"
Quick action buttons: executive summary, top performers, anomaly detection, forecasting, business recommendations, data quality assessment
Click any column in the sch
