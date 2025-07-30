import React, { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WordData } from "../types";
import { getSourceIcon, getSourceColor, LetterIcon, getSourceFallbackLetter } from "../config/sourceIcons";

interface SourceStats {
  source: string;
  unique_words: number;
  total_word_count: number;
  last_updated: string;
}

interface Source {
  name: string;
  url: string;
  wordCount: number;
}

interface SourceAttributionProps {
  words: WordData[];
  loading: boolean;
  timeRange: "24h" | "all";
}

const sourceUrls: Record<string, string> = {
  // RSS Feed Sources
  "Hacker News": "https://news.ycombinator.com",
  TechCrunch: "https://techcrunch.com",
  "BBC News": "https://bbc.com/news",
  Wired: "https://wired.com",
  // CNN sources removed - stale feeds
  // "O'Reilly Radar": "https://www.oreilly.com/radar/", // Feed discontinued
  "The Guardian UK": "https://theguardian.com/uk",
  "The Guardian World": "https://theguardian.com/world",
  "The Guardian US": "https://theguardian.com/us-news",
  "NPR Main News": "https://npr.org",
  "Reddit r/all": "https://reddit.com/r/all",
  "Reddit r/popular": "https://reddit.com/r/popular",
  "Reddit r/worldnews": "https://reddit.com/r/worldnews",
  "Reddit Tech Combined": "https://reddit.com/r/technology+science+programming",

  // API Manager Sources
  YouTube: "https://youtube.com",
  NewsAPI: "https://newsapi.org",
  Reddit: "https://reddit.com",
  Twitter: "https://twitter.com",
};

const SourceIcon: React.FC<{ source: Source }> = ({ source }) => {
  const icon = getSourceIcon(source.name, 32);
  const color = getSourceColor(source.name);
  const fallbackLetter = getSourceFallbackLetter(source.name);

  // If we have a letter icon in the config, use the LetterIcon component
  if (fallbackLetter && fallbackLetter.length <= 3) {
    return <LetterIcon letter={fallbackLetter} color={color} size={32} />;
  }

  return (
    <div style={{ color }} className="flex items-center justify-center">
      {icon}
    </div>
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
      const placeholderSources = Object.entries(sourceUrls)
        .slice(0, 8)
        .map(([name, url]) => ({
          name,
          url,
          wordCount: 0,
        }));
      return { visibleSources: placeholderSources, hiddenCount: 0 };
    }

    // Convert source stats to display format
    const sourcesWithCounts: Source[] = sourceStats
      .map((stat) => {
        const url = sourceUrls[stat.source];
        if (!url) {
          console.warn(`No URL found for source: ${stat.source}`);
          return null;
        }

        return {
          name: stat.source,
          url,
          wordCount: stat.total_word_count,
        };
      })
      .filter((source): source is Source => source !== null);

    // Sort by word count (descending)
    const sortedSources = sourcesWithCounts.sort(
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
            key={`${source.name}`}
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