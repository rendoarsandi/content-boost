import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { CampaignForm } from '../../components/campaign-form';

export default async function NewCampaignPage() {
  const session = await getSession();

  if (!session?.user || (session.user as any).role !== 'creator') {
    redirect('/auth/login');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-600 mt-2">
          Set up a new promotion campaign for your content
        </p>
      </div>

      <CampaignForm />
    </div>
  );
}