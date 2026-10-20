import { useThemePreference } from '@/context/ThemePreferenceContext';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import Pdf from 'react-native-pdf';
import { getFileIcon } from '@/utils/fileIcons';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  NativeEventEmitter,
  NativeModules,
  Image,
  ScrollView,
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

import { saveFileLocally } from '../../utils/PdfStorage';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
type Screen = 'menu' | 'reader';

type SupportedFileType =
  | 'pdf'
  | 'docx'
  | 'xlsx'
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'webp';

type IncomingFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

const incomingFileModule = NativeModules.IncomingFile;

const incomingFileEmitter = incomingFileModule
  ? new NativeEventEmitter(incomingFileModule)
  : null;

function getFileType(name: string): SupportedFileType | null {
  const extension = name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
    case 'docx':
    case 'xlsx':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return extension;
    default:
      return null;
  }
}

export default function HomeScreen() {
  const params = useLocalSearchParams<{
    uri?: string;
    name?: string;
  }>();

  const router = useRouter();

  const { darkMode } = useThemePreference();

  const theme = {
    background: darkMode ? '#0F172A' : '#F8FAFC',
    surface: darkMode ? '#1E293B' : '#FFFFFF',
    text: darkMode ? '#F8FAFC' : '#0F172A',
    mutedText: darkMode ? '#CBD5E1' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    accent: darkMode ? '#A5B4FC' : '#4F46E5',
    iconBackground: darkMode ? '#312E81' : '#EEF2FF',
  };

  const styles = createStyles(theme);


  const [screen, setScreen] = useState<Screen>('menu');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [fileType, setFileType] =
    useState<SupportedFileType | null>(null);
  const documentWebViewRef = useRef<WebView>(null);
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

    const selectedType = getFileType(name);

    if (!selectedType) {
      setError('This file type is not supported.');
      return;
    }

    setPdfUri(params.uri);
    setFileName(name);
    setFileType(selectedType);
    setCurrentPage(1);
    setTotalPages(0);
    setError(null);

    setLoading(
      selectedType === 'pdf' ||
      selectedType === 'docx' ||
      selectedType === 'xlsx'
    );

    setScreen('reader');

    addRecentPdf({
      id: params.uri,
      name,
      uri: params.uri,
    }).catch((err) => {
      console.error('Could not save recent PDF:', err);
    });
  }, [params.uri, params.name]);

  const processedIncomingFiles = useRef(new Set<string>());

  const handleIncomingFile = useCallback(
    async (incoming: IncomingFile) => {
      if (!incoming?.uri || !incoming?.name) {
        return;
      }

      // Prevent the initial-file lookup and event listener
      // from importing the same file twice.
      const key = `${incoming.uri}|${incoming.name}`;

      if (processedIncomingFiles.current.has(key)) {
        return;
      }

      processedIncomingFiles.current.add(key);

      const selectedType = getFileType(incoming.name);

      if (!selectedType) {
        setError(
          `Unsupported file: ${incoming.name}. ` +
          'Supported formats are PDF, DOCX, XLSX, JPG, JPEG, PNG and WEBP.'
        );
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const savedUri = await saveFileLocally(
          incoming.uri,
          incoming.name
        );

        setFileName(incoming.name);
        setPdfUri(savedUri);
        setFileType(selectedType);
        setCurrentPage(1);
        setTotalPages(0);
        setScreen('reader');

        await addRecentPdf({
          id: savedUri,
          name: incoming.name,
          uri: savedUri,
        });

        await loadRecentPdfs();

        const isImage = [
          'jpg',
          'jpeg',
          'png',
          'webp',
        ].includes(selectedType);

        if (isImage) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Incoming file import failed:', err);
        setError('Unable to import this file. Please try again.');
        setLoading(false);
      }
    },
    [loadRecentPdfs]
  );

  useEffect(() => {
    if (!incomingFileModule || !incomingFileEmitter) {
      return;
    }

    let active = true;

    const subscription = incomingFileEmitter.addListener(
      'incomingFile',
      (file: IncomingFile) => {
        if (active) {
          void handleIncomingFile(file);
        }
      }
    );

    incomingFileModule
      .getInitialFile()
      .then((file: IncomingFile | null) => {
        if (active && file) {
          return handleIncomingFile(file);
        }
      })
      .catch((err: unknown) => {
        console.error('Could not retrieve incoming file:', err);
      });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [handleIncomingFile]);

  const pickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets.length) {
        return;
      }

      const selectedFile = result.assets[0];
      const selectedType = getFileType(selectedFile.name);

      if (!selectedType) {
        setError(
          'Unsupported file. Select PDF, DOCX, XLSX, JPG, JPEG, PNG or WEBP.'
        );
        return;
      }

      setLoading(true);
      setError(null);
      setCurrentPage(1);
      setTotalPages(0);

      const savedUri = await saveFileLocally(
        selectedFile.uri,
        selectedFile.name
      );

      setFileName(selectedFile.name);
      setPdfUri(savedUri);
      setFileType(selectedType);
      setScreen('reader');

      await addRecentPdf({
        id: savedUri,
        name: selectedFile.name,
        uri: savedUri,
      });

      if (selectedType === 'jpg' ||
        selectedType === 'jpeg' ||
        selectedType === 'png' ||
        selectedType === 'webp') {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      setError('Unable to open or save this file. Please try again.');
      console.error('File selection error:', err);
    }
  };



  const loadOfficeDocument = async () => {
    if (!pdfUri || !fileType) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const base64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const webView = documentWebViewRef.current;

      if (!webView) {
        throw new Error('The document viewer is not ready.');
      }

      webView.injectJavaScript(
        'window.__officeBase64 = ""; true;'
      );

      const chunkSize = 30000;

      for (let i = 0; i < base64.length; i += chunkSize) {
        const chunk = base64.slice(i, i + chunkSize);

        webView.injectJavaScript(
          `window.__officeBase64 += ${JSON.stringify(chunk)}; true;`
        );

        // Give WebView time to process each chunk.
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
      }

      webView.injectJavaScript(
        `window.renderDocument(` +
        `window.__officeBase64, ` +
        `${JSON.stringify(fileType)}` +
        `); window.__officeBase64 = ""; true;`
      );
    } catch (err) {
      console.error('Office document rendering error:', err);
      setError('Unable to display this document. Please try again.');
      setLoading(false);
    }
  };



  if (screen === 'menu') {
    return (
      <View style={styles.menuContainer}>
        {/* Home header */}
        <View style={styles.homeHeader}>
          <View style={styles.homeHeading}>
            <Text style={styles.menuTitle}>My Documents</Text>
            <Text style={styles.menuSubtitle}>
              Your files, ready when you are.
            </Text>
          </View>

          <View style={styles.homeLogo}>
            <Ionicons
              name="book-outline"
              size={25}
              color={theme.accent} />
          </View>
        </View>

        {/* Add document card */}
        <TouchableOpacity
          style={styles.importCard}
          onPress={pickPDF}
          accessibilityRole="button"
          accessibilityLabel="Add a document"
          activeOpacity={0.8}
        >
          <View style={styles.importIcon}>
            <Ionicons
              name="add"
              size={28}
              color="#FFFFFF"
            />
          </View>

          <View style={styles.importText}>
            <Text style={styles.importTitle}>
              Add Document
            </Text>
            <Text style={styles.importSubtitle}>
              PDF, Word, Excel or image
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#4F46E5"
          />
        </TouchableOpacity>

        {/* Recently opened documents */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <View>
              <Text style={styles.recentTitle}>
                Recently Opened
              </Text>
              <Text style={styles.recentSubtitle}>
                Pick up where you left off
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/explore')}
              accessibilityRole="button"
              accessibilityLabel="View all documents"
              activeOpacity={0.7}
            >
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loadingRecent ? (
            <View style={styles.recentLoading}>
              <ActivityIndicator color="#4F46E5" />
            </View>
          ) : recentPdfs.length === 0 ? (
            <View style={styles.emptyRecent}>
              <View style={styles.emptyRecentIcon}>
                <Ionicons
                  name="documents-outline"
                  size={30}
                  color="#4F46E5"
                />
              </View>

              <Text style={styles.emptyRecentTitle}>
                No documents yet
              </Text>

              <Text style={styles.emptyRecentText}>
                Add a PDF, Word document, spreadsheet or image
                to start building your library.
              </Text>

              <TouchableOpacity
                style={styles.emptyRecentButton}
                onPress={pickPDF}
                accessibilityRole="button"
                accessibilityLabel="Add your first document"
                activeOpacity={0.8}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.emptyRecentButtonText}>
                  Add a document
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={recentPdfs.slice(0, 5)}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const fileIcon = getFileIcon(item.name);

                return (
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
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.name}`}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.recentFileIcon,
                        {
                          backgroundColor:
                            fileIcon.backgroundColor,
                        },
                      ]}
                    >
                      <Ionicons
                        name={fileIcon.name}
                        size={24}
                        color={fileIcon.color}
                      />
                    </View>

                    <View style={styles.recentItemText}>
                      <Text
                        style={styles.recentFileName}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>

                      <Text style={styles.recentDate}>
                        {new Date(item.openedAt).toLocaleString(
                          [],
                          {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }
                        )}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={19}
                      color={theme.mutedText} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

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


      {pdfUri && fileType ? (
        fileType === 'pdf' ? (
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
        ) : ['jpg', 'jpeg', 'png', 'webp'].includes(fileType) ? (
          <View style={styles.imageViewer}>
            <ScrollView
              contentContainerStyle={styles.imageScrollContent}
              maximumZoomScale={4}
            >
              <Image
                key={pdfUri}
                source={{ uri: pdfUri }}
                style={styles.documentImage}
                resizeMode="contain"
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setError('Unable to display this image.');
                }}
              />
            </ScrollView>

            {loading && (
              <ActivityIndicator size="large" color="#4f46e5" />
            )}
          </View>
        ) : (
          <View style={styles.officeViewer}>
            <WebView
              key={pdfUri}
              ref={documentWebViewRef}
              source={{
                uri: 'file:///android_asset/document-viewer/index.html',
              }}
              originWhitelist={['*']}
              javaScriptEnabled
              allowFileAccess
              onMessage={(event) => {
                try {
                  const message = JSON.parse(event.nativeEvent.data);

                  if (message.type === 'render-complete') {
                    setLoading(false);

                    if (message.success) {
                      setError('');
                    } else {
                      setError(
                        message.error || 'Unable to display this document.'
                      );
                    }
                  }
                } catch (err) {
                  console.error('Document viewer message error:', err);
                  setLoading(false);
                  setError('Unable to process the document viewer response.');
                }
              }}
              onLoadEnd={loadOfficeDocument}
              onError={() => {
                setLoading(false);
                setError('Unable to load the offline document viewer.');
              }}
            />

            {loading && (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color="#4f46e5" />
                <Text>Loading document...</Text>
              </View>
            )}
          </View>
        )
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No file open</Text>

          <TouchableOpacity
            style={styles.openButton}
            onPress={() => setScreen('menu')}
          >
            <Text style={styles.openButtonText}>
              Back to My Documents
            </Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}


const createStyles = (theme: {
  background: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  accent: string;
  iconBackground: string;
}) =>
  StyleSheet.create({  // Home screen
    menuContainer: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 52,
      paddingBottom: 24,
      backgroundColor: '#F8FAFC',
    },

    homeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 32,
    },

    homeHeading: {
      flex: 1,
      paddingRight: 12,
    },

    homeLogo: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },

    menuTitle: {
      fontSize: 27,
      fontWeight: '700',
      color: '#0F172A',
      letterSpacing: -0.6,
    },

    menuSubtitle: {
      fontSize: 14,
      lineHeight: 21,
      color: '#64748B',
      marginTop: 7,
    },

    // Recently opened section
    recentSection: {
      marginTop: 0,
    },

    recentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },

    recentTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#0F172A',
    },

    recentSubtitle: {
      fontSize: 12,
      color: '#64748B',
      marginTop: 5,
    },

    seeAll: {
      color: '#4F46E5',
      fontSize: 13,
      fontWeight: '600',
      paddingVertical: 8,
      paddingLeft: 8,
    },

    recentLoading: {
      paddingVertical: 32,
      alignItems: 'center',
    },

    // Empty recent documents state
    emptyRecent: {
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingVertical: 28,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },

    emptyRecentIcon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },

    emptyRecentTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#0F172A',
      textAlign: 'center',
    },

    emptyRecentText: {
      fontSize: 13,
      lineHeight: 20,
      color: '#64748B',
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 18,
    },

    emptyRecentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: '#4F46E5',
    },

    emptyRecentButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#FFFFFF',
    },

    // Recent document rows
    recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      marginBottom: 10,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },

    recentFileIcon: {
      width: 46,
      height: 46,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },

    recentItemText: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },

    recentFileName: {
      fontSize: 14,
      fontWeight: '600',
      color: '#0F172A',
    },

    recentDate: {
      fontSize: 12,
      color: '#64748B',
    },

    // Add document action
    addDocumentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      marginTop: 18,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },

    addDocumentIcon: {
      width: 44,
      height: 44,
      borderRadius: 13,
      backgroundColor: '#4F46E5',
      alignItems: 'center',
      justifyContent: 'center',
    },

    addDocumentTextContainer: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },

    addDocumentTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: '#0F172A',
    },

    addDocumentSubtitle: {
      fontSize: 12,
      color: '#64748B',
    },

    // Document reader
    readerContainer: {
      flex: 1,
      padding: 12,
      paddingTop: 48,
      backgroundColor: '#FFFFFF',
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
      backgroundColor: '#E5E7EB',
    },

    pdf: {
      flex: 1,
      width: '100%',
      backgroundColor: '#E5E7EB',
    },

    loading: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: '#FFFFFFCC',
    },

    pageCounter: {
      textAlign: 'center',
      paddingVertical: 8,
      fontSize: 14,
      color: '#333333',
      backgroundColor: '#F0F0F0',
    },

    emptyBox: {
      marginTop: 35,
      padding: 25,
      borderRadius: 16,
      backgroundColor: '#F3F4F6',
      alignItems: 'center',
    },

    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
    },

    openButton: {
      marginTop: 18,
      padding: 12,
      backgroundColor: '#4F46E5',
      borderRadius: 10,
    },

    openButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },

    error: {
      marginTop: 12,
      marginBottom: 12,
      color: '#B91C1C',
    },

    // Offline Word and Excel viewer
    officeViewer: {
      flex: 1,
      overflow: 'hidden',
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
    },

    // Image viewer
    imageViewer: {
      flex: 1,
      backgroundColor: '#F3F4F6',
      justifyContent: 'center',
    },

    imageScrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },

    documentImage: {
      width: '100%',
      height: 600,
    },

    importCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      marginBottom: 24,
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: '#C7D2FE',
      gap: 12,
    },

    importIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: '#4F46E5',
      alignItems: 'center',
      justifyContent: 'center',
    },

    importText: {
      flex: 1,
      minWidth: 0,
      gap: 4,
    },

    importTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: '#0F172A',
    },

    importSubtitle: {
      fontSize: 12,
      color: '#64748B',
    },
  });

