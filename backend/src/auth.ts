import { SupabaseClient, User } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { supabaseFor, supabaseReady } from './supabase.js';

// Checks the "Authorization: Bearer <token>" header with Supabase.
// On success the route can read the user and a database client with session(res).
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!supabaseReady) {
    res.status(503).json({ error: 'Supabase is not configured on the server.' });
    return;
  }

  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) {
    res.status(401).json({ error: 'Missing login token.' });
    return;
  }

  const db = supabaseFor(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: 'Invalid or expired login token.' });
    return;
  }

  res.locals.user = data.user;
  res.locals.db = db;
  next();
}

// The logged-in user and their database client, set by requireAuth.
export function session(res: Response) {
  return { user: res.locals.user as User, db: res.locals.db as SupabaseClient };
}

// Small helpers for checking request bodies.
export const isMarket = (value: unknown): value is 'IN' | 'US' => value === 'IN' || value === 'US';
export const isTicker = (value: unknown): value is string => typeof value === 'string' && /^[A-Z0-9.&-]{1,20}$/.test(value);
export const isPositive = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
