/**
 * Central export for all type definitions
 * Import from here to ensure consistent type usage
 */

// Re-export database types
export * from './database.types.js'

// Re-export API types
export * from './api.types.js'

// Re-export health types
export * from './health.types.js'

// Re-export scraper types
export * from './scraper.types.js'

// Re-export word processor types
export * from './wordProcessor.types.js'

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type AsyncResult<T> = Promise<{ data: T; error: null } | { data: null; error: Error }>

// Generic response types
export interface SuccessResponse<T> {
  success: true
  data: T
  timestamp: Date
}

export interface ErrorResponse {
  success: false
  error: string
  details?: unknown
  timestamp: Date
}

export type ApiResult<T> = SuccessResponse<T> | ErrorResponse

// Pagination types
export interface PaginationParams {
  page: number
  limit: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Time range types
export type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all'

export interface TimeFilter {
  start?: Date
  end?: Date
  range?: TimeRange
}

// Sort types
export type SortOrder = 'asc' | 'desc'

export interface SortParams<T> {
  field: keyof T
  order: SortOrder
}

// Environment types
export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'test'
  PORT: number
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_ANON_KEY?: string
  SCRAPE_SECRET: string
  YOUTUBE_API_KEY?: string
  NEWSAPI_KEY?: string
  REDDIT_CLIENT_ID?: string
  REDDIT_CLIENT_SECRET?: string
  TWITTER_BEARER_TOKEN?: string
}