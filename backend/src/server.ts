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

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Get words endpoint
app.get('/api/words', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100
    
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .order('count', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: 'Failed to fetch words' })
    }

    res.json({ words: words || [] })
  } catch (error) {
    console.error('Server error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Scrape endpoint (protected)
app.post('/api/scrape', async (req, res) => {
  try {
    const { secret } = req.body
    
    if (secret !== process.env.SCRAPE_SECRET) {
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
  console.log(`Server running on port ${port}`)
  console.log(`Health check: http://localhost:${port}/health`)
})