'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
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
import { Loader2, Music, Camera, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const getSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not configured');
      return null;
    }
    
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  };

  const supabase = getSupabaseClient();

  useEffect(() => {
    const error_param = searchParams.get('error');
    if (error_param) {
      setError(`Authentication failed: ${error_param}`);
    }
  }, [searchParams]);

  const handleSocialLogin = async (provider: 'tiktok' | 'instagram') => {
    if (!supabase) {
      setError('Authentication service not configured. Please check environment variables.');
      return;
    }
    
    setIsLoading(provider);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(`Error logging in with ${provider}: ${error.message}`);
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Button variant="ghost" asChild>
            <Link href="https://www.domain.com">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Website
            </Link>
          </Button>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to manage your campaigns and earnings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                className="w-full bg-black hover:bg-gray-800 text-white"
                onClick={() => handleSocialLogin('tiktok')}
                disabled={isLoading !== null}
                size="lg"
              >
                {isLoading === 'tiktok' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Music className="mr-2 h-4 w-4" />
                    Continue with TikTok
                  </>
                )}
              </Button>

              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                onClick={() => handleSocialLogin('instagram')}
                disabled={isLoading !== null}
                size="lg"
              >
                {isLoading === 'instagram' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Continue with Instagram
                  </>
                )}
              </Button>
            </div>

            <p className="px-8 text-center text-sm text-muted-foreground">
              By clicking continue, you agree to our{' '}
              <Link
                href="/terms"
                className="underline underline-offset-4 hover:text-primary"
              >
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy"
                className="underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
