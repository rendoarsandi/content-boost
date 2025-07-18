'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function SuccessContent() {
  const [countdown, setCountdown] = useState(3);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get('callbackUrl') || 'https://dashboard.domain.com';
  const role = searchParams.get('role');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = callbackUrl;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [callbackUrl]);

  const handleContinue = () => {
    window.location.href = callbackUrl;
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">Authentication Successful!</CardTitle>
          <CardDescription>
            {role ? `Welcome as a ${role}!` : 'You have been successfully authenticated.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Redirecting to dashboard in {countdown} seconds...
          </p>
          
          <Button onClick={handleContinue} className="w-full">
            <ArrowRight className="mr-2 h-4 w-4" />
            Continue to Dashboard
          </Button>
          
          <div className="text-center text-sm text-gray-600">
            <p>
              Selamat datang di Creator Promotion Platform!
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </CardContent>
        </Card>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}