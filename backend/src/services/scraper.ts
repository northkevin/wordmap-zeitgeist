interface RSSFeed {
  url: string
  source: string
}

interface Post {
  source: string
  title: string
  content: string
  url: string
}

const RSS_FEEDS: RSSFeed[] = [
  { url: 'https://feeds.feedburner.com/oreilly/radar', source: 'O\'Reilly Radar' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch' },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired' },
  { url: 'https://rss.cnn.com/rss/edition.rss', source: 'CNN' },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News' },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News' }
]

export async function scrapeRSSFeeds(): Promise<Post[]> {
  const posts: Post[] = []
  
  for (const feed of RSS_FEEDS) {
    try {
      console.log(`Scraping ${feed.source}...`)
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WordmapBot/1.0)'
        }
      })
      
      if (!response.ok) {
        console.warn(`Failed to fetch ${feed.source}: ${response.status}`)
        continue
      }
      
      const xmlText = await response.text()
      const feedPosts = parseRSSFeed(xmlText, feed.source)
      posts.push(...feedPosts)
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      console.error(`Error scraping ${feed.source}:`, error)
    }
  }
  
  return posts
}

function parseRSSFeed(xmlText: string, source: string): Post[] {
  const posts: Post[] = []
  
  try {
    // Simple XML parsing for RSS items
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const titleRegex = /<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i
    const descriptionRegex = /<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i
    const linkRegex = /<link[^>]*>(.*?)<\/link>/i
    
    let match
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1]
      
      const titleMatch = titleRegex.exec(itemXml)
      const descMatch = descriptionRegex.exec(itemXml)
      const linkMatch = linkRegex.exec(itemXml)
      
      const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim()
      const description = (descMatch?.[1] || descMatch?.[2] || '').trim()
      const url = (linkMatch?.[1] || '').trim()
      
      if (title) {
        posts.push({
          source,
          title: cleanText(title),
          content: cleanText(description),
          url: cleanText(url)
        })
      }
    }
  } catch (error) {
    console.error(`Error parsing RSS for ${source}:`, error)
  }
  
  return posts
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, ' ') // Remove HTML entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}