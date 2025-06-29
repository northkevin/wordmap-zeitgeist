# Development Scripts

This is a frontend-only project. Here are the available development commands:

## Starting Development

```bash
# Frontend development server
cd frontend && npm run dev
```

Or from the root directory:
```bash
npm --prefix frontend run dev
```

## Building

```bash
# Build frontend for production
cd frontend && npm run build
```

Or from the root directory:
```bash
npm --prefix frontend run build
```

## Cleaning

```bash
# Clean frontend build artifacts
cd frontend && npm run clean
```

## Fresh Install & Build

```bash
# Frontend fresh install and build
cd frontend && npm run fresh:build
```

## Linting

```bash
# Frontend linting
cd frontend && npm run lint
```

## Preview Production Build

```bash
# Preview the production build locally
cd frontend && npm run preview
```

## Notes

- This is a frontend-only project using React + Vite + TypeScript
- The backend functionality is handled by Supabase (database) and edge functions
- All commands should be run from the frontend directory or using the --prefix flag from root
- The project uses Supabase for data storage and API functionality