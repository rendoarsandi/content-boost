# Creator Promotion Platform

Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis menggunakan arsitektur monorepo Turborepo.

## 🏗️ Architecture

### Monorepo Structure
```
creator-promotion-platform/
├── apps/                    # Next.js Applications
│   ├── landing-page/        # www.domain.com
│   ├── auth-app/           # auth.domain.com
│   ├── dashboard-app/      # dashboard.domain.com
│   └── admin-app/          # admin.domain.com
├── packages/               # Shared Packages
│   ├── ui/                 # ShadcnUI Components
│   ├── database/           # PostgreSQL Schemas
│   ├── cache/              # Redis Configuration
│   ├── utils/              # Shared Utilities
│   └── config/             # Shared Configuration
├── docs/                   # Documentation
├── reports/                # Test & Performance Reports
├── logs/                   # Application Logs
└── temp/                   # Temporary Files
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation
```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start development servers
npm run dev

# Start development servers in background
npm run dev:bg
```

## 📜 Available Scripts

### Development
- `npm run dev` - Start all development servers with timeout monitoring
- `npm run dev:bg` - Start development servers in background with auto-restart
- `npm run build` - Build all applications and packages
- `npm run test` - Run all tests with timeout monitoring
- `npm run lint` - Lint all code
- `npm run format` - Format code with Prettier

### Database
- `npm run migrate` - Run database migrations with timeout monitoring

### Utilities
- `npm run clean` - Clean all build artifacts
- `npm run type-check` - Run TypeScript type checking

## 🏃‍♂️ Process Management

The platform includes advanced process management with timeout handling:

- **Development Server**: 30-second warning for long startup times
- **Build Process**: 10-minute maximum timeout
- **Test Suite**: 5-minute maximum per test file
- **Database Migration**: 2-minute maximum timeout
- **Background Processes**: Auto-restart with configurable retry limits

## 🧪 Testing Strategy

- **Unit Tests**: Jest with 80% minimum coverage
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Playwright for user journeys
- **Performance Tests**: Load testing for high concurrency

## 📁 Directory Organization

### Apps Structure
Each app includes:
- `__tests__/` - Test files
- `config/` - App-specific configuration
- `src/` - Source code
- `next.config.js` - Next.js configuration
- `package.json` - Dependencies and scripts

### Packages Structure
Each package includes:
- `__tests__/` - Test files
- `config/` - Package-specific configuration
- `src/` - Source code
- `dist/` - Built output
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## 🔧 Configuration

### Environment Variables
Create `.env.local` files in each app with:
```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
NEXTAUTH_SECRET=...
TIKTOK_CLIENT_ID=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
```

### Process Configuration
Customize timeouts and process behavior in `packages/config/src/process.ts`.

## 🚦 Development Workflow

### For Each New Task:
1. **Create Feature Branch**:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/task-[nomor]-[deskripsi-singkat]
   ```

2. **Development Process**:
   ```bash
   npm run dev          # Start development servers
   npm run test         # Run tests during development
   npm run build        # Test production build
   ```

3. **Commit and Push**:
   ```bash
   git add .
   git commit -m "feat: [deskripsi task]"
   git push origin feature/task-[nomor]-[deskripsi-singkat]
   ```

4. **Create Pull Request** to main branch on GitHub

### Daily Development:
- `npm run dev` - Start all development servers
- `npm run dev:bg` - Start development servers in background
- `npm run test` - Run test suite
- `npm run build` - Production build
- `npm run lint` - Code linting
- `npm run format` - Code formatting

## 📊 Monitoring & Logging

- **Application Logs**: `logs/app/`
- **Test Coverage**: `reports/coverage/`
- **Performance Reports**: `reports/performance/`
- **Bot Detection Analytics**: `reports/bot-detection/`

## 🛠️ Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Monorepo**: Turborepo
- **Database**: PostgreSQL with Drizzle ORM
- **Cache**: Redis
- **Authentication**: BetterAuth
- **UI**: ShadcnUI + Tailwind CSS
- **Testing**: Jest + Playwright
- **Deployment**: Railway

## 📚 Documentation

- [API Documentation](docs/api/)
- [Deployment Guide](docs/deployment/)
- [Architecture Overview](docs/README.md)

## 🤝 Contributing

1. Follow the established directory structure
2. Write tests for new functionality
3. Use the provided scripts for development
4. Ensure all timeouts and process management work correctly
5. Update documentation as needed

## 📄 License

Private - Creator Promotion Platform