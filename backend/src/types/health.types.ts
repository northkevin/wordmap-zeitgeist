/**
 * Type definitions for health check system
 * Eliminates 'any' types from health monitoring
 */

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: {
    backend?: string
    git?: {
      commit?: string
      branch?: string
      timestamp?: string
    }
  }
  environment: {
    node: string
    platform: string
    memory: {
      used: number
      total: number
      percentage: number
    }
    uptime: number
  }
  database: {
    connected: boolean
    latencyMs?: number
    error?: string
  }
  config: {
    supabase: boolean
    scrapeSecret: boolean
    apiKeys: {
      youtube: boolean
      newsapi: boolean
      reddit: boolean
      twitter: boolean
    }
  }
}

export interface ScraperHealth {
  lastRun?: string
  nextRun?: string
  isRunning: boolean
  stats: {
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    lastRunDuration?: number
  }
  feeds: {
    total: number
    active: number
    inactive: number
  }
  recentActivity: {
    feedsAnalyzed: number
    postsProcessed: number
    newPosts: number
    errors: number
  }
  errors: Array<{
    feed: string
    error: string
    timestamp: string
  }>
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
  source: string
  enabled: boolean
  requestCount: number
  lastRequestTime: Date | null
  hourlyResetTime: Date
  remainingRequests: number
  rateLimitInfo: {
    perHour: number
    used: number
    percentage: number
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