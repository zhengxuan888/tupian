'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  X,
  Download,
  Copy,
  Trash2,
  Image as ImageIcon,
  Settings2,
  CheckCircle2,
  Search,
  Plus,
  Globe,
  Camera,
  Wand2,
  Eraser,
  Loader2,
  FolderOpen,
  AlertTriangle,
  HelpCircle,
  Info,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AIBackground } from '@/components/ai-background';
import { WatermarkRemoval } from '@/components/watermark-removal';
import { PHONES, getPhoneLabel } from '@/lib/phones';
import { COUNTRIES, REGIONS, countryCodeToFlag } from '@/lib/countries';
import { writeExifToJpeg } from '@/lib/exif-utils';
import { fileToBase64WithHeic, isHeic, heicToJpegFile } from '@/lib/heic-utils';
import { exportToDirectory, canPickDirectory, createZipAndDownload, type ProcessedImage, type ExportResult } from '@/lib/zip-utils';

interface PhotoFile {
  id: string;
  file: File;
  base64: string;
  preview: string;
}

interface ConfigSet {
  id: string;
  countryCode: string;
  phoneIndex: number;
  dateTime: string;
  note: string;
}

interface OutputSettings {
  format: 'jpeg' | 'png';
  quality: number; // 1-100, JPEG quality
  maxSizeKB: number; // 0 = no limit
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getDefaultDateTime(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function getRandomDateTime(): string {
  const now = Date.now();
  const threeMonthsAgo = now - 90 * 24 * 60 * 60 * 1000;
  const randomTime = threeMonthsAgo + Math.random() * (now - threeMonthsAgo);
  const date = new Date(randomTime);
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

function getRandomPhoneIndex(): number {
  return Math.floor(Math.random() * PHONES.length);
}

export default function Home() {
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [sets, setSets] = useState<ConfigSet[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [processingMsg, setProcessingMsg] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState('europe');
  const [searchQuery, setSearchQuery] = useState('');
  const [batchCount, setBatchCount] = useState('');
  const [outputSettings, setOutputSettings] = useState<OutputSettings>({
    format: 'jpeg',
    quality: 92,
    maxSizeKB: 0,
  });
  const [canPickDir, setCanPickDir] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [browserWarning, setBrowserWarning] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Check browser compatibility + File System Access API
  useEffect(() => {
    setCanPickDir(canPickDirectory());
    setMounted(true);

    // Browser detection
    const ua = navigator.userAgent;
    const isFirefox = ua.includes('Firefox');
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isOldChrome = /Chrome\/(\d+)/.test(ua) && parseInt(RegExp.$1) < 100;

    if (isFirefox) {
      setBrowserWarning('firefox');
    } else if (isSafari) {
      setBrowserWarning('safari');
    } else if (isOldChrome) {
      setBrowserWarning('old-chrome');
    }
  }, []);

  // Memory cleanup: revoke all object URLs when clearing photos
  const clearAllPhotos = useCallback(() => {
    setPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return [];
    });
  }, []);

  // Photo upload handlers
  const addPhotos = useCallback(async (files: FileList | File[]) => {
    const allFiles = Array.from(files);
    const imageFiles = allFiles.filter((f) =>
      f.type.startsWith('image/') || isHeic(f)
    );

    if (imageFiles.length === 0) {
      alert('未识别到图片文件。支持 JPG / PNG / WebP / HEIC 等格式。');
      return;
    }

    setProcessingMsg('正在处理图片...');
    const newPhotos: PhotoFile[] = [];
    const failedFiles: string[] = [];
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

    for (const file of imageFiles) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        failedFiles.push(`${file.name} (超过50MB)`);
        continue;
      }

      try {
        let processedFile = file;
        let base64: string;

        if (isHeic(file)) {
          setProcessingMsg(`正在转换 HEIC 图片: ${file.name}...`);
          processedFile = await heicToJpegFile(file);
          base64 = await fileToBase64WithHeic(processedFile);
        } else {
          base64 = await fileToBase64WithHeic(file);
        }

        newPhotos.push({
          id: generateId(),
          file: processedFile,
          base64,
          preview: URL.createObjectURL(processedFile),
        });
      } catch (err) {
        console.error('Failed to process file:', file.name, err);
        failedFiles.push(file.name);
      }
    }

    setProcessingMsg(null);

    if (failedFiles.length > 0) {
      alert(`以下图片处理失败：\n${failedFiles.join('\n')}\n\n请尝试将图片转为 JPG 格式后重试。`);
    }

    if (newPhotos.length > 0) {
      const totalPhotos = photos.length + newPhotos.length;
      if (totalPhotos > 200) {
        alert(`最多支持 200 张照片。当前已有 ${photos.length} 张，本次添加 ${newPhotos.length} 张，共 ${totalPhotos} 张。\n\n请分批处理，每次建议 50-100 张。`);
        setProcessingMsg(null);
        return;
      }
      if (totalPhotos > 100) {
        alert(`提示：当前共有 ${totalPhotos} 张图片。建议分批处理（每次 50-100 张）以获得最佳体验。`);
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  }, [isHeic, heicToJpegFile, fileToBase64WithHeic]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      // Check if dropped items contain folders
      const items = e.dataTransfer.items;
      if (items && items.length > 0) {
        const entries: FileSystemEntry[] = [];
        for (let i = 0; i < items.length; i++) {
          const entry = items[i].webkitGetAsEntry?.();
          if (entry) entries.push(entry);
        }

        const hasFolder = entries.some((e) => e.isDirectory);
        if (hasFolder) {
          // Process folders recursively
          const filePromises: Promise<File[]>[] = [];
          const readDir = (dirReader: FileSystemDirectoryReader): Promise<File[]> => {
            return new Promise((resolve) => {
              const files: File[] = [];
              let pending = 0;
              const readEntries = () => {
                dirReader.readEntries(async (entries) => {
                  if (entries.length === 0) {
                    if (pending === 0) resolve(files);
                    return;
                  }
                  for (const entry of Array.from(entries)) {
                    if (entry.isFile) {
                      pending++;
                      (entry as FileSystemFileEntry).file((file) => {
                        if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
                          files.push(file);
                        }
                        pending--;
                        if (pending === 0) readEntries();
                      });
                    } else if (entry.isDirectory) {
                      pending++;
                      readDir((entry as FileSystemDirectoryEntry).createReader()).then((subFiles) => {
                        files.push(...subFiles);
                        pending--;
                        readEntries();
                      });
                    }
                  }
                });
              };
              readEntries();
            });
          };

          for (const entry of entries) {
            if (entry.isFile) {
              filePromises.push(
                new Promise<File[]>((resolve) => {
                  (entry as FileSystemFileEntry).file((file) => {
                    if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
                      resolve([file]);
                    } else {
                      resolve([]);
                    }
                  });
                })
              );
            } else if (entry.isDirectory) {
              filePromises.push(readDir((entry as FileSystemDirectoryEntry).createReader()));
            }
          }

          Promise.all(filePromises).then((fileArrays) => {
            const allFiles = fileArrays.flat();
            if (allFiles.length > 0) {
              addPhotos(allFiles);
            }
          });
          return;
        }
      }

      // Regular file drop
      if (e.dataTransfer.files.length > 0) {
        addPhotos(e.dataTransfer.files);
      }
    },
    [addPhotos]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  // Set management handlers
  const addSetWithCountry = useCallback((countryCode: string) => {
    const newSet: ConfigSet = {
      id: generateId(),
      countryCode,
      phoneIndex: 0,
      dateTime: getDefaultDateTime(),
      note: '',
    };
    setSets((prev) => [...prev, newSet]);
  }, []);

