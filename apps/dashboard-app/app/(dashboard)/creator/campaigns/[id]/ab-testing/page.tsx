'use client';

import { ABTestingDashboard } from '@repo/ui/components/ui/ab-testing-dashboard';
import { useParams } from 'next/navigation';

export default function ABTestingPage() {
  const params = useParams();
  const campaignId = params.id as string;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <ABTestingDashboard
        campaignId={campaignId}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
      />
    </div>
  );
}
