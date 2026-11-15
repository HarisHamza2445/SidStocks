import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabIcon, TabName } from '../../components/Icons';
import { fonts } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// One row per tab: route file name and label.
const tabs: { name: TabName; title: string }[] = [
  { name: 'home', title: 'Home' },
  { name: 'sectors', title: 'Sectors' },
  { name: 'screener', title: 'Screener' },
  { name: 'news', title: 'News' },
  { name: 'journal', title: 'Journal' },
];

export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { session, loading } = useAuth();

  // the app needs a login: without one, go back to the Welcome screen
  if (loading) return null;
  if (!session) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.bd,
          borderTopWidth: 1,
          height: 66 + insets.bottom,
          paddingTop: 8,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            // inactive: outline icon, grey label. active: filled purple icon, dark label.
            tabBarIcon: ({ focused }) => <TabIcon name={tab.name} active={focused} color={focused ? c.pr : c.mu2} />,
            tabBarLabel: ({ focused }) => (
              <Text style={{ fontSize: 11.5, marginTop: 3, fontFamily: focused ? fonts.semi : fonts.medium, color: focused ? c.tx : c.mu2 }}>
                {tab.title}
              </Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
