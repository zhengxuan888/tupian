"use client";

import { useState, useRef, useCallback, useEffect } from "react";
// Dynamic import to avoid SSR issues with @imgly/background-removal
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeBackgroundFn = async (imageSrc: string | File, options?: Record<string, any>): Promise<Blob> => {
  const mod = await import("@imgly/background-removal");
  return mod.removeBackground(imageSrc, options);
};
import { Button } from "@/components/ui/button";
import { isHeic, heicToJpegFile } from "@/lib/heic-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Upload,
  Loader2,
  Download,
  ImageIcon,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronUp,
  Key,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PRESET_PROMPTS = [
  { label: "海滩日落", prompt: "beautiful sunset on a tropical beach with palm trees, warm golden light" },
  { label: "城市夜景", prompt: "modern city skyline at night with colorful lights, bokeh effect" },
  { label: "森林小径", prompt: "serene forest path with sunlight filtering through trees, green nature" },
  { label: "山巅云海", prompt: "mountain peak above clouds at sunrise, dramatic landscape, epic view" },
  { label: "花海草原", prompt: "vast flower field with colorful wildflowers, blue sky, spring meadow" },
  { label: "欧式街道", prompt: "charming European old town street with cobblestone, warm afternoon light" },
  { label: "日式庭院", prompt: "traditional Japanese garden with cherry blossoms, zen atmosphere, soft light" },
  { label: "纯色背景", prompt: "clean solid color studio background, professional photography backdrop, soft gradient" },
];