  const updateSet = useCallback(
    (id: string, field: keyof ConfigSet, value: string | number) => {
      setSets((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );
    },
    []
  );

  const removeSet = useCallback((id: string) => {
    setSets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const duplicateSet = useCallback((id: string) => {
    setSets((prev) => {
      const source = prev.find((s) => s.id === id);
      if (!source) return prev;
      const newSet: ConfigSet = { ...source, id: generateId() };
      const idx = prev.findIndex((s) => s.id === id);
      const result = [...prev];
      result.splice(idx + 1, 0, newSet);
      return result;
    });
  }, []);

  // Batch generate: create N sets with random country/phone/time
  const handleBatchGenerate = useCallback(() => {
    const count = parseInt(batchCount);
    if (isNaN(count) || count <= 0 || count > 500) return;
    const newSets: ConfigSet[] = [];
    for (let i = 0; i < count; i++) {
      const randomCountry = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
      newSets.push({
        id: generateId(),
        countryCode: randomCountry.code,
        phoneIndex: getRandomPhoneIndex(),
        dateTime: getRandomDateTime(),
        note: '',
      });
    }
    setSets((prev) => [...prev, ...newSets]);
    setBatchCount('');
  }, [batchCount]);

  // Batch add: add N sets for a specific country
  const batchAddCountry = useCallback(
    (countryCode: string, count: number) => {
      const newSets: ConfigSet[] = [];
      for (let i = 0; i < count; i++) {
        newSets.push({
          id: generateId(),
          countryCode,
          phoneIndex: getRandomPhoneIndex(),
          dateTime: getRandomDateTime(),
          note: '',
        });
      }
      setSets((prev) => [...prev, ...newSets]);
    },
    []
  );

  // Filtered countries based on region and search
  const filteredCountries = useMemo(() => {
    let result = COUNTRIES;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.name.includes(q) ||
          c.nameEn.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q)
      );
    } else {
      result = result.filter((c) => c.region === activeRegion);
    }
    return result;
  }, [activeRegion, searchQuery]);

