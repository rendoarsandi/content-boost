# Social Media OAuth Integration

This module provides OAuth integration for TikTok and Instagram platforms, allowing users to connect their social media accounts for metrics tracking and bot detection.

## Features

- **TikTok OAuth Flow**: Complete OAuth 2.0 implementation with scope for metrics access
- **Instagram OAuth Flow**: Complete OAuth 2.0 implementation with scope for metrics access  
- **Token Refresh Mechanism**: Automatic token refresh with error handling
- **Social Account Management**: Connect/disconnect functionality
- **Database Integration**: Secure token storage with Drizzle ORM

## Usage

### Basic OAuth Flow

```typescript
import { tiktokOAuth, instagramOAuth } from '@repo/auth';

// Get authorization URL
const tiktokAuthUrl = tiktokOAuth.getAuthorizationUrl('unique-state');
const instagramAuthUrl = instagramOAuth.getAuthorizationUrl('unique-state');

// Exchange code for tokens (in callback handler)
const tiktokTokens = await tiktokOAuth.exchangeCodeForToken(code);
const instagramTokens = await instagramOAuth.exchangeCodeForToken(code);

// Get user info
const tiktokUser = await tiktokOAuth.getUserInfo(tiktokTokens.access_token);
const instagramUser = await instagramOAuth.getUserInfo(instagramTokens.access_token);
```

### Using Social Account Service

```typescript
import { createSocialAccountService } from '@repo/auth';

const service = createSocialAccountService(userId);

// Get connected accounts
const accounts = await service.getConnectedAccounts();

// Connect new account
const result = await service.connectAccount('tiktok', authCode);
if (result.success) {
  console.log('TikTok account connected:', result.account);
}

// Disconnect account
await service.disconnectAccount('instagram');

// Check account health
const health = await service.getAccountHealth();
console.log('Account health:', health);

// Auto-refresh expiring tokens
await service.autoRefreshTokens();
```

### API Route Handlers

```typescript
import { 
  handleTikTokAuth, 
  handleInstagramAuth,
  handleLinkTikTok,
  handleLinkInstagram 
} from '@repo/auth';

// In your Next.js API routes
export async function GET(request: NextRequest) {
  return await handleTikTokAuth(request);
}

export async function POST(request: NextRequest) {
  return await handleLinkInstagram(request);
}
```

## OAuth Scopes

### TikTok Scopes
- `user.info.basic`: Basic user information
- `user.info.profile`: Profile information including follower counts
- `user.info.stats`: User statistics
- `video.list`: Access to user's video list for metrics

### Instagram Scopes
- `user_profile`: Basic profile information
- `user_media`: Access to user's media for metrics tracking

## Token Management

### Automatic Token Refresh
Tokens are automatically refreshed when:
- Token expires within 5 minutes
- API calls return 401 Unauthorized
- Manual refresh is triggered

### Token Storage
- Access tokens stored securely in database
- Refresh tokens encrypted at rest
- Automatic cleanup of expired tokens

## Error Handling

The OAuth integration includes comprehensive error handling:

```typescript
try {
  const result = await service.connectAccount('tiktok', code);
  if (!result.success) {
    console.error('Connection failed:', result.error);
  }
} catch (error) {
  console.error('Unexpected error:', error);
}
```

## Environment Variables

Required environment variables:

```env
# TikTok OAuth
TIKTOK_CLIENT_ID=your_tiktok_client_id
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret

# Instagram OAuth  
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret

# Auth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_key
```

## Database Schema

The OAuth integration uses the following database tables:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Social accounts table
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL,
  platform_user_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
```

## Security Considerations

- All tokens are stored securely in the database
- CSRF protection with state parameter
- Secure cookie configuration for production
- Rate limiting on OAuth endpoints
- Input validation and sanitization

## Testing

Run the OAuth integration tests:

```bash
npm test -- --testPathPattern=oauth
npm test -- --testPathPattern=social-account-service
```

## Troubleshooting

### Common Issues

1. **Invalid Client ID/Secret**: Verify environment variables
2. **Redirect URI Mismatch**: Ensure callback URLs match OAuth app settings
3. **Token Expired**: Use automatic refresh or manual refresh
4. **Rate Limiting**: Implement exponential backoff

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = 'oauth:*';
```

## API Reference

### TikTokOAuth Class

- `getAuthorizationUrl(state?: string): string`
- `exchangeCodeForToken(code: string): Promise<TikTokTokenResponse>`
- `getUserInfo(accessToken: string): Promise<TikTokUserInfo>`
- `refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse>`
- `ensureValidToken(userId: string): Promise<string>`

### InstagramOAuth Class

- `getAuthorizationUrl(state?: string): string`
- `exchangeCodeForToken(code: string): Promise<InstagramTokenResponse>`
- `getUserInfo(accessToken: string): Promise<InstagramUserInfo>`
- `refreshAccessToken(accessToken: string): Promise<InstagramTokenResponse>`
- `ensureValidToken(userId: string): Promise<string>`

### SocialAccountService Class

- `getConnectedAccounts(): Promise<SocialAccountInfo[]>`
- `connectAccount(platform, code): Promise<SocialAccountConnectionResult>`
- `disconnectAccount(platform): Promise<SocialAccountConnectionResult>`
- `refreshToken(platform): Promise<SocialAccountConnectionResult>`
- `getAuthorizationUrl(platform, state?): string`
- `isConnected(platform): Promise<boolean>`
- `getAccountHealth(): Promise<HealthStatus[]>`
- `autoRefreshTokens(): Promise<void>`