/*
  # Add source tracking to word counts

  1. New Tables
    - `word_sources` - Junction table linking words to their sources
      - `id` (uuid, primary key)
      - `word_id` (uuid, foreign key to words table)
      - `source` (text, source name)
      - `count` (integer, count from this specific source)
      - `last_seen` (timestamp)

  2. Security
    - Enable RLS on `word_sources` table
    - Add policy for public read access
    - Add policy for service role insert/update access

  3. Indexes
    - Add indexes for efficient querying by word_id and source
    - Add composite index for word_id + source lookups
*/

-- Create word_sources junction table
CREATE TABLE IF NOT EXISTS word_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id uuid NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  source text NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_word_sources_word_id ON word_sources(word_id);
CREATE INDEX IF NOT EXISTS idx_word_sources_source ON word_sources(source);
CREATE INDEX IF NOT EXISTS idx_word_sources_word_source ON word_sources(word_id, source);
CREATE INDEX IF NOT EXISTS idx_word_sources_count ON word_sources(count DESC);

-- Enable RLS
ALTER TABLE word_sources ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Public read access for word_sources"
  ON word_sources
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Service role can insert word_sources"
  ON word_sources
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update word_sources"
  ON word_sources
  FOR UPDATE
  TO service_role
  USING (true);

-- Add a view for easy source statistics
CREATE OR REPLACE VIEW source_stats AS
SELECT 
  source,
  COUNT(DISTINCT word_id) as unique_words,
  SUM(count) as total_word_count,
  MAX(last_seen) as last_updated
FROM word_sources 
GROUP BY source
ORDER BY total_word_count DESC;

-- Grant access to the view
GRANT SELECT ON source_stats TO public;
GRANT SELECT ON source_stats TO service_role;