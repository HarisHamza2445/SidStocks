import YahooFinance from 'yahoo-finance2';
import { analyse, Bar, ema } from './indicators.js';
import { news } from './news.js';

// Market data from Yahoo Finance (unofficial, delayed). Cached for 5 minutes.

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
export type Market = 'IN' | 'US';

const INDICES = {
  IN: [['^NSEI', 'NIFTY 50'], ['^BSESN', 'SENSEX'], ['^NSEBANK', 'BANK NIFTY']],
  US: [['^GSPC', 'S&P 500'], ['^IXIC', 'NASDAQ'], ['^DJI', 'DOW JONES']],
};
const SECTORS = {
  IN: [['^CNXIT', 'IT'], ['^NSEBANK', 'BANK'], ['^CNXAUTO', 'AUTO'], ['^CNXPHARMA', 'PHARMA'], ['^CNXFMCG', 'FMCG'], ['^CNXENERGY', 'ENERGY'], ['^CNXMETAL', 'METAL'], ['^CNXREALTY', 'REALTY']],
  US: [['XLK', 'Technology'], ['XLV', 'Healthcare'], ['XLF', 'Financials'], ['XLE', 'Energy'], ['XLY', 'Consumer'], ['XLI', 'Industrials'], ['XLP', 'Staples'], ['XLU', 'Utilities']],
};
const BENCH = { IN: ['^NSEI', 'NIFTY 50'], US: ['SPY', 'SPY'] };
// large caps scanned by the screener and used for breadth / movers
const UNIVERSE = {
  IN: ['RELIANCE', 'TCS', 'HDFCBANK', 'ICICIBANK', 'INFY', 'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'HINDUNILVR', 'KOTAKBANK', 'AXISBANK', 'BAJFINANCE', 'MARUTI', 'SUNPHARMA', 'TATASTEEL', 'M&M', 'NTPC', 'TITAN', 'WIPRO'].map((s) => s + '.NS'),
  US: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'JPM', 'V', 'XOM', 'UNH', 'JNJ', 'WMT', 'PG', 'KO', 'AMD', 'AVGO', 'NFLX', 'BAC', 'CVX'],
};

export const marketOf = (symbol: string): Market => (/\.(NS|BO)$/.test(symbol) ? 'IN' : 'US');
const display = (symbol: string) => symbol.replace(/\.(NS|BO)$/, '');

// ---- cache: 5 minutes, falls back to the last good value when Yahoo fails ----

const TTL = 5 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

async function cached<T>(key: string, load: () => Promise<T>): Promise<{ value: T; stale: boolean }> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { value: hit.value as T, stale: false };
  try {
    const value = await load();
    cache.set(key, { at: Date.now(), value });
    return { value, stale: false };
  } catch (err) {
    if (hit) return { value: hit.value as T, stale: true }; // old data, marked stale
    throw err;
  }
}

// ---- raw data ----

type Daily = { symbol: string; name: string; currency: string; tz: string; asOf: string; bars: Bar[] };

function daily(symbol: string) {
  return cached(`d:${symbol}`, async (): Promise<Daily> => {
    const r = await yf.chart(symbol, { period1: new Date(Date.now() - 400 * 864e5), interval: '1d' });
    const bars = r.quotes
      .filter((q) => q.close != null && q.open != null)
      .map((q) => ({ t: q.date.toISOString(), o: q.open!, h: q.high!, l: q.low!, c: q.close!, v: q.volume ?? 0 }));
    if (bars.length < 60) throw new Error(`Not enough data for ${symbol}`);
    return {
      symbol,
      name: r.meta.shortName ?? r.meta.longName ?? display(symbol),
      currency: r.meta.currency ?? '',
      tz: r.meta.exchangeTimezoneName,
      asOf: new Date(r.meta.regularMarketTime).toISOString(),
      bars,
    };
  }).then((x) => ({ ...x.value, stale: x.stale }));
}

