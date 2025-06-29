import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { WordData } from "../types";
import {
  SiReddit,
  SiCnn,
  SiTechcrunch,
  SiYoutube,
  SiTheguardian,
  SiOreilly,
  SiX,
} from "react-icons/si";

interface Source {
  name: string;
  icon: string;
  url: string;
  wordCount: number;
  logo?: string;
}

interface SourceBarProps {
  words: WordData[];
  loading: boolean;
  timeRange: "24h" | "all";
}

// Map source name to icon component or fallback SVG path
const sourceIconMap: Record<string, React.ReactNode> = {
  "Reddit r/all": <SiReddit size={24} />, // Reddit
  "Reddit r/popular": <SiReddit size={24} />,
  "Reddit r/worldnews": <SiReddit size={24} />,
  "Reddit Tech Combined": <SiReddit size={24} />,
  Reddit: <SiReddit size={24} />,
  CNN: <SiCnn size={24} />,
  "CNN Top Stories": <SiCnn size={24} />,
  "CNN World": <SiCnn size={24} />,
  TechCrunch: <SiTechcrunch size={24} />,
  Twitter: <SiX size={24} />,
  YouTube: <SiYoutube size={24} />,
  "The Guardian UK": <SiTheguardian size={24} />,
  "The Guardian World": <SiTheguardian size={24} />,
  "The Guardian US": <SiTheguardian size={24} />,
  "O'Reilly Radar": <SiOreilly size={24} />,
};

const fallbackLogoMap: Record<string, string> = {
  // For sources not in react-icons
  "Hacker News": "/logos/hn.svg",
  "BBC News": "/logos/bbc.svg",
  Wired: "/logos/wired.svg",
  "NPR Main News": "/logos/npr.svg",
  NewsAPI: "/logos/newsapi.svg",
};

const formatWordCount = (count: number): string => {
  if (count >= 10000) return `${Math.floor(count / 1000)}k`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
};

const SourceBar: React.FC<SourceBarProps> = ({ words, loading }) => {
  // Map of source name to count (sum of counts for words in top 50)
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    words.forEach((w: any) => {
      if (w.source) {
        counts[w.source] = (counts[w.source] || 0) + w.count;
      }
    });
    return counts;
  }, [words]);

  // Build display sources (group by icon, sum counts)
  const sources: Source[] = useMemo(() => {
    const temp: Record<string, Source> = {};
    Object.keys({ ...sourceIconMap, ...fallbackLogoMap }).forEach((name) => {
      const count = sourceCounts[name] || 0;
      if (count > 0) {
        const icon = sourceIconMap[name] ? name : undefined;
        const logo = fallbackLogoMap[name];
        const iconKey = icon || logo || name;
        if (!temp[iconKey]) {
          temp[iconKey] = {
            name,
            icon: iconKey,
            url: "#", // You can add URLs if needed
            wordCount: count,
            logo,
          };
        } else {
          temp[iconKey].wordCount += count;
        }
      }
    });
    return Object.values(temp).sort((a, b) => b.wordCount - a.wordCount);
  }, [sourceCounts]);

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] border border-white/10 rounded-lg h-16 flex items-center justify-center px-8">
        <span className="text-gray-500 text-sm">Loading sources...</span>
      </div>
    );
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
          <React.Fragment key={source.icon}>
            <motion.span
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
              className="flex items-center group"
              title={`${
                source.name
              }: ${source.wordCount.toLocaleString()} mentions`}
            >
              {sourceIconMap[source.name] ? (
                <span
                  className="mr-2"
                  style={{ display: "inline-flex", alignItems: "center" }}
                >
                  {sourceIconMap[source.name]}
                </span>
              ) : source.logo ? (
                <img
                  src={source.logo}
                  alt={source.name}
                  className="h-6 w-auto mr-2"
                  style={{ display: "inline-block", verticalAlign: "middle" }}
                  draggable={false}
                />
              ) : null}
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
