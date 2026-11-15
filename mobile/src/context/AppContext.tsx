import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { apiRequest, getJson, marketOf, short, StockData, TradeRow } from '../lib/api';
import { getData, Market, MarketData } from '../data/sample';
import { useAuth } from './AuthContext';

// App-wide state: India / US choice, watchlist, paper trades, live prices and the toast.
// Logged in: watchlist and trades are saved in Supabase through the backend.
// Demo mode: they live in memory and the journal starts with labelled sample trades.

export type Trade = {
  id: string;
  symbol: string;
  side: 'Buy' | 'Sell';
  qty: number;
  entry: number;
  stop: number | null;
  setup: string | null;
  notes: string | null;
  status: 'open' | 'closed';
  exit: number | null;
  pnl: number | null;
  r: number | null;
  date: string; // opened (open trades) or closed (history)
};

export type NewTrade = { symbol: string; side: 'Buy' | 'Sell'; qty: number; entry: number; stop?: number; setup?: string; exit?: number; notes?: string };

type AppState = {
  market: Market;
  setMarket: (m: Market) => void;
  d: MarketData; // currency symbol and number style of the selected market
  demo: boolean; // true when not logged in
  watch: Record<string, boolean>; // Yahoo symbol -> starred
  toggleWatch: (symbol: string) => void;
  trades: Trade[]; // trades of the selected market, newest first
  prices: Record<string, number>; // latest price per symbol, for open positions
  addTrade: (t: NewTrade) => Promise<boolean>;
  closeTrade: (id: string) => void;
  toast: string | null;
  showToast: (message: string) => void;
  hideToast: () => void;
};

const AppContext = createContext<AppState | null>(null);

