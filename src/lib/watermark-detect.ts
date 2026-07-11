/**
 * Auto watermark detection algorithm
 * Uses multi-signal analysis to detect watermark regions:
 * 1. Edge detection (Sobel)
 * 2. Brightness uniformity analysis
 * 3. Local contrast analysis
 * 4. Morphological cleanup
 */

export interface DetectionResult {
  mask: Uint8Array; // Binary mask (0 = background, 255 = watermark)
  width: number;
  height: number;
  confidence: number; // 0-1, how confident the detection is
}

/**
 * Convert RGBA image data to grayscale
 */
function toGrayscale(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return gray;
}

/**
 * Sobel edge detection
 */
function sobelEdgeDetection(gray: Float32Array, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = (y + ky) * width + (x + kx);
          const ki = (ky + 1) * 3 + (kx + 1);
          gx += gray[idx] * sobelX[ki];
          gy += gray[idx] * sobelY[ki];
        }
      }
      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

/**
 * Compute local mean using box blur
 */
function boxBlur(data: Float32Array, width: number, height: number, radius: number): Float32Array {
  const result = new Float32Array(width * height);
  const size = (2 * radius + 1) * (2 * radius + 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const ny = Math.min(height - 1, Math.max(0, y + ky));
          const nx = Math.min(width - 1, Math.max(0, x + kx));
          sum += data[ny * width + nx];
        }
      }
      result[y * width + x] = sum / size;
    }
  }
  return result;
}

/**
 * Detect watermark regions using multi-signal analysis
 */
export function detectWatermark(
  imageData: ImageData,
  sensitivity: number = 0.5
): DetectionResult {
  const { width, height } = imageData;
  const totalPixels = width * height;

  // Step 1: Convert to grayscale
  const gray = toGrayscale(imageData);

  // Step 2: Edge detection
  const edges = sobelEdgeDetection(gray, width, height);

  // Step 3: Local mean (large radius)
  const localMean = boxBlur(gray, width, height, Math.max(15, Math.floor(Math.min(width, height) / 20)));

  // Step 4: Local variance (texture analysis)
  const diff = new Float32Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    diff[i] = gray[i] - localMean[i];
  }
  const localVariance = boxBlur(
    new Float32Array(totalPixels).map((_, i) => diff[i] * diff[i]),
    width, height, Math.max(10, Math.floor(Math.min(width, height) / 30))
  );

  // Step 5: Compute edge statistics for adaptive thresholding
  let edgeSum = 0, edgeCount = 0;
  const edgeSorted = Array.from(edges).sort((a, b) => a - b);
  const edgeP90 = edgeSorted[Math.floor(totalPixels * 0.9)];
  const edgeP50 = edgeSorted[Math.floor(totalPixels * 0.5)];

  for (let i = 0; i < totalPixels; i++) {
    if (edges[i] > edgeP50) {
      edgeSum += edges[i];
      edgeCount++;
    }
  }
  const avgEdge = edgeCount > 0 ? edgeSum / edgeCount : 1;

  // Step 6: Compute variance statistics
  const varSorted = Array.from(localVariance).sort((a, b) => a - b);
  const varP10 = varSorted[Math.floor(totalPixels * 0.1)];
  const varP90 = varSorted[Math.floor(totalPixels * 0.9)];
  const varRange = varP90 - varP10 || 1;

  // Step 7: Multi-signal watermark score
  const mask = new Uint8Array(totalPixels);
  let watermarkPixels = 0;

  // Sensitivity-adjusted thresholds
  const edgeThreshold = edgeP90 * (1.2 - sensitivity * 0.6);
  const varLowThreshold = varP10 + varRange * (0.1 + sensitivity * 0.15);
  const varHighThreshold = varP10 + varRange * (0.7 - sensitivity * 0.2);
  const brightnessDeviationThreshold = 8 + (1 - sensitivity) * 15;

  for (let i = 0; i < totalPixels; i++) {
    const edgeScore = edges[i] > edgeThreshold ? 1 : 0;
    const isLowTexture = localVariance[i] < varLowThreshold;
    const isMediumTexture = localVariance[i] >= varLowThreshold && localVariance[i] <= varHighThreshold;
    const brightnessDiff = Math.abs(diff[i]);
    const isBrightnessAnomaly = brightnessDiff > brightnessDeviationThreshold && brightnessDiff < 60;

    // Watermark signal: edges + low/medium texture + brightness anomaly
    let score = 0;
    if (edgeScore) score += 0.4;
    if (isLowTexture || isMediumTexture) score += 0.3;
    if (isBrightnessAnomaly) score += 0.3;

    // Additional signal: semi-transparent watermark detection
    // Watermarks often have consistent brightness offset from local mean
    if (brightnessDiff > 3 && brightnessDiff < 30 && edges[i] > edgeP50 * 0.5) {
      score += 0.2;
    }

    // Threshold for marking as watermark
    if (score >= 0.6 + (1 - sensitivity) * 0.3) {
      mask[i] = 255;
      watermarkPixels++;
    }
  }

  // Step 8: Morphological operations to clean up the mask
  // Dilation (expand detected regions slightly)
  const dilated = morphologicalDilate(mask, width, height, 2);

  // Erosion (remove noise)
  const cleaned = morphologicalErode(dilated, width, height, 1);

  // Final dilation to ensure full coverage
  const finalMask = morphologicalDilate(cleaned, width, height, 3);

  // Count final watermark pixels
  let finalCount = 0;
  for (let i = 0; i < totalPixels; i++) {
    if (finalMask[i] > 0) finalCount++;
  }

  const confidence = Math.min(1, finalCount / totalPixels * 10);

  return {
    mask: finalMask,
    width,
    height,
    confidence,
  };
}

