'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@repo/ui';

interface MetricsData {
  totalViews: number;
  legitimateViews: number;
  botViews: number;
  activePromoters: number;
  estimatedSpent: number;
  lastUpdated: string;
}

interface RealTimeMetricsProps {
  campaignId: string;
  initialData?: MetricsData;
}

export function RealTimeMetrics({
  campaignId,
  initialData,
}: RealTimeMetricsProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(
    initialData || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/metrics`);

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMetrics();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, campaignId]);

  // Initial fetch if no initial data
  useEffect(() => {
    if (!initialData) {
      fetchMetrics();
    }
  }, [campaignId]);

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p className="mb-2">Failed to load metrics</p>
            <Button onClick={fetchMetrics} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <p>Loading metrics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>📊</span>
            <span>Real-Time Metrics</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              {autoRefresh ? '🔄 Auto' : '⏸️ Manual'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMetrics}
              disabled={isLoading}
            >
              {isLoading ? '⏳' : '🔄'} Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {metrics.totalViews.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Total Views</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {metrics.legitimateViews.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Legitimate Views</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {metrics.botViews.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Bot Views</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {metrics.activePromoters}
            </p>
            <p className="text-sm text-gray-600">Active Promoters</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              Rp {metrics.estimatedSpent.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Estimated Spent</p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </span>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}
              ></div>
              <span>{autoRefresh ? 'Live' : 'Manual'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
