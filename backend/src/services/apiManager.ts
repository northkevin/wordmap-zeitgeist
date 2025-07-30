import { ApiConfig, ApiResponse, ApiSource, RequestLog } from './ApiSource.js'
import { 
  YouTubeSearchResponse, 
  NewsApiResponse, 
  TwitterResponse, 
  RedditResponse 
} from '../types/api.types.js'

// Re-export types for backward compatibility
export type { ApiConfig, ApiResponse, RequestLog } from './ApiSource.js'
import { YouTubeApiSource, TwitterApiSource, NewsApiSource, RedditApiSource } from './apiSources/index.js'

// Union type for all possible API responses
type ApiSourceTypes = ApiSource<YouTubeSearchResponse> | 
                     ApiSource<NewsApiResponse> | 
                     ApiSource<TwitterResponse> | 
                     ApiSource<RedditResponse>

// Store for API sources
const sources = new Map<string, ApiSourceTypes>()

// Request logging
const requestLogs: RequestLog[] = []
const MAX_LOGS = 1000

// Initialize default sources
function initializeDefaultSources() {
  // YouTube Data API v3
  if (process.env.YOUTUBE_API_KEY) {
    const youtubeConfig: ApiConfig = {
      name: 'YouTube',
      baseUrl: 'https://www.googleapis.com/youtube/v3/',
      authType: 'query',
      keyParam: 'key',
      rateLimit: {
        perHour: 400, // 10k quota units per day, roughly 400 per hour (conservative estimate)
        delay: 1000 // 1 second between requests
      }
    }
    
    sources.set('youtube', new YouTubeApiSource(youtubeConfig, process.env.YOUTUBE_API_KEY))
    console.log('✅ YouTube API source initialized')
  } else {
    console.log('⚠️  YouTube API key not found - skipping initialization')
  }

  // NewsAPI.org
  if (process.env.NEWSAPI_KEY) {
    const newsApiConfig: ApiConfig = {
      name: 'NewsAPI',
      baseUrl: 'https://newsapi.org/v2/',
      authType: 'header',
      headerName: 'X-API-Key',
      rateLimit: {
        perHour: 42, // 1000 requests per day for free tier = ~42 per hour
        delay: 2000 // 2 seconds between requests
      }
    }
    
    sources.set('newsapi', new NewsApiSource(newsApiConfig, process.env.NEWSAPI_KEY))
    console.log('✅ NewsAPI source initialized')
  } else {
    console.log('⚠️  NewsAPI key not found - skipping initialization')
  }

  // Reddit API
  if (process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET) {
    const redditConfig: ApiConfig = {
      name: 'Reddit',
      baseUrl: 'https://oauth.reddit.com/',
      authType: 'oauth',
      rateLimit: {
        perHour: 600, // 60 requests per minute = 3600 per hour, being conservative at 600
        delay: 2000 // 2 seconds between requests
      },
      defaultHeaders: {
        'User-Agent': 'WordmapZeitgeist/1.0'
      }
    }
    
    sources.set('reddit', new RedditApiSource(redditConfig, ''))
    console.log('✅ Reddit API source initialized')
  } else {
    console.log('⚠️  Reddit API credentials not found - skipping initialization')
  }

  // Twitter API v2
  if (process.env.TWITTER_BEARER_TOKEN) {
    const twitterConfig: ApiConfig = {
      name: 'Twitter',
      baseUrl: 'https://api.twitter.com/2/',
      authType: 'bearer',
      rateLimit: {
        perHour: 300, // 300 requests per 15-minute window = 1200 per hour, being conservative
        delay: 1000 // 1 second between requests
      },
      defaultHeaders: {
        'User-Agent': 'WordmapZeitgeist/1.0'
      }
    }
    
    sources.set('twitter', new TwitterApiSource(twitterConfig, process.env.TWITTER_BEARER_TOKEN))
    console.log('✅ Twitter API source initialized')
  } else {
    console.log('⚠️  Twitter Bearer Token not found - skipping initialization')
  }

  console.log(`🔧 API Manager initialized with ${sources.size} sources`)
}

