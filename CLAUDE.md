# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Package Manager

**This project uses npm as the package manager. Do NOT use pnpm, yarn, or other package managers.**

## Project Overview

Wordmap Zeitgeist is a real-time visualization of the internet's zeitgeist through word frequency analysis from RSS feeds and news sources. It's a monorepo with:

- **frontend/** - React + TypeScript + Vite application
- **backend/** - Express.js + TypeScript API server  
- **supabase/** - Database migrations

## Development Commands

### Frontend Development
```bash
cd frontend && npm run dev        # Start dev server (port 5173)
cd frontend && npm run build      # Build for production
cd frontend && npm run lint       # Run ESLint
cd frontend && npm run type-check # Run TypeScript type checking
cd frontend && npm run check      # Run both type-check and lint
cd frontend && npm run preview    # Preview production build
```

### Pre-push Checks
To avoid deployment failures, always run `npm run check` in the frontend directory before pushing. This will catch TypeScript and linting errors early.

### Backend Development
```bash
cd backend && npm run dev         # Start dev server (port 3001)
cd backend && npm run build       # Compile TypeScript
cd backend && npm run start       # Run compiled server
cd backend && npm run lint        # Run ESLint
```

### Full Stack Development
Start both servers in separate terminals:
```bash
# Terminal 1
cd frontend && npm run dev

# Terminal 2  
cd backend && npm run dev
```

## Architecture

### Backend Architecture
- **API Server**: Express.js with TypeScript at backend/src/server.ts:1-684
- **Data Processing**: 
  - RSS scraping: backend/src/services/scraper.ts
  - Word processing: backend/src/services/wordProcessor.ts
  - API management: backend/src/services/apiManager.ts
- **Database**: Supabase PostgreSQL with Row Level Security
- **Scheduled Jobs**: Uses node-cron for periodic scraping (every 30 min) and reprocessing (every 2 hours)

### Frontend Architecture
- **Main App**: frontend/src/App.tsx:1-111 - Handles state, data fetching, and UI composition
- **Components**:
  - WordMap: Interactive word cloud visualization
  - SourceBar: Shows word sources with counts
  - ParticleBackground: Animated background effects
  - TimeFilterToggle: Switch between 24h and all-time views
- **Styling**: Tailwind CSS with dark theme
- **Animations**: Framer Motion for smooth transitions

### API Endpoints
- `GET /health` - Health check
- `GET /api/words?timeRange=24h|all` - Get top words with source breakdown
- `GET /api/sources?timeRange=24h|all` - Get source statistics
- `POST /api/scrape` - Trigger RSS scraping (requires SCRAPE_SECRET)
- `POST /api/reprocess` - Reprocess orphaned posts (requires SCRAPE_SECRET)
- `GET /api/manager/*` - API manager endpoints for monitoring

### Database Schema
Key tables:
- `words` - Aggregated word counts
- `posts` - Scraped RSS posts with processed flag
- `word_sources` - Per-source word counts for time-based filtering
- `source_stats` - Materialized view of source statistics

## Environment Variables

Backend requires (.env file):
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SCRAPE_SECRET=your_secret_key
# Optional API keys for additional sources:
YOUTUBE_API_KEY=
NEWSAPI_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
TWITTER_BEARER_TOKEN=
```

## TypeScript Configuration
- Backend: Strict mode, ES2022 target, ESNext modules, database types auto-generated
- Frontend: Strict mode with unused variable checks, React JSX, path aliases (@/*)

### Database Type Generation
Backend uses Supabase CLI to generate TypeScript types from the database schema:
```bash
cd backend && npm run generate-types
```

Types are automatically updated in the following scenarios:
1. **When migrations are added/modified** - GitHub Actions runs automatically
2. **After successful deployments** - Ensures production types stay in sync
3. **On PRs with migrations** - Warns about pending type changes
4. **Manual trigger** - Run workflow manually when needed
5. **Local development** - Post-commit hook reminds you to update types

**Best Practice**: After creating a migration, always run `npm run generate-types` before committing.

## Key Implementation Details
- Frontend fetches data every 5 minutes automatically
- Backend validates database connection on startup
- Time filtering works by querying word_sources table for 24h view
- All API calls use relative URLs (/api/*) - proxied in production
- Word processing filters out common words and requires minimum length
- Source statistics are aggregated in a materialized view