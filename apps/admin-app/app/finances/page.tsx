import AdminNav from '../components/admin-nav';
import FinancialManagement from './components/financial-management';

export default function FinancesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Financial Management</h1>
            <p className="text-gray-600">Platform revenue tracking, withdrawals, and financial reports</p>
          </div>
          <FinancialManagement />
        </div>
      </main>
    </div>
  );
}