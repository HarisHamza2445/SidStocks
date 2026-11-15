import { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { CardTitle, Note, Small } from '../../components/Bits';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import Seg from '../../components/Seg';
import { fonts } from '../../constants/theme';
import LoadState from '../../components/LoadState';
import { pct, useApp } from '../../context/AppContext';
import { freshness, SectorsData, useApi } from '../../lib/api';
import { useTheme } from '../../context/ThemeContext';

const periods = ['1D', '5D', '1M'] as const;
type Period = (typeof periods)[number];
const field = { '1D': 'd1', '5D': 'd5', '1M': 'm1' } as const; // which return each period reads

export default function SectorsScreen() {
  const { c } = useTheme();
  const { market } = useApp();
  const [period, setPeriod] = useState<Period>('1M');
  const api = useApi<SectorsData>(`/market/sectors?market=${market}`);
  const d = api.data;
  if (!d || !d.sectors.length) {
    return (
      <Screen title="Sectors" subtitle="Rotation & strength">
        <LoadState loading={api.loading} error={api.error ?? 'No sector data.'} onRetry={api.reload} />
      </Screen>
    );
  }

  const key = field[period];
  const sorted = [...d.sectors].sort((a, b) => b[key] - a[key]);
  const biggest = Math.max(...sorted.map((s) => Math.abs(s[key]))) || 1;
  const rotColor = { Leading: c.up, Improving: c.info, Weakening: c.warn, Lagging: c.dn };

  // rotation map scale: furthest sector sits a little inside the edge
  const maxX = Math.max(...d.sectors.map((s) => Math.abs(s.rx))) * 1.2;
  const maxY = Math.max(...d.sectors.map((s) => Math.abs(s.ry))) * 1.2;
  const quadrantLabel = { fontSize: 10, fontFamily: fonts.bold, letterSpacing: 0.8 };

  return (
    <Screen title="Sectors" subtitle="Rotation & strength">
      <Seg options={periods} value={period} onChange={setPeriod} />

      <Card glow pad>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <CardTitle>Rotation map</CardTitle>
          <Small>vs {d.bench.name}</Small>
        </View>
        <View style={{ width: '100%', aspectRatio: 320 / 230 }} accessibilityLabel="Relative rotation map of sectors">
          <Svg width="100%" height="100%" viewBox="0 0 320 230">
            <Rect x={160} y={0} width={160} height={115} fill={c.qL} opacity={c.qOp} />
            <Rect x={0} y={0} width={160} height={115} fill={c.qI} opacity={c.qOp} />
            <Rect x={0} y={115} width={160} height={115} fill={c.qG} opacity={c.qOp} />
            <Rect x={160} y={115} width={160} height={115} fill={c.qW} opacity={c.qOp} />
            <Line x1={160} y1={0} x2={160} y2={230} stroke={c.neuSeg} />
            <Line x1={0} y1={115} x2={320} y2={115} stroke={c.neuSeg} />
            <SvgText x={312} y={16} textAnchor="end" fill={c.up} {...quadrantLabel}>LEADING</SvgText>
            <SvgText x={8} y={16} fill={c.info} {...quadrantLabel}>IMPROVING</SvgText>
            <SvgText x={8} y={222} fill={c.dn} {...quadrantLabel}>LAGGING</SvgText>
            <SvgText x={312} y={222} textAnchor="end" fill={c.warn} {...quadrantLabel}>WEAKENING</SvgText>
            {d.sectors.map((sector) => {
              const x = 160 + (sector.rx / maxX) * 145;
              const y = 115 - (sector.ry / maxY) * 100;
              return (
                <G key={sector.short}>
                  <Circle cx={x} cy={y} r={12} fill={rotColor[sector.rot]} opacity={0.14} />
                  <Circle cx={x} cy={y} r={5} fill={rotColor[sector.rot]} stroke={c.card} strokeWidth={2} />
                  <SvgText x={x} y={y - 11} textAnchor="middle" fill={c.tx2} fontSize={9.5} fontFamily={fonts.semi}>
                    {sector.short}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </View>
        <Note style={{ marginTop: 8 }}>
          Across: 1-month return vs benchmark. Up: 5-day return vs benchmark. {freshness(d.asOf, d.stale, market)}
        </Note>
      </Card>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Card style={{ flex: 1, padding: 14 }}>
          <Small style={{ fontFamily: fonts.semi, color: c.up }}>Strongest · {period}</Small>
          <Text style={{ fontFamily: fonts.semi, fontSize: 15, color: c.tx, marginTop: 4 }}>
            {sorted.slice(0, 2).map((s) => s.short).join(', ')}
          </Text>
        </Card>
        <Card style={{ flex: 1, padding: 14 }}>
          <Small style={{ fontFamily: fonts.semi, color: c.dn }}>Weakest · {period}</Small>
          <Text style={{ fontFamily: fonts.semi, fontSize: 15, color: c.tx, marginTop: 4 }}>
            {sorted.slice(-2).reverse().map((s) => s.short).join(', ')}
          </Text>
        </Card>
      </View>

      <Card style={{ paddingVertical: 6, paddingHorizontal: 16 }}>
        {sorted.map((sector, i) => {
          const value = sector[key];
          const up = value >= 0;
          return (
            <View
              key={sector.short}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.hair }]}
            >
              <Text style={{ width: 18, fontSize: 13, fontFamily: fonts.semi, color: c.mu2, fontVariant: ['tabular-nums'] }}>{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 14.5, fontFamily: fonts.semi, color: c.tx }}>{sector.name}</Text>
                <Text style={{ fontSize: 11.5, fontFamily: fonts.semi, color: rotColor[sector.rot] }}>{sector.rot}</Text>
              </View>
              {/* bar grows right from the centre for gains, left for losses */}
              <View style={{ width: 90, height: 8, borderRadius: 4, backgroundColor: c.track }}>
                <View style={{ position: 'absolute', left: '50%', top: -4, width: 1, height: 16, backgroundColor: c.base }} />
                <View
                  style={[
                    { position: 'absolute', top: 0, height: 8, borderRadius: 4, width: `${(Math.abs(value) / biggest) * 50}%`, backgroundColor: up ? c.upC : c.dnC },
                    up ? { left: '50%' } : { right: '50%' },
                  ]}
                />
              </View>
              <Text style={{ width: 62, textAlign: 'right', fontSize: 13.5, fontFamily: fonts.semi, color: up ? c.up : c.dn, fontVariant: ['tabular-nums'] }}>
                {pct(value)}
              </Text>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
