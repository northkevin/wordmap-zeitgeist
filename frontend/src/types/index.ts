export interface WordData {
  id: string  // UUID from database
  word: string
  count: number
  last_seen: string
}

export interface PostData {
  id: string  // UUID from database
  source: string
  title: string
  content: string
  url: string
  scraped_at: string
}