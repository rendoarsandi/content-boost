# Architecture Documentation

## System Architecture

Creator Promotion Platform menggunakan arsitektur monorepo dengan beberapa aplikasi Next.js yang terpisah berdasarkan domain.

### Applications

#### Landing Page (www.domain.com)
- Marketing website
- Public information
- User registration entry point

#### Auth App (auth.domain.com)
- Authentication flows
- OAuth integration (TikTok, Instagram)
- Session management

#### Dashboard App (dashboard.domain.com)
- Creator dashboard
- Promoter dashboard
- Campaign management
- Analytics and reporting

#### Admin App (admin.domain.com)
- Platform administration
- User management
- Financial oversight
- Bot detection monitoring

### Shared Packages

#### @repo/database
- PostgreSQL schemas
- Database migrations
- Data access layer
- Repository patterns

#### @repo/auth
- BetterAuth configuration
- OAuth providers
- Session management
- Authentication utilities

#### @repo/cache
- Redis configuration
- Caching strategies
- Session storage
- Rate limiting

#### @repo/utils
- Bot detection algorithms
- Validation schemas
- Utility functions
- Business logic

#### @repo/ui
- ShadcnUI components
- Design system
- Reusable UI elements

#### @repo/config
- Shared configuration
- Environment variables
- Constants

## Data Flow

1. **User Authentication**: Users authenticate through auth.domain.com
2. **Campaign Creation**: Creators create campaigns through dashboard.domain.com
3. **Promoter Application**: Promoters apply for campaigns
4. **Content Tracking**: Bot detection monitors view metrics
5. **Daily Payouts**: Automated payout system processes legitimate views

## Security

- OAuth integration for social media platforms
- Bot detection with confidence scoring
- Rate limiting and DDoS protection
- Secure session management
- Input validation and sanitization

## Performance

- Redis caching for frequently accessed data
- Database query optimization
- CDN for static assets
- Load balancing for high availability