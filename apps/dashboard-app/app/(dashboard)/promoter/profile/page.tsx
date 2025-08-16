import React from 'react';
import { ProfileEditForm } from '@/components/profile/ProfileEditForm';
import { TierStatus } from '@/components/profile/TierStatus';

// Mock data for promoter profile
const getPromoterProfile = async () => {
  // In a real app, you would fetch this from your API
  return {
    user_id: 'usr_123',
    bio: "Experienced content promoter specializing in tech and gaming. Let's make your campaign a success!",
    niche: 'Tech, Gaming',
    portfolio_links: 'https://example.com/portfolio',
    tier: 'Gold',
  };
};

const PromoterProfilePage = async () => {
  const profile = await getPromoterProfile();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Promoter Profile</h1>

      {/* Display Profile Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column for Details */}
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Bio</h2>
              <p>{profile.bio}</p>
            </div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Niche</h2>
              <p>{profile.niche}</p>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Portfolio</h2>
              <a
                href={profile.portfolio_links}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {profile.portfolio_links}
              </a>
            </div>
          </div>

          {/* Right Column for Tier Status */}
          <div>
            <TierStatus tier={profile.tier} />
          </div>
        </div>
      </div>

      {/* Edit Profile Section */}
      <ProfileEditForm />
    </div>
  );
};

export default PromoterProfilePage;
