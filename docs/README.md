# Creator Promotion Platform Documentation

## Overview
Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis.

## Architecture
- Turborepo monorepo structure
- Multi-subdomain Next.js applications
- Shared packages for common functionality
- PostgreSQL database with Redis caching
- Bot detection algorithms
- Daily payout system

## Directory Structure
```
docs/
├── api/              # API documentation
├── deployment/       # Deployment guides
└── architecture/     # Architecture documentation
```

## Getting Started
1. Install dependencies: `npm install`
2. Setup environment variables
3. Run development server: `npm run dev`
4. Run tests: `npm run test`

## Development Workflow
- Use `npm run dev` for development
- Use `npm run build` for production builds
- Use `npm run test` for running tests
- Use `npm run lint` for code linting