'use client';

import { useSearchParams } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from '@repo/ui';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const message = searchParams.get('message');

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'oauth_callback_failed':
        return 'OAuth authentication failed. Please try again.';
      case 'access_denied':
        return 'Access was denied. Please grant the required permissions.';
      case 'invalid_request':
        return 'Invalid authentication request. Please try again.';
      case 'server_error':
        return 'Server error occurred. Please try again later.';
      case 'temporarily_unavailable':
        return 'Service is temporarily unavailable. Please try again later.';
      default:
        return message || 'An unexpected error occurred during authentication.';
    }
  };

  const handleRetry = () => {
    window.location.href = '/login';
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Authentication Error
          </CardTitle>
          <CardDescription>
            Terjadi kesalahan saat proses autentikasi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{getErrorMessage(error)}</AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Button onClick={handleRetry} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>

          <div className="text-center text-sm text-gray-600">
            <p>
              Jika masalah terus berlanjut, silakan hubungi{' '}
              <a
                href="mailto:support@domain.com"
                className="text-blue-600 hover:underline"
              >
                support@domain.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function ErrorPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </CardContent>
          </Card>
        </main>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
