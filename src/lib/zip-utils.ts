import JSZip from 'jszip';

export interface ProcessedImage {
  countryName: string;
  fileName: string;
  data: string; // base64
  configId?: string; // config set ID for folder grouping
}

export interface ExportResult {
  success: boolean;
  method?: 'directory' | 'zip';
  error?: string;
  count?: number;
  message?: string;
  exported?: number;
}

function getTimestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}${sec}`;
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

async function buildZip(
  images: ProcessedImage[],
  timestamp: string
): Promise<JSZip> {
  const zip = new JSZip();

  // Group images by configId (each config gets its own folder)
  const configGroups = new Map<string, ProcessedImage[]>();
  for (const img of images) {
    const key = img.configId || img.countryName;
    const group = configGroups.get(key) || [];
    group.push(img);
    configGroups.set(key, group);
  }

  for (const [configId, configImages] of configGroups) {
    const firstImg = configImages[0];
    const folderName = `${sanitizeFolderName(firstImg.countryName)}_${configId}_${timestamp}`;
    const folder = zip.folder(folderName);
    if (folder) {
      for (const img of configImages) {
        const base64Data = img.data.split(',')[1];
        folder.file(img.fileName, base64Data, { base64: true });
      }
    }
  }

  return zip;
}

/**
 * Check if File System Access API is available
 */
export function canPickDirectory(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Download as ZIP with timestamped country folders
 */
export async function createZipAndDownload(
  images: ProcessedImage[],
  zipName?: string
): Promise<ExportResult> {
  const timestamp = getTimestamp();
  const name = zipName || `EXIF_${timestamp}.zip`;
  const zip = await buildZip(images, timestamp);

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    success: true,
    message: `✅ ZIP 已下载：${name}`,
    exported: images.length,
  };
}

/**
 * Export directly to a user-selected directory using File System Access API.
 * Each country gets its own folder with timestamp suffix.
 */
export async function exportToDirectory(
  images: ProcessedImage[]
): Promise<{ success: boolean; message: string }> {
  if (!canPickDirectory()) {
    // Fallback to ZIP download
    await createZipAndDownload(images);
    return { success: true, message: '已下载 ZIP 文件（当前浏览器不支持直接选择目录）' };
  }

  try {
    // Let user pick the output directory (e.g., D:\output)
    const dirHandle = await (window as unknown as {
      showDirectoryPicker: (opts?: { mode: string }) => Promise<FileSystemDirectoryHandle>;
    }).showDirectoryPicker({ mode: 'readwrite' });

    const timestamp = getTimestamp();

    // Group images by config set (each set gets its own folder)
    const grouped = new Map<string, ProcessedImage[]>();
    for (const img of images) {
      const key = img.configId || 'default';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(img);
    }

    let fileCount = 0;

    for (const [configId, configImages] of grouped) {
      // Folder name: country_configId_timestamp
      const countryName = configImages[0]?.countryName || 'Unknown';
      const folderName = `${sanitizeFolderName(countryName)}_${configId.slice(0, 6)}_${timestamp}`;
      const configDir = await dirHandle.getDirectoryHandle(folderName, { create: true });

      for (const img of configImages) {
        const base64Data = img.data.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const fileHandle = await configDir.getFileHandle(img.fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(bytes);
        await writable.close();
        fileCount++;
      }
    }

    return { success: true, message: `已导出 ${fileCount} 个文件到 ${grouped.size} 个文件夹` };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { success: false, message: '用户取消了目录选择' };
    }
    // Fallback to ZIP download on error
    await createZipAndDownload(images);
    return { success: true, message: '导出失败，已改为下载 ZIP 文件' };
  }
}
