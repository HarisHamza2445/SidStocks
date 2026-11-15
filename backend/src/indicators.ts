// Technical indicators and candlestick patterns, plain TypeScript.

export type Bar = { t: string; o: number; h: number; l: number; c: number; v: number };
export type Bias = 'Bullish' | 'Bearish' | 'Neutral';

export function ema(values: number[], n: number) {
  const k = 2 / (n + 1);
  let e = values[0];
  return values.map((x, i) => (i ? (e = x * k + e * (1 - k)) : e));
}

// RSI 14 (Wilder). Returns the latest value.
export function rsi(c: number[], n = 14) {
  if (c.length <= n) return 50;
  let g = 0;
  let l = 0;
  for (let i = 1; i <= n; i++) {
    const d = c[i] - c[i - 1];
    d > 0 ? (g += d) : (l -= d);
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

// MACD 12/26/9: line and signal for every bar
export function macd(c: number[]) {
  const e12 = ema(c, 12);
  const e26 = ema(c, 26);
  const line = c.map((_, i) => e12[i] - e26[i]);
  return { line, signal: ema(line, 9) };
}

// ATR 14 (Wilder)
export function atr(b: Bar[], n = 14) {
  const tr = b.map((x, i) => (i ? Math.max(x.h - x.l, Math.abs(x.h - b[i - 1].c), Math.abs(x.l - b[i - 1].c)) : x.h - x.l));
  let a = tr.slice(1, n + 1).reduce((s, x) => s + x, 0) / n;
  for (let i = n + 1; i < tr.length; i++) a = (a * (n - 1) + tr[i]) / n;
  return a;
}

// did series a cross b in the last `within` bars? 1 = up, -1 = down, 0 = no
function crossed(a: number[], b: number[], within: number) {
  for (let i = a.length - 1; i >= a.length - within && i > 0; i--) {
    if (a[i - 1] <= b[i - 1] && a[i] > b[i]) return 1;
    if (a[i - 1] >= b[i - 1] && a[i] < b[i]) return -1;
  }
  return 0;
}

// Pattern on bar i (uses bars before it). Returns name, direction and weight.
function patternAt(b: Bar[], i: number): { name: string; dir: number; w: number } | null {
  const x = b[i];
  const p = b[i - 1];
  const pp = b[i - 2];
  if (!x || !p || !pp) return null;
  const body = Math.abs(x.c - x.o);
  const range = x.h - x.l || 1;
  const upper = x.h - Math.max(x.o, x.c);
  const lower = Math.min(x.o, x.c) - x.l;
  const pBody = Math.abs(p.c - p.o);
  const downTrend = p.c < pp.c;
  const upTrend = p.c > pp.c;

  if (p.c < p.o && x.c > x.o && x.c >= p.o && x.o <= p.c && body > pBody) return { name: 'Bullish Engulfing', dir: 1, w: 2 };
  if (p.c > p.o && x.c < x.o && x.o >= p.c && x.c <= p.o && body > pBody) return { name: 'Bearish Engulfing', dir: -1, w: 2 };
  // stars: big candle, small candle, big opposite candle closing past the middle of the first
  const ppBody = Math.abs(pp.c - pp.o);
  if (pp.c < pp.o && pBody < ppBody * 0.4 && x.c > x.o && x.c > (pp.o + pp.c) / 2) return { name: 'Morning Star', dir: 1, w: 2 };
  if (pp.c > pp.o && pBody < ppBody * 0.4 && x.c < x.o && x.c < (pp.o + pp.c) / 2) return { name: 'Evening Star', dir: -1, w: 2 };
  if (downTrend && lower >= body * 2 && upper <= body * 0.5 && body / range > 0.1) return { name: 'Hammer', dir: 1, w: 1.5 };
  if (upTrend && upper >= body * 2 && lower <= body * 0.5 && body / range > 0.1) return { name: 'Shooting Star', dir: -1, w: 1.5 };
  if (body / range < 0.1) return { name: 'Doji', dir: 0, w: 0 };
  return null;
}

export const BALANCE = { IN: 1000000, US: 100000 }; // paper balance used for position size

// Full analysis of daily bars: indicators, patterns, signals, bias and the educational setup.
export function analyse(b: Bar[], market: 'IN' | 'US') {
  const c = b.map((x) => x.c);
  const last = c[c.length - 1];
  const e20 = ema(c, 20);
  const e50 = ema(c, 50);
  const m = macd(c);
  const r = rsi(c);
  const a = atr(b);
  const prevVols = b.slice(-21, -1).map((x) => x.v);
  const avgVol = prevVols.reduce((s, x) => s + x, 0) / (prevVols.length || 1);
  const volRatio = avgVol ? b[b.length - 1].v / avgVol : 0;

  const signals: { text: string; dir: number; w: number }[] = [];
  const add = (text: string, dir: number, w: number) => signals.push({ text, dir, w });

  const ec = crossed(e20, e50, 5);
  if (ec === 1) add('20 EMA crossed above the 50 EMA (golden cross)', 1, 2);
  if (ec === -1) add('20 EMA crossed below the 50 EMA (death cross)', -1, 2);

  const pat = patternAt(b, b.length - 1);
  const prevPat = pat ? null : patternAt(b, b.length - 2); // previous bar counts half
  if (pat) add(`${pat.name} on the last candle`, pat.dir, pat.w);
  if (prevPat && prevPat.dir) add(`${prevPat.name} on the previous candle`, prevPat.dir, prevPat.w / 2);

  if (r < 30) add(`RSI ${r.toFixed(0)}: oversold`, 1, 1.5);
  if (r > 70) add(`RSI ${r.toFixed(0)}: overbought`, -1, 1.5);

  const mc = crossed(m.line, m.signal, 3);
  if (mc === 1) add('MACD crossed above its signal line', 1, 1.5);
  if (mc === -1) add('MACD crossed below its signal line', -1, 1.5);

  const i = c.length - 1;
  if (last > e20[i] && e20[i] > e50[i]) add('Price above the 20 and 50 EMA (uptrend)', 1, 1);
  if (last < e20[i] && e20[i] < e50[i]) add('Price below the 20 and 50 EMA (downtrend)', -1, 1);

  if (volRatio >= 1.5) {
    const up = b[i].c >= b[i].o;
    add(`Volume ${volRatio.toFixed(1)}× the 20-day average`, up ? 1 : -1, 1);
  }

  const net = signals.reduce((s, x) => s + x.dir * x.w, 0);
  const bias: Bias = net >= 2 ? 'Bullish' : net <= -2 ? 'Bearish' : 'Neutral';

  const hist = m.line[i] - m.signal[i];
  const macdState = mc === 1 ? 'Bullish cross' : mc === -1 ? 'Bearish cross' : hist >= 0 ? 'Bullish' : 'Bearish';
  const pattern = pat?.name ?? prevPat?.name ?? (ec === 1 ? 'Golden Cross' : ec === -1 ? 'Death Cross' : 'None');

  // educational setup when |net| >= 2
  let setup = null;
  if (bias !== 'Neutral' && a > 0) {
    const long = bias === 'Bullish';
    const d = long ? 1 : -1;
    const zl = long ? last - 0.3 * a : last;
    const zh = long ? last : last + 0.3 * a;
    const entry = (zl + zh) / 2;
    const risk = 1.5 * a;
    const stop = entry - d * risk;
    const recent = b.slice(-20);
    const extreme = long ? Math.max(...recent.map((x) => x.h)) : Math.min(...recent.map((x) => x.l));
    const rOfExtreme = ((extreme - entry) * d) / risk;
    const t1 = rOfExtreme >= 1 && rOfExtreme <= 3 ? extreme : entry + d * 1.5 * risk;
    const t2 = long ? Math.max(entry + 3 * risk, t1 + risk) : Math.min(entry - 3 * risk, t1 - risk);
    setup = {
      dir: long ? 'Long' : 'Short',
      zl, zh, entry, risk, stop, t1, t2,
      qty: Math.max(1, Math.floor((BALANCE[market] * 0.01) / risk)),
    };
  }

  return {
    rsi: r,
    atr: a,
    volRatio,
    ema20: e20,
    ema50: e50[i],
    macd: macdState,
    pattern,
    bias,
    net,
    signals: signals.map((s) => s.text),
    setup,
  };
}
