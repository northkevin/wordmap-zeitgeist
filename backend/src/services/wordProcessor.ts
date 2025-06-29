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

async function processWordsFromPosts(
  postsWithIds: PostWithId[],
  supabase: SupabaseClient
) {
  const timestamp = new Date().toISOString();

  // Extract and count words by source
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

  for (const post of postsWithIds) {
    // Use content_extract if available, otherwise fall back to title + content
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

    // Track this post as processed (we'll mark it in DB after successful word processing)
    processedPostIds.push(post.id);
  }

  console.log(
    `[${timestamp}] 📊 Processing words from ${wordCountsBySource.size} sources...`
  );

  // Process each source's words
  let totalWordsProcessed = 0;
  let totalUniqueWords = 0;

  for (const [source, wordCounts] of wordCountsBySource) {
    if (wordCounts.size === 0) {
      console.log(
        `[${timestamp}] ⚠️  Skipping ${source} - no valid words found`
      );
      continue;
    }

    console.log(
      `[${timestamp}] 📝 Processing ${wordCounts.size} unique words from ${source}...`
    );

    for (const [word, count] of wordCounts) {
      try {
        // First, ensure the word exists in the main words table
        let wordId: string;

        const { data: existingWord } = await supabase
          .from("words")
          .select("id, count")
          .eq("word", word)
          .single();

        if (existingWord) {
          // Update existing word's total count
          await supabase
            .from("words")
            .update({
              count: existingWord.count + count,
              last_seen: new Date().toISOString(),
            })
            .eq("id", existingWord.id);

          wordId = existingWord.id;
        } else {
          // Insert new word
          const { data: newWord, error: insertError } = await supabase
            .from("words")
            .insert({
              word,
              count,
              last_seen: new Date().toISOString(),
            })
            .select("id")
            .single();

          if (insertError || !newWord) {
            console.error(
              `[${timestamp}] ❌ Error inserting word "${word}":`,
              insertError
            );
            continue;
          }

          wordId = newWord.id;
          totalUniqueWords++;
        }

        // Now handle the source-specific count
        const { data: existingSourceWord } = await supabase
          .from("word_sources")
          .select("count")
          .eq("word_id", wordId)
          .eq("source", source)
          .single();

        if (existingSourceWord) {
          // Update existing source word count
          await supabase
            .from("word_sources")
            .update({
              count: existingSourceWord.count + count,
              last_seen: new Date().toISOString(),
            })
            .eq("word_id", wordId)
            .eq("source", source);
        } else {
          // Insert new source word count
          await supabase.from("word_sources").insert({
            word_id: wordId,
            source,
            count,
            last_seen: new Date().toISOString(),
          });
        }

        totalWordsProcessed += count;
      } catch (error) {
        console.error(
          `[${timestamp}] ❌ Error processing word "${word}" from ${source}:`,
          error
        );
      }
    }

    console.log(
      `[${timestamp}] ✅ Completed processing ${wordCounts.size} words from ${source}`
    );
  }

  // Mark posts as processed after successful word processing
  if (processedPostIds.length > 0) {
    const { error: updateError } = await supabase
      .from("posts")
      .update({ processed: true })
      .in("id", processedPostIds);

    if (updateError) {
      console.error(
        `[${timestamp}] ❌ Error marking posts as processed:`,
        updateError
      );
    } else {
      console.log(
        `[${timestamp}] ✅ Marked ${processedPostIds.length} posts as processed`
      );
    }
  }

  console.log(`[${timestamp}] 🎉 Word processing complete:`);
  console.log(
    `   📈 Total word mentions processed: ${totalWordsProcessed.toLocaleString()}`
  );
  console.log(`   🆕 New unique words added: ${totalUniqueWords}`);
  console.log(`   📊 Sources processed: ${wordCountsBySource.size}`);
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
