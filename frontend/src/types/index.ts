export interface WordData {
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

export interface PostData {
  id: string  // UUID from database
  source: string
  title: string
  content: string
  url: string
  scraped_at: string
}