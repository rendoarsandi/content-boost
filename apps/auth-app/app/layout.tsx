import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Authentication - Creator Promotion Platform',
  description: 'Login dan registrasi untuk Creator Promotion Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}