import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { fonts } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Bar } from '../data/sample';

// Charts are drawn in a fixed coordinate box (like the prototype) and scaled to the card width.

// "nice" round numbers for the price axis
function niceTicks(min: number, max: number, count: number) {
  const span = max - min;
  let step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = span / count / step;
  step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v);
  return out;
}

function axisLabel(value: number, locale: string) {
  return value >= 1000 ? Math.round(value).toLocaleString(locale) : value.toFixed(value < 10 ? 1 : 0);
}

type AreaProps = {
  values: number[];
  format: (value: number) => string; // text inside the tooltip pill
  width?: number;
  height?: number;
  color?: string;
  axis?: boolean; // price labels on the left
  locale?: string;
  base?: number; // dashed line, e.g. previous close
  tip?: number; // where the tooltip starts. Default: the highest point.
  onScrub?: (index: number | null) => void; // index while dragging, null on release
};

// Line + soft area fill + a tooltip pill you can drag across the chart.
export function AreaChart({ values, format, width = 354, height = 200, color, axis, locale = 'en-US', base, tip, onScrub }: AreaProps) {
  const { c } = useTheme();
  const col = color ?? c.pr;
  const [scrub, setScrub] = useState<number | null>(null);
  const layoutWidth = useRef(0);

  // new data (other stock, other range): tooltip goes back to its start position
  useEffect(() => setScrub(null), [values]);

  const padL = axis ? 40 : 6;
  const padT = 34;
  const padB = 8;
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (base !== undefined) {
    min = Math.min(min, base);
    max = Math.max(max, base);
  }
  let range = max - min || 1;
  min -= range * 0.06;
  max += range * 0.06;
  range = max - min;

  const X = (i: number) => padL + (i * (width - padL - 6)) / (values.length - 1);
  const Y = (v: number) => padT + ((max - v) / range) * (height - padT - padB);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');

  // tooltip position
  const defaultTip = tip ?? values.indexOf(Math.max(...values));
  const ti = Math.max(0, Math.min(values.length - 1, scrub ?? defaultTip));
  const tx = X(ti);
  const ty = Y(values[ti]);
  const text = format(values[ti]);
  const pillW = Math.max(58, text.length * 7.2 + 20);
  const pillX = Math.max(pillW / 2, Math.min(width - pillW / 2, tx));
  const pillY = Math.max(0, ty - 40);

  // the pan handlers are created once, so they read the latest values from a ref
  const latest = useRef({ count: values.length, onScrub });
  latest.current = { count: values.length, onScrub };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => move(e.nativeEvent.locationX),
      onPanResponderMove: (e) => move(e.nativeEvent.locationX),
      onPanResponderRelease: () => latest.current.onScrub?.(null),
      onPanResponderTerminate: () => latest.current.onScrub?.(null),
    }),
  ).current;

  function move(touchX: number) {
    if (!layoutWidth.current) return;
    const x = (touchX / layoutWidth.current) * width;
    const count = latest.current.count;
    const index = Math.max(0, Math.min(count - 1, Math.round(((x - padL) / (width - padL - 6)) * (count - 1))));
    setScrub(index);
    latest.current.onScrub?.(index);
  }

  const gradientId = `area-${col.replace('#', '')}`;

  return (
    <View style={{ width: '100%', aspectRatio: width / height }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={col} stopOpacity={0.22} />
            <Stop offset="1" stopColor={col} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {axis &&
          niceTicks(min, max, 4).map((tick) => {
            const y = Y(tick);
            if (y < padT - 4 || y > height - 4) return null;
            return (
              <SvgText key={tick} x={0} y={y + 4} fontSize={11.5} fill={c.mu2} fontFamily={fonts.regular}>
                {axisLabel(tick, locale)}
              </SvgText>
            );
          })}
        {base !== undefined && <Line x1={padL} x2={width} y1={Y(base)} y2={Y(base)} stroke={c.base} strokeDasharray={[3, 4]} />}

        <Path d={`${line} L ${X(values.length - 1).toFixed(1)} ${height} L ${padL} ${height} Z`} fill={`url(#${gradientId})`} />
        <Path d={line} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round" />

        <Line x1={tx} x2={tx} y1={ty + 6} y2={height} stroke={c.mu2} strokeWidth={1} />
        <Circle cx={tx} cy={ty} r={5.5} fill={col} stroke={c.card} strokeWidth={2.5} />
        <Rect x={pillX - pillW / 2} y={pillY} width={pillW} height={28} rx={14} fill={c.tx} />
        <SvgText x={pillX} y={pillY + 18.5} textAnchor="middle" fontSize={11.5} fill={c.tipTx} fontFamily={fonts.semi}>
          {text}
        </SvgText>
      </Svg>

      {/* clear layer on top that catches the drag */}
      <View
        style={StyleSheet.absoluteFill}
        onLayout={(e) => (layoutWidth.current = e.nativeEvent.layout.width)}
        accessibilityLabel="Price chart. Drag to read values."
        {...pan.panHandlers}
      />
    </View>
  );
}

