export type Language = 'ar' | 'en';

export type InspectionSourceType = 'image' | 'video' | 'audio' | 'device';

export type MetadataCategory =
  | 'general'
  | 'camera'
  | 'gps'
  | 'media'
  | 'device'
  | 'raw';

export interface MetadataEntry {
  key: string;
  labelAr: string;
  labelEn: string;
  value: string;
  category: MetadataCategory;
  sensitive?: boolean;
}

export interface GpsLocation {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  googleMapsUrl: string;
  osmUrl: string;
}

export interface InspectionResult {
  id: string;
  sourceType: InspectionSourceType;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  sha256: string | null;
  previewUrl: string | null;
  dimensions: string | null;
  durationSeconds: number | null;
  gps: GpsLocation | null;
  summaryEntries: MetadataEntry[];
  rawEntries: MetadataEntry[];
  formattedText: string;
  capturedAt: string;
  sourceFile?: File;
}

export interface SensitiveFinding {
  field: string;
  severity: 'low' | 'medium' | 'high' | string;
  reason: string;
}

export interface AiAnalysisResult {
  model: string;
  analyzedAt: string;
  technicalSummary: string;
  privacyRiskLevel: 'low' | 'medium' | 'high';
  sensitiveFindings: SensitiveFinding[];
  recommendations: string[];
  narrativeReport: string;
}

export interface ScrubbedImageResult {
  blob: Blob;
  previewUrl: string;
  fileName: string;
  mimeType: string;
  originalSizeBytes: number;
  scrubbedSizeBytes: number;
  originalTagCount: number;
  remainingTagCount: number;
  width: number;
  height: number;
}
