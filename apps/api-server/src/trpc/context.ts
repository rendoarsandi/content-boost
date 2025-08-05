import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { CreateWSSContextFnOptions } from '@trpc/server/adapters/ws';

/**
 * Creates context for an incoming request
 * @link https://trpc.io/docs/v10/context
 */
export const createContext = async (
  opts: CreateExpressContextOptions | CreateWSSContextFnOptions
) => {
  // Di sini kita bisa mengambil session pengguna atau info lain
  // dan meneruskannya ke resolver tRPC kita.
  return {
    // user: session?.user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
