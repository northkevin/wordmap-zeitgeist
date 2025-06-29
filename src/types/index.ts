export interface WordData {
  id: number
  word: string
  count: number
  last_seen: string
}

export interface PostData {
  id: number
  source: string
  title: string
  content: string
  url: string
  scraped_at: string
}