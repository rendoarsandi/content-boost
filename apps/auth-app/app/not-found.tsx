'use client';

import Link from 'next/link';
import { Button } from '@repo/ui';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          The authentication page you are looking for does not exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild>
            <Link href="/login">
              <Home className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}