import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { scrapeRSSFeeds } from './services/scraper.js'
import { processWords } from './services/wordProcessor.js'

// Load environment variables
dotenv.config()

const app = express()
const port = process.env.PORT || 3001

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

app.listen(port, () => {
  console.log(`=== Wordmap Zeitgeist Backend ===`)
  console.log(`Server running on port ${port}`)
  console.log(`Health check: http://localhost:${port}/health`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? 'configured' : 'missing'}`)
  console.log(`Scrape secret: ${process.env.SCRAPE_SECRET ? 'configured' : 'missing'}`)
  console.log('=================================')
})