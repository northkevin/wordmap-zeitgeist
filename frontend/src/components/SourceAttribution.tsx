import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { WordData } from '../types'

interface Source {
  name: string
  icon: string
  url: string
  wordCount: number
}

interface SourceAttributionProps {
  words: WordData[]
  loading: boolean
}

const allSources: Omit<Source, 'wordCount'>[] = [
  {
    name: 'Hacker News',
    icon: 'hn',
    url: 'https://news.ycombinator.com'
  },
  {
    name: 'TechCrunch',
    icon: 'tc',
    url: 'https://techcrunch.com'
  },
  {
    name: 'BBC News',
    icon: 'bbc',
    url: 'https://bbc.com/news'
  },
  {
    name: 'Wired',
    icon: 'wired',
    url: 'https://wired.com'
  },
  {
    name: 'CNN',
    icon: 'cnn',
    url: 'https://cnn.com'
  },
  {
    name: "O'Reilly Radar",
    icon: 'oreilly',
    url: 'https://www.oreilly.com/radar/'
  }
]

const SourceIcon: React.FC<{ source: Omit<Source, 'wordCount'> }> = ({ source }) => {
  const iconComponents = {
    hn: (
      <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-sm">
        Y
      </div>
    ),
    tc: (
      <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs">
        TC
      </div>
    ),
    bbc: (
      <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs">
        BBC
      </div>
    ),
    wired: (
      <div className="w-8 h-8 bg-black border border-white rounded flex items-center justify-center text-white font-bold text-xs">
        W
      </div>
    ),
    cnn: (
      <div className="w-8 h-8 bg-red-700 rounded flex items-center justify-center text-white font-bold text-xs">
        CNN
      </div>
    ),
    oreilly: (
      <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
        O
      </div>
    )
  }

  return iconComponents[source.icon as keyof typeof iconComponents] || (
    <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center text-white font-bold text-xs">
      ?
    </div>
  )
}

const SourceAttribution: React.FC<SourceAttributionProps> = ({ words, loading }) => {
  const { visibleSources, hiddenCount } = useMemo(() => {
    if (loading || !words.length) {
      // Show all sources with 0 count when loading or no data
      const sources = allSources.map(source => ({ ...source, wordCount: 0 }))
      return { visibleSources: sources.slice(0, 6), hiddenCount: 0 }
    }

    // In a real implementation, you would need to track which words came from which sources
    // For now, we'll simulate this by distributing word counts across sources
    // This would be replaced with actual source tracking from your backend
    const totalWords = words.reduce((sum, word) => sum + word.count, 0)
    
    // Simulate source distribution (this would come from your actual data)
    const sourceDistribution = [
      { source: 'Hacker News', percentage: 0.25 },
      { source: 'TechCrunch', percentage: 0.20 },
      { source: 'BBC News', percentage: 0.18 },
      { source: 'Wired', percentage: 0.15 },
      { source: 'CNN', percentage: 0.12 },
      { source: "O'Reilly Radar", percentage: 0.10 }
    ]

    const sourcesWithCounts = allSources.map(source => {
      const distribution = sourceDistribution.find(d => d.source === source.name)
      const wordCount = Math.floor(totalWords * (distribution?.percentage || 0))
      return { ...source, wordCount }
    })

    // Sort by word count (descending)
    const sortedSources = sourcesWithCounts.sort((a, b) => b.wordCount - a.wordCount)

    // Determine how many sources can fit (responsive)
    const maxVisible = 6 // Adjust based on your design needs
    const visibleSources = sortedSources.slice(0, maxVisible)
    const hiddenCount = Math.max(0, sortedSources.length - maxVisible)

    return { visibleSources, hiddenCount }
  }, [words, loading])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="text-center py-6 mb-8"
    >
      <p className="text-gray-400 text-sm mb-6 font-medium">
        Aggregating from:
      </p>
      
      <div className="flex flex-wrap justify-center items-center gap-6 max-w-5xl mx-auto">
        {visibleSources.map((source, index) => (
          <motion.a
            key={source.name}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.4 + (index * 0.1),
              ease: "easeOut"
            }}
            whileHover={{ 
              opacity: 1, 
              scale: 1.1,
              transition: { duration: 0.2 }
            }}
            className="group flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-gray-800/30 transition-all duration-300 relative"
            title={`Visit ${source.name}${source.wordCount > 0 ? ` • ${source.wordCount.toLocaleString()} words` : ''}`}
          >
            <div className="relative">
              <SourceIcon source={source} />
              
              {/* Word count indicator */}
              {source.wordCount > 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + (index * 0.1) }}
                  className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
                >
                  {source.wordCount > 999 ? '1k+' : source.wordCount > 99 ? '99+' : source.wordCount}
                </motion.div>
              )}
            </div>
            
            <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300 font-medium text-center leading-tight">
              {source.name}
            </span>
            
            {/* Ranking indicator for top sources */}
            {index < 3 && source.wordCount > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 + (index * 0.1) }}
                className={`absolute -bottom-1 w-2 h-1 rounded-full ${
                  index === 0 ? 'bg-yellow-400' : 
                  index === 1 ? 'bg-gray-300' : 
                  'bg-orange-400'
                }`}
              />
            )}
          </motion.a>
        ))}
        
        {/* "+ X more" indicator */}
        {hiddenCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.4 + (visibleSources.length * 0.1),
              ease: "easeOut"
            }}
            className="flex flex-col items-center space-y-2 p-3 rounded-lg text-gray-500"
          >
            <div className="w-8 h-8 border-2 border-dashed border-gray-600 rounded flex items-center justify-center text-gray-500 font-bold text-xs">
              +{hiddenCount}
            </div>
            <span className="text-xs font-medium">
              more
            </span>
          </motion.div>
        )}
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.0 }}
        className="mt-6 text-xs text-gray-500"
      >
        {loading ? (
          'Loading source data...'
        ) : words.length > 0 ? (
          'Sources ordered by word contribution • Hover for details'
        ) : (
          'Real-time data aggregation from trusted news sources'
        )}
      </motion.div>
    </motion.div>
  )
}

export default SourceAttribution