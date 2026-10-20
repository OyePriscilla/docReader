
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import {
  ThemePreferenceProvider,
  useThemePreference,
} from '@/context/ThemePreferenceContext';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  return (
    <ThemePreferenceProvider>
      <ThemedLayout />
    </ThemePreferenceProvider>
  );
}

function ThemedLayout() {
  const { darkMode } = useThemePreference();

  return (
    <ThemeProvider value={darkMode ? DarkTheme : DefaultTheme}>
      <StatusBar
        barStyle={darkMode ? 'light-content' : 'dark-content'}
        backgroundColor={darkMode ? '#0F172A' : '#FFFFFF'}
        translucent={false}
      />
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
