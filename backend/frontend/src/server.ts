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

// Check for required environment variables
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables:')
  if (!supabaseUrl) console.error('  - SUPABASE_URL is not set')
  if (!supabaseServiceRoleKey) console.error('  - SUPABASE_SERVICE_ROLE_KEY is not set')
  console.error('\n📝 Please create a backend/.env file with your Supabase credentials:')
  console.error('   SUPABASE_URL=your_supabase_url')
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key')
  console.error('   SCRAPE_SECRET=your_scrape_secret')
  process.exit(1)
}

// Supabase client with service role key for backend operations
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

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