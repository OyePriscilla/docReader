
export type FileKind =
  | 'pdf'
  | 'image'
  | 'word'
  | 'excel'
  | 'unsupported';

export function getFileKind(fileName: string): FileKind {
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'pdf') return 'pdf';

  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension ?? '')) {
    return 'image';
  }

  if (['doc', 'docx'].includes(extension ?? '')) {
    return 'word';
  }

  if (['xls', 'xlsx'].includes(extension ?? '')) {
    return 'excel';
  }

  return 'unsupported';
}

export function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return mimeTypes[extension ?? ''] ?? '*/*';
}
