import { SupabaseClient } from '@supabase/supabase-js'

interface Post {
  source: string
  title: string
  content: string
  url: string
}

const STOP_WORDS = new Set([
  // Common English stop words
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'which', 'who',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'now', 'here', 'there', 'then', 'once',
  
  // HTML attributes and common web terms
  'href', 'src', 'alt', 'title', 'class', 'id', 'style', 'data', 'aria', 'role',
  'name', 'value', 'placeholder', 'required', 'readonly', 'disabled', 'checked',
  'type', 'method', 'action', 'target', 'rel', 'content', 'charset', 'lang',
  'width', 'height', 'border', 'cellpadding', 'cellspacing', 'colspan', 'rowspan',
  
  // HTML tags (without brackets)
  'div', 'span', 'img', 'link', 'meta', 'script', 'style', 'head', 'body', 'html',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'ul', 'ol', 'li',
  'form', 'input', 'button', 'select', 'option', 'textarea', 'label', 'fieldset',
  'nav', 'header', 'footer', 'main', 'section', 'article', 'aside', 'figure',
  'figcaption', 'details', 'summary', 'dialog', 'canvas', 'svg', 'video', 'audio',
  
  // CSS and styling terms
  'css', 'px', 'em', 'rem', 'vh', 'vw', 'rgb', 'rgba', 'hex', 'color', 'background',
  'margin', 'padding', 'border', 'font', 'text', 'display', 'position', 'float',
  'clear', 'overflow', 'visibility', 'opacity', 'transform', 'transition',
  
  // JavaScript and programming terms
  'var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while',
  'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw',
  'true', 'false', 'null', 'undefined', 'typeof', 'instanceof', 'new', 'delete',
  
  // Web protocols and formats
  'http', 'https', 'ftp', 'mailto', 'tel', 'sms', 'www', 'com', 'org', 'net',
  'html', 'xml', 'json', 'csv', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg',
  'mp3', 'mp4', 'avi', 'mov', 'zip', 'rar', 'tar', 'gz',
  
  // Common web interface terms
  'click', 'submit', 'reset', 'cancel', 'ok', 'yes', 'no', 'save', 'delete',
  'edit', 'view', 'show', 'hide', 'open', 'close', 'next', 'prev', 'previous',
  'first', 'last', 'home', 'back', 'forward', 'refresh', 'reload', 'search',
  'filter', 'sort', 'login', 'logout', 'signin', 'signup', 'register',
  
  // URL and path components
  'index', 'default', 'main', 'page', 'site', 'web', 'blog', 'post', 'article',
  'category', 'tag', 'archive', 'feed', 'rss', 'atom', 'sitemap', 'robots',
  
  // Common filler and connector words in web content
  'read', 'more', 'less', 'full', 'complete', 'entire', 'whole', 'total',
  'get', 'set', 'add', 'remove', 'update', 'create', 'make', 'build', 'use',
  'see', 'find', 'look', 'check', 'try', 'test', 'run', 'start', 'stop', 'end',
  
  // Time and date related (often appear in timestamps)
  'am', 'pm', 'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep',
  'oct', 'nov', 'dec', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
  'today', 'yesterday', 'tomorrow', 'week', 'month', 'year', 'day', 'time',
  
  // Numbers and measurements (common in web content)
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'fourth', 'fifth', 'last', 'next', 'previous',
  
  // Social media and sharing terms
  'share', 'like', 'follow', 'subscribe', 'comment', 'reply', 'retweet', 'post',
  'tweet', 'status', 'update', 'message', 'chat', 'email', 'contact', 'about',
  
  // Generic web content words
  'content', 'text', 'image', 'photo', 'picture', 'video', 'audio', 'file',
  'download', 'upload', 'attach', 'embed', 'include', 'insert', 'paste',
  'copy', 'cut', 'select', 'highlight', 'mark', 'tag', 'label', 'note',
  
  // Additional common words that add noise
  'new', 'out', 'people', 'like', 'year', 'years', 'says', 'said', 'say',
  'down', 'many', 'off', 'made', 'make', 'take', 'best', 'news', 'report',
  'reports', 'reported', 'according', 'sources', 'officials', 'continue',
  'reading', 'learn', 'strong'
])

