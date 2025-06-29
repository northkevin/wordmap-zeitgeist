# Development Scripts

Since we removed the root package.json to fix deployment issues, here are the common development commands:

## Starting Development

**Option 1: Manual (recommended for debugging)**
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

**Option 2: Using concurrently (if you want to reinstall root package.json locally)**
```bash
# Only do this locally, don't commit the root package.json
npm init -y
npm install concurrently --save-dev

# Add this script to the root package.json:
# "dev": "concurrently \"cd backend && npm run dev\" \"cd frontend && npm run dev\""

npm run dev
```

## Building

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm run build
```

## Cleaning

```bash
# Clean frontend
cd frontend && npm run clean

# Clean backend
cd backend && npm run clean
```

## Fresh Install & Build

```bash
# Frontend
cd frontend && npm run fresh:build

# Backend
cd backend && npm run fresh:build
```

## Linting

```bash
# Frontend
cd frontend && npm run lint

# Backend
cd backend && npm run lint
```

## Notes

- The root package.json was removed to fix Render.com deployment issues
- Render was picking up the root workspace configuration and causing TypeScript resolution problems
- For local development, you can temporarily add a root package.json with concurrently if desired
- Just make sure not to commit it to avoid deployment issues