export function AIBackground() {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalPreview, setOriginalPreview] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [step, setStep] = useState<"idle" | "removing" | "generating" | "compositing" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API mode state
  const [apiMode, setApiMode] = useState<"free" | "custom">("free");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-image-1");
  const [imageSize, setImageSize] = useState("1024x1024");
  const [showSettings, setShowSettings] = useState(false);

  // Load saved config from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ai-bg-config");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        if (config.apiMode) setApiMode(config.apiMode);
        if (config.apiKey) setApiKey(config.apiKey);
        if (config.baseUrl) setBaseUrl(config.baseUrl);
        if (config.model) setModel(config.model);
        if (config.imageSize) setImageSize(config.imageSize);
      } catch {
        // ignore parse errors
      }
    }
  }, []);

  const saveConfig = () => {
    localStorage.setItem(
      "ai-bg-config",
      JSON.stringify({ apiMode, apiKey, baseUrl, model, imageSize })
    );
  };

  const reset = () => {
    setOriginalImage(null);
    setOriginalPreview("");
    setResultUrl("");
    setStep("idle");
    setErrorMsg("");
    setProgress(0);
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/") && !isHeic(file)) return;
    // Convert HEIC to JPEG for compatibility
    let processedFile = file;
    if (isHeic(file)) {
      try {
        processedFile = await heicToJpegFile(file);
      } catch {
        setErrorMsg("HEIC 图片转换失败，请尝试将图片转为 JPG 后再上传");
        return;
      }
    }
    setOriginalImage(processedFile);
    setOriginalPreview(URL.createObjectURL(processedFile));
    setResultUrl("");
    setStep("idle");
    setErrorMsg("");
    setProgress(0);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleGenerate = async () => {
    if (!originalImage || !prompt.trim()) return;

    try {
      setErrorMsg("");

      // Step 1: Remove background
      setStep("removing");
      setProgress(10);

      const foregroundBlob = await removeBackgroundFn(originalImage, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            setProgress(Math.min(10 + (current / total) * 30, 40));
          }
        },
      });

      const foregroundUrl = URL.createObjectURL(foregroundBlob);
      const foregroundImg = await loadImage(foregroundUrl);

      // Step 2: Generate background
      setStep("generating");
      setProgress(50);

      let bgImg: HTMLImageElement;

      if (apiMode === "custom" && apiKey) {
        // Custom API mode - use OpenAI-compatible image generation API
        const [width, height] = imageSize.split("x").map(Number);
        const response = await fetch(`${baseUrl}/images/generations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt: prompt,
            n: 1,
            size: imageSize,
            response_format: "b64_json",
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API 请求失败 (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const b64 = data.data?.[0]?.b64_json;
        if (!b64) throw new Error("API 返回数据格式错误");

        const bgUrl = `data:image/png;base64,${b64}`;
        bgImg = await loadImage(bgUrl);

        // Resize background to match foreground if needed
        if (bgImg.width !== foregroundImg.width || bgImg.height !== foregroundImg.height) {
          const resizeCanvas = document.createElement("canvas");
          resizeCanvas.width = foregroundImg.width;
          resizeCanvas.height = foregroundImg.height;
          const resizeCtx = resizeCanvas.getContext("2d")!;
          resizeCtx.drawImage(bgImg, 0, 0, foregroundImg.width, foregroundImg.height);
          bgImg = await loadImage(resizeCanvas.toDataURL("image/png"));
        }
      } else {
        // Free mode - use Pollinations AI
        const bgImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${foregroundImg.width}&height=${foregroundImg.height}&nologo=true`;
        bgImg = await loadImageWithCors(bgImageUrl);
      }

      setProgress(80);

      // Step 3: Composite with realistic blending
      setStep("compositing");
      const canvas = document.createElement("canvas");
      canvas.width = foregroundImg.width;
      canvas.height = foregroundImg.height;
      const ctx = canvas.getContext("2d")!;

      // Draw background (scaled to fit)
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

      // --- Add realistic shadow under the phone ---
      // Create a shadow canvas from the foreground alpha channel
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = foregroundImg.width;
      shadowCanvas.height = foregroundImg.height;
      const shadowCtx = shadowCanvas.getContext("2d")!;
      shadowCtx.drawImage(foregroundImg, 0, 0);
      // Extract alpha and make it black with reduced opacity
      const shadowData = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height);
      const sd = shadowData.data;
      for (let i = 0; i < sd.length; i += 4) {
        const alpha = sd[i + 3];
        sd[i] = 0;     // R
        sd[i + 1] = 0; // G
        sd[i + 2] = 0; // B
        sd[i + 3] = Math.min(alpha * 0.35, 90); // shadow opacity
      }
      shadowCtx.putImageData(shadowData, 0, 0);

      // Draw shadow with offset and slight blur
      ctx.save();
      ctx.filter = "blur(12px)";
      ctx.translate(6, 10); // shadow offset (right and down)
      ctx.drawImage(shadowCanvas, 0, 0);
      ctx.restore();

      // Second softer shadow layer for depth
      ctx.save();
      ctx.filter = "blur(25px)";
      ctx.translate(10, 18);
      shadowCtx.clearRect(0, 0, shadowCanvas.width, shadowCanvas.height);
      shadowCtx.drawImage(foregroundImg, 0, 0);
      const sd2 = shadowCtx.getImageData(0, 0, shadowCanvas.width, shadowCanvas.height);
      const d2 = sd2.data;
      for (let i = 0; i < d2.length; i += 4) {
        const alpha = d2[i + 3];
        d2[i] = 0;
        d2[i + 1] = 0;
        d2[i + 2] = 0;
        d2[i + 3] = Math.min(alpha * 0.2, 50);
      }
      shadowCtx.putImageData(sd2, 0, 0);
      ctx.drawImage(shadowCanvas, 0, 0);
      ctx.restore();

      // --- Edge feathering: slightly blur the foreground edges ---
      // Create a feathered version of the foreground
      const featherCanvas = document.createElement("canvas");
      featherCanvas.width = foregroundImg.width;
      featherCanvas.height = foregroundImg.height;
      const featherCtx = featherCanvas.getContext("2d")!;

      // Draw foreground with slight edge softening
      featherCtx.filter = "blur(0.5px)";
      featherCtx.drawImage(foregroundImg, 0, 0);
      featherCtx.filter = "none";

      // --- Color temperature matching ---
      // Sample background average color to adjust foreground warmth
      const bgSample = ctx.getImageData(canvas.width / 2, canvas.height / 2, 10, 10);
      let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
      for (let i = 0; i < bgSample.data.length; i += 4) {
        if (bgSample.data[i + 3] > 200) {
          bgR += bgSample.data[i];
          bgG += bgSample.data[i + 1];
          bgB += bgSample.data[i + 2];
          bgCount++;
        }
      }
      if (bgCount > 0) {
        bgR /= bgCount;
        bgG /= bgCount;
        bgB /= bgCount;
        // Apply subtle color overlay to match background tone
        const fgData = featherCtx.getImageData(0, 0, featherCanvas.width, featherCanvas.height);
        const fd = fgData.data;
        for (let i = 0; i < fd.length; i += 4) {
          if (fd[i + 3] > 0) {
            // Blend 8% of background color temperature
            const blend = 0.08;
            fd[i] = Math.min(255, fd[i] * (1 - blend) + bgR * blend);
            fd[i + 1] = Math.min(255, fd[i + 1] * (1 - blend) + bgG * blend);
            fd[i + 2] = Math.min(255, fd[i + 2] * (1 - blend) + bgB * blend);
          }
        }
        featherCtx.putImageData(fgData, 0, 0);
      }

      // Draw the feathered, color-matched foreground
      ctx.drawImage(featherCanvas, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setStep("done");
            setProgress(100);
          }
        },
        "image/jpeg",
        0.95
      );
    } catch (err) {
      console.error("AI background generation failed:", err);
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "处理失败，请重试");
    }
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `ai-background-${Date.now()}.jpg`;
    a.click();
  };

  const isProcessing = step === "removing" || step === "generating" || step === "compositing";

  return (
    <div className="space-y-6">
      {/* Upload & Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upload */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <Label className="text-base font-semibold text-slate-900 mb-3 block">
              上传图片
            </Label>
            {!originalPreview ? (
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 font-medium">点击或拖拽上传图片</p>
                <p className="text-xs text-slate-400 mt-1">支持 JPG / PNG / WebP / HEIC（苹果手机）</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative group">
                  <img
                    src={originalPreview}
                    alt="Original"
                    className="w-full h-56 object-contain rounded-lg bg-slate-50 border border-slate-200"
                  />
                  {!isProcessing && step !== "done" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        reset();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </CardContent>
        </Card>

        {/* Right: Prompt */}
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <Label className="text-base font-semibold text-slate-900 mb-3 block">
              背景描述
            </Label>
            <Input
              placeholder="描述你想要的背景，如：海滩日落、城市夜景..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mb-4"
              disabled={isProcessing}
            />
            <div className="grid grid-cols-2 gap-2">
              {PRESET_PROMPTS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="justify-start text-xs h-8"
                  onClick={() => setPrompt(preset.prompt)}
                  disabled={isProcessing}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Settings */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowSettings(!showSettings)}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">高级设置</span>
              <span className="text-xs text-slate-400 ml-2">
                {apiMode === "free" ? "免费模式 (Pollinations AI)" : `自定义 API (${model})`}
              </span>
            </div>
            {showSettings ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>

          {showSettings && (
            <div className="mt-4 space-y-4 pt-4 border-t border-slate-100">
              {/* Mode Toggle */}
              <div className="flex items-center gap-4">
                <Label className="text-sm text-slate-600">生成模式：</Label>
                <div className="flex gap-2">
                  <Button
                    variant={apiMode === "free" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setApiMode("free")}
                    className={apiMode === "free" ? "bg-blue-700 hover:bg-blue-800" : ""}
                  >
                    免费模式
                  </Button>
                  <Button
                    variant={apiMode === "custom" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setApiMode("custom")}
                    className={apiMode === "custom" ? "bg-blue-700 hover:bg-blue-800" : ""}
                  >
                    自定义 API
                  </Button>
                </div>
              </div>

              {apiMode === "custom" && (
                <>
                  {/* API Key */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600 flex items-center gap-1">
                      <Key className="w-3 h-3" />
                      API Key
                    </Label>
                    <Input
                      type="password"
                      placeholder="输入你的 API Key (sk-...)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>

                  {/* Base URL */}
                  <div className="space-y-2">
                    <Label className="text-sm text-slate-600">Base URL</Label>
                    <Input
                      placeholder="https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                    />
                    <p className="text-xs text-slate-400">
                      支持 OpenAI 或任何兼容接口，如 FreeLLMAPI、中转站等
                    </p>
                  </div>

                  {/* Model & Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600">模型</Label>
                      <Select value={model} onValueChange={setModel}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-image-1">gpt-image-1</SelectItem>
                          <SelectItem value="dall-e-3">dall-e-3</SelectItem>
                          <SelectItem value="dall-e-2">dall-e-2</SelectItem>
                          <SelectItem value="stable-diffusion-xl">stable-diffusion-xl</SelectItem>
                          <SelectItem value="flux-1.1-pro">flux-1.1-pro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-slate-600">尺寸</Label>
                      <Select value={imageSize} onValueChange={setImageSize}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1024x1024">1024 x 1024</SelectItem>
                          <SelectItem value="1024x1792">1024 x 1792 (竖版)</SelectItem>
                          <SelectItem value="1792x1024">1792 x 1024 (横版)</SelectItem>
                          <SelectItem value="512x512">512 x 512</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveConfig}
                    className="text-xs"
                  >
                    保存配置到本地
                  </Button>
                </>
              )}

              {apiMode === "free" && (
                <p className="text-xs text-slate-400">
                  免费模式使用 Pollinations AI，无需 API Key，生成速度较快，适合快速预览。
                  如需更高质量，可切换到自定义 API 模式。
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="h-12 px-10 text-base bg-blue-700 hover:bg-blue-800 text-white font-medium rounded-lg"
          disabled={!originalImage || !prompt.trim() || isProcessing}
          onClick={handleGenerate}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {step === "removing"
                ? "AI 抠图中..."
                : step === "generating"
                  ? "生成背景中..."
                  : "合成中..."}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              生成
            </>
          )}
        </Button>
      </div>

      {/* Progress */}
      {isProcessing && (
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">
                  {step === "removing"
                    ? "Step 1/3: AI 智能抠图..."
                    : step === "generating"
                      ? "Step 2/3: AI 生成背景..."
                      : "Step 3/3: 合成图片..."}
                </span>
                <span className="text-slate-500">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {step === "removing" && (
                <p className="text-xs text-slate-400">
                  首次使用需下载 AI 模型（约 40MB），请耐心等待
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {step === "error" && (
        <Card className="border border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">处理失败</p>
                <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {step === "done" && resultUrl && (
        <Card className="border border-green-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-slate-900">合成完成</span>
              </div>
              <Button onClick={handleDownload} className="bg-blue-700 hover:bg-blue-800">
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">原图</p>
                <img
                  src={originalPreview}
                  alt="Original"
                  className="w-full h-48 object-contain rounded-lg bg-slate-50 border border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-medium">AI 合成结果</p>
                <img
                  src={resultUrl}
                  alt="Result"
                  className="w-full h-48 object-contain rounded-lg bg-slate-50 border border-green-200"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state hint */}
      {!originalImage && (
        <div className="text-center py-8">
          <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">上传图片，输入背景描述，AI 自动抠图并合成新背景</p>
          <p className="text-xs text-slate-400 mt-1">
            默认使用免费 AI，也可在高级设置中配置自己的 API Key 获得更高质量
          </p>
        </div>
      )}
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function loadImageWithCors(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load generated background"));
    img.src = src;
  });
}
