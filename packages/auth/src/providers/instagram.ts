// Note: OAuth provider configuration will be implemented later

export interface InstagramProfile {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
  media_count: number;
  followers_count?: number;
  follows_count?: number;
  name?: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
}

// Instagram provider will be implemented when proper OAuth configuration is available
export const instagramProvider = {
  id: 'instagram',
  name: 'Instagram',
  // Implementation will be added later
};
