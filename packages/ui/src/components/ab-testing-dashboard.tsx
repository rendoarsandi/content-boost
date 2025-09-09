'use client';

import React from 'react';

interface ABTestingDashboardProps {
  campaignId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export function ABTestingDashboard({
  campaignId,
  supabaseUrl,
  supabaseKey,
}: ABTestingDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing Dashboard</h2>
          <p className="text-gray-600">Manage and analyze your A/B tests</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-center text-gray-500">
          A/B Testing Dashboard - Component placeholder
        </p>
        <p className="text-sm text-gray-400 text-center">
          Campaign: {campaignId}
        </p>
      </div>
    </div>
  );
}
