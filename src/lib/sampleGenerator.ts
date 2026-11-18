function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function buildSampleExifApp1Segment(): Uint8Array {
  // Build a valid Big-Endian TIFF/EXIF APP1 segment with IFD0, ExifIFD, and GPS IFD
  const makeStr = 'Apple\0'; // 6 bytes
  const modelStr = 'iPhone 15 Pro\0'; // 14 bytes
  const softStr = 'iOS 18.2\0'; // 9 bytes -> pad to 10
  const dateStr = '2026:11:18 14:22:09\0'; // 20 bytes
  const lensStr = 'iPhone 15 Pro back triple camera 6.765mm f/1.78\0'; // 48 bytes

  // Offsets inside TIFF header (relative to TIFF start)
  const ifd0Offset = 8;
  const ifd0Count = 6; // Make, Model, Software, DateTime, ExifIFDPointer, GPSInfoIFDPointer
  const ifd0Size = 2 + ifd0Count * 12 + 4; // 78 bytes -> ends at 86

  const exifIfdOffset = 86;
  const exifCount = 5; // ExposureTime, FNumber, ISOSpeedRatings, DateTimeOriginal, LensModel
  const exifIfdSize = 2 + exifCount * 12 + 4; // 66 bytes -> ends at 152

  const gpsIfdOffset = 152;
  const gpsCount = 5; // GPSLatitudeRef, GPSLatitude, GPSLongitudeRef, GPSLongitude, GPSAltitude
  const gpsIfdSize = 2 + gpsCount * 12 + 4; // 66 bytes -> ends at 218

  // Data area starts at 220 (even aligned)
  const dataStart = 220;
  const makeOff = dataStart; // 6 bytes -> 226
  const modelOff = 226; // 14 bytes -> 240
  const softOff = 240; // 10 bytes -> 250
  const dateOff = 250; // 20 bytes -> 270
  const exposureOff = 270; // 8 bytes (RATIONAL) -> 278
  const fnumberOff = 278; // 8 bytes (RATIONAL) -> 286
  const lensOff = 286; // 48 bytes -> 334
  const gpsLatOff = 334; // 24 bytes (3 RATIONALs: 24 deg, 42 min, 48.96 sec -> 24.7136 N) -> 358
  const gpsLngOff = 358; // 24 bytes (3 RATIONALs: 46 deg, 40 min, 31.08 sec -> 46.6753 E) -> 382
  const gpsAltOff = 382; // 8 bytes (RATIONAL: 612m) -> 390

  const tiffLength = 396;
  const app1Total = 4 + 6 + tiffLength; // FF E1 + length(2) + "Exif\0\0"(6) + tiffLength
  const seg = new Uint8Array(app1Total);
  const view = new DataView(seg.buffer);

  // APP1 marker + length
  view.setUint8(0, 0xff);
  view.setUint8(1, 0xe1);
  view.setUint16(2, app1Total - 2, false);
  writeAscii(view, 4, 'Exif');
  view.setUint8(8, 0);
  view.setUint8(9, 0);

  const t = 10; // TIFF base offset
  // TIFF Header (Big Endian 'MM')
  writeAscii(view, t, 'MM');
  view.setUint16(t + 2, 42, false);
  view.setUint32(t + 4, ifd0Offset, false);

  const writeEntry = (
    offset: number,
    tag: number,
    type: number,
    count: number,
    valueOrOffset: number
  ) => {
    view.setUint16(t + offset, tag, false);
    view.setUint16(t + offset + 2, type, false);
    view.setUint32(t + offset + 4, count, false);
    view.setUint32(t + offset + 8, valueOrOffset, false);
  };

  // IFD0
  view.setUint16(t + ifd0Offset, ifd0Count, false);
  writeEntry(ifd0Offset + 2 + 0 * 12, 0x010f, 2, makeStr.length, makeOff); // Make
  writeEntry(ifd0Offset + 2 + 1 * 12, 0x0110, 2, modelStr.length, modelOff); // Model
  writeEntry(ifd0Offset + 2 + 2 * 12, 0x0131, 2, softStr.length, softOff); // Software
  writeEntry(ifd0Offset + 2 + 3 * 12, 0x0132, 2, dateStr.length, dateOff); // DateTime
  writeEntry(ifd0Offset + 2 + 4 * 12, 0x8769, 4, 1, exifIfdOffset); // ExifIFDPointer
  writeEntry(ifd0Offset + 2 + 5 * 12, 0x8825, 4, 1, gpsIfdOffset); // GPSInfoIFDPointer
  view.setUint32(t + ifd0Offset + 2 + ifd0Count * 12, 0, false);

  // ExifIFD
  view.setUint16(t + exifIfdOffset, exifCount, false);
  writeEntry(exifIfdOffset + 2 + 0 * 12, 0x829a, 5, 1, exposureOff); // ExposureTime
  writeEntry(exifIfdOffset + 2 + 1 * 12, 0x829d, 5, 1, fnumberOff); // FNumber
  // SHORT value in Big Endian goes in upper 16 bits of 4-byte field
  view.setUint16(t + exifIfdOffset + 2 + 2 * 12, 0x8827, false);
  view.setUint16(t + exifIfdOffset + 2 + 2 * 12 + 2, 3, false);
  view.setUint32(t + exifIfdOffset + 2 + 2 * 12 + 4, 1, false);
  view.setUint16(t + exifIfdOffset + 2 + 2 * 12 + 8, 64, false); // ISO 64
  writeEntry(exifIfdOffset + 2 + 3 * 12, 0x9003, 2, dateStr.length, dateOff); // DateTimeOriginal
  writeEntry(exifIfdOffset + 2 + 4 * 12, 0xa434, 2, lensStr.length, lensOff); // LensModel
  view.setUint32(t + exifIfdOffset + 2 + exifCount * 12, 0, false);

  // GPS IFD
  view.setUint16(t + gpsIfdOffset, gpsCount, false);
  // GPSLatitudeRef = 'N\0' inline (ASCII count 2)
  view.setUint16(t + gpsIfdOffset + 2 + 0 * 12, 0x0001, false);
  view.setUint16(t + gpsIfdOffset + 2 + 0 * 12 + 2, 2, false);
  view.setUint32(t + gpsIfdOffset + 2 + 0 * 12 + 4, 2, false);
  view.setUint8(t + gpsIfdOffset + 2 + 0 * 12 + 8, 'N'.charCodeAt(0));
  view.setUint8(t + gpsIfdOffset + 2 + 0 * 12 + 9, 0);

  writeEntry(gpsIfdOffset + 2 + 1 * 12, 0x0002, 5, 3, gpsLatOff); // GPSLatitude

  // GPSLongitudeRef = 'E\0' inline (ASCII count 2)
  view.setUint16(t + gpsIfdOffset + 2 + 2 * 12, 0x0003, false);
  view.setUint16(t + gpsIfdOffset + 2 + 2 * 12 + 2, 2, false);
  view.setUint32(t + gpsIfdOffset + 2 + 2 * 12 + 4, 2, false);
  view.setUint8(t + gpsIfdOffset + 2 + 2 * 12 + 8, 'E'.charCodeAt(0));
  view.setUint8(t + gpsIfdOffset + 2 + 2 * 12 + 9, 0);

  writeEntry(gpsIfdOffset + 2 + 3 * 12, 0x0004, 5, 3, gpsLngOff); // GPSLongitude
  writeEntry(gpsIfdOffset + 2 + 4 * 12, 0x0006, 5, 1, gpsAltOff); // GPSAltitude
  view.setUint32(t + gpsIfdOffset + 2 + gpsCount * 12, 0, false);

  // Data Payloads
  writeAscii(view, t + makeOff, makeStr);
  writeAscii(view, t + modelOff, modelStr);
  writeAscii(view, t + softOff, softStr);
  writeAscii(view, t + dateOff, dateStr);
  writeAscii(view, t + lensOff, lensStr);

  // ExposureTime: 1/1250
  view.setUint32(t + exposureOff, 1, false);
  view.setUint32(t + exposureOff + 4, 1250, false);

  // FNumber: 1.78 (178/100)
  view.setUint32(t + fnumberOff, 178, false);
  view.setUint32(t + fnumberOff + 4, 100, false);

  // GPSLatitude: 24 deg, 42 min, 48.96 sec (4896/100) -> 24.7136° N
  view.setUint32(t + gpsLatOff, 24, false);
  view.setUint32(t + gpsLatOff + 4, 1, false);
  view.setUint32(t + gpsLatOff + 8, 42, false);
  view.setUint32(t + gpsLatOff + 12, 1, false);
  view.setUint32(t + gpsLatOff + 16, 4896, false);
  view.setUint32(t + gpsLatOff + 20, 100, false);

  // GPSLongitude: 46 deg, 40 min, 31.08 sec (3108/100) -> 46.6753° E
  view.setUint32(t + gpsLngOff, 46, false);
  view.setUint32(t + gpsLngOff + 4, 1, false);
  view.setUint32(t + gpsLngOff + 8, 40, false);
  view.setUint32(t + gpsLngOff + 12, 1, false);
  view.setUint32(t + gpsLngOff + 16, 3108, false);
  view.setUint32(t + gpsLngOff + 20, 100, false);

  // GPSAltitude: 612.4 m
  view.setUint32(t + gpsAltOff, 6124, false);
  view.setUint32(t + gpsAltOff + 4, 10, false);

  return seg;
}

