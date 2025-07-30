-- Source Health Check Queries for Wordmap Zeitgeist
-- Purpose: Identify RSS feed sources that are not working properly
-- Run these queries in Supabase SQL editor to diagnose scraping issues

-- ============================================================
-- Query 1: Check all expected sources and their current status
-- ============================================================
WITH expected_sources AS (
  -- These are the sources defined in your scraper.ts
  SELECT unnest(ARRAY[
    'O''Reilly Radar',
    'TechCrunch',
    'Wired',
    'CNN',
    'BBC News',
    'Hacker News',
    'CNN Top Stories',
    'CNN World',
    'The Guardian UK',
    'The Guardian World',
    'The Guardian US',
    'NPR Main News',
    'Reddit r/all',
    'Reddit r/popular',
    'Reddit r/worldnews',
    'Reddit Tech Combined'
  ]) as source
),
source_activity AS (
  SELECT
    source,
    COUNT(DISTINCT word_id) as unique_words,
    SUM(count) as total_word_count,
    MAX(last_seen) as last_updated,
    EXTRACT(EPOCH FROM (NOW() - MAX(last_seen)))/3600 as hours_since_update
  FROM word_sources
  GROUP BY source
)
SELECT
  e.source,
  COALESCE(s.unique_words, 0) as unique_words,
  COALESCE(s.total_word_count, 0) as total_words,
  COALESCE(s.last_updated::text, 'Never') as last_updated,
  CASE
    WHEN s.source IS NULL THEN '🔴 Not working - No data'
    WHEN s.hours_since_update > 24 THEN '🟡 Stale - No updates in ' || ROUND(s.hours_since_update::numeric, 1) || ' hours'
    WHEN s.total_word_count < 100 THEN '🟠 Low activity'
    ELSE '🟢 Working'
  END as status
FROM expected_sources e
LEFT JOIN source_activity s ON e.source = s.source
ORDER BY
  CASE
    WHEN s.source IS NULL THEN 0
    WHEN s.hours_since_update > 24 THEN 1
    ELSE 2
  END,
  COALESCE(s.total_word_count, 0) ASC;

-- ============================================================
-- Query 2: Check if missing sources have unprocessed posts
-- ============================================================
SELECT
  p.source,
  COUNT(*) as post_count,
  COUNT(CASE WHEN p.processed = true THEN 1 END) as processed_posts,
  COUNT(CASE WHEN p.processed = false OR p.processed IS NULL THEN 1 END) as unprocessed_posts,
  MAX(p.scraped_at) as last_scraped,
  CASE
    WHEN ws.source IS NULL THEN 'No words extracted'
    ELSE 'Has words'
  END as word_status
FROM posts p
LEFT JOIN (
  SELECT DISTINCT source FROM word_sources
) ws ON p.source = ws.source
WHERE p.scraped_at > NOW() - INTERVAL '48 hours'
GROUP BY p.source, ws.source
HAVING ws.source IS NULL OR COUNT(CASE WHEN p.processed = false OR p.processed IS NULL THEN 1 END) > 0
ORDER BY word_status, unprocessed_posts DESC;

-- ============================================================
-- Query 3: Current source activity summary (working baseline)
-- ============================================================
SELECT
  source,
  COUNT(DISTINCT word_id) as unique_words,
  SUM(count) as total_word_count,
  MAX(last_seen) as last_updated
FROM word_sources
GROUP BY source
ORDER BY total_word_count DESC;

-- ============================================================
-- Query 4: Recent post activity by source
-- ============================================================
SELECT
  source,
  COUNT(*) as posts_last_24h,
  COUNT(CASE WHEN processed = true THEN 1 END) as processed,
  COUNT(CASE WHEN processed = false OR processed IS NULL THEN 1 END) as unprocessed,
  MIN(scraped_at) as oldest_post,
  MAX(scraped_at) as newest_post
FROM posts
WHERE scraped_at > NOW() - INTERVAL '24 hours'
GROUP BY source
ORDER BY posts_last_24h DESC;

-- ============================================================
-- Query 5: Sources with processing errors (if any)
-- ============================================================
SELECT
  p.source,
  COUNT(*) as error_count,
  MAX(p.scraped_at) as last_error_time,
  (
    SELECT ARRAY_AGG(DISTINCT sample_title)
    FROM (
      SELECT DISTINCT LEFT(title, 50) AS sample_title, scraped_at
      FROM posts
      WHERE processed = false
        AND source = p.source
        AND scraped_at > NOW() - INTERVAL '24 hours'
      ORDER BY scraped_at DESC
      LIMIT 3
    ) AS sample_titles_subquery
  ) as sample_titles
FROM posts p
WHERE p.processed = false
  AND p.scraped_at > NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM word_sources ws
    WHERE ws.source = p.source
    AND ws.last_seen > p.scraped_at
  )
GROUP BY p.source
ORDER BY error_count DESC;
