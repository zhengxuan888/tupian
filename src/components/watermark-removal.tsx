"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Upload, Eraser, Download, RotateCcw, Sparkles, Wand2 } from "lucide-react";
import { detectWatermark, inpaintWatermark } from "@/lib/watermark-detect";
import { isHeic, heicToJpegFile } from "@/lib/heic-utils";

type Stage = "upload" | "edit" | "done";

export function WatermarkRemoval() {
  const [stage, setStage] = useState<Stage>("upload");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState(50);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const scaleRef = useRef(1);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleUpload = async (file: File) => {
    // Convert HEIC to JPEG for compatibility
    let processedFile = file;
    if (isHeic(file)) {
      try {
        processedFile = await heicToJpegFile(file);
      } catch {
        alert('HEIC 图片转换失败，请尝试将图片转为 JPG 后再上传');
        return;
      }
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      setResultUrl(null);
      setStage("edit");
    };
    reader.readAsDataURL(processedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith("image/") || isHeic(file))) handleUpload(file);
  };

  const initCanvas = useCallback(() => {
    if (!imageSrc || !canvasRef.current || !maskCanvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current!;
      const maskCanvas = maskCanvasRef.current!;
      const container = containerRef.current!;

      // Calculate scale to fit container
      const maxW = container.clientWidth;
      const maxH = 500;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      scaleRef.current = scale;

      const w = Math.floor(img.width * scale);
      const h = Math.floor(img.height * scale);

      canvas.width = w;
      canvas.height = h;
      maskCanvas.width = w;
      maskCanvas.height = h;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);

      // Clear mask
      const maskCtx = maskCanvas.getContext("2d")!;
      maskCtx.clearRect(0, 0, w, h);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    if (stage === "edit" && imageSrc) {
      // Delay to ensure DOM is ready
      setTimeout(initCanvas, 50);
    }
  }, [stage, imageSrc, initCanvas]);

  const getCanvasPos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const drawMask = (x: number, y: number) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d")!;
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDrawingRef.current = true;
    const pos = getCanvasPos(e);
    drawMask(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingRef.current) return;
    const pos = getCanvasPos(e);
    drawMask(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    isDrawingRef.current = true;
    drawMask(x, y);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const touch = e.touches[0];
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    drawMask(x, y);
  };

  const handleTouchEnd = () => {
    isDrawingRef.current = false;
  };

  const clearMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    const ctx = maskCanvas.getContext("2d")!;
    ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  const autoDetectWatermark = async () => {
    const img = imgRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !maskCanvas) return;

    setIsProcessing(true);
    await new Promise((r) => requestAnimationFrame(r));

    try {
      const w = img.width;
      const h = img.height;

      // Get full resolution image data
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w;
      tempCanvas.height = h;
      const tempCtx = tempCanvas.getContext("2d")!;
      tempCtx.drawImage(img, 0, 0, w, h);
      const imageData = tempCtx.getImageData(0, 0, w, h);

      // Run detection
      const sens = sensitivity / 100;
      const { mask } = detectWatermark(imageData, sens);

      // Draw detected mask onto the mask canvas
      const maskCtx = maskCanvas.getContext("2d")!;
      const mw = maskCanvas.width;
      const mh = maskCanvas.height;
      const maskImageData = maskCtx.createImageData(mw, mh);

      for (let y = 0; y < mh; y++) {
        for (let x = 0; x < mw; x++) {
          // Map mask canvas coords to detection mask coords
          const sx = Math.floor((x / mw) * w);
          const sy = Math.floor((y / mh) * h);
          const si = sy * w + sx;
          const di = (y * mw + x) * 4;

          if (mask[si] > 0) {
            maskImageData.data[di] = 255;     // R
            maskImageData.data[di + 1] = 80;  // G
            maskImageData.data[di + 2] = 80;  // B
            maskImageData.data[di + 3] = 100; // A (semi-transparent)
          }
        }
      }

      maskCtx.putImageData(maskImageData, 0, 0);
    } catch (err) {
      console.error("Auto detection failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeWatermark = async () => {
    const img = imgRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!img || !maskCanvas) return;

    setIsProcessing(true);

    // Use requestAnimationFrame to allow UI to update
    await new Promise((r) => requestAnimationFrame(r));

    try {
      const w = img.width;
      const h = img.height;
      const scale = scaleRef.current;
      const sw = Math.floor(w * scale);
      const sh = Math.floor(h * scale);

      // Create full-resolution canvas
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = w;
      fullCanvas.height = h;
      const fullCtx = fullCanvas.getContext("2d")!;
      fullCtx.drawImage(img, 0, 0, w, h);

      // Get image data
      const imageData = fullCtx.getImageData(0, 0, w, h);
      const pixels = imageData.data;

      // Get mask data and scale it up
      const maskCtx = maskCanvas.getContext("2d")!;
      const maskData = maskCtx.getImageData(0, 0, sw, sh);

      // Create full-resolution mask
      const mask = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          // Map to mask coordinates
          const mx = Math.floor(x * scale);
          const my = Math.floor(y * scale);
          const mi = (my * sw + mx) * 4;
          if (maskData.data[mi + 3] > 0) {
            mask[y * w + x] = 1;
          }
        }
      }

      // Inpainting: for each masked pixel, sample from surrounding non-masked pixels
      const radius = Math.max(brushSize, 10);
      const result = new Uint8ClampedArray(pixels);

      // Multi-pass inpainting for better results
      for (let pass = 0; pass < 3; pass++) {
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            if (mask[idx] === 0) continue;

            let r = 0, g = 0, b = 0, totalWeight = 0;
            const searchRadius = radius + pass * 5;

            // Sample from surrounding non-masked pixels
            for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
              for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;

                const nIdx = ny * w + nx;
                if (mask[nIdx] === 1 && pass < 2) continue; // Skip masked pixels in early passes

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > searchRadius) continue;

                const weight = 1 / (1 + dist * dist);
                const pi = nIdx * 4;
                r += pixels[pi] * weight;
                g += pixels[pi + 1] * weight;
                b += pixels[pi + 2] * weight;
                totalWeight += weight;
              }
            }

            if (totalWeight > 0) {
              const pi = idx * 4;
              result[pi] = r / totalWeight;
              result[pi + 1] = g / totalWeight;
              result[pi + 2] = b / totalWeight;
            }
          }
        }

        // Update pixels for next pass (allows filling larger areas)
        if (pass < 2) {
          for (let i = 0; i < pixels.length; i++) {
            pixels[i] = result[i];
          }
        }
      }

      // Apply result
      const resultData = new ImageData(result, w, h);
      fullCtx.putImageData(resultData, 0, 0);

      // Generate result URL
      const blob = await new Promise<Blob>((resolve) => {
        fullCanvas.toBlob((b) => resolve(b!), "image/png");
      });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setStage("done");
    } catch (err) {
      console.error("Watermark removal failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `watermark-removed-${Date.now()}.png`;
    a.click();
  };

  const reset = () => {
    setStage("upload");
    setImageSrc(null);
    setResultUrl(null);
    clearMask();
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {stage === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">去水印</CardTitle>
            <CardDescription>
              上传带有水印的图片，用画笔标记水印区域，AI 自动修复填充
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById("wm-file-input")?.click()}
            >
              <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                拖入图片，或点击选择文件
              </p>
              <p className="text-xs text-slate-400 mt-1">支持 JPG / PNG / WebP / HEIC（苹果手机）</p>
              <input
                id="wm-file-input"
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Section */}
      {stage === "edit" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">标记水印区域</CardTitle>
                <CardDescription>
                  点击「自动检测」识别水印，或用画笔手动涂抹水印位置（红色区域），然后点击「去除水印」
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-1" />
                重新选择
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auto detect + Brush size */}
            <div className="flex items-center gap-4 flex-wrap">
              <Wand2 className="w-4 h-4 text-purple-500 shrink-0" />
              <Label className="text-sm shrink-0">检测灵敏度</Label>
              <Slider
                value={[sensitivity]}
                onValueChange={([v]) => setSensitivity(v)}
                min={10}
                max={90}
                step={5}
                className="flex-1 min-w-[120px]"
              />
              <span className="text-sm text-slate-500 w-10 text-right">{sensitivity}%</span>
              <Button
                size="sm"
                onClick={autoDetectWatermark}
                disabled={isProcessing}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Wand2 className="w-4 h-4 mr-1" />
                {isProcessing ? "检测中..." : "自动检测"}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <Eraser className="w-4 h-4 text-slate-400 shrink-0" />
              <Label className="text-sm shrink-0">画笔大小</Label>
              <Slider
                value={[brushSize]}
                onValueChange={([v]) => setBrushSize(v)}
                min={5}
                max={80}
                step={1}
                className="flex-1"
              />
              <span className="text-sm text-slate-500 w-10 text-right">{brushSize}px</span>
              <Button variant="outline" size="sm" onClick={clearMask}>
                清除标记
              </Button>
            </div>

            {/* Canvas area */}
            <div
              ref={containerRef}
              className="relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
              style={{ cursor: "crosshair" }}
            >
              <canvas
                ref={canvasRef}
                className="block max-w-full"
              />
              <canvas
                ref={maskCanvasRef}
                className="absolute top-0 left-0 pointer-events-auto"
                style={{ mixBlendMode: "normal" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            {/* Action button */}
            <div className="flex justify-center">
              <Button
                size="lg"
                onClick={removeWatermark}
                disabled={isProcessing}
                className="bg-blue-700 hover:bg-blue-800"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    修复中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    去除水印
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Section */}
      {stage === "done" && resultUrl && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">修复完成</CardTitle>
                <CardDescription>水印已去除，可下载或重新编辑</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setStage("edit")}>
                  继续编辑
                </Button>
                <Button variant="outline" size="sm" onClick={reset}>
                  <RotateCcw className="w-4 h-4 mr-1" />
                  新图片
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <img src={resultUrl} alt="Result" className="max-w-full block mx-auto" />
            </div>
            <div className="flex justify-center">
              <Button size="lg" onClick={downloadResult} className="bg-blue-700 hover:bg-blue-800">
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
