import {
  TikTokAPI,
  TikTokUserInfo,
  TikTokVideoInfo,
  TikTokVideoStats,
} from './tiktok';
import {
  InstagramAPI,
  InstagramUserInfo,
  InstagramMediaInfo,
  InstagramInsights,
} from './instagram';
// Note: This class should be used server-side only
// Social account management is handled externally

export interface SocialMediaMetrics {
  platform: 'tiktok' | 'instagram';
  postId: string;
  postUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  timestamp: Date;
  title?: string;
  description?: string;
}

export interface UserSocialProfile {
  platform: 'tiktok' | 'instagram';
  userId: string;
  username: string;
  displayName: string;
  followerCount: number;
  followingCount: number;
  mediaCount: number;
  isVerified?: boolean;
  profilePictureUrl?: string;
  biography?: string;
}

export class SocialMediaManager {
  private tiktokAPI?: TikTokAPI;
  private instagramAPI?: InstagramAPI;

  constructor(
    private userId: string,
    private tiktokToken?: string,
    private instagramToken?: string
  ) {}

  private initializeTikTok(): TikTokAPI {
    if (!this.tiktokAPI) {
      if (!this.tiktokToken) {
        throw new Error('TikTok token not provided');
      }
      this.tiktokAPI = new TikTokAPI(this.tiktokToken);
    }
    return this.tiktokAPI;
  }

  private initializeInstagram(): InstagramAPI {
    if (!this.instagramAPI) {
      if (!this.instagramToken) {
        throw new Error('Instagram token not provided');
      }
      this.instagramAPI = new InstagramAPI(this.instagramToken);
    }
    return this.instagramAPI;
  }

  getConnectedPlatforms(): ('tiktok' | 'instagram')[] {
    const platforms: ('tiktok' | 'instagram')[] = [];

    if (this.tiktokToken) {
      platforms.push('tiktok');
    }

    if (this.instagramToken) {
      platforms.push('instagram');
    }

    return platforms;
  }

  async getUserProfiles(): Promise<UserSocialProfile[]> {
    const profiles: UserSocialProfile[] = [];
    const platforms = this.getConnectedPlatforms();

    for (const platform of platforms) {
      try {
        if (platform === 'tiktok') {
          const tiktok = this.initializeTikTok();
          const userInfo = await tiktok.getUserInfo();

          profiles.push({
            platform: 'tiktok',
            userId: userInfo.open_id,
            username: userInfo.display_name,
            displayName: userInfo.display_name,
            followerCount: userInfo.follower_count,
            followingCount: userInfo.following_count,
            mediaCount: userInfo.video_count,
            isVerified: userInfo.is_verified,
            profilePictureUrl: userInfo.avatar_url_200,
            biography: userInfo.bio_description,
          });
        } else if (platform === 'instagram') {
          const instagram = this.initializeInstagram();
          const userInfo = await instagram.getUserInfo();

          profiles.push({
            platform: 'instagram',
            userId: userInfo.id,
            username: userInfo.username,
            displayName: userInfo.name || userInfo.username,
            followerCount: userInfo.followers_count || 0,
            followingCount: userInfo.follows_count || 0,
            mediaCount: userInfo.media_count,
            profilePictureUrl: userInfo.profile_picture_url,
            biography: userInfo.biography,
          });
        }
      } catch (error) {
        console.error(`Failed to get ${platform} profile:`, error);
      }
    }

    return profiles;
  }

