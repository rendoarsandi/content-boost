import React from 'react';
import { PromoterCard } from '@/components/discovery/PromoterCard';

// Mock data for a list of promoters
const getPromoters = async () => {
  // In a real app, you would fetch this from an API
  return [
    {
      user_id: 'usr_123',
      bio: 'Experienced content promoter specializing in tech and gaming.',
      niche: 'Tech, Gaming',
      tier: 'Gold',
    },
    {
      user_id: 'usr_456',
      bio: 'Fashion and lifestyle influencer with a passion for beauty products.',
      niche: 'Fashion, Beauty',
      tier: 'Silver',
    },
    {
      user_id: 'usr_789',
      bio: 'Fitness coach and motivational speaker.',
      niche: 'Health, Fitness',
      tier: 'Silver',
    },
    {
      user_id: 'usr_101',
      bio: 'New to the platform, eager to promote travel and adventure brands!',
      niche: 'Travel',
      tier: 'Bronze',
    },
  ];
};

const PromoterDiscoveryPage = async () => {
  const promoters = await getPromoters();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Discover Promoters</h1>
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="font-semibold mb-2">Filter & Search</h2>
        {/* Search and filter components will go here */}
        <p className="text-sm text-gray-500">
          Search by niche or filter by tier. (Coming Soon)
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promoters.map(promoter => (
          <PromoterCard key={promoter.user_id} promoter={promoter} />
        ))}
      </div>
    </div>
  );
};

export default PromoterDiscoveryPage;
