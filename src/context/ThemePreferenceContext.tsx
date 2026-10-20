
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = 'document_reader_settings';

type ThemePreferenceContextType = {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
};

const ThemePreferenceContext =
  createContext<ThemePreferenceContextType | undefined>(undefined);

export function ThemePreferenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [darkMode, setDarkModeState] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTheme() {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);

        if (saved && active) {
          const preferences = JSON.parse(saved);
          setDarkModeState(preferences.darkMode === true);
        }
      } catch (error) {
        console.warn('Could not load theme preference:', error);
      }
    }

    void loadTheme();

    return () => {
      active = false;
    };
  }, []);

  const setDarkMode = useCallback((value: boolean) => {
    setDarkModeState(value);
  }, []);

  return (
    <ThemePreferenceContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);

  if (!context) {
    throw new Error(
      'useThemePreference must be used inside ThemePreferenceProvider',
    );
  }

  return context;
}
