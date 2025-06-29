# Wordmap Zeitgeist

A real-time visualization of the internet's zeitgeist through word frequency analysis from various news sources and tech feeds.

## Project Structure

This is a monorepo containing:

- **`frontend/`** - React + TypeScript + Vite frontend application
- **`backend/`** - Express.js + TypeScript API server
- **`supabase/`** - Database migrations and configuration

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database)

### Development Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd wordmap-zeitgeist
   
   # Install frontend dependencies
   cd frontend && npm install
   
   # Install backend dependencies
   cd ../backend && npm install
   ```

2. **Set up environment variables:**
   
   Create `backend/.env`:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SCRAPE_SECRET=your_secret_for_scraping_endpoint
   ```

3. **Run the development servers:**
   
   **Frontend (in one terminal):**
   ```bash
   cd frontend && npm run dev
   ```
   
   **Backend (in another terminal):**
   ```bash
   cd backend && npm run dev
   ```
   
   Frontend will be available at http://localhost:5173
   Backend will be available at http://localhost:3001

### Individual Commands

- **Frontend only:** `cd frontend && npm run dev`
- **Backend only:** `cd backend && npm run dev`
- **Build frontend:** `cd frontend && npm run build`
- **Build backend:** `cd backend && npm run build`
- **Lint frontend:** `cd frontend && npm run lint`
- **Lint backend:** `cd backend && npm run lint`

## Features

- 🌐 Real-time RSS feed scraping from multiple sources
- 📊 Word frequency analysis and visualization
- 🎨 Interactive word cloud with hover effects
- 📱 Responsive design with dark theme
- ⚡ Fast updates with automatic refresh
- 🔒 Secure API with authentication

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Framer Motion for animations
- Lucide React for icons

### Backend
- Express.js with TypeScript
- Supabase for database
- Node-cron for scheduled tasks
- CORS and Helmet for security

### Database
- PostgreSQL via Supabase
- Row Level Security (RLS)
- Automated migrations

## API Endpoints

- `GET /health` - Health check
- `GET /api/words?limit=100` - Get top words
- `POST /api/scrape` - Trigger RSS scraping (authenticated)

## Deployment

The project is configured for deployment on Render.com with separate services for frontend and backend.

### Environment Variables (Production)

Backend service needs:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` 
- `SCRAPE_SECRET`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.