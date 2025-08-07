-- Remove Reddit API call from the scraper function since Reddit credentials are not configured
CREATE OR REPLACE FUNCTION call_scraper_api()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  request_id bigint;
  scrape_secret text;
BEGIN
  -- Get the scrape secret from Vault
  SELECT decrypted_secret INTO scrape_secret 
  FROM vault.decrypted_secrets 
  WHERE name = 'SCRAPE_SECRET';
  
  IF scrape_secret IS NULL THEN
    RAISE EXCEPTION 'SCRAPE_SECRET not found in vault';
  END IF;
  
  -- 1. Call RSS scraper first
  SELECT net.http_post(
    url := 'https://wordmap-zeitgeist.onrender.com/api/scrape',
    body := json_build_object('secret', scrape_secret)::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'RSS scraper request sent with ID: %', request_id;
  PERFORM pg_sleep(3);
  
  -- 2. YouTube trending videos
  SELECT net.http_post(
    url := 'https://wordmap-zeitgeist.onrender.com/api/manager/scrape',
    body := json_build_object(
      'secret', scrape_secret,
      'source', 'youtube',
      'endpoint', 'videos',
      'params', json_build_object(
        'part', 'snippet,statistics',
        'chart', 'mostPopular',
        'maxResults', 50
      )
    )::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'YouTube API request sent with ID: %', request_id;
  PERFORM pg_sleep(3);
  
  -- 3. NewsAPI top headlines
  SELECT net.http_post(
    url := 'https://wordmap-zeitgeist.onrender.com/api/manager/scrape',
    body := json_build_object(
      'secret', scrape_secret,
      'source', 'newsapi',
      'endpoint', 'top-headlines',
      'params', json_build_object(
        'country', 'us',
        'pageSize', 100
      )
    )::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'NewsAPI request sent with ID: %', request_id;
  PERFORM pg_sleep(3);
  
  -- 4. Twitter recent trending (removed Reddit API call)
  SELECT net.http_post(
    url := 'https://wordmap-zeitgeist.onrender.com/api/manager/scrape',
    body := json_build_object(
      'secret', scrape_secret,
      'source', 'twitter',
      'endpoint', 'tweets/search/recent',
      'params', json_build_object(
        'query', 'trending OR viral -is:retweet lang:en',
        'max_results', 100
      )
    )::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb
  ) INTO request_id;
  
  RAISE NOTICE 'Twitter API request sent with ID: %', request_id;
  
  RAISE NOTICE 'All scraping requests completed successfully';
END;
$$;