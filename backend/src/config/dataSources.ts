/**
 * DATA SOURCE CONFIGURATION
 * 
 * This file controls which data sources are enabled/disabled for scraping.
 * Easily toggle sources on/off by changing the 'enabled' property.
 * 
 * SEARCH KEYWORDS FOR FUTURE REFERENCE:
 * - data-sources-config
 * - source-toggle-config  
 * - scraper-source-management
 * - api-source-management
 */

export interface DataSourceConfig {
  enabled: boolean
  name: string
  type: 'rss' | 'api'
  description: string
}

export interface RSSSourceConfig extends DataSourceConfig {
  type: 'rss'
  url: string
  feedType?: 'rss' | 'atom' | 'reddit'
}

export interface APISourceConfig extends DataSourceConfig {
  type: 'api'
  sourceId: string
  endpoint: string
  params?: Record<string, any>
  requiresCredentials: boolean
  credentialEnvVars?: string[]
}

// RSS FEED SOURCES CONFIGURATION
export const RSS_SOURCES: RSSSourceConfig[] = [
  // Tech feeds
  {
    enabled: true,
    name: 'TechCrunch',
    type: 'rss',
    description: 'Technology news and startup coverage',
    url: 'https://techcrunch.com/feed/',
    feedType: 'rss'
  },
  {
    enabled: true,
    name: 'Wired',
    type: 'rss', 
    description: 'Technology, science, culture news',
    url: 'https://www.wired.com/feed/rss',
    feedType: 'rss'
  },
  {
    enabled: true,
    name: 'BBC News',
    type: 'rss',
    description: 'Breaking news and world coverage',
    url: 'https://feeds.bbci.co.uk/news/rss.xml',
    feedType: 'rss'
  },
  {
    enabled: true,
    name: 'Hacker News',
    type: 'rss',
    description: 'Tech community discussions and links',
    url: 'https://hnrss.org/frontpage',
    feedType: 'rss'
  },

  // Guardian feeds
  {
    enabled: true,
    name: 'The Guardian UK',
    type: 'rss',
    description: 'UK news and current affairs',
    url: 'https://www.theguardian.com/uk/rss',
    feedType: 'rss'
  },
  {
    enabled: true,
    name: 'The Guardian World',
    type: 'rss',
    description: 'International news coverage',
    url: 'https://www.theguardian.com/world/rss',
    feedType: 'rss'
  },
  {
    enabled: true,
    name: 'The Guardian US',
    type: 'rss',
    description: 'US news and politics',
    url: 'https://www.theguardian.com/us-news/rss',
    feedType: 'rss'
  },

  // NPR feed
  {
    enabled: true,
    name: 'NPR Main News',
    type: 'rss',
    description: 'Public radio news coverage',
    url: 'https://feeds.npr.org/1001/rss.xml',
    feedType: 'rss'
  },

  // Reddit RSS feeds (RECOMMENDED - keep these enabled)
  {
    enabled: true,
    name: 'Reddit r/all',
    type: 'rss',
    description: 'Popular posts across all Reddit communities',
    url: 'https://www.reddit.com/r/all/.rss',
    feedType: 'reddit'
  },
  {
    enabled: true,
    name: 'Reddit r/popular',
    type: 'rss',
    description: 'Trending posts from popular subreddits',
    url: 'https://www.reddit.com/r/popular/.rss',
    feedType: 'reddit'
  },
  {
    enabled: true,
    name: 'Reddit r/worldnews',
    type: 'rss',
    description: 'World news discussions',
    url: 'https://www.reddit.com/r/worldnews/.rss',
    feedType: 'reddit'
  },
  {
    enabled: true,
    name: 'Reddit Tech Combined',
    type: 'rss',
    description: 'Technology discussions from multiple subreddits',
    url: 'https://www.reddit.com/r/technology+science+programming/.rss',
    feedType: 'reddit'
  }
]

// API SOURCES CONFIGURATION  
export const API_SOURCES: APISourceConfig[] = [
  // YouTube Data API
  {
    enabled: true,
    name: 'YouTube',
    type: 'api',
    description: 'Popular video content and trends',
    sourceId: 'youtube',
    endpoint: 'search',
    params: { part: 'snippet', type: 'video', order: 'relevance', maxResults: 50 },
    requiresCredentials: true,
    credentialEnvVars: ['YOUTUBE_API_KEY']
  },

  // NewsAPI.org
  {
    enabled: true,
    name: 'NewsAPI',
    type: 'api',
    description: 'News articles from various sources',
    sourceId: 'newsapi',
    endpoint: 'top-headlines',
    params: { country: 'us', pageSize: 100 },
    requiresCredentials: true,
    credentialEnvVars: ['NEWSAPI_KEY']
  },

  // Twitter/X API
  {
    enabled: true,
    name: 'Twitter',
    type: 'api',
    description: 'Trending tweets and social discussions',
    sourceId: 'twitter',
    endpoint: 'tweets/search/recent',
    params: { max_results: 100 },
    requiresCredentials: true,
    credentialEnvVars: ['TWITTER_BEARER_TOKEN']
  },

  // Reddit API (DISABLED - RSS feeds preferred)
  {
    enabled: false, // ← DISABLED per recommendation
    name: 'Reddit',
    type: 'api',
    description: 'Reddit hot posts (generic) - RSS feeds preferred for better source attribution',
    sourceId: 'reddit',
    endpoint: 'hot',
    params: { limit: 100 },
    requiresCredentials: true,
    credentialEnvVars: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET']
  }
]

// Helper functions for easy access
export function getEnabledRSSSources(): RSSSourceConfig[] {
  return RSS_SOURCES.filter(source => source.enabled)
}

export function getEnabledAPISources(): APISourceConfig[] {
  return API_SOURCES.filter(source => source.enabled)
}

export function getSourceByName(name: string): DataSourceConfig | undefined {
  return [...RSS_SOURCES, ...API_SOURCES].find(source => source.name === name)
}

export function isSourceEnabled(name: string): boolean {
  const source = getSourceByName(name)
  return source ? source.enabled : false
}

// Quick status logging
export function logDataSourceStatus(): void {
  console.log('📊 DATA SOURCE STATUS:')
  console.log(`   RSS Sources: ${getEnabledRSSSources().length}/${RSS_SOURCES.length} enabled`)
  console.log(`   API Sources: ${getEnabledAPISources().length}/${API_SOURCES.length} enabled`)
  
  const disabled = [...RSS_SOURCES, ...API_SOURCES].filter(s => !s.enabled)
  if (disabled.length > 0) {
    console.log(`   Disabled: ${disabled.map(s => s.name).join(', ')}`)
  }
}