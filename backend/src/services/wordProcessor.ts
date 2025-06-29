import { SupabaseClient } from '@supabase/supabase-js'

interface ParsedItem {
  title: string
  content: string
  url: string
  source: string
}

interface WordCount {
  [word: string]: number
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'am', 'as', 'if', 'so', 'no', 'not',
  'up', 'out', 'down', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
  'now', 'get', 'go', 'come', 'see', 'know', 'take', 'make', 'think', 'say', 'tell', 'give',
  'find', 'use', 'work', 'call', 'try', 'ask', 'need', 'feel', 'become', 'leave', 'put',
  'mean', 'keep', 'let', 'begin', 'seem', 'help', 'talk', 'turn', 'start', 'show', 'hear',
  'play', 'run', 'move', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide',
  'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change',
  'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add',
  'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember', 'love', 'consider', 'appear',
  'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build', 'stay', 'fall', 'cut', 'reach',
  'kill', 'remain', 'suggest', 'raise', 'pass', 'sell', 'require', 'report', 'decide', 'pull'
])

export async function processWords(supabase: SupabaseClient, items: ParsedItem[]) {
  const wordCounts: WordCount = {}
  
  // Extract and count words
  for (const item of items) {
    const text = `${item.title} ${item.content}`.toLowerCase()
    const words = text
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter(word => 
        word.length >= 3 && // Minimum length
        word.length <= 20 && // Maximum length
        !STOP_WORDS.has(word) && // Not a stop word
        !/^\d+$/.test(word) && // Not just numbers
        /^[a-z]+$/.test(word) // Only letters
      )
    
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1
    }
  }
  
  // Prepare data for upsert
  const wordsToUpsert = Object.entries(wordCounts)
    .filter(([_, count]) => count >= 2) // Only words that appear at least twice
    .map(([word, count]) => ({
      word,
      count,
      last_seen: new Date().toISOString()
    }))
  
  // Upsert words to database
  if (wordsToUpsert.length > 0) {
    const { error } = await supabase
      .from('words')
      .upsert(
        wordsToUpsert,
        { 
          onConflict: 'word',
          ignoreDuplicates: false
        }
      )
    
    if (error) {
      console.error('Word upsert error:', error)
      throw error
    }
  }
  
  return {
    totalWords: Object.values(wordCounts).reduce((sum, count) => sum + count, 0),
    uniqueWords: Object.keys(wordCounts).length,
    savedWords: wordsToUpsert.length
  }
}

export async function getTopWords(supabase: SupabaseClient, limit: number = 100) {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .order('count', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Get words error:', error)
    throw error
  }
  
  return data || []
}