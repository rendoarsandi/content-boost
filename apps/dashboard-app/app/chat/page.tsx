import { Chat } from '@repo/ui/chat';

export default function ChatPage() {
  return (
    <div className="h-screen w-full flex flex-col p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Team Chat</h1>
      <div className="flex-grow">
        <Chat />
      </div>
    </div>
  );
}
