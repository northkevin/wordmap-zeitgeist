import { SupabaseClient } from '@supabase/supabase-js'
// import type { ApiManager } from './apiManager.js'
import * as os from 'os'
import * as fs from 'fs/promises'
import { execSync } from 'child_process'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  message?: string
  details?: any
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: {
    backend: string
    frontend: string
    git: {
      commit: string
      branch: string
      dirty: boolean
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
    supabase: HealthStatus & { latency?: number }
    render: HealthStatus
  }
  resources: {
    database: {
      posts: number
      words: number
      unprocessedPosts: number
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

interface SourceHealth {
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

interface ScraperHealth {
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

// Cache for health check results
const cache = new Map<string, { data: any; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.data
  }
  cache.delete(key)
  return null
}

function setCached(key: string, data: any): void {
  cache.set(key, {
    data,
    expires: Date.now() + CACHE_TTL
  })
}

async function getGitInfo(): Promise<SystemHealth['version']['git']> {
  try {
    const commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
    const status = execSync('git status --porcelain', { encoding: 'utf8' })
    
    return {
      commit: commit.substring(0, 7),
      branch,
      dirty: status.length > 0
    }
  } catch (error) {
    console.error('Failed to get git info:', error)
    return {
      commit: 'unknown',
      branch: 'unknown',
      dirty: false
    }
  }
}

async function getVersions(): Promise<SystemHealth['version']> {
  try {
    const backendPackage = await fs.readFile('./package.json', 'utf8')
    const backendVersion = JSON.parse(backendPackage).version
    
    // Try to read frontend package.json
    let frontendVersion = 'unknown'
    try {
      const frontendPackage = await fs.readFile('../frontend/package.json', 'utf8')
      frontendVersion = JSON.parse(frontendPackage).version
    } catch {
      // Frontend package.json not found
    }
    
    const git = await getGitInfo()
    
    return {
      backend: backendVersion,
      frontend: frontendVersion,
      git
    }
  } catch (error) {
    console.error('Failed to get versions:', error)
    return {
      backend: 'unknown',
      frontend: 'unknown',
      git: { commit: 'unknown', branch: 'unknown', dirty: false }
    }
  }
}

async function checkSupabaseHealth(supabase: SupabaseClient): Promise<SystemHealth['services']['supabase']> {
  try {
    const start = Date.now()
    const { error } = await supabase
      .from('words')
      .select('count')
      .limit(1)
      .single()
    
    const latency = Date.now() - start
    
    if (error) {
      return {
        status: 'unhealthy',
        message: 'Database query failed',
        details: error
      }
    }
    
    return {
      status: 'healthy',
      latency
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Failed to connect to Supabase',
      details: error
    }
  }
}

async function getDatabaseStats(supabase: SupabaseClient): Promise<SystemHealth['resources']['database']> {
  try {
    const [postsResult, wordsResult, unprocessedResult] = await Promise.all([
      supabase.from('posts').select('count', { count: 'exact', head: true }),
      supabase.from('words').select('count', { count: 'exact', head: true }),
      supabase.from('posts').select('count', { count: 'exact', head: true }).eq('processed', false)
    ])
    
    return {
      posts: postsResult.count || 0,
      words: wordsResult.count || 0,
      unprocessedPosts: unprocessedResult.count || 0
    }
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return {
      posts: 0,
      words: 0,
      unprocessedPosts: 0
    }
  }
}

async function getCronJobStatus(supabase: SupabaseClient): Promise<SystemHealth['resources']['cronJobs']> {
  try {
    const { data } = await supabase
      .from('posts')
      .select('source, scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(100)
    
    const rssSources = ['BBC News', 'The Guardian UK', 'TechCrunch', 'Wired']
    const apiSources = ['YouTube', 'Twitter', 'NewsAPI', 'Reddit']
    
    let lastRssScrape: string | undefined
    let lastApiScrape: string | undefined
    
    if (data) {
      for (const post of data) {
        if (!lastRssScrape && rssSources.includes(post.source)) {
          lastRssScrape = post.scraped_at
        }
        if (!lastApiScrape && apiSources.includes(post.source)) {
          lastApiScrape = post.scraped_at
        }
        if (lastRssScrape && lastApiScrape) break
      }
    }
    
    return {
      lastRssScrape,
      lastApiScrape
    }
  } catch (error) {
    console.error('Failed to get cron job status:', error)
    return {}
  }
}

export async function getSystemHealth(supabase: SupabaseClient): Promise<SystemHealth> {
  const cached = getCached<SystemHealth>('system-health')
  if (cached) return cached
  
  const [version, supabaseHealth, dbStats, cronJobs] = await Promise.all([
    getVersions(),
    checkSupabaseHealth(supabase),
    getDatabaseStats(supabase),
    getCronJobStatus(supabase)
  ])
  
  const memUsage = process.memoryUsage()
  const totalMem = os.totalmem()
  const memPercentage = (memUsage.heapUsed / totalMem) * 100
  
  const health: SystemHealth = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version,
    system: {
      node: process.version,
      platform: os.platform(),
      uptime: process.uptime(),
      memory: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(totalMem / 1024 / 1024)}MB`,
        percentage: Math.round(memPercentage * 100) / 100
      }
    },
    services: {
      supabase: supabaseHealth,
      render: {
        status: process.env.RENDER ? 'healthy' : 'degraded',
        message: process.env.RENDER_SERVICE_NAME || 'Not on Render'
      }
    },
    resources: {
      database: dbStats,
      apiKeys: {
        youtube: !!process.env.YOUTUBE_API_KEY,
        twitter: !!process.env.TWITTER_BEARER_TOKEN,
        newsapi: !!process.env.NEWSAPI_KEY,
        reddit: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
      },
      cronJobs
    }
  }
  
  // Determine overall status
  if (supabaseHealth.status === 'unhealthy') {
    health.status = 'unhealthy'
  } else if (dbStats.unprocessedPosts > 1000 || memPercentage > 90) {
    health.status = 'degraded'
  }
  
  setCached('system-health', health)
  return health
}

async function getSourceHealthData(supabase: SupabaseClient, apiManager?: any): Promise<{
  rssHealth: Record<string, any>
  apiHealth: Record<string, any>
  errors: any[]
}> {
  try {
    // Get source statistics for last 24 hours
    const { data: sourceStats } = await supabase
      .from('posts')
      .select('source, scraped_at')
      .gte('scraped_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    
    // Get recent HTTP errors from net schema
    const { data: httpErrors } = await supabase
      .schema('net')
      .from('_http_response')
      .select('status_code, error_msg, created')
      .or('status_code.gte.400,error_msg.not.is.null')
      .gte('created', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .order('created', { ascending: false })
      .limit(50)
    
    // Process source statistics
    const sourceMap = new Map<string, {
      lastSuccess: string
      postsLast24h: number
      postsLastHour: number
    }>()
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    if (sourceStats) {
      for (const post of sourceStats) {
        const existing = sourceMap.get(post.source) || {
          lastSuccess: post.scraped_at,
          postsLast24h: 0,
          postsLastHour: 0
        }
        
        existing.postsLast24h++
        if (new Date(post.scraped_at) > oneHourAgo) {
          existing.postsLastHour++
        }
        
        if (new Date(post.scraped_at) > new Date(existing.lastSuccess)) {
          existing.lastSuccess = post.scraped_at
        }
        
        sourceMap.set(post.source, existing)
      }
    }
    
    const rssHealth: Record<string, any> = {}
    const apiHealth: Record<string, any> = {}
    
    // Define known sources
    const rssSources = [
      'TechCrunch', 'Wired', 'BBC News', 'Hacker News',
      'The Guardian UK', 'The Guardian World', 'The Guardian US',
      'NPR Main News', 'Reddit r/all', 'Reddit r/popular',
      'Reddit r/worldnews', 'Reddit Tech Combined'
    ]
    
    // const apiSources = ['YouTube', 'Twitter', 'NewsAPI', 'Reddit']
    
    // Build health status for each source
    for (const source of rssSources) {
      const stats = sourceMap.get(source)
      rssHealth[source] = {
        status: stats && stats.postsLastHour > 0 ? 'healthy' : 
                stats && stats.postsLast24h > 0 ? 'degraded' : 'unhealthy',
        lastSuccess: stats?.lastSuccess || null,
        postsLast24h: stats?.postsLast24h || 0,
        postsLastHour: stats?.postsLastHour || 0
      }
    }
    
    // Get API-specific health data if apiManager is available
    if (apiManager && apiManager.getAllSources) {
      const apiSourcesData = apiManager.getAllSources()
      for (const sourceId of apiSourcesData) {
        const sourceInfo = apiManager.getSourceInfo(sourceId)
        if (sourceInfo) {
          const sourceName = sourceInfo.config.name
          const stats = sourceMap.get(sourceName)
          
          apiHealth[sourceName] = {
            status: stats && stats.postsLastHour > 0 ? 'healthy' : 
                    stats && stats.postsLast24h > 0 ? 'degraded' : 'unhealthy',
            lastSuccess: stats?.lastSuccess || null,
            postsLast24h: stats?.postsLast24h || 0,
            postsLastHour: stats?.postsLastHour || 0,
            rateLimit: sourceInfo.rateLimit
          }
        }
      }
    } else {
      // If apiManager not available, just check for known API sources in the data
      const apiSources = ['YouTube', 'Twitter', 'NewsAPI', 'Reddit']
      for (const source of apiSources) {
        const stats = sourceMap.get(source)
        if (stats) {
          apiHealth[source] = {
            status: stats.postsLastHour > 0 ? 'healthy' : 
                    stats.postsLast24h > 0 ? 'degraded' : 'unhealthy',
            lastSuccess: stats.lastSuccess || null,
            postsLast24h: stats.postsLast24h || 0,
            postsLastHour: stats.postsLastHour || 0
          }
        }
      }
    }
    
    return {
      rssHealth,
      apiHealth,
      errors: httpErrors || []
    }
  } catch (error) {
    console.error('Failed to get source health data:', error)
    return { rssHealth: {}, apiHealth: {}, errors: [] }
  }
}

export async function getScraperHealth(supabase: SupabaseClient, apiManager?: any): Promise<ScraperHealth> {
  const cached = getCached<ScraperHealth>('scraper-health')
  if (cached) return cached
  
  const { rssHealth, apiHealth, errors } = await getSourceHealthData(supabase, apiManager)
  
  // Get processing statistics
  const { data: processingStats } = await supabase
    .from('posts')
    .select('processed, scraped_at')
    .gte('scraped_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
  
  let unprocessedPosts = 0
  let processedLastHour = 0
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  
  if (processingStats) {
    for (const post of processingStats) {
      if (!post.processed) {
        unprocessedPosts++
      } else if (new Date(post.scraped_at) > oneHourAgo) {
        processedLastHour++
      }
    }
  }
  
  // Analyze issues
  const issues: string[] = []
  
  // Check for API rate limiting
  const twitterHealth = apiHealth['Twitter']
  if (twitterHealth?.status === 'unhealthy' || errors.some(e => e.status_code === 429)) {
    issues.push('Twitter API rate limited')
  }
  
  // Check for timeouts
  const timeoutCount = errors.filter(e => e.error_msg?.includes('Timeout')).length
  if (timeoutCount > 0) {
    issues.push(`${timeoutCount} Supabase HTTP timeouts in last hour`)
  }
  
  // Check for unprocessed backlog
  if (unprocessedPosts > 100) {
    issues.push(`${unprocessedPosts} unprocessed posts in backlog`)
  }
  
  // Check for completely dead sources
  const deadRssSources = Object.entries(rssHealth)
    .filter(([_, health]) => health.status === 'unhealthy')
    .map(([source]) => source)
  
  if (deadRssSources.length > 0) {
    issues.push(`${deadRssSources.length} RSS sources not responding`)
  }
  
  // Determine overall status
  const healthySourceCount = Object.values({ ...rssHealth, ...apiHealth })
    .filter(h => h.status === 'healthy').length
  const totalSourceCount = Object.keys({ ...rssHealth, ...apiHealth }).length
  
  let status: ScraperHealth['status'] = 'healthy'
  if (healthySourceCount === 0) {
    status = 'unhealthy'
  } else if (healthySourceCount < totalSourceCount * 0.8) {
    status = 'partially_healthy'
  }
  
  const health: ScraperHealth = {
    status,
    timestamp: new Date().toISOString(),
    sources: {
      rss: rssHealth,
      api: apiHealth
    },
    processing: {
      unprocessedPosts,
      processedLastHour,
      backlogTrend: unprocessedPosts > 50 ? 'increasing' : 'stable'
    },
    issues
  }
  
  setCached('scraper-health', health)
  return health
}