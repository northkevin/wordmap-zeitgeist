/*
  # Add processed column to posts table

  1. Schema Changes
    - Add `processed` boolean column to posts table (default false)
    - Create index for performance on unprocessed posts queries

  2. Data Migration
    - Mark existing posts as processed if they have corresponding word_sources entries
    - This prevents reprocessing of already processed posts

  3. Performance
    - Index on processed column for efficient querying of unprocessed posts
*/

-- Add processed column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false;

-- Create index for efficient querying of unprocessed posts
CREATE INDEX IF NOT EXISTS idx_posts_processed ON posts(processed) WHERE processed = false;

-- Mark existing posts as processed if they have corresponding entries in word_sources
-- This prevents reprocessing of posts that were already successfully processed
UPDATE posts 
SET processed = true 
WHERE source IN (
  SELECT DISTINCT source 
  FROM word_sources 
  WHERE source IS NOT NULL
);

-- Add comment for documentation
COMMENT ON COLUMN posts.processed IS 'Tracks whether post content has been processed for word extraction';