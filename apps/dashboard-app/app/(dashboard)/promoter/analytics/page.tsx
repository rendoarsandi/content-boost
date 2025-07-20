import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui';
import { AnalyticsDashboard } from '../components/analytics-dashboard';

export default async function PromoterAnalyticsPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'promoter') {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
        <p className="text-gray-600 mt-2">Track your promotion performance and bot detection insights</p>
      </div>

      <AnalyticsDashboard promoterId={(session.user as any).id} />
    </div>
  );
}