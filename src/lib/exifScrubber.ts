import exifr from 'exifr';
import type { ScrubbedImageResult } from '../types/inspector';

export type ScrubOutputFormat = 'image/jpeg' | 'image/png' | 'image/webp';

export async function scrubImageMetadata(
  file: File,
  outputFormat: ScrubOutputFormat = 'image/jpeg',
  originalTagCount = 0,
  quality = 0.92
): Promise<ScrubbedImageResult> {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Failed to decode image in browser canvas.'));
      image.src = sourceUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is unavailable.');
    }

    if (outputFormat === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0);

    const safeQuality = Math.min(1, Math.max(0.5, quality));
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Failed to encode scrubbed image.'));
        },
        outputFormat,
        outputFormat === 'image/png' ? undefined : safeQuality
      );
    });

    const verification = await exifr
      .parse(blob, { tiff: true, exif: true, gps: true, iptc: true, xmp: true })
      .catch(() => null);

    const remainingTagCount =
      verification && typeof verification === 'object' ? Object.keys(verification).length : 0;

    const ext = outputFormat === 'image/png' ? 'png' : outputFormat === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanFileName = `${baseName}-clean.${ext}`;

    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      fileName: cleanFileName,
      mimeType: outputFormat,
      originalSizeBytes: file.size,
      scrubbedSizeBytes: blob.size,
      originalTagCount,
      remainingTagCount,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}
