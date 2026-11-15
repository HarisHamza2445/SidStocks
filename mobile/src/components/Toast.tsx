import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../constants/theme';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';

// Pill message at the bottom of the screen. Springs up, hides itself after 4 seconds.
export default function Toast() {
  const { c } = useTheme();
  const { toast, hideToast } = useApp();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const progress = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState(''); // keeps the words on screen while fading out

  useEffect(() => {
    if (toast) {
      setText(toast);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }
  }, [toast]);

  return (
    <Animated.View
      pointerEvents={toast ? 'auto' : 'none'}
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: insets.bottom + (pathname.startsWith('/stock') ? 100 : 86),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        paddingVertical: 10,
        paddingRight: 10,
        paddingLeft: 16,
        borderRadius: 18,
        backgroundColor: c.toastBg,
        boxShadow: '0 20px 40px rgba(15,17,35,0.3)',
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
      }}
    >
      <Text style={{ flex: 1, fontSize: 13, fontFamily: fonts.semi, color: c.toastTx }}>{text}</Text>
      <Pressable
        onPress={() => {
          hideToast();
          router.navigate('/journal');
        }}
        style={{ height: 38, paddingHorizontal: 14, borderRadius: 12, backgroundColor: c.toastTx, justifyContent: 'center' }}
      >
        <Text style={{ fontSize: 12.5, fontFamily: fonts.bold, color: c.toastBg }}>View</Text>
      </Pressable>
    </Animated.View>
  );
}
