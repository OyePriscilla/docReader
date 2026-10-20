
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';

declare global {
  interface Window {
    renderDocument?: (
      base64: string,
      fileType: string
    ) => Promise<void>;

    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function notifyApp(success: boolean, error?: string) {
  window.ReactNativeWebView?.postMessage(
    JSON.stringify({
      type: 'render-complete',
      success,
      error,
    })
  );
}

function showMessage(root: HTMLElement, message: string) {
  root.innerHTML = '';

  const paragraph = document.createElement('p');
  paragraph.className = 'message';
  paragraph.textContent = message;

  root.appendChild(paragraph);
}

async function renderWordDocument(
  bytes: Uint8Array,
  root: HTMLElement
) {
  const container = document.createElement('div');
  container.className = 'word-document-container';
  root.appendChild(container);

  await renderAsync(
    bytes.buffer as ArrayBuffer,
    container,
    undefined,
    {
      className: 'docx',
      inWrapper: true,

      // Allow CSS to control the page width on mobile.
      ignoreWidth: true,

      // Preserve document page height.
      ignoreHeight: false,

      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
    }
  );
}

function renderExcelDocument(
  bytes: Uint8Array,
  root: HTMLElement
) {
  const workbook = XLSX.read(bytes, {
    type: 'array',
  });

  if (workbook.SheetNames.length === 0) {
    throw new Error('The workbook contains no worksheets.');
  }

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      continue;
    }

    const section = document.createElement('section');
    section.className = 'xlsx-sheet';

    const heading = document.createElement('h3');
    heading.textContent = sheetName;
    section.appendChild(heading);

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'xlsx-table-container';

    const tableWrapper = document.createElement('div');
    tableWrapper.innerHTML = XLSX.utils.sheet_to_html(sheet);

    const table = tableWrapper.querySelector('table');

    if (table) {
      table.classList.add('xlsx-table');
      table.setAttribute('aria-label', sheetName);
      scrollContainer.appendChild(table);
    } else {
      scrollContainer.textContent =
        'This worksheet does not contain a displayable table.';
    }

    section.appendChild(scrollContainer);
    root.appendChild(section);
  }
}

window.renderDocument = async (base64, fileType) => {
  const root = document.getElementById('document');

  if (!root) {
    notifyApp(false, 'Document viewer element not found.');
    return;
  }

  showMessage(root, 'Rendering document...');

  try {
    const bytes = decodeBase64(base64);

    root.innerHTML = '';

    if (fileType === 'docx') {
      await renderWordDocument(bytes, root);
    } else if (fileType === 'xlsx') {
      renderExcelDocument(bytes, root);
    } else {
      throw new Error(
        `Unsupported document type: ${fileType}`
      );
    }

    notifyApp(true);
  } catch (error) {
    console.error('Document rendering failed:', error);

    showMessage(
      root,
      'Unable to display this document. It may be damaged or unsupported.'
    );

    notifyApp(
      false,
      error instanceof Error ? error.message : String(error)
    );
  }
};
