import { publicProcedure, router } from '../trpc';
import { observable } from '@trpc/server/observable';
import { z } from 'zod';
import EventEmitter from 'events';

const ee = new EventEmitter();

export const subscriptionRouter = router({
  onUpdate: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .subscription(({ input }) => {
      return observable<{ date: Date; message: string }>((emit) => {
        const handler = (data: { message: string }) => {
          emit.next({ date: new Date(), ...data });
        };

        const eventName = `update.${input.campaignId}`;
        ee.on(eventName, handler);

        // unsubscribe
        return () => {
          ee.off(eventName, handler);
        };
      });
    }),
  
  // Prosedur untuk memicu update (misalnya dari webhook atau proses internal)
  triggerUpdate: publicProcedure
    .input(z.object({ campaignId: z.string(), message: z.string() }))
    .mutation(({ input }) => {
      const eventName = `update.${input.campaignId}`;
      ee.emit(eventName, { message: input.message });
      return { success: true };
    }),
});

// Export tipe router ini untuk digunakan di root router
export type SubscriptionRouter = typeof subscriptionRouter;
