import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardTitle, Label, Mono, Note, Small, Tag, toneOf } from '../../components/Bits';
import Button, { CircleButton } from '../../components/Button';
import Card from '../../components/Card';
import { AreaChart, CandleChart } from '../../components/Charts';
import { BackIcon, StarIcon } from '../../components/Icons';
import OrderSheet from '../../components/OrderSheet';
import Screen from '../../components/Screen';
import Seg from '../../components/Seg';
import { Colors, fonts } from '../../constants/theme';
import LoadState from '../../components/LoadState';
import { fmt, useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { getData, Side } from '../../data/sample';
import { freshness, StockData, useApi } from '../../lib/api';

// how many daily bars each range shows
const ranges = { '1M': 22, '3M': 60, '6M': 100 };
type Range = keyof typeof ranges;

export default function StockDetailScreen() {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { ticker } = useLocalSearchParams<{ ticker: string }>();
  const { watch, toggleWatch } = useApp();
  const [range, setRange] = useState<Range>('3M');
  const [chartType, setChartType] = useState<'Line' | 'Candle'>('Line');
  const [scrubbed, setScrubbed] = useState<number | null>(null); // chart index under the finger
  const [sheetSide, setSheetSide] = useState<Side | null>(null);

  const api = useApi<StockData>(`/market/stock/${encodeURIComponent(ticker)}`);
  const stock = api.data;
  const { session, loading } = useAuth();
  if (!loading && !session) return <Redirect href="/" />; // login needed
  const saved = !!watch[ticker];
  const back = (
    <CircleButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))}>
      <BackIcon color={c.tx} />
    </CircleButton>
  );
  if (!stock) {
    return (
      <Screen header={<>{back}<Text style={s.headerTitle}>Stock Detail</Text><View style={{ width: 48 }} /></>}>
        <LoadState loading={api.loading} error={api.error} onRetry={api.reload} />
      </Screen>
    );
  }
  const d = getData(stock.market); // currency and number style of this stock's market
  const setup = stock.setup;
  const count = ranges[range];
  const closes = stock.closes.slice(-count);
  const lastBar = stock.bars[stock.bars.length - 1];
  const biasColor = stock.bias === 'Bullish' ? c.up : stock.bias === 'Bearish' ? c.dn : c.mu2;

  const stats: [string, string][] = [
    ['Open', fmt(d, lastBar.o)],
    ['High', fmt(d, lastBar.h)],
    ['Low', fmt(d, lastBar.l)],
    ['RSI (14)', stock.rsi.toFixed(1)],
    ['ATR (14)', fmt(d, stock.atr)],
    ['Volume', `${stock.vr.toFixed(2)}× avg`],
    ['20 EMA', fmt(d, stock.ema[stock.ema.length - 1])],
    ['MACD', stock.macd],
    ['Pattern', stock.pattern],
  ];

  // price ladder: Target 2, Target 1, Entry, Stop (reversed for shorts),
  // placed by price with at least 32px between rows
  let ladder: { label: string; price: number; color: string; note: string; top: number }[] = [];
  if (setup) {
    const rows = [
      { label: 'Target 2', price: setup.t2, color: c.up, note: '3R' },
      { label: 'Target 1', price: setup.t1, color: c.up, note: '1.5R' },
      { label: 'Entry', price: setup.entry, color: c.pr, note: 'mid of zone' },
      { label: 'Stop-loss', price: setup.stop, color: c.dn, note: '1.5× ATR' },
    ];
    if (setup.dir === 'Short') rows.reverse();
    const hi = Math.max(setup.t2, setup.stop);
    const lo = Math.min(setup.t2, setup.stop);
    const tops = rows.map((row) => ((hi - row.price) / (hi - lo)) * 150);
    for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] < 32) tops[i] = tops[i - 1] + 32;
    ladder = rows.map((row, i) => ({ ...row, top: tops[i] }));
  }
  const rr1 = setup ? (setup.t1 - setup.entry) / (setup.entry - setup.stop) : 0;
  const rr2 = setup ? (setup.t2 - setup.entry) / (setup.entry - setup.stop) : 0;

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <>
            {back}
            <Text style={s.headerTitle}>Stock Detail</Text>
            <CircleButton label={saved ? 'Remove from watchlist' : 'Add to watchlist'} onPress={() => toggleWatch(stock.symbol)}>
              <StarIcon color={saved ? c.pr : c.tx} filled={saved} />
            </CircleButton>
          </>
        }
        footer={
          <View style={[s.actionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Button label="Buy" onPress={() => setSheetSide('Buy')} style={{ flex: 1 }} />
            <Button label="Sell" variant="white" onPress={() => setSheetSide('Sell')} style={{ flex: 1 }} />
          </View>
        }
      >
        {/* name and price */}
        <Card style={s.priceCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
            <Mono ticker={stock.t} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{stock.name}</Text>
              <Small>
                {stock.t} · {stock.exchange}
              </Small>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.price}>
              {fmt(d, scrubbed === null ? stock.last : closes[scrubbed])} <Text style={s.currency}>{stock.currency}</Text>
            </Text>
            <Text style={[s.change, { color: stock.pct >= 0 ? c.up : c.dn }]}>
              {stock.chg >= 0 ? '+' : '−'}
              {fmt(d, Math.abs(stock.chg))} ({Math.abs(stock.pct).toFixed(2)}%)
            </Text>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Seg
            style={{ flex: 1 }}
            options={['1M', '3M', '6M'] as const}
            value={range}
            onChange={(next) => {
              setRange(next);
              setScrubbed(null);
            }}
          />
          <Seg small options={['Line', 'Candle'] as const} value={chartType} onChange={setChartType} />
        </View>

        <View style={{ marginHorizontal: -4 }}>
          {chartType === 'Line' ? (
            <AreaChart values={closes} axis locale={d.loc} height={220} format={(v) => d.cur + fmt(d, v)} onScrub={setScrubbed} />
          ) : (
            <CandleChart bars={stock.bars.slice(-count)} ema={stock.ema.slice(-count)} locale={d.loc} />
          )}
        </View>

        <Card pad style={s.statGrid}>
          {stats.map(([label, value]) => (
            <View key={label} style={s.stat}>
              <Small>{label}</Small>
              <Text style={s.statValue}>{value}</Text>
            </View>
          ))}
        </Card>

        <Card pad style={{ gap: 10 }}>
          <View style={s.row}>
            <CardTitle>Signals detected</CardTitle>
            <Tag label={stock.bias} tone={toneOf(stock.bias)} />
          </View>
          {stock.signals.map((signal) => (
            <View key={signal} style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, marginTop: 7, backgroundColor: biasColor }} />
              <Text style={s.signal}>{signal}</Text>
            </View>
          ))}
        </Card>

        {setup ? (
          <Card glow pad style={{ gap: 14 }}>
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.eyebrow}>EDUCATIONAL SETUP</Text>
                <Text style={s.setupTitle}>
                  {setup.dir} · {stock.pattern}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Small>Reward : risk</Small>
                <Text style={s.rewardRisk}>
                  1 : {rr1.toFixed(1)} / {rr2.toFixed(1)}
                </Text>
              </View>
            </View>
            <View style={{ height: ladder[ladder.length - 1].top + 22 }}>
              {ladder.map((row) => (
                <View key={row.label} style={[s.ladderRow, { top: row.top }]}>
                  <Text style={{ width: 70, fontSize: 12.5, fontFamily: fonts.semi, color: row.color }}>{row.label}</Text>
                  <View style={{ flex: 1, height: 0, borderWidth: 0.75, borderStyle: 'dashed', borderColor: row.color, opacity: 0.45 }} />
                  <Text style={{ fontSize: 12.5, fontFamily: fonts.bold, color: c.tx, fontVariant: ['tabular-nums'] }}>{d.cur + fmt(d, row.price)}</Text>
                  <Small style={{ width: 70, textAlign: 'right' }}>{row.note}</Small>
                </View>
              ))}
            </View>
            <Small>
              Entry zone {d.cur + fmt(d, setup.zl)} – {d.cur + fmt(d, setup.zh)}
            </Small>
            <Note>
              Risk {d.cur + fmt(d, setup.risk)} per share · suggested {fmt(d, setup.qty, 0)} shares at 1% of the paper balance
            </Note>
          </Card>
        ) : (
          <Card pad>
            <Text style={{ fontFamily: fonts.headSemi, fontSize: 17, color: c.tx }}>No actionable setup · watch only</Text>
            <Label style={{ marginTop: 6, lineHeight: 21, fontSize: 14 }}>Signals are mixed, so the net score is below the setup threshold.</Label>
          </Card>
        )}

        <Note style={{ paddingHorizontal: 4 }}>
          Yahoo Finance · {freshness(stock.asOf, stock.stale, stock.market)}. Algorithmic setup for educational analysis only. Not financial advice or a recommendation to buy or sell.
        </Note>
      </Screen>

      <OrderSheet stock={stock} side={sheetSide} onClose={() => setSheetSide(null)} />
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    headerTitle: { fontFamily: fonts.headSemi, fontSize: 19, letterSpacing: -0.38, color: c.tx },
    actionBar: { flexDirection: 'row', gap: 12, paddingTop: 14, paddingHorizontal: 18, backgroundColor: c.bg },
    priceCard: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
    name: { fontFamily: fonts.headSemi, fontSize: 18, lineHeight: 22, letterSpacing: -0.36, color: c.tx },
    price: { fontFamily: fonts.headBold, fontSize: 23, letterSpacing: -0.46, color: c.tx, fontVariant: ['tabular-nums'] },
    currency: { fontFamily: fonts.headMedium, fontSize: 15, color: c.cur },
    change: { fontSize: 14, fontFamily: fonts.semi, fontVariant: ['tabular-nums'] },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
    stat: { width: '33.33%', gap: 3, paddingRight: 10 },
    statValue: { fontSize: 14, fontFamily: fonts.semi, color: c.tx, fontVariant: ['tabular-nums'] },
    signal: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: fonts.regular, color: c.tx2 },
    eyebrow: { fontSize: 11.5, fontFamily: fonts.bold, letterSpacing: 0.5, color: c.pr },
    setupTitle: { fontFamily: fonts.headSemi, fontSize: 19, letterSpacing: -0.38, color: c.tx, marginTop: 3 },
    rewardRisk: { fontSize: 16, fontFamily: fonts.bold, color: c.pr, fontVariant: ['tabular-nums'] },
    ladderRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  });
