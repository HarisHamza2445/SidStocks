import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { CardTitle, Chg, Label, Mono, Note, SegBar, Small, Tag, toneOf } from '../../components/Bits';
import { CircleButton, PillButton } from '../../components/Button';
import Card from '../../components/Card';
import { AreaChart, Sparkline } from '../../components/Charts';
import { Glow, quickGlow } from '../../components/Glow';
import { ArrowRightIcon, PieIcon, SearchIcon, SparkleIcon, TradeIcon, TrendIcon, UserIcon } from '../../components/Icons';
import LoadState from '../../components/LoadState';
import Screen, { MarketSeg } from '../../components/Screen';
import Seg from '../../components/Seg';
import { Colors, fonts } from '../../constants/theme';
import { fmt, useApp } from '../../context/AppContext';
import { useStyles, useTheme } from '../../context/ThemeContext';
import { freshness, marketOf, Overview, ScreenerRow, StockData, useApi } from '../../lib/api';

const openStock = (symbol: string) => router.push({ pathname: '/stock/[ticker]', params: { ticker: symbol } });

export default function HomeScreen() {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const { d, market, watch } = useApp();
  const [selected, setSelected] = useState(0);
  const [moverTab, setMoverTab] = useState<'Gainers' | 'Losers'>('Gainers');
  const [scrubbed, setScrubbed] = useState<number | null>(null); // chart index under the finger
  const ov = useApi<Overview>(`/market/overview?market=${market}`);
  const rows = useApi<ScreenerRow[]>(`/market/screener?market=${market}`);

  // other market: back to the first index
  useEffect(() => {
    setSelected(0);
    setScrubbed(null);
  }, [market]);

  const o = ov.data;
  if (!o) {
    return (
      <Screen header={<HomeHeader />}>
        <LoadState loading={ov.loading} error={ov.error} onRetry={ov.reload} />
      </Screen>
    );
  }

  const sentiment = o.sentiment;
  const word = sentiment.label === 'Bullish' ? 'Up' : sentiment.label === 'Bearish' ? 'Down' : 'Mixed';
  const index = o.idx[selected] ?? o.idx[0];
  const series = index.series.length > 1 ? index.series : [index.prev, index.price];
  // while dragging the chart, the header shows the value under the finger
  const shownPrice = scrubbed === null ? index.price : series[scrubbed];
  const total = o.breadth.adv + o.breadth.dec + o.breadth.unch;
  const movers = moverTab === 'Gainers' ? o.movers.g : o.movers.l;
  const tz = market === 'IN' ? 'Asia/Kolkata' : 'America/New_York';
  // 5 time labels under the chart
  const times = index.times.length > 4 ? [0, 0.25, 0.5, 0.75, 1].map((f) => index.times[Math.round(f * (index.times.length - 1))]) : [];
  const starred = Object.keys(watch).filter((sym) => watch[sym] && marketOf(sym) === market);
  const watchList = starred.length ? starred : (rows.data ?? []).slice(0, 6).map((r) => r.symbol);

  return (
    <Screen header={<HomeHeader />}>
      {/* hero: sentiment, headline, market status, index chips */}
      <Card glow style={s.hero}>
        <View style={[s.row, { paddingRight: 18 }]}>
          <Tag
            label={`${sentiment.label} · ${sentiment.score >= 0 ? '+' : '−'}${Math.round(Math.abs(sentiment.score) * 100)}/100`}
            tone={toneOf(sentiment.label)}
          />
          <Small style={{ fontFamily: fonts.semi, color: o.stale ? c.warn : c.mu2 }}>{o.stale ? 'Stale data' : 'Delayed data'}</Small>
        </View>
        <Text style={s.headline}>Markets are{'\n'}{word} Today</Text>
        <View style={s.status}>
          <View style={[s.statusDot, o.open && { backgroundColor: c.up }]} />
          <Small>
            {market === 'IN' ? 'NSE' : 'NYSE'} · {o.open ? 'Open' : 'Closed'} · {freshness(o.asOf, o.stale, market).replace(/^\w+ · /, '')}
          </Small>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: -20 }} contentContainerStyle={s.chipRow}>
          {o.idx.map((item, i) => (
            <Pressable
              key={item.name}
              onPress={() => {
                setSelected(i);
                setScrubbed(null);
              }}
              style={[s.indexChip, i === selected && s.indexChipOn]}
            >
              <Mono ticker={item.name} size={38} />
              <View style={{ gap: 2 }}>
                <Text style={s.indexName}>{item.name}</Text>
                <Chg value={(item.price / item.prev - 1) * 100} size={12} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      {/* quick actions */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <QuickAction label="Screener" icon={<SearchIcon color={c.prDeep} />} onPress={() => router.navigate('/screener')} />
        <QuickAction label="Sectors" icon={<PieIcon color={c.prDeep} />} onPress={() => router.navigate('/sectors')} />
        <QuickAction label="Trade" icon={<TradeIcon color={c.prDeep} />} onPress={() => openStock(o.movers.g[0]?.symbol ?? watchList[0])} />
      </View>

      {/* intraday chart of the selected index */}
      <Card pad style={{ paddingBottom: 12 }}>
        <View style={[s.row, { alignItems: 'flex-start' }]}>
          <View>
            <Label>{index.name} · Intraday</Label>
            <Text style={s.bigNumber}>{fmt(d, shownPrice)}</Text>
            <Chg value={(shownPrice / index.prev - 1) * 100} />
          </View>
          <Tag label={o.stale ? 'Stale' : 'Delayed'} />
        </View>
        <View style={{ marginTop: 8 }}>
          <AreaChart values={series} axis locale={d.loc} base={index.prev} tip={series.length - 1} format={(v) => fmt(d, v)} onScrub={setScrubbed} />
        </View>
        <View style={[s.row, { paddingTop: 6, paddingLeft: 40 }]}>
          {times.map((t) => (
            <Small key={t}>{new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: tz })}</Small>
          ))}
        </View>
      </Card>

      {/* watchlist (or large caps until something is starred) */}
      <View style={s.row}>
        <Text style={s.sectionTitle}>{starred.length ? 'Watchlist' : 'Large caps'}</Text>
        <PillButton onPress={() => router.navigate('/screener')} style={{ height: 36, paddingLeft: 14, paddingRight: 6 }}>
          <Text style={s.pillLabel}>See all</Text>
          <View style={s.pillArrow}>
            <ArrowRightIcon size={12} color="#fff" />
          </View>
        </PillButton>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18, marginTop: -6 }} contentContainerStyle={s.watchRow}>
        {watchList.map((sym) => (
          <WatchCard key={sym} symbol={sym} row={rows.data?.find((r) => r.symbol === sym)} />
        ))}
      </ScrollView>

      {/* market summary, written by the server from the numbers only */}
      <Card pad style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={s.sparkleTile}>
            <SparkleIcon size={17} color={c.pr} />
          </View>
          <CardTitle>Market summary</CardTitle>
        </View>
        <Text style={s.summary}>{o.summary}</Text>
        <Note>
          Built from Yahoo Finance data · {freshness(o.asOf, o.stale, market)}
          {sentiment.missing.length ? ' · news tone unavailable' : ''}
        </Note>
      </Card>

      {/* market breadth */}
      <Card pad style={{ gap: 14 }}>
        <View style={s.row}>
          <CardTitle>Market breadth</CardTitle>
          <Small>{total} large caps</Small>
        </View>
        <SegBar parts={[o.breadth.adv, o.breadth.unch, o.breadth.dec]} />
        <View style={{ flexDirection: 'row' }}>
          <Stat label="Advancing" value={String(o.breadth.adv)} color={c.up} />
          <Stat label="Declining" value={String(o.breadth.dec)} color={c.dn} />
          <Stat label="Above 20-DMA" value={`${o.breadth.above}%`} color={c.tx} />
        </View>
      </Card>

      {/* top movers */}
      <Card pad style={{ paddingBottom: 6 }}>
        <View style={[s.row, { marginBottom: 6 }]}>
          <CardTitle>Top movers</CardTitle>
          <Seg small options={['Gainers', 'Losers'] as const} value={moverTab} onChange={setMoverTab} />
        </View>
        {movers.map((mover, i) => (
          <Pressable key={mover.symbol} onPress={() => openStock(mover.symbol)} style={[s.listRow, i > 0 && s.listRowBorder]}>
            <Mono ticker={mover.t} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={s.rowName}>{mover.name}</Text>
              <Small>{mover.t}</Small>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.rowName}>{d.cur + fmt(d, mover.price)}</Text>
              <Chg value={mover.pct} size={12} />
            </View>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}

// One watchlist card. Uses the screener row when there is one, otherwise loads the stock.
function WatchCard({ symbol, row }: { symbol: string; row?: ScreenerRow }) {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const { d } = useApp();
  const st = useApi<StockData>(row ? null : `/market/stock/${encodeURIComponent(symbol)}`);
  const data = row ? { t: row.t, name: row.name, last: row.last, pct: row.pct, spark: row.spark } : st.data ? { ...st.data, spark: st.data.closes.slice(-24) } : null;
  if (!data) return null;
  return (
    <Pressable onPress={() => openStock(symbol)} style={({ pressed }) => [s.watchCard, pressed && { transform: [{ scale: 0.97 }] }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Mono ticker={data.t} size={38} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={s.watchName}>{data.name}</Text>
          <Small>{data.t}</Small>
        </View>
      </View>
      <View style={{ marginTop: 6, marginBottom: 2 }}>
        <Sparkline values={data.spark} color={data.pct >= 0 ? c.upC : c.dnC} label={d.cur + fmt(d, Math.max(...data.spark))} />
      </View>
      <Text style={s.watchPrice}>{d.cur + fmt(d, data.last)}</Text>
      <Chg value={data.pct} />
    </Pressable>
  );
}
// logo pill + name on the left, India / US switch and profile circle on the right
function HomeHeader() {
  const { c } = useTheme();
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 }}>
        <View style={{ width: 58, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 18px rgba(90,91,234,0.35)' }}>
          <Svg width={58} height={42} style={{ position: 'absolute' }}>
            <Defs>
              <RadialGradient id="logoPill" cx="30%" cy="20%" rx="69%" ry="71%" fx="30%" fy="20%">
                <Stop offset="0" stopColor="#9C9DFF" />
                <Stop offset="0.7" stopColor={c.pr} />
              </RadialGradient>
            </Defs>
            <Rect width={58} height={42} fill="url(#logoPill)" />
          </Svg>
          {/* wrapped in a View so it draws above the gradient */}
          <View>
            <TrendIcon size={24} color="#fff" />
          </View>
        </View>
        <Text numberOfLines={1} style={{ fontFamily: fonts.headSemi, fontSize: 21, letterSpacing: -0.42, color: c.tx, flexShrink: 1 }}>
          SidStocks
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <MarketSeg />
        <CircleButton size={44} label="Your journal" onPress={() => router.navigate('/journal')} style={{ overflow: 'hidden' }}>
          <Svg width={44} height={44} style={{ position: 'absolute' }}>
            <Defs>
              <LinearGradient id="avatarFill" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={c.lav} />
                <Stop offset="1" stopColor={c.pink} />
              </LinearGradient>
            </Defs>
            <Rect width={44} height={44} fill="url(#avatarFill)" />
          </Svg>
          <View>
            <UserIcon color={c.prDeep} />
          </View>
        </CircleButton>
      </View>
    </>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: ReactNode; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        height: 52,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.bd,
        backgroundColor: c.card,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Glow spots={quickGlow} />
      <Text style={{ fontSize: 14.5, fontFamily: fonts.semi, color: c.prDeep }}>{label}</Text>
      {icon}
    </Pressable>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Small>{label}</Small>
      <Text style={{ fontSize: 14, fontFamily: fonts.semi, color, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  ({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    hero: { paddingTop: 22, paddingBottom: 18, paddingLeft: 20 },
    headline: { fontFamily: fonts.headBold, fontSize: 38, lineHeight: 40, letterSpacing: -0.76, color: c.tx, marginTop: 14, marginBottom: 6 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.warn },
    chipRow: { gap: 10, paddingTop: 4, paddingBottom: 10, paddingLeft: 20, paddingRight: 18 },
    indexChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingLeft: 10,
      paddingRight: 14,
      borderRadius: 18,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.bd,
      boxShadow: c.shadow2,
    },
    indexChipOn: { borderColor: c.selBd, boxShadow: `0 0 0 3px rgba(90,91,234,0.12), ${c.shadow2}` },
    indexName: { fontSize: 14, fontFamily: fonts.semi, color: c.tx },
    bigNumber: { fontFamily: fonts.headBold, fontSize: 28, letterSpacing: -0.56, color: c.tx, marginTop: 2, fontVariant: ['tabular-nums'] },
    sectionTitle: { fontFamily: fonts.headSemi, fontSize: 20, letterSpacing: -0.4, color: c.tx },
    pillLabel: { fontSize: 13.5, fontFamily: fonts.semi, color: c.tx },
    pillArrow: { width: 22, height: 22, borderRadius: 11, backgroundColor: c.pr, alignItems: 'center', justifyContent: 'center' },
    watchRow: { gap: 10, paddingTop: 4, paddingBottom: 8, paddingHorizontal: 18 },
    watchCard: {
      width: 176,
      padding: 16,
      borderRadius: 24,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.bd,
      gap: 8,
      boxShadow: c.shadow,
    },
    watchName: { fontSize: 15, fontFamily: fonts.semi, color: c.tx },
    watchPrice: { fontFamily: fonts.headBold, fontSize: 24, letterSpacing: -0.48, color: c.tx, fontVariant: ['tabular-nums'] },
    sparkleTile: { width: 32, height: 32, borderRadius: 10, backgroundColor: c.lav, alignItems: 'center', justifyContent: 'center' },
    summary: { fontSize: 14.5, lineHeight: 23, fontFamily: fonts.regular, color: c.tx2 },
    listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    listRowBorder: { borderTopWidth: 1, borderTopColor: c.hair },
    rowName: { fontSize: 14.5, fontFamily: fonts.semi, color: c.tx, fontVariant: ['tabular-nums'] },
  }) as const;
