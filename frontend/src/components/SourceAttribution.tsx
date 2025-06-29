import React, { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WordData } from "../types";

interface SourceStats {
  source: string;
  unique_words: number;
  total_word_count: number;
  last_updated: string;
}

interface Source {
  name: string;
  icon: string;
  url: string;
  wordCount: number;
}

interface SourceAttributionProps {
  words: WordData[];
  loading: boolean;
  timeRange: "24h" | "all";
}

const sourceMapping: Record<string, { icon: string; url: string }> = {
  // RSS Feed Sources
  "Hacker News": { icon: "hn", url: "https://news.ycombinator.com" },
  TechCrunch: { icon: "tc", url: "https://techcrunch.com" },
  "BBC News": { icon: "bbc", url: "https://bbc.com/news" },
  Wired: { icon: "wired", url: "https://wired.com" },
  CNN: { icon: "cnn", url: "https://cnn.com" },
  "CNN Top Stories": { icon: "cnn", url: "https://cnn.com" },
  "CNN World": { icon: "cnn", url: "https://cnn.com/world" },
  "O'Reilly Radar": { icon: "oreilly", url: "https://www.oreilly.com/radar/" },
  "The Guardian UK": { icon: "guardian", url: "https://theguardian.com/uk" },
  "The Guardian World": {
    icon: "guardian",
    url: "https://theguardian.com/world",
  },
  "The Guardian US": {
    icon: "guardian",
    url: "https://theguardian.com/us-news",
  },
  "NPR Main News": { icon: "npr", url: "https://npr.org" },
  "Reddit r/all": { icon: "reddit", url: "https://reddit.com/r/all" },
  "Reddit r/popular": { icon: "reddit", url: "https://reddit.com/r/popular" },
  "Reddit r/worldnews": {
    icon: "reddit",
    url: "https://reddit.com/r/worldnews",
  },
  "Reddit Tech Combined": {
    icon: "reddit",
    url: "https://reddit.com/r/technology+science+programming",
  },

  // API Manager Sources
  YouTube: { icon: "youtube", url: "https://youtube.com" },
  NewsAPI: { icon: "newsapi", url: "https://newsapi.org" },
  Reddit: { icon: "reddit", url: "https://reddit.com" },
  Twitter: { icon: "twitter", url: "https://twitter.com" },
};

const SourceIcon: React.FC<{ source: Source }> = ({ source }) => {
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
    ),
    guardian: (
      <div className="w-8 h-8 bg-blue-800 rounded flex items-center justify-center text-white font-bold text-xs">
        G
      </div>
    ),
    npr: (
      <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">
        NPR
      </div>
    ),
    reddit: (
      <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-xs">
        R
      </div>
    ),
    youtube: (
      <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white font-bold text-xs">
        YT
      </div>
    ),
    newsapi: (
      <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">
        API
      </div>
    ),
    twitter: (
      <div className="w-8 h-8 bg-blue-400 rounded flex items-center justify-center text-white font-bold text-xs">
        X
      </div>
    ),
  };

  return (
    iconComponents[source.icon as keyof typeof iconComponents] || (
      <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center text-white font-bold text-xs">
        ?
      </div>
    )
  );
};

