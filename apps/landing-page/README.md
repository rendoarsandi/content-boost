# Landing Page App

This is the landing page application for the Creator Promotion Platform (ContentBoost), built with Next.js and configured for static generation.

## Features Implemented

### ✅ Static Generation Setup
- Configured Next.js for static export (`output: 'export'`)
- Optimized for deployment as static files
- Proper SEO metadata and Open Graph tags

### ✅ Hero Section with Value Proposition
- Compelling headline highlighting the pay-per-view system
- Clear value proposition for both creators and promoters
- Call-to-action buttons linking to auth subdomain
- Responsive design with gradient background

### ✅ Feature Sections for Creators
- **Campaign Management**: Budget and rate control
- **Bot Detection**: Automated fraud prevention
- **Real-time Analytics**: Social media integration insights

### ✅ Feature Sections for Promoters
- **Content Editing**: Creative freedom with provided materials
- **Daily Payouts**: Transparent automated payments
- **Social Integration**: OAuth-based tracking

### ✅ Pricing Information
- **For Creators**: Free platform with pay-per-view model
- **For Promoters**: 5% platform fee structure
- Clear pricing transparency with feature lists

### ✅ FAQ Section
- Bot detection algorithm explanation
- Payment processing schedule (daily at 00:00 WIB)
- Supported platforms (TikTok, Instagram)
- Campaign budget flexibility
- Promoter onboarding process

### ✅ Responsive Design with Tailwind CSS
- Mobile-first responsive design
- Consistent spacing and typography
- Professional color scheme (indigo/blue theme)
- Accessible navigation and interactions

## Technical Implementation

### Components Used
- ShadcnUI components (Button, Card, Badge)
- Next.js Link for navigation
- Tailwind CSS for styling
- Proper TypeScript types

### SEO Optimization
- Comprehensive metadata
- Indonesian language support (`lang="id"`)
- Open Graph and Twitter card tags
- Proper semantic HTML structure

### Performance
- Static generation for fast loading
- Optimized bundle size (14kB main page)
- Image optimization disabled for static export
- Efficient CSS with Tailwind

## Navigation Structure
- **Header**: Brand name, login/register links
- **Hero**: Main value proposition and CTAs
- **Features**: Separate sections for creators and promoters
- **Pricing**: Transparent fee structure
- **FAQ**: Common questions and answers
- **Footer**: Additional links and copyright

## Links to Other Apps
- Auth subdomain: `https://auth.domain.com`
- Dashboard subdomain: `https://dashboard.domain.com`
- Admin subdomain: `https://admin.domain.com`

## Build & Deploy
```bash
npm run build    # Generates static files
npm run start    # Serves built files
npm run dev      # Development server
npm test         # Run tests
```

## Requirements Satisfied
- ✅ Setup Next.js app untuk www.domain.com dengan static generation
- ✅ Implementasi hero section dengan value proposition
- ✅ Buat feature sections untuk creators dan promoters
- ✅ Setup pricing information dan FAQ section
- ✅ Implementasi responsive design dengan Tailwind CSS
- ✅ _Requirements: 9.1_ (Multi-subdomain architecture support)