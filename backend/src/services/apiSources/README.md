# API Sources

This directory contains individual API source implementations for external data scraping.

## Structure

Each API source is implemented as a separate file extending the base `ApiSource` class from `apiManager.ts`.

### Available Sources

- **YouTubeApiSource.ts** - YouTube Data API v3 integration
  - Supports video search and video details endpoints
  - Requires `YOUTUBE_API_KEY` environment variable

- **TwitterApiSource.ts** - Twitter API v2 integration  
  - Supports tweet search, user lookup, and streaming endpoints
  - Requires `TWITTER_BEARER_TOKEN` environment variable

- **NewsApiSource.ts** - NewsAPI.org integration
  - Fetches news articles from various sources
  - Requires `NEWSAPI_KEY` environment variable

- **RedditApiSource.ts** - Reddit API integration with OAuth
  - Fetches posts from subreddits
  - Requires `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` environment variables

## Adding New Sources

To add a new API source:

1. Create a new file in this directory (e.g., `MyApiSource.ts`)
2. Import and extend the `ApiSource` class
3. Implement the required `parseResponse` method
4. Export your class in `index.ts`
5. The source will be automatically initialized in `apiManager.ts` if the required environment variables are present

## Usage

API sources are managed by the `ApiManager` class and can be accessed via:
- Direct API calls: `POST /api/manager/scrape`
- Scheduled scraping (if configured in external services)