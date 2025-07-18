'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@repo/auth';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, AlertDescription } from '@repo/ui';
import { Loader2, Music, Camera } from 'lucide-react';

function LoginForm() {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const callbackUrl = searchParams.get('callbackUrl') || 'https://dashboard.domain.com';
  const error_param = searchParams.get('error');
  
  // Handle OAuth errors from URL params
  useEffect(() => {
    if (error_param) {
      setError(`Authentication failed: ${error_param}`);
    }
  }, [error_param]);
  
  // Check session on component mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentSession = await authClient.getSession();
        setSession(currentSession);
        
        // If user is authenticated, redirect to callback URL
        if (currentSession?.data?.user) {
          // For now, just redirect to callback URL
          // Role checking will be handled by the dashboard app
          window.location.href = callbackUrl;
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };
    
    checkSession();
  }, [router, callbackUrl]);

  const handleSocialLogin = async (provider: 'tiktok' | 'instagram') => {
    try {
      setIsLoading(provider);
      setError(null);
      
      // Generate OAuth URLs for TikTok and Instagram
      const oauthUrls = {
        tiktok: `https://www.tiktok.com/auth/authorize/?client_key=${process.env.NEXT_PUBLIC_TIKTOK_CLIENT_ID}&scope=user.info.basic,video.list&response_type=code&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/tiktok')}&state=${encodeURIComponent(callbackUrl)}`,
        instagram: `https://api.instagram.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(window.location.origin + '/api/auth/callback/instagram')}&scope=user_profile,user_media&response_type=code&state=${encodeURIComponent(callbackUrl)}`,
      };
      
      // For development, use mock OAuth flow
      if (process.env.NODE_ENV === 'development') {
        // Simulate OAuth flow by redirecting to callback with mock code
        const mockCode = `mock_${provider}_code_${Date.now()}`;
        window.location.href = `/api/auth/callback/${provider}?code=${mockCode}&state=${encodeURIComponent(callbackUrl)}`;
      } else {
        // Redirect to actual OAuth provider
        window.location.href = oauthUrls[provider];
      }
    } catch (err) {
      console.error(`${provider} login error:`, err);
      setError(`An error occurred during ${provider} login. Please try again.`);
      setIsLoading(null);
    }
  };
  
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Login ke akun Creator Promotion Platform Anda
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
            >
              {isLoading === 'tiktok' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Music className="mr-2 h-4 w-4" />
                  Login with TikTok
                </>
              )}
            </Button>
            
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              onClick={() => handleSocialLogin('instagram')}
              disabled={isLoading !== null}
            >
              {isLoading === 'instagram' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Login with Instagram
                </>
              )}
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-600">
            <p>
              Dengan login, Anda menyetujui{' '}
              <a href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              dan{' '}
              <a href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </CardContent>
        </Card>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}