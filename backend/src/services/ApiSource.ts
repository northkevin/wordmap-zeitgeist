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

export abstract class ApiSource {
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
      intervalCap: 1
    })
  }

  protected abstract parseResponse(data: any, endpoint: string, params: Record<string, any>): Promise<any>

  protected buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(`${this.config.baseUrl}${endpoint}`)
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value))
      }
    })

    // Add API key if auth type is query
    if (this.config.authType === 'query' && this.config.keyParam) {
      url.searchParams.append(this.config.keyParam, this.apiKey)
    }

    return url.toString()
  }

  protected getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.config.defaultHeaders
    }

    // Add API key if auth type is header
    if (this.config.authType === 'header' && this.config.headerName) {
      headers[this.config.headerName] = this.apiKey
    } else if (this.config.authType === 'bearer') {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  protected async checkRateLimit(): Promise<void> {
    const now = new Date()
    
    // Reset hourly counter if needed
    if (now.getTime() - this.hourlyResetTime.getTime() >= 3600000) {
      this.requestCount = 0
      this.hourlyResetTime = now
    }

    // Check if we've exceeded hourly limit
    if (this.requestCount >= this.config.rateLimit.perHour) {
      const waitTime = 3600000 - (now.getTime() - this.hourlyResetTime.getTime())
      throw new Error(`Rate limit exceeded. Wait ${Math.ceil(waitTime / 60000)} minutes.`)
    }
  }

  public async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<ApiResponse> {
    const startTime = Date.now()
    const log: RequestLog = {
      source: this.config.name,
      endpoint,
      timestamp: new Date(),
      success: false,
      responseTime: 0
    }

    try {
      // Check rate limit before making request
      await this.checkRateLimit()

      // Queue the request
      const response = await this.queue.add(async () => {
        const url = this.buildUrl(endpoint, params)
        const headers = this.getHeaders()

        const res = await fetch(url, { headers })
        this.requestCount++
        this.lastRequestTime = new Date()

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`)
        }

        return res.json()
      })

      // Parse response using source-specific logic
      const parsedData = await this.parseResponse(response, endpoint, params)

      log.success = true
      log.responseTime = Date.now() - startTime

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
      log.error = error instanceof Error ? error.message : 'Unknown error'
      log.responseTime = Date.now() - startTime

      return {
        source: this.config.name,
        data: null,
        timestamp: new Date(),
        success: false,
        error: log.error
      }
    }
  }

  public getStats() {
    return {
      source: this.config.name,
      requestCount: this.requestCount,
      lastRequestTime: this.lastRequestTime,
      hourlyResetTime: this.hourlyResetTime,
      remainingRequests: this.config.rateLimit.perHour - this.requestCount
    }
  }
}