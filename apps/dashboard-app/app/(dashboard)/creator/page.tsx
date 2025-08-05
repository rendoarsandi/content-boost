'use client'; // Harus client component untuk menggunakan hooks

import RealtimeCampaignTracker from '../../components/RealtimeCampaignTracker';

export default function CreatorDashboardPage() {
  // Untuk demo, kita gunakan ID kampanye statis.
  const campaignId = 'clx5e1a0b0000t7p8h4g9f8d6'; // Contoh ID

  return (
    <main style={{ padding: '2rem' }}>
      <header>
        <h1 className="text-3xl font-bold">Creator Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's the live status of your campaign.
        </p>
      </header>

      <section style={{ marginTop: '2rem' }}>
        {/* Komponen ini sekarang menjadi satu-satunya isi halaman */}
        <RealtimeCampaignTracker campaignId={campaignId} />
      </section>
    </main>
  );
}
