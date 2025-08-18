'use client';

import React, { useState, useEffect } from 'react';
import {
  GamificationService,
  Badge,
  UserAchievement,
  UserProgress,
  LeaderboardEntry,
} from '@repo/gamification';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge as UIBadge } from './badge';
import { Progress } from './progress';
import { Avatar, AvatarFallback } from './avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import {
  Trophy,
  Star,
  Target,
  TrendingUp,
  Award,
  Medal,
  Crown,
  Zap,
} from 'lucide-react';

interface GamificationDashboardProps {
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export function GamificationDashboard({
  userId,
  supabaseUrl,
  supabaseKey,
}: GamificationDashboardProps) {
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const gamificationService = new GamificationService(supabaseUrl, supabaseKey);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        achievementsResult,
        progressResult,
        badgesResult,
        leaderboardResult,
      ] = await Promise.all([
        gamificationService.getUserAchievements(userId),
        gamificationService.getUserProgress(userId),
        gamificationService.getAllBadges(),
        gamificationService.getLeaderboard(10),
      ]);

      if (achievementsResult.error) {
        setError(achievementsResult.error);
      } else {
        setAchievements(achievementsResult.achievements || []);
      }

      if (progressResult.error) {
        setError(progressResult.error);
      } else {
        setProgress(progressResult.progress);
      }

      if (badgesResult.error) {
        setError(badgesResult.error);
      } else {
        setAllBadges(badgesResult.badges || []);
      }

