import RealtimeCampaignTracker from '../../../components/RealtimeCampaignTracker';

export default function CreatorDashboard() {
  // Untuk demo, kita gunakan ID kampanye statis.
  // Nantinya, ini akan diambil dari data user.
  const campaignId = 'clx5e1a0b0000t7p8h4g9f8d6'; // Contoh ID

  return (
    <main style={{ padding: '2rem' }}>
      <header>
        <h1>Creator Dashboard</h1>
        <p>Welcome back! Here's the live status of your campaign.</p>
      </header>

      <section style={{ marginTop: '2rem' }}>
        <RealtimeCampaignTracker campaignId={campaignId} />
      </section>
    </main>
  );
}
