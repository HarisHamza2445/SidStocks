import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import { fonts } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Glow, GlowSpot } from './Glow';

const pillGlow: GlowSpot[] = [{ x: 0.3, y: 0, rx: 80, ry: 30, rgb: '110,112,255', alpha: 0.18, fade: 0.8 }];

type Props<T extends string> = {
  options: readonly T[];
  labels?: string[]; // text to show, if different from the option values
  value: T;
  onChange: (value: T) => void;
  small?: boolean; // compact version that only takes the width it needs
  style?: StyleProp<ViewStyle>;
};

// Segmented control. A pill slides under the active item.
export default function Seg<T extends string>({ options, labels, value, onChange, small, style }: Props<T>) {
  const { c } = useTheme();
  const [layouts, setLayouts] = useState<{ x: number; w: number }[]>([]);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const placed = useRef(false);

  const active = options.indexOf(value);
  const target = layouts[active];

  // move the pill whenever the active item or its position changes
  useEffect(() => {
    if (!target) return;
    const duration = placed.current ? 400 : 0; // no animation the first time
    placed.current = true;
    const config = { duration, easing: Easing.out(Easing.cubic), useNativeDriver: false };
    Animated.parallel([
      Animated.timing(pillX, { toValue: target.x, ...config }),
      Animated.timing(pillW, { toValue: target.w, ...config }),
    ]).start();
  }, [target?.x, target?.w]);

  const pad = small ? 4 : 5;
  const height = small ? 32 : 40;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          padding: pad,
          borderRadius: small ? 14 : 18,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.bd,
        },
        small && { alignSelf: 'flex-start' },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: pad,
          left: 0,
          height,
          width: pillW,
          transform: [{ translateX: pillX }],
          borderRadius: small ? 10 : 13,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.bd,
          boxShadow: '0 2px 10px rgba(30,32,90,0.10)',
          overflow: 'hidden',
        }}
      >
        <Glow spots={pillGlow} />
      </Animated.View>
      {options.map((option, i) => {
        const on = i === active;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              setLayouts((prev) => {
                const next = [...prev];
                next[i] = { x, w: width };
                return next;
              });
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[{ height, alignItems: 'center', justifyContent: 'center' }, small ? { paddingHorizontal: 12 } : { flex: 1 }]}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: small ? 12.5 : 13.5, fontFamily: on ? fonts.bold : fonts.medium, color: on ? c.pr : c.mu }}
            >
              {labels ? labels[i] : option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
