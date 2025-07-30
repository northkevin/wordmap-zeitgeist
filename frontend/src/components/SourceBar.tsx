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

const SourceBar: React.FC<SourceBarProps> = ({ words, loading }) => {
  // Map of source name to count (sum of counts for words in top 50)
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    words.forEach((w) => {
      if (Array.isArray(w.sources)) {
        w.sources.forEach((src: { source: string; count: number }) => {
          counts[src.source] = (counts[src.source] || 0) + src.count;
        });
      }
    });
    return counts;
  }, [words]);

  // Build display sources
  const sources: Source[] = useMemo(() => {
    return Object.entries(sourceCounts)
      .map(([name, wordCount]) => ({ name, wordCount }))
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, 10); // Show top 10 sources
  }, [sourceCounts]);

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-lg h-16 flex items-center justify-center px-8">
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
      className="bg-[#1a1a2e] border border-white/10 rounded-lg h-16 flex items-center justify-center px-8"
    >
      <div className="flex items-center space-x-6">
        {sources.map((source, index) => (
          <React.Fragment key={source.name}>
            <motion.span
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="flex items-center group"
              title={`${source.name}: ${source.wordCount.toLocaleString()} mentions`}
            >
              <span
                className="mr-2"
                style={{ 
                  display: "inline-flex", 
                  alignItems: "center",
                  color: getSourceColor(source.name)
                }}
              >
                {getSourceIcon(source.name, 24)}
              </span>
              <span className="text-gray-400 text-sm font-medium ml-1">
                {formatWordCount(source.wordCount)}
              </span>
            </motion.span>
            {index < sources.length - 1 && (
              <span className="text-gray-500 text-sm mx-2">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

export default SourceBar;