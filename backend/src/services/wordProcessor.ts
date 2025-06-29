import { SupabaseClient } from '@supabase/supabase-js'

interface Post {
  source: string
  title: string
  content: string
  url: string
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'now', 'here', 'there', 'then', 'once'
])

export async function processWords(posts: Post[], supabase: SupabaseClient) {
  console.log(`🔄 Processing ${posts.length} posts for word extraction...`)
  
  // First, save posts to database
  const postsToInsert = posts.map(post => ({
    source: post.source,
    title: post.title,
    content: post.content,
    url: post.url,
    scraped_at: new Date().toISOString()
  }))

  const { error: postsError } = await supabase
    .from('posts')
    .insert(postsToInsert)

  if (postsError) {
    console.error('❌ Error saving posts:', postsError)
  } else {
    console.log(`✅ Saved ${postsToInsert.length} posts to database`)
  }

  // Extract and count words by source
  const wordCountsBySource = new Map<string, Map<string, number>>()
  
  for (const post of posts) {
    const text = `${post.title} ${post.content}`.toLowerCase()
    const words = extractWords(text)
    
    // Initialize source map if it doesn't exist
    if (!wordCountsBySource.has(post.source)) {
      wordCountsBySource.set(post.source, new Map<string, number>())
    }
    
    const sourceWordCounts = wordCountsBySource.get(post.source)!
    
    for (const word of words) {
      if (isValidWord(word)) {
        sourceWordCounts.set(word, (sourceWordCounts.get(word) || 0) + 1)
      }
    }
  }

  console.log(`📊 Processing words from ${wordCountsBySource.size} sources...`)

  // Process each source's words
  let totalWordsProcessed = 0
  let totalUniqueWords = 0

  for (const [source, wordCounts] of wordCountsBySource) {
    console.log(`📝 Processing ${wordCounts.size} unique words from ${source}...`)
    
    for (const [word, count] of wordCounts) {
      try {
        // First, ensure the word exists in the main words table
        let wordId: string
        
        const { data: existingWord } = await supabase
          .from('words')
          .select('id, count')
          .eq('word', word)
          .single()

        if (existingWord) {
          // Update existing word's total count
          await supabase
            .from('words')
            .update({
              count: existingWord.count + count,
              last_seen: new Date().toISOString()
            })
            .eq('id', existingWord.id)
          
          wordId = existingWord.id
        } else {
          // Insert new word
          const { data: newWord, error: insertError } = await supabase
            .from('words')
            .insert({
              word,
              count,
              last_seen: new Date().toISOString()
            })
            .select('id')
            .single()

          if (insertError || !newWord) {
            console.error(`❌ Error inserting word "${word}":`, insertError)
            continue
          }
          
          wordId = newWord.id
          totalUniqueWords++
        }

        // Now handle the source-specific count
        const { data: existingSourceWord } = await supabase
          .from('word_sources')
          .select('count')
          .eq('word_id', wordId)
          .eq('source', source)
          .single()

        if (existingSourceWord) {
          // Update existing source word count
          await supabase
            .from('word_sources')
            .update({
              count: existingSourceWord.count + count,
              last_seen: new Date().toISOString()
            })
            .eq('word_id', wordId)
            .eq('source', source)
        } else {
          // Insert new source word count
          await supabase
            .from('word_sources')
            .insert({
              word_id: wordId,
              source,
              count,
              last_seen: new Date().toISOString()
            })
        }

        totalWordsProcessed += count
        
      } catch (error) {
        console.error(`❌ Error processing word "${word}" from ${source}:`, error)
      }
    }
    
    console.log(`✅ Completed processing ${wordCounts.size} words from ${source}`)
  }

  console.log(`🎉 Word processing complete:`)
  console.log(`   📈 Total word mentions processed: ${totalWordsProcessed.toLocaleString()}`)
  console.log(`   🆕 New unique words added: ${totalUniqueWords}`)
  console.log(`   📊 Sources processed: ${wordCountsBySource.size}`)
}

function extractWords(text: string): string[] {
  return text
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 0) // Remove empty strings
}

function isValidWord(word: string): boolean {
  return (
    word.length >= 3 && // At least 3 characters
    word.length <= 20 && // Not too long
    !STOP_WORDS.has(word) && // Not a stop word
    !/^\d+$/.test(word) && // Not just numbers
    /^[a-zA-Z]/.test(word) // Starts with a letter
  )
}