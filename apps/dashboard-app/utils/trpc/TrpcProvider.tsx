"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from './client';
import { httpBatchLink } from '@trpc/client';
import React, { useState } from 'react';

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return '';
    if (process.env.VERCEL_URL) return `https://\${process.env.VERCEL_URL}`;
    return `http://localhost:3002`;
};

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({}));
    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                }),
            ],
        })
    );

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </trpc.Provider>
    );
}
