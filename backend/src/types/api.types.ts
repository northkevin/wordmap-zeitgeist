/**
 * Type definitions for API sources and responses
 * This file eliminates 'any' types from our API layer
 */

// Base API types
export interface ApiConfig {
  name: string
  baseUrl: string
  authType: 'header' | 'query' | 'oauth' | 'bearer'
  keyParam?: string
  headerName?: string
  rateLimit: {
    perHour: number
    delay: number // milliseconds between requests
  }
  defaultHeaders?: Record<string, string>
}

// Generic API response wrapper
export interface ApiResponse<T> {
  source: string
  data: T
  timestamp: Date
  success: boolean
  error?: string
  rateLimitInfo?: {
    remaining: number
    resetTime: Date
  }
}

export interface RequestLog {
  source: string
  endpoint: string
  timestamp: Date
  success: boolean
  responseTime: number
  error?: string
}

// YouTube API types
export interface YouTubeVideo {
  id: string
  title: string
  description: string
  channelTitle: string
  publishedAt: string
  thumbnails?: Record<string, {
    url: string
    width: number
    height: number
  }>
  viewCount?: string
  likeCount?: string
  commentCount?: string
}

export interface YouTubeSearchResponse {
  videos: YouTubeVideo[]
}

// NewsAPI types
export interface NewsArticle {
  source: {
    id: string | null
    name: string
  }
  author: string | null
  title: string
  description: string | null
  url: string
  urlToImage: string | null
  publishedAt: string
  content: string | null
}

export interface NewsApiResponse {
  status: string
  totalResults: number
  articles: NewsArticle[]
}

// Reddit API types
export interface RedditPost {
  id: string
  title: string
  selftext: string
  url: string
  subreddit: string
  author: string
  score: number
  num_comments: number
  created_utc: number
  permalink: string
}

export interface RedditResponse {
  posts: RedditPost[]
}

// Twitter API types
export interface Tweet {
  id: string
  text: string
  created_at: string
  author_id: string
  public_metrics?: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
  }
}

export interface TwitterUser {
  id: string
  name: string
  username: string
}

export interface TwitterResponse {
  tweets: Tweet[]
  users?: TwitterUser[]
}

// API Source interface
export interface ApiSource<T> {
  makeRequest(endpoint: string, params: Record<string, string>): Promise<ApiResponse<T>>
  getStats(): {
    source: string
    requestCount: number
    lastRequestTime: Date | null
    hourlyResetTime: Date
    remainingRequests: number
  }
}

// Factory function type
export type ApiSourceFactory<T> = (config: ApiConfig, apiKey: string) => ApiSource<T>

// Parser function type
export type ResponseParser<TRaw, TParsed> = (data: TRaw, endpoint: string, params: Record<string, string>) => TParsed

// OAuth token for Reddit
export interface OAuthToken {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}