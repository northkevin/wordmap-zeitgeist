import { SupabaseClient } from '@supabase/supabase-js'
import { processWords } from './wordProcessor.js'

interface RSSFeed {
  url: string
  source: string
}

const RSS_FEEDS: RSSFeed[] = [
  { url: 'https://hnrss.org/frontpage', source: 'Hacker News' },
  { url: 'https://feeds.feedburner.com/TechCrunch', source: 'TechCrunch' },
  { url: 'http://feeds.bbci.co.uk/news/rss.xml', source: 'BBC News' },
  { url: 'https://dev.to/feed', source: 'Dev.to' }
]

interface ParsedItem {
  title: string
  content: string
  url: string
  source: string
}

export async function scrapeRSSFeeds(supabase: SupabaseClient) {
  const allItems: ParsedItem[] = []
  const results = {
    totalFeeds: RSS_FEEDS.length,
    successfulFeeds: 0,
    totalItems: 0,
    errors: [] as string[]
  }

  for (const feed of RSS_FEEDS) {
    try {
      console.log(`Fetching ${feed.source}...`)
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Wordmap-Zeitgeist/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const xmlText = await response.text()
      const items = parseRSSFeed(xmlText, feed.source)
      
      allItems.push(...items)
      results.successfulFeeds++
      results.totalItems += items.length
      
      console.log(`✅ ${feed.source}: ${items.length} items`)
    } catch (error) {
      const errorMsg = `${feed.source}: ${error instanceof Error ? error.message : 'Unknown error'}`
      console.error(`❌ ${errorMsg}`)
      results.errors.push(errorMsg)
    }
  }

  // Save posts to database
  if (allItems.length > 0) {
    try {
      const { error } = await supabase
        .from('posts')
        .insert(allItems.map(item => ({
          source: item.source,
          title: item.title,
          content: item.content,
          url: item.url,
          scraped_at: new Date().toISOString()
        })))

      if (error) {
        console.error('Database insert error:', error)
        results.errors.push(`Database error: ${error.message}`)
      } else {
        console.log(`💾 Saved ${allItems.length} posts to database`)
      }
    } catch (error) {
      console.error('Database error:', error)
      results.errors.push(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Process words
    try {
      const wordStats = await processWords(supabase, allItems)
      console.log(`🔤 Processed ${wordStats.totalWords} words, ${wordStats.uniqueWords} unique`)
    } catch (error) {
      console.error('Word processing error:', error)
      results.errors.push(`Word processing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}

function parseRSSFeed(xmlText: string, source: string): ParsedItem[] {
  const items: ParsedItem[] = []
  
  try {
    // Simple regex-based XML parsing for RSS items
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi
    const titleRegex = /<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i
    const descRegex = /<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i
    const linkRegex = /<link[^>]*>(.*?)<\/link>/i
    const contentRegex = /<content:encoded[^>]*><!\[CDATA\[(.*?)\]\]><\/content:encoded>/i

    let match
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1]
      
      const titleMatch = titleRegex.exec(itemXml)
      const descMatch = descRegex.exec(itemXml)
      const linkMatch = linkRegex.exec(itemXml)
      const contentMatch = contentRegex.exec(itemXml)
      
      const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim()
      const description = (descMatch?.[1] || descMatch?.[2] || '').trim()
      const content = (contentMatch?.[1] || description).trim()
      const url = (linkMatch?.[1] || '').trim()
      
      if (title && content) {
        items.push({
          title: cleanText(title),
          content: cleanText(content),
          url: cleanText(url),
          source
        })
      }
    }
  } catch (error) {
    console.error(`Error parsing RSS for ${source}:`, error)
  }
  
  return items
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[^;]+;/g, ' ') // Remove HTML entities
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}