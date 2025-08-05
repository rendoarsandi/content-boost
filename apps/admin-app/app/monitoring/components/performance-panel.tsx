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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@repo/ui';

interface PerformanceMetric {
  endpoint: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  requestsPerMinute: number;
  errorRate: number;
}

export default function PerformancePanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [service, setService] = useState('all');

  useEffect(() => {
    // In a real app, this would fetch from an API
    // For now, we'll simulate with mock data
    fetchPerformanceData();
  }, [timeRange, service]);

  const fetchPerformanceData = () => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setMetrics([
        {
          endpoint: '/api/campaigns',
          avgResponseTime: 45,
          p95ResponseTime: 120,
          requestsPerMinute: 12.5,
          errorRate: 0.2,
        },
        {
          endpoint: '/api/applications',
          avgResponseTime: 62,
          p95ResponseTime: 150,
          requestsPerMinute: 8.3,
          errorRate: 0.5,
        },
        {
          endpoint: '/api/auth/login',
          avgResponseTime: 120,
          p95ResponseTime: 250,
          requestsPerMinute: 5.1,
          errorRate: 1.2,
        },
        {
          endpoint: '/api/promoter/analytics',
          avgResponseTime: 85,
          p95ResponseTime: 200,
          requestsPerMinute: 3.7,
          errorRate: 0.8,
        },
        {
          endpoint: '/api/bot-detection',
          avgResponseTime: 150,
          p95ResponseTime: 320,
          requestsPerMinute: 2.2,
          errorRate: 0.3,
        },
      ]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
        <CardDescription>
          Monitor API performance and resource usage
        </CardDescription>

        <div className="flex flex-wrap gap-4 mt-4">
          <div className="w-48">
            <Select value={service} onValueChange={setService}>
              <SelectTrigger>
                <SelectValue placeholder="Select service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                <SelectItem value="landing-page">Landing Page</SelectItem>
                <SelectItem value="auth-app">Auth App</SelectItem>
                <SelectItem value="dashboard-app">Dashboard App</SelectItem>
                <SelectItem value="admin-app">Admin App</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
        <Tabs defaultValue="endpoints">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
            <TabsTrigger value="resources">Resource Usage</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
          </TabsList>

          <TabsContent value="endpoints" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Endpoint</th>
                      <th className="px-4 py-2 text-right">Avg Response</th>
                      <th className="px-4 py-2 text-right">P95 Response</th>
                      <th className="px-4 py-2 text-right">Req/Min</th>
                      <th className="px-4 py-2 text-right">Error Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map(metric => (
                      <tr key={metric.endpoint} className="border-t">
                        <td className="px-4 py-3 font-medium">
                          {metric.endpoint}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {metric.avgResponseTime}ms
                        </td>
                        <td className="px-4 py-3 text-right">
                          {metric.p95ResponseTime}ms
                        </td>
                        <td className="px-4 py-3 text-right">
                          {metric.requestsPerMinute}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {metric.errorRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              Resource usage metrics will be displayed here
            </div>
          </TabsContent>

          <TabsContent value="database" className="mt-4">
            <div className="text-center py-8 text-gray-500">
              Database performance metrics will be displayed here
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter>
        <Button onClick={fetchPerformanceData} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Metrics'}
        </Button>
      </CardFooter>
    </Card>
  );
}
