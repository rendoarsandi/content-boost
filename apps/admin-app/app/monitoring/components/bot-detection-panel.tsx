'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';

interface BotDetectionStats {
  totalAnalyzed: number;
  botDetected: number;
  suspiciousActivity: number;
  legitimateTraffic: number;
  averageConfidenceScore: number;
  topSuspiciousPromoters: Array<{
    promoterId: string;
    promoterName: string;
    botScore: number;
    detectedAt: Date;
  }>;
}

export default function BotDetectionPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<BotDetectionStats | null>(null);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    // In a real app, this would fetch from an API
    fetchBotDetectionStats();
  }, [timeRange]);

  const fetchBotDetectionStats = () => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setStats({
        totalAnalyzed: 15420,
        botDetected: 342,
        suspiciousActivity: 528,
        legitimateTraffic: 14550,
        averageConfidenceScore: 18.5,
        topSuspiciousPromoters: [
          {
            promoterId: 'prom-123',
            promoterName: 'user1234',
            botScore: 92,
            detectedAt: new Date(),
          },
          {
            promoterId: 'prom-456',
            promoterName: 'influencer42',
            botScore: 87,
            detectedAt: new Date(Date.now() - 3600000),
          },
          {
            promoterId: 'prom-789',
            promoterName: 'viral_content',
            botScore: 76,
            detectedAt: new Date(Date.now() - 7200000),
          },
        ],
      });
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Detection Analytics</CardTitle>
        <CardDescription>
          Monitor bot detection performance and suspicious activity
        </CardDescription>

        <div className="flex flex-wrap gap-4 mt-4">
          <div className="w-48">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger>
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm text-gray-500">
                  Total Traffic Analyzed
                </div>
                <div className="text-2xl font-bold mt-1">
                  {stats.totalAnalyzed.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm text-gray-500">
                  Bot Traffic Detected
                </div>
                <div className="text-2xl font-bold mt-1 text-red-600">
                  {stats.botDetected.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    (
                    {((stats.botDetected / stats.totalAnalyzed) * 100).toFixed(
                      1
                    )}
                    %)
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm text-gray-500">Suspicious Activity</div>
                <div className="text-2xl font-bold mt-1 text-yellow-600">
                  {stats.suspiciousActivity.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    (
                    {(
                      (stats.suspiciousActivity / stats.totalAnalyzed) *
                      100
                    ).toFixed(1)}
                    %)
                  </span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="text-sm text-gray-500">
                  Avg. Confidence Score
                </div>
                <div className="text-2xl font-bold mt-1">
                  {stats.averageConfidenceScore.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="text-lg font-medium mb-4">
                Top Suspicious Promoters
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left">Promoter ID</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-right">Bot Score</th>
                      <th className="px-4 py-2 text-right">Detected At</th>
                      <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.topSuspiciousPromoters.map(promoter => (
                      <tr key={promoter.promoterId} className="border-t">
                        <td className="px-4 py-3">{promoter.promoterId}</td>
                        <td className="px-4 py-3">{promoter.promoterName}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">
                          {promoter.botScore}%
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {promoter.detectedAt.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline">
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No bot detection data available
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={fetchBotDetectionStats} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Stats'}
        </Button>
      </CardFooter>
    </Card>
  );
}
