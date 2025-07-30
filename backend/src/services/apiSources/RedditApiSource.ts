import { ApiSource, ApiResponse, ApiManager } from '../apiManager.js'

export class RedditApiSource extends ApiSource {
  private accessToken: string = ''
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
    
    if (!data.access_token) {
      throw new Error('Reddit OAuth response missing access token')
    }
    
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

  protected async parseResponse(data: any, _endpoint: string, _params: Record<string, any>): Promise<any> {
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