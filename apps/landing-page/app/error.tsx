'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@repo/ui';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Landing page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
        </div>
        <h1 className="text-3xl font-bold mb-4">Terjadi Kesalahan</h1>
        <p className="text-muted-foreground mb-8">
          Maaf, terjadi kesalahan tak terduga. Silakan coba lagi atau kembali ke beranda.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Kembali ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}