'use client';

import { CampaignTemplates } from '@repo/ui';
import { useUser } from '@/hooks/useUser';

export default function CampaignTemplatesPage() {
  const { user } = useUser();

  if (!user) {
    return <div>Please log in to access templates</div>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <CampaignTemplates
        creatorId={user.id}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
      />
    </div>
  );
}
