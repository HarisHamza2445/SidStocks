import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { cardGlow, Glow } from './Glow';

type Props = {
  children: ReactNode;
  glow?: boolean; // hero-style card with the lavender glow
  pad?: boolean; // standard 18px padding
  style?: StyleProp<ViewStyle>;
};

export default function Card({ children, glow, pad, style }: Props) {
  const { c } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: c.card,
          borderColor: c.bd,
          borderWidth: 1,
          borderRadius: 24,
          boxShadow: c.shadow,
          overflow: 'hidden',
        },
        pad && { padding: 18 },
        style,
      ]}
    >
      {glow && <Glow spots={cardGlow} />}
      {children}
    </View>
  );
}
