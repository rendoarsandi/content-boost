'use client';

import { useState } from 'react';
// import { trpc } from '../../utils/trpc/client';

export default function RealtimeCampaignTracker({
  campaignId,
}: {
  campaignId: string;
}) {
  const [messages, setMessages] = useState<string[]>([]);

  // TODO: Re-enable TRPC when the bundling issue is resolved
  // trpc.subscriptions.onUpdate.useSubscription(
  //   { campaignId },
  //   {
  //     onData: (data) => {
  //       const newMessage = `[${new Date(data.date).toLocaleTimeString()}] ${data.message}`;
  //       setMessages((prev) => [...prev, newMessage]);
  //     },
  //     onError: (err) => {
  //       console.error('Subscription error:', err);
  //     },
  //   }
  // );

  // // Komponen untuk memicu update (hanya untuk demo)
  // const trigger = trpc.subscriptions.triggerUpdate.useMutation();
  const handleSendMessage = () => {
    // trigger.mutate({ campaignId, message: 'A new view was registered!' });
    console.log('Demo trigger for campaign:', campaignId);
  };

  return (
    <div
      style={{
        border: '1px solid #ccc',
        padding: '1rem',
        borderRadius: '8px',
        marginTop: '1rem',
      }}
    >
      <h3>Real-time Tracker for Campaign: {campaignId}</h3>
      <button onClick={handleSendMessage}>(Demo) Trigger Manual Update</button>
      <div style={{ marginTop: '1rem', fontFamily: 'monospace' }}>
        <h4>Live Feed:</h4>
        <ul>
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
        {messages.length === 0 && <p>Waiting for updates...</p>}
      </div>
    </div>
  );
}
