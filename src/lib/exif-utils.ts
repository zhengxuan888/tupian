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
  if (softwareTag) {
    if (phone.make === 'Apple') {
      const [minVer, maxVer] = getIOSVersionRange(phone.model);
      const iosVer = `${randomInt(minVer, maxVer)}.${randomInt(0, 7)}.${randomInt(0, 3)}`;
      exifObj['0th'][softwareTag] = `${phone.model} iOS ${iosVer}`;
    } else {
      exifObj['0th'][softwareTag] = 'Camera';
    }
  }
  
  const dateTimeTag = getTag('0th', 'DateTime');
  if (dateTimeTag) exifObj['0th'][dateTimeTag] = exifDateTime;

  // Image dimensions
  const imgWidthTag = getTag('0th', 'ImageWidth');
  const imgHeightTag = getTag('0th', 'ImageLength');
  if (imgWidthTag && imgHeightTag) {
    const imgDimensions = getImageDimensions(jpegBase64);
    if (imgDimensions) {
      exifObj['0th'][imgWidthTag] = imgDimensions.width;
      exifObj['0th'][imgHeightTag] = imgDimensions.height;
    }
  }

  // Orientation - random rotation to simulate different shooting angles
  const orientationTag = getTag('0th', 'Orientation');
  if (orientationTag) {
    const orientations = [1, 1, 1, 1, 3, 6, 8]; // 1=normal (more common), 3=180°, 6=90° CW, 8=90° CCW
    exifObj['0th'][orientationTag] = orientations[randomInt(0, orientations.length - 1)];
  }

  // EXIF 缩略图（1st IFD）- 随机生成不同的缩略图
  try {
    const thumb = generateRandomThumbnail();
    exifObj['1st'] = {
      [getTag('0th', 'ImageWidth')]: thumb.width,
      [getTag('0th', 'ImageLength')]: thumb.height,
      [getTag('0th', 'Compression')]: 1, // Uncompressed
      [getTag('0th', 'PhotometricInterpretation')]: 2, // RGB
      [getTag('0th', 'StripOffsets')]: 0, // Will be fixed by piexifjs
      [getTag('0th', 'RowsPerStrip')]: thumb.height,
      [getTag('0th', 'StripByteCounts')]: thumb.data.length,
      [getTag('0th', 'JPEGInterchangeFormat')]: 0,
      [getTag('0th', 'JPEGInterchangeFormatLength')]: 0,
    };
    // 存储缩略图数据供后续处理
    (exifObj as any)._thumbnailData = thumb.data;
  } catch {
    // 缩略图生成失败不影响主流程
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

  // GPS IFD - with optional offset for batch consistency
  const baseLat = Math.max(-90, Math.min(90, country.gps.lat));
  const baseLng = Math.max(-180, Math.min(180, country.gps.lng));
  // Add small random offset (±0.001 degrees ≈ ±100m) for batch consistency
  const gpsLat = baseLat + (Math.random() - 0.5) * 0.002;
  const gpsLng = baseLng + (Math.random() - 0.5) * 0.002;
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
  /** GPS offset for batch consistency (±0.001 degrees) */
  gpsOffset?: { lat: number; lng: number };
  /** Time offset in seconds for batch consistency */
  timeOffset?: number;
  /** Random orientation (1-8) */
  orientation?: number;
  /** JPEG quality (0.85-0.95) */
  jpegQuality?: number;
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
  let jpegBase64 = 'data:image/jpeg;base64,' + btoa(binary);

  // 应用 JPEG 质量随机化
  if (exifData.jpegQuality && exifData.jpegQuality < 1) {
    jpegBase64 = await recompressJpeg(jpegBase64, exifData.jpegQuality);
  }

  // 构造 phone 和 country 对象以调用 writeExifToJpeg
  const phone = { make: exifData.make, model: exifData.model };
  const country = { gps: { lat: exifData.latitude, lng: exifData.longitude } };

  // 应用时间偏移（批次一致性）
  let dateTime = exifData.dateTime;
  if (exifData.timeOffset) {
    const date = new Date(dateTime);
    date.setSeconds(date.getSeconds() + exifData.timeOffset);
    dateTime = date.toISOString();
  }

  // 写入 EXIF
  const exifBase64 = await writeExifToJpeg(jpegBase64, phone as PhoneInfo, country as CountryInfo, dateTime);

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

/**
 * 生成随机文件名（模拟真实相机命名）
 */
export function generateRandomFileName(index?: number): string {
  const prefixes = ['IMG', 'DSC', 'DSCN', 'P'];
  const prefix = prefixes[randomInt(0, prefixes.length - 1)];
  const num = index !== undefined ? String(index).padStart(4, '0') : String(randomInt(1000, 9999));
  return `${prefix}_${num}.JPG`;
}

/**
 * 生成随机缩略图（用于 EXIF 1st IFD）
 */
function generateRandomThumbnail(): { width: number; height: number; data: Uint8Array } {
  // 生成一个 160x120 的随机彩色缩略图
  const width = 160;
  const height = 120;
  const data = new Uint8Array(width * height * 3);
  
  // 生成随机渐变色背景
  const r1 = randomInt(100, 200);
  const g1 = randomInt(100, 200);
  const b1 = randomInt(100, 200);
  const r2 = randomInt(100, 200);
  const g2 = randomInt(100, 200);
  const b2 = randomInt(100, 200);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const t = x / width;
      data[idx] = Math.floor(r1 + (r2 - r1) * t);
      data[idx + 1] = Math.floor(g1 + (g2 - g1) * t);
      data[idx + 2] = Math.floor(b1 + (b2 - b1) * t);
    }
  }
  
  return { width, height, data };
}

