# API Documentation

## Overview

Creator Promotion Platform menyediakan RESTful API untuk semua operasi platform.

## Base URLs

- **Auth API**: `https://auth.domain.com/api`
- **Dashboard API**: `https://dashboard.domain.com/api`
- **Admin API**: `https://admin.domain.com/api`

## Authentication

Semua API endpoints memerlukan authentication kecuali yang disebutkan sebaliknya.

```typescript
// Headers required for authenticated requests
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

## API Endpoints

### Campaign Management

#### GET /api/campaigns
Mendapatkan daftar campaigns

**Response:**
```json
{
  "campaigns": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "budget": "number",
      "rate": "number",
      "status": "active|paused|completed",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ]
}
```

#### POST /api/campaigns
Membuat campaign baru

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "budget": "number",
  "rate": "number",
  "targetMetrics": {
    "views": "number",
    "engagement": "number"
  }
}
```

### Promoter Management

#### GET /api/promoter/campaigns
Mendapatkan campaigns yang tersedia untuk promoter

#### POST /api/promoter/campaigns/{id}/apply
Apply untuk campaign tertentu

### Analytics

#### GET /api/campaigns/{id}/metrics
Mendapatkan metrics real-time untuk campaign

#### GET /api/promoter/analytics
Mendapatkan analytics untuk promoter

### Bot Detection

#### GET /api/bot-detection/stats
Mendapatkan statistik bot detection

#### POST /api/bot-detection/{id}/review
Review hasil bot detection

## Error Handling

Semua error responses menggunakan format standar:

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": "object"
  }
}
```

## Rate Limiting

- 100 requests per minute untuk authenticated users
- 10 requests per minute untuk unauthenticated requests
- Rate limit headers disertakan dalam response