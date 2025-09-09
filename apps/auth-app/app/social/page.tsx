'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
  Badge,
} from '@repo/ui';
import {
  ExternalLink,
  Unlink,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

// These interfaces would ideally be shared from a central types package
interface SocialAccount {
  provider: 'tiktok' | 'instagram';
  provider_user_id: string;
  user_id: string;
  created_at: string;
  // Supabase stores the full token, but we only expose what's needed.
}

interface SocialProfile {
  platform: 'tiktok' | 'instagram';
  username: string;
  displayName: string;
  followerCount: number;
  mediaCount: number;
  profilePictureUrl?: string;
}

// Helper function to check if environment variables are available
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured');
    return null;
  }
  
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

export default function SocialAccountsPage() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    // Middleware handles unauthenticated users.
    // We just need to fetch the data on component mount.
    fetchSocialData();
  }, []);

  const fetchSocialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // These API routes will need to be implemented or updated
      const accountsResponse = await fetch('/api/social/accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData.data || []);
      } else {
        throw new Error('Failed to load connected accounts');
      }

      const profileResponse = await fetch('/api/social/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfiles(profileData.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching social data:', err);
      setError(err.message || 'Failed to load social accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: 'tiktok' | 'instagram') => {
    if (!supabase) {
      setError('Authentication service not configured. Please check environment variables.');
      return;
    }
    
    await supabase.auth.signInWithOAuth({
      provider: provider as any, // Cast to any to allow custom providers
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        scopes:
          provider === 'tiktok'
            ? 'user.info.basic,video.list'
            : 'user_profile,user_media',
      },
    });
  };

  const handleDisconnect = async (provider: 'tiktok' | 'instagram') => {
    try {
      setDisconnecting(provider);
      // This API route will need to be implemented
      const response = await fetch(`/api/social/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        throw new Error(`Failed to disconnect ${provider} account`);
      }
      await fetchSocialData(); // Refresh data
    } catch (err: any) {
      console.error(`Error disconnecting ${provider}:`, err);
      setError(err.message || `Failed to disconnect ${provider} account`);
    } finally {
      setDisconnecting(null);
    }
  };

  const isConnected = (provider: 'tiktok' | 'instagram') => {
    return accounts.some(account => account.provider === provider);
  };

  const getProfile = (provider: 'tiktok' | 'instagram') => {
    return profiles.find(profile => profile.platform === provider);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Social Media Accounts
          </h1>
          <p className="text-gray-600 mt-2">
            Connect your social media accounts to enable content tracking.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Card for TikTok */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>TikTok</CardTitle>
                {isConnected('tiktok') ? (
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isConnected('tiktok') ? (
                <div>
                  {/* Display profile info */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('tiktok')}
                    disabled={disconnecting === 'tiktok'}
                  >
                    {disconnecting === 'tiktok' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4 mr-2" />
                    )}
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleConnect('tiktok')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect TikTok
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Card for Instagram */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Instagram</CardTitle>
                {isConnected('instagram') ? (
                  <Badge variant="default">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isConnected('instagram') ? (
                <div>
                  {/* Display profile info */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect('instagram')}
                    disabled={disconnecting === 'instagram'}
                  >
                    {disconnecting === 'instagram' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4 mr-2" />
                    )}
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleConnect('instagram')}
                  className="w-full"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Connect Instagram
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