// Source-specific stopwords - words to filter out only when processing content from that specific source
const SOURCE_SPECIFIC_STOPWORDS: Record<string, Set<string>> = {
  'TechCrunch': new Set(['techcrunch', 'crunchbase', 'disrupt']),
  'Hacker News': new Set(['hackernews', 'ycombinator', 'combinator']),
  'BBC News': new Set(['bbc', 'british', 'broadcasting', 'corporation']),
  'Wired': new Set(['wired', 'conde', 'nast']),
  'CNN': new Set(['cnn', 'cable', 'news', 'network']),
  'CNN Top Stories': new Set(['cnn', 'cable', 'news', 'network']),
  'CNN World': new Set(['cnn', 'cable', 'news', 'network']),
  "O'Reilly Radar": new Set(['oreilly', 'radar', 'media']),
  'The Guardian UK': new Set(['guardian', 'theguardian']),
  'The Guardian World': new Set(['guardian', 'theguardian']),
  'The Guardian US': new Set(['guardian', 'theguardian']),
  'NPR Main News': new Set(['npr', 'national', 'public', 'radio']),
  'Reddit r/all': new Set(['reddit', 'subreddit']),
  'Reddit r/popular': new Set(['reddit', 'subreddit']),
  'Reddit r/worldnews': new Set(['reddit', 'subreddit', 'worldnews']),
  'Reddit Tech Combined': new Set(['reddit', 'subreddit', 'technology', 'science', 'programming']),
  // API Manager sources
  'YouTube': new Set(['youtube', 'google']),
  'NewsAPI': new Set(['newsapi']),
  'Reddit': new Set(['reddit', 'subreddit']),
  'Twitter': new Set(['twitter', 'tweet', 'retweet'])
}

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
      if (isValidWord(word, post.source)) {
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
  // Remove URLs first (more comprehensive pattern)
  text = text.replace(/https?:\/\/[^\s]+/g, ' ')
  text = text.replace(/www\.[^\s]+/g, ' ')
  text = text.replace(/[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|co\.uk|io|ly|me|tv)[^\s]*/g, ' ')
  
  // Remove HTML tags and attributes more aggressively
  text = text.replace(/<[^>]*>/g, ' ')
  
  // Remove HTML entities
  text = text.replace(/&[a-zA-Z0-9#]+;/g, ' ')
  
  // Remove email addresses
  text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, ' ')
  
  // Remove common web artifacts
  text = text.replace(/\b(continue\s+reading|read\s+more|click\s+here|learn\s+more)\b/gi, ' ')
  
  // Remove social media handles and hashtags
  text = text.replace(/@[a-zA-Z0-9_]+/g, ' ')
  text = text.replace(/#[a-zA-Z0-9_]+/g, ' ')
  
  // Remove file extensions and paths
  text = text.replace(/\b[a-zA-Z0-9_-]+\.(jpg|jpeg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz)\b/gi, ' ')
  
  // Then extract words
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .split(/\s+/) // Split on whitespace
    .filter(word => word.length > 0) // Remove empty strings
}

function isValidWord(word: string, source: string): boolean {
  // Check basic validity first
  if (
    word.length < 3 || // At least 3 characters
    word.length > 20 || // Not too long
    STOP_WORDS.has(word) || // Not a global stop word
    /^\d+$/.test(word) || // Not just numbers
    !/^[a-zA-Z]/.test(word) // Starts with a letter
  ) {
    return false
  }
  
  // Check source-specific stopwords
  const sourceStopwords = SOURCE_SPECIFIC_STOPWORDS[source]
  if (sourceStopwords && sourceStopwords.has(word)) {
    console.log(`🚫 Filtered source-specific word "${word}" from ${source}`)
    return false
  }
  
  return true
}