'use client';

import React, { useState } from 'react';
import {
  Button,
  Textarea,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui';
import { useRouter } from 'next/navigation';

interface CampaignApplicationFormProps {
  campaignId: string;
  campaignTitle: string;
  campaignDescription: string;
}

export function CampaignApplicationForm({
  campaignId,
  campaignTitle,
  campaignDescription,
}: CampaignApplicationFormProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit application');
      }

      router.push('/promoter/applications');
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Apply to Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">{campaignTitle}</h3>
            <p className="text-gray-600">{campaignDescription}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Application Message
              </label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Tell the creator why you're perfect for this campaign..."
                rows={6}
                required
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !message.trim()}>
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
