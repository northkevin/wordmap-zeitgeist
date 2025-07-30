import { ApiResponse } from './apiManager.js'

interface Post {
  source: string
  title: string
  content: string
  url: string
}

export function transformApiDataToPosts(apiResponse: ApiResponse): Post[] {
  if (!apiResponse.success || !apiResponse.data) {
    return []
  }

  const posts: Post[] = []

  switch (apiResponse.source) {
    case 'YouTube':
      if (apiResponse.data.videos && Array.isArray(apiResponse.data.videos)) {
        apiResponse.data.videos.forEach((video: any) => {
          if (video.title && (video.description || video.title)) {
            posts.push({
              source: 'YouTube',
              title: video.title,
              content: video.description || video.title,
              url: `https://www.youtube.com/watch?v=${video.id}`
            })
          }
        })
      }
      break

    case 'Twitter':
      if (apiResponse.data.tweets && Array.isArray(apiResponse.data.tweets)) {
        apiResponse.data.tweets.forEach((tweet: any) => {
          if (tweet.text) {
            posts.push({
              source: 'Twitter',
              title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
              content: tweet.text,
              url: `https://twitter.com/i/status/${tweet.id}`
            })
          }
        })
      }
      break

    case 'NewsAPI':
      if (apiResponse.data.articles && Array.isArray(apiResponse.data.articles)) {
        apiResponse.data.articles.forEach((article: any) => {
          if (article.title && (article.description || article.content)) {
            posts.push({
              source: 'NewsAPI',
              title: article.title,
              content: article.description || article.content || article.title,
              url: article.url
            })
          }
        })
      }
      break

    case 'Reddit':
      if (apiResponse.data.posts && Array.isArray(apiResponse.data.posts)) {
        apiResponse.data.posts.forEach((post: any) => {
          if (post.title) {
            posts.push({
              source: 'Reddit',
              title: post.title,
              content: post.selftext || post.title,
              url: post.permalink // Already includes full URL
            })
          }
        })
      }
      break

    default:
      console.warn(`No transformer defined for source: ${apiResponse.source}`)
  }

  console.log(`Transformed ${posts.length} posts from ${apiResponse.source}`)
  return posts
}

export function validatePost(post: Post): boolean {
  return !!(
    post.source &&
    post.title &&
    post.content &&
    post.url &&
    post.title.trim().length > 0 &&
    post.content.trim().length > 0
  )
}