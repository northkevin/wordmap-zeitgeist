import React from "react";
import {
  SiReddit,
  SiTechcrunch,
  SiYoutube,
  SiTheguardian,
  SiX,
} from "react-icons/si";
import { FaNewspaper, FaRss } from "react-icons/fa";
import { BsNewspaper } from "react-icons/bs";
import { RiNewspaperLine } from "react-icons/ri";
import { MdRssFeed } from "react-icons/md";

// Icon configuration for each source
export interface SourceIconConfig {
  icon: React.ReactNode;
  color?: string;
  fallbackLetter?: string;
}

export const sourceIcons: Record<string, SourceIconConfig> = {
  // Reddit sources
  "Reddit r/all": { icon: <SiReddit />, color: "#FF4500" },
  "Reddit r/popular": { icon: <SiReddit />, color: "#FF4500" },
  "Reddit r/worldnews": { icon: <SiReddit />, color: "#FF4500" },
  "Reddit Tech Combined": { icon: <SiReddit />, color: "#FF4500" },
  Reddit: { icon: <SiReddit />, color: "#FF4500" },

  // CNN sources (removed - feeds are stale)
  // CNN: { icon: <SiCnn />, color: "#CC0000" },
  // "CNN Top Stories": { icon: <SiCnn />, color: "#CC0000" },
  // "CNN World": { icon: <SiCnn />, color: "#CC0000" },

  // Guardian sources - using white/light color for dark backgrounds per 2018+ brand guidelines
  "The Guardian UK": { icon: <SiTheguardian />, color: "#FFFFFF" },
  "The Guardian World": { icon: <SiTheguardian />, color: "#FFFFFF" },
  "The Guardian US": { icon: <SiTheguardian />, color: "#FFFFFF" },

  // Tech sources
  TechCrunch: { icon: <SiTechcrunch />, color: "#0A9E01" },
  "Hacker News": { icon: <FaRss />, color: "#FF6600", fallbackLetter: "HN" },
  Wired: { icon: <RiNewspaperLine />, color: "#FFFFFF", fallbackLetter: "W" },
  // "O'Reilly Radar": { icon: <SiOreilly />, color: "#D3002D" }, // Feed discontinued

  // News sources
  "BBC News": { icon: <BsNewspaper />, color: "#B80000", fallbackLetter: "BBC" },
  "NPR Main News": { icon: <MdRssFeed />, color: "#7C2E86", fallbackLetter: "NPR" },

  // API sources
  YouTube: { icon: <SiYoutube />, color: "#FF0000" },
  Twitter: { icon: <SiX />, color: "#FFFFFF" },
  NewsAPI: { icon: <FaNewspaper />, color: "#4A90E2", fallbackLetter: "API" },
};

// Letter fallback component
export const LetterIcon: React.FC<{ letter: string; color?: string; size?: number }> = ({
  letter,
  color = "#6B7280",
  size = 24,
}) => (
  <div
    className="rounded flex items-center justify-center text-white font-bold"
    style={{ 
      backgroundColor: color,
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${size * 0.4}px`
    }}
  >
    {letter.substring(0, 3).toUpperCase()}
  </div>
);

// Get icon for a source
export const getSourceIcon = (sourceName: string, size: number = 24): React.ReactNode => {
  const config = sourceIcons[sourceName];
  
  if (!config) {
    // Fallback to generic RSS icon for unknown sources
    return <FaRss size={size} />;
  }

  // Clone the icon element with the specified size
  return React.cloneElement(config.icon as React.ReactElement, { size });
};

// Get source color
export const getSourceColor = (sourceName: string): string => {
  return sourceIcons[sourceName]?.color || "#6B7280";
};

// Get fallback letter
export const getSourceFallbackLetter = (sourceName: string): string => {
  const config = sourceIcons[sourceName];
  if (config?.fallbackLetter) return config.fallbackLetter;
  
  // Generate fallback from source name
  const words = sourceName.split(" ");
  if (words.length >= 2) {
    return words[0][0] + words[1][0];
  }
  return sourceName.substring(0, 2);
};