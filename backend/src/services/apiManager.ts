import PQueue from 'p-queue'

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

export interface ApiResponse {
  source: string
  data: any
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

abstract class ApiSource {
  protected config: ApiConfig
  protected apiKey: string
  protected queue: PQueue
  protected lastRequestTime: Date | null = null
  protected requestCount: number = 0
  protected hourlyResetTime: Date = new Date()

  constructor(config: ApiConfig, apiKey: string) {
    this.config = config
    this.apiKey = apiKey
    this.queue = new PQueue({
      interval: config.rateLimit.delay,
      intervalCap: 1,
      concurrency: 1
    })
    
    // Reset hourly counter
    this.resetHourlyCounter()
  }

  private resetHourlyCounter() {
    const now = new Date()
    this.hourlyResetTime = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    this.requestCount = 0
    
    // Schedule next reset
    setTimeout(() => this.resetHourlyCounter(), 60 * 60 * 1000)
  }

  protected async enforceRateLimit(): Promise<void> {
    const now = new Date()
    
    // Check hourly limit
    if (this.requestCount >= this.config.rateLimit.perHour) {
      const waitTime = this.hourlyResetTime.getTime() - now.getTime()
      if (waitTime > 0) {
        console.warn(`⏳ ${this.config.name}: Hourly rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        this.resetHourlyCounter()
      }
    }

    // Check delay between requests
    if (this.lastRequestTime) {
      const timeSinceLastRequest = now.getTime() - this.lastRequestTime.getTime()
      const minDelay = this.config.rateLimit.delay
      
      if (timeSinceLastRequest < minDelay) {
        const waitTime = minDelay - timeSinceLastRequest
        console.log(`⏳ ${this.config.name}: Rate limiting - waiting ${waitTime}ms`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }

    this.lastRequestTime = new Date()
    this.requestCount++
  }

  protected buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'WordmapZeitgeist/1.0 (+https://wordmap-zeitgeist.com)',
      'Accept': 'application/json',
      ...this.config.defaultHeaders
    }

    switch (this.config.authType) {
      case 'header':
        if (this.config.headerName) {
          headers[this.config.headerName] = this.apiKey
        }
        break
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.apiKey}`
        break
      // OAuth and query params handled in buildUrl
    }

    return headers
  }

  protected buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(endpoint, this.config.baseUrl)
    
    // Add API key as query param if needed
    if (this.config.authType === 'query' && this.config.keyParam) {
      params[this.config.keyParam] = this.apiKey
    }

    // Add all params to URL
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    return url.toString()
  }

  public async fetch(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse> {
    const startTime = Date.now()
    
    try {
      await this.enforceRateLimit()
      
      const url = this.buildUrl(endpoint, params)
      const headers = this.buildAuthHeaders()
      
      console.log(`🌐 ${this.config.name}: Fetching ${endpoint}`)
      
      // Create AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(url, {
        headers,
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const parsedData = await this.parseResponse(data, endpoint, params)

      // Log successful request
      ApiManager.logRequest({
        source: this.config.name,
        endpoint,
        timestamp: new Date(),
        success: true,
        responseTime
      })

      return {
        source: this.config.name,
        data: parsedData,
        timestamp: new Date(),
        success: true,
        rateLimitInfo: {
          remaining: this.config.rateLimit.perHour - this.requestCount,
          resetTime: this.hourlyResetTime
        }
      }

    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      console.error(`❌ ${this.config.name}: Request failed - ${errorMessage}`)
      
      // Log failed request
      ApiManager.logRequest({
        source: this.config.name,
        endpoint,
        timestamp: new Date(),
        success: false,
        responseTime,
        error: errorMessage
      })

      return {
        source: this.config.name,
        data: null,
        timestamp: new Date(),
        success: false,
        error: errorMessage
      }
    }
  }

  public getRateLimit(): { remaining: number; resetTime: Date; perHour: number } {
    return {
      remaining: this.config.rateLimit.perHour - this.requestCount,
      resetTime: this.hourlyResetTime,
      perHour: this.config.rateLimit.perHour
    }
  }

  // Abstract method to be implemented by specific API sources
  protected abstract parseResponse(data: any, endpoint: string, params: Record<string, any>): Promise<any>
}

// YouTube Data API v3 implementation
class YouTubeApiSource extends ApiSource {
  protected async parseResponse(data: any, endpoint: string, params: Record<string, any>): Promise<any> {
    if (endpoint.includes('search')) {
      return {
        videos: data.items?.map((item: any) => ({
          id: item.id?.videoId,
          title: item.snippet?.title,
          description: item.snippet?.description,
          channelTitle: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
          thumbnails: item.snippet?.thumbnails
        })) || []
      }
    }
    
    if (endpoint.includes('videos')) {
      return {
        videos: data.items?.map((item: any) => ({
          id: item.id,
          title: item.snippet?.title,
          description: item.snippet?.description,
          channelTitle: item.snippet?.channelTitle,
          publishedAt: item.snippet?.publishedAt,
          viewCount: item.statistics?.viewCount,
          likeCount: item.statistics?.likeCount,
          commentCount: item.statistics?.commentCount
        })) || []
      }
    }

    return data
  }
}

// NewsAPI implementation
class NewsApiSource extends ApiSource {
  protected async parseResponse(data: any, endpoint: string, params: Record<string, any>): Promise<any> {
    return {
      articles: data.articles?.map((article: any) => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        source: article.source?.name,
        author: article.author,
        publishedAt: article.publishedAt,
        urlToImage: article.urlToImage
      })) || [],
      totalResults: data.totalResults
    }
  }
}

// Reddit API implementation (using OAuth)
class RedditApiSource extends ApiSource {
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  protected async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    // Reddit OAuth requires client credentials
    const clientId = process.env.REDDIT_CLIENT_ID
    const clientSecret = process.env.REDDIT_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      throw new Error('Reddit API credentials not configured')
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WordmapZeitgeist/1.0'
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      throw new Error(`Reddit OAuth failed: ${response.status}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))
    
    return this.accessToken
  }

  protected buildAuthHeaders(): Record<string, string> {
    const headers = super.buildAuthHeaders()
    // OAuth token will be added in fetch method
    return headers
  }

  public async fetch(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse> {
    try {
      const token = await this.getAccessToken()
      const headers = {
        ...this.buildAuthHeaders(),
        'Authorization': `Bearer ${token}`
      }

      await this.enforceRateLimit()
      
      const url = this.buildUrl(endpoint, params)
      const startTime = Date.now()
      
      const response = await fetch(url, { headers })
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const parsedData = await this.parseResponse(data, endpoint, params)

      ApiManager.logRequest({
        source: this.config.name,
        endpoint,
        timestamp: new Date(),
        success: true,
        responseTime
      })

      return {
        source: this.config.name,
        data: parsedData,
        timestamp: new Date(),
        success: true
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ ${this.config.name}: Request failed - ${errorMessage}`)
      
