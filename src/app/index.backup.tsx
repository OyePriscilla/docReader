
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Pdf from 'react-native-pdf';
import { savePdfLocally } from '../../utils/PdfStorage';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';

import {
  addRecentPdf,
  getRecentPdfs,
  type RecentPdf,
} from '../../utils/recent-Pdfs';

type Screen = 'welcome' | 'menu' | 'reader';

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    uri?: string;
    name?: string;
  }>();

  const router = useRouter();

  const [screen, setScreen] = useState<Screen>('welcome');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [recentPdfs, setRecentPdfs] = useState<RecentPdf[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const loadRecentPdfs = useCallback(async () => {
    setLoadingRecent(true);

    try {
      const files = await getRecentPdfs();
      setRecentPdfs(files);
    } catch (error) {
      console.error('Could not load recent PDFs:', error);
    } finally {
      setLoadingRecent(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentPdfs();
    }, [loadRecentPdfs])
  );

  useEffect(() => {
    if (typeof params.uri !== 'string' || !params.uri) {
      return;
    }

    const name =
      typeof params.name === 'string'
        ? params.name
        : 'PDF document';

    setPdfUri(params.uri);
    setFileName(name);
    setCurrentPage(1);
    setTotalPages(0);
    setError(null);
    setLoading(true);
    setScreen('reader');

    addRecentPdf({
      id: params.uri,
      name,
      uri: params.uri,
    }).catch((err) => {
      console.error('Could not save recent PDF:', err);
    });
  }, [params.uri, params.name]);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const selectedFile = result.assets[0];

      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setTotalPages(0);

      const savedUri = await savePdfLocally(
        selectedFile.uri,
        selectedFile.name
      );

      setFileName(selectedFile.name);
      setPdfUri(savedUri);
      setScreen('reader');

      await addRecentPdf({
        id: savedUri,
        name: selectedFile.name,
        uri: savedUri,
      });
    } catch (err) {
      setLoading(false);
      setError('Unable to open or save this PDF. Please try again.');
      console.error('PDF selection error:', err);
    }
  };

  if (screen === 'welcome') {
    return (
      <View style={styles.welcome}>
        <TouchableOpacity
          style={styles.gettingStarted}
          onPress={() => setScreen('menu')}
          accessibilityRole="button"
        >
          <Text style={styles.welcomeTitle}>Getting Started</Text>
          <Ionicons
            name="arrow-forward-circle-outline"
            size={30}
            color="#ffffff"
          />
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'menu') {
    return (
      <View style={styles.menuContainer}>
        <Text style={styles.menuTitle}>Getting Started</Text>
        <Text style={styles.menuSubtitle}>
          Choose how you want to continue.
        </Text>


        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent PDFs</Text>

            <TouchableOpacity onPress={() => router.push('/explore')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loadingRecent ? (
            <ActivityIndicator color="#4f46e5" />
          ) : recentPdfs.length === 0 ? (
            <Text style={styles.noRecent}>
              No recent PDFs yet. Add a PDF to get started.
            </Text>
          ) : (
            <FlatList
              data={recentPdfs.slice(0, 4)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recentItem}
                  onPress={() =>
                    router.push({
                      pathname: '/',
                      params: {
                        uri: item.uri,
                        name: item.name,
                      },
                    })
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={24}
                    color="#4f46e5"
                  />

                  <View style={styles.recentItemText}>
                    <Text style={styles.recentFileName} numberOfLines={1}>
                      {item.name}
                    </Text>

                    <Text style={styles.recentDate}>
                      {new Date(item.openedAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>

        {/* Add icon appears below the recent PDFs */}
        <TouchableOpacity
          style={styles.addIconButton}
          onPress={pickPDF}
          accessibilityRole="button"
          accessibilityLabel="Add PDF"
        >
          <Ionicons name="add" size={36} color="#ffffff" />
        </TouchableOpacity>


        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.readerContainer}>
      <View style={styles.readerHeader}>
        <TouchableOpacity
          onPress={() => setScreen('menu')}
          accessibilityRole="button"
          accessibilityLabel="Back to menu"
        >
          <Ionicons
            name="arrow-back"
            size={26}
            color="#111827"
          />
        </TouchableOpacity>

        <Text style={styles.readerTitle} numberOfLines={1}>
          {fileName ?? 'PDF Reader'}
        </Text>

        <TouchableOpacity
          onPress={pickPDF}
          accessibilityRole="button"
          accessibilityLabel="Add another PDF"
        >
          <Ionicons
            name="add-circle-outline"
            size={28}
            color="#4f46e5"
          />
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {pdfUri ? (
        <View style={styles.pdfContainer}>
          <Pdf
            key={pdfUri}
            source={{ uri: pdfUri }}
            style={styles.pdf}
            trustAllCerts={false}
            onLoadComplete={(pages) => {
              setLoading(false);
              setTotalPages(pages);
            }}
            onError={(err) => {
              setLoading(false);
              setError(`Could not display PDF: ${String(err)}`);
              console.error('PDF rendering error:', err);
            }}
            onPageChanged={(page, pages) => {
              setCurrentPage(page);
              setTotalPages(pages);
            }}
          />

          <Text style={styles.pageCounter}>
            Page {currentPage} of {totalPages}
          </Text>

          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text>Loading PDF...</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No PDF open</Text>
          <TouchableOpacity
            style={styles.openButton}
            onPress={() => setScreen('menu')}
          >
            <Text style={styles.openButtonText}>
              Back to Getting Started
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  welcome: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  gettingStarted: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  menuContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 70,
    backgroundColor: '#f9fafb',
  },
  menuTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 28,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 5,
  },
  addIconButton: {
    alignSelf: 'center',
    marginTop: 42,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCaption: {
    textAlign: 'center',
    fontSize: 14,
    color: '#374151',
    marginTop: 10,
  },
  readerContainer: {
    flex: 1,
    padding: 12,
    paddingTop: 48,
    backgroundColor: '#ffffff',
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
  },
  readerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  pdfContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#e5e7eb',
  },
  loading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#ffffffcc',
  },
  pageCounter: {
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#f0f0f0',
  },
  emptyBox: {
    marginTop: 35,
    padding: 25,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  openButton: {
    marginTop: 18,
    padding: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
  },
  openButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  error: {
    marginTop: 12,
    marginBottom: 12,
    color: '#b91c1c',
  },
  recentSection: {
    marginTop: 28,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
  },
  seeAll: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600',
  },
  noRecent: {
    color: '#6b7280',
    fontSize: 14,
    paddingVertical: 16,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  recentItemText: {
    flex: 1,
  },
  recentFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  recentDate: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
});
