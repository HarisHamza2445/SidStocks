// SAMPLE DATA ONLY — not real market data.
// Same numbers as design/sidstocks-prototype.html so the app matches the prototype.
// Real data replaces this in Phase 4 (market data) and Phase 5 (news, journal).

export type Market = 'IN' | 'US';
export type Bias = 'Bullish' | 'Bearish' | 'Neutral';
export type Side = 'Buy' | 'Sell';
export type Rotation = 'Leading' | 'Improving' | 'Weakening' | 'Lagging';

export interface Bar {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface IndexQuote {
  name: string;
  price: number;
  prev: number;
  series: number[];
}

export interface Setup {
  dir: 'Long' | 'Short';
  zl: number; // entry zone low
  zh: number; // entry zone high
  entry: number;
  risk: number; // risk per share
  stop: number;
  t1: number;
  t2: number;
  qty: number;
}

export interface Stock {
  t: string;
  name: string;
  bias: Bias;
  pattern: string;
  macd: string;
  signals: string[];
  bars: Bar[];
  closes: number[];
  last: number;
  chg: number;
  pct: number;
  rsi: number;
  atr: number;
  vr: number; // volume / 20-day average
  ema: number[]; // 20 EMA
  setup: Setup | null;
}

export interface Sector {
  name: string;
  short: string;
  d1: number;
  d5: number;
  m1: number;
  rx: number; // 1-month return minus benchmark
  ry: number; // 5-day return minus benchmark
  rot: Rotation;
}

export interface Mover {
  t: string;
  name: string;
  price: number;
  pct: number;
}

export interface NewsItem {
  h: string;
  src: string;
  ago: string;
  sent: Bias;
  score: number;
  tag: string;
  scope: 'Market' | 'Watchlist';
}

export interface Position {
  t: string;
  side: Side;
  qty: number;
  entry: number;
  stop: number;
  setup: string;
}

export interface ClosedTrade {
  t: string;
  side: Side;
  r: number; // R multiple
  pnl: number;
  setup: string;
  date: string;
  plan: boolean; // plan followed
}

export interface MarketData {
  IN: boolean;
  cur: string;
  loc: string;
  idx: IndexQuote[];
  stocks: Stock[];
  sectors: Sector[];
  bench: { d1: number; d5: number; m1: number; name: string };
  movers: { g: Mover[]; l: Mover[] };
  news: NewsItem[];
  closed: ClosedTrade[];
  positions: Position[];
  balance: number;
  sent: { tech: number; breadth: number; news: number };
  breadth: { adv: number; dec: number; unch: number; above: number };
  times: string[];
  summary: string;
  note: string;
}

// ---- repeatable random numbers, so sample charts look the same every time ----

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function intraday(seed: number, n: number, prev: number, price: number) {
  const r = rng(seed);
  const raw = [1];
  for (let i = 1; i < n; i++) raw.push(raw[i - 1] * (1 + (r() - 0.5) * 0.004));
  const t = price / prev;
  const e = raw[n - 1];
  return raw.map((v, i) => prev * v * Math.pow(t / e, i / (n - 1)));
}

function genBars(seed: number, n: number, drift: number, vol: number, last: number): Bar[] {
  const r = rng(seed * 7 + 3);
  let c = 100;
  const out: Bar[] = [];
  for (let i = 0; i < n; i++) {
    const o = c * (1 + (r() - 0.5) * vol * 0.6);
    c = o * (1 + drift + (r() - 0.5) * vol);
    out.push({
      o,
      h: Math.max(o, c) * (1 + r() * vol * 0.45),
      l: Math.min(o, c) * (1 - r() * vol * 0.45),
      c,
      v: 0.6 + r() * 0.8 + (Math.abs(c - o) / o) * 25,
    });
  }
  const k = last / out[n - 1].c;
  return out.map((b) => ({ o: b.o * k, h: b.h * k, l: b.l * k, c: b.c * k, v: b.v }));
}

// RSI 14 (Wilder)
function rsiOf(c: number[]) {
  const n = 14;
  let g = 0;
  let l = 0;
  for (let i = 1; i <= n; i++) {
    const d = c[i] - c[i - 1];
    if (d > 0) g += d;
    else l -= d;
  }
  g /= n;
  l /= n;
  for (let i = n + 1; i < c.length; i++) {
    const d = c[i] - c[i - 1];
    g = (g * (n - 1) + Math.max(d, 0)) / n;
    l = (l * (n - 1) + Math.max(-d, 0)) / n;
  }
  return l === 0 ? 100 : 100 - 100 / (1 + g / l);
}

function emaOf(values: number[], n: number) {
  const k = 2 / (n + 1);
  let e = values[0];
  return values.map((x, i) => {
    if (i) e = x * k + e * (1 - k);
    return e;
  });
}

// ---- raw sample rows ----

type StockDef = [string, string, number, number, Bias, string, string, string[]];

const IN_STOCKS: StockDef[] = [
  ['RELIANCE', 'Reliance Industries', 1482.3, 11, 'Bullish', 'Bullish Engulfing', 'Bullish cross', ['Bullish engulfing candle on above-average volume', 'MACD crossed above its signal line', 'Price holding above the 20 and 50 EMA']],
  ['TATASTEEL', 'Tata Steel', 168.45, 23, 'Bullish', 'Golden Cross', 'Bullish', ['20 EMA crossed above the 50 EMA (golden cross)', 'Volume above 1.5× the 20-day average', 'Metals sector leading on 1-month momentum']],
  ['SBIN', 'State Bank of India', 962.1, 53, 'Bullish', 'Hammer', 'Bullish', ['Hammer at 20 EMA support after a 4-day dip', 'RSI turning higher from the mid-40s']],
  ['HDFCBANK', 'HDFC Bank', 991.55, 37, 'Neutral', 'Doji', 'Flat', ['Doji after a 5-day rise: indecision', 'RSI mid-range, no extreme']],
  ['INFY', 'Infosys', 1488.9, 41, 'Bearish', 'Bearish Engulfing', 'Bearish cross', ['Bearish engulfing at the 20-day high', 'MACD crossed below its signal line', 'IT sector lagging the NIFTY 50']],
  ['ITC', 'ITC', 405.2, 67, 'Bearish', 'Evening Star', 'Bearish', ['Evening star reversal near resistance', 'Price slipped below the 20 EMA']],
];

const US_STOCKS: StockDef[] = [
  ['NVDA', 'NVIDIA', 188.4, 13, 'Bullish', 'Morning Star', 'Bullish cross', ['Morning star reversal at the 50 EMA', 'MACD crossed above its signal line', 'Volume 1.7× the 20-day average']],
  ['MSFT', 'Microsoft', 505.1, 31, 'Bullish', 'MACD Crossover', 'Bullish cross', ['MACD bullish crossover below zero', 'Price reclaimed the 20 EMA']],
  ['JPM', 'JPMorgan Chase', 305.6, 59, 'Bullish', 'Golden Cross', 'Bullish', ['20 EMA crossed above the 50 EMA (golden cross)', 'Financials improving vs SPY']],
  ['AAPL', 'Apple', 268.25, 29, 'Neutral', 'Doji', 'Flat', ['Doji at the 20 EMA: indecision', 'Volume below average']],
  ['TSLA', 'Tesla', 430.8, 43, 'Bearish', 'Shooting Star', 'Bearish cross', ['Shooting star after a 6-day rally', 'RSI rolling over from above 70']],
  ['XOM', 'Exxon Mobil', 116.35, 71, 'Bearish', 'Death Cross', 'Bearish', ['20 EMA crossed below the 50 EMA (death cross)', 'Energy lagging on 1-month momentum']],
];

type NewsDef = [string, string, string, Bias, number, string, 'Market' | 'Watchlist'];

// Placeholder headlines from the prototype, for layout only. Not real news.
const IN_NEWS: NewsDef[] = [
  ['Nifty ends higher as banks and metals lead broad-based buying', 'ET Markets', '12 min', 'Bullish', 0.62, '', 'Market'],
  ['IT index slips for a third session on weak global tech cues', 'Moneycontrol', '34 min', 'Bearish', -0.48, 'NIFTY IT', 'Market'],
  ['Metal stocks extend gains on firmer global commodity prices', 'LiveMint', '1 h', 'Bullish', 0.55, 'TATASTEEL', 'Watchlist'],
  ['Foreign fund flows turn mixed ahead of inflation data', 'Business Standard', '2 h', 'Neutral', -0.04, '', 'Market'],
  ['PSU banks rally on improving asset-quality outlook', 'LiveMint', '3 h', 'Bullish', 0.51, 'SBIN', 'Watchlist'],
  ['FMCG names under pressure as rural demand recovery stays uneven', 'Moneycontrol', '4 h', 'Bearish', -0.39, 'ITC', 'Watchlist'],
  ['Rupee trades in a narrow range against the dollar', 'ET Markets', '5 h', 'Neutral', 0.02, '', 'Market'],
];

const US_NEWS: NewsDef[] = [
  ['Stocks edge higher as chipmakers extend their rally', 'CNBC', '9 min', 'Bullish', 0.58, 'NVDA', 'Watchlist'],
  ['Treasury yields climb ahead of Fed minutes', 'MarketWatch', '41 min', 'Bearish', -0.33, '', 'Market'],
  ['Energy shares slide as crude prices retreat', 'Yahoo Finance', '1 h', 'Bearish', -0.52, 'XOM', 'Watchlist'],
  ['Bank stocks firm after upbeat loan-growth data', 'CNBC', '2 h', 'Bullish', 0.47, 'JPM', 'Watchlist'],
  ['Consumer sentiment holds steady in the latest survey', 'MarketWatch', '3 h', 'Neutral', 0.06, '', 'Market'],
  ['Software names gain on strong cloud-demand commentary', 'Investing.com', '4 h', 'Bullish', 0.49, 'MSFT', 'Watchlist'],
  ['EV makers mixed as price competition intensifies', 'Yahoo Finance', '5 h', 'Neutral', -0.11, 'TSLA', 'Watchlist'],
];

type ClosedDef = [string, Side, number, string, string, number];

const IN_CLOSED: ClosedDef[] = [
  ['RELIANCE', 'Buy', 1.4, 'Bullish Engulfing', 'Nov 12', 1],
  ['HDFCBANK', 'Buy', -1.0, 'Doji breakout', 'Nov 10', 0],
  ['ITC', 'Sell', 0.9, 'Evening Star', 'Nov 7', 1],
  ['TATASTEEL', 'Buy', 2.6, 'Golden Cross', 'Nov 5', 1],
  ['INFY', 'Sell', -1.0, 'Bearish Engulfing', 'Nov 3', 1],
  ['SBIN', 'Buy', 1.8, 'Hammer', 'Oct 30', 1],
];

const US_CLOSED: ClosedDef[] = [
  ['MSFT', 'Buy', 1.2, 'MACD Crossover', 'Nov 12', 1],
  ['AAPL', 'Buy', -1.0, 'Doji breakout', 'Nov 10', 0],
  ['XOM', 'Sell', 1.6, 'Death Cross', 'Nov 6', 1],
  ['NVDA', 'Buy', 2.4, 'Morning Star', 'Nov 4', 1],
  ['TSLA', 'Sell', -1.0, 'Shooting Star', 'Oct 31', 1],
  ['JPM', 'Buy', 0.8, 'Golden Cross', 'Oct 29', 1],
];

const toMovers = (rows: [string, string, number, number][]): Mover[] =>
  rows.map(([t, name, price, pct]) => ({ t, name, price, pct }));

// ---- build everything for one market (cached) ----

const cache: Partial<Record<Market, MarketData>> = {};

export function getData(market: Market): MarketData {
  const cached = cache[market];
  if (cached) return cached;

  const IN = market === 'IN';
  const balance = IN ? 1000000 : 100000;

  const idxDefs: [string, number, number, number][] = IN
    ? [['NIFTY 50', 25912.4, 0.64, 101], ['SENSEX', 84750.2, 0.58, 202], ['BANK NIFTY', 58140.75, -0.21, 303]]
    : [['S&P 500', 6812.35, 0.42, 404], ['NASDAQ', 23184.6, 0.71, 505], ['DOW JONES', 47236.1, -0.12, 606]];
  const idx = idxDefs.map(([name, price, pct, seed]) => {
    const prev = price / (1 + pct / 100);
    return { name, price, prev, series: intraday(seed, 78, prev, price) };
  });

  const stocks = (IN ? IN_STOCKS : US_STOCKS).map(([t, name, price, seed, bias, pattern, macd, signals]): Stock => {
    const drift = bias === 'Bullish' ? 0.0022 : bias === 'Bearish' ? -0.002 : 0.0003;
    const bars = genBars(seed, 100, drift, 0.026, price);
    const closes = bars.map((b) => b.c);
    const last = closes[99];
    const prev = closes[98];

    // ATR 14 and average volume of the previous 20 days
    let atr = 0;
    for (let i = 86; i < 100; i++) {
      atr += Math.max(bars[i].h - bars[i].l, Math.abs(bars[i].h - bars[i - 1].c), Math.abs(bars[i].l - bars[i - 1].c));
    }
    atr /= 14;
    let volAvg = 0;
    for (let i = 79; i < 99; i++) volAvg += bars[i].v;
    volAvg /= 20;

    // educational setup: entry zone 0.3 ATR, stop 1.5 ATR, targets 1.5R and 3R
    let setup: Setup | null = null;
    if (bias !== 'Neutral') {
      const long = bias === 'Bullish';
      const zl = long ? last - 0.3 * atr : last;
      const zh = long ? last : last + 0.3 * atr;
      const entry = (zl + zh) / 2;
      const risk = 1.5 * atr;
      setup = {
        dir: long ? 'Long' : 'Short',
        zl,
        zh,
        entry,
        risk,
        stop: long ? entry - risk : entry + risk,
        t1: long ? entry + 1.5 * risk : entry - 1.5 * risk,
        t2: long ? entry + 3 * risk : entry - 3 * risk,
        qty: Math.max(1, Math.floor((balance * 0.01) / risk)),
      };
    }

    return {
      t, name, bias, pattern, macd, signals, bars, closes, last,
      chg: last - prev,
      pct: (last / prev - 1) * 100,
      rsi: rsiOf(closes),
      atr,
      vr: bars[99].v / volAvg,
      ema: emaOf(closes, 20),
      setup,
    };
  });

  const bench = IN ? { d1: 0.64, d5: 1.2, m1: 1.9, name: 'NIFTY 50' } : { d1: 0.42, d5: 0.9, m1: 1.6, name: 'SPY' };
  const sectorDefs: [string, number, number, number][] = IN
    ? [['METAL', 1.84, 4.1, 7.92], ['BANK', -0.21, 0.62, 4.35], ['AUTO', 0.92, 2.25, 3.8], ['ENERGY', 0.47, 1.6, 1.15], ['PHARMA', 0.35, -0.42, 2.4], ['REALTY', 1.21, 2.8, -0.65], ['FMCG', -0.58, -1.35, -2.1], ['IT', -1.12, -2.48, -3.85]]
    : [['Technology', 0.95, 2.4, 5.6], ['Financials', 0.62, 1.85, 3.1], ['Industrials', 0.3, 0.55, 2.25], ['Cons. Disc.', 0.48, 1.7, 1.1], ['Healthcare', -0.35, -0.6, 1.95], ['Utilities', 0.12, 1.2, -0.3], ['Staples', -0.4, -1.05, -1.6], ['Energy', -0.95, -2.1, -3.4]];
  const sectors = sectorDefs.map(([short, d1, d5, m1]): Sector => {
    const rx = m1 - bench.m1;
    const ry = d5 - bench.d5;
    const rot: Rotation = rx >= 0 && ry >= 0 ? 'Leading' : rx < 0 && ry >= 0 ? 'Improving' : rx >= 0 ? 'Weakening' : 'Lagging';
    return { name: (IN ? 'NIFTY ' : '') + short, short, d1, d5, m1, rx, ry, rot };
  });

  const movers = IN
    ? {
        g: toMovers([['TRENT', 'Trent', 5240.5, 3.82], ['BEL', 'Bharat Electronics', 412.3, 3.1], ['TATASTEEL', 'Tata Steel', 168.45, 2.71], ['HINDALCO', 'Hindalco', 798.6, 2.24], ['SBIN', 'State Bank of India', 962.1, 1.93]]),
        l: toMovers([['INFY', 'Infosys', 1488.9, -1.91], ['WIPRO', 'Wipro', 246.7, -1.62], ['NESTLEIND', 'Nestlé India', 1205.4, -1.18], ['ITC', 'ITC', 405.2, -0.94], ['HCLTECH', 'HCL Technologies', 1612.8, -0.81]]),
      }
    : {
        g: toMovers([['NVDA', 'NVIDIA', 188.4, 3.21], ['AMD', 'Advanced Micro Devices', 248.9, 2.88], ['AVGO', 'Broadcom', 352.1, 2.06], ['META', 'Meta Platforms', 742.3, 1.79], ['JPM', 'JPMorgan Chase', 305.6, 1.42]]),
        l: toMovers([['UNH', 'UnitedHealth', 318.4, -2.37], ['MRK', 'Merck', 86.2, -1.71], ['XOM', 'Exxon Mobil', 116.35, -1.15], ['KO', 'Coca-Cola', 69.8, -0.92], ['PG', 'Procter & Gamble', 152.6, -0.78]]),
      };

  const news = (IN ? IN_NEWS : US_NEWS).map(([h, src, ago, sent, score, tag, scope]): NewsItem => ({ h, src, ago, sent, score, tag, scope }));

  const unit = IN ? 10000 : 1000;
  const closed = (IN ? IN_CLOSED : US_CLOSED).map(([t, side, r, setup, date, plan]): ClosedTrade => ({ t, side, r, pnl: r * unit, setup, date, plan: !!plan }));

  const positions: Position[] = IN
    ? [
        { t: 'TATASTEEL', side: 'Buy', qty: 600, entry: 161.8, stop: 155.2, setup: 'Golden Cross' },
        { t: 'INFY', side: 'Sell', qty: 60, entry: 1512.4, stop: 1561.0, setup: 'Bearish Engulfing' },
      ]
    : [{ t: 'NVDA', side: 'Buy', qty: 40, entry: 181.2, stop: 174.6, setup: 'Morning Star' }];

  const result: MarketData = {
    IN,
    cur: IN ? '₹' : '$',
    loc: IN ? 'en-IN' : 'en-US',
    idx, stocks, sectors, bench, movers, news, closed, positions, balance,
    sent: IN ? { tech: 0.5, breadth: 0.27, news: 0.21 } : { tech: 0.25, breadth: 0.13, news: 0.05 },
    breadth: IN ? { adv: 31, dec: 16, unch: 1, above: 64 } : { adv: 22, dec: 17, unch: 1, above: 58 },
    times: IN ? ['9:15', '11:00', '12:45', '14:15', '15:30'] : ['9:30', '11:00', '12:30', '14:30', '16:00'],
    summary: IN
      ? 'Indian equities closed higher with the NIFTY 50 up 0.64%, led by metals and PSU banks, while IT stayed weak for a third session. Breadth was positive at 31 advancers to 16 decliners, and the index holds above its 20 and 50-day averages. Headline tone is mildly positive.'
      : 'US stocks finished modestly higher, with the NASDAQ up 0.71% as chipmakers rallied, while the Dow slipped 0.12% on weakness in energy and healthcare. Breadth was slightly positive and the S&P 500 remains above its 20-day average. News tone is roughly neutral.',
    note: IN ? 'Generated from sample data · NSE/BSE quotes delayed 15 min' : 'Generated from sample data · US quotes delayed 15 min',
  };

  cache[market] = result;
  return result;
}

// Sentiment = 0.5 × index trend + 0.25 × breadth + 0.25 × news
export function getSentiment(d: MarketData) {
  const score = 0.5 * d.sent.tech + 0.25 * d.sent.breadth + 0.25 * d.sent.news;
  const label: Bias = score >= 0.2 ? 'Bullish' : score <= -0.2 ? 'Bearish' : 'Neutral';
  return { score, label };
}
