# Railway Deployment Guide

This guide explains how to deploy the Creator Promotion Platform to Railway.

## Prerequisites

1. A Railway account
2. Railway CLI installed locally
3. Access to the project repository

## Setup

### 1. Login to Railway

```bash
railway login
```

### 2. Link the Project

```bash
railway link
```

### 3. Setup Environment Variables

Each app requires specific environment variables. Use the `.env.example` files in each app directory as a reference.

For production deployment, create `.env.production` files for each app with the appropriate values.

### 4. Deploy the Project

```bash
railway up
```

## Multi-App Deployment

The project uses a multi-app deployment strategy with the following services:

- **landing-page**: Marketing site (www.domain.com)
- **auth-app**: Authentication flows (auth.domain.com)
- **dashboard-app**: Creator & promoter dashboards (dashboard.domain.com)
- **admin-app**: Platform administration (admin.domain.com)
- **postgres**: PostgreSQL database
- **redis**: Redis cache

## Domain Configuration

Each app is configured to use a specific subdomain:

1. Configure your DNS provider to point each subdomain to the Railway-provided URL
2. In the Railway dashboard, set up custom domains for each service

## Health Checks

Each app includes a health check endpoint at `/api/health` that returns:

```json
{
  "status": "ok",
  "service": "[service-name]",
  "timestamp": "2023-07-21T12:00:00.000Z"
}
```

Railway uses these endpoints to monitor the health of each service.

## Troubleshooting

### Common Issues

1. **Build Timeouts**: If builds are timing out, check the `buildTimeout` setting in `railway.toml`
2. **Health Check Failures**: Ensure the `/api/health` endpoint is accessible
3. **Environment Variables**: Verify all required environment variables are set

### Logs

Access logs for each service in the Railway dashboard to diagnose issues.

## Scaling

To scale a service, use the Railway dashboard to adjust the resources allocated to each service.
