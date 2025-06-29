interface RSSFeed {
  url: string
  source: string
  type?: 'rss' | 'atom' | 'reddit'
  retryCount?: number
}

interface Post {
  source: string
  title: string
  content: string
  url: string
}

interface ParsedFeed {
  posts: Post[]
  format: 'rss' | 'atom' | 'reddit' | 'unknown'
}

const RSS_FEEDS: RSSFeed[] = [
  // Original feeds
  { url: 'https://feeds.feedburner.com/oreilly/radar', source: 'O\'Reilly Radar', type: 'rss' },
  { url: 'https://techcrunch.com/feed/', source: 'TechCrunch', type: 'rss' },
  { url: 'https://www.wired.com/feed/rss', source: 'Wired', type: 'rss' },
  { url: 'https://rss.cnn.com/rss/edition.rss', source: 'CNN', type: 'rss' },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News', type: 'rss' },
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News', type: 'rss' },
  
  // New CNN feeds
  { url: 'http://rss.cnn.com/rss/cnn_topstories.rss', source: 'CNN Top Stories', type: 'rss' },
  { url: 'http://rss.cnn.com/rss/edition_world.rss', source: 'CNN World', type: 'rss' },
  
  // Guardian feeds
  { url: 'https://www.theguardian.com/uk/rss', source: 'The Guardian UK', type: 'rss' },
  { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian World', type: 'rss' },
  { url: 'https://www.theguardian.com/us-news/rss', source: 'The Guardian US', type: 'rss' },
  
  // NPR feed
  { url: 'https://feeds.npr.org/1001/rss.xml', source: 'NPR Main News', type: 'rss' },
  
  // Reddit feeds (special handling needed)
  { url: 'https://www.reddit.com/r/all/.rss', source: 'Reddit r/all', type: 'reddit' },
  { url: 'https://www.reddit.com/r/popular/.rss', source: 'Reddit r/popular', type: 'reddit' },
  { url: 'https://www.reddit.com/r/worldnews/.rss', source: 'Reddit r/worldnews', type: 'reddit' },
  { url: 'https://www.reddit.com/r/technology+science+programming/.rss', source: 'Reddit Tech Combined', type: 'reddit' }
]

const MAX_RETRIES = 3
const RETRY_DELAY = 5000 // 5 seconds
const RATE_LIMIT_DELAY = 2000 // 2 seconds between sources
const REQUEST_TIMEOUT = 30000 // 30 seconds

export async function scrapeRSSFeeds(): Promise<Post[]> {
  const posts: Post[] = []
  const failedFeeds: string[] = []
  
  console.log(`🔄 Starting RSS scraping for ${RSS_FEEDS.length} sources...`)
  
  for (let i = 0; i < RSS_FEEDS.length; i++) {
    const feed = RSS_FEEDS[i]
    
    try {
      console.log(`📡 [${i + 1}/${RSS_FEEDS.length}] Scraping ${feed.source}...`)
      
      const feedPosts = await scrapeFeedWithRetry(feed)
      posts.push(...feedPosts)
      
      console.log(`✅ ${feed.source}: ${feedPosts.length} posts scraped`)
      
      // Staggered rate limiting (2s between sources)
      if (i < RSS_FEEDS.length - 1) {
        console.log(`⏳ Rate limiting: waiting ${RATE_LIMIT_DELAY}ms...`)
        await sleep(RATE_LIMIT_DELAY)
      }
      
    } catch (error) {
      console.error(`❌ Failed to scrape ${feed.source} after ${MAX_RETRIES} retries:`, error)
      failedFeeds.push(feed.source)
    }
  }
  
  console.log(`🎉 RSS scraping complete: ${posts.length} total posts from ${RSS_FEEDS.length - failedFeeds.length}/${RSS_FEEDS.length} sources`)
  
  if (failedFeeds.length > 0) {
    console.warn(`⚠️  Failed sources: ${failedFeeds.join(', ')}`)
  }
  
  return posts
}

async function scrapeFeedWithRetry(feed: RSSFeed): Promise<Post[]> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)
      
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WordmapZeitgeistBot/1.0; +https://wordmap-zeitgeist.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*',
          'Accept-Encoding': 'gzip, deflate',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const xmlText = await response.text()
      
      if (!xmlText || xmlText.trim().length === 0) {
        throw new Error('Empty response body')
      }
      
      // Validate XML structure
      if (!isValidXML(xmlText)) {
        throw new Error('Invalid XML structure')
      }
      
      const parsedFeed = parseUniversalFeed(xmlText, feed.source, feed.type)
      
      if (parsedFeed.posts.length === 0) {
        console.warn(`⚠️  ${feed.source}: No posts found in feed (format: ${parsedFeed.format})`)
      }
      
      return parsedFeed.posts
      
    } catch (error) {
      lastError = error as Error
      
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * attempt // Exponential backoff
        console.warn(`⚠️  ${feed.source} attempt ${attempt}/${MAX_RETRIES} failed: ${lastError.message}. Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }
  
  throw lastError || new Error('Unknown error during feed scraping')
}

function parseUniversalFeed(xmlText: string, source: string, feedType?: string): ParsedFeed {
  try {
    // Detect feed format
    const format = detectFeedFormat(xmlText, feedType)
    
    switch (format) {
      case 'reddit':
        return { posts: parseRedditFeed(xmlText, source), format }
      case 'atom':
        return { posts: parseAtomFeed(xmlText, source), format }
      case 'rss':
      default:
        return { posts: parseRSSFeed(xmlText, source), format }
    }
  } catch (error) {
    console.error(`Error parsing feed for ${source}:`, error)
    return { posts: [], format: 'unknown' }
  }
}

function detectFeedFormat(xmlText: string, feedType?: string): 'rss' | 'atom' | 'reddit' {
  if (feedType === 'reddit') return 'reddit'
  
  // Check for Atom namespace
  if (xmlText.includes('xmlns="http://www.w3.org/2005/Atom"') || 
      xmlText.includes('<feed') || 
      xmlText.includes('<entry>')) {
    return 'atom'
  }
  
  // Default to RSS
  return 'rss'
}

function parseRSSFeed(xmlText: string, source: string): Post[] {
  const posts: Post[] = []
  
  try {
    // Enhanced RSS parsing with better regex patterns
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i
    const descriptionRegex = /<description[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/description>/i
    const contentRegex = /<content:encoded[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/content:encoded>/i
    const linkRegex = /<link[^>]*>([^<]*)<\/link>|<link[^>]*href=["']([^"']*)/i
    const guidRegex = /<guid[^>]*>([^<]*)<\/guid>/i
    
    let match
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1]
      
      const titleMatch = titleRegex.exec(itemXml)
      const descMatch = descriptionRegex.exec(itemXml)
      const contentMatch = contentRegex.exec(itemXml)
      const linkMatch = linkRegex.exec(itemXml)
      const guidMatch = guidRegex.exec(itemXml)
      
      const title = cleanText(titleMatch?.[1] || titleMatch?.[2] || '')
      const description = cleanText(descMatch?.[1] || descMatch?.[2] || '')
      const content = cleanText(contentMatch?.[1] || contentMatch?.[2] || '')
      const url = cleanText(linkMatch?.[1] || linkMatch?.[2] || guidMatch?.[1] || '')
      
      if (title && title.length > 0) {
        posts.push({
          source,
          title,
          content: content || description,
          url
        })
      }
    }
  } catch (error) {
    console.error(`Error parsing RSS for ${source}:`, error)
  }
  
  return posts
}

function parseAtomFeed(xmlText: string, source: string): Post[] {
  const posts: Post[] = []
  
  try {
    // Atom feed parsing
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i
    const summaryRegex = /<summary[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/summary>/i
    const contentRegex = /<content[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/content>/i
    const linkRegex = /<link[^>]*href=["']([^"']*)/i
    const idRegex = /<id[^>]*>([^<]*)<\/id>/i
    
    let match
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryXml = match[1]
      
      const titleMatch = titleRegex.exec(entryXml)
      const summaryMatch = summaryRegex.exec(entryXml)
      const contentMatch = contentRegex.exec(entryXml)
      const linkMatch = linkRegex.exec(entryXml)
      const idMatch = idRegex.exec(entryXml)
      
      const title = cleanText(titleMatch?.[1] || titleMatch?.[2] || '')
      const summary = cleanText(summaryMatch?.[1] || summaryMatch?.[2] || '')
      const content = cleanText(contentMatch?.[1] || contentMatch?.[2] || '')
      const url = cleanText(linkMatch?.[1] || idMatch?.[1] || '')
      
      if (title && title.length > 0) {
        posts.push({
          source,
          title,
          content: content || summary,
          url
        })
      }
    }
  } catch (error) {
    console.error(`Error parsing Atom for ${source}:`, error)
  }
  
  return posts
}

function parseRedditFeed(xmlText: string, source: string): Post[] {
  const posts: Post[] = []
  
  try {
    // Reddit RSS has special structure - it's RSS but with Reddit-specific fields
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi
    const titleRegex = /<title[^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/title>/i
    const contentRegex = /<content[^>]*type=["']html["'][^>]*>(?:<!\[CDATA\[(.*?)\]\]>|(.*?))<\/content>/i
    const linkRegex = /<link[^>]*href=["']([^"']*)/i
    const idRegex = /<id[^>]*>([^<]*)<\/id>/i
    const categoryRegex = /<category[^>]*term=["']([^"']*)/gi
    
    let match
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entryXml = match[1]
      
      const titleMatch = titleRegex.exec(entryXml)
      const contentMatch = contentRegex.exec(entryXml)
      const linkMatch = linkRegex.exec(entryXml)
      const idMatch = idRegex.exec(entryXml)
      
      let title = cleanText(titleMatch?.[1] || titleMatch?.[2] || '')
      const content = cleanText(contentMatch?.[1] || contentMatch?.[2] || '')
      const url = cleanText(linkMatch?.[1] || idMatch?.[1] || '')
      
      // Reddit titles often include subreddit info, clean it up
      title = title.replace(/^r\/[^:]+:\s*/, '') // Remove "r/subreddit: " prefix
      
      // Extract categories/tags for additional context
      const categories: string[] = []
      let categoryMatch
      while ((categoryMatch = categoryRegex.exec(entryXml)) !== null) {
        categories.push(categoryMatch[1])
      }
      
      if (title && title.length > 0) {
        posts.push({
          source,
          title,
          content: content || categories.join(' '), // Use categories as content if no description
          url
        })
      }
    }
  } catch (error) {
    console.error(`Error parsing Reddit feed for ${source}:`, error)
  }
  
  return posts
}

function isValidXML(xmlText: string): boolean {
  try {
    // Basic XML validation
    if (!xmlText.includes('<') || !xmlText.includes('>')) {
      return false
    }
    
    // Check for basic feed structure
    const hasRSSStructure = xmlText.includes('<rss') || xmlText.includes('<channel')
    const hasAtomStructure = xmlText.includes('<feed') || xmlText.includes('xmlns="http://www.w3.org/2005/Atom"')
    
    return hasRSSStructure || hasAtomStructure
  } catch {
    return false
  }
}

function cleanText(text: string): string {
  if (!text) return ''
  
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[^;]+;/g, ' ') // Remove other HTML entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}