  // Count of sets per country code
  const countrySetCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sets) {
      counts[s.countryCode] = (counts[s.countryCode] || 0) + 1;
    }
    return counts;
  }, [sets]);

  // Generate handler with comprehensive error handling
  const handleGenerate = useCallback(async () => {
    if (photos.length === 0) {
      alert('请先上传图片');
      return;
    }
    if (sets.length === 0) {
      alert('请至少添加一套配置（选择国家、手机型号等）');
      return;
    }

    // Validate all configs have valid country and phone
    const invalidConfigs = sets.filter(s => {
      const country = COUNTRIES.find(c => c.code === s.countryCode);
      const phone = PHONES[s.phoneIndex];
      return !country || !phone;
    });
    if (invalidConfigs.length > 0) {
      alert(`有 ${invalidConfigs.length} 套配置无效，请检查国家和手机型号是否正确`);
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setProgressText('准备处理...');

    // Yield to browser after every image to prevent UI freeze
    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

    try {
      const totalSteps = sets.length * photos.length;
      let currentStep = 0;
      const processedImages: ProcessedImage[] = [];
      const errors: string[] = [];

      for (const configSet of sets) {
        const country = COUNTRIES.find((c) => c.code === configSet.countryCode);
        const phone = PHONES[configSet.phoneIndex];
        if (!country || !phone) continue;

        for (const photo of photos) {
          try {
            setProgressText(`正在处理: ${country.name} - ${photo.file.name} (${currentStep + 1}/${totalSteps})`);
            
            const resultBase64 = await writeExifToJpeg(
              photo.base64,
              phone,
              country,
              configSet.dateTime,
              configSet.note
            );

            if (!resultBase64 || resultBase64.length < 100) {
              errors.push(`${photo.file.name} - ${country.name}: EXIF 写入失败`);
              currentStep++;
              continue;
            }

            processedImages.push({
              countryName: `${country.name}_${country.code}`,
              configId: configSet.id,
              fileName: `${photo.file.name.replace(/\.(png|webp|bmp|gif|tiff?)$/i, '')}_${configSet.id}.jpg`,
              data: resultBase64,
            });
          } catch (err) {
            console.error('EXIF write error:', err);
            errors.push(`${photo.file.name} - ${country.name}: ${err instanceof Error ? err.message : '处理失败'}`);
          }
          
          currentStep++;
          setProgress(Math.round((currentStep / totalSteps) * 100));
          
          // Yield to browser to prevent UI freeze
          await yieldToBrowser();
        }
      }

      if (processedImages.length === 0) {
        alert('所有图片处理失败，请检查图片格式是否正确（支持 JPG/PNG/WebP）\n\n' + errors.slice(0, 5).join('\n'));
        return;
      }

      setProgressText('正在导出文件...');
      
      // Try directory export first, fallback to ZIP download
      let result: ExportResult;
      if (canPickDir) {
        try {
          result = await exportToDirectory(processedImages);
        } catch (dirErr) {
          console.warn('Directory export failed, falling back to ZIP:', dirErr);
          // Fallback to ZIP download
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          result = await createZipAndDownload(processedImages, `择优臻选_${timestamp}`);
        }
      } else {
        // Use ZIP download if directory picker not available
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        result = await createZipAndDownload(processedImages, `择优臻选_${timestamp}`);
      }

      setProgressText(result.message || (result.success ? '导出完成' : '导出失败'));
      setProgress(100);

      // Show errors if any
      if (errors.length > 0) {
        setTimeout(() => {
          alert(`处理完成，但有 ${errors.length} 张图片失败：\n\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? '\n...' : ''}`);
        }, 500);
      }
    } catch (err) {
      console.error('Processing error:', err);
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      alert(`处理出错：${errorMsg}\n\n请刷新页面后重试。如果问题持续，请检查：\n1. 图片格式是否为 JPG/PNG/WebP\n2. 浏览器内存是否充足\n3. 尝试减少同时处理的图片数量`);
      setProgressText('处理出错');
    } finally {
      setIsProcessing(false);
    }
  }, [photos, sets, canPickDir, outputSettings]);

  const totalOutput = sets.length * photos.length;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-[1200px] px-6 py-8">
        {/* Header */}
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
              AI
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent leading-tight">
                择优臻选出海
                <br />
                <span className="text-lg font-semibold">图片处理器</span>
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                EXIF 批量写入 · AI 背景合成 · 去水印
              </p>
            </div>
          </div>
        </header>

        {/* Browser Warning */}
        {mounted && browserWarning && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 backdrop-blur-sm p-4 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {browserWarning === 'firefox' && '检测到 Firefox 浏览器'}
                {browserWarning === 'safari' && '检测到 Safari 浏览器'}
                {browserWarning === 'old-chrome' && '检测到旧版 Chrome 浏览器'}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {browserWarning === 'firefox' && '部分功能（如文件夹选择）可能不可用。建议使用 Chrome 或 Edge 浏览器以获得最佳体验。'}
                {browserWarning === 'safari' && '部分功能（如文件夹选择）可能不可用。建议使用 Chrome 或 Edge 浏览器以获得最佳体验。'}
                {browserWarning === 'old-chrome' && '浏览器版本过旧，建议更新到最新版 Chrome 以确保所有功能正常。'}
              </p>
            </div>
          </div>
        )}

        {/* Usage Guide Toggle */}
        {mounted && (
          <div className="mb-6">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span>使用须知与最佳实践</span>
              <span className="text-xs">{showGuide ? '收起' : '展开'}</span>
            </button>
            {showGuide && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm p-5 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-indigo-500" />
                      使用须知
                    </h4>
                    <ul className="space-y-1.5 text-slate-600 text-xs">
                      <li>• 所有图片处理在浏览器本地完成，不会上传到服务器</li>
                      <li>• 推荐使用 Chrome 或 Edge 浏览器（最新版）</li>
                      <li>• 建议每次处理 50-100 张图片，避免浏览器内存不足</li>
                      <li>• 单张图片不超过 50MB</li>
                      <li>• 处理过程中请勿关闭或刷新页面</li>
                      <li>• AI 背景合成需要网络连接，首次使用需下载模型（约 170MB）</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      最佳实践
                    </h4>
                    <ul className="space-y-1.5 text-slate-600 text-xs">
                      <li>• 上传前先整理好图片，按批次处理</li>
                      <li>• EXIF 写入仅支持 JPG 格式，PNG/WebP 会自动转换</li>
                      <li>• 使用"文件夹导出"功能（Chrome/Edge）可直接保存到本地文件夹</li>
                      <li>• 多套配置时每套会生成独立文件夹，方便管理</li>
                      <li>• 如遇页面卡顿，请减少同时处理的图片数量</li>
                      <li>• 处理完成后建议关闭不用的标签页释放内存</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">常见问题：</span>
                    页面卡死 → 减少图片数量 | 导出失败 → 换用 ZIP 下载 | EXIF 不显示 → 确认是 JPG 格式 | AI 功能慢 → 检查网络连接
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <Tabs defaultValue="exif" className="space-y-6">
          <TabsList className="w-full h-12 bg-white/60 backdrop-blur-sm border border-white/60 rounded-xl shadow-sm">
            <TabsTrigger value="exif" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">
              <Camera className="w-4 h-4" />
              EXIF 批量写入
            </TabsTrigger>
            <TabsTrigger value="ai-bg" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">
              <Wand2 className="w-4 h-4" />
              AI 背景合成
            </TabsTrigger>
            <TabsTrigger value="watermark" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm transition-all">
              <Eraser className="w-4 h-4" />
              去水印
            </TabsTrigger>
          </TabsList>

          <TabsContent value="exif" className="space-y-6">        {/* Step 1: Upload */}
        <Card className="mb-6 shadow-premium border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs text-white font-semibold shadow-sm">
                1
              </span>
              <CardTitle className="text-lg font-semibold text-foreground">上传照片</CardTitle>
              {photos.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 border-blue-100">
                  {photos.length} 张
                </Badge>
              )}
              {photos.length > 100 && (
                <Badge variant="secondary" className="ml-1 bg-amber-50 text-amber-700 border-amber-100 text-xs">
                  内存占用较高
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-600">
                拖拽图片或文件夹到此处，或点击选择
              </p>
              <p className="mt-1 text-xs text-slate-400">
                支持 JPG / PNG / WebP / HEIC（苹果手机），可多选，支持整个文件夹
              </p>
              {processingMsg && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {processingMsg}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addPhotos(e.target.files);
                  e.target.value = '';
                }}
              />
              <input
                ref={folderInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addPhotos(e.target.files);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-[10px] border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                选择图片
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-[10px] border-slate-200 text-slate-600 hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
              >
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                选择文件夹
              </Button>
              {photos.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-[10px] border-red-200 text-red-600 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定清空全部 ${photos.length} 张图片吗？`)) {
                      clearAllPhotos();
                    }
                  }}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  清空
                </Button>
              )}
            </div>

            {photos.length > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.preview}
                      alt={photo.file.name}
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(photo.id);
                      }}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <p className="mt-1 truncate text-[10px] text-slate-400">
                      {photo.file.name}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Country Quick Select */}
        <Card className="mb-6 shadow-premium border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs text-white font-semibold shadow-sm">
                  2
                </span>
                <CardTitle className="text-lg font-semibold text-foreground">选择国家</CardTitle>
                {sets.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 border-blue-100">
                    已选 {sets.length} 个
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-400 ml-8">
              点击国家卡片快速添加一套配置，已添加的国家会高亮显示
            </p>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="搜索国家名称或代码..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Region Tabs (hidden when searching) */}
            {!searchQuery && (
              <div className="mb-4 flex items-center gap-1.5 flex-wrap">
                {REGIONS.map((region) => (
                  <button
                    key={region.key}
                    onClick={() => setActiveRegion(region.key)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      activeRegion === region.key
                        ? 'bg-blue-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {region.label}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => {
                      const regionCountries = COUNTRIES.filter(
                        (c) => c.region === activeRegion
                      );
                      for (const c of regionCountries) {
                        addSetWithCountry(c.code);
                      }
                    }}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200"
                  >
                    全选当前区域
                  </button>
                  {sets.length > 0 && (
                    <button
                      onClick={() => setSets([])}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      清空全部
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Country Grid */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {filteredCountries.map((country) => {
                const count = countrySetCounts[country.code] || 0;
                return (
                  <div
                    key={country.code}
                    className={`group relative flex flex-col items-center rounded-xl border p-3 transition-all duration-200 ${
                      count > 0
                        ? 'border-blue-200 bg-gradient-to-b from-blue-50 to-indigo-50/50 ring-1 ring-blue-100 shadow-sm'
                        : 'border-slate-200/80 bg-white hover:border-blue-200 hover:bg-gradient-to-b hover:from-blue-50/50 hover:to-transparent hover:shadow-sm'
                    }`}
                  >
                    {count > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-1 text-[10px] font-bold text-white shadow-sm">
                        {count}
                      </span>
                    )}
                    <span className="text-2xl mb-0.5 drop-shadow-sm">
                      {countryCodeToFlag(country.code)}
                    </span>
                    <span className="text-xs font-medium text-slate-700">
                      {country.name}
                    </span>
                    <span className="text-[10px] text-slate-400 mb-2">
                      {country.nameEn}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => addSetWithCountry(country.code)}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                        title="添加 1 套"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => batchAddCountry(country.code, 5)}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                        title="批量添加 5 套"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => batchAddCountry(country.code, 10)}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                        title="批量添加 10 套"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredCountries.length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                没有找到匹配的国家
              </div>
            )}

            {/* Batch Generate */}
            <div className="mt-5 flex items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700">
                  一键批量生成
                </p>
                <p className="text-xs text-slate-400">
                  随机分配国家、手机型号，时间在最近 3 个月内随机生成
                </p>
              </div>
              <Input
                type="number"
                placeholder="数量"
                value={batchCount}
                onChange={(e) => setBatchCount(e.target.value)}
                className="w-24 h-9"
                min={1}
                max={500}
              />
              <Button
                onClick={handleBatchGenerate}
                disabled={!batchCount || parseInt(batchCount) <= 0}
                size="sm"
                className="bg-blue-800 hover:bg-blue-900"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                生成
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Configure Details */}
        <Card className="mb-6 shadow-premium border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs text-white font-semibold shadow-sm">
                  3
                </span>
                <CardTitle className="text-lg font-semibold text-foreground">配置参数</CardTitle>
                {sets.length > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 border-blue-100">
                    {sets.length} 套
                  </Badge>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground ml-10">
              为每套配置选择手机型号和拍摄时间
            </p>
          </CardHeader>
          <CardContent>
            {sets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Globe className="mb-3 h-12 w-12" />
                <p className="text-sm">还没有选择任何国家</p>
                <p className="text-xs">先在上方选择国家</p>
              </div>
            ) : (
              <div className={`space-y-3 ${sets.length > 20 ? 'max-h-[600px] overflow-y-auto pr-2' : ''}`}>
                {sets.map((configSet, index) => {
                  const country = COUNTRIES.find(
                    (c) => c.code === configSet.countryCode
                  );
                  return (
                    <div
                      key={configSet.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-medium text-xs shrink-0">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm font-medium text-slate-800">
                            {country && countryCodeToFlag(country.code)} {country?.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {country?.nameEn}
                          </span>
                          {country && (
                            <span className="text-[10px] text-slate-400 bg-slate-50 rounded px-1.5 py-0.5">
                              GPS: {country.gps.lat.toFixed(2)},{' '}
                              {country.gps.lng.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateSet(configSet.id)}
                            title="复制此套"
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSet(configSet.id)}
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="删除此套"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Phone */}
                        <div>
                          <Label className="text-xs font-medium text-slate-600">
                            手机型号
                          </Label>
                          <Select
                            value={String(configSet.phoneIndex)}
                            onValueChange={(val) =>
                              updateSet(
                                configSet.id,
                                'phoneIndex',
                                parseInt(val)
                              )
                            }
                          >
                            <SelectTrigger className="mt-1 h-9">
                              <SelectValue placeholder="选择手机" />
                            </SelectTrigger>
                            <SelectContent>
                              {PHONES.map((p, idx) => (
                                <SelectItem key={idx} value={String(idx)}>
                                  {getPhoneLabel(p)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* DateTime */}
                        <div>
                          <Label className="text-xs font-medium text-slate-600">
                            拍摄时间
                          </Label>
                          <Input
                            type="datetime-local"
                            value={configSet.dateTime}
                            onChange={(e) =>
                              updateSet(
                                configSet.id,
                                'dateTime',
                                e.target.value
                              )
                            }
                            className="mt-1 h-9"
                          />
                        </div>

                        {/* Note */}
                        <div>
                          <Label className="text-xs font-medium text-slate-600">
                            备注
                          </Label>
                          <Input
                            type="text"
                            placeholder="可选，写入 UserComment"
                            value={configSet.note}
                            onChange={(e) =>
                              updateSet(
                                configSet.id,
                                'note',
                                e.target.value
                              )
                            }
                            className="mt-1 h-9"
                          />
                        </div>
                      </div>

                      {/* EXIF Preview */}
                      <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-500 mb-1">将写入的 EXIF 信息：</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-600">
                          <span>Make: <span className="font-mono text-indigo-600">{PHONES[configSet.phoneIndex]?.make || '-'}</span></span>
                          <span>Model: <span className="font-mono text-indigo-600">{PHONES[configSet.phoneIndex]?.model || '-'}</span></span>
                          <span>GPS: <span className="font-mono text-indigo-600">{COUNTRIES.find(c => c.code === configSet.countryCode)?.gps.lat.toFixed(4) || '-'}, {COUNTRIES.find(c => c.code === configSet.countryCode)?.gps.lng.toFixed(4) || '-'}</span></span>
                          <span>DateTime: <span className="font-mono text-indigo-600">{configSet.dateTime.replace('T', ' ')}</span></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 4: Generate */}
        <Card className="mb-6 shadow-premium border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-xs text-white font-semibold shadow-sm">
                4
              </span>
              <CardTitle className="text-lg font-semibold text-foreground">生成与导出</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {/* Output Settings */}
            <div className="mb-5 rounded-xl border border-border/50 bg-slate-50/50 p-4">
              <h4 className="mb-3 text-sm font-medium text-foreground">输出设置</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label className="text-xs font-medium text-slate-600">格式</Label>
                  <Select
                    value={outputSettings.format}
                    onValueChange={(v) =>
                      setOutputSettings((prev) => ({
                        ...prev,
                        format: v as 'jpeg' | 'png',
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">
                    质量
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={outputSettings.quality}
                      onChange={(e) =>
                        setOutputSettings((prev) => ({
                          ...prev,
                          quality: parseInt(e.target.value) || 92,
                        }))
                      }
                      className="h-9"
                    />
                    <span className="text-xs text-slate-500">%</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium text-slate-600">
                    压缩到小于
                  </Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={outputSettings.maxSizeKB}
                      onChange={(e) =>
                        setOutputSettings((prev) => ({
                          ...prev,
                          maxSizeKB: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="h-9"
                    />
                    <span className="text-xs text-slate-500">KB</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">填 0 表示不限制</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="mb-5 rounded-lg bg-slate-50 p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {photos.length}
                  </p>
                  <p className="text-xs text-slate-500">输入照片</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {sets.length}
                  </p>
                  <p className="text-xs text-slate-500">配置套数</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-800">
                    {totalOutput}
                  </p>
                  <p className="text-xs text-slate-500">预计输出</p>
                </div>
              </div>
              {sets.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {sets.slice(0, 20).map((s) => {
                      const c = COUNTRIES.find((cc) => cc.code === s.countryCode);
                      return (
                        <Badge key={s.id} variant="secondary" className="text-xs">
                          {c && countryCodeToFlag(c.code)} {c?.name}
                        </Badge>
                      );
                    })}
                    {sets.length > 20 && (
                      <Badge variant="outline" className="text-xs">
                        +{sets.length - 20} 更多
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    输出结构：{new Set(sets.map(s => s.countryCode)).size} 个国家文件夹，每个文件夹里 {photos.length} 张图
                  </p>
                </div>
              )}
            </div>

            {/* Progress */}
            {isProcessing && (
              <div className="mb-5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{progressText}</span>
                  <span className="font-medium text-slate-900">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {!isProcessing && progress === 100 && (
              <div className="mb-5 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">
                  处理完成，文件已开始下载
                </span>
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={
                photos.length === 0 || sets.length === 0 || isProcessing
              }
              className="w-full bg-blue-800 py-5 text-base font-medium hover:bg-blue-900 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Settings2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {mounted && canPickDir
                    ? `导出到文件夹 (${totalOutput} 张)`
                    : `生成并下载 ZIP (${totalOutput} 张)`}
                </>
              )}
            </Button>

            <p className="mt-2 text-center text-xs text-slate-400">
              {mounted && canPickDir
                ? '输出结构：国家文件夹 → 里面是处理好的图片（每套配置 × 每张原图）'
                : '输出结构：国家文件夹 → 里面是处理好的图片（每套配置 × 每张原图）'}
            </p>

            {(photos.length === 0 || sets.length === 0) && (
              <p className="mt-1 text-center text-xs text-slate-400">
                {photos.length === 0
                  ? '请先上传照片'
                  : '请至少选择一个国家'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        </TabsContent>

        <TabsContent value="ai-bg">
          <AIBackground />
        </TabsContent>

        <TabsContent value="watermark">
          <WatermarkRemoval />
        </TabsContent>
        </Tabs>

        <footer className="py-4 text-center text-xs text-slate-400">
          <div className="flex items-center justify-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>
              择优臻选出海图片处理器 — 所有处理均在浏览器本地完成，不会上传任何文件
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
