import './env.js'; // must be first: loads .env before anything reads it
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { requireAuth, session } from './auth.js';
import marketRouter from './routes/market.js';
import tradesRouter from './routes/trades.js';
import watchlistRouter from './routes/watchlist.js';
import { supabaseReady } from './supabase.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// Public: is the server up, and is Supabase set?
app.get('/health', (_req, res) => {
  res.json({ ok: true, supabase: supabaseReady ? 'configured' : 'not configured' });
});

// Market data is public.
app.use('/market', marketRouter);

// Everything under /api needs a logged-in user.
app.use('/api', requireAuth);

app.get('/api/me', (_req, res) => {
  const { user } = session(res);
  res.json({ id: user.id, email: user.email, name: user.user_metadata?.full_name ?? null });
});
app.use('/api/watchlist', watchlistRouter);
app.use('/api/trades', tradesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Any error thrown in a route ends up here.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // broken JSON in the request body
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Request body is not valid JSON.' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

export default app;
