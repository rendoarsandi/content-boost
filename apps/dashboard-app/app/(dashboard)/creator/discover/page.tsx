'use client';

import { PromoterDiscovery } from '@repo/ui/components/ui/promoter-discovery';
import { useUser } from '@/hooks/useUser';

export default function DiscoverPage() {
  const { user } = useUser();

  if (!user) {
    return <div>Please log in to discover promoters</div>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <PromoterDiscovery
        creatorId={user.id}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
      />
    </div>
  );
}
