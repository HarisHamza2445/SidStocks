import { useEffect, useRef, ReactNode } from 'react';
import { Animated, Easing, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { fonts } from '../constants/theme';
import { pct } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { DiagonalArrow } from './Icons';

// Small building blocks used on every screen.

// ---- Tag: rounded label (Bullish / Bearish / neutral) ----

export type Tone = 'bull' | 'bear' | 'neu';

// Bullish, Long and Buy are green. Bearish, Short and Sell are red.
export function toneOf(word: string): Tone {
  if (word === 'Bullish' || word === 'Long' || word === 'Buy') return 'bull';
  if (word === 'Bearish' || word === 'Short' || word === 'Sell') return 'bear';
  return 'neu';
}

export function Tag({ label, tone = 'neu', small }: { label: string; tone?: Tone; small?: boolean }) {
  const { c } = useTheme();
  const bg = tone === 'bull' ? c.upBg : tone === 'bear' ? c.dnBg : c.neutralBg;
  const color = tone === 'bull' ? c.up : tone === 'bear' ? c.dn : c.tx2;
  return (
    <View style={{ height: small ? 20 : 26, paddingHorizontal: 10, borderRadius: 999, backgroundColor: bg, justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: small ? 10.5 : 12, fontFamily: fonts.semi, color, fontVariant: ['tabular-nums'] }}>{label}</Text>
    </View>
  );
}

// ---- Chg: "+0.64%" with a small arrow circle. Sign and arrow, never colour alone. ----

export function Chg({ value, size = 12.5 }: { value: number; size?: number }) {
  const { c } = useTheme();
  const color = value >= 0 ? c.up : c.dn;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Text style={{ fontSize: size, fontFamily: fonts.semi, color, fontVariant: ['tabular-nums'] }}>{pct(value)}</Text>
      <View style={{ width: 15, height: 15, borderRadius: 8, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
        <DiagonalArrow up={value >= 0} />
      </View>
    </View>
  );
}

// ---- Mono: coloured circle with the ticker's letters. No real company logos. ----

const MONO_COLORS = ['#3B4070', '#E0453A', '#5A5BEA', '#14A06B', '#EF7A1A', '#0E8FD6', '#9B47E6', '#C99A06', '#E2457E', '#2F6BFF'];
const INDEX_LABELS: Record<string, string> = { 'NIFTY 50': 'N50', SENSEX: 'SX', 'BANK NIFTY': 'BNF', 'S&P 500': 'SPX', NASDAQ: 'NDQ', 'DOW JONES': 'DJI' };

export function Mono({ ticker, size = 40 }: { ticker: string; size?: number }) {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash * 31 + ticker.charCodeAt(i)) % 997;
  const label = INDEX_LABELS[ticker] ?? ticker.replace(/[^A-Z0-9]/g, '').slice(0, ticker.length > 6 ? 2 : 1);

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: MONO_COLORS[hash % MONO_COLORS.length], alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFFFFF', fontFamily: fonts.headBold, fontSize: Math.round(size * 0.34), letterSpacing: -0.3 }}>{label}</Text>
    </View>
  );
}

// ---- Ring: progress circle with a label in the middle ----

export function Ring({ value, max, color, size, label }: { value: number; max: number; color: string; size: number; label: string }) {
  const { c } = useTheme();
  const r = size / 2 - 4;
  const length = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.track} strokeWidth={5} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={[length]}
          strokeDashoffset={length * (1 - value / max)}
        />
      </Svg>
      <Text style={{ fontSize: size > 50 ? 14 : 11.5, fontFamily: fonts.bold, color: c.tx, fontVariant: ['tabular-nums'] }}>{label}</Text>
    </View>
  );
}

// ---- SegBar: thin bar split into green / grey / red parts ----

export function SegBar({ parts, height = 10 }: { parts: [number, number, number]; height?: number }) {
  const { c } = useTheme();
  const colors = [c.upC, c.neuSeg, c.dnC];
  return (
    <View style={{ flexDirection: 'row', height, gap: height > 8 ? 4 : 3 }}>
      {parts.map((part, i) => (
        <View key={i} style={{ flex: part, borderRadius: height / 2 + 1, backgroundColor: colors[i] }} />
      ))}
    </View>
  );
}

// ---- FadeIn: card slides up and fades in. i = order, for the stagger. ----

export function FadeIn({ i = 0, children, style }: { i?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 600, delay: i * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}

// ---- Text shortcuts used all over ----

// 12.5px grey label
export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontSize: 12.5, fontFamily: fonts.medium, color: c.mu }, style]}>{children}</Text>;
}

// 11.5px lighter caption
export function Small({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontSize: 11.5, fontFamily: fonts.regular, color: c.mu2, fontVariant: ['tabular-nums'] }, style]}>{children}</Text>;
}

// 15px bold card title
export function CardTitle({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ fontSize: 15, fontFamily: fonts.bold, color: c.tx }}>{children}</Text>;
}

// 11.5px footnote / disclaimer
export function Note({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Text style={[{ fontSize: 11.5, lineHeight: 17, fontFamily: fonts.regular, color: c.mu2 }, style]}>{children}</Text>;
}
