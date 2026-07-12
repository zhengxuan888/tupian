// 图片去重处理模块
// 通过像素级微调让每张图片在检测算法眼中"独一无二"
// 所有调整幅度极小，肉眼不可见，但足以改变哈希值和AI特征

export interface DedupOptions {
  /** 微旋转角度范围 (0-2度) */
  rotateRange: number;
  /** 微裁剪比例范围 (0-3%) */
  cropRange: number;
  /** 亮度调整范围 (0-8%) */
  brightnessRange: number;
  /** 对比度调整范围 (0-6%) */
  contrastRange: number;
  /** 色温偏移范围 (0-10) */
  colorTempRange: number;
  /** 噪点强度 (0-5) */
  noiseRange: number;
  /** 暗角强度 (0-15%) */
  vignetteRange: number;
  /** JPEG重压缩质量范围 (85-98) */
  qualityMin: number;
  qualityMax: number;
}

export const DEFAULT_DEDUP_OPTIONS: DedupOptions = {
  rotateRange: 1.2,
  cropRange: 2,
  brightnessRange: 5,
  contrastRange: 4,
  colorTempRange: 6,
  noiseRange: 3,
  vignetteRange: 8,
  qualityMin: 88,
  qualityMax: 96,
};

/** 生成随机数 (-range ~ +range) */
function rand(range: number): number {
  return (Math.random() * 2 - 1) * range;
}

/** 生成随机数 (min ~ max) */
function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * 对 JPEG base64 图片应用去重处理
 * 返回处理后的 JPEG base64
 */
export async function applyDedup(
  imageBase64: string,
  options: DedupOptions = DEFAULT_DEDUP_OPTIONS
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const result = processImage(img, options);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = imageBase64;
  });
}

function processImage(img: HTMLImageElement, opts: DedupOptions): string {
  const srcW = img.width;
  const srcH = img.height;

  // 1. 微裁剪 — 随机裁掉边缘 1-3%
  const cropPercent = Math.abs(rand(opts.cropRange));
  const cropX = Math.round(srcW * cropPercent / 100);
  const cropY = Math.round(srcH * cropPercent / 100);
  const innerW = srcW - cropX * 2;
  const innerH = srcH - cropY * 2;

  // 2. 微旋转 — 随机旋转 0.3-1.5 度
  const rotateAngle = rand(opts.rotateRange);

  // 计算旋转后需要的画布尺寸（避免裁切）
  const rad = (Math.abs(rotateAngle) * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const canvasW = Math.ceil(innerW * cosA + innerH * sinA);
  const canvasH = Math.ceil(innerW * sinA + innerH * cosA);

  // 创建最终画布
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;

  // 填充黑色背景（旋转后的边角）
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // 应用旋转 + 平移
  ctx.save();
  ctx.translate(canvasW / 2, canvasH / 2);
  ctx.rotate((rotateAngle * Math.PI) / 180);
  ctx.drawImage(img, cropX, cropY, innerW, innerH, -innerW / 2, -innerH / 2, innerW, innerH);
  ctx.restore();

  // 3. 亮度 + 对比度 + 色温 + 噪点 — 像素级调整
  const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
  const data = imageData.data;

  const brightnessShift = rand(opts.brightnessRange); // -5 ~ +5
  const contrastFactor = 1 + rand(opts.contrastRange) / 100; // 0.96 ~ 1.04
  const colorTempShift = rand(opts.colorTempRange); // -6 ~ +6
  const noiseIntensity = Math.abs(rand(opts.noiseRange)); // 0 ~ 3

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // 跳过纯黑像素（旋转边角）
    if (r === 0 && g === 0 && b === 0) continue;

    // 亮度调整
    r += brightnessShift * 2.55; // 百分比转0-255
    g += brightnessShift * 2.55;
    b += brightnessShift * 2.55;

    // 对比度调整
    r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
    g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
    b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;

    // 色温偏移（正值偏暖/黄，负值偏冷/蓝）
    r += colorTempShift * 0.8;
    g += colorTempShift * 0.2;
    b -= colorTempShift * 0.8;

    // 添加随机噪点
    if (noiseIntensity > 0) {
      const noise = (Math.random() - 0.5) * noiseIntensity * 2;
      r += noise;
      g += noise;
      b += noise;
    }

    // 钳制到 0-255
    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }

  ctx.putImageData(imageData, 0, 0);

  // 4. 暗角效果 — 边缘微微变暗
  const vignetteStrength = Math.abs(rand(opts.vignetteRange)) / 100;
  if (vignetteStrength > 0.01) {
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const maxDist = Math.sqrt(cx * cx + cy * cy);

    const gradient = ctx.createRadialGradient(cx, cy, maxDist * 0.4, cx, cy, maxDist);
    gradient.addColorStop(0, `rgba(0, 0, 0, 0)`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${vignetteStrength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // 5. JPEG 重压缩 — 不同质量
  const quality = randBetween(opts.qualityMin, opts.qualityMax) / 100;
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * 生成一组随机的去重参数描述（用于日志/调试）
 */
export function describeDedupParams(opts: DedupOptions = DEFAULT_DEDUP_OPTIONS): string {
  const rotate = rand(opts.rotateRange).toFixed(2);
  const crop = Math.abs(rand(opts.cropRange)).toFixed(1);
  const brightness = rand(opts.brightnessRange).toFixed(1);
  const contrast = (rand(opts.contrastRange)).toFixed(1);
  const colorTemp = rand(opts.colorTempRange).toFixed(1);
  const noise = Math.abs(rand(opts.noiseRange)).toFixed(1);
  const vignette = Math.abs(rand(opts.vignetteRange)).toFixed(1);
  const quality = randBetween(opts.qualityMin, opts.qualityMax).toFixed(0);

  return `旋转${rotate}° 裁剪${crop}% 亮度${brightness}% 对比度${contrast}% 色温${colorTemp} 噪点${noise} 暗角${vignette}% 质量${quality}%`;
}
