import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink, wsLink, createWSClient } from '@trpc/client';
import type { AppRouter } from '../../../api-server/src/trpc/routers/_app'; // Mengimpor tipe dari backend

// Fungsi untuk mendapatkan URL berdasarkan lingkungan
const getBaseUrl = () => {
  if (typeof window !== 'undefined') return ''; // Browser should use relative url
  if (process.env.VERCEL_URL) return `https://\${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:3002`; // Development SSR should use localhost
};

const getWsUrl = () => {
    if (typeof window === 'undefined') {
        // Di server, kita tidak bisa membuat koneksi ws
        return null;
    }
    // Di browser, gunakan URL WebSocket
    return 'ws://localhost:4000';
}

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
    links: [
        // Gunakan wsLink untuk subscriptions
        (ctx) => {
            const wsUrl = getWsUrl();
            if (!wsUrl) {
                // Jika tidak ada URL WebSocket (misalnya saat SSR), gunakan httpBatchLink
                return httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                })(ctx);
            }
            return wsLink<AppRouter>({
                client: createWSClient({
                    url: wsUrl,
                }),
            })(ctx);
        }
    ],
});
