import { ApiSource, ApiResponse } from '../ApiSource.js'
import { ApiConfig, RedditResponse, RedditPost, OAuthToken } from '../../types/api.types.js'

export class RedditApiSource extends ApiSource<RedditResponse> {
  private accessToken: string = ''
  private tokenExpiry: Date | null = null
  private clientId: string
  private clientSecret: string

  constructor(config: ApiConfig, apiKey: string) {
    super(config, apiKey)
    this.clientId = process.env.REDDIT_CLIENT_ID || ''
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || ''
  }

  private async ensureAccessToken(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error('Reddit API credentials not configured')
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    
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

    const data = await response.json() as OAuthToken
    
    if (!data.access_token) {
      throw new Error('Reddit OAuth response missing access token')
    }
    
    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))
  }

  protected getHeaders(): Record<string, string> {
    const headers = super.getHeaders()
    // Add the OAuth token
    headers['Authorization'] = `Bearer ${this.accessToken}`
    return headers
  }

  public async makeRequest(endpoint: string, params: Record<string, string> = {}): Promise<ApiResponse<RedditResponse>> {
    try {
      // Ensure we have a valid access token before making the request
      await this.ensureAccessToken()
      
      // Now call the parent class makeRequest which will use our getHeaders()
      return await super.makeRequest(endpoint, params)
    } catch (error) {
      // If it's an auth error, clear the token and retry once
      if (error instanceof Error && error.message.includes('401')) {
        this.accessToken = ''
        this.tokenExpiry = null
        await this.ensureAccessToken()
        return await super.makeRequest(endpoint, params)
      }
      throw error
    }
  }

  protected async parseResponse(data: unknown, _endpoint: string, _params: Record<string, string>): Promise<RedditResponse> {
    const redditData = data as {
      data?: {
        children?: Array<{
          data: {
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
        }>
      }
    }
    
    if (redditData.data?.children) {
      return {
        posts: redditData.data.children.map((child): RedditPost => ({
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
    return { posts: [] }
  }
}