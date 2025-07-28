'use client';

import { useState } from 'react';
import { Button, Textarea, Input, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

interface ContentEditorProps {
  applicationId: string;
  initialContent?: {
    contentText?: string;
    mediaUrl?: string;
    hashtags?: string;
  };
  onSave?: (content: any) => void;
}

export function ContentEditor({ applicationId, initialContent, onSave }: ContentEditorProps) {
  const [contentText, setContentText] = useState(initialContent?.contentText || '');
  const [mediaUrl, setMediaUrl] = useState(initialContent?.mediaUrl || '');
  const [hashtags, setHashtags] = useState(initialContent?.hashtags || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}/content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentText,
          mediaUrl,
          hashtags,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save content');
      }

      const result = await response.json();
      onSave?.(result);
    } catch (error) {
      console.error('Error saving content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Content Editor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Content Text</label>
          <Textarea
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            placeholder="Enter your promotional content..."
            rows={6}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Media URL</label>
          <Input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            type="url"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Hashtags</label>
          <Input
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="#promo #content #campaign"
          />
        </div>
        
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Saving...' : 'Save Content'}
        </Button>
      </CardContent>
    </Card>
  );
}