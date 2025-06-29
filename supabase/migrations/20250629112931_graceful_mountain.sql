/*
  # Stop Words Management System

  This migration adds comprehensive stop words management to enhance data cleanup and sanitization.

  1. New Tables
    - `stop_words` - Global stop words that apply to all sources
    - `source_stop_words` - Source-specific stop words (e.g., filter "techcrunch" only from TechCrunch)

  2. Security
    - Enable RLS on both tables
    - Public read access for active stop words
    - Service role full access for management

  3. Performance
    - Indexes on commonly queried columns
    - Database function for efficient word filtering

  4. Initial Data
    - Common English stop words
    - HTML/web artifacts
    - News-specific terms
    - Source-specific brand names
*/

-- 1. Create stop words table
CREATE TABLE IF NOT EXISTS stop_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  category text NOT NULL,
  reason text,
  added_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- 2. Create source-specific stop words table
CREATE TABLE IF NOT EXISTS source_stop_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  word text NOT NULL,
  reason text,
  added_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(source, word)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_stop_words_word ON stop_words(word) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stop_words_category ON stop_words(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_source_stop_words_source ON source_stop_words(source) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_source_stop_words_word ON source_stop_words(word) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_source_stop_words_combined ON source_stop_words(source, word) WHERE is_active = true;

-- 4. Enable RLS
ALTER TABLE stop_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_stop_words ENABLE ROW LEVEL SECURITY;

-- 5. Create policies
CREATE POLICY "Public read stop words" ON stop_words
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Service role manage stop words" ON stop_words
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Public read source stop words" ON source_stop_words
  FOR SELECT TO public USING (is_active = true);

CREATE POLICY "Service role manage source stop words" ON source_stop_words
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Insert initial stop words data
-- Common English stop words
INSERT INTO stop_words (word, category, reason) VALUES
-- Articles, pronouns, prepositions
('the', 'common', 'Article'),
('a', 'common', 'Article'),
('an', 'common', 'Article'),
('and', 'common', 'Conjunction'),
('or', 'common', 'Conjunction'),
('but', 'common', 'Conjunction'),
('in', 'common', 'Preposition'),
('on', 'common', 'Preposition'),
('at', 'common', 'Preposition'),
('to', 'common', 'Preposition'),
('for', 'common', 'Preposition'),
('of', 'common', 'Preposition'),
('with', 'common', 'Preposition'),
('by', 'common', 'Preposition'),
('from', 'common', 'Preposition'),
('up', 'common', 'Preposition'),
('about', 'common', 'Preposition'),
('into', 'common', 'Preposition'),
('through', 'common', 'Preposition'),
('during', 'common', 'Preposition'),
('before', 'common', 'Preposition'),
('after', 'common', 'Preposition'),
('above', 'common', 'Preposition'),
('below', 'common', 'Preposition'),
('between', 'common', 'Preposition'),
('under', 'common', 'Preposition'),
('over', 'common', 'Preposition'),

-- Verbs
('is', 'common', 'Verb'),
('are', 'common', 'Verb'),
('was', 'common', 'Verb'),
('were', 'common', 'Verb'),
('be', 'common', 'Verb'),
('been', 'common', 'Verb'),
('being', 'common', 'Verb'),
('have', 'common', 'Verb'),
('has', 'common', 'Verb'),
('had', 'common', 'Verb'),
('do', 'common', 'Verb'),
('does', 'common', 'Verb'),
('did', 'common', 'Verb'),
('will', 'common', 'Modal'),
('would', 'common', 'Modal'),
('could', 'common', 'Modal'),
('should', 'common', 'Modal'),
('may', 'common', 'Modal'),
('might', 'common', 'Modal'),
('must', 'common', 'Modal'),
('can', 'common', 'Modal'),

-- Common words from data analysis
('new', 'common', 'Overused adjective'),
('one', 'common', 'Number word'),
('out', 'common', 'Preposition/adverb'),
('people', 'common', 'Generic noun'),
('like', 'common', 'Overused verb/preposition'),
('year', 'time', 'Time period'),
('years', 'time', 'Time period'),
('week', 'time', 'Time period'),
('day', 'time', 'Time period'),
('time', 'time', 'Generic time reference'),
('last', 'common', 'Determiner'),
('says', 'news', 'Reporting verb'),
('said', 'news', 'Reporting verb'),
('say', 'news', 'Reporting verb'),
('get', 'common', 'Generic verb'),
('down', 'common', 'Direction'),
('many', 'common', 'Quantifier'),
('off', 'common', 'Preposition'),
('made', 'common', 'Generic verb'),
('make', 'common', 'Generic verb'),
('take', 'common', 'Generic verb'),
('first', 'common', 'Ordinal'),
('best', 'common', 'Superlative'),

-- HTML/Web artifacts from Guardian issue
('href', 'web', 'HTML attribute'),
('https', 'web', 'Protocol'),
('http', 'web', 'Protocol'),
('com', 'web', 'Domain extension'),
('www', 'web', 'Subdomain'),
('strong', 'html', 'HTML tag'),
('continue', 'interface', 'UI element'),
('reading', 'interface', 'UI action'),
('click', 'interface', 'UI action'),
('here', 'interface', 'UI element'),
('more', 'interface', 'UI element'),
('learn', 'interface', 'UI action'),

-- News-specific
('news', 'news', 'Meta reference'),
('report', 'news', 'News term'),
('reports', 'news', 'News term'),
('reported', 'news', 'News term'),
('according', 'news', 'Attribution phrase'),
('sources', 'news', 'Attribution'),
('officials', 'news', 'Common source'),

-- Web content artifacts
('article', 'web', 'Content type'),
('content', 'web', 'Generic term'),
('page', 'web', 'Web page'),
('site', 'web', 'Website'),
('website', 'web', 'Website'),
('link', 'web', 'Hyperlink'),
('email', 'web', 'Email reference'),
('subscribe', 'web', 'Newsletter action'),
('newsletter', 'web', 'Email content'),
('follow', 'social', 'Social media action'),
('share', 'social', 'Social media action'),
('tweet', 'social', 'Twitter content'),
('post', 'social', 'Social media content')

ON CONFLICT (word) DO NOTHING;

-- 7. Insert source-specific stop words
INSERT INTO source_stop_words (source, word, reason) VALUES
-- Guardian specific
('The Guardian UK', 'guardian', 'Source name'),
('The Guardian UK', 'theguardian', 'Domain name'),
('The Guardian UK', 'uk', 'Location identifier'),
('The Guardian World', 'guardian', 'Source name'),
('The Guardian World', 'theguardian', 'Domain name'),
('The Guardian US', 'guardian', 'Source name'),
('The Guardian US', 'theguardian', 'Domain name'),

-- CNN specific
('CNN Top Stories', 'cnn', 'Source name'),
('CNN World', 'cnn', 'Source name'),
('CNN', 'cnn', 'Source name'),

-- BBC specific
('BBC News', 'bbc', 'Source name'),

-- TechCrunch specific
('TechCrunch', 'techcrunch', 'Source name'),
('TechCrunch', 'crunchbase', 'Related brand'),

-- Wired specific
('Wired', 'wired', 'Source name'),

-- O'Reilly specific
("O'Reilly Radar", 'oreilly', 'Source name'),
("O'Reilly Radar", 'radar', 'Publication name'),

-- NPR specific
('NPR Main News', 'npr', 'Source name'),

-- Reddit specific
('Reddit r/all', 'reddit', 'Platform name'),
('Reddit r/all', 'subreddit', 'Platform term'),
('Reddit r/popular', 'reddit', 'Platform name'),
('Reddit r/popular', 'subreddit', 'Platform term'),
('Reddit r/worldnews', 'reddit', 'Platform name'),
('Reddit r/worldnews', 'subreddit', 'Platform term'),
('Reddit r/worldnews', 'worldnews', 'Subreddit name'),
('Reddit Tech Combined', 'reddit', 'Platform name'),
('Reddit Tech Combined', 'subreddit', 'Platform term'),

-- Hacker News specific
('Hacker News', 'hackernews', 'Source name'),
('Hacker News', 'ycombinator', 'Parent company'),
('Hacker News', 'combinator', 'Parent company short')

ON CONFLICT (source, word) DO NOTHING;

-- 8. Create a function to check if a word should be filtered
CREATE OR REPLACE FUNCTION should_filter_word(check_word text, check_source text DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  -- Check global stop words
  IF EXISTS (
    SELECT 1 FROM stop_words 
    WHERE word = check_word AND is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Check source-specific stop words if source provided
  IF check_source IS NOT NULL AND EXISTS (
    SELECT 1 FROM source_stop_words 
    WHERE word = check_word 
      AND source = check_source 
      AND is_active = true
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Create helper functions for stop words management
CREATE OR REPLACE FUNCTION add_stop_word(new_word text, word_category text DEFAULT 'custom', word_reason text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  word_id uuid;
BEGIN
  INSERT INTO stop_words (word, category, reason)
  VALUES (new_word, word_category, word_reason)
  ON CONFLICT (word) DO UPDATE SET
    is_active = true,
    category = EXCLUDED.category,
    reason = EXCLUDED.reason
  RETURNING id INTO word_id;
  
  RETURN word_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_source_stop_word(source_name text, new_word text, word_reason text DEFAULT NULL)
RETURNS uuid AS $$
DECLARE
  word_id uuid;
BEGIN
  INSERT INTO source_stop_words (source, word, reason)
  VALUES (source_name, new_word, word_reason)
  ON CONFLICT (source, word) DO UPDATE SET
    is_active = true,
    reason = EXCLUDED.reason
  RETURNING id INTO word_id;
  
  RETURN word_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Create view for stop words statistics
CREATE OR REPLACE VIEW stop_words_stats AS
SELECT 
  category,
  COUNT(*) as word_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count
FROM stop_words
GROUP BY category
ORDER BY word_count DESC;

CREATE OR REPLACE VIEW source_stop_words_stats AS
SELECT 
  source,
  COUNT(*) as word_count,
  COUNT(*) FILTER (WHERE is_active = true) as active_count,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_count
FROM source_stop_words
GROUP BY source
ORDER BY word_count DESC;