      return {
        source: this.config.name,
        data: null,
        timestamp: new Date(),
        success: false,
        error: errorMessage
      }
    }
  }

  protected async parseResponse(data: any, endpoint: string, params: Record<string, any>): Promise<any> {
    if (data.data?.children) {
      return {
        posts: data.data.children.map((child: any) => ({
          id: child.data.id,
          title: child.data.title,
          selftext: child.data.selftext,
          url: child.data.url,
          subreddit: child.data.subreddit,
          author: child.data.author,
          score: child.data.score,
          num_comments: child.data.num_comments,
          created_utc: child.data.created_utc,
          permalink: `https://reddit.com${child.data.permalink}`
        }))
      }
    }
    return data
  }
}

// Twitter API v2 implementation
class TwitterApiSource extends ApiSource {
  protected async parseResponse(data: any, endpoint: string, params: Record<string, any>): Promise<any> {
    // Handle different Twitter API v2 endpoints
    if (endpoint.includes('tweets/search') || endpoint.includes('tweets/sample')) {
      return {
        tweets: data.data?.map((tweet: any) => ({
          id: tweet.id,
          text: tweet.text,
          author_id: tweet.author_id,
          created_at: tweet.created_at,
          public_metrics: tweet.public_metrics,
          context_annotations: tweet.context_annotations,
          entities: tweet.entities,
          referenced_tweets: tweet.referenced_tweets
        })) || [],
        includes: data.includes,
        meta: data.meta
      }
    }

    if (endpoint.includes('users/by')) {
      return {
        users: data.data?.map((user: any) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          description: user.description,
          public_metrics: user.public_metrics,
          verified: user.verified,
          created_at: user.created_at
        })) || []
      }
    }

    if (endpoint.includes('tweets') && data.data && !Array.isArray(data.data)) {
      // Single tweet lookup
      return {
        tweet: {
          id: data.data.id,
          text: data.data.text,
          author_id: data.data.author_id,
          created_at: data.data.created_at,
          public_metrics: data.data.public_metrics,
          context_annotations: data.data.context_annotations,
          entities: data.data.entities
        },
        includes: data.includes
      }
    }

    return data
  }
}

