'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Alert } from '@repo/ui';

interface ContentEditorProps {
  applicationId: string;
  initialContent: string;
  initialMetadata: Record<string, any>;
}

export function ContentEditor({ applicationId, initialContent, initialMetadata }: ContentEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [metadata, setMetadata] = useState(initialMetadata);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const router = useRouter();

  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(value !== initialContent || JSON.stringify(metadata) !== JSON.stringify(initialMetadata));
  };

  const handleMetadataChange = (key: string, value: string) => {
    const newMetadata = { ...metadata, [key]: value };
    setMetadata(newMetadata);
    setHasChanges(content !== initialContent || JSON.stringify(newMetadata) !== JSON.stringify(initialMetadata));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Content cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/promoter/applications/${applicationId}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submittedContent: content.trim(),
          metadata,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update content');
      }

      setSuccess(true);
      setHasChanges(false);
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setContent(initialContent);
    setMetadata(initialMetadata);
    setHasChanges(false);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert className="bg-red-50 border-red-200">
          <div className="text-red-800">
            <h4 className="font-medium mb-1">Update Failed</h4>
            <p className="text-sm">{error}</p>
          </div>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <div className="text-green-800">
            <h4 className="font-medium mb-1">Content Updated Successfully!</h4>
            <p className="text-sm">Your promotional content has been saved.</p>
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Content */}
        <div>
          <label htmlFor="content" className="text-base font-medium block mb-2">
            Promotional Content *
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Write your promotional content here. This could be captions, scripts, or descriptions for your posts.
          </p>
          <textarea
            id="content"
            placeholder="Write your promotional content here..."
            value={content}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleContentChange(e.target.value)}
            rows={8}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            {content.length} characters
          </p>
        </div>

        {/* Metadata Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Additional Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <input
                id="platform"
                type="text"
                placeholder="e.g., TikTok, Instagram"
                value={metadata.platform || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMetadataChange('platform', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label htmlFor="postType" className="block text-sm font-medium text-gray-700 mb-1">Post Type</label>
              <input
                id="postType"
                type="text"
                placeholder="e.g., Video, Story, Reel"
                value={metadata.postType || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMetadataChange('postType', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="hashtags" className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
            <input
              id="hashtags"
              type="text"
              placeholder="e.g., #promotion #content #viral"
              value={metadata.hashtags || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleMetadataChange('hashtags', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              id="notes"
              placeholder="Any additional notes or ideas for your promotion..."
              value={metadata.notes || ''}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleMetadataChange('notes', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={isSubmitting || !hasChanges}
            className="flex-1"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting || !hasChanges}
          >
            Reset
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Back
          </Button>
        </div>

        {hasChanges && (
          <p className="text-sm text-orange-600">
            You have unsaved changes. Don't forget to save before leaving.
          </p>
        )}
      </form>

      {/* Tips */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Content Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Make your content engaging and authentic to your audience</li>
          <li>• Include relevant hashtags to increase visibility</li>
          <li>• Follow the campaign requirements and guidelines</li>
          <li>• Use the provided materials to enhance your content</li>
          <li>• Track your performance using the analytics dashboard</li>
        </ul>
      </div>
    </div>
  );
}