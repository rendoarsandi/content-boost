'use client';

import React from 'react';

interface CampaignTemplatesProps {
  creatorId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export function CampaignTemplates({
  creatorId,
  supabaseUrl,
  supabaseKey,
}: CampaignTemplatesProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Campaign Templates</h2>
          <p className="text-gray-600">
            Use pre-built templates to create campaigns quickly
          </p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg border">
        <p className="text-center text-gray-500">
          Campaign Templates - Component placeholder
        </p>
        <p className="text-sm text-gray-400 text-center">
          Creator: {creatorId}
        </p>
      </div>
    </div>
  );
}
