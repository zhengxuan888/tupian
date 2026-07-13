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
  if (softwareTag) exifObj['0th'][softwareTag] = phone.make === 'Apple' ? `${phone.model} iOS ${randomInt(15, 17)}.${randomInt(0, 7)}.${randomInt(0, 3)}` : 'Camera';
  
  const dateTimeTag = getTag('0th', 'DateTime');
  if (dateTimeTag) exifObj['0th'][dateTimeTag] = exifDateTime;

  // Image dimensions
  const imgWidthTag = getTag('0th', 'ImageWidth');
  const imgHeightTag = getTag('0th', 'ImageLength');
  if (imgWidthTag && imgHeightTag) {
    // Extract from base64 image
    const imgDimensions = getImageDimensions(jpegBase64);
    if (imgDimensions) {
      exifObj['0th'][imgWidthTag] = imgDimensions.width;
      exifObj['0th'][imgHeightTag] = imgDimensions.height;
    }
  }

  // Exif IFD - DateTime + Camera parameters
  const dtOrigTag = getTag('Exif', 'DateTimeOriginal');
  if (dtOrigTag) exifObj['Exif'][dtOrigTag] = exifDateTime;
  
  const dtDigTag = getTag('Exif', 'DateTimeDigitized');
  if (dtDigTag) exifObj['Exif'][dtDigTag] = exifDateTime;

  // FNumber (aperture) - realistic values for phone cameras
  const fNumberTag = getTag('Exif', 'FNumber');
  if (fNumberTag) {
    const fNumber = phone.make === 'Apple' ? [[15, 10], [18, 10], [22, 10]][randomInt(0, 2)] : [[17, 10], [20, 10], [24, 10]][randomInt(0, 2)];
    exifObj['Exif'][fNumberTag] = fNumber;
  }

  // ExposureTime - realistic values
  const exposureTag = getTag('Exif', 'ExposureTime');
  if (exposureTag) {
    const exposures = [[1, 30], [1, 60], [1, 100], [1, 120], [1, 200], [1, 250], [1, 500], [1, 1000]];
    const exp = exposures[randomInt(0, exposures.length - 1)];
    exifObj['Exif'][exposureTag] = exp;
  }

  // ISOSpeedRatings
  const isoTag = getTag('Exif', 'ISOSpeedRatings');
  if (isoTag) {
    const isoValues = [50, 64, 80, 100, 125, 160, 200, 250, 320, 400, 500, 640, 800];
    exifObj['Exif'][isoTag] = isoValues[randomInt(0, isoValues.length - 1)];
  }

  // FocalLength (in mm) - phone cameras typically 4-7mm
  const focalTag = getTag('Exif', 'FocalLength');
  if (focalTag) {
    const focalLengths = [[42, 10], [48, 10], [51, 10], [57, 10], [60, 10], [66, 10], [77, 10]];
    exifObj['Exif'][focalTag] = focalLengths[randomInt(0, focalLengths.length - 1)];
  }

  // FocalLengthIn35mmFilm
  const focal35Tag = getTag('Exif', 'FocalLengthIn35mmFilm');
  if (focal35Tag) {
    const focal35Values = [24, 26, 28, 30, 35, 42, 52, 77];
    exifObj['Exif'][focal35Tag] = focal35Values[randomInt(0, focal35Values.length - 1)];
  }

  // LensModel
  const lensTag = getTag('Exif', 'LensModel');
  if (lensTag) {
    if (phone.make === 'Apple') {
      const lensModels = [
        'iPhone back dual camera 4.2mm f/1.8',
        'iPhone back dual camera 6mm f/2.4',
        'iPhone back triple camera 4.2mm f/1.8',
        'iPhone back triple camera 6mm f/2.4',
        'iPhone back triple camera 1.5mm f/1.5',
      ];
      exifObj['Exif'][lensTag] = lensModels[randomInt(0, lensModels.length - 1)];
    } else {
      exifObj['Exif'][lensTag] = `${phone.model} rear camera`;
    }
  }

  // LensMake
  const lensMakeTag = getTag('Exif', 'LensMake');
  if (lensMakeTag) exifObj['Exif'][lensMakeTag] = phone.make;

  // Flash - typically 0 (no flash) for phone photos
  const flashTag = getTag('Exif', 'Flash');
  if (flashTag) exifObj['Exif'][flashTag] = randomInt(0, 1) === 0 ? 16 : 24; // 16=No flash, 24=Auto no fire

  // WhiteBalance
  const wbTag = getTag('Exif', 'WhiteBalance');
  if (wbTag) exifObj['Exif'][wbTag] = randomInt(0, 1); // 0=Auto, 1=Manual

  // ExposureMode
  const expModeTag = getTag('Exif', 'ExposureMode');
  if (expModeTag) exifObj['Exif'][expModeTag] = 0; // 0=Auto

  // MeteringMode
  const meterTag = getTag('Exif', 'MeteringMode');
  if (meterTag) exifObj['Exif'][meterTag] = randomInt(2, 5); // 2=Center, 3=Spot, 4=Multi, 5=Pattern

  // SceneCaptureType
  const sceneTag = getTag('Exif', 'SceneCaptureType');
  if (sceneTag) exifObj['Exif'][sceneTag] = 0; // 0=Standard

  // ExifVersion
  const exifVerTag = getTag('Exif', 'ExifVersion');
  if (exifVerTag) exifObj['Exif'][exifVerTag] = [0x30, 0x32, 0x33, 0x30]; // "0230"

  // ColorSpace
  const colorTag = getTag('Exif', 'ColorSpace');
  if (colorTag) exifObj['Exif'][colorTag] = 1; // sRGB

  // PixelXDimension / PixelYDimension
  const pxTag = getTag('Exif', 'PixelXDimension');
  const pyTag = getTag('Exif', 'PixelYDimension');
  if (pxTag && pyTag) {
    const imgDimensions = getImageDimensions(jpegBase64);
    if (imgDimensions) {
      exifObj['Exif'][pxTag] = imgDimensions.width;
      exifObj['Exif'][pyTag] = imgDimensions.height;
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

  // GPS Altitude
  const altTag = getTag('GPS', 'GPSAltitude');
  const altRefTag = getTag('GPS', 'GPSAltitudeRef');
  if (altTag && altRefTag) {
    const altitude = randomInt(0, 500); // 0-500m
    exifObj['GPS'][altRefTag] = 0; // Above sea level
    exifObj['GPS'][altTag] = [altitude, 1];
  }

  // GPS DateStamp
  const gpsDateTag = getTag('GPS', 'GPSDateStamp');
  if (gpsDateTag) {
    const date = new Date(dateTime);
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    exifObj['GPS'][gpsDateTag] = `${y}:${mo}:${d}`;
  }

  // GPS TimeStamp
  const gpsTimeTag = getTag('GPS', 'GPSTimeStamp');
  if (gpsTimeTag) {
    const date = new Date(dateTime);
    exifObj['GPS'][gpsTimeTag] = [
      [date.getHours(), 1],
      [date.getMinutes(), 1],
      [date.getSeconds(), 1],
    ];
  }

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

// ============ 辅助函数 ============

/**
 * 生成最近 N 个月内的随机时间
 */
export function getRandomTimeInRecentMonths(months: number = 3): Date {
  const now = Date.now();
  const msInMonth = 30 * 24 * 60 * 60 * 1000;
  const randomOffset = Math.random() * months * msInMonth;
  return new Date(now - randomOffset);
}

/**
 * 生成随机 GPS 偏移（在中心点附近 5km 范围内）
 */
export function getRandomGPSOffset(): { latOffset: number; lngOffset: number } {
  const maxOffset = 0.05; // ~5km
  return {
    latOffset: (Math.random() - 0.5) * 2 * maxOffset,
    lngOffset: (Math.random() - 0.5) * 2 * maxOffset,
  };
}

/**
 * EXIF 数据接口
 */
export interface ExifData {
  make: string;
  model: string;
  dateTime: string;
  latitude: number;
  longitude: number;
}

/**
 * 将 EXIF 数据写入图片 Blob
 */
export async function writeExifToBlob(
  imageBlob: Blob,
  exifData: ExifData
): Promise<Blob> {
  const arrayBuffer = await imageBlob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // 转为 base64
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const jpegBase64 = 'data:image/jpeg;base64,' + btoa(binary);

  // 构造 phone 和 country 对象以调用 writeExifToJpeg
  const phone = { make: exifData.make, model: exifData.model };
  const country = { gps: { lat: exifData.latitude, lng: exifData.longitude } };

  // 写入 EXIF
  const exifBase64 = await writeExifToJpeg(jpegBase64, phone as PhoneInfo, country as CountryInfo, exifData.dateTime);

  // 转回 Blob
  const byteString = atob(exifBase64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: 'image/jpeg' });
}

// ============ 内部辅助函数 ============

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 从 base64 JPEG 中提取图片尺寸
 */
function getImageDimensions(base64: string): { width: number; height: number } | null {
  try {
    const base64Data = base64.split(',')[1] || base64;
    const binary = atob(base64Data);
    // JPEG SOF0 marker at offset 0xFFC0
    for (let i = 0; i < binary.length - 10; i++) {
      if (binary.charCodeAt(i) === 0xFF && binary.charCodeAt(i + 1) === 0xC0) {
        const height = (binary.charCodeAt(i + 5) << 8) | binary.charCodeAt(i + 6);
        const width = (binary.charCodeAt(i + 7) << 8) | binary.charCodeAt(i + 8);
        return { width, height };
      }
    }
  } catch {
    // ignore
  }
  return null;
}
