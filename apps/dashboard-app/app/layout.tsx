import type { Metadata } from 'next';
import React from 'react';
import '@repo/ui/styles/globals.css';
import TrpcProvider from '../utils/trpc/TrpcProvider';
import { ConvexClientProvider } from '../components/ConvexProvider';

export const metadata: Metadata = {
  title: 'Dashboard - Creator Promotion Platform',
  description: 'Dashboard untuk creators dan promoters',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <ConvexClientProvider>
          <TrpcProvider>{children}</TrpcProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
