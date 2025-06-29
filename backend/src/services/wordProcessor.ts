import { SupabaseClient } from "@supabase/supabase-js";
import {
  WEB_CONTENT_PATTERNS,
  TIME_DATE_PATTERNS,
  NUMBER_UNIT_PATTERNS,
  URL_PATTERNS,
  SOCIAL_MEDIA_PATTERNS,
  FILE_PATH_PATTERNS,
  getSourceStopWords,
  isTechAbbreviation,
  isWebArtifact,
  isStopWord,
} from "./wordFilters.js";

interface Post {
  source: string;
  title: string;
  content: string;
  url: string;
}

interface PostWithId extends Post {
  id: string;
  content_extract?: string;
  extract_method?: string;
}

export async function processWords(posts: Post[], supabase: SupabaseClient) {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] 🔄 Processing ${posts.length} posts for word extraction...`
  );

  // Create content extracts limited to tweet length (280 chars)
  const postsToInsert = posts.map((post) => {
    // Create extract: title + first 280 chars of content
    const titleLength = post.title.length;
    const remainingChars = 280 - titleLength - 1; // -1 for space between title and content
    const contentExtract =
      remainingChars > 0 ? post.content.substring(0, remainingChars) : "";

    const fullExtract = `${post.title} ${contentExtract}`.trim();
    const extractMethod =
      remainingChars > 0 ? "tweet_length_truncated" : "title_only";

    return {
      source: post.source,
      title: post.title,
      content: post.content,
      content_extract: fullExtract,
      extract_method: extractMethod,
      url: post.url,
      scraped_at: new Date().toISOString(),
      processed: false, // Mark as unprocessed initially
    };
  });

  const { data: insertedPosts, error: postsError } = await supabase
    .from("posts")
    .upsert(postsToInsert, {
      onConflict: "source,title",
      ignoreDuplicates: true,
    })
    .select("id, source, title, content, content_extract, extract_method, url");

  if (postsError) {
    console.error(`[${timestamp}] ❌ Error saving posts:`, postsError);
    return;
  }

  console.log(
    `[${timestamp}] ✅ Saved ${postsToInsert.length} posts to database with content extracts`
  );

  // Process the inserted posts (which now have IDs)
  const postsWithIds: PostWithId[] = insertedPosts || [];
  await processWordsFromPosts(postsWithIds, supabase);
}

export async function reprocessOrphanedPosts(supabase: SupabaseClient) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔄 Starting reprocessing of orphaned posts...`);

  try {
    // Query posts where processed = false, limit to 500 per run
    const { data: unprocessedPosts, error: queryError } = await supabase
      .from("posts")
      .select(
        "id, source, title, content, content_extract, extract_method, url"
      )
      .eq("processed", false)
      .order("scraped_at", { ascending: true }) // Process oldest first
      .limit(500);

    if (queryError) {
      console.error(
        `[${timestamp}] ❌ Error querying unprocessed posts:`,
        queryError
      );
      return { success: false, error: queryError.message };
    }

    if (!unprocessedPosts || unprocessedPosts.length === 0) {
      console.log(
        `[${timestamp}] ✅ No orphaned posts found - all posts are processed`
      );
      return { success: true, postsProcessed: 0, uniqueWords: 0 };
    }

    // Get unique sources for logging
    const uniqueSources = [
      ...new Set(unprocessedPosts.map((post) => post.source)),
    ].join(", ");
    console.log(
      `[${timestamp}] 📊 Found ${unprocessedPosts.length} unprocessed posts from sources: ${uniqueSources}`
    );

    // Process the orphaned posts
    const wordCountsBefore = await getTotalWordCount(supabase);
    await processWordsFromPosts(unprocessedPosts, supabase);
    const wordCountsAfter = await getTotalWordCount(supabase);

    const uniqueWordsAdded = wordCountsAfter - wordCountsBefore;

    console.log(
      `[${timestamp}] ✅ Reprocessed ${unprocessedPosts.length} posts, extracted ${uniqueWordsAdded} unique words`
    );

    return {
      success: true,
      postsProcessed: unprocessedPosts.length,
      uniqueWords: uniqueWordsAdded,
      sources: uniqueSources,
    };
  } catch (error) {
    console.error(`[${timestamp}] ❌ Error in reprocessOrphanedPosts:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// NEW BATCHED VERSION - OPTIMIZED FOR PERFORMANCE
async function processWordsFromPosts(
  postsWithIds: PostWithId[],
  supabase: SupabaseClient
) {
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] 🚀 Batch mode: Starting optimized word processing...`
  );

  // Extract and count words by source (in memory only)
  const wordCountsBySource = new Map<string, Map<string, number>>();
  const debugInfo = new Map<
    string,
    {
      totalPosts: number;
      totalChars: number;
      extractedWords: number;
      validWords: number;
    }
  >();
  const processedPostIds: string[] = [];

  // Phase 1: Collect all words in memory (no DB calls)
  for (const post of postsWithIds) {
    const text = post.content_extract || `${post.title} ${post.content}`;
    const originalLength = text.length;

    const words = extractWords(text);
    const validWords = words.filter((word) => isValidWord(word, post.source));

    // Update debug info
    if (!debugInfo.has(post.source)) {
      debugInfo.set(post.source, {
        totalPosts: 0,
        totalChars: 0,
        extractedWords: 0,
        validWords: 0,
      });
    }
    const debug = debugInfo.get(post.source)!;
    debug.totalPosts++;
    debug.totalChars += originalLength;
    debug.extractedWords += words.length;
    debug.validWords += validWords.length;

    // Initialize source map if it doesn't exist
    if (!wordCountsBySource.has(post.source)) {
      wordCountsBySource.set(post.source, new Map<string, number>());
    }

    const sourceWordCounts = wordCountsBySource.get(post.source)!;
    for (const word of validWords) {
      sourceWordCounts.set(word, (sourceWordCounts.get(word) || 0) + 1);
    }

    processedPostIds.push(post.id);
  }

  console.log(
    `[${timestamp}] 📊 Batch mode: Collected words from ${wordCountsBySource.size} sources`
  );

  // Phase 2: Get all unique words across all sources
  const allUniqueWords = new Set<string>();
  for (const [source, wordCounts] of wordCountsBySource) {
    for (const [word] of wordCounts) {
      allUniqueWords.add(word);
    }
  }

  const uniqueWordList = Array.from(allUniqueWords);
  console.log(
    `[${timestamp}] 📝 Batch mode: Processing ${uniqueWordList.length} unique words total`
  );

  // Phase 3: Fetch all existing words IN CHUNKS to avoid URL too long error
  const wordList = Array.from(allUniqueWords);
  const existingWordMap = new Map<string, { id: string; count: number }>();
  const wordFetchChunkSize = 500; // Safe chunk size

  console.log(
    `[${timestamp}] 📊 Batch mode: Fetching existing words in chunks of ${wordFetchChunkSize}...`
  );

  for (let i = 0; i < wordList.length; i += wordFetchChunkSize) {
    const chunk = wordList.slice(i, i + wordFetchChunkSize);
    const { data: existingWords, error: fetchError } = await supabase
      .from("words")
      .select("id, word, count")
      .in("word", chunk);

    if (fetchError) {
      console.error(
        `[${timestamp}] ❌ Batch mode: Error fetching existing words chunk ${
          Math.floor(i / wordFetchChunkSize) + 1
        }:`,
        fetchError
      );
      continue;
    }

    existingWords?.forEach((w) => {
      existingWordMap.set(w.word, { id: w.id, count: w.count });
    });
  }

  // Create maps for quick lookup
  const newWords: Array<{ word: string; count: number; last_seen: string }> =
    [];
  const wordUpdates: Array<{ id: string; count: number; last_seen: string }> =
    [];

  // Phase 4: Prepare word operations
  for (const word of uniqueWordList) {
    const totalCount = Array.from(wordCountsBySource.values()).reduce(
      (sum, sourceWords) => sum + (sourceWords.get(word) || 0),
      0
    );

    if (existingWordMap.has(word)) {
      // Word exists - prepare update
      const existing = existingWordMap.get(word)!;
      wordUpdates.push({
        id: existing.id,
        count: existing.count + totalCount,
        last_seen: new Date().toISOString(),
      });
    } else {
      // New word - prepare insert
      newWords.push({
        word,
        count: totalCount,
        last_seen: new Date().toISOString(),
      });
    }
  }

  // Phase 5: Batch insert new words
  let totalUniqueWords = 0;
  if (newWords.length > 0) {
    console.log(
      `[${timestamp}] 📝 Batch mode: Inserting ${newWords.length} new words`
    );
    const { data: insertedWords, error: insertError } = await supabase
      .from("words")
      .insert(newWords)
      .select("id, word");

    if (insertError) {
      console.error(
        `[${timestamp}] ❌ Batch mode: Error inserting new words:`,
        insertError
      );
      return;
    }

    // Add new words to the map
    insertedWords?.forEach((word) => {
      existingWordMap.set(word.word, { id: word.id, count: 0 });
    });
    totalUniqueWords = insertedWords?.length || 0;
  }

  // Phase 6: Batch update existing words
  if (wordUpdates.length > 0) {
    console.log(
      `[${timestamp}] 📝 Batch mode: Updating ${wordUpdates.length} existing words`
    );

    // Process updates in chunks of 1000
    const chunkSize = 1000;
    for (let i = 0; i < wordUpdates.length; i += chunkSize) {
      const chunk = wordUpdates.slice(i, i + chunkSize);

      for (const update of chunk) {
        const { error: updateError } = await supabase
          .from("words")
          .update({
            count: update.count,
            last_seen: update.last_seen,
          })
          .eq("id", update.id);

        if (updateError) {
          console.error(
            `[${timestamp}] ❌ Batch mode: Error updating word ${update.id}:`,
            updateError
          );
        }
      }
    }
  }

  // Phase 7: Batch upsert word_sources
  console.log(
    `[${timestamp}] 📝 Batch mode: Processing word_sources in batches`
  );
  const wordSourceOperations: Array<{
    word_id: string;
    source: string;
    count: number;
    last_seen: string;
  }> = [];

  for (const [source, wordCounts] of wordCountsBySource) {
    for (const [word, count] of wordCounts) {
      const wordId = existingWordMap.get(word)?.id;
      if (wordId) {
        wordSourceOperations.push({
          word_id: wordId,
          source,
          count,
          last_seen: new Date().toISOString(),
        });
      }
    }
  }

  // Process word_sources in chunks of 1000
  const chunkSize = 1000;
  let totalWordsProcessed = 0;

  for (let i = 0; i < wordSourceOperations.length; i += chunkSize) {
    const chunk = wordSourceOperations.slice(i, i + chunkSize);

    // Use upsert to handle both inserts and updates
    const { error: upsertError } = await supabase
      .from("word_sources")
      .upsert(chunk, {
        onConflict: "word_id,source",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error(
        `[${timestamp}] ❌ Batch mode: Error upserting word_sources chunk ${
          i / chunkSize + 1
        }:`,
        upsertError
      );
    } else {
      totalWordsProcessed += chunk.reduce((sum, op) => sum + op.count, 0);
    }
  }

  // Phase 8: Mark posts as processed
  if (processedPostIds.length > 0) {
    const { error: updateError } = await supabase
      .from("posts")
      .update({ processed: true })
      .in("id", processedPostIds);

    if (updateError) {
      console.error(
        `[${timestamp}] ❌ Batch mode: Error marking posts as processed:`,
        updateError
      );
    } else {
      console.log(
        `[${timestamp}] ✅ Batch mode: Marked ${processedPostIds.length} posts as processed`
      );
    }
  }

  console.log(`[${timestamp}] 🎉 Batch mode: Word processing complete:`);
  console.log(
    `   📈 Total word mentions processed: ${totalWordsProcessed.toLocaleString()}`
  );
  console.log(`   🆕 New unique words added: ${totalUniqueWords}`);
  console.log(`   📊 Sources processed: ${wordCountsBySource.size}`);
  console.log(
    `   🚀 Batch mode: Reduced from ~${uniqueWordList.length * 4} queries to ~${
      Math.ceil(wordSourceOperations.length / chunkSize) + 5
    } queries`
  );
}

async function getTotalWordCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("words")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error getting word count:", error);
    return 0;
  }

  return count || 0;
}

