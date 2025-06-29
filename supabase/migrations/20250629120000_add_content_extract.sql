/*
# Add content extract columns to posts table

1. Schema Changes
- Add `content_extract` text column to store tweet-length content extracts
- Add `extract_method` text column to track how the extract was created
- Create index on content_extract for performance

2. Purpose
- Prevents verbose sources (like Guardian) from dominating word counts
- Ensures fair representation across all sources
- Maintains full content while using extracts for word processing

3. Extract Methods
- 'tweet_length_truncated': Title + first N chars of content (up to 280 chars)
- 'title_only': When title is already 280+ chars, use only title
*/

-- Add content_extract column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_extract TEXT;

-- Add extract_method column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS extract_method TEXT;

-- Create index for efficient querying of content extracts
CREATE INDEX IF NOT EXISTS idx_posts_content_extract ON posts (content_extract)
WHERE
    content_extract IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN posts.content_extract IS 'Tweet-length (280 chars) content extract used for word processing';

COMMENT ON COLUMN posts.extract_method IS 'Method used to create content extract: tweet_length_truncated or title_only';

-- Update existing posts to have content extracts (for backward compatibility)
-- This will be handled by the word processor when reprocessing orphaned posts
UPDATE posts
SET
    content_extract = CASE
        WHEN LENGTH(title) >= 280 THEN title
        ELSE title || ' ' || LEFT(
            content,
            280 - LENGTH(title) - 1
        )
    END,
    extract_method = CASE
        WHEN LENGTH(title) >= 280 THEN 'title_only'
        ELSE 'tweet_length_truncated'
    END
WHERE
    content_extract IS NULL;
