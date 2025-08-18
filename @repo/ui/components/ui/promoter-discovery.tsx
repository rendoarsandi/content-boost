'use client';

import React, { useState, useEffect } from 'react';
import { PromoterRecommendationService } from '@repo/database/services/promoter-recommendations';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { Input } from './input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import { Avatar, AvatarFallback } from './avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Star, Users, TrendingUp, Eye, MessageCircle } from 'lucide-react';

interface PromoterDiscoveryProps {
  creatorId: string;
  campaignId?: string;
  supabaseUrl: string;
  supabaseKey: string;
}

interface PromoterProfile {
  id: string;
  user_id: string;
  bio: string;
  niche: string[];
  portfolio_links: string[];
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  followers_count?: number;
  engagement_rate?: number;
  avg_views?: number;
  rating?: number;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    role: string;
  };
}

interface PromoterRecommendation {
  id: string;
  creator_id: string;
  promoter_id: string;
  campaign_id?: string;
  score: number;
  factors: {
    niche_match: number;
    engagement_rate: number;
    follower_count: number;
    past_performance: number;
    tier_bonus: number;
  };
  created_at: string;
  promoter?: PromoterProfile;
}

interface RecommendationFilters {
  niche?: string[];
  tier?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  maxEngagementRate?: number;
  minRating?: number;
  maxViews?: number;
  minViews?: number;
}

