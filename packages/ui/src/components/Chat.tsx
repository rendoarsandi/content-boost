'use client';

import React from 'react';

interface ChatProps {
  userId: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export function Chat({ userId, supabaseUrl, supabaseKey }: ChatProps) {
  return (
    <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">💬</div>
          <p>Chat feature - Component placeholder</p>
          <p className="text-sm text-gray-400">User: {userId}</p>
        </div>
      </div>
    </div>
  );
}