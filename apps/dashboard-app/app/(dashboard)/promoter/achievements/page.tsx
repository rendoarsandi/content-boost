'use client';

import { GamificationDashboard } from '@repo/ui/components/ui/gamification-dashboard';
import { useUser } from '@/hooks/useUser';

export default function AchievementsPage() {
  const { user } = useUser();

  if (!user) {
    return <div>Please log in to view achievements</div>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <div className="container mx-auto px-4 py-8">
      <GamificationDashboard
        userId={user.id}
        supabaseUrl={supabaseUrl}
        supabaseKey={supabaseKey}
      />
    </div>
  );
}
