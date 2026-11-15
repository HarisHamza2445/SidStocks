import { InterTight_500Medium } from '@expo-google-fonts/inter-tight/500Medium';
import { InterTight_600SemiBold } from '@expo-google-fonts/inter-tight/600SemiBold';
import { InterTight_700Bold } from '@expo-google-fonts/inter-tight/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import Toast from '../components/Toast';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
  });

  // if the fonts fail to load, still show the app (system font) instead of a blank screen
  if (!fontsReady && !fontError) return null;

  return (
    <ThemeProvider>
      <AuthProvider>
        <AppProvider>
          <Shell />
        </AppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Screens: index (Welcome) -> auth -> (tabs) -> stock/[ticker]
function Shell() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
      <Toast />
    </View>
  );
}
