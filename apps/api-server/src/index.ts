import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { WebSocketServer } from 'ws';
import { appRouter } from './trpc/routers/_app';
import { createContext } from './trpc/context';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());

// Middleware untuk request HTTP biasa
app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const server = app.listen(port, () => {
  console.log(`🚀 API Server listening on http://localhost:${port}`);
});

// Setup WebSocket Server
const wss = new WebSocketServer({ server });
const handler = applyWSSHandler({ wss, router: appRouter, createContext });

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  handler.broadcastReconnectNotification();
  wss.close();
});

console.log('WebSocket Server initialized');