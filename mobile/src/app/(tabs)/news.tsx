import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Label, Note, Ring, SegBar, Small, Tag, toneOf } from '../../components/Bits';
import Card from '../../components/Card';
import LoadState from '../../components/LoadState';
import Screen from '../../components/Screen';
import Seg from '../../components/Seg';
import { fonts } from '../../constants/theme';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { marketOf, NewsData, ScreenerRow, short, timeAgo, useApi } from '../../lib/api';

const filters = ['All', 'Bullish', 'Bearish', 'Watchlist'] as const;
const signedScore = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(2);

export default function NewsScreen() {
  const { c } = useTheme();
  const { market, watch } = useApp();
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const api = useApi<NewsData>(`/market/news?market=${market}`);
  const rows = useApi<ScreenerRow[]>(`/market/screener?market=${market}`); // names of starred stocks

  // words that link a headline to a starred stock: ticker and first word of the name
  const keywords = Object.keys(watch)
    .filter((sym) => watch[sym] && marketOf(sym) === market)
    .flatMap((sym) => {
      const name = rows.data?.find((r) => r.symbol === sym)?.name.split(' ')[0];
      return [short(sym), ...(name && name.length > 3 ? [name] : [])].map((w) => w.toLowerCase());
    });
  const tagOf = (title: string) => keywords.find((k) => new RegExp(`\\b${k.replace(/[^a-z0-9]/g, '')}\\b`, 'i').test(title));

  const all = api.data?.items ?? [];
  const items = all.filter((n) => filter === 'All' || (filter === 'Watchlist' ? !!tagOf(n.title) : n.sentiment === filter));
  const bull = all.filter((n) => n.sentiment === 'Bullish').length;
  const bear = all.filter((n) => n.sentiment === 'Bearish').length;
  const neutral = all.length - bull - bear;
  const average = all.reduce((sum, n) => sum + n.score, 0) / (all.length || 1);

  return (
    <Screen title="News" subtitle="Sentiment-tagged headlines">
      <Seg options={filters} value={filter} onChange={setFilter} />

      {!api.data && <LoadState loading={api.loading} error={api.error} onRetry={api.reload} />}

      {api.data && (
        <Card glow pad style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Ring value={bull} max={all.length || 1} color={c.upC} size={66} label={`${Math.round((bull / (all.length || 1)) * 100)}%`} />
          <View style={{ flex: 1, gap: 9 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Label>Headline tone</Label>
              <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: average >= 0 ? c.up : c.dn, fontVariant: ['tabular-nums'] }}>{signedScore(average)}</Text>
            </View>
            <SegBar parts={[bull, neutral, bear]} height={8} />
            <Small>
              {bull} bullish · {neutral} neutral · {bear} bearish
            </Small>
          </View>
        </Card>
      )}

      {api.data && (
        <Note>
          Google News headlines{api.data.stale ? ' (stale, refresh failed)' : ''}. Tone is a simple keyword score, not advice. Tap to open the article.
        </Note>
      )}

      {api.data && items.length === 0 && (
        <Card pad style={{ alignItems: 'center' }}>
          <Label>{filter === 'Watchlist' ? 'No headlines about your starred stocks.' : `No ${filter.toLowerCase()} headlines right now.`}</Label>
        </Card>
      )}

      {items.map((item) => {
        const tag = tagOf(item.title);
        return (
          <Pressable key={item.id} onPress={() => WebBrowser.openBrowserAsync(item.url).catch(() => {})} accessibilityRole="link">
            <Card pad style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Tag label={item.sentiment} tone={toneOf(item.sentiment)} />
                <Small>{signedScore(item.score)}</Small>
                {tag ? <Tag label={tag.toUpperCase()} /> : null}
              </View>
              <Text style={{ fontSize: 15.5, lineHeight: 22, fontFamily: fonts.semi, color: c.tx }}>{item.title}</Text>
              <Small>
                {item.source} · {timeAgo(item.publishedAt)} ago
              </Small>
            </Card>
          </Pressable>
        );
      })}
    </Screen>
  );
}
