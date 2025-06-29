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
    console.error('Error saving posts:', postsError)
  }

  // Extract and count words
  const wordCounts = new Map<string, number>()
  
  for (const post of posts) {
    const text = `${post.title} ${post.content}`.toLowerCase()
    const words = extractWords(text)
    
    for (const word of words) {
      if (isValidWord(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    }
  }

  // Update word counts in database
  for (const [word, count] of wordCounts) {
    try {
      // Try to update existing word
      const { data: existingWord } = await supabase
        .from('words')
        .select('count')
        .eq('word', word)
        .single()

      if (existingWord) {
        // Update existing word
        await supabase
          .from('words')
          .update({
            count: existingWord.count + count,
            last_seen: new Date().toISOString()
          })
          .eq('word', word)
      } else {
        // Insert new word
        await supabase
          .from('words')
          .insert({
            word,
            count,
            last_seen: new Date().toISOString()
          })
      }
    } catch (error) {
      console.error(`Error processing word "${word}":`, error)
    }
  }

  console.log(`Processed ${wordCounts.size} unique words`)
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