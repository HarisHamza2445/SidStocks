// Market news from Google News RSS, with a simple keyword sentiment score.
// Real headlines only: if the feed fails, the app shows "unavailable", never made-up news.

type Market = 'IN' | 'US';

const FEEDS: Record<Market, string> = {
  IN: 'https://news.google.com/rss/search?q=(Sensex+OR+Nifty+OR+%22Dalal+Street%22)+when:2d&hl=en-IN&gl=IN&ceid=IN:en',
  US: 'https://news.google.com/rss/search?q=(%22Wall+Street%22+OR+%22S%26P+500%22+OR+Nasdaq+OR+%22Dow+Jones%22)+when:2d&hl=en-US&gl=US&ceid=US:en',
};

// word -> weight. Positive = bullish, negative = bearish.
const WORDS: Record<string, number> = {
  gain: 1, gains: 1, rise: 1, rises: 1, rising: 1, rally: 1.5, rallies: 1.5, surge: 1.5, surges: 1.5, jump: 1.2, jumps: 1.2,
  soar: 1.5, soars: 1.5, climb: 1, climbs: 1, higher: 0.8, record: 0.8, beat: 1, beats: 1, strong: 0.8, upgrade: 1.2,
  boost: 1, boosts: 1, growth: 0.6, rebound: 1.2, rebounds: 1.2, recovery: 1, bullish: 1.5, positive: 0.8, outperform: 1, optimism: 1,
  fall: -1, falls: -1, drop: -1, drops: -1, decline: -1, declines: -1, slip: -1, slips: -1, slide: -1, slides: -1, plunge: -1.5,
  plunges: -1.5, tumble: -1.5, tumbles: -1.5, sink: -1.2, sinks: -1.2, lower: -0.8, loss: -1, losses: -1, weak: -0.8, cut: -0.6,
  downgrade: -1.2, crash: -2, selloff: -1.5, fear: -1, fears: -1, worries: -1, concern: -0.8, concerns: -0.8, bearish: -1.5,
  negative: -0.8, miss: -1, misses: -1, slump: -1.5, pressure: -0.6, volatile: -0.4, tariff: -0.5, tariffs: -0.5,
};

// -1..1. Same squashing idea as VADER's compound score.
export function tone(text: string) {
  const sum = text
    .toLowerCase()
    .split(/[^a-z-]+/)
    .reduce((s, w) => s + (WORDS[w.replace(/-/g, '')] ?? 0), 0);
  return sum / Math.sqrt(sum * sum + 4);
}

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const tag = (item: string, name: string) => decode(item.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? '');

const cache = new Map<Market, { at: number; items: NewsItem[] }>();
export type NewsItem = { id: string; title: string; url: string; source: string; publishedAt: string; score: number; sentiment: 'Bullish' | 'Bearish' | 'Neutral' };

export async function news(market: Market): Promise<{ items: NewsItem[]; stale: boolean }> {
  const hit = cache.get(market);
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return { items: hit.items, stale: false };
  try {
    const res = await fetch(FEEDS[market], { headers: { 'User-Agent': 'Mozilla/5.0 (SidStocks app)' }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`News feed answered ${res.status}`);
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
      .map(([, item]) => {
        const source = tag(item, 'source');
        const title = tag(item, 'title').replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
        const score = tone(title);
        return {
          id: tag(item, 'guid') || tag(item, 'link'),
          title,
          url: tag(item, 'link'),
          source,
          publishedAt: new Date(tag(item, 'pubDate')).toISOString(),
          score,
          sentiment: (score >= 0.2 ? 'Bullish' : score <= -0.2 ? 'Bearish' : 'Neutral') as NewsItem['sentiment'],
        };
      })
      .filter((x) => x.title && x.url.startsWith('https://'))
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, 25);
    if (!items.length) throw new Error('News feed was empty');
    cache.set(market, { at: Date.now(), items });
    return { items, stale: false };
  } catch (err) {
    if (hit) return { items: hit.items, stale: true };
    throw err;
  }
}
