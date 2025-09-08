import React from 'react';
import Link from 'next/link';

// Mock data for dispute tickets
const getDisputes = async () => {
  return [
    {
      id: 'd_001',
      creator: 'CreatorA',
      promoter: 'PromoterX',
      reason: 'Invalid Traffic/Bot Activity',
      status: 'Open',
    },
    {
      id: 'd_002',
      creator: 'CreatorB',
      promoter: 'PromoterY',
      reason: 'Low-Quality Content',
      status: 'Under Review',
    },
    {
      id: 'd_003',
      creator: 'CreatorC',
      promoter: 'PromoterZ',
      reason: 'Payment Discrepancy',
      status: 'Closed',
    },
  ];
};

const statusStyles: Record<string, string> = {
  Open: 'bg-red-100 text-red-800',
  'Under Review': 'bg-yellow-100 text-yellow-800',
  Closed: 'bg-green-100 text-green-800',
};

const DisputesPage = async () => {
  const disputes = await getDisputes();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Dispute Resolution Center</h1>
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Ticket ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Parties Involved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {disputes.map(dispute => (
              <tr key={dispute.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {dispute.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${dispute.creator} vs ${dispute.promoter}`}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dispute.reason}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[dispute.status]}`}
                  >
                    {dispute.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/disputes/${dispute.id}`}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DisputesPage;
