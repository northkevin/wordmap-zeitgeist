import React from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Clock, Globe } from 'lucide-react'

interface HeaderProps {
  onRefresh: () => void
  lastUpdated: Date | null
}

const Header: React.FC<HeaderProps> = ({ onRefresh, lastUpdated }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Globe className="w-8 h-8 text-blue-400" />
            <span className="text-xl font-semibold">Wordmap Zeitgeist</span>
          </div>
          
          <div className="flex items-center space-x-6">
            {lastUpdated && (
              <div className="flex items-center space-x-2 text-gray-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  Updated: {formatTime(lastUpdated)}
                </span>
              </div>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.header>
  )
}

export default Header