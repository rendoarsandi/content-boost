# Development Timeout Guide

Panduan untuk menggunakan script timeout dalam development untuk mencegah proses yang stuck.

## 🚀 Available Commands

### Development Server

```bash
# Start all apps with timeout monitoring (recommended)
npm run dev

# Start single app with timeout monitoring
npm run dev:app dashboard-app
npm run dev:app auth-app
npm run dev:app landing-page
npm run dev:app admin-app

# Start development server in background with auto-restart
npm run dev:bg

# Start only auth app (legacy)
npm run dev:auth
```

### Build Process

```bash
# Build all apps with timeout monitoring
npm run build
```

### Testing

```bash
# Run all tests with timeout monitoring
npm run test

# Run specific test command
node scripts/test-with-timeout.js run test:unit
node scripts/test-with-timeout.js run test:integration
```

### Database Migration

```bash
# Run database migrations with timeout monitoring
npm run migrate

# Run specific migration command
node scripts/migrate-with-timeout.js run db:migrate:up
node scripts/migrate-with-timeout.js run db:migrate:down
```

## ⏱️ Timeout Configuration

### Development Server (`npm run dev`)
- **Warning**: 30 seconds
- **Maximum**: 5 minutes
- **Monitoring**: Every 5 seconds

### Build Process (`npm run build`)
- **Warning**: 2 minutes
- **Maximum**: 10 minutes
- **Monitoring**: Every 10 seconds

### Test Suite (`npm run test`)
- **Warning**: 1 minute
- **Maximum**: 5 minutes
- **Monitoring**: Every 5 seconds

### Database Migration (`npm run migrate`)
- **Warning**: 30 seconds
- **Maximum**: 2 minutes
- **Monitoring**: Every 5 seconds

### Background Development (`npm run dev:bg`)
- **Auto-restart**: Up to 3 times
- **Restart delay**: 5 seconds
- **Health check**: Every 30 seconds
- **Log rotation**: 10MB max per file

## 📋 Features

### Timeout Monitoring
- Automatic warning when process takes too long
- Force termination if maximum timeout exceeded
- Graceful shutdown with Ctrl+C
- Process cleanup to prevent zombie processes

### Background Development
- Automatic restart on crashes
- Health monitoring
- Structured logging to `logs/app/` directory
- Log rotation to prevent disk space issues

### Single App Development
- Run only specific app for faster development
- Same timeout monitoring as full development
- Useful for focused development work

## 🛠️ Usage Examples

### Start Development with Timeout
```bash
# This will show warning after 30 seconds, terminate after 5 minutes
npm run dev
```

### Start Single App
```bash
# Only start dashboard app
npm run dev:app dashboard-app

# Only start auth app
npm run dev:app auth-app
```

### Background Development with Auto-restart
```bash
# Start in background, auto-restart on crashes
npm run dev:bg

# Check logs
tail -f logs/app/dev-$(date +%Y-%m-%d).log
```

### Build with Timeout
```bash
# Build all apps, warning after 2 minutes, terminate after 10 minutes
npm run build
```

### Test with Timeout
```bash
# Run all tests with timeout monitoring
npm run test

# Run specific test suite
node scripts/test-with-timeout.js run test:unit
```

## 🚨 Troubleshooting

### Development Server Stuck
1. Wait for 30-second warning
2. Check terminal output for errors
3. Press Ctrl+C to terminate if needed
4. Try single app development: `npm run dev:app dashboard-app`

### Build Taking Too Long
1. Check for TypeScript errors
2. Ensure all dependencies are installed
3. Try cleaning: `npm run clean && npm install`
4. Check disk space and memory usage

### Tests Hanging
1. Check for infinite loops in test code
2. Ensure test database is properly configured
3. Check for unclosed database connections
4. Use `--verbose` flag for more details

### Background Process Issues
1. Check logs in `logs/app/` directory
2. Ensure ports are not already in use
3. Check system resources (CPU, memory)
4. Restart with: `npm run dev:bg`

## 📁 Log Files

### Development Logs
- Location: `logs/app/dev-YYYY-MM-DD.log`
- Rotation: 10MB max per file
- Format: `[timestamp] [level] message`

### Log Levels
- **INFO**: Normal operations
- **WARN**: Warnings and restarts
- **ERROR**: Errors and failures

### Log Cleanup
```bash
# Clean old logs (older than 7 days)
find logs/app -name "*.log" -mtime +7 -delete

# View recent logs
tail -f logs/app/dev-$(date +%Y-%m-%d).log
```

## 🔧 Customization

### Modify Timeout Values
Edit the configuration in each script file:

```javascript
// scripts/dev-with-timeout.js
const DEV_TIMEOUT = 30000; // 30 seconds warning
const MAX_TIMEOUT = 300000; // 5 minutes maximum

// scripts/build-with-timeout.js
const BUILD_TIMEOUT = 600000; // 10 minutes maximum
const WARNING_TIMEOUT = 120000; // 2 minutes warning
```

### Add Custom Scripts
Create new timeout scripts based on existing templates:

```javascript
// scripts/custom-with-timeout.js
const { spawn } = require('child_process');
// ... copy and modify existing script
```

## 💡 Best Practices

1. **Always use timeout scripts** for development to prevent hanging
2. **Monitor logs** when using background development
3. **Use single app development** for focused work
4. **Clean logs regularly** to prevent disk space issues
5. **Check system resources** if processes are slow
6. **Use Ctrl+C** for graceful shutdown instead of force killing

## 🆘 Emergency Commands

### Force Kill All Node Processes
```bash
# Windows
taskkill /f /im node.exe

# Linux/Mac
pkill -f node
```

### Clean Everything
```bash
# Clean all build artifacts and node_modules
npm run clean
npm install

# Clean logs
rm -rf logs/app/*

# Clean temp files
rm -rf temp/*
```

### Check Running Processes
```bash
# Windows
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :3000
ps aux | grep node
```