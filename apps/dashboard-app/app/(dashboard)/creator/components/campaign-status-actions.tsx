'use client';

import { useState } from 'react';
import { Button, Alert, AlertDescription } from '@repo/ui';
import { useRouter } from 'next/navigation';

interface CampaignStatusActionsProps {
  campaignId: string;
  currentStatus: string;
}

export function CampaignStatusActions({ 
  campaignId, 
  currentStatus 
}: CampaignStatusActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = async (newStatus: 'active' | 'paused' | 'completed') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update campaign status');
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailableActions = () => {
    switch (currentStatus) {
      case 'draft':
        return [
          { action: 'active', label: 'Launch Campaign', variant: 'default' as const, color: 'bg-green-600 hover:bg-green-700' }
        ];
      case 'active':
        return [
          { action: 'paused', label: 'Pause Campaign', variant: 'outline' as const, color: 'border-yellow-300 text-yellow-600 hover:bg-yellow-50' },
          { action: 'completed', label: 'Complete Campaign', variant: 'outline' as const, color: 'border-blue-300 text-blue-600 hover:bg-blue-50' }
        ];
      case 'paused':
        return [
          { action: 'active', label: 'Resume Campaign', variant: 'default' as const, color: 'bg-green-600 hover:bg-green-700' },
          { action: 'completed', label: 'Complete Campaign', variant: 'outline' as const, color: 'border-blue-300 text-blue-600 hover:bg-blue-50' }
        ];
      default:
        return [];
    }
  };

  const availableActions = getAvailableActions();

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex space-x-2">
        {availableActions.map(({ action, label, variant, color }) => (
          <Button
            key={action}
            variant={variant}
            onClick={() => handleStatusUpdate(action as any)}
            disabled={isLoading}
            className={color}
          >
            {isLoading ? 'Updating...' : label}
          </Button>
        ))}
      </div>
    </div>
  );
}