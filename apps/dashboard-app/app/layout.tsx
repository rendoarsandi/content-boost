import type { Metadata } from 'next';
import React from 'react';
import './globals.css';
import TrpcProvider from '../utils/trpc/TrpcProvider';

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
        <TrpcProvider>{children}</TrpcProvider>
      </body>
    </html>
  );
}