// 1234.5 -> "1,234.50" in the market's number style
export function fmt(d: MarketData, n: number, decimals = 2) {
  return n.toLocaleString(d.loc, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function money(d: MarketData, n: number, decimals = 2) {
  return (n < 0 ? '−' : '') + d.cur + fmt(d, Math.abs(n), decimals);
}
export function signed(d: MarketData, n: number, decimals = 2) {
  return (n >= 0 ? '+' : '−') + d.cur + fmt(d, Math.abs(n), decimals);
}
export function pct(n: number) {
  return (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2) + '%';
}

const num = (x: unknown) => (x === null || x === undefined ? null : Number(x));

function fromRow(row: TradeRow): Trade {
  return {
    id: row.id, symbol: row.ticker, side: row.side, qty: Number(row.qty), entry: Number(row.entry), stop: num(row.stop),
    setup: row.setup, notes: row.notes, status: row.status, exit: num(row.exit), pnl: num(row.pnl), r: num(row.r_multiple),
    date: row.closed_at ?? row.opened_at,
  };
}

// Sample trades shown in demo mode (labelled "Sample data" on the Journal).
function demoTrades(m: Market): Trade[] {
  const d = getData(m);
  const sym = (t: string) => (m === 'IN' ? t + '.NS' : t);
  const open = d.positions.map((p, i): Trade => ({
    id: `demo-open-${m}-${i}`, symbol: sym(p.t), side: p.side, qty: p.qty, entry: p.entry, stop: p.stop, setup: p.setup,
    notes: null, status: 'open', exit: null, pnl: null, r: null, date: new Date().toISOString(),
  }));
  const unit = m === 'IN' ? 10000 : 1000;
  const closed = d.closed.map((c, i): Trade => ({
    id: `demo-closed-${m}-${i}`, symbol: sym(c.t), side: c.side, qty: 1, entry: 0, stop: null, setup: c.setup, notes: null,
    status: 'closed', exit: null, pnl: c.r * unit, r: c.r, date: c.date,
  }));
  return [...open, ...closed];
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const [market, setMarket] = useState<Market>('IN');
  const [watch, setWatch] = useState<Record<string, boolean>>({});
  const [all, setAll] = useState<Record<Market, Trade[]>>({ IN: [], US: [] });
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  // load watchlist and trades whenever the user logs in or out
  useEffect(() => {
    if (!token) {
      setWatch({});
      setAll({ IN: demoTrades('IN'), US: demoTrades('US') });
      return;
    }
    let alive = true;
    const markets: Market[] = ['IN', 'US'];
    Promise.all([
      Promise.all(markets.map((m) => apiRequest<TradeRow[]>(token, 'GET', `/api/trades?market=${m}`))),
      Promise.all(markets.map((m) => apiRequest<string[]>(token, 'GET', `/api/watchlist?market=${m}`))),
    ])
      .then(([tradeLists, watchLists]) => {
        if (!alive) return;
        setAll({ IN: tradeLists[0].map(fromRow), US: tradeLists[1].map(fromRow) });
        setWatch(Object.fromEntries(watchLists.flat().map((s) => [s, true])));
      })
      .catch((err: Error) => alive && showToast(`Could not load your journal: ${err.message}`));
    return () => {
      alive = false;
    };
  }, [token]);

  const trades = all[market];

  // latest price for every open position, refreshed every minute
  useEffect(() => {
    const symbols = [...new Set(trades.filter((t) => t.status === 'open').map((t) => t.symbol))];
    const load = () =>
      symbols.forEach((s) =>
        getJson<StockData>(`/market/stock/${encodeURIComponent(s)}`)
          .then((st) => setPrices((p) => ({ ...p, [s]: st.last })))
          .catch(() => {}),
      );
    load();
    if (!symbols.length) return;
    const timer = setInterval(load, 61_000);
    return () => clearInterval(timer);
  }, [trades]);

  const save = (m: Market, list: Trade[]) => setAll((a) => ({ ...a, [m]: list }));

  async function toggleWatch(symbol: string) {
    const on = !watch[symbol];
    setWatch((w) => ({ ...w, [symbol]: on }));
    showToast(on ? `${short(symbol)} added to watchlist` : `${short(symbol)} removed from watchlist`);
    if (!token) return;
    try {
      if (on) await apiRequest(token, 'POST', '/api/watchlist', { market: marketOf(symbol), ticker: symbol });
      else await apiRequest(token, 'DELETE', `/api/watchlist/${marketOf(symbol)}/${encodeURIComponent(symbol)}`);
    } catch (err) {
      setWatch((w) => ({ ...w, [symbol]: !on })); // undo
      showToast((err as Error).message);
    }
  }

  // Open a paper position (no exit) or save a finished trade (with exit).
  async function addTrade(t: NewTrade) {
    const m = marketOf(t.symbol);
    try {
      let trade: Trade;
      if (token) {
        const row = await apiRequest<TradeRow>(token, 'POST', '/api/trades', { market: m, ticker: t.symbol, ...t });
        trade = fromRow(row);
      } else {
        const dir = t.side === 'Buy' ? 1 : -1;
        const closed = t.exit !== undefined;
        trade = {
          id: `local-${Date.now()}`, symbol: t.symbol, side: t.side, qty: t.qty, entry: t.entry, stop: t.stop ?? null,
          setup: t.setup ?? null, notes: t.notes ?? null, status: closed ? 'closed' : 'open', exit: t.exit ?? null,
          pnl: closed ? (t.exit! - t.entry) * t.qty * dir : null,
          r: closed && t.stop ? +(((t.exit! - t.entry) * dir) / Math.abs(t.entry - t.stop)).toFixed(2) : null,
          date: new Date().toISOString(),
        };
      }
      save(m, [trade, ...all[m]]);
      return true;
    } catch (err) {
      showToast((err as Error).message);
      return false;
    }
  }

  // Close an open position at the latest price.
  async function closeTrade(id: string) {
    const t = trades.find((x) => x.id === id);
    if (!t) return;
    const exit = prices[t.symbol];
    if (!exit) {
      showToast('Live price not loaded yet. Try again in a moment.');
      return;
    }
    try {
      let closed: Trade;
      if (token && !id.startsWith('demo') && !id.startsWith('local')) {
        closed = fromRow(await apiRequest<TradeRow>(token, 'POST', `/api/trades/${id}/close`, { exit }));
      } else {
        const dir = t.side === 'Buy' ? 1 : -1;
        closed = {
          ...t, status: 'closed', exit, pnl: (exit - t.entry) * t.qty * dir,
          r: t.stop ? +(((exit - t.entry) * dir) / Math.abs(t.entry - t.stop)).toFixed(2) : null, date: new Date().toISOString(),
        };
      }
      save(market, [closed, ...trades.filter((x) => x.id !== id)]);
      showToast(`${short(t.symbol)} closed · ${signed(getData(market), closed.pnl ?? 0)}`);
    } catch (err) {
      showToast((err as Error).message);
    }
  }

  return (
    <AppContext.Provider
      value={{
        market, setMarket, d: getData(market), demo: !token, watch, toggleWatch, trades, prices, addTrade, closeTrade,
        toast, showToast, hideToast: () => setToast(null),
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
