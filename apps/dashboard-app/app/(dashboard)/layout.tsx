'use client';

import { getSession } from '@repo/auth/server-only'; // This needs to be adapted for client-side
import { redirect } from 'next/navigation';
import { Sidebar } from '../components/sidebar';
import { Header } from '../components/header';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

// A simple loading state
function DashboardLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Loading dashboard...</p>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        redirect('/login');
      } else {
        // Assuming the role is in user_metadata
        setUser(data.session.user);
      }
      setLoading(false);
    };

    fetchSession();
  }, []);

  if (loading) {
    return <DashboardLoading />;
  }

  if (!user) {
    // This should be handled by the redirect in useEffect, but as a fallback
    return null;
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar user={user} />
      <div className="flex flex-col">
        <Header user={user} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