  async getPostMetrics(postUrl: string): Promise<SocialMediaMetrics | null> {
    try {
      // Determine platform from URL
      if (postUrl.includes('tiktok.com')) {
        const videoId = TikTokAPI.extractVideoId(postUrl);
        if (!videoId) {
          throw new Error('Invalid TikTok URL');
        }

        const tiktok = this.initializeTikTok();
        const videoInfo = await tiktok.getVideoById(videoId);

        return {
          platform: 'tiktok',
          postId: videoInfo.video_id,
          postUrl: videoInfo.share_url,
          viewCount: videoInfo.view_count,
          likeCount: videoInfo.like_count,
          commentCount: videoInfo.comment_count,
          shareCount: videoInfo.share_count,
          timestamp: new Date(videoInfo.create_time * 1000),
          title: videoInfo.title,
          description: videoInfo.video_description,
        };
      } else if (postUrl.includes('instagram.com')) {
        const shortcode = InstagramAPI.extractMediaId(postUrl);
        if (!shortcode) {
          throw new Error('Invalid Instagram URL');
        }

        const mediaId = await InstagramAPI.shortcodeToMediaId(shortcode);
        const instagram = this.initializeInstagram();
        const mediaInfo = await instagram.getMediaById(mediaId);

        // Get insights for additional metrics
        let insights: InstagramInsights[] = [];
        try {
          const insightsResponse = await instagram.getMediaInsights(mediaId);
          insights = insightsResponse.data;
        } catch (error) {
          console.warn('Could not fetch Instagram insights:', error);
        }

        // Extract metrics from insights
        const impressions =
          insights.find(i => i.name === 'impressions')?.values[0]?.value || 0;
        const reach =
          insights.find(i => i.name === 'reach')?.values[0]?.value || 0;
        const plays =
          insights.find(i => i.name === 'plays')?.values[0]?.value || 0;

        return {
          platform: 'instagram',
          postId: mediaInfo.id,
          postUrl: mediaInfo.permalink,
          viewCount: mediaInfo.media_type === 'VIDEO' ? plays : impressions,
          likeCount: mediaInfo.like_count || 0,
          commentCount: mediaInfo.comments_count || 0,
          shareCount: 0, // Instagram doesn't provide share count in basic API
          timestamp: new Date(mediaInfo.timestamp),
          title: mediaInfo.caption?.split('\n')[0] || '',
          description: mediaInfo.caption,
        };
      } else {
        throw new Error('Unsupported platform URL');
      }
    } catch (error) {
      console.error('Failed to get post metrics:', error);
      return null;
    }
  }

  async getBatchPostMetrics(postUrls: string[]): Promise<SocialMediaMetrics[]> {
    const metrics: SocialMediaMetrics[] = [];

    // Group URLs by platform for efficient batch processing
    const tiktokUrls = postUrls.filter(url => url.includes('tiktok.com'));
    const instagramUrls = postUrls.filter(url => url.includes('instagram.com'));

    // Process TikTok URLs
    if (tiktokUrls.length > 0) {
      try {
        const tiktok = this.initializeTikTok();
        const videoIds = tiktokUrls
          .map(url => TikTokAPI.extractVideoId(url))
          .filter(id => id !== null) as string[];

        if (videoIds.length > 0) {
          const videoStats = await tiktok.getVideoStats(videoIds);

          for (const stats of videoStats) {
            const originalUrl = tiktokUrls.find(
              url => TikTokAPI.extractVideoId(url) === stats.video_id
            );

            if (originalUrl) {
              metrics.push({
                platform: 'tiktok',
                postId: stats.video_id,
                postUrl: originalUrl,
                viewCount: stats.view_count,
                likeCount: stats.like_count,
                commentCount: stats.comment_count,
                shareCount: stats.share_count,
                timestamp: new Date(), // We don't have timestamp in stats API
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to get TikTok batch metrics:', error);
      }
    }

    // Process Instagram URLs (one by one due to API limitations)
    if (instagramUrls.length > 0) {
      try {
        const instagram = this.initializeInstagram();

        for (const url of instagramUrls) {
          const metric = await this.getPostMetrics(url);
          if (metric) {
            metrics.push(metric);
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Failed to get Instagram batch metrics:', error);
      }
    }

    return metrics;
  }

  async trackPostMetrics(
    postUrl: string,
    intervalMinutes: number = 1
  ): Promise<void> {
    console.log(
      `Starting tracking for post: ${postUrl} (interval: ${intervalMinutes} minutes)`
    );

    const trackingInterval = setInterval(
      async () => {
        try {
          const metrics = await this.getPostMetrics(postUrl);
          if (metrics) {
            // Here you would typically save the metrics to your database
            console.log(`Metrics for ${postUrl}:`, metrics);

            // You can emit events or call callbacks here
            // this.emit('metrics-updated', metrics);
          }
        } catch (error) {
          console.error(`Failed to track metrics for ${postUrl}:`, error);
        }
      },
      intervalMinutes * 60 * 1000
    );

    // Store interval ID for cleanup (you might want to store this in a database)
    // this.trackingIntervals.set(postUrl, trackingInterval);
  }

  async stopTracking(postUrl: string): Promise<void> {
    // Implementation to stop tracking a specific post
    console.log(`Stopping tracking for post: ${postUrl}`);
    // clearInterval(this.trackingIntervals.get(postUrl));
    // this.trackingIntervals.delete(postUrl);
  }

  // Utility method to validate post URLs
  static isValidPostUrl(url: string): boolean {
    return url.includes('tiktok.com') || url.includes('instagram.com');
  }

  // Utility method to extract platform from URL
  static getPlatformFromUrl(url: string): 'tiktok' | 'instagram' | null {
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    return null;
  }
}
