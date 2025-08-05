// BetterAuth OAuth providers
export { tiktokProvider } from './tiktok';
export type { TikTokProfile } from './tiktok';

export { instagramProvider } from './instagram';
export type { InstagramProfile } from './instagram';

// Provider utilities
export const getProviderConfig = (provider: 'tiktok' | 'instagram') => {
  switch (provider) {
    case 'tiktok':
      return {
        clientId: process.env.TIKTOK_CLIENT_ID,
        clientSecret: process.env.TIKTOK_CLIENT_SECRET,
        scope: 'user.info.basic,user.info.profile,user.info.stats,video.list',
        authUrl: 'https://www.tiktok.com/auth/authorize/',
        tokenUrl: 'https://open-api.tiktok.com/oauth/access_token/',
        userInfoUrl: 'https://open-api.tiktok.com/v2/user/info/',
      };
    case 'instagram':
      return {
        clientId: process.env.INSTAGRAM_CLIENT_ID,
        clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
        scope: 'user_profile,user_media',
        authUrl: 'https://api.instagram.com/oauth/authorize',
        tokenUrl: 'https://api.instagram.com/oauth/access_token',
        userInfoUrl: 'https://graph.instagram.com/me',
      };
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

export const validateProviderConfig = (
  provider: 'tiktok' | 'instagram'
): boolean => {
  const config = getProviderConfig(provider);
  return !!(config.clientId && config.clientSecret);
};