export class ApiManager {
  private sources: Map<string, ApiSource> = new Map()
  private static requestLogs: RequestLog[] = []
  private static readonly MAX_LOGS = 1000

  constructor() {
    this.initializeDefaultSources()
  }

  private initializeDefaultSources() {
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
      
      this.sources.set('youtube', new YouTubeApiSource(youtubeConfig, process.env.YOUTUBE_API_KEY))
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
      
      this.sources.set('newsapi', new NewsApiSource(newsApiConfig, process.env.NEWSAPI_KEY))
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
      
      this.sources.set('reddit', new RedditApiSource(redditConfig, ''))
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
      
      this.sources.set('twitter', new TwitterApiSource(twitterConfig, process.env.TWITTER_BEARER_TOKEN))
      console.log('✅ Twitter API source initialized')
    } else {
      console.log('⚠️  Twitter Bearer Token not found - skipping initialization')
    }

    console.log(`🔧 API Manager initialized with ${this.sources.size} sources`)
  }

  public registerSource(sourceId: string, config: ApiConfig, apiKey: string, customParser?: (data: any, endpoint: string, params: any) => Promise<any>): void {
    class CustomApiSource extends ApiSource {
      private customParseResponse?: (data: any, endpoint: string, params: any) => Promise<any>

      constructor(config: ApiConfig, apiKey: string, parser?: (data: any, endpoint: string, params: any) => Promise<any>) {
        super(config, apiKey)
        this.customParseResponse = parser
      }

      protected async parseResponse(data: any, endpoint: string, params: Record<string, any>): Promise<any> {
        if (this.customParseResponse) {
          return await this.customParseResponse(data, endpoint, params)
        }
        return data
      }
    }

    this.sources.set(sourceId, new CustomApiSource(config, apiKey, customParser))
    console.log(`✅ Custom API source '${sourceId}' registered`)
  }

  public async scrapeApi(sourceId: string, endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse> {
    const source = this.sources.get(sourceId)
    
    if (!source) {
      throw new Error(`API source '${sourceId}' not found. Available sources: ${Array.from(this.sources.keys()).join(', ')}`)
    }

    console.log(`🚀 Scraping ${sourceId}: ${endpoint}`)
    return await source.fetch(endpoint, params)
  }

  public getSourceInfo(sourceId: string): { config: ApiConfig; rateLimit: any } | null {
    const source = this.sources.get(sourceId)
    if (!source) return null

    return {
      config: (source as any).config,
      rateLimit: source.getRateLimit()
    }
  }

  public getAllSources(): string[] {
    return Array.from(this.sources.keys())
  }

  public static logRequest(log: RequestLog): void {
    this.requestLogs.push(log)
    
    // Keep only the last MAX_LOGS entries
    if (this.requestLogs.length > this.MAX_LOGS) {
      this.requestLogs = this.requestLogs.slice(-this.MAX_LOGS)
    }

    // Console log for monitoring
    const status = log.success ? '✅' : '❌'
    console.log(`${status} ${log.source}: ${log.endpoint} (${log.responseTime}ms)${log.error ? ` - ${log.error}` : ''}`)
  }

  public static getRequestLogs(sourceId?: string, limit: number = 100): RequestLog[] {
    let logs = this.requestLogs
    
    if (sourceId) {
      logs = logs.filter(log => log.source === sourceId)
    }
    
    return logs.slice(-limit).reverse() // Most recent first
  }

  public static getRequestStats(sourceId?: string): {
    total: number
    successful: number
    failed: number
    averageResponseTime: number
    lastHour: number
  } {
    let logs = this.requestLogs
    
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
}

// Export singleton instance
export const apiManager = new ApiManager()