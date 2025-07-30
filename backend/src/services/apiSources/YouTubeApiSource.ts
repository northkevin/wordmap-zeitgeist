import { ApiSource } from '../ApiSource.js'
import { YouTubeSearchResponse, YouTubeVideo } from '../../types/api.types.js'

// YouTube API raw response types
interface YouTubeApiItem {
  id?: {
    videoId?: string
  } | string
  snippet?: {
    title?: string
    description?: string
    channelTitle?: string
    publishedAt?: string
    thumbnails?: Record<string, {
      url: string
      width: number
      height: number
    }>
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
}

interface YouTubeApiResponse {
  items?: YouTubeApiItem[]
}

export class YouTubeApiSource extends ApiSource<YouTubeSearchResponse> {
  protected async parseResponse(data: unknown, endpoint: string, _params: Record<string, string>): Promise<YouTubeSearchResponse> {
    const apiResponse = data as YouTubeApiResponse
    
    if (endpoint.includes('search')) {
      return {
        videos: apiResponse.items?.map((item): YouTubeVideo => ({
          id: typeof item.id === 'object' ? item.id.videoId || '' : '',
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          channelTitle: item.snippet?.channelTitle || '',
          publishedAt: item.snippet?.publishedAt || '',
          thumbnails: item.snippet?.thumbnails
        })) || []
      }
    }
    
    if (endpoint.includes('videos')) {
      return {
        videos: apiResponse.items?.map((item): YouTubeVideo => ({
          id: typeof item.id === 'string' ? item.id : '',
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          channelTitle: item.snippet?.channelTitle || '',
          publishedAt: item.snippet?.publishedAt || '',
          thumbnails: item.snippet?.thumbnails,
          viewCount: item.statistics?.viewCount,
          likeCount: item.statistics?.likeCount,
          commentCount: item.statistics?.commentCount
        })) || []
      }
    }

    return { videos: [] }
  }
}