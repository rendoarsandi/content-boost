'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Alert } from '@repo/ui';

interface CampaignApplicationFormProps {
  campaignId: string;
}

export function CampaignApplicationForm({ campaignId }: CampaignApplicationFormProps) {
  const [submittedContent, setSubmittedContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/promoter/campaigns/${campaignId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submittedContent: submittedContent.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <div className="text-green-800">
          <h4 className="font-medium mb-2">Application Submitted Successfully!</h4>
          <p className="text-sm">
            Your application has been submitted and is now pending review by the creator. 
            You'll be notified once it's reviewed.
          </p>
        </div>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <div className="text-red-800">
            <h4 className="font-medium mb-1">Application Failed</h4>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      )}

      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Application Message (Optional)
        </label>
        <textarea
          id="content"
          placeholder="Tell the creator why you're interested in this campaign and how you plan to promote it..."
          value={submittedContent}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSubmittedContent(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          This message will be sent to the creator along with your application.
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your application will be reviewed by the creator</li>
          <li>• You'll receive a notification when it's approved or rejected</li>
          <li>• If approved, you'll get access to campaign materials</li>
          <li>• You can then start promoting and earning from views</li>
        </ul>
      </div>

      <div className="flex space-x-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Application'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}