export function PromoterDiscovery({
  creatorId,
  campaignId,
  supabaseUrl,
  supabaseKey,
}: PromoterDiscoveryProps) {
  const [activeTab, setActiveTab] = useState('recommended');
  const [recommendations, setRecommendations] = useState<
    PromoterRecommendation[]
  >([]);
  const [filteredPromoters, setFilteredPromoters] = useState<PromoterProfile[]>(
    []
  );
  const [selectedPromoter, setSelectedPromoter] =
    useState<PromoterProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<RecommendationFilters>({
    niche: [],
    tier: [],
    minFollowers: undefined,
    maxFollowers: undefined,
    minEngagementRate: undefined,
    maxEngagementRate: undefined,
    minRating: undefined,
  });

  const recommendationService = new PromoterRecommendationService(
    supabaseUrl,
    supabaseKey
  );

  const niches = [
    'Technology',
    'Fashion',
    'Beauty',
    'Fitness',
    'Food',
    'Travel',
    'Gaming',
    'Music',
    'Art',
    'Business',
    'Education',
    'Health',
  ];

  const tiers = ['bronze', 'silver', 'gold', 'platinum'];

  useEffect(() => {
    if (activeTab === 'recommended') {
      loadRecommendations();
    } else if (activeTab === 'browse') {
      loadFilteredPromoters();
    }
  }, [activeTab, creatorId, campaignId]);

  useEffect(() => {
    if (activeTab === 'browse') {
      loadFilteredPromoters();
    }
  }, [filters]);

  const loadRecommendations = async () => {
    setLoading(true);
    setError(null);

    const { recommendations: recsData, error: recsError } =
      await recommendationService.generateRecommendations(
        creatorId,
        campaignId,
        20
      );

    if (recsError) {
      setError(recsError);
    } else {
      setRecommendations(recsData || []);
    }
    setLoading(false);
  };

  const loadFilteredPromoters = async () => {
    setLoading(true);
    setError(null);

    const { promoters, error: promotersError } =
      await recommendationService.getFilteredPromoters(filters, 50);

    if (promotersError) {
      setError(promotersError);
    } else {
      setFilteredPromoters(promoters || []);
    }
    setLoading(false);
  };

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'bg-orange-100 text-orange-800',
      silver: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      platinum: 'bg-purple-100 text-purple-800',
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatNumber = (num?: number) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num?: number) => {
    return `${(num || 0).toFixed(1)}%`;
  };

  const RecommendationCard = ({
    recommendation,
  }: {
    recommendation: PromoterRecommendation;
  }) => {
    const promoter = recommendation.promoter;
    if (!promoter) return null;

    return (
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {promoter.user?.email?.charAt(0).toUpperCase() || 'P'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">
                  {promoter.user?.email?.split('@')[0] || 'Promoter'}
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge className={getTierColor(promoter.tier)}>
                    {promoter.tier.charAt(0).toUpperCase() +
                      promoter.tier.slice(1)}
                  </Badge>
                  <div className="flex items-center text-sm text-gray-600">
                    <Star className="h-4 w-4 mr-1 text-yellow-500" />
                    {(recommendation.score * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setSelectedPromoter(promoter)}
              variant="outline"
            >
              View Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 line-clamp-2">{promoter.bio}</p>

            <div className="flex flex-wrap gap-1">
              {promoter.niche?.map(n => (
                <Badge key={n} variant="outline" className="text-xs">
                  {n}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center text-gray-600">
                  <Users className="h-4 w-4 mr-1" />
                </div>
                <p className="text-sm font-semibold">
                  {formatNumber(promoter.followers_count)}
                </p>
                <p className="text-xs text-gray-500">Followers</p>
              </div>
              <div>
                <div className="flex items-center justify-center text-gray-600">
                  <TrendingUp className="h-4 w-4 mr-1" />
                </div>
                <p className="text-sm font-semibold">
                  {formatPercentage(promoter.engagement_rate)}
                </p>
                <p className="text-xs text-gray-500">Engagement</p>
              </div>
              <div>
                <div className="flex items-center justify-center text-gray-600">
                  <Eye className="h-4 w-4 mr-1" />
                </div>
                <p className="text-sm font-semibold">
                  {formatNumber(promoter.avg_views)}
                </p>
                <p className="text-xs text-gray-500">Avg Views</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-700">
                Match Factors:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-600">Niche:</span>
                  <span className="ml-1 font-medium">
                    {(recommendation.factors.niche_match * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Engagement:</span>
                  <span className="ml-1 font-medium">
                    {(recommendation.factors.engagement_rate * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Followers:</span>
                  <span className="ml-1 font-medium">
                    {(recommendation.factors.follower_count * 100).toFixed(0)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Performance:</span>
                  <span className="ml-1 font-medium">
                    {(recommendation.factors.past_performance * 100).toFixed(0)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const PromoterCard = ({ promoter }: { promoter: PromoterProfile }) => (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-600">
                {promoter.user?.email?.charAt(0).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">
                {promoter.user?.email?.split('@')[0] || 'Promoter'}
              </h3>
              <Badge className={getTierColor(promoter.tier)}>
                {promoter.tier.charAt(0).toUpperCase() + promoter.tier.slice(1)}
              </Badge>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setSelectedPromoter(promoter)}
            variant="outline"
          >
            View
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-gray-600 line-clamp-2">{promoter.bio}</p>

          <div className="flex flex-wrap gap-1">
            {promoter.niche?.slice(0, 3).map(n => (
              <Badge key={n} variant="outline" className="text-xs">
                {n}
              </Badge>
            ))}
            {promoter.niche && promoter.niche.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{promoter.niche.length - 3}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
              <p className="font-semibold">
                {formatNumber(promoter.followers_count)}
              </p>
              <p className="text-xs text-gray-500">Followers</p>
            </div>
            <div>
              <p className="font-semibold">
                {formatPercentage(promoter.engagement_rate)}
              </p>
              <p className="text-xs text-gray-500">Engagement</p>
            </div>
            <div>
              <div className="flex items-center justify-center">
                <Star className="h-3 w-3 mr-1 text-yellow-500" />
                <p className="font-semibold">
                  {(promoter.rating || 0).toFixed(1)}
                </p>
              </div>
              <p className="text-xs text-gray-500">Rating</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Discover Promoters</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recommended">Recommended</TabsTrigger>
          <TabsTrigger value="browse">Browse & Filter</TabsTrigger>
        </TabsList>

        <TabsContent value="recommended" className="space-y-4">
          <div className="text-sm text-gray-600">
            AI-powered recommendations based on your campaign requirements and
            past performance.
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recommendations.map(recommendation => (
                <RecommendationCard
                  key={recommendation.id}
                  recommendation={recommendation}
                />
              ))}
            </div>
          )}

          {!loading && recommendations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No recommendations found.</p>
              <Button className="mt-4" onClick={loadRecommendations}>
                Generate Recommendations
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="text-sm font-medium">Niche</label>
                  <Select
                    value={filters.niche?.[0] || ''}
                    onValueChange={value =>
                      setFilters(prev => ({
                        ...prev,
                        niche: value ? [value] : [],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select niche" />
                    </SelectTrigger>
                    <SelectContent>
                      {niches.map(niche => (
                        <SelectItem key={niche} value={niche}>
                          {niche}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Tier</label>
                  <Select
                    value={filters.tier?.[0] || ''}
                    onValueChange={value =>
                      setFilters(prev => ({
                        ...prev,
                        tier: value ? [value] : [],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiers.map(tier => (
                        <SelectItem key={tier} value={tier}>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Min Followers</label>
                  <Input
                    type="number"
                    placeholder="e.g., 1000"
                    value={filters.minFollowers || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        minFollowers: Number(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Min Engagement %
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 2.5"
                    step="0.1"
                    value={filters.minEngagementRate || ''}
                    onChange={e =>
                      setFilters(prev => ({
                        ...prev,
                        minEngagementRate: Number(e.target.value) || undefined,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredPromoters.map(promoter => (
                <PromoterCard key={promoter.id} promoter={promoter} />
              ))}
            </div>
          )}

          {!loading && filteredPromoters.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No promoters found matching your filters.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Promoter Detail Modal */}
      <Dialog
        open={selectedPromoter !== null}
        onOpenChange={() => setSelectedPromoter(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Promoter Profile</DialogTitle>
          </DialogHeader>
          {selectedPromoter && (
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                    {selectedPromoter.user?.email?.charAt(0).toUpperCase() ||
                      'P'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">
                    {selectedPromoter.user?.email?.split('@')[0] || 'Promoter'}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getTierColor(selectedPromoter.tier)}>
                      {selectedPromoter.tier.charAt(0).toUpperCase() +
                        selectedPromoter.tier.slice(1)}
                    </Badge>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="h-4 w-4 mr-1 text-yellow-500" />
                      {(selectedPromoter.rating || 0).toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Bio</h4>
                <p className="text-gray-600">
                  {selectedPromoter.bio || 'No bio available'}
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedPromoter.niche?.map(n => (
                    <Badge key={n} variant="outline">
                      {n}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-gray-600">
                    <Users className="h-5 w-5 mr-2" />
                    <span className="font-medium">Followers</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(selectedPromoter.followers_count)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-gray-600">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    <span className="font-medium">Engagement</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatPercentage(selectedPromoter.engagement_rate)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center text-gray-600">
                    <Eye className="h-5 w-5 mr-2" />
                    <span className="font-medium">Avg Views</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatNumber(selectedPromoter.avg_views)}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="flex-1">
                  Invite to Campaign
                </Button>
              </div>
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
