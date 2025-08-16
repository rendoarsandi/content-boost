import React from 'react';

interface PromoterPerformance {
  id: string;
  name: string;
  views: string;
  spend: string;
  roi: string;
}

interface PromoterPerformanceTableProps {
  data: PromoterPerformance[];
}

export const PromoterPerformanceTable = ({ data }: PromoterPerformanceTableProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="font-semibold mb-4">Promoter Performance</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promoter</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spend</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROI</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((promoter) => (
              <tr key={promoter.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{promoter.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{promoter.views}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{promoter.spend}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-500">{promoter.roi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
