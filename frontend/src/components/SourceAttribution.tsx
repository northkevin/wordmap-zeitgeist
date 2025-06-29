import React from 'react'
import { motion } from 'framer-motion'

interface Source {
  name: string
  icon: string
  url: string
}

const sources: Source[] = [
  {
    name: 'Hacker News',
    icon: 'https://news.ycombinator.com/favicon.ico',
    url: 'https://news.ycombinator.com'
  },
  {
    name: 'TechCrunch',
    icon: 'https://techcrunch.com/wp-content/uploads/2015/02/cropped-cropped-favicon-gradient.png',
    url: 'https://techcrunch.com'
  },
  {
    name: 'BBC News',
    icon: 'https://static.files.bbci.co.uk/ws/simorgh-assets/public/news/images/metadata/poster-1024x576.png',
    url: 'https://bbc.com/news'
  },
  {
    name: 'Wired',
    icon: 'https://www.wired.com/verso/static/wired/assets/favicon.ico',
    url: 'https://wired.com'
  },
  {
    name: 'CNN',
    icon: 'https://cdn.cnn.com/cnn/.e/img/3.0/global/misc/cnn-logo.png',
    url: 'https://cnn.com'
  },
  {
    name: "O'Reilly Radar",
    icon: 'https://www.oreilly.com/favicon.ico',
    url: 'https://www.oreilly.com/radar/'
  }
]

const SourceAttribution: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.5 }}
      className="text-center py-8"
    >
      <p className="text-gray-400 text-sm mb-6 font-medium">
        Aggregating from:
      </p>
      
      <div className="flex flex-wrap justify-center items-center gap-8 max-w-4xl mx-auto">
        {sources.map((source, index) => (
          <motion.a
            key={source.name}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{ 
              duration: 0.6, 
              delay: 0.7 + (index * 0.1),
              ease: "easeOut"
            }}
            whileHover={{ 
              opacity: 1, 
              scale: 1.1,
              transition: { duration: 0.2 }
            }}
            className="group flex flex-col items-center space-y-2 p-3 rounded-lg hover:bg-gray-800/30 transition-all duration-300"
            title={`Visit ${source.name}`}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              {source.name === 'Hacker News' ? (
                // Custom HN logo since favicon might be too small
                <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-sm">
                  Y
                </div>
              ) : source.name === 'TechCrunch' ? (
                // Custom TC logo
                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs">
                  TC
                </div>
              ) : source.name === 'BBC News' ? (
                // Custom BBC logo
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs">
                  BBC
                </div>
              ) : source.name === 'Wired' ? (
                // Custom Wired logo
                <div className="w-8 h-8 bg-black border border-white rounded flex items-center justify-center text-white font-bold text-xs">
                  W
                </div>
              ) : source.name === 'CNN' ? (
                // Custom CNN logo
                <div className="w-8 h-8 bg-red-700 rounded flex items-center justify-center text-white font-bold text-xs">
                  CNN
                </div>
              ) : (
                // O'Reilly - custom logo
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
                  O
                </div>
              )}
            </div>
            
            <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300 font-medium">
              {source.name}
            </span>
          </motion.a>
        ))}
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="mt-6 text-xs text-gray-500"
      >
        Real-time data aggregation from trusted news sources
      </motion.div>
    </motion.div>
  )
}

export default SourceAttribution