/**
 * Morphological dilation
 */
function morphologicalDilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let found = false;
      for (let ky = -radius; ky <= radius && !found; ky++) {
        for (let kx = -radius; kx <= radius && !found; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            if (mask[ny * width + nx] > 0) {
              found = true;
            }
          }
        }
      }
      if (found) result[y * width + x] = 255;
    }
  }
  return result;
}

/**
 * Morphological erosion
 */
function morphologicalErode(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let allSet = true;
      for (let ky = -radius; ky <= radius && allSet; ky++) {
        for (let kx = -radius; kx <= radius && allSet; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            if (mask[ny * width + nx] === 0) {
              allSet = false;
            }
          }
        }
      }
      if (allSet) result[y * width + x] = 255;
    }
  }
  return result;
}

/**
 * Inpaint watermark regions using surrounding pixel information
 */
export function inpaintWatermark(
  imageData: ImageData,
  mask: Uint8Array
): ImageData {
  const { data, width, height } = imageData;
  const result = new ImageData(new Uint8ClampedArray(data), width, height);
  const resultData = result.data;

  // Multi-pass inpainting from outside in
  const maxPasses = 30;

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (mask[idx] === 0) continue; // Not watermark

        const pixelIdx = idx * 4;
        // Check if current pixel still needs inpainting
        // (we use alpha channel of result as a marker: 0 = needs inpainting)
        if (pass === 0) {
          // First pass: mark all watermark pixels
          resultData[pixelIdx + 3] = 0;
        }

        if (resultData[pixelIdx + 3] !== 0) continue; // Already inpainted

        // Sample from surrounding non-watermark pixels
        let r = 0, g = 0, b = 0, totalWeight = 0;
        const searchRadius = 3 + pass;

        for (let ky = -searchRadius; ky <= searchRadius; ky++) {
          for (let kx = -searchRadius; kx <= searchRadius; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;

            const nIdx = ny * width + nx;
            const nPixelIdx = nIdx * 4;

            // Only sample from already-inpainted or non-watermark pixels
            if (mask[nIdx] === 0 || resultData[nPixelIdx + 3] !== 0) {
              const dist = Math.sqrt(kx * kx + ky * ky);
              const weight = 1 / (1 + dist * dist);
              r += resultData[nPixelIdx] * weight;
              g += resultData[nPixelIdx + 1] * weight;
              b += resultData[nPixelIdx + 2] * weight;
              totalWeight += weight;
            }
          }
        }

        if (totalWeight > 0) {
          resultData[pixelIdx] = Math.round(r / totalWeight);
          resultData[pixelIdx + 1] = Math.round(g / totalWeight);
          resultData[pixelIdx + 2] = Math.round(b / totalWeight);
          resultData[pixelIdx + 3] = 255; // Mark as inpainted
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  // Final pass: ensure all pixels are filled
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pixelIdx = idx * 4;
      if (resultData[pixelIdx + 3] === 0) {
        // Fallback: use nearest non-watermark pixel
        let bestDist = Infinity;
        let bestR = 128, bestG = 128, bestB = 128;
        const searchRadius = Math.max(width, height) / 10;

        for (let ky = -searchRadius; ky <= searchRadius; ky++) {
          for (let kx = -searchRadius; kx <= searchRadius; kx++) {
            const ny = y + ky;
            const nx = x + kx;
            if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
            const nIdx = ny * width + nx;
            if (mask[nIdx] === 0) {
              const dist = Math.abs(kx) + Math.abs(ky);
              if (dist < bestDist) {
                bestDist = dist;
                const nPixelIdx = nIdx * 4;
                bestR = data[nPixelIdx];
                bestG = data[nPixelIdx + 1];
                bestB = data[nPixelIdx + 2];
              }
            }
          }
        }
        resultData[pixelIdx] = bestR;
        resultData[pixelIdx + 1] = bestG;
        resultData[pixelIdx + 2] = bestB;
        resultData[pixelIdx + 3] = 255;
      }
    }
  }

  return result;
}