const formatWordCount = (count: number): string => {
  if (count >= 10000) return `${Math.floor(count / 1000)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const SourceAttribution: React.FC<SourceAttributionProps> = ({
  words,
  loading,
  timeRange,
}) => {
  const [sourceStats, setSourceStats] = useState<SourceStats[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch real source statistics from backend
  useEffect(() => {
    const fetchSourceStats = async () => {
      try {
        const response = await fetch(`/api/sources?timeRange=${timeRange}`);
        if (response.ok) {
          const data = await response.json();
          setSourceStats(data.sources || []);
        } else {
          console.error("Failed to fetch source statistics:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch source statistics:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchSourceStats();
  }, [words, timeRange]); // Refetch when words or timeRange changes

  const { visibleSources, hiddenCount } = useMemo(() => {
    if (loading || statsLoading) {
      // Show placeholder sources when loading
      const placeholderSources = Object.entries(sourceMapping)
        .slice(0, 8)
        .map(([name, config]) => ({
          name,
          icon: config.icon,
          url: config.url,
          wordCount: 0,
        }));
      return { visibleSources: placeholderSources, hiddenCount: 0 };
    }

    // Convert source stats to display format
    const sourcesWithCounts: Source[] = sourceStats
      .map((stat) => {
        const mapping = sourceMapping[stat.source];
        if (!mapping) {
          console.warn(`No mapping found for source: ${stat.source}`);
          return null;
        }

        return {
          name: stat.source,
          icon: mapping.icon,
          url: mapping.url,
          wordCount: stat.total_word_count,
        };
      })
      .filter((source): source is Source => source !== null);

    // Group sources by icon (combine similar sources like multiple CNN feeds)
    const groupedSources = new Map<string, Source>();

    sourcesWithCounts.forEach((source) => {
      const existing = groupedSources.get(source.icon);
      if (existing) {
        // Combine word counts for sources with same icon
        existing.wordCount += source.wordCount;
        // Use the shorter name if combining
        if (source.name.length < existing.name.length) {
          existing.name = source.name;
        }
      } else {
        groupedSources.set(source.icon, { ...source });
      }
    });

    // Sort by word count (descending)
    const sortedSources = Array.from(groupedSources.values()).sort(
      (a, b) => b.wordCount - a.wordCount
    );

    // Determine how many sources can fit (responsive)
    const maxVisible = 15; // Increased to show more sources across full width
    const visibleSources = sortedSources.slice(0, maxVisible);
    const hiddenCount = Math.max(0, sortedSources.length - maxVisible);

    return { visibleSources, hiddenCount };
  }, [sourceStats, loading, statsLoading]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="text-center py-6 mb-8"
    >
      <div className="grid grid-cols-8 md:grid-cols-12 lg:grid-cols-15 gap-3 md:gap-4 max-w-7xl mx-auto px-4 justify-items-center">
        {visibleSources.map((source, index) => (
          <motion.a
            key={`${source.icon}-${source.name}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.4 + index * 0.1,
              ease: "easeOut",
            }}
            whileHover={{
              opacity: 1,
              scale: 1.1,
              transition: { duration: 0.2 },
            }}
            className="group flex flex-col items-center space-y-2 p-2 rounded-lg hover:bg-gray-800/30 transition-all duration-300 relative w-full max-w-[4rem]"
            title={`Visit ${source.name}${
              source.wordCount > 0
                ? ` • ${source.wordCount.toLocaleString()} words`
                : ""
            }`}
          >
            <div className="relative flex flex-col items-center">
              <SourceIcon source={source} />

              {/* Word count below icon */}
              {source.wordCount > 0 && !loading && !statsLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="mt-1 text-xs text-gray-500 font-medium min-w-0 max-w-[3rem] truncate"
                >
                  {formatWordCount(source.wordCount)}
                </motion.div>
              )}
            </div>

            <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors duration-300 font-medium text-center leading-tight max-w-[4rem] truncate">
              {source.name
                .replace(/^(CNN|Reddit|The Guardian)\s*/, "")
                .trim() || source.name}
            </span>

            {/* Ranking indicator for top sources */}
            {index < 3 && source.wordCount > 0 && !loading && !statsLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                className={`absolute -bottom-1 w-2 h-1 rounded-full ${
                  index === 0
                    ? "bg-yellow-400"
                    : index === 1
                    ? "bg-gray-300"
                    : "bg-orange-400"
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
              delay: 0.4 + visibleSources.length * 0.1,
              ease: "easeOut",
            }}
            className="flex flex-col items-center space-y-2 p-2 rounded-lg text-gray-500 w-full max-w-[4rem]"
          >
            <div className="w-8 h-8 border-2 border-dashed border-gray-600 rounded flex items-center justify-center text-gray-500 font-bold text-xs">
              +{hiddenCount}
            </div>
            <span className="text-xs font-medium">more</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default SourceAttribution;
