import React, { useMemo } from "react";
import { motion } from "framer-motion";
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
  const sources: Source[] = useMemo(() => {
    return Object.entries(sourceCounts)
      .map(([name, wordCount]) => ({ name, wordCount }))
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, 6); // Show top 6 sources to allow full names
  }, [sourceCounts]);

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
      </div>
    </motion.div>
  );
};

export default SourceBar;