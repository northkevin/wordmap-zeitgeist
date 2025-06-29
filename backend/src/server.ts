import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { scrapeRSSFeeds } from './services/scraper.js'
import { getTopWords } from './services/wordProcessor.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Scrape RSS feeds endpoint
app.post('/api/scrape', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const expectedToken = `Bearer ${process.env.SCRAPE_SECRET}`
    
    if (!authHeader || authHeader !== expectedToken) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('Starting RSS scrape...')
    const result = await scrapeRSSFeeds(supabase)
    
    res.json({
      success: true,
      message: 'RSS feeds scraped successfully',
      ...result
    })
  } catch (error) {
    console.error('Scrape error:', error)
    res.status(500).json({ 
      error: 'Failed to scrape RSS feeds',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Get top words endpoint
app.get('/api/words', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100
    const words = await getTopWords(supabase, limit)
    
    res.json({
      success: true,
      words,
      count: words.length
    })
  } catch (error) {
    console.error('Get words error:', error)
    res.status(500).json({ 
      error: 'Failed to fetch words',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Wordmap Zeitgeist API ready`)
})