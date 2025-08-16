import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  valueClassName?: string;
}

export const StatCard = ({ title, value, valueClassName = '' }: StatCardProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className={`text-3xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
};
