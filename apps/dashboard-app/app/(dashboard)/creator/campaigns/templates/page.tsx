'use client';

import { CampaignTemplates } from '@repo/ui/components/ui/campaign-templates';
import { useUser } from '@/hooks/useUser';
import { useRouter } from 'next/navigation';

export default function CampaignTemplatesPage() {
  const { user } = useUser();
  const router = useRouter();

  if (!user) {
    return <div>Please log in to access templates</div>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const handleCampaignCreated = (campaign: any) => {
    // Redirect to the newly created campaign
    router.push(`/creator/campaigns/${campaign.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <CampaignTemplates
        creatorId={user.id}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  );
}
