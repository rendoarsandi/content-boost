'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from '@repo/ui';

interface AnalyticsData {
  period: number;
  overview: {
    totalViews: number;
    legitimateViews: number;
    avgBotScore: number;
    botDetectionRate: number;
    engagementRate: number;
    likeRate: number;
    commentRate: number;
  };
  campaignPerformance: Array<{
    campaignId: string;
    campaignTitle: string;
    totalViews: number;
    legitimateViews: number;
    avgBotScore: number;
    totalLikes: number;
    totalComments: number;
    ratePerView: string;
    estimatedEarnings: number;
  }>;
  dailyTrend: Array<{
    date: string;
    views: number;
    legitimateViews: number;
    avgBotScore: number;
  }>;
  earnings: {
    total: number;
    pending: number;
    completedPayouts: number;
  };
  botDetection: {
    totalRecords: number;
    legitimateRecords: number;
    botRecords: number;
    detectionRate: number;
    avgBotScore: number;
  };
}

interface AnalyticsDashboardProps {
  promoterId: string;
}

export function AnalyticsDashboard({ promoterId }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        period,
        ...(selectedCampaign && { campaignId: selectedCampaign }),
      });

      const response = await fetch(`/api/promoter/analytics?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, selectedCampaign]);

  const getBotScoreColor = (score: number) => {
    if (score < 20) return 'text-green-600';
    if (score < 50) return 'text-yellow-600';
    if (score < 80) return 'text-orange-600';
    return 'text-red-600';
  };

  const getBotScoreBadge = (score: number) => {
    if (score < 20) return 'bg-green-100 text-green-800';
    if (score < 50) return 'bg-yellow-100 text-yellow-800';
    if (score < 80) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to Load Analytics
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={fetchAnalytics}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No Analytics Data
          </h3>
          <p className="text-gray-600">
            No data available for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Period:
            </label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          {data.campaignPerformance.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">
                Campaign:
              </label>
              <select
                value={selectedCampaign || ''}
                onChange={e => setSelectedCampaign(e.target.value || null)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm"
              >
                <option value="">All Campaigns</option>
                {data.campaignPerformance.map(campaign => (
                  <option key={campaign.campaignId} value={campaign.campaignId}>
                    {campaign.campaignTitle}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          Refresh Data
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.overview.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.overview.legitimateViews.toLocaleString()} legitimate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Bot Detection Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getBotScoreColor(data.overview.botDetectionRate)}`}
            >
              {data.overview.botDetectionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Avg score: {data.overview.avgBotScore.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Engagement Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {data.overview.engagementRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Likes: {data.overview.likeRate.toFixed(1)}% | Comments:{' '}
              {data.overview.commentRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {Number(data.earnings.total).toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.earnings.completedPayouts} payouts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bot Detection Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Detection Insights</CardTitle>
          <CardDescription>
            Analysis of your traffic quality and bot detection performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-2">
                {data.botDetection.legitimateRecords.toLocaleString()}
              </div>
              <p className="text-sm text-green-800 font-medium">
                Legitimate Records
              </p>
              <p className="text-xs text-green-600 mt-1">
                {(
                  (data.botDetection.legitimateRecords /
                    data.botDetection.totalRecords) *
                  100
                ).toFixed(1)}
                % of total
              </p>
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {data.botDetection.botRecords.toLocaleString()}
              </div>
              <p className="text-sm text-red-800 font-medium">
                Bot Records Detected
              </p>
              <p className="text-xs text-red-600 mt-1">
                {data.botDetection.detectionRate.toFixed(1)}% detection rate
              </p>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 mb-2">
                {data.botDetection.avgBotScore.toFixed(1)}
              </div>
              <p className="text-sm text-blue-800 font-medium">
                Average Bot Score
              </p>
              <Badge
                className={getBotScoreBadge(data.botDetection.avgBotScore)}
              >
                {data.botDetection.avgBotScore < 20
                  ? 'Excellent'
                  : data.botDetection.avgBotScore < 50
                    ? 'Good'
                    : data.botDetection.avgBotScore < 80
                      ? 'Fair'
                      : 'Poor'}
              </Badge>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              What does this mean?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>Bot Score 0-20:</strong> Excellent traffic quality,
                very low bot activity
              </li>
              <li>
                • <strong>Bot Score 20-50:</strong> Good traffic quality,
                minimal bot concerns
              </li>
              <li>
                • <strong>Bot Score 50-80:</strong> Fair traffic quality, some
                bot activity detected
              </li>
              <li>
                • <strong>Bot Score 80+:</strong> Poor traffic quality, high bot
                activity - earnings may be affected
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      {data.campaignPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance</CardTitle>
            <CardDescription>
              Performance breakdown by campaign over the last {period} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.campaignPerformance.map(campaign => (
                <div
                  key={campaign.campaignId}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">
                        {campaign.campaignTitle}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Rate: Rp {Number(campaign.ratePerView).toLocaleString()}{' '}
                        per view
                      </p>
                    </div>
                    <Badge className={getBotScoreBadge(campaign.avgBotScore)}>
                      Bot Score: {campaign.avgBotScore.toFixed(1)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Views</p>
                      <p className="font-semibold text-blue-600">
                        {campaign.legitimateViews.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Likes</p>
                      <p className="font-semibold">
                        {campaign.totalLikes.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Comments</p>
                      <p className="font-semibold">
                        {campaign.totalComments.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Engagement</p>
                      <p className="font-semibold text-purple-600">
                        {campaign.legitimateViews > 0
                          ? (
                              ((campaign.totalLikes + campaign.totalComments) /
                                campaign.legitimateViews) *
                              100
                            ).toFixed(1)
                          : '0'}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Est. Earnings</p>
                      <p className="font-semibold text-green-600">
                        Rp {campaign.estimatedEarnings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Trend */}
      {data.dailyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Performance Trend</CardTitle>
            <CardDescription>
              Your daily performance over the last {period} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.dailyTrend.slice(0, 10).map((day, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(day.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Bot Score: {day.avgBotScore.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-blue-600">
                      {day.legitimateViews.toLocaleString()} views
                    </p>
                    <p className="text-sm text-gray-600">
                      {day.views.toLocaleString()} total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {data.campaignPerformance.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📈</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Campaign Data
            </h3>
            <p className="text-gray-600 mb-6">
              You don't have any approved campaigns with activity in the
              selected period.
            </p>
            <Button
              onClick={() => (window.location.href = '/promoter/campaigns')}
            >
              Browse Campaigns
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
