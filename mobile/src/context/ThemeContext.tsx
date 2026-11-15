import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors, dark, light } from '../constants/theme';

export type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'sidstocks-theme';

const ThemeContext = createContext<{ c: Colors; pref: ThemePref; setPref: (p: ThemePref) => void }>({
  c: dark,
  pref: 'dark',
  setPref: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // phone setting, updates live
  const [pref, setPrefState] = useState<ThemePref>('dark'); // app opens dark the first time

  // load the saved choice once
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'system' || saved === 'light' || saved === 'dark') setPrefState(saved);
      })
      .catch(() => {});
  }, []);

  function setPref(next: ThemePref) {
    setPrefState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  const resolved = pref === 'system' ? (system === 'light' ? 'light' : 'dark') : pref;
  const c = resolved === 'dark' ? dark : light;

  return <ThemeContext.Provider value={{ c, pref, setPref }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Builds a StyleSheet from the active theme: const s = useStyles(makeStyles)
export function useStyles<T>(make: (c: Colors) => T): T {
  const { c } = useTheme();
  return useMemo(() => make(c), [c, make]);
}
