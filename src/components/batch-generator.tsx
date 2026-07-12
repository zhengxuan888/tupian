'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  Loader2,
  Download,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { simpleRemoveBackground, generateBackgroundImage, compositeImages } from '@/lib/ai-utils';
import { writeExifToBlob, getRandomTimeInRecentMonths, getRandomGPSOffset, type ExifData } from '@/lib/exif-utils';
import { COUNTRIES, countryCodeToFlag } from '@/lib/countries';
import { PHONES } from '@/lib/phones';
import JSZip from 'jszip';

// Preset background descriptions
const PRESET_BACKGROUNDS = [
  'Product on a clean white marble table, soft natural light from a window, minimalist style',
  'Product on a warm wooden desk, cozy home office setting, warm lighting',
  'Product on a modern glass shelf, bright contemporary room, blue accent lighting',
  'Product on a rustic wooden table, vintage style, warm golden hour light',
  'Product on a sleek black surface, dramatic studio lighting, luxury feel',
  'Product on a green garden table, outdoor setting, natural sunlight, plants in background',
  'Product on a kitchen counter, modern kitchen background, bright daylight',
  'Product on a bedside table, cozy bedroom setting, soft warm lamp light',
];

interface BatchItem {
  id: number;
  backgroundDesc: string;
  country: string;
  countryCode: string;
  phoneMake: string;
  phoneModel: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  resultBlob?: Blob;
  resultUrl?: string;
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomExif() {
  const country = getRandomItem(COUNTRIES);
  const phone = getRandomItem(PHONES);
  const dateTime = getRandomTimeInRecentMonths(3);
  const gpsOffset = getRandomGPSOffset();

  return {
    country: country.name,
    countryCode: country.code,
    flag: countryCodeToFlag(country.code),
    phoneMake: phone.make,
    phoneModel: phone.model,
    dateTime,
    gps: {
      lat: country.gps.lat + gpsOffset.latOffset,
      lng: country.gps.lng + gpsOffset.lngOffset,
    },
  };
}

export function BatchGenerator() {
  const [sourceImage, setSourceImage] = useState<File | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string>('');
  const [backgroundText, setBackgroundText] = useState('');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSourceImage(file);
    const url = URL.createObjectURL(file);
    setSourcePreview(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // Generate batch items from background descriptions
  const generateBatchItems = useCallback(() => {
    if (!sourceImage) return;

    const lines = backgroundText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const items: BatchItem[] = lines.map((desc, index) => {
      const exif = generateRandomExif();
      return {
        id: Date.now() + index,
        backgroundDesc: desc,
        country: exif.country,
        countryCode: exif.countryCode,
        phoneMake: exif.phoneMake,
        phoneModel: exif.phoneModel,
        status: 'pending',
      };
    });

    setBatchItems(items);
  }, [sourceImage, backgroundText]);

  // Use preset backgrounds
  const applyPresets = useCallback((count: number) => {
    const selected = PRESET_BACKGROUNDS.slice(0, count).join('\n');
    setBackgroundText(selected);
  }, []);

  // Regenerate EXIF for all items
  const regenerateExif = useCallback(() => {
    setBatchItems((prev) =>
      prev.map((item) => {
        const exif = generateRandomExif();
        return {
          ...item,
          country: exif.country,
          countryCode: exif.countryCode,
          phoneMake: exif.phoneMake,
          phoneModel: exif.phoneModel,
          status: 'pending' as const,
          error: undefined,
          resultBlob: undefined,
          resultUrl: undefined,
        };
      })
    );
  }, []);

  // Process all batch items
  const processAll = useCallback(async () => {
    if (!sourceImage || batchItems.length === 0) return;

    setIsProcessing(true);
    setProgress({ current: 0, total: batchItems.length });

    // Read source image as data URL once
    const sourceDataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(sourceImage);
    });

    // Load source image as HTMLImageElement for dimensions
    const img = new Image();
    img.src = sourceDataUrl;
    await new Promise((resolve) => { img.onload = resolve; });

    // Remove background once
    let foregroundDataUrl: string;
    try {
      const fgCanvas = await simpleRemoveBackground(sourceImage);
      // Convert canvas to blob then to dataURL
      const fgBlob = await new Promise<Blob>((resolve, reject) => {
        fgCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to convert canvas to blob'));
        }, 'image/png');
      });
      foregroundDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fgBlob);
      });
    } catch {
      // If background removal fails, use original image
      foregroundDataUrl = sourceDataUrl;
    }

    const updatedItems = [...batchItems];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      setBatchItems((prev) => prev.map((p, idx) => (idx === i ? { ...p, status: 'processing' } : p)));

      try {
        // Generate background
        const bgDataUrl = await generateBackgroundImage(item.backgroundDesc);

        // Convert foreground dataURL to canvas for compositeImages
        const fgCanvas = document.createElement('canvas');
        fgCanvas.width = img.width;
        fgCanvas.height = img.height;
        const fgCtx = fgCanvas.getContext('2d');
        if (!fgCtx) throw new Error('Failed to get canvas context');
        fgCtx.drawImage(img, 0, 0);

        // Composite
        const compositedBlob = await compositeImages(fgCanvas, bgDataUrl);

        // Generate EXIF data
        const exif = generateRandomExif();

        // Write EXIF
        const resultBlob = await writeExifToBlob(compositedBlob, {
          make: exif.phoneMake,
          model: exif.phoneModel,
          dateTime: exif.dateTime.toISOString(),
          latitude: exif.gps.lat,
          longitude: exif.gps.lng,
        });

        const resultUrl = URL.createObjectURL(resultBlob);

        updatedItems[i] = {
          ...item,
          country: exif.country,
          countryCode: exif.countryCode,
          phoneMake: exif.phoneMake,
          phoneModel: exif.phoneModel,
          status: 'done',
          resultBlob,
          resultUrl,
        };
      } catch (err) {
        updatedItems[i] = {
          ...item,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        };
      }

      setBatchItems([...updatedItems]);
      setProgress({ current: i + 1, total: batchItems.length });
    }

    setIsProcessing(false);
  }, [sourceImage, batchItems]);

  // Download all as ZIP
  const downloadAll = useCallback(async () => {
    const doneItems = batchItems.filter((item) => item.status === 'done' && item.resultBlob);
    if (doneItems.length === 0) return;

    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    for (const item of doneItems) {
      const folderName = `${item.country}_${item.phoneModel.replace(/\s+/g, '_')}_${timestamp}`;
      const arrayBuffer = await item.resultBlob!.arrayBuffer();
      zip.file(`${folderName}/image.jpg`, arrayBuffer);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch_${doneItems.length}images_${timestamp}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [batchItems]);

  // Clear all
  const clearAll = useCallback(() => {
    batchItems.forEach((item) => {
      if (item.resultUrl) URL.revokeObjectURL(item.resultUrl);
    });
    setBatchItems([]);
    setSourceImage(null);
    setSourcePreview('');
    setBackgroundText('');
  }, [batchItems]);

  const doneCount = batchItems.filter((i) => i.status === 'done').length;
  const errorCount = batchItems.filter((i) => i.status === 'error').length;

  return (
    <div className="space-y-5">
      {/* Step 1: Upload product image */}
      <div className="rounded-2xl border border-black/6 bg-white/80 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white">
            1
          </div>
          <h3 className="text-sm font-semibold text-[#1a1a2e]">上传产品图</h3>
          <span className="text-xs text-muted-foreground">（一张产品图，生成多张不同场景图）</span>
        </div>

        {!sourcePreview ? (
          <div
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 transition-all ${
              isDragging
                ? 'border-indigo-400 bg-indigo-50/50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/50'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-500">拖拽产品图到此处，或点击上传</p>
            <p className="mt-1 text-xs text-gray-400">支持 JPG / PNG / WebP</p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <img
              src={sourcePreview}
              alt="Source"
              className="h-24 w-24 rounded-lg object-cover shadow-sm"
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#1a1a2e]">{sourceImage?.name}</p>
              <p className="text-xs text-muted-foreground">
                {sourceImage && (sourceImage.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-red-500"
              onClick={() => {
                setSourceImage(null);
                setSourcePreview('');
                URL.revokeObjectURL(sourcePreview);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>

      {/* Step 2: Background descriptions */}
      <div className="rounded-2xl border border-black/6 bg-white/80 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white">
            2
          </div>
          <h3 className="text-sm font-semibold text-[#1a1a2e]">设置背景描述</h3>
          <span className="text-xs text-muted-foreground">（每行一个背景，生成几张就写几行）</span>
        </div>

        <Textarea
          placeholder={`每行写一个背景描述，例如：\nProduct on a white marble table, soft natural light\nProduct on a wooden desk, warm lighting\nProduct on a glass shelf, modern room\n\n也可以用英文描述，效果更好`}
          value={backgroundText}
          onChange={(e) => setBackgroundText(e.target.value)}
          className="min-h-[120px] resize-none rounded-[10px] border-black/8 text-sm"
          rows={5}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">快速填入：</span>
          {[3, 5, 8].map((n) => (
            <Button
              key={n}
              variant="outline"
              size="sm"
              className="h-7 rounded-lg border-black/8 text-xs"
              onClick={() => applyPresets(n)}
            >
              {n} 个预设背景
            </Button>
          ))}
        </div>
      </div>

      {/* Step 3: Generate batch items */}
      <div className="rounded-2xl border border-black/6 bg-white/80 p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-[11px] font-bold text-white">
            3
          </div>
          <h3 className="text-sm font-semibold text-[#1a1a2e]">生成批次</h3>
        </div>

        {batchItems.length === 0 ? (
          <Button
            className="h-10 w-full rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 text-sm font-medium text-white shadow-[0_2px_8px_-2px_rgba(99,102,241,0.4)] transition-all hover:translate-y-[-1px] hover:shadow-[0_4px_12px_-2px_rgba(99,102,241,0.5)]"
            disabled={!sourceImage || !backgroundText.trim()}
            onClick={generateBatchItems}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            生成配置列表
          </Button>
        ) : (
          <div className="space-y-3">
            {/* Batch items list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {batchItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-black/6 bg-white/60 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                    {index + 1}
                  </span>

                  {item.status === 'done' && item.resultUrl ? (
                    <img
                      src={item.resultUrl}
                      alt={`Result ${index + 1}`}
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <ImageIcon className="h-5 w-5 text-gray-300" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#1a1a2e]">
                      {item.backgroundDesc.slice(0, 50)}
                      {item.backgroundDesc.length > 50 ? '...' : ''}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {countryCodeToFlag(item.countryCode)} {item.country}
                      </span>
                      <span>·</span>
                      <span>
                        {item.phoneMake} {item.phoneModel}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.status === 'pending' && (
                      <span className="text-xs text-gray-400">等待中</span>
                    )}
                    {item.status === 'processing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    )}
                    {item.status === 'done' && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-9 flex-1 rounded-[10px] border-black/8 text-xs"
                onClick={regenerateExif}
                disabled={isProcessing}
              >
                重新随机 EXIF
              </Button>
              {!isProcessing && doneCount === 0 && (
                <Button
                  className="h-9 flex-1 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-600 text-xs font-medium text-white shadow-[0_2px_8px_-2px_rgba(99,102,241,0.4)]"
                  onClick={processAll}
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                  开始生成 ({batchItems.length} 张)
                </Button>
              )}
              {isProcessing && (
                <Button className="h-9 flex-1 rounded-[10px] bg-gray-400 text-xs text-white" disabled>
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  处理中 {progress.current}/{progress.total}
                </Button>
              )}
              {doneCount > 0 && !isProcessing && (
                <Button
                  className="h-9 flex-1 rounded-[10px] bg-gradient-to-r from-emerald-500 to-teal-600 text-xs font-medium text-white shadow-[0_2px_8px_-2px_rgba(16,185,129,0.4)]"
                  onClick={downloadAll}
                >
                  <Download className="mr-1 h-3.5 w-3.5" />
                  下载全部 ({doneCount} 张)
                </Button>
              )}
            </div>

            {/* Summary */}
            {(doneCount > 0 || errorCount > 0) && !isProcessing && (
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-muted-foreground">
                {doneCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {doneCount} 张成功
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-500">
                    <AlertCircle className="h-3.5 w-3.5" /> {errorCount} 张失败
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Package className="h-3.5 w-3.5" /> 每张独立文件夹
                </span>
              </div>
            )}

            {/* Clear */}
            {!isProcessing && (
              <Button
                variant="ghost"
                className="h-8 w-full rounded-[10px] text-xs text-gray-400 hover:text-red-500"
                onClick={clearAll}
              >
                <Trash2 className="mr-1 h-3 w-3" />
                清空全部
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
