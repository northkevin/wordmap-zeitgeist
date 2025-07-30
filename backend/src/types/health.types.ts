/**
 * Type definitions for health check system
 * Eliminates 'any' types from health monitoring
 */

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: {
    backend?: string
    frontend?: string
    git?: {
      commit?: string
      branch?: string
      dirty?: boolean
    }
  }
  system: {
    node: string
    platform: string
    uptime: number
    memory: {
      used: string
      total: string
      percentage: number
    }
  }
  services: {
    supabase: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      message?: string
      details?: Record<string, unknown>
      latency?: number
    }
    render: {
      status: 'healthy' | 'degraded' | 'unhealthy'
      message?: string
      details?: Record<string, unknown>
    }
  }
  resources: {
    database: {
      posts: number
      words: number
      unprocessedPosts: number
      sources: number
    }
    apiKeys: {
      youtube: boolean
      twitter: boolean
      newsapi: boolean
      reddit: boolean
    }
    cronJobs: {
      lastRssScrape?: string
      lastApiScrape?: string
    }
  }
}

export interface SourceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disabled'
  lastSuccess: string | null
  postsLast24h: number
  postsLastHour: number
  enabled?: boolean
  errorCount?: number
  lastError?: string
  rateLimit?: {
    remaining: number
    resetAt: string
    perHour: number
  }
}

export interface ScraperHealth {
  status: 'healthy' | 'partially_healthy' | 'unhealthy'
  timestamp: string
  sources: {
    rss: Record<string, SourceHealth>
    api: Record<string, SourceHealth>
  }
  processing: {
    unprocessedPosts: number
    processedLastHour: number
    backlogTrend: 'increasing' | 'stable' | 'decreasing'
  }
  issues: string[]
}

export interface DatabaseStats {
  tables: {
    [tableName: string]: {
      count: number
      lastUpdated?: string
    }
  }
  connections: {
    active: number
    idle: number
    total: number
  }
}

export interface ApiSourceStats {
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastSuccess: string | null
  postsLast24h: number
  postsLastHour: number
  errorCount?: number
  lastError?: string
  rateLimit?: {
    remaining: number
    resetAt: string
    perHour: number
  }
}

export interface HealthCheckResult {
  system: SystemHealth
  scraper: ScraperHealth
  database: DatabaseStats
  apiSources: ApiSourceStats[]
}

export interface HealthMetrics {
  responseTime: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  timestamp: Date
}

// Error tracking types
export interface TrackedError {
  id: string
  message: string
  stack?: string
  timestamp: Date
  context?: Record<string, unknown>
  count: number
  lastOccurrence: Date
}

export interface ErrorSummary {
  total: number
  byType: Record<string, number>
  recent: TrackedError[]
  critical: TrackedError[]
}