// last session's 5-minute prices + whether the exchange is open now
function intraday(symbol: string) {
  return cached(`i:${symbol}`, async () => {
    const r = await yf.chart(symbol, { period1: new Date(Date.now() - 5 * 864e5), interval: '5m' });
    const quotes = r.quotes.filter((q) => q.close != null);
    const day = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: r.meta.exchangeTimezoneName });
    const lastDay = quotes.length ? day(quotes[quotes.length - 1].date) : '';
    const session = quotes.filter((q) => day(q.date) === lastDay);
    const period = r.meta.currentTradingPeriod?.regular;
    const now = Date.now();
    return {
      points: session.map((q) => ({ t: q.date.toISOString(), p: q.close! })),
      open: !!period && now >= new Date(period.start).getTime() && now <= new Date(period.end).getTime(),
      asOf: new Date(r.meta.regularMarketTime).toISOString(),
    };
  }).then((x) => ({ ...x.value, stale: x.stale }));
}

// run loaders, skip the ones that fail (one bad symbol should not break a whole screen)
async function settle<T>(items: Promise<T>[]) {
  const res = await Promise.allSettled(items);
  return res.filter((r): r is PromiseFulfilledResult<Awaited<T>> => r.status === 'fulfilled').map((r) => r.value);
}

const pctChange = (bars: Bar[], back: number) => {
  const now = bars[bars.length - 1].c;
  const then = bars[Math.max(0, bars.length - 1 - back)].c;
  return (now / then - 1) * 100;
};

// ---- screens ----

export async function screener(market: Market) {
  const list = await settle(UNIVERSE[market].map(daily));
  if (!list.length) throw new Error('No market data');
  return list.map((d) => {
    const a = analyse(d.bars, market);
    const c = d.bars.map((b) => b.c);
    return {
      symbol: d.symbol,
      t: display(d.symbol),
      name: d.name,
      last: c[c.length - 1],
      pct: pctChange(d.bars, 1),
      rsi: a.rsi,
      macd: a.macd,
      ema20: a.ema20[a.ema20.length - 1],
      ema50: a.ema50,
      volRatio: a.volRatio,
      pattern: a.pattern,
      bias: a.bias,
      setupDir: a.setup?.dir ?? null,
      spark: c.slice(-24),
      asOf: d.asOf,
      stale: d.stale,
    };
  });
}

export async function stock(symbol: string) {
  const d = await daily(symbol);
  const market = marketOf(symbol);
  const a = analyse(d.bars, market);
  const bars = d.bars.slice(-100);
  const last = bars[bars.length - 1].c;
  const prev = bars[bars.length - 2].c;
  return {
    symbol,
    t: display(symbol),
    name: d.name,
    market,
    exchange: market === 'IN' ? (symbol.endsWith('.BO') ? 'BSE' : 'NSE') : 'US',
    currency: d.currency,
    last,
    chg: last - prev,
    pct: (last / prev - 1) * 100,
    bars,
    closes: bars.map((b) => b.c),
    ema: a.ema20.slice(-100),
    rsi: a.rsi,
    atr: a.atr,
    vr: a.volRatio,
    macd: a.macd,
    pattern: a.pattern,
    bias: a.bias,
    signals: a.signals,
    setup: a.setup,
    asOf: d.asOf,
    stale: d.stale,
  };
}

export async function sectors(market: Market) {
  const [bench, ...rows] = await Promise.all([daily(BENCH[market][0]), ...SECTORS[market].map(([s]) => daily(s).catch(() => null))]);
  const b = { d1: pctChange(bench.bars, 1), d5: pctChange(bench.bars, 5), m1: pctChange(bench.bars, 21), name: BENCH[market][1] };
  const list = rows.flatMap((d, i) => {
    if (!d) return [];
    const d1 = pctChange(d.bars, 1);
    const d5 = pctChange(d.bars, 5);
    const m1 = pctChange(d.bars, 21);
    const rx = m1 - b.m1;
    const ry = d5 - b.d5;
    const rot = rx >= 0 && ry >= 0 ? 'Leading' : rx < 0 && ry >= 0 ? 'Improving' : rx >= 0 ? 'Weakening' : 'Lagging';
    const short = SECTORS[market][i][1];
    return [{ name: (market === 'IN' ? 'NIFTY ' : '') + short, short, d1, d5, m1, rx, ry, rot }];
  });
  return { bench: b, sectors: list, asOf: bench.asOf, stale: bench.stale };
}

