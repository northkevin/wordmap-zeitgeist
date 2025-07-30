/**
 * Type definitions for word processing
 * Uses Supabase types for database operations
 */

import { Database } from './database.types.js'

// Supabase table types
export type Word = Database['public']['Tables']['words']['Row']
export type WordInsert = Database['public']['Tables']['words']['Insert']
export type WordUpdate = Database['public']['Tables']['words']['Update']
export type WordSource = Database['public']['Tables']['word_sources']['Row']
export type WordSourceInsert = Database['public']['Tables']['word_sources']['Insert']

// Processing types
export interface ProcessedText {
  words: string[]
  wordCount: number
  uniqueWordCount: number
  language?: string
  processingTime: number
}

export interface WordFrequency {
  word: string
  count: number
}

export interface WordAggregate {
  word: string
  count: number
  sources: Set<string>
  firstSeen: Date
  lastSeen: Date
}

export interface ProcessingResult {
  success: boolean
  postsProcessed: number
  wordsExtracted: number
  uniqueWords: number
  newWords: number
  updatedWords: number
  errors: string[]
  duration: number
}

export interface WordFilter {
  minLength: number
  maxLength: number
  allowNumbers: boolean
  allowedCharacters: RegExp
  stopWords: Set<string>
  customFilters?: Array<(word: string) => boolean>
}

export interface TextExtractor {
  extract(html: string): string
  clean(text: string): string
  normalize(text: string): string
}

export interface LanguageDetector {
  detect(text: string): string | null
  isSupported(language: string): boolean
  getStopWords(language: string): Set<string>
}

// Word processing configuration
export interface WordProcessorConfig {
  minWordLength: number
  maxWordLength: number
  batchSize: number
  updateInterval: number // How often to update existing words
  languages: string[]
}

// Word processor interface
export interface WordProcessor {
  processText(text: string, source: string): ProcessedText
  extractWords(text: string): string[]
  filterWords(words: string[], filter: WordFilter): string[]
  aggregateWords(words: string[], source: string): WordAggregate[]
  saveWords(aggregates: WordAggregate[]): Promise<ProcessingResult>
  updateWordCounts(words: WordFrequency[], source: string): Promise<void>
}

// Batch processing types
export interface BatchProcessor {
  processPosts(posts: Database['public']['Tables']['posts']['Row'][]): Promise<ProcessingResult>
  processOrphanedPosts(limit?: number): Promise<ProcessingResult>
  reprocessAllPosts(): Promise<ProcessingResult>
}

// Word statistics
export interface WordStats {
  totalWords: number
  uniqueWords: number
  averageWordLength: number
  topWords: Array<{
    word: string
    count: number
    sources: string[]
  }>
  growth: {
    daily: number
    weekly: number
    monthly: number
  }
  sourceDistribution: Record<string, number>
}