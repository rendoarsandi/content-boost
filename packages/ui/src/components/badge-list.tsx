import * as React from 'react';
import { BadgeCard } from './badge-card';

export const BadgeList = ({
  achievements,
}: {
  achievements: { name: string; description: string }[];
}) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {achievements.map((achievement, index) => (
      <BadgeCard
        key={index}
        name={achievement.name}
        description={achievement.description}
      />
    ))}
  </div>
);
