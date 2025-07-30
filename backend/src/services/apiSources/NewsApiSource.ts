import { ApiSource } from '../ApiSource.js'
import { NewsApiResponse, NewsArticle } from '../../types/api.types.js'

export class NewsApiSource extends ApiSource<NewsApiResponse> {
  protected async parseResponse(data: unknown, _endpoint: string, _params: Record<string, string>): Promise<NewsApiResponse> {
    const apiData = data as NewsApiResponse
    
    return {
      status: apiData.status || 'ok',
      totalResults: apiData.totalResults || 0,
      articles: apiData.articles?.map((article): NewsArticle => ({
        source: {
          id: article.source?.id || null,
          name: article.source?.name || 'Unknown'
        },
        author: article.author || null,
        title: article.title || '',
        description: article.description || null,
        url: article.url || '',
        urlToImage: article.urlToImage || null,
        publishedAt: article.publishedAt || new Date().toISOString(),
        content: article.content || null
      })) || []
    }
  }
}