import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';

// Backend address. On a phone, "localhost" is the phone itself, so use the
// computer's address that Expo is already running on (same Wi-Fi).
const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? `http://${host}:4000`;

// ---- response types (match backend/src/market.ts) ----

export type Bias = 'Bullish' | 'Bearish' | 'Neutral';
export type Mover = { t: string; symbol: string; name: string; price: number; pct: number };
export type Overview = {
  open: boolean;
  asOf: string;
  stale: boolean;
  idx: { name: string; symbol: string; price: number; prev: number; series: number[]; times: string[] }[];
  sentiment: { score: number; label: Bias; missing: string[] };
  breadth: { adv: number; dec: number; unch: number; above: number; universe: number };
  movers: { g: Mover[]; l: Mover[] };
  summary: string;
};
export type ScreenerRow = {
  symbol: string; t: string; name: string; last: number; pct: number; rsi: number; macd: string;
  ema20: number; ema50: number; volRatio: number; pattern: string; bias: Bias; setupDir: 'Long' | 'Short' | null; spark: number[];
};
export type SectorsData = {
  bench: { name: string };
  asOf: string;
  stale: boolean;
  sectors: { name: string; short: string; d1: number; d5: number; m1: number; rx: number; ry: number; rot: 'Leading' | 'Improving' | 'Weakening' | 'Lagging' }[];
};
export type Setup = { dir: 'Long' | 'Short'; zl: number; zh: number; entry: number; risk: number; stop: number; t1: number; t2: number; qty: number };
export type StockData = {
  symbol: string; t: string; name: string; market: 'IN' | 'US'; exchange: string; currency: string; last: number; chg: number; pct: number;
  bars: { o: number; h: number; l: number; c: number; v: number }[]; closes: number[]; ema: number[];
  rsi: number; atr: number; vr: number; macd: string; pattern: string; bias: Bias; signals: string[]; setup: Setup | null;
  asOf: string; stale: boolean;
};
export type SearchResult = { symbol: string; t: string; name: string; market: 'IN' | 'US' };

// ---- fetching ----

// answers kept for 1 minute so switching tabs does not refetch
const memo = new Map<string, { at: number; data: unknown }>();

export async function getJson<T>(path: string): Promise<T> {
  const hit = memo.get(path);
  if (hit && Date.now() - hit.at < 60_000) return hit.data as T;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(API_URL + path, { signal: controller.signal });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Server error (${res.status})`);
    memo.set(path, { at: Date.now(), data: body });
    return body as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error('The server took too long to answer.');
    if (err instanceof TypeError) throw new Error('Cannot reach the SidStocks server. Is the backend running?');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Loads a path. Returns data, error message, loading flag and reload().
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: !!path });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    getJson<T>(path)
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((err: Error) => alive && setState({ data: null, error: err.message, loading: false }));
    return () => {
      alive = false;
    };
  }, [path, tick]);

  // quietly refresh every minute so prices keep moving while the market is open
  useEffect(() => {
    if (!path) return;
    const timer = setInterval(() => {
      memo.delete(path);
      getJson<T>(path)
        .then((data) => setState({ data, error: null, loading: false }))
        .catch(() => {}); // keep showing the last good data
    }, 60_000);
    return () => clearInterval(timer);
  }, [path]);

  const reload = useCallback(() => {
    if (path) memo.delete(path);
    setTick((t) => t + 1);
  }, [path]);

  return { ...state, reload };
}

// "Delayed · as of 15:30 IST", or "Stale · …" when the server served old cached data
export function freshness(asOf: string, stale: boolean, market: 'IN' | 'US') {
  const time = new Date(asOf).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: market === 'IN' ? 'Asia/Kolkata' : 'America/New_York',
  });
  return `${stale ? 'Stale' : 'Delayed'} · as of ${time} ${market === 'IN' ? 'IST' : 'ET'}`;
}

export type NewsItem = { id: string; title: string; url: string; source: string; publishedAt: string; score: number; sentiment: Bias };
export type NewsData = { items: NewsItem[]; stale: boolean };

// Row of the trades table in Supabase (numbers may come back as strings)
export type TradeRow = {
  id: string; market: 'IN' | 'US'; ticker: string; side: 'Buy' | 'Sell'; qty: number; entry: number; stop: number | null;
  setup: string | null; notes: string | null; status: 'open' | 'closed'; exit: number | null; pnl: number | null;
  r_multiple: number | null; opened_at: string; closed_at: string | null;
};

// Calls a /api route as the logged-in user. token = Supabase access token.
export async function apiRequest<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the SidStocks server. Is the backend running?');
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
  return data as T;
}

// "RELIANCE.NS" -> "RELIANCE"
export const short = (symbol: string) => symbol.replace(/\.(NS|BO)$/, '');
export const marketOf = (symbol: string): 'IN' | 'US' => (/\.(NS|BO)$/.test(symbol) ? 'IN' : 'US');

// "12 min", "3 h", "2 d"
export function timeAgo(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`;
}
