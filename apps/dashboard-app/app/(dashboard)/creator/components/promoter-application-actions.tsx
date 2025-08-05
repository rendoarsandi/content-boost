'use client';

import { useState } from 'react';
import { Button, Alert, AlertDescription } from '@repo/ui';
import { useRouter } from 'next/navigation';

interface PromoterApplicationActionsProps {
  applicationId: string;
  currentStatus: string;
}

export function PromoterApplicationActions({
  applicationId,
  currentStatus,
}: PromoterApplicationActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = async (newStatus: 'APPROVED' | 'REJECTED') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/applications/${applicationId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Failed to update application status'
        );
      }

      // Refresh the page to show updated data
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (currentStatus !== 'PENDING') {
    return null;
  }

  return (
    <div className="space-y-2">
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-xs">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex space-x-2">
        <Button
          size="sm"
          onClick={() => handleStatusUpdate('APPROVED')}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700"
        >
          {isLoading ? '...' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleStatusUpdate('REJECTED')}
          disabled={isLoading}
          className="border-red-300 text-red-600 hover:bg-red-50"
        >
          {isLoading ? '...' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}