export async function overview(market: Market) {
  const [stocks, headlines, idx] = await Promise.all([
    screener(market),
    news(market).catch(() => null), // news is optional for the score
    Promise.all(
      INDICES[market].map(async ([symbol, name]) => {
        const [d, i] = await Promise.all([daily(symbol), intraday(symbol)]);
        const bars = d.bars;
        // if the last daily bar is today's session, previous close is the bar before it
        const sessionDay = i.points.length ? i.points[0].t.slice(0, 10) : '';
        const lastIsSession = bars[bars.length - 1].t.slice(0, 10) === sessionDay;
        const prev = bars[bars.length - (lastIsSession ? 2 : 1)].c;
        const price = i.points.length ? i.points[i.points.length - 1].p : bars[bars.length - 1].c;
        // trend: average of 4 checks, each +1 or -1
        const c = bars.map((x) => x.c);
        const e20 = ema(c, 20)[c.length - 1];
        const sma50 = c.slice(-50).reduce((s, x) => s + x, 0) / 50;
        const last = c[c.length - 1];
        const trend = [last > e20, last > sma50, e20 > sma50, pctChange(bars, 5) > 0].reduce((s, ok) => s + (ok ? 1 : -1), 0) / 4;
        return { name, symbol, price, prev, series: i.points.map((p) => p.p), times: i.points.map((p) => p.t), open: i.open, asOf: i.asOf, trend, stale: i.stale || d.stale };
      }),
    ),
  ]);

  const adv = stocks.filter((s) => s.pct > 0.05).length;
  const dec = stocks.filter((s) => s.pct < -0.05).length;
  const unch = stocks.length - adv - dec;
  const above = Math.round((stocks.filter((s) => s.last > s.ema20).length / stocks.length) * 100);
  const tech = idx.reduce((s, x) => s + x.trend, 0) / idx.length;
  const breadth = adv + dec ? (adv - dec) / (adv + dec) : 0;
  // sentiment = 0.5 trend + 0.25 breadth + 0.25 news (news = average tone / 0.3, clipped to ±1)
  const items = headlines?.items ?? [];
  const newsTone = items.length ? Math.max(-1, Math.min(1, items.reduce((t, n) => t + n.score, 0) / items.length / 0.3)) : null;
  const score = newsTone === null ? (0.5 * tech + 0.25 * breadth) / 0.75 : 0.5 * tech + 0.25 * breadth + 0.25 * newsTone;
  const label = score >= 0.2 ? 'Bullish' : score <= -0.2 ? 'Bearish' : 'Neutral';
  const sorted = [...stocks].sort((a, b) => b.pct - a.pct);
  const mover = (s: (typeof stocks)[number]) => ({ t: s.t, symbol: s.symbol, name: s.name, price: s.last, pct: s.pct });

  // summary written only from the numbers above
  const main = idx[0];
  const mainPct = (main.price / main.prev - 1) * 100;
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const summary =
    `${main.name} ${mainPct >= 0 ? 'up' : 'down'} ${Math.abs(mainPct).toFixed(2)}% in the latest session. ` +
    `Breadth across ${stocks.length} large caps: ${adv} advancing, ${dec} declining. ` +
    `${above}% trade above their 20-day average. Top gainer ${top.t} (${top.pct >= 0 ? '+' : ''}${top.pct.toFixed(2)}%), ` +
    `weakest ${bottom.t} (${bottom.pct.toFixed(2)}%).`;

  return {
    market,
    open: main.open,
    asOf: main.asOf,
    stale: idx.some((x) => x.stale) || stocks.some((s) => s.stale),
    idx: idx.map(({ trend, ...rest }) => rest),
    sentiment: { score, label, missing: newsTone === null ? ['news'] : [] },
    breadth: { adv, dec, unch, above, universe: stocks.length },
    movers: { g: sorted.slice(0, 5).map(mover), l: sorted.slice(-5).reverse().map(mover) },
    summary,
  };
}

export async function search(q: string) {
  const r = await cached(`s:${q.toLowerCase()}`, () => yf.search(q, { quotesCount: 8, newsCount: 0 }));
  return r.value.quotes
    .filter((x): x is typeof x & { symbol: string } => 'symbol' in x && (x as { quoteType?: string }).quoteType === 'EQUITY')
    .filter((x) => /\.(NS|BO)$/.test(x.symbol) || !x.symbol.includes('.'))
    .map((x) => ({ symbol: x.symbol, t: display(x.symbol), name: (x as { shortname?: string }).shortname ?? x.symbol, market: marketOf(x.symbol) }));
}
