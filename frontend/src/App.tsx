import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import WordMap from './components/WordMap'
import Header from './components/Header'
import Stats from './components/Stats'
import SourceAttribution from './components/SourceAttribution'
import ParticleBackground from './components/ParticleBackground'
import { WordData } from './types'

function App() {
  const [words, setWords] = useState<WordData[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchWords = async () => {
    try {
      // Use relative URL for API calls - will be proxied to backend in production
      const response = await fetch('/api/words')
      if (response.ok) {
        const data = await response.json()
        setWords(data.words || [])
        setLastUpdated(new Date())
      } else {
        console.error('Failed to fetch words:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Failed to fetch words:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWords()
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchWords, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10">
        <Header onRefresh={fetchWords} lastUpdated={lastUpdated} />
        
        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 text-gradient glow-text">
              Zeitgeist
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Capturing the pulse of the internet through real-time analysis of global conversations
            </p>
          </motion.div>

          <Stats words={words} loading={loading} />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-12"
          >
            <WordMap words={words} loading={loading} />
          </motion.div>

          <SourceAttribution />
        </main>
      </div>
    </div>
  )
}

export default App