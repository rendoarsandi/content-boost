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
} from '@repo/ui';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: Date;
}

export default function SystemHealthPanel() {
  const [isLoading, setIsLoading] = useState(true);
  const [services, setServices] = useState<ServiceHealth[]>([]);

  useEffect(() => {
    // In a real app, this would fetch from an API
    // For now, we'll simulate with mock data
    setTimeout(() => {
      setServices([
        {
          name: 'landing-page',
          status: 'healthy',
          responseTime: 42,
          lastChecked: new Date(),
        },
        {
          name: 'auth-app',
          status: 'healthy',
          responseTime: 56,
          lastChecked: new Date(),
        },
        {
          name: 'dashboard-app',
          status: 'healthy',
          responseTime: 78,
          lastChecked: new Date(),
        },
        {
          name: 'admin-app',
          status: 'healthy',
          responseTime: 35,
          lastChecked: new Date(),
        },
        {
          name: 'postgres',
          status: 'healthy',
          responseTime: 12,
          lastChecked: new Date(),
        },
        {
          name: 'redis',
          status: 'healthy',
          responseTime: 8,
          lastChecked: new Date(),
        },
      ]);
      setIsLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'down':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const refreshHealth = () => {
    setIsLoading(true);
    // In a real app, this would fetch from an API
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Health</CardTitle>
        <CardDescription>
          Monitor the health of all services and infrastructure
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {services.map(service => (
              <div
                key={service.name}
                className="border rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}
                  ></div>
                  <div className="font-medium">{service.name}</div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-sm">
                    <span className="text-gray-500">Response time:</span>{' '}
                    <span className="font-medium">
                      {service.responseTime}ms
                    </span>
                  </div>

                  <div className="text-sm text-gray-500">
                    Last checked: {service.lastChecked.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button onClick={refreshHealth} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Health Status'}
        </Button>
      </CardFooter>
    </Card>
  );
}
