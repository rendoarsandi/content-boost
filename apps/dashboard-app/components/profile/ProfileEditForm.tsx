'use client';

import React, { useState } from 'react';
// Assuming Shadcn UI components are available from a shared UI package
// import { Button } from '@repo/ui/components/button';
// import { Input } from '@repo/ui/components/input';
// import { Textarea } from '@repo/ui/components/textarea';
// import { Label } from '@repo/ui/components/label';

// Mock props - in a real app, this would be the profile data
const mockProfile = {
  bio: 'Experienced content promoter specializing in tech and gaming. Let\'s make your campaign a success!',
  niche: 'Tech, Gaming',
  portfolio_links: 'https://example.com/portfolio',
};

export const ProfileEditForm = () => {
  const [bio, setBio] = useState(mockProfile.bio);
  const [niche, setNiche] = useState(mockProfile.niche);
  const [portfolioLinks, setPortfolioLinks] = useState(mockProfile.portfolio_links);

  const handleSave = () => {
    // In a real app, this would call an API to save the data
    const updatedProfile = { bio, niche, portfolio_links: portfolioLinks };
    console.log('Saving profile:', updatedProfile);
    alert('Profile saved! (Check console for data)');
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 mt-6">
      <h2 className="text-xl font-bold mb-4">Edit Your Profile</h2>
      <div className="space-y-4">
        <div>
          {/* <Label htmlFor="bio">Bio</Label> */}
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            rows={4}
          />
        </div>
        <div>
          {/* <Label htmlFor="niche">Niche</Label> */}
          <label htmlFor="niche" className="block text-sm font-medium text-gray-700">Niche</label>
          <input
            id="niche"
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          {/* <Label htmlFor="portfolio">Portfolio Link</Label> */}
          <label htmlFor="portfolio" className="block text-sm font-medium text-gray-700">Portfolio Link</label>
          <input
            id="portfolio"
            type="text"
            value={portfolioLinks}
            onChange={(e) => setPortfolioLinks(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          {/* <Button onClick={handleSave}>Save Changes</Button> */}
          <button 
            onClick={handleSave}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
