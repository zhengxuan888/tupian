/**
 * HEIC/HEIF image conversion utility.
 * iPhone exports photos as HEIC format which Canvas cannot read natively.
 * Loads heic2any from local public folder (no CDN dependency).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    heic2any?: (options: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadHeic2AnyScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.heic2any) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    // Load from local public folder - same origin, no CDN, no CORS
    script.src = '/heic2any.min.js';
    script.async = true;
    script.onload = () => {
      if (window.heic2any) {
        resolve();
      } else {
        reject(new Error('heic2any loaded but not available on window'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load heic2any script'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Check if a file is HEIC/HEIF format.
 * iPhone photos have mime type "image/heic" or "image/heif".
 * Some browsers report empty mime type, so also check file extension.
 */
export function isHeic(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  );
}

/**
 * Convert HEIC file to JPEG Blob.
 */
export async function heicToJpegBlob(file: File, quality = 0.95): Promise<Blob> {
  await loadHeic2AnyScript();
  if (!window.heic2any) {
    throw new Error('HEIC convert library failed to load');
  }

  const result = await window.heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality,
  });

  if (Array.isArray(result)) {
    return result[0];
  }
  return result as Blob;
}

/**
 * Convert HEIC file to a JPEG File object.
 */
export async function heicToJpegFile(file: File, quality = 0.95): Promise<File> {
  const jpegBlob = await heicToJpegBlob(file, quality);
  const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([jpegBlob], newName, { type: 'image/jpeg' });
}

/**
 * Convert any image File to base64 data URL.
 * Handles HEIC format by converting to JPEG first.
 */
export async function fileToBase64WithHeic(file: File): Promise<string> {
  // If HEIC, convert to JPEG first
  if (isHeic(file)) {
    const jpegFile = await heicToJpegFile(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(jpegFile);
    });
  }

  // Normal image
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
