# Diagnostics

This folder contains diagnostic queries and tools for monitoring the health of the Wordmap Zeitgeist system.

## Structure

- `queries/` - SQL queries for database diagnostics
  - `source-health-checks.sql` - Queries to identify RSS feed sources that aren't working
- `results/` - Store query results and investigation findings here

## Usage

1. Run the queries in `queries/source-health-checks.sql` in your Supabase SQL editor
2. Save the results in the `results/` folder with timestamps
3. Use the results to identify which sources need investigation

## Common Issues

### Sources Not Working (🔴)
- RSS feed URL may have changed
- Feed format may have changed
- Authentication/rate limiting issues

### Stale Sources (🟡)
- Scheduled scraping may have stopped
- Feed may be updating less frequently
- Processing pipeline may be stuck

### Low Activity Sources (🟠)
- Feed may have fewer posts
- Word filtering may be too aggressive
- Source may be less active