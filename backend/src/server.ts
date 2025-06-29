import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { scrapeRSSFeeds } from './services/scraper.js'
import { processWords } from './services/wordProcessor.js'
import { apiManager } from './services/apiManager.js'

// Load environment variables
dotenv.config()

const app = express()
const port = process.env.PORT || 3001

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Database validation function
async function validateDatabase() {
  console.log('🔍 Validating database connection and tables...')
  
  try {
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('words')
      .select('count(*)')
      .limit(1)
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    
    // Validate and count records in each crucial table
    const tables = [
      { name: 'words', description: 'Word frequency data' },
      { name: 'posts', description: 'Scraped posts' },
      { name: 'word_sources', description: 'Source-specific word counts' },
      { name: 'test_words', description: 'Test words (legacy)' }
    ]
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table.name)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          console.warn(`⚠️  Table '${table.name}' validation failed:`, error.message)
        } else {
          console.log(`📊 Table '${table.name}' (${table.description}): ${count || 0} records`)
        }
      } catch (tableError) {
        console.warn(`⚠️  Could not validate table '${table.name}':`, tableError)
      }
    }
    
    // Test RLS policies by trying to read as public user
    console.log('🔒 Testing Row Level Security policies...')
    
    const publicSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY || 'missing'
    )
    
    try {
      const { data: publicWords, error: publicError } = await publicSupabase
        .from('words')
        .select('word, count')
        .limit(5)
      
      if (publicError) {
        console.warn('⚠️  Public access test failed (this might be expected):', publicError.message)
      } else {
        console.log(`✅ Public read access working: ${publicWords?.length || 0} sample words accessible`)
      }
    } catch (rlsError) {
      console.warn('⚠️  RLS test failed:', rlsError)
    }
    
    // Get some sample data to verify content
    console.log('📝 Fetching sample data...')
    
    const { data: sampleWords, error: sampleError } = await supabase
      .from('words')
      .select('word, count, last_seen')
      .order('count', { ascending: false })
      .limit(5)
    
    if (sampleError) {
      console.warn('⚠️  Could not fetch sample words:', sampleError.message)
    } else if (sampleWords && sampleWords.length > 0) {
      console.log('🏆 Top words in database:')
      sampleWords.forEach((word, index) => {
        console.log(`   ${index + 1}. "${word.word}" (${word.count} mentions)`)
      })
    } else {
      console.log('📝 No words found in database yet')
    }
    
    const { data: recentPosts, error: postsError } = await supabase
      .from('posts')
      .select('source, title, scraped_at')
      .order('scraped_at', { ascending: false })
      .limit(3)
    
    if (postsError) {
      console.warn('⚠️  Could not fetch sample posts:', postsError.message)
    } else if (recentPosts && recentPosts.length > 0) {
      console.log('📰 Recent posts in database:')
      recentPosts.forEach((post, index) => {
        const date = new Date(post.scraped_at).toLocaleString()
        console.log(`   ${index + 1}. [${post.source}] "${post.title.substring(0, 60)}..." (${date})`)
      })
    } else {
      console.log('📰 No posts found in database yet')
    }

    // Test source statistics view
    try {
      const { data: sourceStats, error: sourceStatsError } = await supabase
        .from('source_stats')
        .select('*')
        .limit(5)
      
      if (sourceStatsError) {
        console.warn('⚠️  Could not fetch source statistics:', sourceStatsError.message)
      } else if (sourceStats && sourceStats.length > 0) {
        console.log('📊 Top sources by word count:')
        sourceStats.forEach((stat, index) => {
          console.log(`   ${index + 1}. ${stat.source}: ${stat.total_word_count} words (${stat.unique_words} unique)`)
        })
      } else {
        console.log('📊 No source statistics available yet')
      }
    } catch (sourceError) {
      console.warn('⚠️  Source statistics test failed:', sourceError)
    }
    
    console.log('✅ Database validation complete')
    return true
    
  } catch (error) {
    console.error('❌ Database validation failed:', error)
    return false
  }
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString()
  const method = req.method
  const url = req.url
  const userAgent = req.get('User-Agent') || 'unknown'
  const ip = req.ip || req.connection.remoteAddress || 'unknown'
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`)
  
  // Log response when it finishes
  const originalSend = res.send
  res.send = function(data) {
    console.log(`[${timestamp}] ${method} ${url} - Response: ${res.statusCode}`)
    return originalSend.call(this, data)
  }
  
  next()
})

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested')
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Get words endpoint
app.get('/api/words', async (req, res) => {
  console.log('Words endpoint requested')
  try {
    const limit = parseInt(req.query.limit as string) || 100
    console.log(`Fetching top ${limit} words from database`)
    
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .order('count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch words' })
    }

    console.log(`Successfully fetched ${words?.length || 0} words`)
    res.json({ words: words || [] })
  } catch (error) {
    console.error('Server error in /api/words:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get source statistics endpoint
app.get('/api/sources', async (req, res) => {
  console.log('Source statistics endpoint requested')
  try {
    const { data: sources, error } = await supabase
      .from('source_stats')
      .select('*')
      .order('total_word_count', { ascending: false })

    if (error) {
      console.error('Database error fetching sources:', error)
      return res.status(500).json({ error: 'Failed to fetch source statistics' })
    }

    console.log(`Successfully fetched statistics for ${sources?.length || 0} sources`)
    res.json({ sources: sources || [] })
  } catch (error) {
    console.error('Server error in /api/sources:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// API Manager endpoints
app.get('/api/manager/sources', (req, res) => {
  console.log('API Manager sources requested')
  try {
    const sources = apiManager.getAllSources()
    const sourceInfo = sources.map(sourceId => {
      const info = apiManager.getSourceInfo(sourceId)
      return {
        id: sourceId,
        name: info?.config.name,
        rateLimit: info?.rateLimit
      }
    })
    
    res.json({ sources: sourceInfo })
  } catch (error) {
    console.error('Error fetching API sources:', error)
    res.status(500).json({ error: 'Failed to fetch API sources' })
  }
})

app.get('/api/manager/logs', (req, res) => {
  console.log('API Manager logs requested')
  try {
    const sourceId = req.query.source as string
    const limit = parseInt(req.query.limit as string) || 100
    
    const logs = apiManager.constructor.getRequestLogs(sourceId, limit)
    const stats = apiManager.constructor.getRequestStats(sourceId)
    
    res.json({ logs, stats })
  } catch (error) {
    console.error('Error fetching API logs:', error)
    res.status(500).json({ error: 'Failed to fetch API logs' })
  }
})

app.post('/api/manager/scrape', async (req, res) => {
  console.log('API Manager scrape requested')
  try {
    const { secret, source, endpoint, params } = req.body
    
    if (secret !== process.env.SCRAPE_SECRET) {
      console.warn('Unauthorized API scrape attempt')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!source || !endpoint) {
      return res.status(400).json({ error: 'Source and endpoint are required' })
    }

    console.log(`Starting API scrape: ${source}/${endpoint}`)
    const result = await apiManager.scrapeApi(source, endpoint, params || {})
    
    res.json({
      success: result.success,
      source: result.source,
      timestamp: result.timestamp,
      dataCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
      error: result.error
    })
  } catch (error) {
    console.error('API scraping error:', error)
    res.status(500).json({ error: 'API scraping failed' })
  }
})

// Scrape endpoint (protected)
app.post('/api/scrape', async (req, res) => {
  console.log('Scrape endpoint requested')
  try {
    const { secret } = req.body
    
    if (secret !== process.env.SCRAPE_SECRET) {
      console.warn('Unauthorized scrape attempt')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('Starting RSS scraping...')
    const posts = await scrapeRSSFeeds()
    console.log(`Scraped ${posts.length} posts`)

    if (posts.length > 0) {
      console.log('Processing words...')
      await processWords(posts, supabase)
      console.log('Word processing complete')
    }

    res.json({ 
      success: true, 
      postsScraped: posts.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Scraping error:', error)
    res.status(500).json({ error: 'Scraping failed' })
  }
})

// Catch-all for unmatched routes
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ error: 'Route not found' })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Schedule RSS scraping every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  try {
    console.log('Scheduled scraping started...')
    const posts = await scrapeRSSFeeds()
    
    if (posts.length > 0) {
      await processWords(posts, supabase)
      console.log(`Scheduled scraping complete: ${posts.length} posts processed`)
    }
  } catch (error) {
    console.error('Scheduled scraping error:', error)
  }
})

// Startup function
async function startServer() {
  console.log('🚀 Starting Wordmap Zeitgeist Backend...')
  console.log('='.repeat(50))
  
  // Environment validation
  console.log('🔧 Environment Configuration:')
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`)
  console.log(`   PORT: ${port}`)
  console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ configured' : '❌ missing'}`)
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ configured' : '❌ missing'}`)
  console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ configured' : '⚠️  missing (optional)'}`)
  console.log(`   SCRAPE_SECRET: ${process.env.SCRAPE_SECRET ? '✅ configured' : '❌ missing'}`)
  
  // API Keys validation
  console.log('🔑 API Keys Configuration:')
  console.log(`   YOUTUBE_API_KEY: ${process.env.YOUTUBE_API_KEY ? '✅ configured' : '⚠️  missing (optional)'}`)
  console.log(`   NEWSAPI_KEY: ${process.env.NEWSAPI_KEY ? '✅ configured' : '⚠️  missing (optional)'}`)
  console.log(`   REDDIT_CLIENT_ID: ${process.env.REDDIT_CLIENT_ID ? '✅ configured' : '⚠️  missing (optional)'}`)
  console.log(`   REDDIT_CLIENT_SECRET: ${process.env.REDDIT_CLIENT_SECRET ? '✅ configured' : '⚠️  missing (optional)'}`)
  console.log(`   TWITTER_BEARER_TOKEN: ${process.env.TWITTER_BEARER_TOKEN ? '✅ configured' : '⚠️  missing (optional)'}`)
  
  // Validate database
  const dbValid = await validateDatabase()
  
  if (!dbValid) {
    console.error('❌ Database validation failed. Server may not function correctly.')
  }
  
  // Start the server
  app.listen(port, () => {
    console.log('='.repeat(50))
    console.log('🎉 Server Started Successfully!')
    console.log(`📍 Server running on port ${port}`)
    console.log(`🏥 Health check: http://localhost:${port}/health`)
    console.log(`📊 Words API: http://localhost:${port}/api/words`)
    console.log(`📈 Sources API: http://localhost:${port}/api/sources`)
    console.log(`🔄 Scrape API: http://localhost:${port}/api/scrape`)
    console.log(`🤖 API Manager: http://localhost:${port}/api/manager/*`)
    console.log(`⏰ Scheduled scraping: Every 30 minutes`)
    console.log('='.repeat(50))
    
    if (dbValid) {
      console.log('✅ All systems operational!')
    } else {
      console.log('⚠️  Server started but database issues detected')
    }
  })
}

// Start the server
startServer().catch(error => {
  console.error('❌ Failed to start server:', error)
  process.exit(1)
})