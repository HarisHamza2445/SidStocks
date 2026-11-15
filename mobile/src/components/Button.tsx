import { ReactNode } from 'react';
import { Pressable, StyleProp, Text, ViewStyle } from 'react-native';
import { fonts } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { buttonGlow, Glow, VerticalGradient } from './Glow';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'white';
  style?: StyleProp<ViewStyle>;
};

// Big 56px button. primary = purple gradient, white = card colour with a glow.
export default function Button({ label, onPress, variant = 'primary', style }: ButtonProps) {
  const { c } = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: 56,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        primary
          ? { boxShadow: '0 12px 26px rgba(90,91,234,0.35)' }
          : { backgroundColor: c.card, borderWidth: 1, borderColor: c.bd, boxShadow: '0 6px 18px rgba(15,17,35,0.05)' },
        style,
      ]}
    >
      {primary ? <VerticalGradient from="#6D6EF6" to="#5051E4" /> : <Glow spots={buttonGlow} />}
      <Text style={{ fontFamily: fonts.semi, fontSize: 16, color: primary ? '#FFFFFF' : c.tx }}>{label}</Text>
    </Pressable>
  );
}

type CircleProps = {
  children: ReactNode;
  onPress: () => void;
  label: string; // for screen readers
  size?: number;
  style?: StyleProp<ViewStyle>;
};

// Round outline button: back, star, close, quantity +/-.
export function CircleButton({ children, onPress, label, size = 48, style }: CircleProps) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: c.bd2,
          backgroundColor: c.card,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

// Outline pill: "See all", "Open Screener".
export function PillButton({ children, onPress, style }: { children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: 40,
          paddingHorizontal: 16,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: c.bd2,
          backgroundColor: c.card,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
