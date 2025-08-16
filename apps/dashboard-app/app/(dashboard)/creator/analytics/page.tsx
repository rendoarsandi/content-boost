import React from 'react';
import { StatCard } from '@/components/analytics/StatCard';
import { PromoterPerformanceTable } from '@/components/analytics/PromoterPerformanceTable';

// Mock Data for Analytics
const getAnalyticsData = async () => {
  return {
    overallStats: {
      totalViews: '1.2M',
      totalSpend: '$5,400',
      averageROI: '210%',
    },
    chartData: [
      // Placeholder for chart data points
      { name: 'Jan', views: 4000 },
      { name: 'Feb', views: 3000 },
      { name: 'Mar', views: 5000 },
      { name: 'Apr', views: 4500 },
      { name: 'May', views: 6000 },
      { name: 'Jun', views: 5500 },
    ],
    promoterPerformance: [
      { id: 'usr_123', name: 'TechPromoter', views: '650K', spend: '$2,100', roi: '250%' },
      { id: 'usr_456', name: 'FashionGuru', views: '450K', spend: '$1,800', roi: '180%' },
      { id: 'usr_789', name: 'FitLife', views: '100K', spend: '$1,500', roi: '50%' },
    ],
  };
};

const AnalyticsDashboardPage = async () => {
  const data = await getAnalyticsData();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">Campaign Analytics</h1>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Views" value={data.overallStats.totalViews} />
        <StatCard title="Total Spend" value={data.overallStats.totalSpend} />
        <StatCard title="Average ROI" value={data.overallStats.averageROI} valueClassName="text-green-500" />
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-4">Views Over Time</h3>
        <div className="h-64 bg-gray-100 flex items-center justify-center rounded">
          <p className="text-gray-500">Chart Placeholder</p>
        </div>
      </div>

      {/* Promoter Performance Table */}
      <PromoterPerformanceTable data={data.promoterPerformance} />
    </div>
  );
};

export default AnalyticsDashboardPage;
