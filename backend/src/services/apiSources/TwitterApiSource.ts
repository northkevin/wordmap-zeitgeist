import { ApiSource } from '../ApiSource.js'

export class TwitterApiSource extends ApiSource {
  protected async parseResponse(data: any, endpoint: string, _params: Record<string, any>): Promise<any> {
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

    if (endpoint.includes('users')) {
      return {
        users: data.data?.map((user: any) => ({
          id: user.id,
          name: user.name,
          username: user.username,
          created_at: user.created_at,
          description: user.description,
          public_metrics: user.public_metrics,
          verified: user.verified
        })) || []
      }
    }

    return data
  }
}