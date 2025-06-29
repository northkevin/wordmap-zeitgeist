import React, { useMemo, useEffect, useState } from "react";
import { motion } from "framer-motion";

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

interface SourceBarProps {
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
      <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white font-bold text-xs">
        Y
      </div>
    ),
    tc: (
      <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs">
        TC
      </div>
    ),
    bbc: (
      <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs">
        BBC
      </div>
    ),
    wired: (
      <div className="w-6 h-6 bg-black border border-white rounded flex items-center justify-center text-white font-bold text-xs">
        W
      </div>
    ),
    cnn: (
      <div className="w-6 h-6 bg-red-700 rounded flex items-center justify-center text-white font-bold text-xs">
        CNN
      </div>
    ),
    oreilly: (
      <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
        O
      </div>
    ),
    guardian: (
      <div className="w-6 h-6 bg-blue-800 rounded flex items-center justify-center text-white font-bold text-xs">
        G
      </div>
    ),
    npr: (
      <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xs">
        NPR
      </div>
    ),
    reddit: (
      <div className="w-6 h-6 bg-orange-600 rounded flex items-center justify-center text-white font-bold text-xs">
        R
      </div>
    ),
    youtube: (
      <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white font-bold text-xs">
        YT
      </div>
    ),
    newsapi: (
      <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">
        API
      </div>
    ),
    twitter: (
      <div className="w-6 h-6 bg-blue-400 rounded flex items-center justify-center text-white font-bold text-xs">
        X
      </div>
    ),
  };

  return (
    iconComponents[source.icon as keyof typeof iconComponents] || (
      <div className="w-6 h-6 bg-gray-600 rounded flex items-center justify-center text-white font-bold text-xs">
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

const SourceBar: React.FC<SourceBarProps> = ({ loading, timeRange }) => {
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
  }, [timeRange]);

  const sources = useMemo(() => {
    if (loading || statsLoading) {
      // Show placeholder sources when loading
      return Object.entries(sourceMapping)
        .slice(0, 6)
        .map(([name, config]) => ({
          name,
          icon: config.icon,
          url: config.url,
          wordCount: 0,
        }));
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

    // Sort by word count (descending) and take top 8
    return Array.from(groupedSources.values())
      .sort((a, b) => b.wordCount - a.wordCount)
      .slice(0, 8);
  }, [sourceStats, loading, statsLoading]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-[#1a1a2e] border border-white/10 rounded-lg h-16 flex items-center justify-center px-8"
    >
      <div className="flex items-center space-x-6">
        {sources.map((source, index) => (
          <React.Fragment key={source.icon}>
            <motion.a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="flex items-center space-x-2 group"
              title={`${
                source.name
              }: ${source.wordCount.toLocaleString()} words`}
            >
              <SourceIcon source={source} />
              <span className="text-gray-400 text-sm font-medium">
                {formatWordCount(source.wordCount)}
              </span>
            </motion.a>

            {/* Divider dot (not after the last item) */}
            {index < sources.length - 1 && (
              <span className="text-gray-500 text-sm">•</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
};

export default SourceBar;
