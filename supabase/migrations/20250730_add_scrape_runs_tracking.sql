-- Migration: Add scrape run tracking
-- Purpose: Track scrape attempts, successes, and failures for better monitoring

-- Create table to track each scrape run
CREATE TABLE IF NOT EXISTS public.scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text CHECK (status IN ('running', 'success', 'failed')) DEFAULT 'running',
  posts_found integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast queries by source and time
CREATE INDEX idx_scrape_runs_source_started ON public.scrape_runs(source, started_at DESC);

-- Index for finding failed runs
CREATE INDEX idx_scrape_runs_failed ON public.scrape_runs(status) WHERE status = 'failed';

-- View to get latest scrape status per source
CREATE OR REPLACE VIEW public.latest_scrape_status AS
SELECT DISTINCT ON (source) 
  source,
  status,
  started_at,
  completed_at,
  posts_found,
  error_message,
  CASE 
    WHEN completed_at IS NOT NULL THEN 
      EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000 
    ELSE NULL 
  END as runtime_ms
FROM public.scrape_runs
ORDER BY source, started_at DESC;

-- Grant appropriate permissions
GRANT SELECT ON public.scrape_runs TO anon;
GRANT SELECT ON public.latest_scrape_status TO anon;
GRANT ALL ON public.scrape_runs TO service_role;

-- Add RLS policies
ALTER TABLE public.scrape_runs ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read scrape runs
CREATE POLICY "Allow anonymous read access" ON public.scrape_runs
  FOR SELECT TO anon
  USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON public.scrape_runs
  FOR ALL TO service_role
  USING (true);

-- Add comment
COMMENT ON TABLE public.scrape_runs IS 'Tracks each scraping attempt with status, timing, and error information';
COMMENT ON VIEW public.latest_scrape_status IS 'Shows the most recent scrape run for each source';