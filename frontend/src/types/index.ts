export interface WordData {
  word_id: string
  count: number
  last_seen: string | null
  source: string
  words: {
    word: string
    id: string
  }
}

export interface PostData {
  id: string  // UUID from database
  source: string
  title: string
  content: string
  url: string
  scraped_at: string
}