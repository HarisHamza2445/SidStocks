import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { FadeIn } from '../components/Bits';
import Button from '../components/Button';
import { fonts } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

// Welcome screen. Always uses its own dark artwork, whatever the theme.
export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();

  // already logged in: go straight to the app
  if (loading) return <View style={styles.screen} />;
  if (session) return <Redirect href="/home" />;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* background: near-black at the top fading to indigo, with soft vertical streaks */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="welcomeBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0B0B10" />
            <Stop offset="0.38" stopColor="#141533" />
            <Stop offset="0.78" stopColor="#4B4CD6" />
            <Stop offset="1" stopColor="#6566EE" />
          </LinearGradient>
          <LinearGradient id="welcomeStreak" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#AAACFF" stopOpacity={0} />
            <Stop offset="1" stopColor="#AAACFF" stopOpacity={0.16} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#welcomeBg)" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect key={i} x={34 + i * 96} y="0" width={28} height="100%" fill="url(#welcomeStreak)" />
        ))}
      </Svg>

      <View style={[styles.logo, { top: insets.top + 24 }]}>
        <Svg width={30} height={30} viewBox="0 0 32 32">
          <Rect width={32} height={32} rx={10} fill="#fff" fillOpacity={0.14} />
          <Path d="M8 21l5.5-6 4 3.5L24 11" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={styles.logoText}>SidStocks</Text>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
        <FadeIn i={2}>
          <Text style={styles.h1}>Read the Market</Text>
        </FadeIn>
        <FadeIn i={4}>
          <Text style={styles.h2}>Trade with a plan</Text>
        </FadeIn>
        <FadeIn i={6}>
          <Text style={styles.text}>
            Patterns, sector rotation and news sentiment for NSE, BSE and US stocks, with a paper-trading journal.
          </Text>
        </FadeIn>
        <FadeIn i={8} style={styles.buttons}>
          <Button variant="white" label="Log in" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/auth', params: { mode: 'login' } })} />
          <Button variant="white" label="Register" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/auth', params: { mode: 'register' } })} />
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0B0B10' },
  logo: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.9 },
  logoText: { fontFamily: fonts.headSemi, fontSize: 18, color: '#FFFFFF' },
  content: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, alignItems: 'center' },
  h1: { fontFamily: fonts.headBold, fontSize: 46, lineHeight: 48, letterSpacing: -1.84, color: '#FFFFFF', textAlign: 'center' },
  h2: { fontFamily: fonts.headMedium, fontSize: 30, letterSpacing: -0.9, color: '#ECECFF', marginTop: 6, textAlign: 'center' },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22.5, color: 'rgba(255,255,255,0.86)', maxWidth: 300, textAlign: 'center', marginTop: 14, marginBottom: 30 },
  buttons: { flexDirection: 'row', gap: 12, width: '100%' },
});
