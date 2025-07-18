// Note: OAuth provider configuration will be implemented later

export interface TikTokProfile {
  open_id: string;
  union_id: string;
  avatar_url: string;
  avatar_url_100: string;
  avatar_url_200: string;
  display_name: string;
  bio_description: string;
  profile_deep_link: string;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

// TikTok provider will be implemented when proper OAuth configuration is available
export const tiktokProvider = {
  id: "tiktok",
  name: "TikTok",
  // Implementation will be added later
};