import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import WordMap from "./components/WordMap";
import Header from "./components/Header";
import Stats from "./components/Stats";
import SourceAttribution from "./components/SourceAttribution";
import ParticleBackground from "./components/ParticleBackground";
import TimeFilterToggle from "./components/TimeFilterToggle";
import { WordData } from "./types";

function App() {
  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<"24h" | "all">("24h");

  const fetchWords = async (range: "24h" | "all" = timeRange) => {
    try {
      setLoading(true);
      // Use relative URL for API calls - will be proxied to backend in production
      const response = await fetch(`/api/words?timeRange=${range}`);
      if (response.ok) {
        const data = await response.json();
        setWords(data.words || []);
        setLastUpdated(new Date());
      } else {
        console.error(
          "Failed to fetch words:",
          response.status,
          response.statusText
        );
      }
    } catch (error) {
      console.error("Failed to fetch words:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range: "24h" | "all") => {
    setTimeRange(range);
    fetchWords(range);
  };

  useEffect(() => {
    fetchWords();

    // Refresh data every 5 minutes
    const interval = setInterval(() => fetchWords(), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10">
        <Header onRefresh={() => fetchWords()} lastUpdated={lastUpdated} />

        <main className="container mx-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="text-7xl md:text-9xl font-bold mb-4 text-gradient glow-text leading-tight">
              Zeitgeist
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-snug">
              Capturing the pulse of the internet through real-time analysis of
              global conversations
            </p>
          </motion.div>

          <div className="mb-8">
            <TimeFilterToggle
              timeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </div>

          {/* <SourceAttribution
            words={words}
            loading={loading}
            timeRange={timeRange}
          /> */}

          <div className="mb-12">
            <Stats words={words} loading={loading} />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="mt-12"
          >
            <WordMap words={words} loading={loading} />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default App;
