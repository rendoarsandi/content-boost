// Note: This class should be used server-side only
// Access token management is handled externally

export interface InstagramUserInfo {
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

export interface InstagramMediaInfo {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
  username: string;
  like_count?: number;
  comments_count?: number;
  shares_count?: number;
  plays?: number; // For videos
  reach?: number;
  impressions?: number;
}

export interface InstagramInsights {
  name: string;
  period: 'day' | 'week' | 'days_28' | 'lifetime';
  values: Array<{
    value: number;
    end_time?: string;
  }>;
  title: string;
  description: string;
  id: string;
}

export class InstagramAPI {
  private baseURL = 'https://graph.instagram.com';

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
      const url = `${this.baseURL}${endpoint}${endpoint.includes('?') ? '&' : '?'}access_token=${this.accessToken}`;

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(
          `Instagram API error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('Instagram API request failed:', error);
      throw error;
    }
  }

  async getUserInfo(): Promise<InstagramUserInfo> {
    const fields = [
      'id',
      'username',
      'account_type',
      'media_count',
      'followers_count',
      'follows_count',
      'name',
      'biography',
      'website',
      'profile_picture_url',
    ].join(',');

    const response = await this.makeRequest<InstagramUserInfo>(
      `/me?fields=${fields}`
    );
    return response;
  }

  async getUserMedia(
    limit: number = 25,
    after?: string
  ): Promise<{
    data: InstagramMediaInfo[];
    paging?: {
      cursors: {
        before: string;
        after: string;
      };
      next?: string;
      previous?: string;
    };
  }> {
    const fields = [
      'id',
      'media_type',
      'media_url',
      'permalink',
      'thumbnail_url',
      'caption',
      'timestamp',
      'username',
    ].join(',');

    let endpoint = `/me/media?fields=${fields}&limit=${limit}`;

    if (after) {
      endpoint += `&after=${after}`;
    }

    return await this.makeRequest(endpoint);
  }

  async getMediaInsights(
    mediaId: string,
    metrics: string[] = [
      'impressions',
      'reach',
      'likes',
      'comments',
      'shares',
      'plays', // For videos
    ]
  ): Promise<{ data: InstagramInsights[] }> {
    const metricsParam = metrics.join(',');
    return await this.makeRequest(
      `/${mediaId}/insights?metric=${metricsParam}`
    );
  }

  async getMediaById(mediaId: string): Promise<InstagramMediaInfo> {
    const fields = [
      'id',
      'media_type',
      'media_url',
      'permalink',
      'thumbnail_url',
      'caption',
      'timestamp',
      'username',
      'like_count',
      'comments_count',
    ].join(',');

    return await this.makeRequest(`/${mediaId}?fields=${fields}`);
  }

  async getUserInsights(
    metrics: string[] = ['impressions', 'reach', 'profile_views'],
    period: 'day' | 'week' | 'days_28' = 'day',
    since?: string,
    until?: string
  ): Promise<{ data: InstagramInsights[] }> {
    const metricsParam = metrics.join(',');
    let endpoint = `/me/insights?metric=${metricsParam}&period=${period}`;

    if (since) {
      endpoint += `&since=${since}`;
    }

    if (until) {
      endpoint += `&until=${until}`;
    }

    return await this.makeRequest(endpoint);
  }

  // Utility method to extract media ID from Instagram URL
  static extractMediaId(url: string): string | null {
    const patterns = [
      /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
      /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  // Convert shortcode to media ID (Instagram uses different formats)
  static async shortcodeToMediaId(shortcode: string): Promise<string> {
    // Instagram shortcode to media ID conversion
    // This is a simplified version - in production you might want to use Instagram's API
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let id = 0;

    for (let i = 0; i < shortcode.length; i++) {
      id = id * 64 + alphabet.indexOf(shortcode[i]);
    }

    return id.toString();
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

  // Batch request helper for multiple media insights
  async getBatchMediaInsights(
    mediaIds: string[]
  ): Promise<Map<string, InstagramInsights[]>> {
    const results = new Map<string, InstagramInsights[]>();

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < mediaIds.length; i += batchSize) {
      const batch = mediaIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async mediaId => {
        try {
          const insights = await this.getMediaInsights(mediaId);
          results.set(mediaId, insights.data);
        } catch (error) {
          console.error(`Failed to get insights for media ${mediaId}:`, error);
          results.set(mediaId, []);
        }
      });

      await Promise.all(batchPromises);

      // Rate limiting delay between batches
      if (i + batchSize < mediaIds.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }
}
