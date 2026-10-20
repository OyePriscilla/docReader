
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useThemePreference } from '@/context/ThemePreferenceContext';

const SETTINGS_KEY = 'document_reader_settings';
const RECENT_KEY = 'recent_pdfs';

type Preferences = {
  darkMode: boolean;
  rememberRecent: boolean;
  confirmClear: boolean;
};

const DEFAULTS: Preferences = {
  darkMode: false,
  rememberRecent: true,
  confirmClear: true,
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [recentCount, setRecentCount] = useState(0);

  const { darkMode, setDarkMode } = useThemePreference();
  const dark = darkMode;

  const colors = {
    background: dark ? '#0F172A' : '#F8FAFC',
    card: dark ? '#1E293B' : '#FFFFFF',
    text: dark ? '#F1F5F9' : '#0F172A',
    secondary: dark ? '#CBD5E1' : '#64748B',
    border: dark ? '#334155' : '#E2E8F0',
    iconBackground: dark ? '#312E81' : '#EEF2FF',
    separator: dark ? '#334155' : '#F1F5F9',
  };

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);

        let preferences = DEFAULTS;

        if (saved) {
          preferences = { ...DEFAULTS, ...JSON.parse(saved) };
        }

        if (active) {
          setSettings(preferences);
          setDarkMode(preferences.darkMode === true);
        }

        const recent = await AsyncStorage.getItem(RECENT_KEY);
        const files = recent ? JSON.parse(recent) : [];

        if (active) {
          setRecentCount(Array.isArray(files) ? files.length : 0);
        }
      } catch {
        if (active) {
          Alert.alert('Settings', 'Could not load saved preferences.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, [setDarkMode]);

  const updateSetting = async (
    key: keyof Preferences,
    value: boolean,
  ) => {
    const previous = settings;
    const next = { ...previous, [key]: value };

    setSettings(next);

    if (key === 'darkMode') {
      setDarkMode(value);
    }

    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      setSettings(previous);

      if (key === 'darkMode') {
        setDarkMode(previous.darkMode);
      }

      Alert.alert(
        'Save failed',
        'Your preference could not be saved.',
      );
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_KEY);
      setRecentCount(0);

      Alert.alert(
        'History cleared',
        'Recent-file history was cleared. Your original documents were not deleted.',
      );
    } catch {
      Alert.alert('Unable to clear history', 'Please try again.');
    }
  };

  const requestClearHistory = () => {
    if (!settings.confirmClear) {
      void clearHistory();
      return;
    }

    Alert.alert(
      'Clear recent files?',
      'This removes recent-file history only. Your saved documents will remain untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear history',
          style: 'destructive',
          onPress: () => void clearHistory(),
        },
      ],
    );
  };

  const showAbout = () => {
    Alert.alert(
      'About Document Reader',
      'An offline-friendly reader for PDF, Word, Excel and image documents.',
    );
  };

  const showEfficiency = () => {
    Alert.alert(
      'Resource efficiency',
      'Documents saved on your device can be opened without repeatedly downloading them. Offline reading can reduce network usage and associated energy consumption.',
    );
  };

  const Row = ({
    icon,
    title,
    subtitle,
    onPress,
    right,
  }: {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle: string;
    onPress?: () => void;
    right?: React.ReactNode;
  }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: colors.iconBackground },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={dark ? '#A5B4FC' : '#4F46E5'}
        />
      </View>

      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>
          {title}
        </Text>

        <Text style={[styles.rowSubtitle, { color: colors.secondary }]}>
          {subtitle}
        </Text>
      </View>

      {right ??
        (onPress ? (
          <Ionicons
            name="chevron-forward"
            size={19}
            color={colors.secondary}
          />
        ) : null)}
    </TouchableOpacity>
  );

  const section = (title: string) => (
    <Text style={[styles.sectionTitle, { color: colors.secondary }]}>
      {title}
    </Text>
  );

  if (loading) {
    return (
      <View
        style={[
          styles.loading,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color="#6366F1" />

        <Text style={{ color: colors.secondary, marginTop: 12 }}>
          Loading settings…
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Settings
      </Text>

      <Text style={[styles.subtitle, { color: colors.secondary }]}>
        Personalise your reading experience
      </Text>

      {section('APPEARANCE')}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Row
          icon="moon-outline"
          title="Dark mode"
          subtitle="Use a darker app appearance"
          right={
            <Switch
              value={dark}
              onValueChange={(value) =>
                void updateSetting('darkMode', value)
              }
              accessibilityLabel="Dark mode"
            />
          }
        />
      </View>

      {section('FILE MANAGEMENT')}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Row
          icon="time-outline"
          title="Remember recent files"
          subtitle="Preference for recent-file history"
          right={
            <Switch
              value={settings.rememberRecent}
              onValueChange={(value) =>
                void updateSetting('rememberRecent', value)
              }
            />
          }
        />

        <View
          style={[
            styles.separator,
            { backgroundColor: colors.separator },
          ]}
        />

        <Row
          icon="folder-outline"
          title="Clear recent files"
          subtitle={`${recentCount} recent file${recentCount === 1 ? '' : 's'} recorded`}
          onPress={requestClearHistory}
        />

        <View
          style={[
            styles.separator,
            { backgroundColor: colors.separator },
          ]}
        />

        <Row
          icon="shield-checkmark-outline"
          title="Confirm before clearing"
          subtitle="Ask before removing history"
          right={
            <Switch
              value={settings.confirmClear}
              onValueChange={(value) =>
                void updateSetting('confirmClear', value)
              }
            />
          }
        />
      </View>

      {section('ABOUT')}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Row
          icon="information-circle-outline"
          title="About this app"
          subtitle="Supported formats and app information"
          onPress={showAbout}
        />

        <View
          style={[
            styles.separator,
            { backgroundColor: colors.separator },
          ]}
        />

        <Row
          icon="leaf-outline"
          title="Resource efficiency"
          subtitle="Offline-friendly document viewing"
          onPress={showEfficiency}
        />
      </View>

      <Text style={[styles.footer, { color: colors.secondary }]}>
        Document Reader · Settings
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    paddingTop: 48,
    paddingBottom: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 5,
    marginBottom: 26,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  separator: {
    height: 1,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 4,
  },
});