// Log a request
export function logRequest(log: RequestLog): void {
  requestLogs.push(log)
  
  // Keep only the last MAX_LOGS entries
  if (requestLogs.length > MAX_LOGS) {
    requestLogs.splice(0, requestLogs.length - MAX_LOGS)
  }

  // Console log for monitoring
  const status = log.success ? '✅' : '❌'
  console.log(`${status} ${log.source}: ${log.endpoint} (${log.responseTime}ms)${log.error ? ` - ${log.error}` : ''}`)
}

// Scrape API endpoint with proper types
export async function scrapeApi(
  sourceId: string, 
  endpoint: string, 
  params: Record<string, string> = {}
): Promise<ApiResponse<YouTubeSearchResponse | NewsApiResponse | TwitterResponse | RedditResponse>> {
  const source = sources.get(sourceId)
  
  if (!source) {
    throw new Error(`API source '${sourceId}' not found. Available sources: ${Array.from(sources.keys()).join(', ')}`)
  }

  console.log(`🚀 Scraping ${sourceId}: ${endpoint}`)
  
  // Temporarily monkey-patch the source to use our logging
  const originalMakeRequest = source.makeRequest.bind(source)
  const patchedMakeRequest = async function(endpoint: string, params: Record<string, string> = {}) {
    const startTime = Date.now()
    const result = await originalMakeRequest(endpoint, params)
    
    logRequest({
      source: sourceId,
      endpoint,
      timestamp: new Date(),
      success: result.success,
      responseTime: Date.now() - startTime,
      error: result.error
    })
    
    return result
  }
  
  // Patch the source temporarily
  ;(source as any).makeRequest = patchedMakeRequest
  
  const result = await source.makeRequest(endpoint, params)
  
  // Restore original method
  ;(source as any).makeRequest = originalMakeRequest
  
  return result
}

// Get source information
export function getSourceInfo(sourceId: string): { 
  config: ApiConfig; 
  rateLimit: {
    source: string
    requestCount: number
    lastRequestTime: Date | null
    hourlyResetTime: Date
    remainingRequests: number
  }
} | null {
  const source = sources.get(sourceId)
  if (!source) return null

  // Access protected property through a type assertion
  // This is safe because we control the source instances
  const typedSource = source as ApiSource<unknown> & { config: ApiConfig }
  
  return {
    config: typedSource.config,
    rateLimit: source.getStats()
  }
}

// Get all available sources
export function getAllSources(): string[] {
  return Array.from(sources.keys())
}

// Get request logs
export function getRequestLogs(sourceId?: string, limit: number = 100): RequestLog[] {
  let logs = requestLogs
  
  if (sourceId) {
    logs = logs.filter(log => log.source === sourceId)
  }
  
  return logs.slice(-limit).reverse() // Most recent first
}

// Get request statistics
export function getRequestStats(sourceId?: string): {
  total: number
  successful: number
  failed: number
  averageResponseTime: number
  lastHour: number
} {
  let logs = requestLogs
  
  if (sourceId) {
    logs = logs.filter(log => log.source === sourceId)
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentLogs = logs.filter(log => log.timestamp > oneHourAgo)
  
  const successful = logs.filter(log => log.success).length
  const failed = logs.length - successful
  const avgResponseTime = logs.length > 0 
    ? logs.reduce((sum, log) => sum + log.responseTime, 0) / logs.length 
    : 0

  return {
    total: logs.length,
    successful,
    failed,
    averageResponseTime: Math.round(avgResponseTime),
    lastHour: recentLogs.length
  }
}

// Initialize sources on module load
initializeDefaultSources()

// Create a default export object for backward compatibility
export const apiManager = {
  scrapeApi,
  getSourceInfo,
  getAllSources,
  getRequestLogs,
  getRequestStats
}