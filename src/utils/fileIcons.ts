
import { Ionicons } from '@expo/vector-icons';

export type FileCategory =
  | 'pdf'
  | 'word'
  | 'excel'
  | 'image'
  | 'other';

export function getFileCategory(
  fileName: string
): FileCategory {
  const extension = fileName
    .split('.')
    .pop()
    ?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'pdf';

    case 'doc':
    case 'docx':
      return 'word';

    case 'xls':
    case 'xlsx':
      return 'excel';

    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return 'image';

    default:
      return 'other';
  }
}

export function getFileIcon(fileName: string) {
  switch (getFileCategory(fileName)) {
    case 'pdf':
      return {
        name: 'document-text' as const,
        color: '#DC2626',
        backgroundColor: '#FEE2E2',
      };

    case 'word':
      return {
        name: 'document-text-outline' as const,
        color: '#2563EB',
        backgroundColor: '#DBEAFE',
      };

    case 'excel':
      return {
        name: 'grid-outline' as const,
        color: '#15803D',
        backgroundColor: '#DCFCE7',
      };

    case 'image':
      return {
        name: 'image-outline' as const,
        color: '#9333EA',
        backgroundColor: '#F3E8FF',
      };

    default:
      return {
        name: 'document-outline' as const,
        color: '#64748B',
        backgroundColor: '#F1F5F9',
      };
  }
}
