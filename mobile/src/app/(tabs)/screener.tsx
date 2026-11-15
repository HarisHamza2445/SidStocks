import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Chg, Label, Mono, Ring, Small, Tag, toneOf } from '../../components/Bits';
import Card from '../../components/Card';
import { SearchIcon, StarIcon } from '../../components/Icons';
import LoadState from '../../components/LoadState';
import Screen from '../../components/Screen';
import Seg from '../../components/Seg';
import { fonts } from '../../constants/theme';
import { fmt, useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { getJson, ScreenerRow, SearchResult, useApi } from '../../lib/api';

const biases = ['All', 'Bullish', 'Bearish', 'Neutral'] as const;
// indicator filters: label and the test a stock must pass
const filters: [string, (s: ScreenerRow, starred: boolean) => boolean][] = [
  ['Any', () => true],
  ['Watchlist', (_s, starred) => starred],
  ['RSI < 30', (s) => s.rsi < 30],
  ['RSI > 70', (s) => s.rsi > 70],
  ['MACD bullish', (s) => s.macd.startsWith('Bullish')],
  ['MACD bearish', (s) => s.macd.startsWith('Bearish')],
  ['EMA 20 > 50', (s) => s.ema20 > s.ema50],
  ['EMA 20 < 50', (s) => s.ema20 < s.ema50],
  ['Volume spike', (s) => s.volRatio >= 1.5],
  ['Bullish candle', (s) => ['Bullish Engulfing', 'Hammer', 'Morning Star'].includes(s.pattern)],
  ['Bearish candle', (s) => ['Bearish Engulfing', 'Shooting Star', 'Evening Star'].includes(s.pattern)],
];

const openStock = (symbol: string) => router.push({ pathname: '/stock/[ticker]', params: { ticker: symbol } });

export default function ScreenerScreen() {
  const { c } = useTheme();
  const { d, market, watch, toggleWatch } = useApp();
  const [bias, setBias] = useState<(typeof biases)[number]>('All');
  const [filter, setFilter] = useState(filters[0]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const api = useApi<ScreenerRow[]>(`/market/screener?market=${market}`);

  // search Yahoo after the user stops typing for 400 ms
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(() => {
      getJson<SearchResult[]>(`/market/search?q=${encodeURIComponent(q)}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const list = (api.data ?? []).filter((s) => (bias === 'All' || s.bias === bias) && filter[1](s, !!watch[s.symbol]));

  return (
    <Screen title="Screener" subtitle="Pattern & signal scan">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: c.bd2, backgroundColor: c.card }}>
        <SearchIcon color={c.mu2} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search any NSE / US stock"
          placeholderTextColor={c.mu2}
          autoCorrect={false}
          style={{ flex: 1, height: 50, fontSize: 15, fontFamily: fonts.regular, color: c.tx }}
          accessibilityLabel="Search stocks"
        />
      </View>

      {results ? (
        <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
          {results.length === 0 && <Label style={{ paddingVertical: 14 }}>No stocks found.</Label>}
          {results.map((r, i) => (
            <Pressable key={r.symbol} onPress={() => openStock(r.symbol)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.hair }]}>
              <Mono ticker={r.t} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 14.5, fontFamily: fonts.semi, color: c.tx }}>{r.name}</Text>
                <Small>{r.symbol}</Small>
              </View>
              <Pressable onPress={() => toggleWatch(r.symbol)} hitSlop={10} accessibilityLabel={watch[r.symbol] ? 'Remove from watchlist' : 'Add to watchlist'}>
                <StarIcon color={watch[r.symbol] ? c.pr : c.mu2} filled={!!watch[r.symbol]} />
              </Pressable>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {!results && <Seg options={biases} value={bias} onChange={setBias} />}
      {!results && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 18 }}>
          {filters.map((f) => {
            const on = f === filter;
            return (
              <Pressable key={f[0]} onPress={() => setFilter(f)} style={{ height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: on ? c.pr : c.bd2, backgroundColor: on ? c.lav : c.card, justifyContent: 'center' }}>
                <Text style={{ fontSize: 12.5, fontFamily: on ? fonts.bold : fonts.medium, color: on ? c.pr : c.mu }}>{f[0]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {!results && !api.data && <LoadState loading={api.loading} error={api.error} onRetry={api.reload} />}
      {!results && api.data && <Small>{list.length} of {api.data.length} large caps · RSI, MACD, 20/50 EMA, volume and candlestick scan · delayed data</Small>}
      {!results && api.data && list.length === 0 && (
        <Card pad style={{ alignItems: 'center' }}>
          <Label>{filter[0] === 'Watchlist' ? 'Star a stock to see it here.' : 'No stock matches this filter right now.'}</Label>
        </Card>
      )}

      {!results &&
        list.map((stock) => (
          <Pressable key={stock.symbol} onPress={() => openStock(stock.symbol)} style={({ pressed }) => pressed && { transform: [{ scale: 0.97 }] }}>
            <Card style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <Mono ticker={stock.t} size={42} />
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 15.5, fontFamily: fonts.semi, color: c.tx }}>{stock.name}</Text>
                    <Small>{stock.t}</Small>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15.5, fontFamily: fonts.bold, color: c.tx, fontVariant: ['tabular-nums'] }}>{d.cur + fmt(d, stock.last)}</Text>
                  <Chg value={stock.pct} size={12} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  ['MACD', stock.macd],
                  ['EMA 20', fmt(d, stock.ema20)],
                  ['EMA 50', fmt(d, stock.ema50)],
                ].map(([k, v]) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Small>{k}</Small>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontFamily: fonts.semi, color: c.tx2, fontVariant: ['tabular-nums'] }}>{v}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                  <Tag label={stock.bias} tone={toneOf(stock.bias)} />
                  {stock.pattern !== 'None' && <Tag label={stock.pattern} />}
                  <Tag label={stock.setupDir ? `${stock.setupDir} setup` : 'Watch only'} />
                </View>
                {/* RSI ring: red above 70, green below 30 */}
                <Ring value={stock.rsi} max={100} size={42} label={stock.rsi.toFixed(0)} color={stock.rsi > 70 ? c.dn : stock.rsi < 30 ? c.up : c.pr} />
              </View>
            </Card>
          </Pressable>
        ))}
    </Screen>
  );
}
