import AdminNav from '../components/admin-nav';
import CampaignOversight from './components/campaign-oversight';

export default function CampaignsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Campaign Oversight</h1>
            <p className="text-gray-600">Monitor and manage all platform campaigns</p>
          </div>
          <CampaignOversight />
        </div>
      </main>
    </div>
  );
}