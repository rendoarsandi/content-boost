'use client';

import { Chat } from '@repo/ui/components/ui/chat';
import { useUser } from '@/hooks/useUser';

export default function ChatPage() {
  const { user } = useUser();

  if (!user) {
    return <div>Please log in to access chat</div>;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return (
    <div className="h-screen w-full flex flex-col p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Team Chat</h1>
      <div className="flex-grow">
        <Chat
          userId={user.id}
          supabaseUrl={supabaseUrl}
          supabaseKey={supabaseKey}
        />
      </div>
    </div>
  );
}
