import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Authentication - Creator Promotion Platform',
  description: 'Login dan registrasi untuk Creator Promotion Platform. Bergabunglah sebagai creator atau promoter untuk mulai menghasilkan income dari konten promosi.',
  keywords: 'creator, promoter, social media, TikTok, Instagram, content promotion, influencer marketing',
  authors: [{ name: 'Creator Promotion Platform' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Authentication - Creator Promotion Platform',
    description: 'Login dan registrasi untuk Creator Promotion Platform',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Authentication - Creator Promotion Platform',
    description: 'Login dan registrasi untuk Creator Promotion Platform',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full">
      <body className="h-full antialiased bg-gray-50">
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}