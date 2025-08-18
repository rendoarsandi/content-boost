import { createClient } from '@supabase/supabase-js';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string;
  category:
    | 'earnings'
    | 'performance'
    | 'milestones'
    | 'community'
    | 'specialization'
    | 'loyalty';
  criteria: {
    type:
      | 'earnings'
      | 'campaigns'
      | 'rating'
      | 'streak'
      | 'referrals'
      | 'reviews';
    threshold: number;
    timeframe?: 'day' | 'week' | 'month' | 'year' | 'all_time';
    additional_conditions?: Record<string, any>;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  created_at: string;
}

interface UserAchievement {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  progress?: number;
  badge?: Badge;
}

interface UserProgress {
  user_id: string;
  total_points: number;
  level: number;
  current_streak: number;
  longest_streak: number;
  achievements_count: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  next_level_points: number;
  progress_to_next_level: number;
}

interface LeaderboardEntry {
  user_id: string;
  points: number;
  level: number;
  achievements_count: number;
  tier: string;
  rank: number;
  user?: {
    email: string;
    role: string;
  };
}

export class GamificationService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getUserAchievements(
    userId: string
  ): Promise<{ achievements: UserAchievement[] | null; error: string | null }> {
    try {
      const { data, error } = await this.supabase
        .from('user_achievements')
        .select(
          `
          id,
          user_id,
          badge_id,
          earned_at,
          badges (
            id,
            name,
            description,
            icon_url,
            category,
            criteria,
            rarity,
            points
          )
        `
        )
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) {
        return { achievements: null, error: error.message };
      }

      const achievements =
        data?.map((item: any) => ({
          ...item,
          badge: item.badges,
        })) || [];

      return { achievements, error: null };
    } catch (error) {
      return { achievements: null, error: 'Failed to fetch user achievements' };
    }
  }

  async getUserProgress(
    userId: string
  ): Promise<{ progress: UserProgress | null; error: string | null }> {
    try {
      // Get user's total points from achievements
      const { data: achievementsData } = await this.supabase
        .from('user_achievements')
        .select(
          `
          badges!inner(
            points
          )
        `
        )
        .eq('user_id', userId);

      const totalPoints =
        achievementsData?.reduce(
          (sum: number, achievement: any) =>
            sum + (achievement.badges?.points || 0),
          0
        ) || 0;

      // Calculate level (100 points per level)
      const level = Math.floor(totalPoints / 100) + 1;
      const nextLevelPoints = level * 100;
      const progressToNextLevel = ((totalPoints % 100) / 100) * 100;

      // Determine tier based on level
      let tier: 'bronze' | 'silver' | 'gold' | 'platinum' = 'bronze';
      if (level >= 50) tier = 'platinum';
      else if (level >= 25) tier = 'gold';
      else if (level >= 10) tier = 'silver';

      // Get achievements count
      const { count: achievementsCount } = await this.supabase
        .from('user_achievements')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Get streak info (mock implementation)
      const currentStreak = 0; // Would calculate based on campaign activity
      const longestStreak = 0; // Would calculate from historical data

      const progress: UserProgress = {
        user_id: userId,
        total_points: totalPoints,
        level,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        achievements_count: achievementsCount || 0,
        tier,
        next_level_points: nextLevelPoints,
        progress_to_next_level: progressToNextLevel,
      };

      return { progress, error: null };
    } catch (error) {
      return { progress: null, error: 'Failed to fetch user progress' };
    }
  }

  async getAllBadges(): Promise<{
    badges: Badge[] | null;
    error: string | null;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('badges')
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        return { badges: null, error: error.message };
      }

      return { badges: data || [], error: null };
    } catch (error) {
      return { badges: null, error: 'Failed to fetch badges' };
    }
  }

  async awardBadge(
    userId: string,
    badgeId: string,
    progress?: number
  ): Promise<{ achievement: UserAchievement | null; error: string | null }> {
    try {
      // Check if user already has this badge
      const { data: existing } = await this.supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .single();

      if (existing) {
        return { achievement: null, error: 'Badge already awarded' };
      }

      // Award the badge
      const { data, error } = await this.supabase
        .from('user_achievements')
        .insert({
          user_id: userId,
          badge_id: badgeId,
          progress,
          earned_at: new Date().toISOString(),
        })
        .select(
          `
          id,
          user_id,
          badge_id,
          earned_at,
          progress,
          badges (
            id,
            name,
            description,
            icon_url,
            category,
            criteria,
            rarity,
            points
          )
        `
        )
        .single();

      if (error) {
        return { achievement: null, error: error.message };
      }

      const achievement = {
        ...data,
        badge: data.badges,
      };

      return { achievement, error: null };
    } catch (error) {
      return { achievement: null, error: 'Failed to award badge' };
    }
  }

  async checkAndAwardBadges(
    userId: string
  ): Promise<{ newBadges: UserAchievement[]; error: string | null }> {
    try {
      const newBadges: UserAchievement[] = [];
      const { badges } = await this.getAllBadges();

      if (!badges) return { newBadges, error: null };

      // Get user's current achievements to avoid duplicates
      const { achievements: currentAchievements } =
        await this.getUserAchievements(userId);
      const earnedBadgeIds = new Set(
        currentAchievements?.map(a => a.badge_id) || []
      );

      // Check each badge criteria
      for (const badge of badges) {
        if (earnedBadgeIds.has(badge.id)) continue;

        const qualifies = await this.checkBadgeCriteria(userId, badge);
        if (qualifies) {
          const { achievement } = await this.awardBadge(userId, badge.id);
          if (achievement) {
            newBadges.push(achievement);
          }
        }
      }

      return { newBadges, error: null };
    } catch (error) {
      return { newBadges: [], error: 'Failed to check and award badges' };
    }
  }

  private async checkBadgeCriteria(
    userId: string,
    badge: Badge
  ): Promise<boolean> {
    try {
      const criteria = badge.criteria;

      switch (criteria.type) {
        case 'earnings': {
          // Check total earnings
          const { data } = await this.supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('type', 'earning')
            .eq('status', 'completed');

          const totalEarnings =
            data?.reduce((sum: number, t: any) => sum + t.amount, 0) || 0;
          return totalEarnings >= criteria.threshold;
        }

        case 'campaigns': {
          // Check number of completed campaigns
          const { data } = await this.supabase
            .from('applications')
            .select('id')
            .eq('promoter_id', userId)
            .eq('status', 'completed');

          return (data?.length || 0) >= criteria.threshold;
        }

        case 'rating': {
          // Check average rating
          const { data } = await this.supabase
            .from('promoter_profiles')
            .select('rating')
            .eq('user_id', userId)
            .single();

          return (data?.rating || 0) >= criteria.threshold;
        }

        case 'streak': {
          // Check activity streak (simplified)
          // In real implementation, you'd track daily/weekly activity
          return false; // Placeholder
        }

        case 'referrals': {
          // Check referral count (if implemented)
          return false; // Placeholder
        }

        case 'reviews': {
          // Check number of positive reviews
          return false; // Placeholder
        }

        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }

  async getLeaderboard(
    limit: number = 50,
    timeframe: 'week' | 'month' | 'all_time' = 'all_time'
  ): Promise<{ leaderboard: LeaderboardEntry[] | null; error: string | null }> {
    try {
      // Get users with their total points from achievements
      const query = `
        SELECT 
          ua.user_id,
          SUM(b.points) as total_points,
          COUNT(ua.id) as achievements_count,
          u.email,
          u.role,
          pp.tier
        FROM user_achievements ua
        JOIN badges b ON ua.badge_id = b.id
        JOIN users u ON ua.user_id = u.id
        LEFT JOIN promoter_profiles pp ON ua.user_id = pp.user_id
        GROUP BY ua.user_id, u.email, u.role, pp.tier
        ORDER BY total_points DESC
        LIMIT ${limit}
      `;

      const { data, error } = await this.supabase.rpc('get_leaderboard', {
        query_limit: limit,
      });

      if (error) {
        // Fallback to simpler query
        const { data: fallbackData, error: fallbackError } = await this.supabase
          .from('user_achievements')
          .select(
            `
            user_id,
            users!inner(
              email,
              role
            ),
            badges!inner(
              points
            )
          `
          )
          .limit(limit);

        if (fallbackError) {
          return { leaderboard: null, error: fallbackError.message };
        }

        // Process fallback data
        const userStats: Record<string, any> = {};
        fallbackData?.forEach((item: any) => {
          const userId = item.user_id;
          if (!userStats[userId]) {
            userStats[userId] = {
              user_id: userId,
              points: 0,
              achievements_count: 0,
              user: item.users,
            };
          }
          userStats[userId].points += item.badges.points;
          userStats[userId].achievements_count += 1;
        });

        const leaderboard = Object.values(userStats)
          .sort((a: any, b: any) => b.points - a.points)
          .map((entry: any, index: number) => ({
            ...entry,
            rank: index + 1,
            level: Math.floor(entry.points / 100) + 1,
            tier:
              entry.points >= 5000
                ? 'platinum'
                : entry.points >= 2500
                  ? 'gold'
                  : entry.points >= 1000
                    ? 'silver'
                    : 'bronze',
          }));

        return { leaderboard, error: null };
      }

      // Process RPC data if it worked
      const leaderboard =
        data?.map((entry: any, index: number) => ({
          user_id: entry.user_id,
          points: entry.total_points,
          level: Math.floor(entry.total_points / 100) + 1,
          achievements_count: entry.achievements_count,
          tier: entry.tier || 'bronze',
          rank: index + 1,
          user: {
            email: entry.email,
            role: entry.role,
          },
        })) || [];

      return { leaderboard, error: null };
    } catch (error) {
      return { leaderboard: null, error: 'Failed to fetch leaderboard' };
    }
  }

  // Method to seed default badges
  async seedDefaultBadges(): Promise<{
    success: boolean;
    error: string | null;
  }> {
    const defaultBadges: Omit<Badge, 'id' | 'created_at'>[] = [
      {
        name: 'First Steps',
        description: 'Complete your first campaign successfully',
        icon_url: '🎯',
        category: 'milestones',
        criteria: {
          type: 'campaigns',
          threshold: 1,
        },
        rarity: 'common',
        points: 100,
      },
      {
        name: 'First $100',
        description: 'Earn your first $100 on the platform',
        icon_url: '💰',
        category: 'earnings',
        criteria: {
          type: 'earnings',
          threshold: 100,
        },
        rarity: 'common',
        points: 150,
      },
      {
        name: 'High Performer',
        description: 'Maintain a 4.5+ star rating',
        icon_url: '⭐',
        category: 'performance',
        criteria: {
          type: 'rating',
          threshold: 4.5,
        },
        rarity: 'rare',
        points: 300,
      },
      {
        name: 'Campaign Master',
        description: 'Complete 50 successful campaigns',
        icon_url: '🏆',
        category: 'milestones',
        criteria: {
          type: 'campaigns',
          threshold: 50,
        },
        rarity: 'epic',
        points: 500,
      },
      {
        name: 'Top Earner',
        description: 'Earn $5,000 lifetime',
        icon_url: '💎',
        category: 'earnings',
        criteria: {
          type: 'earnings',
          threshold: 5000,
        },
        rarity: 'epic',
        points: 750,
      },
      {
        name: 'Perfect Score',
        description: 'Maintain a perfect 5.0 star rating with 10+ reviews',
        icon_url: '🌟',
        category: 'performance',
        criteria: {
          type: 'rating',
          threshold: 5.0,
          additional_conditions: { min_reviews: 10 },
        },
        rarity: 'legendary',
        points: 1000,
      },
      {
        name: 'Community Builder',
        description: 'Complete 100 campaigns',
        icon_url: '🌍',
        category: 'community',
        criteria: {
          type: 'campaigns',
          threshold: 100,
        },
        rarity: 'legendary',
        points: 1000,
      },
      {
        name: 'Tech Specialist',
        description: 'Complete 10 tech niche campaigns',
        icon_url: '💻',
        category: 'specialization',
        criteria: {
          type: 'campaigns',
          threshold: 10,
          additional_conditions: { niche: 'technology' },
        },
        rarity: 'rare',
        points: 250,
      },
      {
        name: 'Fashion Expert',
        description: 'Complete 10 fashion niche campaigns',
        icon_url: '👗',
        category: 'specialization',
        criteria: {
          type: 'campaigns',
          threshold: 10,
          additional_conditions: { niche: 'fashion' },
        },
        rarity: 'rare',
        points: 250,
      },
      {
        name: 'Fitness Guru',
        description: 'Complete 10 fitness niche campaigns',
        icon_url: '💪',
        category: 'specialization',
        criteria: {
          type: 'campaigns',
          threshold: 10,
          additional_conditions: { niche: 'fitness' },
        },
        rarity: 'rare',
        points: 250,
      },
    ];

    try {
      for (const badge of defaultBadges) {
        const { error } = await this.supabase.from('badges').insert({
          ...badge,
          created_at: new Date().toISOString(),
        });

        if (error && !error.message.includes('duplicate')) {
          console.warn('Failed to create badge:', badge.name, error.message);
        }
      }
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: 'Failed to seed badges' };
    }
  }
}

// Legacy export for backward compatibility
export const awardBadge = (userId: string, badgeId: string) => {
  console.log(`Awarding badge ${badgeId} to user ${userId}`);
  return { success: true };
};

export type { Badge, UserAchievement, UserProgress, LeaderboardEntry };