export async function generateSampleGpsPhoto(): Promise<File> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas unavailable');
  }

  // Draw a clean architectural/topographic horizon graphic as sample photo
  const sky = ctx.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, '#0F172A');
  sky.addColorStop(0.6, '#1E3A8A');
  sky.addColorStop(1, '#3B82F6');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1200, 800);

  // Subtle sun / horizon glow
  const sun = ctx.createRadialGradient(840, 290, 15, 840, 290, 260);
  sun.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
  sun.addColorStop(0.35, 'rgba(251, 191, 36, 0.28)');
  sun.addColorStop(1, 'rgba(59, 130, 246, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 1200, 800);

  // Architectural silhouettes
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(140, 270, 110, 530);
  ctx.fillRect(280, 340, 90, 460);
  ctx.fillRect(420, 210, 130, 590);
  ctx.fillRect(610, 310, 100, 490);
  ctx.fillRect(940, 260, 120, 540);

  // Crisp grid horizon lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 1;
  for (let y = 540; y < 800; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Subtle corner frame caption
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.font = '600 22px sans-serif';
  ctx.fillText('FORENSIC SAMPLE PHOTO · EXIF + GPS EMBEDDED', 48, 745);

  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode sample JPEG'))),
      'image/jpeg',
      0.92
    );
  });

  const jpegBytes = new Uint8Array(await jpegBlob.arrayBuffer());
  const exifApp1 = buildSampleExifApp1Segment();

  // Inject EXIF APP1 right after JPEG SOI (0xFF 0xD8)
  const combined = new Uint8Array(jpegBytes.length + exifApp1.length);
  combined.set(jpegBytes.subarray(0, 2), 0);
  combined.set(exifApp1, 2);
  combined.set(jpegBytes.subarray(2), 2 + exifApp1.length);

  return new File([combined], 'sample_riyadh_capture_exif.jpg', {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}
