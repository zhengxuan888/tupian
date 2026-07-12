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
 * 合成前景和背景
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

    // 绘制前景
    ctx.drawImage(foregroundCanvas, drawX, drawY, drawWidth, drawHeight);

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
