'use client';

import React from 'react';

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface Promoter {
  user_id: string;
  bio: string;
  niche: string;
  tier: Tier;
}

interface PromoterCardProps {
  promoter: Promoter;
}

const tierStyles = {
  Bronze: 'bg-yellow-100 text-yellow-700',
  Silver: 'bg-gray-200 text-gray-700',
  Gold: 'bg-yellow-50 text-yellow-600 font-bold',
  Platinum: 'bg-indigo-100 text-indigo-700 font-bold',
};

export const PromoterCard = ({ promoter }: PromoterCardProps) => {
  const handleInvite = () => {
    // In a real app, this would trigger a modal or an API call
    alert(`Invitation sent to promoter ${promoter.user_id}!`);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 flex flex-col">
      <div className="flex-grow">
        <p className="text-sm font-semibold text-indigo-600 mb-2">{promoter.niche}</p>
        <p className="text-gray-700 mb-4">{promoter.bio}</p>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span className={`font-semibold text-sm px-3 py-1 rounded-full ${tierStyles[promoter.tier]}`}>
          {promoter.tier} Tier
        </span>
        <button 
          onClick={handleInvite}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Invite
        </button>
      </div>
    </div>
  );
};
