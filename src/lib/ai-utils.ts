// AI 工具函数 — 抠图 + 背景生成 + 合成

/**
 * 使用浏览器 Canvas 简易抠图（去除白色/浅色背景）
 * 对于复杂场景，建议使用 @imgly/background-removal
 */
export async function simpleRemoveBackground(imageFile: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // 简单的白色背景去除
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 如果像素接近白色，设为透明
        if (r > 220 && g > 220 && b > 220) {
          data[i + 3] = 0; // alpha = 0
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * 使用 AI 生成背景图片
 */
export async function generateBackgroundImage(
  prompt: string,
  width: number = 1024,
  height: number = 1024
): Promise<HTMLImageElement> {
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 1000000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('背景生成失败'));
    img.src = imageUrl;
  });
}

/**
 * 合成前景和背景（带阴影、边缘柔化、色彩融合）
 */
export function compositeImages(
  foregroundCanvas: HTMLCanvasElement,
  backgroundImg: HTMLImageElement
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = backgroundImg.width || foregroundCanvas.width;
    canvas.height = backgroundImg.height || foregroundCanvas.height;
    const ctx = canvas.getContext('2d')!;

    // 绘制背景
    ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);

    // 计算前景缩放（保持比例，居中）
    const fgAspect = foregroundCanvas.width / foregroundCanvas.height;
    const bgAspect = canvas.width / canvas.height;
    let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

    if (fgAspect > bgAspect) {
      drawWidth = canvas.width * 0.8;
      drawHeight = drawWidth / fgAspect;
    } else {
      drawHeight = canvas.height * 0.8;
      drawWidth = drawHeight * fgAspect;
    }
    drawX = (canvas.width - drawWidth) / 2;
    drawY = (canvas.height - drawHeight) / 2;

    // --- 生成阴影层 ---
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = drawWidth;
    shadowCanvas.height = drawHeight;
    const shadowCtx = shadowCanvas.getContext('2d')!;
    // 将前景缩放到目标尺寸
    shadowCtx.drawImage(foregroundCanvas, 0, 0, drawWidth, drawHeight);
    // 提取 alpha 通道，变成纯黑半透明
    const shadowData = shadowCtx.getImageData(0, 0, drawWidth, drawHeight);
    const sd = shadowData.data;
    for (let i = 0; i < sd.length; i += 4) {
      const alpha = sd[i + 3];
      sd[i] = 0;
      sd[i + 1] = 0;
      sd[i + 2] = 0;
      sd[i + 3] = Math.min(alpha * 0.35, 90);
    }
    shadowCtx.putImageData(shadowData, 0, 0);

    // 绘制近处阴影（清晰）
    ctx.save();
    ctx.filter = 'blur(10px)';
    ctx.translate(5, 8);
    ctx.drawImage(shadowCanvas, drawX, drawY);
    ctx.restore();

    // 绘制远处阴影（柔和扩散）
    const shadow2 = document.createElement('canvas');
    shadow2.width = drawWidth;
    shadow2.height = drawHeight;
    const s2ctx = shadow2.getContext('2d')!;
    s2ctx.drawImage(foregroundCanvas, 0, 0, drawWidth, drawHeight);
    const s2data = s2ctx.getImageData(0, 0, drawWidth, drawHeight);
    const d2 = s2data.data;
    for (let i = 0; i < d2.length; i += 4) {
      const alpha = d2[i + 3];
      d2[i] = 0;
      d2[i + 1] = 0;
      d2[i + 2] = 0;
      d2[i + 3] = Math.min(alpha * 0.2, 50);
    }
    s2ctx.putImageData(s2data, 0, 0);
    ctx.save();
    ctx.filter = 'blur(22px)';
    ctx.translate(8, 15);
    ctx.drawImage(shadow2, drawX, drawY);
    ctx.restore();

    // --- 边缘柔化 + 色彩融合 + 环境光反射 ---
    const featherCanvas = document.createElement('canvas');
    featherCanvas.width = drawWidth;
    featherCanvas.height = drawHeight;
    const featherCtx = featherCanvas.getContext('2d')!;
    featherCtx.filter = 'blur(0.5px)';
    featherCtx.drawImage(foregroundCanvas, 0, 0, drawWidth, drawHeight);
    featherCtx.filter = 'none';

    // 采样背景中心色调，微调前景色温
    const bgSample = ctx.getImageData(
      Math.floor(canvas.width / 2),
      Math.floor(canvas.height / 2),
      10, 10
    );
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
      const fgData = featherCtx.getImageData(0, 0, drawWidth, drawHeight);
      const fd = fgData.data;
      const blend = 0.08;
      for (let i = 0; i < fd.length; i += 4) {
        if (fd[i + 3] > 0) {
          fd[i] = Math.min(255, fd[i] * (1 - blend) + bgR * blend);
          fd[i + 1] = Math.min(255, fd[i + 1] * (1 - blend) + bgG * blend);
          fd[i + 2] = Math.min(255, fd[i + 2] * (1 - blend) + bgB * blend);
        }
      }
      featherCtx.putImageData(fgData, 0, 0);
    }

    // 环境光反射：在前景底部添加微弱的背景色反射
    const reflectCanvas = document.createElement('canvas');
    reflectCanvas.width = drawWidth;
    reflectCanvas.height = drawHeight;
    const reflectCtx = reflectCanvas.getContext('2d')!;
    reflectCtx.drawImage(featherCanvas, 0, 0);
    const reflectData = reflectCtx.getImageData(0, 0, drawWidth, drawHeight);
    const rd = reflectData.data;
    const reflectHeight = Math.floor(drawHeight * 0.15); // 底部15%区域
    for (let y = drawHeight - reflectHeight; y < drawHeight; y++) {
      for (let x = 0; x < drawWidth; x++) {
        const idx = (y * drawWidth + x) * 4;
        if (rd[idx + 3] > 0) {
          const distFromBottom = drawHeight - y;
          const factor = (distFromBottom / reflectHeight) * 0.12;
          rd[idx] = Math.min(255, rd[idx] * (1 - factor) + bgR * factor);
          rd[idx + 1] = Math.min(255, rd[idx + 1] * (1 - factor) + bgG * factor);
          rd[idx + 2] = Math.min(255, rd[idx + 2] * (1 - factor) + bgB * factor);
        }
      }
    }
    reflectCtx.putImageData(reflectData, 0, 0);

    // 绘制最终前景
    ctx.drawImage(reflectCanvas, drawX, drawY);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('合成失败'));
      },
      'image/jpeg',
      0.95
    );
  });
}

/**
 * 将 File 转为 Canvas
 */
export function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}
