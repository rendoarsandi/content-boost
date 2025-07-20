import AdminNav from '../components/admin-nav';
import UserManagement from './components/user-management';

export default function UsersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600">Manage platform users, ban/unban accounts</p>
          </div>
          <UserManagement />
        </div>
      </main>
    </div>
  );
}