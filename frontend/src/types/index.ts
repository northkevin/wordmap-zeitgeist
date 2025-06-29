export interface WordData {
  id: string  // Changed from number to string to match UUID from database
  word: string
  count: number
  last_seen: string
}

export interface PostData {
  id: string  // Changed from number to string to match UUID from database
  source: string
  title: string
  content: string
  url: string
  scraped_at: string
}