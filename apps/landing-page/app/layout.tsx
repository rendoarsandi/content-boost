import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'ContentBoost - Platform Promosi Konten Kreator',
  description: 'Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis. Tingkatkan engagement konten Anda dengan pembayaran harian yang transparan.',
  keywords: ['content creator', 'promosi konten', 'pay per view', 'bot detection', 'social media marketing', 'TikTok', 'Instagram'],
  authors: [{ name: 'ContentBoost Team' }],
  openGraph: {
    title: 'ContentBoost - Platform Promosi Konten Kreator',
    description: 'Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis',
    type: 'website',
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ContentBoost - Platform Promosi Konten Kreator',
    description: 'Platform promosi konten kreator dengan sistem pay-per-view dan deteksi bot otomatis',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}