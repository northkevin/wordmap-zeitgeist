import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Header from "../components/Header";
import ParticleBackground from "../components/ParticleBackground";
import Footer from "../components/Footer";
import { SystemHealth, ScraperHealth } from "../types/health";

function StatusPage() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [scraperHealth, setScraperHealth] = useState<ScraperHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const [systemResponse, scraperResponse] = await Promise.all([
        fetch("/api/health/system"),
        fetch("/api/health/scrapers"),
      ]);

      if (systemResponse.ok && scraperResponse.ok) {
        const [systemData, scraperData] = await Promise.all([
          systemResponse.json(),
          scraperResponse.json(),
        ]);
        setSystemHealth(systemData);
        setScraperHealth(scraperData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch health data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white relative overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10">
        <Header onRefresh={fetchHealthData} lastUpdated={lastUpdated} />

        <main className="container mx-auto px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-2">System Status</h1>
            <p className="text-gray-400">
              Monitor the health of all scraping sources and system components
            </p>
          </motion.div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading status...</div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* System Health Section */}
              {systemHealth && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                >
                  <h2 className="text-2xl font-semibold mb-4">System Health</h2>
                  <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <p className="text-gray-400 text-sm">Status</p>
                        <p className="text-lg font-medium">
                          <span
                            className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              systemHealth.status === "healthy"
                                ? "bg-green-500"
                                : systemHealth.status === "degraded"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          />
                          {systemHealth.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Backend Version</p>
                        <p className="text-lg font-medium">
                          v{systemHealth.version?.backend || "unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Git Commit</p>
                        <p className="text-lg font-medium font-mono">
                          {systemHealth.version?.git?.commit || "unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Uptime</p>
                        <p className="text-lg font-medium">
                          {systemHealth.system?.uptime
                            ? `${Math.floor(systemHealth.system.uptime / 3600)}h ${Math.floor(
                                (systemHealth.system.uptime % 3600) / 60
                              )}m`
                            : "unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Database</p>
                        <p className="text-lg font-medium">
                          <span
                            className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              systemHealth.services?.supabase?.status === "healthy"
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                          />
                          {systemHealth.services?.supabase?.status || "unknown"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Total Posts</p>
                        <p className="text-lg font-medium">
                          {systemHealth.resources?.database?.posts?.toLocaleString() || "0"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.section>
              )}

              {/* Scraper Health Section */}
              {scraperHealth && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                >
                  <h2 className="text-2xl font-semibold mb-4">Data Sources</h2>
                  
                  {/* RSS Sources */}
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-3 text-gray-300">RSS Feeds</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(scraperHealth.sources?.rss || {}).map(
                        ([source, health]) => (
                          <div
                            key={source}
                            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{source}</h4>
                              <span
                                className={`inline-block w-3 h-3 rounded-full ${
                                  health.status === "healthy"
                                    ? "bg-green-500"
                                    : health.status === "degraded"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                              />
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <p>Posts (24h): {health.postsLast24h}</p>
                              <p>Posts (1h): {health.postsLastHour}</p>
                              <p>
                                Last success:{" "}
                                {health.lastSuccess
                                  ? new Date(health.lastSuccess).toLocaleTimeString()
                                  : "Never"}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* API Sources */}
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-gray-300">API Sources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(scraperHealth.sources?.api || {}).map(
                        ([source, health]) => (
                          <div
                            key={source}
                            className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{source}</h4>
                              <span
                                className={`inline-block w-3 h-3 rounded-full ${
                                  health.status === "healthy"
                                    ? "bg-green-500"
                                    : health.status === "degraded"
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                                }`}
                              />
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <p>Posts (24h): {health.postsLast24h}</p>
                              <p>Posts (1h): {health.postsLastHour}</p>
                              {health.rateLimit && (
                                <p>
                                  Rate limit: {health.rateLimit.remaining}/{health.rateLimit.perHour}
                                </p>
                              )}
                              {health.lastError && (
                                <p className="text-red-400 text-xs">{health.lastError}</p>
                              )}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Issues */}
                  {scraperHealth.issues && scraperHealth.issues.length > 0 && (
                    <div className="mt-6 bg-red-900/20 border border-red-800 rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2 text-red-400">Current Issues</h3>
                      <ul className="space-y-1">
                        {scraperHealth.issues.map((issue: string, index: number) => (
                          <li key={index} className="text-sm text-red-300">
                            • {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.section>
              )}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default StatusPage;