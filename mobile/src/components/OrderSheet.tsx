import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, fonts } from '../constants/theme';
import { fmt, money, useApp } from '../context/AppContext';
import { useStyles, useTheme } from '../context/ThemeContext';
import { getData, Side } from '../data/sample';
import { StockData } from '../lib/api';
import { Label, Mono, Note, Small } from './Bits';
import { CircleButton } from './Button';
import { VerticalGradient } from './Glow';
import { ArrowRightIcon, CloseIcon } from './Icons';
import Seg from './Seg';

type Props = {
  stock: StockData;
  side: Side | null; // null = sheet closed
  onClose: () => void;
};

const KNOB = 64; // slider knob slot width

// Paper order bottom sheet: Buy / Sell, quantity, summary, slide to confirm.
export default function OrderSheet({ stock, side: startSide, onClose }: Props) {
  const { c } = useTheme();
  const s = useStyles(makeStyles);
  const { addTrade, showToast } = useApp();
  const d = getData(stock.market);
  const [side, setSide] = useState<Side>('Buy');
  const [qty, setQty] = useState(10);
  const [filled, setFilled] = useState(false);
  const slideUp = useRef(new Animated.Value(0)).current;

  // every time the sheet opens: reset it and slide it up
  useEffect(() => {
    if (!startSide) return;
    setSide(startSide);
    setQty(stock.setup ? stock.setup.qty : 10);
    setFilled(false);
    slideUp.setValue(0);
    Animated.timing(slideUp, { toValue: 1, duration: 450, easing: Easing.out(Easing.exp), useNativeDriver: true }).start();
  }, [startSide]);

  const setup = stock.setup;
  const stop = setup ? setup.stop : stock.last * (side === 'Buy' ? 0.95 : 1.05);
  const risk = Math.abs(stock.last - stop) * qty;
  const step = qty >= 100 ? 10 : 1;

  async function confirm() {
    if (filled) return;
    // use the setup's stop when the order is in the setup's direction, else 1.5 ATR
    const withSetup = setup && (side === 'Buy') === (setup.dir === 'Long');
    const orderStop = withSetup ? setup.stop : side === 'Buy' ? stock.last - 1.5 * stock.atr : stock.last + 1.5 * stock.atr;
    setFilled(true);
    const ok = await addTrade({ symbol: stock.symbol, side, qty, entry: stock.last, stop: orderStop, setup: stock.pattern });
    if (!ok) {
      setFilled(false);
      return;
    }
    setTimeout(() => {
      onClose();
      showToast(`Paper order filled · ${side.toUpperCase()} ${fmt(d, qty, 0)} ${stock.t}`);
    }, 1500);
  }

  const summary: [string, string, string?][] = [
    ['Order value', money(d, stock.last * qty)],
    ['Stop-loss', d.cur + fmt(d, stop), c.dn],
    ['Risk if stopped', money(d, risk)],
    ['Of paper balance', ((risk / d.balance) * 100).toFixed(2) + '%'],
  ];

  return (
    <Modal visible={!!startSide} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.wrap}>
        <Pressable style={s.backdrop} onPress={() => !filled && onClose()} accessibilityLabel="Close order sheet" />
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideUp.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }) }] }]}>
          <View style={s.handle} />

          <View style={s.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Mono ticker={stock.t} size={44} />
              <View>
                <Text style={s.eyebrow}>PAPER ORDER</Text>
                <Text style={s.title}>
                  {stock.t} <Text style={s.titlePrice}>{d.cur + fmt(d, stock.last)}</Text>
                </Text>
              </View>
            </View>
            <CircleButton size={44} label="Close order sheet" onPress={onClose}>
              <CloseIcon size={18} color={c.tx} />
            </CircleButton>
          </View>

          <Seg options={['Buy', 'Sell'] as const} value={side} onChange={setSide} />

          <View style={s.row}>
            <Text style={{ fontSize: 15, fontFamily: fonts.medium, color: c.tx }}>Quantity</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CircleButton size={44} label="Decrease quantity" onPress={() => setQty(Math.max(1, qty - step))}>
                <Text style={s.stepper}>−</Text>
              </CircleButton>
              <Text style={s.qty}>{fmt(d, qty, 0)}</Text>
              <CircleButton size={44} label="Increase quantity" onPress={() => setQty(qty + step)}>
                <Text style={s.stepper}>+</Text>
              </CircleButton>
            </View>
          </View>

          <View style={s.summary}>
            {summary.map(([label, value, color], i) => (
              <View key={label} style={[s.row, { paddingVertical: 11 }, i > 0 && { borderTopWidth: 1, borderTopColor: c.bd }]}>
                <Label style={{ fontSize: 14 }}>{label}</Label>
                <Text style={{ fontSize: 14, fontFamily: fonts.bold, color: color ?? c.tx, fontVariant: ['tabular-nums'] }}>{value}</Text>
              </View>
            ))}
          </View>

          <SlideToConfirm key={`${side}-${String(!!startSide)}`} label={`Slide to ${side.toLowerCase()} ${fmt(d, qty, 0)} (paper)`} onConfirm={confirm} />

          <Note style={{ textAlign: 'center' }}>Simulated fill at the last price. No real order is sent to any broker.</Note>

          {filled && (
            <View style={s.success}>
              <Svg width={96} height={96} viewBox="0 0 96 96">
                <Circle cx={48} cy={48} r={42} fill={c.qL} />
                <Circle cx={48} cy={48} r={42} fill="none" stroke={c.upC} strokeWidth={4} />
                <Path d="M30 49 L43 62 L67 36" fill="none" stroke={c.up} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={s.successTitle}>Order filled</Text>
              <Small style={{ fontSize: 12.5, color: c.mu }}>
                {side.toUpperCase()} {fmt(d, qty, 0)} {stock.t} @ {d.cur + fmt(d, stock.last)}
              </Small>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

// Drag the knob past 85% to confirm. Tapping the knob also confirms (accessibility).
function SlideToConfirm({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const s = useStyles(makeStyles);
  const x = useRef(new Animated.Value(0)).current;
  const max = useRef(0); // how far the knob can travel
  const latest = useRef(onConfirm);
  latest.current = onConfirm;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => x.setValue(Math.max(0, Math.min(max.current, g.dx))),
      onPanResponderRelease: (_, g) => {
        const tapped = Math.abs(g.dx) < 3;
        if (tapped || g.dx > max.current * 0.85) {
          Animated.timing(x, { toValue: max.current, duration: 150, useNativeDriver: false }).start();
          latest.current();
        } else {
          Animated.spring(x, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    }),
  ).current;

  return (
    <View style={s.slider} onLayout={(e) => (max.current = e.nativeEvent.layout.width - KNOB - 2)}>
      <Animated.View style={[s.sliderFill, { width: Animated.add(x, KNOB) }]} />
      <View style={s.sliderTextWrap}>
        <Text style={s.sliderText}>{label}</Text>
      </View>
      <Animated.View
        style={[s.knob, { transform: [{ translateX: x }] }]}
        accessibilityRole="button"
        accessibilityLabel="Confirm paper order. Slide right, or tap."
        {...pan.panHandlers}
      >
        <VerticalGradient from="#6D6EF6" to="#5051E4" />
        <View>
          <ArrowRightIcon size={22} color="#fff" />
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (c: Colors) =>
  StyleSheet.create({
    wrap: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,17,35,0.38)' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 40,
      gap: 16,
      overflow: 'hidden',
    },
    handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: c.bd2, alignSelf: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    eyebrow: { fontSize: 11.5, fontFamily: fonts.bold, letterSpacing: 0.5, color: c.pr },
    title: { fontFamily: fonts.headSemi, fontSize: 20, letterSpacing: -0.4, color: c.tx },
    titlePrice: { fontFamily: fonts.headMedium, fontSize: 16, color: c.mu },
    stepper: { fontSize: 20, fontFamily: fonts.medium, color: c.tx },
    qty: { minWidth: 76, textAlign: 'center', fontFamily: fonts.headBold, fontSize: 22, color: c.tx, fontVariant: ['tabular-nums'] },
    summary: { backgroundColor: c.surf2, borderRadius: 18, paddingVertical: 4, paddingHorizontal: 16 },
    slider: { height: 64, borderRadius: 20, backgroundColor: c.track2, borderWidth: 1, borderColor: c.bd, overflow: 'hidden' },
    sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(90,91,234,0.22)' },
    sliderTextWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
    sliderText: { fontSize: 14.5, fontFamily: fonts.semi, color: c.prDeep },
    knob: {
      position: 'absolute',
      left: 3,
      top: 3,
      width: 56,
      height: 56,
      borderRadius: 16,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 8px 20px rgba(90,91,234,0.4)',
    },
    success: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center', gap: 12 },
    successTitle: { fontFamily: fonts.headBold, fontSize: 22, color: c.tx },
  });
