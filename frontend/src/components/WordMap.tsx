import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { WordData } from "../types";

interface WordMapProps {
  words: WordData[];
  loading: boolean;
}

const WordMap: React.FC<WordMapProps> = ({ words, loading }) => {
  const processedWords = useMemo(() => {
    if (!words.length) return [];

    const maxCount = Math.max(...words.map((w) => w.count));
    const minCount = Math.min(...words.map((w) => w.count));

    return words.slice(0, 50).map((word, index) => {
      const normalizedSize = (word.count - minCount) / (maxCount - minCount);
      const fontSize = 24 + normalizedSize * 72; // 24px to 96px (1.5x larger)
      const opacity = 0.6 + normalizedSize * 0.4; // 0.6 to 1.0

      // Generate colors based on frequency
      const hue = normalizedSize * 240 + ((index * 15) % 360);
      const color = `hsl(${hue}, 70%, 60%)`;

      return {
        id: word.words.id,
        word: word.words.word,
        count: word.count,
        source: word.source,
        sources: word.sources,
        sourceCount: word.sourceCount,
        fontSize,
        opacity,
        color,
        delay: index * 0.05,
      };
    });
  }, [words]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!processedWords.length) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-400 text-xl">No data available yet</p>
        <p className="text-gray-500 mt-2">The zeitgeist is loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/40 backdrop-blur-sm rounded-3xl p-12 border border-gray-600/50 shadow-2xl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="flex flex-wrap justify-center items-center gap-6 min-h-[500px]"
      >
        {processedWords.map((word, index) => (
          <motion.span
            key={word.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: word.opacity,
              scale: 1,
              y: Math.sin(index * 0.5) * 10,
            }}
            transition={{
              duration: 0.8,
              delay: word.delay,
              y: {
                duration: 3,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut",
              },
            }}
            whileHover={{
              scale: 1.2,
              textShadow: "0 0 20px currentColor",
              transition: { duration: 0.1 },
            }}
            className="cursor-pointer font-bold select-none hover:z-10 relative"
            style={{
              fontSize: `${word.fontSize}px`,
              color: word.color,
              textShadow: `0 0 10px ${word.color}40`,
            }}
            title={`${word.word}: ${word.count.toLocaleString()} total${word.sources && word.sources.length > 0 ? `\n${word.sources.sort((a, b) => b.count - a.count).map(s => `${s.source}: ${s.count.toLocaleString()}`).join(' • ')}` : word.source ? ` from ${word.source}` : ''}`}
          >
            {word.word}
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1 }}
        className="text-center mt-8 text-gray-400"
      >
        <p>
          Hover over words to see their frequency • Size indicates popularity
        </p>
      </motion.div>
    </div>
  );
};

export default WordMap;