// Small line for watchlist cards, with a pill at the period high.
export function Sparkline({ values, color, label, width = 144, height = 72 }: { values: number[]; color: string; label: string; width?: number; height?: number }) {
  const { c } = useTheme();
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padT = 26;
  const X = (i: number) => 4 + (i * (width - 8)) / (values.length - 1);
  const Y = (v: number) => padT + ((max - v) / range) * (height - padT - 4);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');

  const hi = values.indexOf(max);
  const pillW = label.length * 6.4 + 16;
  const pillX = Math.max(pillW / 2, Math.min(width - pillW / 2, X(hi)));

  return (
    <Svg width={width} height={height}>
      <Path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={X(hi)} cy={Y(max)} r={4} fill={color} stroke={c.card} strokeWidth={2} />
      <Rect x={pillX - pillW / 2} y={0} width={pillW} height={22} rx={11} fill={c.tx} />
      <SvgText x={pillX} y={15} textAnchor="middle" fontSize={10.5} fill={c.tipTx} fontFamily={fonts.semi}>
        {label}
      </SvgText>
    </Svg>
  );
}

// Candlesticks with the 20 EMA line on top.
export function CandleChart({ bars, ema, locale = 'en-US' }: { bars: Bar[]; ema: number[]; locale?: string }) {
  const { c } = useTheme();
  const W = 354;
  const H = 210;
  const padL = 40;

  let max = Math.max(...bars.map((b) => b.h));
  let min = Math.min(...bars.map((b) => b.l));
  let range = max - min;
  max += range * 0.05;
  min -= range * 0.05;
  range = max - min;

  const y = (price: number) => 10 + ((max - price) / range) * (H - 20);
  const slot = (W - padL - 4) / bars.length;
  const bodyWidth = Math.max(2, slot * 0.6);
  const emaLine = ema.map((v, i) => `${i ? 'L' : 'M'}${(padL + i * slot + slot / 2).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  return (
    <View style={{ width: '100%', aspectRatio: W / H }} accessibilityLabel="Candlestick chart with 20-day EMA">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
        {niceTicks(min, max, 4).map((tick) => (
          <G key={tick}>
            <SvgText x={0} y={y(tick) + 4} fontSize={11.5} fill={c.mu2} fontFamily={fonts.regular}>
              {axisLabel(tick, locale)}
            </SvgText>
            <Line x1={padL} x2={W} y1={y(tick)} y2={y(tick)} stroke={c.track} />
          </G>
        ))}
        {bars.map((bar, i) => {
          const centre = padL + i * slot + slot / 2;
          const color = bar.c >= bar.o ? c.upC : c.dnC;
          const top = y(Math.max(bar.o, bar.c));
          return (
            <G key={i}>
              <Line x1={centre} x2={centre} y1={y(bar.h)} y2={y(bar.l)} stroke={color} />
              <Rect x={centre - bodyWidth / 2} y={top} width={bodyWidth} height={Math.max(1, y(Math.min(bar.o, bar.c)) - top)} rx={1} fill={color} />
            </G>
          );
        })}
        <Path d={emaLine} fill="none" stroke={c.pr} strokeWidth={1.8} />
      </Svg>
    </View>
  );
}
