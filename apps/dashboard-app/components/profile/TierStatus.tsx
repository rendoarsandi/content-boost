'use client';

import React from 'react';

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

interface TierStatusProps {
  tier: Tier;
}

const tierDetails = {
  Bronze: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    description:
      'You are just getting started. Complete 5 campaigns to reach Silver!',
  },
  Silver: {
    color: 'text-gray-700',
    bgColor: 'bg-gray-200',
    description:
      'Great work! Consistently deliver high-quality promotions to reach Gold.',
  },
  Gold: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    description:
      'You are a top performer! Maintain your status by leading successful campaigns.',
  },
  Platinum: {
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    description: 'You are an elite promoter, among the best on the platform!',
  },
};

export const TierStatus = ({ tier }: TierStatusProps) => {
  const details = tierDetails[tier] || tierDetails.Bronze;

  return (
    <div className={`p-4 rounded-lg ${details.bgColor}`}>
      <h3 className="font-bold text-lg">Your Current Tier</h3>
      <p className={`font-extrabold text-2xl ${details.color}`}>{tier}</p>
      <p className="text-sm mt-2">{details.description}</p>
    </div>
  );
};
