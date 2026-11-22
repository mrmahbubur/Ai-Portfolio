/**
 * Utility to dynamically remove solid backgrounds from character portrait assets,
 * producing transparent PNG data URLs with feathered edges around hair and shoulders.
 */

const cutoutCache = new Map<string, string>();

export async function processTransparentCutout(
  imageSrc: string,
  threshold = 230,
  feather = 25
): Promise<string> {
  if (cutoutCache.has(imageSrc)) {
    return cutoutCache.get(imageSrc)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          cutoutCache.set(imageSrc, imageSrc);
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const totalPixels = canvas.width * canvas.height;

        // Sample background color from top corners
        let bgR = 255, bgG = 255, bgB = 255;
        const samplePoints = [
          0,
          (canvas.width - 1) * 4,
          (Math.min(50, canvas.height - 1) * canvas.width) * 4,
          ((Math.min(50, canvas.height - 1) * canvas.width) + canvas.width - 1) * 4
        ];
        
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        for (const sp of samplePoints) {
          if (sp < data.length - 4) {
            sumR += data[sp];
            sumG += data[sp + 1];
            sumB += data[sp + 2];
            count++;
          }
        }
        if (count > 0) {
          bgR = sumR / count;
          bgG = sumG / count;
          bgB = sumB / count;
        }

        const minThreshold = threshold - feather;

        // Alpha mask loop with soft feathering
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Compute color distance from background or overall lightness
          const diffR = Math.abs(r - bgR);
          const diffG = Math.abs(g - bgG);
          const diffB = Math.abs(b - bgB);
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

          // If pixel is very close to white/background
          if (brightness >= threshold && diffR < 35 && diffG < 35 && diffB < 35) {
            data[i + 3] = 0; // Fully transparent
          } else if (brightness > minThreshold && diffR < 45 && diffG < 45 && diffB < 45) {
            // Feathered soft boundary for smooth hair/edges
            const factor = (threshold - brightness) / feather;
            data[i + 3] = Math.min(data[i + 3], Math.floor(Math.max(0, factor) * 255));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const transparentDataUrl = canvas.toDataURL('image/png');
        cutoutCache.set(imageSrc, transparentDataUrl);
        resolve(transparentDataUrl);
      } catch (err) {
        console.warn('Transparent cutout processing fallback:', err);
        cutoutCache.set(imageSrc, imageSrc);
        resolve(imageSrc);
      }
    };

    img.onerror = () => {
      cutoutCache.set(imageSrc, imageSrc);
      resolve(imageSrc);
    };

    img.src = imageSrc;
  });
}
