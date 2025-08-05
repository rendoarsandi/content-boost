'use client';

import { useState, useEffect } from 'react';
import { authClient } from '@repo/auth';
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
} from 'lucide-react';

interface SocialAccount {
  id: string;
  provider: 'tiktok' | 'instagram';
  platformUserId: string;
  createdAt: string;
  expiresAt?: string;
}

interface SocialProfile {
  platform: 'tiktok' | 'instagram';
  username: string;
  displayName: string;
  followerCount: number;
  mediaCount: number;
  profilePictureUrl?: string;
}

export default function SocialAccountsPage() {
  const [session, setSession] = useState<any>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [profiles, setProfiles] = useState<SocialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentSession = await authClient.getSession();
        setSession(currentSession);

        if (currentSession?.data?.user) {
          fetchSocialData();
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const fetchSocialData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch social accounts
      const accountsResponse = await fetch('/api/auth/social-accounts');
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setAccounts(accountsData);
      }

      // Fetch social profiles
      const profileResponse = await fetch('/api/social/profile');
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setProfiles(profileData.data.profiles || []);
      }
    } catch (err) {
      console.error('Error fetching social data:', err);
      setError('Failed to load social accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider: 'tiktok' | 'instagram') => {
    window.location.href = `/api/social/connect/${provider}`;
  };

  const handleDisconnect = async (provider: 'tiktok' | 'instagram') => {
    try {
      setDisconnecting(provider);

      // Call the disconnect API
      const response = await fetch(`/api/social/disconnect/${provider}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to disconnect ${provider} account`);
      }

      // Refresh data
      await fetchSocialData();
    } catch (err) {
      console.error(`Error disconnecting ${provider}:`, err);
      setError(`Failed to disconnect ${provider} account`);
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

  const isTokenExpired = (provider: 'tiktok' | 'instagram') => {
    const account = accounts.find(acc => acc.provider === provider);
    if (!account?.expiresAt) return false;
    return new Date(account.expiresAt) < new Date();
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to manage your social accounts.</p>
          </CardContent>
        </Card>
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
            Connect your social media accounts to enable content tracking and
            metrics collection.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* TikTok Account */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">TT</span>
                  </div>
                  <div>
                    <CardTitle>TikTok</CardTitle>
                    <CardDescription>
                      Connect your TikTok account
                    </CardDescription>
                  </div>
                </div>
                {isConnected('tiktok') ? (
                  <Badge
                    variant={
                      isTokenExpired('tiktok') ? 'destructive' : 'default'
                    }
                  >
                    {isTokenExpired('tiktok') ? (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Expired
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isConnected('tiktok') ? (
                <div className="space-y-4">
                  {(() => {
                    const profile = getProfile('tiktok');
                    return profile ? (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        {profile.profilePictureUrl && (
                          <img
                            src={profile.profilePictureUrl}
                            alt={profile.username}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium">{profile.displayName}</p>
                          <p className="text-sm text-gray-600">
                            @{profile.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {profile.followerCount.toLocaleString()} followers •{' '}
                            {profile.mediaCount} videos
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Loading profile...
                        </p>
                      </div>
                    );
                  })()}

                  <div className="flex space-x-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect('tiktok')}
                      disabled={disconnecting === 'tiktok'}
                    >
                      {disconnecting === 'tiktok' ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </Button>

                    {isTokenExpired('tiktok') && (
                      <Button size="sm" onClick={() => handleConnect('tiktok')}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reconnect
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Connect your TikTok account to enable video tracking and
                    metrics collection.
                  </p>
                  <Button
                    onClick={() => handleConnect('tiktok')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect TikTok
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instagram Account */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">IG</span>
                  </div>
                  <div>
                    <CardTitle>Instagram</CardTitle>
                    <CardDescription>
                      Connect your Instagram account
                    </CardDescription>
                  </div>
                </div>
                {isConnected('instagram') ? (
                  <Badge
                    variant={
                      isTokenExpired('instagram') ? 'destructive' : 'default'
                    }
                  >
                    {isTokenExpired('instagram') ? (
                      <>
                        <XCircle className="w-3 h-3 mr-1" />
                        Expired
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Connected</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isConnected('instagram') ? (
                <div className="space-y-4">
                  {(() => {
                    const profile = getProfile('instagram');
                    return profile ? (
                      <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        {profile.profilePictureUrl && (
                          <img
                            src={profile.profilePictureUrl}
                            alt={profile.username}
                            className="w-10 h-10 rounded-full"
                          />
                        )}
                        <div>
                          <p className="font-medium">{profile.displayName}</p>
                          <p className="text-sm text-gray-600">
                            @{profile.username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {profile.followerCount.toLocaleString()} followers •{' '}
                            {profile.mediaCount} posts
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          Loading profile...
                        </p>
                      </div>
                    );
                  })()}

                  <div className="flex space-x-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDisconnect('instagram')}
                      disabled={disconnecting === 'instagram'}
                    >
                      {disconnecting === 'instagram' ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Unlink className="w-4 h-4 mr-2" />
                      )}
                      Disconnect
                    </Button>

                    {isTokenExpired('instagram') && (
                      <Button
                        size="sm"
                        onClick={() => handleConnect('instagram')}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reconnect
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Connect your Instagram account to enable post tracking and
                    metrics collection.
                  </p>
                  <Button
                    onClick={() => handleConnect('instagram')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Instagram
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">1</span>
                </div>
                <div>
                  <p className="font-medium">Connect your accounts</p>
                  <p className="text-sm text-gray-600">
                    Link your TikTok and Instagram accounts to enable automatic
                    metrics tracking.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">2</span>
                </div>
                <div>
                  <p className="font-medium">Automatic tracking</p>
                  <p className="text-sm text-gray-600">
                    Our system will automatically track views, likes, comments,
                    and shares for your promoted content.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-sm font-medium">3</span>
                </div>
                <div>
                  <p className="font-medium">Bot detection</p>
                  <p className="text-sm text-gray-600">
                    Advanced algorithms detect and filter out bot interactions
                    to ensure fair payment calculations.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