      if (leaderboardResult.error) {
        setError(leaderboardResult.error);
      } else {
        setLeaderboard(leaderboardResult.leaderboard || []);
      }
    } catch (error) {
      setError('Failed to load gamification data');
    }

    setLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'rare':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'earnings':
        return <Trophy className="h-5 w-5" />;
      case 'performance':
        return <Star className="h-5 w-5" />;
      case 'milestones':
        return <Target className="h-5 w-5" />;
      case 'community':
        return <TrendingUp className="h-5 w-5" />;
      case 'specialization':
        return <Award className="h-5 w-5" />;
      case 'loyalty':
        return <Medal className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'platinum':
        return <Crown className="h-6 w-6 text-purple-500" />;
      case 'gold':
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 'silver':
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 'bronze':
        return <Medal className="h-6 w-6 text-orange-500" />;
      default:
        return <Medal className="h-6 w-6 text-gray-500" />;
    }
  };

  const getUnlockedBadges = () => {
    const earnedBadgeIds = new Set(achievements.map(a => a.badge_id));
    return allBadges.filter(badge => earnedBadgeIds.has(badge.id));
  };

  const getAvailableBadges = () => {
    const earnedBadgeIds = new Set(achievements.map(a => a.badge_id));
    return allBadges.filter(badge => !earnedBadgeIds.has(badge.id));
  };

  const getUserRank = () => {
    const userEntry = leaderboard.find(entry => entry.user_id === userId);
    return userEntry?.rank || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Achievements & Progress</h2>
          <p className="text-gray-600">
            Track your milestones and compete with other promoters
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="badges">Badges</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {progress && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Level</CardTitle>
                  {getTierIcon(progress.tier)}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{progress.level}</div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Progress
                      value={progress.progress_to_next_level}
                      className="flex-1"
                    />
                    <span className="text-xs text-gray-500">
                      {progress.progress_to_next_level.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.next_level_points - progress.total_points} points
                    to level {progress.level + 1}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Points
                  </CardTitle>
                  <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {progress.total_points.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progress.tier.charAt(0).toUpperCase() +
                      progress.tier.slice(1)}{' '}
                    Tier
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Achievements
                  </CardTitle>
                  <Trophy className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {progress.achievements_count}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {allBadges.length - progress.achievements_count} remaining
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rank</CardTitle>
                  <Crown className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    #{getUserRank() || 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Global ranking
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Achievements</CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {achievements.slice(0, 6).map(achievement => (
                    <div
                      key={achievement.id}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedBadge(achievement.badge!)}
                    >
                      <div className="text-2xl">
                        {achievement.badge?.icon_url}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {achievement.badge?.name}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {achievement.badge?.description}
                        </p>
                        <UIBadge
                          className={`text-xs ${getRarityColor(achievement.badge?.rarity || 'common')}`}
                        >
                          {achievement.badge?.rarity}
                        </UIBadge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No achievements yet. Complete your first campaign to get
                  started!
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="badges" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Unlocked Badges ({getUnlockedBadges().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {getUnlockedBadges().map(badge => {
                  const achievement = achievements.find(
                    a => a.badge_id === badge.id
                  );
                  return (
                    <div
                      key={badge.id}
                      className="p-4 rounded-lg border-2 bg-white hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setSelectedBadge(badge)}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">{badge.icon_url}</div>
                        <h3 className="font-semibold text-sm mb-1">
                          {badge.name}
                        </h3>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {badge.description}
                        </p>
                        <UIBadge className={getRarityColor(badge.rarity)}>
                          {badge.rarity} • {badge.points} pts
                        </UIBadge>
                        {achievement && (
                          <p className="text-xs text-gray-500 mt-1">
                            Earned{' '}
                            {new Date(
                              achievement.earned_at
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Available Badges ({getAvailableBadges().length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {getAvailableBadges().map(badge => (
                  <div
                    key={badge.id}
                    className="p-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 opacity-60 hover:opacity-80 transition-opacity cursor-pointer"
                    onClick={() => setSelectedBadge(badge)}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2 grayscale">
                        {badge.icon_url}
                      </div>
                      <h3 className="font-semibold text-sm mb-1">
                        {badge.name}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                        {badge.description}
                      </p>
                      <UIBadge variant="outline" className="text-xs">
                        {badge.rarity} • {badge.points} pts
                      </UIBadge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Promoters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.user_id === userId;
                  return (
                    <div
                      key={entry.user_id}
                      className={`flex items-center space-x-4 p-4 rounded-lg transition-colors ${
                        isCurrentUser
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white font-bold text-sm">
                        {entry.rank <= 3 ? (
                          <span
                            className={
                              index === 0
                                ? 'text-yellow-500'
                                : index === 1
                                  ? 'text-gray-400'
                                  : 'text-orange-500'
                            }
                          >
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          entry.rank
                        )}
                      </div>

                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {entry.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3
                            className={`font-medium ${isCurrentUser ? 'text-blue-700' : ''}`}
                          >
                            {entry.user?.email?.split('@')[0] || 'User'}
                            {isCurrentUser && (
                              <span className="text-blue-500 ml-2">(You)</span>
                            )}
                          </h3>
                          {getTierIcon(entry.tier)}
                        </div>
                        <p className="text-sm text-gray-600">
                          Level {entry.level} • {entry.achievements_count}{' '}
                          achievements
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="font-bold">
                          {entry.points.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          {progress && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Level Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Level {progress.level}
                      </span>
                      <span className="text-sm text-gray-600">
                        Level {progress.level + 1}
                      </span>
                    </div>
                    <Progress
                      value={progress.progress_to_next_level}
                      className="h-3"
                    />
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{progress.total_points} points</span>
                      <span>{progress.next_level_points} points</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-3">Points Breakdown</h4>
                      <div className="space-y-2">
                        {[
                          'earnings',
                          'performance',
                          'milestones',
                          'community',
                        ].map(category => {
                          const categoryBadges = achievements.filter(
                            a => a.badge?.category === category
                          );
                          const categoryPoints = categoryBadges.reduce(
                            (sum, a) => sum + (a.badge?.points || 0),
                            0
                          );

                          return (
                            <div
                              key={category}
                              className="flex items-center justify-between"
                            >
                              <div className="flex items-center space-x-2">
                                {getCategoryIcon(category)}
                                <span className="text-sm capitalize">
                                  {category.replace('_', ' ')}
                                </span>
                              </div>
                              <span className="font-medium">
                                {categoryPoints}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Rarity Collection</h4>
                      <div className="space-y-2">
                        {['common', 'rare', 'epic', 'legendary'].map(rarity => {
                          const rarityCount = achievements.filter(
                            a => a.badge?.rarity === rarity
                          ).length;
                          const totalRarity = allBadges.filter(
                            b => b.rarity === rarity
                          ).length;

                          return (
                            <div
                              key={rarity}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm capitalize">
                                {rarity}
                              </span>
                              <span className="text-sm">
                                {rarityCount} / {totalRarity}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog
        open={selectedBadge !== null}
        onOpenChange={() => setSelectedBadge(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {selectedBadge && (
                <>
                  <span className="text-2xl">{selectedBadge.icon_url}</span>
                  <span>{selectedBadge.name}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedBadge && (
            <div className="space-y-4">
              <p className="text-gray-600">{selectedBadge.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <div className="flex items-center space-x-2 mt-1">
                    {getCategoryIcon(selectedBadge.category)}
                    <span className="capitalize">
                      {selectedBadge.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Rarity
                  </label>
                  <UIBadge
                    className={`mt-1 ${getRarityColor(selectedBadge.rarity)}`}
                  >
                    {selectedBadge.rarity}
                  </UIBadge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Points
                  </label>
                  <p className="mt-1 font-semibold">{selectedBadge.points}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Criteria
                  </label>
                  <p className="mt-1 text-sm">
                    {selectedBadge.criteria.type}:{' '}
                    {selectedBadge.criteria.threshold}
                    {selectedBadge.criteria.timeframe &&
                      ` per ${selectedBadge.criteria.timeframe}`}
                  </p>
                </div>
              </div>

              {achievements.find(a => a.badge_id === selectedBadge.id) ? (
                <UIBadge className="bg-green-100 text-green-800">
                  ✓ Unlocked
                </UIBadge>
              ) : (
                <UIBadge variant="outline">🔒 Locked</UIBadge>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
