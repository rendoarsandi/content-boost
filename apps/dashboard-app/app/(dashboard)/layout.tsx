import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';
import { DashboardNav } from '../components/dashboard-nav';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav user={session.user as any} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
