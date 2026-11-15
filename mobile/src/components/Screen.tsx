import { Children, ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fonts } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { FadeIn, Label } from './Bits';
import Seg from './Seg';

// India / US switch shown in screen headers.
export function MarketSeg() {
  const { market, setMarket } = useApp();
  return <Seg small options={['IN', 'US'] as const} value={market} onChange={setMarket} />;
}

type Props = {
  title?: string;
  subtitle?: string;
  header?: ReactNode; // custom header row (Home, Stock Detail) instead of title + subtitle
  footer?: ReactNode; // fixed bar under the scroll area (Stock Detail buy / sell)
  children: ReactNode;
};

// Wrapper for every screen: safe area, header row, scrolling content.
// Each child slides in one after the other.
export default function Screen({ title, subtitle, header, footer, children }: Props) {
  const { c } = useTheme();
  const { d } = useApp();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <View style={{ height: 60, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        {header ?? (
          <>
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontFamily: fonts.headBold, fontSize: 28, lineHeight: 31, letterSpacing: -0.56, color: c.tx }}>{title}</Text>
              <Label style={{ marginTop: 2 }}>
                {subtitle} · {d.IN ? 'India' : 'US'}
              </Label>
            </View>
            <MarketSeg />
          </>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: 24, gap: 16 }}
      >
        {Children.map(children, (child, i) => (child ? <FadeIn i={i}>{child}</FadeIn> : null))}
      </ScrollView>

      {footer}
    </SafeAreaView>
  );
}
