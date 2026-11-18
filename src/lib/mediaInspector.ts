import exifr from 'exifr';
import type {
  GpsLocation,
  InspectionResult,
  InspectionSourceType,
  MetadataCategory,
  MetadataEntry,
} from '../types/inspector';

export function formatBytes(bytes: number | null): string {
  if (bytes === null || Number.isNaN(bytes)) return '-';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(2)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '-';
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function computeSha256(buffer: ArrayBuffer): Promise<string | null> {
  try {
    if (!crypto?.subtle) return null;
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

function formatTagValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? '' : val.toISOString().replace('T', ' ').slice(0, 19);
  }
  if (val instanceof Uint8Array || ArrayBuffer.isView(val)) {
    return `[Binary ${val.byteLength} bytes]`;
  }
  if (Array.isArray(val)) {
    return val.map((item) => formatTagValue(item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? String(val) : Number(val.toFixed(5)).toString();
  }
  return String(val).trim();
}

function inferCategory(key: string): MetadataCategory {
  const k = key.toLowerCase();
  if (k.includes('gps') || k === 'latitude' || k === 'longitude') return 'gps';
  if (
    k.includes('make') ||
    k.includes('model') ||
    k.includes('lens') ||
    k.includes('exposure') ||
    k.includes('fnumber') ||
    k.includes('iso') ||
    k.includes('focal') ||
    k.includes('flash') ||
    k.includes('aperture') ||
    k.includes('shutter') ||
    k.includes('whitebalance')
  ) {
    return 'camera';
  }
  if (
    k.includes('width') ||
    k.includes('height') ||
    k.includes('bitrate') ||
    k.includes('duration') ||
    k.includes('audio') ||
    k.includes('video') ||
    k.includes('color')
  ) {
    return 'media';
  }
  return 'general';
}

function isSensitiveTag(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k.includes('gps') ||
    k === 'latitude' ||
    k === 'longitude' ||
    k.includes('serial') ||
    k.includes('owner') ||
    k.includes('artist') ||
    k.includes('author') ||
    k.includes('creator') ||
    k.includes('make') ||
    k.includes('model') ||
    k.includes('software') ||
    k.includes('datetime') ||
    k.includes('createdate')
  );
}

function parseDmsCoordinate(raw: unknown, ref?: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const sign = typeof ref === 'string' && /^[SW]/i.test(ref.trim()) ? -1 : 1;
    return raw < 0 ? raw : raw * sign;
  }
  if (Array.isArray(raw) && raw.length >= 2) {
    const d = Number(raw[0]) || 0;
    const m = Number(raw[1]) || 0;
    const s = Number(raw[2]) || 0;
    let dec = Math.abs(d) + m / 60 + s / 3600;
    if (d < 0) dec = -dec;
    if (typeof ref === 'string' && /^[SW]/i.test(ref.trim())) {
      dec = -Math.abs(dec);
    }
    return Number.isFinite(dec) ? dec : null;
  }
  if (typeof raw === 'string') {
    const str = raw.trim();
    const numeric = Number(str);
    if (Number.isFinite(numeric)) {
      const sign = typeof ref === 'string' && /^[SW]/i.test(ref.trim()) ? -1 : 1;
      return numeric < 0 ? numeric : numeric * sign;
    }
    // XMP format like "24,42.816N" or "24° 42' 48.96\" N"
    const xmpMatch = str.match(/^(-?\d+(?:\.\d+)?)[,\s°]+(\d+(?:\.\d+)?)(?:[,\s']+(\d+(?:\.\d+)?))?["\s]*([NSEW])?$/i);
    if (xmpMatch) {
      const deg = Number(xmpMatch[1]);
      const min = Number(xmpMatch[2]) || 0;
      const sec = Number(xmpMatch[3]) || 0;
      let dec = Math.abs(deg) + min / 60 + sec / 3600;
      const dir = (xmpMatch[4] || (typeof ref === 'string' ? ref : '')).toUpperCase();
      if (deg < 0 || dir === 'S' || dir === 'W') dec = -Math.abs(dec);
      return Number.isFinite(dec) ? dec : null;
    }
  }
  return null;
}

function extractFallbackImageGps(
  parsedAll: Record<string, unknown> | null | undefined
): { latitude: number; longitude: number; altitude: number | null } | null {
  if (!parsedAll) return null;

  let lat = parseDmsCoordinate(parsedAll.latitude);
  let lng = parseDmsCoordinate(parsedAll.longitude);

  if (lat === null || lng === null) {
    lat = parseDmsCoordinate(parsedAll.GPSLatitude, parsedAll.GPSLatitudeRef);
    lng = parseDmsCoordinate(parsedAll.GPSLongitude, parsedAll.GPSLongitudeRef);
  }

  if (
    lat === null ||
    lng === null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180 ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  const alt =
    typeof parsedAll.GPSAltitude === 'number' && Number.isFinite(parsedAll.GPSAltitude)
      ? Number(parsedAll.GPSAltitude.toFixed(1))
      : null;

  return {
    latitude: Number(lat.toFixed(6)),
    longitude: Number(lng.toFixed(6)),
    altitude: alt,
  };
}

function getImageDimensionsFromBrowser(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

function getMediaElementMetadata(
  url: string,
  kind: 'video' | 'audio'
): Promise<{ duration: number | null; width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    const el = document.createElement(kind);
    el.preload = 'metadata';
    const timer = window.setTimeout(() => {
      resolve({ duration: null, width: null, height: null });
    }, 4000);

    el.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const duration = Number.isFinite(el.duration) ? el.duration : null;
      const width = kind === 'video' && el instanceof HTMLVideoElement && el.videoWidth > 0 ? el.videoWidth : null;
      const height = kind === 'video' && el instanceof HTMLVideoElement && el.videoHeight > 0 ? el.videoHeight : null;
      resolve({ duration, width, height });
    };

    el.onerror = () => {
      window.clearTimeout(timer);
      resolve({ duration: null, width: null, height: null });
    };

    el.src = url;
  });
}

function parseIso6709Location(raw: string): { lat: number; lng: number; alt: number | null } | null {
  const match = raw.match(/([+-]\d{1,2}(?:\.\d+)?)([+-]\d{1,3}(?:\.\d+)?)([+-]\d+(?:\.\d+)?)?/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  const alt = match[3] ? Number(match[3]) : null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) return null;
  return {
    lat,
    lng,
    alt: alt !== null && Number.isFinite(alt) ? Number(alt.toFixed(1)) : null,
  };
}

function extractMp4Atoms(buffer: ArrayBuffer): Record<string, string> {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const result: Record<string, string> = {};
  const quickTimeKeys: string[] = [];

  const readAscii = (start: number, len: number) => {
    let out = '';
    for (let i = 0; i < len && start + i < bytes.length; i++) {
      out += String.fromCharCode(bytes[start + i]);
    }
    return out;
  };

  const containerBoxes = new Set(['moov', 'udta', 'meta', 'ilst', 'trak', 'mdia']);

  function scan(offset: number, end: number, depth: number) {
    if (depth > 7) return;
    let pos = offset;
    while (pos + 8 <= end) {
      let size = view.getUint32(pos, false);
      const type = readAscii(pos + 4, 4);
      let headerSize = 8;

      if (size === 1 && pos + 16 <= end) {
        const hi = view.getUint32(pos + 8, false);
        const lo = view.getUint32(pos + 12, false);
        size = hi * 2 ** 32 + lo;
        headerSize = 16;
      } else if (size === 0) {
        size = end - pos;
      }

      if (size < headerSize || pos + size > end) break;

      const bodyStart = pos + headerSize;
      const bodyEnd = pos + size;

      if (type === 'mvhd' && bodyStart + 16 <= bodyEnd) {
        const version = bytes[bodyStart];
        let secs = 0;
        if (version === 0 && bodyStart + 20 <= bodyEnd) {
          secs = view.getUint32(bodyStart + 4, false);
        } else if (version === 1 && bodyStart + 28 <= bodyEnd) {
          const hi = view.getUint32(bodyStart + 4, false);
          const lo = view.getUint32(bodyStart + 8, false);
          secs = hi * 2 ** 32 + lo;
        }
        if (secs > 2082844800) {
          const unixMs = (secs - 2082844800) * 1000;
          const date = new Date(unixMs);
          if (!Number.isNaN(date.getTime())) {
            result['CreationDate'] = date.toISOString().replace('T', ' ').slice(0, 19);
          }
        }
      } else if (type === 'keys' && bodyStart + 8 <= bodyEnd) {
        // QuickTime 'meta -> keys' atom stores 1-based key names for 'ilst' items
        const entryCount = view.getUint32(bodyStart + 4, false);
        let kPos = bodyStart + 8;
        for (let i = 0; i < entryCount && kPos + 8 <= bodyEnd; i++) {
          const keySize = view.getUint32(kPos, false);
          if (keySize < 8 || kPos + keySize > bodyEnd) break;
          const keyName = decoder.decode(bytes.subarray(kPos + 8, kPos + keySize)).trim();
          quickTimeKeys.push(keyName);
          kPos += keySize;
        }
      } else if (type === 'ilst') {
        // Parse numbered items inside ilst (matching quickTimeKeys) or standard © boxes
        let iPos = bodyStart;
        while (iPos + 8 <= bodyEnd) {
          const itemSize = view.getUint32(iPos, false);
          if (itemSize < 8 || iPos + itemSize > bodyEnd) break;
          const itemIdx = view.getUint32(iPos + 4, false);
          const itemType = readAscii(iPos + 4, 4);

          // Look for 'data' sub-atom inside item
          let subPos = iPos + 8;
          while (subPos + 16 <= iPos + itemSize) {
            const subSize = view.getUint32(subPos, false);
            const subType = readAscii(subPos + 4, 4);
            if (subSize < 8 || subPos + subSize > iPos + itemSize) break;
            if (subType === 'data' && subSize > 16) {
              const valText = decoder
                .decode(bytes.subarray(subPos + 16, subPos + subSize))
                .replace(/[^\x20-\x7E\u0600-\u06FF]/g, '')
                .trim();
              if (valText) {
                const mappedKey =
                  itemIdx >= 1 && itemIdx <= quickTimeKeys.length
                    ? quickTimeKeys[itemIdx - 1]
                    : itemType;
                if (mappedKey.includes('location.ISO6709') || mappedKey.endsWith('xyz')) {
                  result['ISO6709Location'] = valText;
                } else if (mappedKey === 'com.apple.quicktime.make') {
                  result['DeviceMake'] = valText;
                } else if (mappedKey === 'com.apple.quicktime.model') {
                  result['DeviceModel'] = valText;
                } else if (mappedKey === 'com.apple.quicktime.software') {
                  result['Software'] = valText;
                } else if (mappedKey === 'com.apple.quicktime.creationdate') {
                  result['CreationDate'] = valText;
                } else {
                  result[mappedKey] = valText;
                }
              }
            }
            subPos += subSize;
          }
          iPos += itemSize;
        }
      } else if (type === '\u00a9xyz' || type === '©xyz') {
        // Android / ISO 14496 ©xyz box starts with 2-byte length + 2-byte language code
        const textStart = bodyStart + 4 < bodyEnd ? bodyStart + 4 : bodyStart;
        const text = decoder
          .decode(bytes.subarray(textStart, bodyEnd))
          .replace(/[^\x20-\x7E]/g, '')
          .trim();
        if (text) result['ISO6709Location'] = text;
      } else if (
        type === '\u00a9nam' ||
        type === '©nam' ||
        type === '\u00a9ART' ||
        type === '©ART' ||
        type === '\u00a9too' ||
        type === '©too' ||
        type === '\u00a9day' ||
        type === '©day'
      ) {
        const textStart = bodyStart + 4 < bodyEnd ? bodyStart + 4 : bodyStart;
        const text = decoder
          .decode(bytes.subarray(textStart, bodyEnd))
          .replace(/[^\x20-\x7E\u0600-\u06FF]/g, '')
          .trim();
        if (text) {
          const cleanKey =
            type.endsWith('nam')
              ? 'Title'
              : type.endsWith('ART')
              ? 'Artist'
              : type.endsWith('too')
              ? 'Encoder'
              : 'RecordedDate';
          result[cleanKey] = text;
        }
      } else if (containerBoxes.has(type)) {
        const nextStart = type === 'meta' ? bodyStart + 4 : bodyStart;
        if (nextStart < bodyEnd) {
          scan(nextStart, bodyEnd, depth + 1);
        }
      }

      pos += size;
    }
  }

  scan(0, bytes.length, 0);

  // Fallback scan in case ©xyz or ISO-6709 location was placed inside a custom udta wrapper
  if (!result['ISO6709Location'] && bytes.length < 32 * 1024 * 1024) {
    const tailSlice = bytes.length > 2 * 1024 * 1024 ? bytes.subarray(bytes.length - 512 * 1024) : bytes;
    const asciiChunk = decoder.decode(tailSlice);
    const isoMatch = asciiChunk.match(/([+-]\d{1,2}\.\d{3,}[+-]\d{1,3}\.\d{3,}(?:[+-]\d+(?:\.\d+)?)?)\//);
    if (isoMatch) {
      result['ISO6709Location'] = isoMatch[1];
    }
  }

  return result;
}

function extractId3v2Tags(buffer: ArrayBuffer): Record<string, string> {
  const bytes = new Uint8Array(buffer);
  const result: Record<string, string> = {};
  if (bytes.length < 10) return result;
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return result;

  const version = bytes[3];
  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);

  const end = Math.min(bytes.length, 10 + tagSize);
  let pos = 10;
  const utf8 = new TextDecoder('utf-8', { fatal: false });
  const latin1 = new TextDecoder('iso-8859-1');

  const frameMap: Record<string, string> = {
    TIT2: 'Title',
    TPE1: 'Artist',
    TALB: 'Album',
    TDRC: 'RecordingDate',
    TYER: 'Year',
    TSSE: 'Encoder',
    TCON: 'Genre',
    TCOP: 'Copyright',
  };

  while (pos + 10 <= end && version >= 3) {
    const id = String.fromCharCode(bytes[pos], bytes[pos + 1], bytes[pos + 2], bytes[pos + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;

    const size =
      version === 4
        ? ((bytes[pos + 4] & 0x7f) << 21) |
          ((bytes[pos + 5] & 0x7f) << 14) |
          ((bytes[pos + 6] & 0x7f) << 7) |
          (bytes[pos + 7] & 0x7f)
        : (bytes[pos + 4] << 24) |
          (bytes[pos + 5] << 16) |
          (bytes[pos + 6] << 8) |
          bytes[pos + 7];

    if (size <= 0 || pos + 10 + size > end) break;
    const payload = bytes.subarray(pos + 10, pos + 10 + size);
    if (frameMap[id] && payload.length > 1) {
      const enc = payload[0];
      const textBytes = payload.subarray(1);
      let decoded = enc === 0 ? latin1.decode(textBytes) : utf8.decode(textBytes);
      decoded = decoded.replace(/\0/g, '').trim();
      if (decoded) result[frameMap[id]] = decoded;
    }

    pos += 10 + size;
  }

  return result;
}

export async function inspectMediaFile(file: File): Promise<InspectionResult> {
  const mimeType = file.type || inferMimeFromName(file.name);
  const sourceType: InspectionSourceType = mimeType.startsWith('video/')
    ? 'video'
    : mimeType.startsWith('audio/')
    ? 'audio'
    : 'image';

  const buffer = await file.arrayBuffer();
  const sha256 = await computeSha256(buffer);
  const previewUrl = URL.createObjectURL(file);

  const summaryEntries: MetadataEntry[] = [
    {
      key: 'FileName',
      labelAr: 'اسم الملف',
      labelEn: 'File Name',
      value: file.name,
      category: 'general',
    },
    {
      key: 'MimeType',
      labelAr: 'نوع الملف (MIME)',
      labelEn: 'MIME Type',
      value: mimeType,
      category: 'general',
    },
    {
      key: 'FileSize',
      labelAr: 'حجم الملف',
      labelEn: 'File Size',
      value: `${formatBytes(file.size)} (${file.size.toLocaleString()} bytes)`,
      category: 'general',
    },
    {
      key: 'LastModified',
      labelAr: 'تاريخ التعديل المحلي',
      labelEn: 'File Last Modified',
      value: new Date(file.lastModified).toISOString().replace('T', ' ').slice(0, 19),
      category: 'general',
    },
  ];

  if (sha256) {
    summaryEntries.push({
      key: 'SHA256',
      labelAr: 'بصمة SHA-256',
      labelEn: 'SHA-256 Digest',
      value: sha256,
      category: 'general',
    });
  }

  const rawEntries: MetadataEntry[] = [];
  let dimensions: string | null = null;
  let durationSeconds: number | null = null;
  let gps: GpsLocation | null = null;

  if (sourceType === 'image') {
    const imgDims = await getImageDimensionsFromBrowser(previewUrl);
    if (imgDims) {
      dimensions = `${imgDims.width} × ${imgDims.height}`;
      summaryEntries.push({
        key: 'Dimensions',
        labelAr: 'الأبعاد الفعلية',
        labelEn: 'Image Dimensions',
        value: `${imgDims.width} × ${imgDims.height} px`,
        category: 'media',
      });
    }

    try {
      const [parsedAll, parsedGps] = await Promise.all([
        exifr
          .parse(buffer, {
            tiff: true,
            exif: true,
            gps: true,
            iptc: true,
            xmp: true,
            icc: true,
            jfif: true,
            ihdr: true,
          })
          .catch(() => null),
        exifr.gps(buffer).catch(() => null),
      ]);

      const resolvedCoords =
        parsedGps &&
        typeof parsedGps.latitude === 'number' &&
        typeof parsedGps.longitude === 'number' &&
        Number.isFinite(parsedGps.latitude) &&
        Number.isFinite(parsedGps.longitude)
          ? {
              latitude: Number(parsedGps.latitude.toFixed(6)),
              longitude: Number(parsedGps.longitude.toFixed(6)),
              altitude:
                parsedAll && typeof parsedAll.GPSAltitude === 'number'
                  ? Number(parsedAll.GPSAltitude.toFixed(1))
                  : null,
            }
          : extractFallbackImageGps(parsedAll as Record<string, unknown> | null);

      if (resolvedCoords) {
        const { latitude: lat, longitude: lng, altitude: alt } = resolvedCoords;
        gps = {
          latitude: lat,
          longitude: lng,
          altitude: alt,
          googleMapsUrl: `https://maps.google.com/?q=${lat},${lng}`,
          osmUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`,
        };

        summaryEntries.push({
          key: 'GPSCoordinates',
          labelAr: 'إحداثيات الموقع (GPS)',
          labelEn: 'GPS Coordinates',
          value: `${lat}, ${lng}${alt !== null ? ` (${alt} m)` : ''}`,
          category: 'gps',
          sensitive: true,
        });
      }

      if (parsedAll && typeof parsedAll === 'object') {
        const make = formatTagValue(parsedAll.Make);
        const model = formatTagValue(parsedAll.Model);
        const dateTaken = formatTagValue(
          parsedAll.DateTimeOriginal || parsedAll.CreateDate || parsedAll.ModifyDate
        );
        const software = formatTagValue(parsedAll.Software);
        const lens = formatTagValue(parsedAll.LensModel);
        const iso = formatTagValue(parsedAll.ISO);
        const fNumber = formatTagValue(parsedAll.FNumber);
        const exposure = parsedAll.ExposureTime
          ? parsedAll.ExposureTime < 1
            ? `1/${Math.round(1 / Number(parsedAll.ExposureTime))}s`
            : `${parsedAll.ExposureTime}s`
          : '';
        const focal = formatTagValue(parsedAll.FocalLength);

        if (dateTaken) {
          summaryEntries.push({
            key: 'DateTimeOriginal',
            labelAr: 'تاريخ الالتقاط',
            labelEn: 'Capture Date',
            value: dateTaken,
            category: 'camera',
            sensitive: true,
          });
        }
        if (make || model) {
          summaryEntries.push({
            key: 'CameraDevice',
            labelAr: 'الشركة والطراز',
            labelEn: 'Camera Make & Model',
            value: [make, model].filter(Boolean).join(' '),
            category: 'camera',
            sensitive: true,
          });
        }
        if (lens) {
          summaryEntries.push({
            key: 'LensModel',
            labelAr: 'طراز العدسة',
            labelEn: 'Lens Model',
            value: lens,
            category: 'camera',
          });
        }
        if (exposure || fNumber || iso || focal) {
          const settings = [
            focal ? `${focal}mm` : '',
            fNumber ? `f/${fNumber}` : '',
            exposure,
            iso ? `ISO ${iso}` : '',
          ]
            .filter(Boolean)
            .join(' · ');
          summaryEntries.push({
            key: 'ExposureSettings',
            labelAr: 'إعدادات التعريض',
            labelEn: 'Exposure Settings',
            value: settings,
            category: 'camera',
          });
        }
        if (software) {
          summaryEntries.push({
            key: 'Software',
            labelAr: 'برنامج المعالجة / النظام',
            labelEn: 'Software / OS',
            value: software,
            category: 'general',
            sensitive: true,
          });
        }

        for (const [k, v] of Object.entries(parsedAll)) {
          const formatted = formatTagValue(v);
          if (!formatted) continue;
          rawEntries.push({
            key: k,
            labelAr: k,
            labelEn: k,
            value: formatted,
            category: inferCategory(k),
            sensitive: isSensitiveTag(k),
          });
        }
      }
    } catch {
      // Non-EXIF images like clean PNG/WebP still provide size, dimensions, and SHA-256
    }
  } else {
    const mediaMeta = await getMediaElementMetadata(previewUrl, sourceType);
    durationSeconds = mediaMeta.duration;
    if (mediaMeta.width && mediaMeta.height) {
      dimensions = `${mediaMeta.width} × ${mediaMeta.height}`;
      summaryEntries.push({
        key: 'VideoResolution',
        labelAr: 'دقة الفيديو',
        labelEn: 'Video Resolution',
        value: `${mediaMeta.width} × ${mediaMeta.height} px`,
        category: 'media',
      });
    }
    if (durationSeconds !== null) {
      summaryEntries.push({
        key: 'Duration',
        labelAr: 'المدة الزمنية',
        labelEn: 'Duration',
        value: `${formatDuration(durationSeconds)} (${durationSeconds.toFixed(2)}s)`,
        category: 'media',
      });
      if (durationSeconds > 0) {
        const approxBitrateKbps = Math.round((file.size * 8) / durationSeconds / 1000);
        summaryEntries.push({
          key: 'EstimatedBitrate',
          labelAr: 'معدل البت التقريبي',
          labelEn: 'Estimated Bitrate',
          value: `${approxBitrateKbps.toLocaleString()} kbps`,
          category: 'media',
        });
      }
    }

    const containerTags =
      mimeType.includes('mp4') ||
      mimeType.includes('quicktime') ||
      file.name.match(/\.(mp4|mov|m4a|m4v|3gp)$/i)
        ? extractMp4Atoms(buffer)
        : mimeType.includes('mpeg') || file.name.match(/\.mp3$/i)
        ? extractId3v2Tags(buffer)
        : {};

    for (const [k, v] of Object.entries(containerTags)) {
      if (k === 'ISO6709Location') {
        const coords = parseIso6709Location(v);
        if (coords) {
          gps = {
            latitude: Number(coords.lat.toFixed(6)),
            longitude: Number(coords.lng.toFixed(6)),
            altitude: coords.alt,
            googleMapsUrl: `https://maps.google.com/?q=${coords.lat},${coords.lng}`,
            osmUrl: `https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=15/${coords.lat}/${coords.lng}`,
          };
          summaryEntries.push({
            key: 'GPSCoordinates',
            labelAr: 'الموقع الجغرافي المضمّن',
            labelEn: 'Embedded Location',
            value: `${gps.latitude}, ${gps.longitude}${gps.altitude !== null ? ` (${gps.altitude} m)` : ''}`,
            category: 'gps',
            sensitive: true,
          });
        }
      } else {
        summaryEntries.push({
          key: k,
          labelAr: k,
          labelEn: k,
          value: v,
          category: k.includes('Date') ? 'general' : k.startsWith('Device') ? 'camera' : 'media',
          sensitive: isSensitiveTag(k),
        });
      }

      rawEntries.push({
        key: k,
        labelAr: k,
        labelEn: k,
        value: v,
        category: k === 'ISO6709Location' ? 'gps' : 'media',
        sensitive: isSensitiveTag(k) || k === 'ISO6709Location',
      });
    }
  }

  const formattedText = buildFormattedMetadataText(summaryEntries, rawEntries, gps);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceType,
    fileName: file.name,
    mimeType,
    fileSizeBytes: file.size,
    sha256,
    previewUrl,
    dimensions,
    durationSeconds,
    gps,
    summaryEntries,
    rawEntries,
    formattedText,
    capturedAt: new Date().toISOString(),
    sourceFile: file,
  };
}

function buildFormattedMetadataText(
  summaryEntries: MetadataEntry[],
  rawEntries: MetadataEntry[],
  gps: GpsLocation | null
): string {
  const lines = summaryEntries.map((entry) => `${entry.labelEn} (${entry.key}): ${entry.value}`);
  if (gps) {
    lines.push(`Map Link: ${gps.googleMapsUrl}`);
  }
  if (rawEntries.length > 0) {
    lines.push('', '--- Additional Raw Tags ---');
    for (const raw of rawEntries.slice(0, 60)) {
      lines.push(`${raw.key}: ${raw.value}`);
    }
  }
  return lines.join('\n');
}

function inferMimeFromName(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    tif: 'image/tiff',
    tiff: 'image/tiff',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    ogg: 'audio/ogg',
  };
  return map[ext] || 'application/octet-stream';
}
