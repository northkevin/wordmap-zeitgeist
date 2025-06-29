/*
  # Initial Schema for Wordmap Zeitgeist

  1. New Tables
    - `posts`
      - `id` (uuid, primary key)
      - `source` (text) - RSS feed source name
      - `title` (text) - Article/post title
      - `content` (text) - Article content/description
      - `url` (text) - Original article URL
      - `scraped_at` (timestamptz) - When the post was scraped
    - `words`
      - `id` (uuid, primary key) 
      - `word` (text, unique) - The word itself
      - `count` (integer) - Total frequency count
      - `last_seen` (timestamptz) - When word was last encountered

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access (since this is public data)
    - Add policies for authenticated insert/update operations

  3. Indexes
    - Index on words.count for fast sorting
    - Index on posts.scraped_at for time-based queries
    - Index on words.word for fast lookups
*/

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  scraped_at timestamptz DEFAULT now()
);

-- Create words table
CREATE TABLE IF NOT EXISTS words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text UNIQUE NOT NULL,
  count integer NOT NULL DEFAULT 0,
  last_seen timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for posts"
  ON posts
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Public read access for words"
  ON words
  FOR SELECT
  TO public
  USING (true);

-- Create policies for service role operations
CREATE POLICY "Service role can insert posts"
  ON posts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update posts"
  ON posts
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Service role can insert words"
  ON words
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update words"
  ON words
  FOR UPDATE
  TO service_role
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_words_count ON words(count DESC);
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
CREATE INDEX IF NOT EXISTS idx_posts_scraped_at ON posts(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_source ON posts(source);