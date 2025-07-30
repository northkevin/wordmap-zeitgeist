/**
 * Type definitions for RSS scraper
 * Integrates with Supabase types for type safety
 */

import { Database } from './database.types.js'

// Supabase table types
export type Post = Database['public']['Tables']['posts']['Row']
export type PostInsert = Database['public']['Tables']['posts']['Insert']
export type PostUpdate = Database['public']['Tables']['posts']['Update']

// RSS feed types
export interface RSSFeed {
  url: string
  name: string
  active: boolean
  category?: string
}

export interface RSSItem {
  title: string
  link: string
  pubDate?: string
  pubDateParsed?: Date
  creator?: string
  content?: string
  contentSnippet?: string
  guid?: string
  categories?: string[]
  enclosure?: {
    url?: string
    type?: string
    length?: string
  }
}

export interface RSSParseResult {
  title?: string
  description?: string
  link?: string
  language?: string
  lastBuildDate?: string
  items: RSSItem[]
}

export interface ScrapedPost {
  title: string
  content: string
  url: string
  source: string
  scraped_at?: string
  processed?: boolean
}

export interface ScrapeResult {
  feed: string
  success: boolean
  postsFound: number
  postsSaved: number
  duplicates: number
  errors: string[]
  duration: number
}

export interface ScrapeSession {
  id: string
  startTime: Date
  endTime?: Date
  feedsProcessed: number
  totalPosts: number
  newPosts: number
  errors: number
  results: ScrapeResult[]
}

// Scraper configuration
export interface ScraperConfig {
  batchSize: number
  timeout: number
  retryAttempts: number
  retryDelay: number
  userAgent: string
}

// Scraper state
export interface ScraperState {
  isRunning: boolean
  currentFeed?: string
  progress: {
    current: number
    total: number
    percentage: number
  }
  session?: ScrapeSession
}

// Feed health tracking
export interface FeedHealth {
  url: string
  lastSuccess?: Date
  lastError?: Date
  consecutiveErrors: number
  errorRate: number
  averagePostCount: number
  isHealthy: boolean
}

// Scraper methods interface
export interface Scraper {
  scrapeFeeds(feeds: RSSFeed[]): Promise<ScrapeSession>
  scrapeFeed(feed: RSSFeed): Promise<ScrapeResult>
  parseFeed(feedContent: string): RSSParseResult
  validatePost(item: RSSItem): boolean
  transformPost(item: RSSItem, source: string): ScrapedPost
  savePosts(posts: ScrapedPost[]): Promise<{ saved: number; duplicates: number }>
  getState(): ScraperState
  getFeedHealth(): FeedHealth[]
}