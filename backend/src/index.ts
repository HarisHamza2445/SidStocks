// Local server: npm run dev. On Vercel, api/index.ts is used instead.
import app from './app.js';
import { supabaseReady } from './supabase.js';

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`SidStocks backend running on http://localhost:${port}`);
  if (!supabaseReady) console.warn('Supabase is not configured. /api routes will answer 503 until .env is filled in.');
});
