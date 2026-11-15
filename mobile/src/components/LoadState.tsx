import { ActivityIndicator, Text, View } from 'react-native';
import { fonts } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { Label } from './Bits';
import { PillButton } from './Button';
import Card from './Card';

// Loading spinner or error card with a Retry button. Shown while data is not ready.
export default function LoadState({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  const { c } = useTheme();
  if (loading) {
    return (
      <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
        <ActivityIndicator color={c.pr} />
        <Label>Loading market data…</Label>
      </View>
    );
  }
  return (
    <Card pad style={{ alignItems: 'center', gap: 10, paddingVertical: 28 }}>
      <Text style={{ fontFamily: fonts.headSemi, fontSize: 17, color: c.tx }}>Data unavailable</Text>
      <Label style={{ textAlign: 'center', lineHeight: 19 }}>{error}</Label>
      <PillButton onPress={onRetry} style={{ marginTop: 4 }}>
        <Text style={{ fontSize: 13.5, fontFamily: fonts.semi, color: c.tx }}>Retry</Text>
      </PillButton>
    </Card>
  );
}
