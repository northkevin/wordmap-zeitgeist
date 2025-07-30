import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import { Database } from "./types/database.types.js";
import { scrapeRSSFeeds } from "./services/scraper.js";
import {
  processWords,
  reprocessOrphanedPosts,
} from "./services/wordProcessor.js";
import { apiManager } from "./services/apiManager.js";
import { getSystemHealth, getScraperHealth } from "./services/healthCheck.js";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Supabase client with type safety
export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Database validation function
async function validateDatabase() {
  console.log("🔍 Validating database connection and tables...");

  try {
    // Test basic connection
    const { error: connectionError } = await supabase
      .from("words")
      .select("*", { count: "exact", head: true });

    if (connectionError) {
      console.error("❌ Database connection failed:", connectionError.message);
      return false;
    }

    console.log("✅ Database connection successful");

    // Validate and count records in each crucial table
    const tables = [
      { name: "words" as const, description: "Word frequency data" },
      { name: "posts" as const, description: "Scraped posts" },
      { name: "word_sources" as const, description: "Source-specific word counts" },
      { name: "test_words" as const, description: "Test words (legacy)" },
    ];

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table.name)
          .select("*", { count: "exact", head: true });

        if (error) {
          console.warn(
            `⚠️  Table '${table.name}' validation failed:`,
            error.message
          );
        } else {
          console.log(
            `📊 Table '${table.name}' (${table.description}): ${
              count || 0
            } records`
          );
        }
      } catch (tableError) {
        console.warn(
          `⚠️  Could not validate table '${table.name}':`,
          tableError
        );
      }
    }

    // Check for processed column in posts table
    try {
      const { error: processedError } = await supabase
        .from("posts")
        .select("processed")
        .limit(1);

      if (processedError) {
        console.warn(
          '⚠️  Posts table missing "processed" column - run migration to add it'
        );
      } else {
        // Count unprocessed posts
        const { count: unprocessedCount } = await supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("processed", false);

        console.log(`📋 Unprocessed posts: ${unprocessedCount || 0}`);
      }
    } catch (processedCheckError) {
      console.warn(
        "⚠️  Could not check processed column:",
        processedCheckError
      );
    }

    // Test RLS policies by trying to read as public user
    console.log("🔒 Testing Row Level Security policies...");

    const publicSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY || "missing"
    );

    try {
      const { data: publicWords, error: publicError } = await publicSupabase
        .from("words")
        .select("word, count")
        .limit(5);

      if (publicError) {
        console.warn(
          "⚠️  Public access test failed (this might be expected):",
          publicError.message
        );
      } else {
        console.log(
          `✅ Public read access working: ${
            publicWords?.length || 0
          } sample words accessible`
        );
      }
    } catch (rlsError) {
      console.warn("⚠️  RLS test failed:", rlsError);
    }

    // Get some sample data to verify content
    console.log("📝 Fetching sample data...");

    const { data: sampleWords, error: sampleError } = await supabase
      .from("words")
      .select("word, count, last_seen")
      .order("count", { ascending: false })
      .limit(5);

    if (sampleError) {
      console.warn("⚠️  Could not fetch sample words:", sampleError.message);
    } else if (sampleWords && sampleWords.length > 0) {
      console.log("🏆 Top words in database:");
      sampleWords.forEach((word, index) => {
        console.log(`   ${index + 1}. "${word.word}" (${word.count} mentions)`);
      });
    } else {
      console.log("📝 No words found in database yet");
    }

    const { data: recentPosts, error: postsError } = await supabase
      .from("posts")
      .select("source, title, scraped_at")
      .order("scraped_at", { ascending: false })
      .limit(3);

    if (postsError) {
      console.warn("⚠️  Could not fetch sample posts:", postsError.message);
    } else if (recentPosts && recentPosts.length > 0) {
      console.log("📰 Recent posts in database:");
      recentPosts.forEach((post, index) => {
        const date = post.scraped_at ? new Date(post.scraped_at).toLocaleString() : 'Unknown date';
        console.log(
          `   ${index + 1}. [${post.source}] "${post.title.substring(
            0,
            60
          )}..." (${date})`
        );
      });
    } else {
      console.log("📰 No posts found in database yet");
    }

    // Test source statistics view
    try {
      const { data: sourceStats, error: sourceStatsError } = await supabase
        .from("source_stats")
        .select("*")
        .limit(5);

      if (sourceStatsError) {
        console.warn(
          "⚠️  Could not fetch source statistics:",
          sourceStatsError.message
        );
      } else if (sourceStats && sourceStats.length > 0) {
        console.log("📊 Top sources by word count:");
        sourceStats.forEach((stat, index) => {
          console.log(
            `   ${index + 1}. ${stat.source}: ${stat.total_word_count} words (${
              stat.unique_words
            } unique)`
          );
        });
      } else {
        console.log("📊 No source statistics available yet");
      }
    } catch (sourceError) {
      console.warn("⚠️  Source statistics test failed:", sourceError);
    }

    console.log("✅ Database validation complete");
    return true;
  } catch (error) {
    console.error("❌ Database validation failed:", error);
    return false;
  }
}

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get("User-Agent") || "unknown";
  const ip = req.ip || req.connection.remoteAddress || "unknown";

  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`);

  // Log response when it finishes
  const originalSend = res.send;
  res.send = function (data) {
    console.log(
      `[${timestamp}] ${method} ${url} - Response: ${res.statusCode}`
    );
    return originalSend.call(this, data);
  };

  next();
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check endpoints
app.get("/api/health", (_req, res) => {
  console.log("Health check requested");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Comprehensive system health check
app.get("/api/health/system", async (_req, res) => {
  console.log("System health check requested");
  try {
    const health = await getSystemHealth(supabase);
    res.json(health);
  } catch (error) {
    console.error("System health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Failed to retrieve system health"
    });
  }
});

// Scraper health check
app.get("/api/health/scrapers", async (_req, res) => {
  console.log("Scraper health check requested");
  try {
    const health = await getScraperHealth(supabase, apiManager);
    res.json(health);
  } catch (error) {
    console.error("Scraper health check failed:", error);
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: "Failed to retrieve scraper health"
    });
  }
});

// Get words endpoint
app.get("/api/words", async (_req, res) => {
  console.log("Words endpoint requested");
  try {
    const limit = parseInt(_req.query.limit as string) || 100;
    const timeRange = (_req.query.timeRange as string) || "24h";
    console.log(
      `Fetching top ${limit} words from database with timeRange: ${timeRange}`
    );

    type WordWithSource = {
      word_id: string
      count: number
      last_seen: string | null
      source: string
      sources?: Array<{ source: string; count: number }>
      sourceCount?: number
      words: {
        word: string
        id: string
      }
    }
    
    let words: WordWithSource[] = [];
    let error: Error | null = null;

    if (timeRange === "24h") {
      // Query for last 24 hours
      const timestamp24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      console.log(`🕐 24h cutoff timestamp: ${timestamp24h}`);
      
      const { data, error: queryError } = await supabase
        .from("word_sources")
        .select(
          `
          word_id,
          count,
          last_seen,
          source,
          words!inner(word, id)
        `
        )
        .gte("last_seen", timestamp24h);
        
      console.log(`📊 Raw query returned ${data?.length || 0} word-source records`);
      
      // Debug: Check for API sources in raw data
      const apiRecords = data?.filter(ws => ['YouTube', 'NewsAPI', 'Twitter'].includes(ws.source)) || [];
      console.log(`🔍 API records in raw data: ${apiRecords.length} (YouTube: ${apiRecords.filter(r => r.source === 'YouTube').length}, NewsAPI: ${apiRecords.filter(r => r.source === 'NewsAPI').length}, Twitter: ${apiRecords.filter(r => r.source === 'Twitter').length})`);
      
      if (apiRecords.length > 0) {
        const topApiWords = apiRecords.slice(0, 3).map(r => `${r.words.word}:${r.count} (${r.source})`);
        console.log(`🎯 Top API words in raw data: ${topApiWords.join(', ')}`);
      }

      if (queryError) {
        error = queryError;
      } else {
        // Group by word and sum counts, and collect per-source counts
        interface WordAggregateEntry {
          id: string
          word: string
          count: number
          last_seen: string | null
          sources: Array<{ source: string; count: number }>
        }
        
        const wordMap = new Map<string, WordAggregateEntry>();
        data?.forEach((ws) => {
          const word = ws.words;
          if (!wordMap.has(word.id)) {
            wordMap.set(word.id, {
              id: word.id,
              word: word.word,
              count: 0,
              last_seen: ws.last_seen,
              sources: [],
            });
          }
          const entry = wordMap.get(word.id)!;
          entry.count += ws.count;
          entry.sources.push({ source: ws.source, count: ws.count });
        });
        const aggregatedWords = Array.from(wordMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
        
        // Transform to match WordWithSource type with source information
        words = aggregatedWords.map(w => ({
          word_id: w.id,
          count: w.count,
          last_seen: w.last_seen,
          source: w.sources[0]?.source || 'aggregated',
          sources: w.sources,
          sourceCount: w.sources.length,
          words: {
            word: w.word,
            id: w.id
          }
        }));
      }
    } else {
      // Query for all time - use same aggregation approach as 24h for consistency
      const { data, error: queryError } = await supabase
        .from("word_sources")
        .select(
          `
          word_id,
          count,
          last_seen,
          source,
          words!inner(word, id)
        `
        );

      if (queryError) {
        error = queryError;
      } else {
        // Group by word and sum counts, and collect per-source counts
        interface WordAggregateEntry {
          id: string
          word: string
          count: number
          last_seen: string | null
          sources: Array<{ source: string; count: number }>
        }
        
        const wordMap = new Map<string, WordAggregateEntry>();
        data?.forEach((ws) => {
          const word = ws.words;
          if (!wordMap.has(word.id)) {
            wordMap.set(word.id, {
              id: word.id,
              word: word.word,
              count: 0,
              last_seen: ws.last_seen,
              sources: [],
            });
          }
          const entry = wordMap.get(word.id)!;
          entry.count += ws.count;
          entry.sources.push({ source: ws.source, count: ws.count });
          // Update last_seen to the most recent
          if (!entry.last_seen || (ws.last_seen && ws.last_seen > entry.last_seen)) {
            entry.last_seen = ws.last_seen;
          }
        });
        const aggregatedWords = Array.from(wordMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
        
        // Transform to match WordWithSource type with source information
        words = aggregatedWords.map(w => ({
          word_id: w.id,
          count: w.count,
          last_seen: w.last_seen,
          source: w.sources[0]?.source || 'aggregated',
          sources: w.sources,
          sourceCount: w.sources.length,
          words: {
            word: w.word,
            id: w.id
          }
        }));
      }
    }

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Failed to fetch words" });
    }

    console.log(`Successfully fetched ${words?.length || 0} words`);
    
    // Debug logging for top 5 words to help diagnose missing API data
    if (words && words.length > 0) {
      console.log("🔍 Top 5 words returned:");
      words.slice(0, 5).forEach((word, index) => {
        const apiSources = word.sources?.filter(s => ['YouTube', 'NewsAPI', 'Twitter'].includes(s.source)) || [];
        console.log(`   ${index + 1}. "${word.words.word}" (${word.count}) - API sources: ${apiSources.length > 0 ? apiSources.map(s => `${s.source}:${s.count}`).join(', ') : 'none'}`);
      });
    }
    
    res.json({ words: words || [] });
  } catch (error) {
    console.error("Server error in /api/words:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get source statistics endpoint
app.get("/api/sources", async (_req, res) => {
  console.log("Source statistics endpoint requested");
  try {
    const timeRange = _req.query.timeRange as string;
    let query = supabase
      .from("source_stats")
      .select("*")
      .order("total_word_count", { ascending: false });

    // Apply time filtering if specified
    if (timeRange === "24h") {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      query = query.gte("last_updated", twentyFourHoursAgo.toISOString());
    }
    // For "all" timeRange, no additional filtering needed

    const { data: sources, error } = await query;

    if (error) {
      console.error("Database error fetching sources:", error);
      return res
        .status(500)
        .json({ error: "Failed to fetch source statistics" });
    }

    console.log(
      `Successfully fetched statistics for ${sources?.length || 0} sources${
        timeRange ? ` (${timeRange})` : ""
      }`
    );
    res.json({ sources: sources || [] });
  } catch (error) {
    console.error("Server error in /api/sources:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API Manager endpoints
app.get("/api/manager/sources", (_req, res) => {
  console.log("API Manager sources requested");
  try {
    const sources = apiManager.getAllSources();
    const sourceInfo = sources.map((sourceId) => {
      const info = apiManager.getSourceInfo(sourceId);
      return {
        id: sourceId,
        name: info?.config.name,
        rateLimit: info?.rateLimit,
      };
    });

    res.json({ sources: sourceInfo });
  } catch (error) {
    console.error("Error fetching API sources:", error);
    res.status(500).json({ error: "Failed to fetch API sources" });
  }
});

app.get("/api/manager/logs", (req, res) => {
  console.log("API Manager logs requested");
  try {
    const sourceId = req.query.source as string;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = (apiManager.constructor as any).getRequestLogs(
      sourceId,
      limit
    );
    const stats = (apiManager.constructor as any).getRequestStats(sourceId);

    res.json({ logs, stats });
  } catch (error) {
    console.error("Error fetching API logs:", error);
    res.status(500).json({ error: "Failed to fetch API logs" });
  }
});

app.post("/api/manager/scrape", async (req, res) => {
  console.log("API Manager scrape requested");
  try {
    const { secret, source, endpoint, params } = req.body;

    if (secret !== process.env.SCRAPE_SECRET) {
      console.warn("Unauthorized API scrape attempt");
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!source || !endpoint) {
      return res
        .status(400)
        .json({ error: "Source and endpoint are required" });
    }

    console.log(`Starting API scrape: ${source}/${endpoint}`);
    
    // Log scrape start
    const { logScrapeStart } = await import('./services/scraper.js');
    const runId = await logScrapeStart(source, supabase);
    
    const result = await apiManager.scrapeApi(source, endpoint, params || {});

    let postsProcessed = 0;
    let wordsProcessed = false;

    // Transform API data to posts and save to database
    if (result.success && result.data) {
      const { transformApiDataToPosts } = await import('./services/apiDataTransformer.js');
      const posts = transformApiDataToPosts(result);
      
      if (posts.length > 0) {
        console.log(`Transformed ${posts.length} posts from ${result.source}`);
        
        // Process words (this also saves posts to database)
        await processWords(posts, supabase);
        postsProcessed = posts.length;
        wordsProcessed = true;
        console.log(`Processed ${posts.length} posts from ${result.source}`);
      }
      
      // Log successful completion
      const { logScrapeComplete } = await import('./services/scraper.js');
      await logScrapeComplete(runId, posts.length, null, supabase);
    } else {
      // Log failed completion
      const { logScrapeComplete } = await import('./services/scraper.js');
      await logScrapeComplete(runId, 0, result.error || 'Unknown error', supabase);
    }

    res.json({
      success: result.success,
      source: result.source,
      timestamp: result.timestamp,
      dataCount: Array.isArray(result.data)
        ? result.data.length
        : result.data
        ? 1
        : 0,
      postsProcessed,
      wordsProcessed,
      error: result.error,
    });
  } catch (error) {
    console.error("API scraping error:", error);
    res.status(500).json({ error: "API scraping failed" });
  }
});

// Scrape endpoint (protected)
app.post("/api/scrape", async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Scrape endpoint requested`);
  try {
    const { secret } = req.body;

    if (secret !== process.env.SCRAPE_SECRET) {
      console.warn(`[${timestamp}] Unauthorized scrape attempt`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(`[${timestamp}] Starting RSS scraping...`);
    const posts = await scrapeRSSFeeds();
    console.log(`[${timestamp}] Scraped ${posts.length} posts`);

    if (posts.length > 0) {
      console.log(`[${timestamp}] Processing words...`);
      await processWords(posts, supabase);
      console.log(`[${timestamp}] Word processing complete`);
    }

    res.json({
      success: true,
      postsScraped: posts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[${timestamp}] Scraping error:`, error);
    res.status(500).json({ error: "Scraping failed" });
  }
});

// Reprocess orphaned posts endpoint (protected)
app.post("/api/reprocess", async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Reprocess endpoint requested`);
  try {
    const { secret } = req.body;

    if (secret !== process.env.SCRAPE_SECRET) {
      console.warn(`[${timestamp}] Unauthorized reprocess attempt`);
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log(`[${timestamp}] Starting reprocessing of orphaned posts...`);
    const result = await reprocessOrphanedPosts(supabase);

    if (result.success) {
      console.log(
        `[${timestamp}] Reprocessing complete: ${result.postsProcessed} posts, ${result.uniqueWords} unique words`
      );
      res.json({
        success: true,
        postsProcessed: result.postsProcessed,
        uniqueWords: result.uniqueWords,
        sources: result.sources,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error(`[${timestamp}] Reprocessing failed:`, result.error);
      res.status(500).json({
        success: false,
        error: result.error,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error(`[${timestamp}] Reprocessing error:`, error);
    res.status(500).json({
      success: false,
      error: "Reprocessing failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// Catch-all for unmatched routes
app.use("*", (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// // Schedule RSS scraping every 30 minutes
// cron.schedule("*/30 * * * *", async () => {
//   try {
//     const timestamp = new Date().toISOString();
//     console.log(`[${timestamp}] Scheduled scraping started...`);
//     const posts = await scrapeRSSFeeds();

//     if (posts.length > 0) {
//       await processWords(posts, supabase);
//       console.log(
//         `[${timestamp}] Scheduled scraping complete: ${posts.length} posts processed`
//       );
//     }
//   } catch (error) {
//     console.error("Scheduled scraping error:", error);
//   }
// });

// Schedule orphaned post reprocessing every 2 hours
cron.schedule("0 */2 * * *", async () => {
  try {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] Scheduled orphaned post reprocessing started...`
    );
    const result = await reprocessOrphanedPosts(supabase);

    if (result.success && result?.postsProcessed && result.postsProcessed > 0) {
      console.log(
        `[${timestamp}] Scheduled reprocessing complete: ${result.postsProcessed} posts, ${result.uniqueWords} unique words`
      );
    } else if (result.success) {
      console.log(
        `[${timestamp}] Scheduled reprocessing complete: No orphaned posts found`
      );
    } else {
      console.error(
        `[${timestamp}] Scheduled reprocessing failed:`,
        result.error
      );
    }
  } catch (error) {
    console.error("Scheduled reprocessing error:", error);
  }
});

// Startup function
async function startServer() {
  console.log("🚀 Starting Wordmap Zeitgeist Backend...");
  console.log("=".repeat(50));

  // Environment validation
  console.log("🔧 Environment Configuration:");
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`   PORT: ${port}`);
  console.log(
    `   SUPABASE_URL: ${
      process.env.SUPABASE_URL ? "✅ configured" : "❌ missing"
    }`
  );
  console.log(
    `   SUPABASE_SERVICE_ROLE_KEY: ${
      process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ configured" : "❌ missing"
    }`
  );
  console.log(
    `   SUPABASE_ANON_KEY: ${
      process.env.SUPABASE_ANON_KEY ? "✅ configured" : "⚠️  missing (optional)"
    }`
  );
  console.log(
    `   SCRAPE_SECRET: ${
      process.env.SCRAPE_SECRET ? "✅ configured" : "❌ missing"
    }`
  );

  // API Keys validation
  console.log("🔑 API Keys Configuration:");
  console.log(
    `   YOUTUBE_API_KEY: ${
      process.env.YOUTUBE_API_KEY ? "✅ configured" : "⚠️  missing (optional)"
    }`
  );
  console.log(
    `   NEWSAPI_KEY: ${
      process.env.NEWSAPI_KEY ? "✅ configured" : "⚠️  missing (optional)"
    }`
  );
  console.log(
    `   REDDIT_CLIENT_ID: ${
      process.env.REDDIT_CLIENT_ID ? "✅ configured" : "⚠️  missing (optional)"
    }`
  );
  console.log(
    `   REDDIT_CLIENT_SECRET: ${
      process.env.REDDIT_CLIENT_SECRET
        ? "✅ configured"
        : "⚠️  missing (optional)"
    }`
  );
  console.log(
    `   TWITTER_BEARER_TOKEN: ${
      process.env.TWITTER_BEARER_TOKEN
        ? "✅ configured"
        : "⚠️  missing (optional)"
    }`
  );

  // Validate database
  const dbValid = await validateDatabase();

  if (!dbValid) {
    console.error(
      "❌ Database validation failed. Server may not function correctly."
    );
  }

  // Start the server
  app.listen(port, () => {
    console.log("=".repeat(50));
    console.log("🎉 Server Started Successfully!");
    console.log(`📍 Server running on port ${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`💻 System health: http://localhost:${port}/health/system`);
    console.log(`🔍 Scraper health: http://localhost:${port}/health/scrapers`);
    console.log(`📊 Words API: http://localhost:${port}/api/words`);
    console.log(`📈 Sources API: http://localhost:${port}/api/sources`);
    console.log(`🔄 Scrape API: http://localhost:${port}/api/scrape`);
    console.log(`🔄 Reprocess API: http://localhost:${port}/api/reprocess`);
    console.log(`🤖 API Manager: http://localhost:${port}/api/manager/*`);
    console.log(`⏰ Scheduled scraping: Every 30 minutes`);
    console.log(`⏰ Scheduled reprocessing: Every 2 hours`);
    console.log("=".repeat(50));

    if (dbValid) {
      console.log("✅ All systems operational!");
    } else {
      console.log("⚠️  Server started but database issues detected");
    }
  });
}

// Start the server
startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
