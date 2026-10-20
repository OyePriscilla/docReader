
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFileIcon } from '@/utils/fileIcons';
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import {
  getRecentPdfs,
  RecentPdf,
} from '../../utils/recent-Pdfs';

const SETTINGS_KEY = 'document_reader_settings';

export default function RecentPdfsScreen() {
  const [recentPdfs, setRecentPdfs] = useState<RecentPdf[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const colors = {
    background: darkMode ? '#0F172A' : '#F8FAFC',
    card: darkMode ? '#1E293B' : '#FFFFFF',
    text: darkMode ? '#F1F5F9' : '#172033',
    secondary: darkMode ? '#CBD5E1' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    open: darkMode ? '#A5B4FC' : '#2563EB',
  };

  const loadRecentPdfs = useCallback(async () => {
    setLoading(true);

    try {
      const [savedSettings, files] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEY),
        getRecentPdfs(),
      ]);

      if (savedSettings) {
        const preferences = JSON.parse(savedSettings);
        setDarkMode(preferences.darkMode === true);
      } else {
        setDarkMode(false);
      }

      setRecentPdfs(files);
    } catch (error) {
      console.error('Unable to load recent files:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentPdfs();
    }, [loadRecentPdfs])
  );

  const openPdf = (pdf: RecentPdf) => {
    router.navigate({
      pathname: '/',
      params: {
        uri: pdf.uri,
        name: pdf.name,
      },
    });
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Recent Files</Text>
      <Text style={styles.subtitle}>
        Reopen documents you have read recently.
      </Text>

      {loading ? (
        <ActivityIndicator
          style={styles.message}
          size="large"
          color={colors.open}
        />
      ) : recentPdfs.length === 0 ? (
        <Text style={styles.message}>
          No recent files yet. Open a document first.
        </Text>
      ) : (
        <FlatList
          data={recentPdfs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const fileIcon = getFileIcon(item.name);

            return (
              <TouchableOpacity
                style={styles.fileCard}
                onPress={() => openPdf(item)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.fileIconContainer,
                    { backgroundColor: fileIcon.backgroundColor },
                  ]}
                >
                  <Ionicons
                    name={fileIcon.name}
                    size={26}
                    color={fileIcon.color}
                  />
                </View>

                <View style={styles.fileDetails}>
                  <Text style={styles.fileName} numberOfLines={2}>
                    {item.name}
                  </Text>

                  <Text style={styles.fileDate}>
                    Last opened: {new Date(item.openedAt).toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.openLabel}>Open ›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

function createStyles(colors: {
  background: string;
  card: string;
  text: string;
  secondary: string;
  border: string;
  open: string;
}) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 18,
      paddingTop: 24,
    },
    heading: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.secondary,
      marginTop: 6,
      marginBottom: 20,
    },
    message: {
      fontSize: 15,
      color: colors.secondary,
      marginTop: 24,
      lineHeight: 22,
    },
    list: {
      paddingBottom: 24,
    },
    fileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fileDetails: {
      flex: 1,
      marginHorizontal: 12,
    },
    fileName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    fileDate: {
      fontSize: 11,
      color: colors.secondary,
      marginTop: 5,
    },
    openLabel: {
      fontSize: 13,
      color: colors.open,
      fontWeight: '600',
    },
    fileIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
