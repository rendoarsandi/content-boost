'use client';

import React from 'react';

interface GamificationDashboardProps {
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export function GamificationDashboard({ userId, supabaseUrl, supabaseKey }: GamificationDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Achievements & Progress</h2>
          <p className="text-gray-600">Track your milestones and compete with other promoters</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-center text-gray-500">Gamification Dashboard - Component placeholder</p>
        <p className="text-sm text-gray-400 text-center">User: {userId}</p>
      </div>
    </div>
  );
}