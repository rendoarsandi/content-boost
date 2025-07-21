'use client';

import { useState } from 'react';
import { AlertCategory, AlertSeverity } from '@repo/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';

interface Alert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface AlertsPanelProps {
  alerts: Alert[];
  isLoading: boolean;
  onResolve: (alertId: string) => void;
}

export default function AlertsPanel({ alerts, isLoading, onResolve }: AlertsPanelProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showResolved, setShowResolved] = useState(false);
  
  const filteredAlerts = alerts.filter((alert) => {
    if (!showResolved && alert.resolved) return false;
    if (categoryFilter !== 'all' && alert.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });
  
  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return 'bg-red-500 text-white';
      case AlertSeverity.HIGH:
        return 'bg-orange-500 text-white';
      case AlertSeverity.MEDIUM:
        return 'bg-yellow-500 text-black';
      case AlertSeverity.LOW:
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  
  const getCategoryLabel = (category: AlertCategory) => {
    switch (category) {
      case AlertCategory.BOT_DETECTION:
        return 'Bot Detection';
      case AlertCategory.PAYMENT:
        return 'Payment';
      case AlertCategory.API:
        return 'API';
      case AlertCategory.DATABASE:
        return 'Database';
      case AlertCategory.SECURITY:
        return 'Security';
      case AlertCategory.SYSTEM:
        return 'System';
      default:
        return category;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Alerts</CardTitle>
        <CardDescription>
          Monitor and manage system alerts across all services
        </CardDescription>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="w-48">
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value={AlertCategory.BOT_DETECTION}>Bot Detection</SelectItem>
                <SelectItem value={AlertCategory.PAYMENT}>Payment</SelectItem>
                <SelectItem value={AlertCategory.API}>API</SelectItem>
                <SelectItem value={AlertCategory.DATABASE}>Database</SelectItem>
                <SelectItem value={AlertCategory.SECURITY}>Security</SelectItem>
                <SelectItem value={AlertCategory.SYSTEM}>System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-48">
            <Select
              value={severityFilter}
              onValueChange={setSeverityFilter}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value={AlertSeverity.CRITICAL}>Critical</SelectItem>
                <SelectItem value={AlertSeverity.HIGH}>High</SelectItem>
                <SelectItem value={AlertSeverity.MEDIUM}>Medium</SelectItem>
                <SelectItem value={AlertSeverity.LOW}>Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Hide Resolved' : 'Show Resolved'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No alerts found matching the current filters
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className="border rounded-lg p-4 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {getCategoryLabel(alert.category)}
                    </Badge>
                    {alert.resolved && (
                      <Badge variant="outline" className="bg-green-100">
                        Resolved
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
                
                <div className="mt-2 text-lg font-medium">{alert.message}</div>
                
                {alert.details && (
                  <div className="mt-2 text-sm text-gray-600">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-2 rounded">
                      {JSON.stringify(alert.details, null, 2)}
                    </pre>
                  </div>
                )}
                
                {!alert.resolved && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => onResolve(alert.id)}
                    >
                      Resolve Alert
                    </Button>
                  </div>
                )}
                
                {alert.resolved && alert.resolvedAt && (
                  <div className="mt-2 text-sm text-gray-500">
                    Resolved at: {new Date(alert.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
}