function extractWords(text: string): string[] {
  // Store original for debugging
  const originalText = text;

  // Remove URLs using imported patterns
  URL_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  // Remove HTML tags and attributes more aggressively
  text = text.replace(/<[^>]*>/g, " ");

  // Remove HTML entities
  text = text.replace(/&[a-zA-Z0-9#]+;/g, " ");

  // Remove email addresses
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, " ");

  // Remove web content patterns using imported patterns
  WEB_CONTENT_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  // Remove social media patterns using imported patterns
  SOCIAL_MEDIA_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  // Remove file path patterns using imported patterns
  FILE_PATH_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  // Remove time and date patterns using imported patterns
  TIME_DATE_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  // Remove number unit patterns using imported patterns
  NUMBER_UNIT_PATTERNS.forEach((pattern) => {
    text = text.replace(pattern, " ");
  });

  // Then extract words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter((word) => word.length > 0); // Remove empty strings

  return words;
}

function isValidWord(word: string, source: string): boolean {
  // Check basic validity first - relaxed minimum length to 2 for abbreviations
  if (
    word.length < 2 || // At least 2 characters (changed from 3)
    word.length > 25 || // Not too long (increased from 20)
    isStopWord(word) || // Not a global stop word
    /^\d+$/.test(word) || // Not just numbers
    !/^[a-zA-Z]/.test(word) // Starts with a letter
  ) {
    return false;
  }

  // Allow common tech abbreviations and acronyms
  if (word.length === 2 && !isTechAbbreviation(word)) {
    return false;
  }

  // Filter out common web artifacts that might slip through
  if (isWebArtifact(word)) {
    return false;
  }

  // Check source-specific stopwords
  const sourceStopwords = getSourceStopWords(source);
  if (sourceStopwords.has(word)) {
    return false;
  }

  return true;
}
