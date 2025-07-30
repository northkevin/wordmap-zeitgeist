import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WordData } from "../types";
import { getSourceIcon, getSourceColor } from "../config/sourceIcons";

interface Source {
  name: string;
  wordCount: number;
}

interface SourceBarProps {
  words: WordData[];
  loading: boolean;
  timeRange: "24h" | "all";
}

const formatWordCount = (count: number): string => {
  if (count >= 10000) return `${Math.floor(count / 1000)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const getSourceLabel = (name: string): string => {
  // Return full source name, will be truncated by CSS if needed
  return name;
};

const SourceBar: React.FC<SourceBarProps> = ({ words, loading }) => {
  const [showModal, setShowModal] = useState(false);

  // Map of source name to count (sum of counts for words in top 50)
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    words.forEach((w) => {
      if (w.source) {
        counts[w.source] = (counts[w.source] || 0) + w.count;
      }
    });
    return counts;
  }, [words]);

  // Build display sources
  const allSources: Source[] = useMemo(() => {
    return Object.entries(sourceCounts)
      .map(([name, wordCount]) => ({ name, wordCount }))
      .sort((a, b) => b.wordCount - a.wordCount);
  }, [sourceCounts]);

  const sources = allSources.slice(0, 6); // Show top 6 sources
  const hiddenSources = allSources.slice(6); // Remaining sources

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-lg h-20 flex items-center justify-center px-8">
        <span className="text-gray-500 text-sm">Loading sources...</span>
      </div>
    );
  }

  if (sources.length === 0) {
    return null;
  }

  const hiddenCount = hiddenSources.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-[#1a1a2e] border border-white/10 rounded-lg py-3 px-8"
    >
      <div className="flex items-center justify-center space-x-8">
        {sources.map((source, index) => (
          <React.Fragment key={source.name}>
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center group"
            >
              <div
                className="mb-1"
                style={{ 
                  color: getSourceColor(source.name)
                }}
              >
                {getSourceIcon(source.name, 32)}
              </div>
              <span className="text-gray-400 text-xs font-medium">
                {formatWordCount(source.wordCount)}
              </span>
              <span className="text-gray-500 text-[10px] mt-0.5 truncate max-w-[100px] text-center leading-tight">
                {getSourceLabel(source.name)}
              </span>
            </motion.div>
            {index < sources.length - 1 && (
              <span className="text-gray-600 text-xs self-center">•</span>
            )}
          </React.Fragment>
        ))}
        
        {hiddenCount > 0 && (
          <>
            <span className="text-gray-600 text-xs self-center">•</span>
            <motion.button
              className="flex flex-col items-center cursor-pointer hover:bg-gray-700/30 rounded-lg px-3 py-2 transition-colors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowModal(true)}
            >
              <span className="text-gray-500 text-xs font-medium mb-1 hover:text-gray-400">
                + {hiddenCount} more
              </span>
            </motion.button>
          </>
        )}
      </div>

      {/* Modal for showing all sources */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="bg-[#1a1a2e] border border-white/10 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">All Sources</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                {allSources.map((source, index) => (
                  <motion.div
                    key={source.name}
                    className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="flex-shrink-0"
                        style={{ color: getSourceColor(source.name) }}
                      >
                        {getSourceIcon(source.name, 24)}
                      </div>
                      <span className="text-white font-medium text-sm">
                        {source.name}
                      </span>
                    </div>
                    <span className="text-gray-400 text-sm font-medium">
                      {formatWordCount(source.wordCount)}
                    </span>
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-700/50 text-center">
                <span className="text-gray-500 text-xs">
                  Showing {allSources.length} sources • Click outside to close
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SourceBar;