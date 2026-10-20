
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

export type RecentPdf = {
  id: string;
  name: string;
  uri: string;
  openedAt: number;
};

const STORAGE_KEY = 'recent_pdfs';
const MAX_RECENT_PDFS = 20;

async function getFileSize(
  uri: string
): Promise<number | undefined> {
  try {
    const info = await FileSystem.getInfoAsync(uri);

    if (info.exists && 'size' in info) {
      return info.size;
    }
  } catch (error) {
    console.warn('Could not check PDF size:', error);
  }

  return undefined;
}

function documentKey(name: string, size: number): string {
  return `${name.trim().toLowerCase()}:${size}`;
}

export async function getRecentPdfs(): Promise<RecentPdf[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return [];
    }

    const files = JSON.parse(saved) as RecentPdf[];

    if (!Array.isArray(files)) {
      return [];
    }

    const sorted = files.sort(
      (a, b) => b.openedAt - a.openedAt
    );

    const seenUris = new Set<string>();
    const seenDocuments = new Set<string>();
    const unique: RecentPdf[] = [];

    for (const file of sorted) {
      if (!file || !file.uri || !file.name) {
        continue;
      }

      const uriKey = file.uri;
      const size = await getFileSize(file.uri);
      const docKey =
        size === undefined
          ? undefined
          : documentKey(file.name, size);

      if (
        seenUris.has(uriKey) ||
        (docKey !== undefined && seenDocuments.has(docKey))
      ) {
        continue;
      }

      seenUris.add(uriKey);

      if (docKey !== undefined) {
        seenDocuments.add(docKey);
      }

      unique.push(file);
    }

    const result = unique.slice(0, MAX_RECENT_PDFS);

    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(result)
    );

    return result;
  } catch (error) {
    console.error('Could not load recent PDFs:', error);
    return [];
  }
}

export async function addRecentPdf(
  pdf: Omit<RecentPdf, 'openedAt'>
): Promise<RecentPdf[]> {
  const recent = await getRecentPdfs();
  const newSize = await getFileSize(pdf.uri);
  const remaining: RecentPdf[] = [];

  for (const item of recent) {
    const itemSize = await getFileSize(item.uri);

    const sameUri = item.uri === pdf.uri;

    const sameDocument =
      newSize !== undefined &&
      itemSize !== undefined &&
      documentKey(item.name, itemSize) ===
        documentKey(pdf.name, newSize);

    if (!sameUri && !sameDocument) {
      remaining.push(item);
    }
  }

  const updated: RecentPdf[] = [
    {
      ...pdf,
      openedAt: Date.now(),
    },
    ...remaining,
  ].slice(0, MAX_RECENT_PDFS);

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updated)
  );

  return updated;
}
