// Note: This class should be used server-side only
// Access token management is handled externally

export interface TikTokUserInfo {
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

export interface TikTokVideoInfo {
  video_id: string;
  title: string;
  video_description: string;
  duration: number;
  height: number;
  width: number;
  cover_image_url: string;
  share_url: string;
  embed_html: string;
  embed_link: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  create_time: number;
}

export interface TikTokVideoStats {
  video_id: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
}

export class TikTokAPI {
  private baseURL = 'https://open-api.tiktok.com';

  constructor(private accessToken: string) {}

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const headers = this.getHeaders();

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `TikTok API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('TikTok API request failed:', error);
      throw error;
    }
  }

  async getUserInfo(): Promise<TikTokUserInfo> {
    const response = await this.makeRequest<{
      data: {
        user: TikTokUserInfo;
      };
    }>('/v2/user/info/');

    return response.data.user;
  }

  async getUserVideos(
    cursor?: string,
    max_count: number = 20
  ): Promise<{
    videos: TikTokVideoInfo[];
    cursor: string;
    has_more: boolean;
  }> {
    const params = new URLSearchParams({
      max_count: max_count.toString(),
    });

    if (cursor) {
      params.append('cursor', cursor);
    }

    const response = await this.makeRequest<{
      data: {
        videos: TikTokVideoInfo[];
        cursor: string;
        has_more: boolean;
      };
    }>(`/v2/video/list/?${params}`);

    return response.data;
  }

  async getVideoStats(video_ids: string[]): Promise<TikTokVideoStats[]> {
    const response = await this.makeRequest<{
      data: {
        videos: TikTokVideoStats[];
      };
    }>('/v2/video/query/', {
      method: 'POST',
      body: JSON.stringify({
        video_ids,
        fields: ['like_count', 'comment_count', 'share_count', 'view_count'],
      }),
    });

    return response.data.videos;
  }

  async getVideoById(video_id: string): Promise<TikTokVideoInfo> {
    const response = await this.makeRequest<{
      data: {
        videos: TikTokVideoInfo[];
      };
    }>('/v2/video/query/', {
      method: 'POST',
      body: JSON.stringify({
        video_ids: [video_id],
        fields: [
          'video_id',
          'title',
          'video_description',
          'duration',
          'height',
          'width',
          'cover_image_url',
          'share_url',
          'embed_html',
          'embed_link',
          'like_count',
          'comment_count',
          'share_count',
          'view_count',
          'create_time',
        ],
      }),
    });

    if (!response.data.videos.length) {
      throw new Error(`Video not found: ${video_id}`);
    }

    return response.data.videos[0];
  }

  // Utility method to extract video ID from TikTok URL
  static extractVideoId(url: string): string | null {
    const patterns = [
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
      /tiktok\.com\/v\/(\d+)/,
      /vm\.tiktok\.com\/(\w+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Rate limiting helper
  static async withRateLimit<T>(
    fn: () => Promise<T>,
    delay: number = 1000
  ): Promise<T> {
    const result = await fn();
    await new Promise(resolve => setTimeout(resolve, delay));
    return result;
  }
}
