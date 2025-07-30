import { ApiSource } from '../apiManager.js'

export class YouTubeApiSource extends ApiSource {
  protected async parseResponse(data: any, endpoint: string, _params: Record<string, any>): Promise<any> {
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