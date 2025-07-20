import { getSession } from '@repo/auth/server-only';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  // Redirect to appropriate dashboard based on user role
  const userRole = (session.user as any).role;
  if (userRole === 'creator') {
    redirect('/creator');
  } else if (userRole === 'promoter') {
    redirect('/promoter');
  } else if (userRole === 'admin') {
    redirect('/admin');
  }

  // Fallback redirect
  redirect('/auth/login');
}