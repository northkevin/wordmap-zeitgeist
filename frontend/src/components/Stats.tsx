import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, Hash, Activity } from "lucide-react";
import { WordData } from "../types";

interface StatsProps {
  words: WordData[];
  loading: boolean;
}

const Stats: React.FC<StatsProps> = ({ words, loading }) => {
  const totalWords = words.reduce((sum, word) => sum + word.count, 0);
  const uniqueWords = words.length;
  const topWord = words[0];

  const stats = [
    {
      icon: Hash,
      label: "Total Mentions",
      value: loading ? "..." : totalWords.toLocaleString(),
      color: "text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "Unique Words",
      value: loading ? "..." : uniqueWords.toLocaleString(),
      color: "text-green-400",
    },
    {
      icon: Activity,
      label: "Top Word",
      value: loading ? "..." : topWord?.word || "N/A",
      color: "text-purple-400",
    },
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-4 mb-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          className="bg-gray-800/50 backdrop-blur-sm rounded-full px-4 py-2 border border-gray-700 hover:border-gray-600 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded-full bg-gray-700/50 ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">{stat.label}</p>
              <p className={`text-sm font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default Stats;
