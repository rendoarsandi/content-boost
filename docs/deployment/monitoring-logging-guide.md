# Monitoring and Logging Guide

This guide explains the monitoring and logging setup for the Creator Promotion Platform.

## Logging System

### Log Structure

The platform uses structured logging with Winston. Logs are stored in the following locations:

- **Application Logs**: `logs/app/YYYY-MM-DD.log`
- **Bot Detection Logs**: `logs/bot-detection/YYYY-MM-DD.log`

### Log Levels

The following log levels are used:

- **ERROR**: Critical errors that require immediate attention
- **WARN**: Warnings that might require attention
- **INFO**: General information about application operation
- **DEBUG**: Detailed debugging information

### Log Format

Logs are stored in JSON format with the following fields:

```json
{
  "timestamp": "2023-07-21T12:00:00.000Z",
  "level": "info",
  "message": "Request completed",
  "service": "dashboard-app",
  "requestId": "123e4567-e89b-12d3-a456-426614174000",
  "method": "GET",
  "path": "/api/campaigns",
  "durationMs": "42.50"
}
```

## Error Tracking with Sentry

### Setup

Each app is configured with Sentry for error tracking. The following environment variables are required:

```
SENTRY_DSN=https://your-sentry-dsn
```

### Features

- **Error Tracking**: Automatic capture of unhandled exceptions
- **Performance Monitoring**: Tracking of API endpoint performance
- **Release Tracking**: Errors are associated with specific releases
- **Environment Segmentation**: Errors are segmented by environment (development, staging, production)

### Custom Error Reporting

You can manually report errors using the Sentry utility:

```typescript
import { captureException, captureMessage } from '@repo/utils';

try {
  // Your code
} catch (error) {
  captureException(error, { additionalContext: 'value' });
}

// Or report a message
captureMessage('Something happened', 'warning', { additionalContext: 'value' });
```

## Performance Monitoring

### Middleware

All HTTP requests are automatically monitored using the logging middleware. The following metrics are collected:

- **Request Duration**: Time taken to process the request
- **Endpoint Usage**: Frequency of endpoint calls
- **Error Rates**: Percentage of requests that result in errors

### Custom Performance Monitoring

You can manually monitor performance using the performance utility:

```typescript
import { performanceMonitor } from '@repo/utils';

// Start measuring
performanceMonitor.startMeasure('operation-name');

// Your code

// End measuring
const duration = performanceMonitor.endMeasure('operation-name');
console.log(`Operation took ${duration}ms`);
```

### Performance Thresholds

You can set performance thresholds to be alerted when operations take too long:

```typescript
import { performanceMonitor } from '@repo/utils';

// Set a threshold of 1000ms for the operation
performanceMonitor.setThreshold('operation-name', 1000);
```

## Alerting System

### Critical Issues

The following issues trigger alerts:

1. **Bot Detection**: High confidence bot detection (>90%)
2. **Payment Failures**: Failed payment processing
3. **API Rate Limiting**: Social media API rate limit reached
4. **Database Errors**: Connection issues or query failures

### Alert Channels

Alerts are sent through the following channels:

1. **Sentry**: All errors are reported to Sentry
2. **Logs**: All alerts are logged with ERROR level
3. **Admin Dashboard**: Critical alerts appear in the admin dashboard

## Monitoring Dashboard

The admin app includes a monitoring dashboard at `/monitoring` with the following features:

1. **System Health**: Overall system health status
2. **Error Rates**: Graph of error rates over time
3. **Performance Metrics**: API endpoint performance
4. **Bot Detection**: Bot detection statistics
5. **Payment Processing**: Payment success/failure rates

## Best Practices

1. **Log Rotation**: Logs are automatically rotated daily
2. **Sensitive Data**: Never log sensitive user data or credentials
3. **Performance Impact**: Keep logging overhead minimal in production
4. **Structured Logging**: Always use structured logging for easier analysis
5. **Correlation IDs**: Use request IDs to correlate logs across services