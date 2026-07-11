import type { PhoneInfo } from './phones';
import type { CountryInfo } from './countries';

// piexifjs is a CommonJS module; require it at runtime to avoid SSR/ESM issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const piexif: any = typeof window !== 'undefined' ? require('piexifjs') : null;

// Get EXIF tag ID using piexifjs's built-in constants
function getTag(ifd: '0th' | 'Exif' | 'GPS', name: string): number {
  if (!piexif) return 0;
  
  // piexifjs uses: piexif.ImageIFD.Make, piexif.ExifIFD.DateTimeOriginal, etc.
  const ifdMap: Record<string, string> = {
    '0th': 'ImageIFD',
    'Exif': 'ExifIFD',
    'GPS': 'GPSIFD',
  };
  
  const ifdName = ifdMap[ifd];
  if (ifdName && piexif[ifdName] && piexif[ifdName][name] !== undefined) {
    return piexif[ifdName][name];
  }
  return 0;
}

function decimalToDMS(decimal: number): [[number, number], [number, number], [number, number]] {
  const abs = Math.abs(decimal);
  const d = Math.floor(abs);
  const minFloat = (abs - d) * 60;
  const m = Math.floor(minFloat);
  const s = Math.round((minFloat - m) * 60 * 10000);
  return [[d, 1], [m, 1], [s, 10000]];
}

function toExifDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}:${mo}:${d} ${h}:${mi}:${s}`;
}

/**
 * Convert any image (PNG, WebP, etc.) to JPEG base64 using Canvas.
 * piexifjs only supports JPEG format.
 */
async function ensureJpeg(imageBase64: string): Promise<string> {
  // Already JPEG - return as-is
  if (imageBase64.startsWith('data:image/jpeg')) {
    return imageBase64;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }
      // White background for transparency (PNG with alpha)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = () => reject(new Error('Failed to load image for JPEG conversion'));
    img.src = imageBase64;
  });
}

export async function writeExifToJpeg(
  imageBase64: string,
  phone: PhoneInfo,
  country: CountryInfo,
  dateTime: string,
  note?: string
): Promise<string> {
  if (!piexif) {
    throw new Error('piexifjs library not loaded. This function can only run in the browser.');
  }

  // Validate inputs
  if (!imageBase64 || !imageBase64.startsWith('data:image')) {
    throw new Error('Invalid image data: must be a base64 data URL');
  }
  if (!phone || !phone.make || !phone.model) {
    throw new Error('Invalid phone info: make and model are required');
  }
  if (!country || !country.gps) {
    throw new Error('Invalid country info: GPS coordinates are required');
  }

  // Convert to JPEG if needed (piexifjs only supports JPEG)
  const jpegBase64 = await ensureJpeg(imageBase64);
  
  if (!jpegBase64 || !jpegBase64.startsWith('data:image/jpeg')) {
    throw new Error('Failed to convert image to JPEG');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exifObj: any;
  try {
    exifObj = piexif.load(jpegBase64);
  } catch {
    // Create fresh EXIF structure if loading fails
    exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, '1st': {} };
  }

  // Ensure all IFDs exist
  if (!exifObj['0th']) exifObj['0th'] = {};
  if (!exifObj['Exif']) exifObj['Exif'] = {};
  if (!exifObj['GPS']) exifObj['GPS'] = {};

  const exifDateTime = toExifDateTime(dateTime);

  // 0th IFD - Camera info
  const makeTag = getTag('0th', 'Make');
  const modelTag = getTag('0th', 'Model');
  if (makeTag) exifObj['0th'][makeTag] = phone.make;
  if (modelTag) exifObj['0th'][modelTag] = phone.model;
  
  const softwareTag = getTag('0th', 'Software');
  if (softwareTag) exifObj['0th'][softwareTag] = 'Photo EXIF Tool';
  
  const dateTimeTag = getTag('0th', 'DateTime');
  if (dateTimeTag) exifObj['0th'][dateTimeTag] = exifDateTime;

  // Exif IFD - DateTime
  const dtOrigTag = getTag('Exif', 'DateTimeOriginal');
  if (dtOrigTag) exifObj['Exif'][dtOrigTag] = exifDateTime;
  
  const dtDigTag = getTag('Exif', 'DateTimeDigitized');
  if (dtDigTag) exifObj['Exif'][dtDigTag] = exifDateTime;

  // UserComment (Exif IFD)
  if (note && note.trim()) {
    const commentTag = getTag('Exif', 'UserComment');
    if (commentTag) {
      // UserComment requires a charset prefix: "ASCII\0\0\0" + text
      const commentBytes = [0x41, 0x53, 0x43, 0x49, 0x49, 0x00, 0x00, 0x00]; // "ASCII\0\0\0"
      for (let i = 0; i < note.length; i++) {
        commentBytes.push(note.charCodeAt(i));
      }
      exifObj['Exif'][commentTag] = commentBytes;
    }
  }

  // GPS IFD
  const gpsLat = Math.max(-90, Math.min(90, country.gps.lat));
  const gpsLng = Math.max(-180, Math.min(180, country.gps.lng));
  const latDMS = decimalToDMS(gpsLat);
  const lngDMS = decimalToDMS(gpsLng);
  
  exifObj['GPS'][getTag('GPS', 'GPSVersionID')] = [2, 3, 0, 0];
  exifObj['GPS'][getTag('GPS', 'GPSLatitudeRef')] = gpsLat >= 0 ? 'N' : 'S';
  exifObj['GPS'][getTag('GPS', 'GPSLatitude')] = latDMS;
  exifObj['GPS'][getTag('GPS', 'GPSLongitudeRef')] = gpsLng >= 0 ? 'E' : 'W';
  exifObj['GPS'][getTag('GPS', 'GPSLongitude')] = lngDMS;

  const exifBytes = piexif.dump(exifObj);
  return piexif.insert(exifBytes, jpegBase64);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