/**
 * 获取 iOS 版本范围（根据手机型号）
 */
function getIOSVersionRange(model: string): [number, number] {
  const modelLower = model.toLowerCase();
  if (modelLower.includes('iphone 15') || modelLower.includes('iphone 16')) return [17, 18];
  if (modelLower.includes('iphone 14')) return [16, 17];
  if (modelLower.includes('iphone 13')) return [15, 17];
  if (modelLower.includes('iphone 12')) return [14, 16];
  if (modelLower.includes('iphone 11')) return [13, 16];
  if (modelLower.includes('iphone x')) return [11, 15];
  if (modelLower.includes('iphone 8') || modelLower.includes('iphone 7')) return [11, 14];
  return [15, 17]; // 默认
}

/**
 * 生成 ICC sRGB 色彩配置（简化版）
 */
function generateICCsRGB(): Uint8Array {
  // 简化的 sRGB ICC 配置（实际应该使用完整的 ICC 配置）
  // 这里生成一个最小的有效 ICC 配置
  const header = new Uint8Array([
    0x00, 0x00, 0x01, 0x1C, // 配置大小
    0x61, 0x70, 0x70, 0x6C, // 'appl'
    0x00, 0x00, 0x00, 0x00, // 保留
    0x6D, 0x6E, 0x74, 0x72, // 'mntr'
    0x52, 0x47, 0x42, 0x20, // 'RGB '
    0x58, 0x59, 0x5A, 0x20, // 'XYZ '
    0x00, 0x00, 0x00, 0x00, // 日期
    0x61, 0x63, 0x73, 0x70, // 'acsp'
    0x41, 0x50, 0x50, 0x4C, // 'APPL'
  ]);
  return header;
}

/**
 * 重新压缩 JPEG（用于质量随机化）
 */
async function recompressJpeg(jpegBase64: string, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Failed to recompress JPEG'));
    img.src = jpegBase64;
  });
}

// ============ 批次一致性辅助函数 ============

/**
 * 生成批次 GPS 偏移（同一批次内 GPS 坐标相近，±100m）
 */
export function generateBatchGpsOffset(): { lat: number; lng: number } {
  return {
    lat: (Math.random() - 0.5) * 0.002, // ±0.001 degrees ≈ ±100m
    lng: (Math.random() - 0.5) * 0.002,
  };
}

/**
 * 生成批次时间偏移（同一批次内拍摄时间连续，相隔 30-180 秒）
 */
export function generateBatchTimeOffset(index: number): number {
  // 第一张为基准，后续每张相隔 30-180 秒
  if (index === 0) return 0;
  let offset = 0;
  for (let i = 1; i <= index; i++) {
    offset += randomInt(30, 180);
  }
  return offset;
}

/**
 * 清除图片原有 EXIF（返回干净的 JPEG）
 */
export async function stripExif(imageBase64: string): Promise<string> {
  if (!piexif) return imageBase64;
  try {
    // 加载并重新 dump，不保留任何原有 EXIF
    const exifObj = piexif.load(imageBase64);
    // 清空所有 IFD
    exifObj['0th'] = {};
    exifObj['Exif'] = {};
    exifObj['GPS'] = {};
    exifObj['1st'] = {};
    const cleanExif = piexif.dump(exifObj);
    return piexif.insert(cleanExif, imageBase64);
  } catch {
    return imageBase64;
  }
}
