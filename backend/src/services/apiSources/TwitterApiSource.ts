import { ApiSource } from '../ApiSource.js'
import { TwitterResponse, Tweet, TwitterUser } from '../../types/api.types.js'

// Twitter API v2 raw response types
interface TwitterApiTweet {
  id: string
  text: string
  author_id?: string
  created_at?: string
  public_metrics?: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
  }
  context_annotations?: Array<{
    domain: { id: string; name: string; description?: string }
    entity: { id: string; name: string; description?: string }
  }>
  entities?: Record<string, unknown>
  referenced_tweets?: Array<{
    type: string
    id: string
  }>
}

interface TwitterApiUser {
  id: string
  name: string
  username: string
  created_at?: string
  description?: string
  public_metrics?: {
    followers_count: number
    following_count: number
    tweet_count: number
    listed_count: number
  }
  verified?: boolean
}

interface TwitterApiResponse {
  data?: TwitterApiTweet[] | TwitterApiUser[]
  includes?: {
    users?: TwitterApiUser[]
  }
  meta?: Record<string, unknown>
}

export class TwitterApiSource extends ApiSource<TwitterResponse> {
  protected async parseResponse(data: unknown, endpoint: string, _params: Record<string, string>): Promise<TwitterResponse> {
    const apiResponse = data as TwitterApiResponse
    
    // Handle different Twitter API v2 endpoints
    if (endpoint.includes('tweets/search') || endpoint.includes('tweets/sample')) {
      const tweets = apiResponse.data as TwitterApiTweet[] | undefined
      return {
        tweets: tweets?.map((tweet): Tweet => ({
          id: tweet.id,
          text: tweet.text,
          created_at: tweet.created_at || new Date().toISOString(),
          author_id: tweet.author_id || '',
          public_metrics: tweet.public_metrics
        })) || [],
        users: apiResponse.includes?.users?.map((user): TwitterUser => ({
          id: user.id,
          name: user.name,
          username: user.username
        }))
      }
    }

    if (endpoint.includes('users')) {
      const users = apiResponse.data as TwitterApiUser[] | undefined
      return {
        tweets: [],
        users: users?.map((user): TwitterUser => ({
          id: user.id,
          name: user.name,
          username: user.username
        })) || []
      }
    }

    return { tweets: [] }
  }
}