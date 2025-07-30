import { ApiSource } from '../ApiSource.js'

export class NewsApiSource extends ApiSource {
  protected async parseResponse(data: any, _endpoint: string, _params: Record<string, any>): Promise<any> {
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