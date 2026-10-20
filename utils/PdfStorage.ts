
import * as FileSystem from 'expo-file-system/legacy';

const DOCUMENT_DIRECTORY =
  `${FileSystem.documentDirectory}recent-documents/`;

export async function saveFileLocally(
  sourceUri: string,
  fileName: string
): Promise<string> {
  await FileSystem.makeDirectoryAsync(DOCUMENT_DIRECTORY, {
    intermediates: true,
  }).catch(() => {});

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Keep different source files with the same name separate.
  let hash = 0;
  for (let i = 0; i < sourceUri.length; i++) {
    hash = (hash * 31 + sourceUri.charCodeAt(i)) | 0;
  }

  const destinationUri =
    `${DOCUMENT_DIRECTORY}${Math.abs(hash)}-${safeName}`;

  const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
  const destinationInfo =
    await FileSystem.getInfoAsync(destinationUri);

  if (!sourceInfo.exists) {
    throw new Error('The selected file could not be found.');
  }

  if (
    destinationInfo.exists &&
    'size' in sourceInfo &&
    'size' in destinationInfo &&
    sourceInfo.size === destinationInfo.size
  ) {
    return destinationUri;
  }

  if (destinationInfo.exists) {
    await FileSystem.deleteAsync(destinationUri, {
      idempotent: true,
    });
  }

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri,
  });

  return destinationUri;
}

// Keep existing imports working while we migrate the reader.
export const savePdfLocally = saveFileLocally;
