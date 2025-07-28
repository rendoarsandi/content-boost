import { router } from '../trpc';
import { subscriptionRouter } from './subscription';

export const appRouter = router({
  subscriptions: subscriptionRouter,
  // Tambahkan router lain di sini nanti
});

export type AppRouter = typeof appRouter;
