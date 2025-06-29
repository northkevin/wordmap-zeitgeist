import React from "react";
import { motion } from "framer-motion";

interface TimeFilterToggleProps {
  timeRange: "24h" | "all";
  onTimeRangeChange: (range: "24h" | "all") => void;
}

const TimeFilterToggle: React.FC<TimeFilterToggleProps> = ({
  timeRange,
  onTimeRangeChange,
}) => {
  return (
    <div className="flex items-center justify-center mb-6">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-full p-1 border border-gray-700">
        <div className="flex">
          <motion.button
            onClick={() => onTimeRangeChange("24h")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors relative ${
              timeRange === "24h"
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {timeRange === "24h" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">Last 24 Hours</span>
          </motion.button>

          <motion.button
            onClick={() => onTimeRangeChange("all")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors relative ${
              timeRange === "all"
                ? "text-white"
                : "text-gray-400 hover:text-gray-300"
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {timeRange === "all" && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">All Time</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default TimeFilterToggle;
