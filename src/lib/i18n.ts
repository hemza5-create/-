import type { Language } from '../types/inspector';

export interface CopySet {
  brandTitle: string;
  navInspector: string;
  navScrubber: string;
  navDevice: string;
  navAi: string;
  primaryCta: string;
  heroTitle: string;
  heroSubtitle: string;
  pickMediaBtn: string;
  inspectDeviceBtn: string;
  loadSampleBtn: string;
  analyzeAiBtn: string;
  analyzingAiBtn: string;
  dropzoneHint: string;
  supportedFormats: string;
  tabSummary: string;
  tabRaw: string;
  tabScrub: string;
  searchPlaceholder: string;
  filterAll: string;
  filterGeneral: string;
  filterCamera: string;
  filterGps: string;
  filterMedia: string;
  filterDevice: string;
  noDataTitle: string;
  noDataDescription: string;
  noAiTitle: string;
  noAiDescription: string;
  gpsDetected: string;
  noGpsDetected: string;
  openGoogleMaps: string;
  openOsm: string;
  copyValue: string;
  copied: string;
  exportSectionTitle: string;
  shareReport: string;
  sharedSuccess: string;
  copyReport: string;
  downloadHtml: string;
  downloadTxt: string;
  downloadMd: string;
  downloadJson: string;
  uploadGofile: string;
  uploadingGofile: string;
  gofileLinkReady: string;
  openGofileLink: string;
  copyLink: string;
  scrubTitle: string;
  scrubDescription: string;
  scrubFormatLabel: string;
  scrubQualityLabel: string;
  scrubActionBtn: string;
  scrubbingBtn: string;
  downloadCleanImage: string;
  shareCleanImage: string;
  quickScrubGpsBtn: string;
  originalFile: string;
  cleanedFile: string;
  tagsRemaining: string;
  tagsRemovedVerified: string;
  scrubImageOnly: string;
  riskHigh: string;
  riskMedium: string;
  riskLow: string;
  technicalSummaryHeading: string;
  sensitiveFindingsHeading: string;
  recommendationsHeading: string;
  narrativeReportHeading: string;
  noSensitiveFindings: string;
  sha256Label: string;
  fileSizeLabel: string;
  dimensionsLabel: string;
  durationLabel: string;
  mimeTypeLabel: string;
  rawTagsCount: string;
  languageSwitchLabel: string;
  footerNote: string;
  errorPrefix: string;
  recentHistoryLabel: string;
  clearHistory: string;
}

const COPY: Record<Language, CopySet> = {
  ar: {
    brandTitle: 'فاحص الوسائط والأجهزة',
    navInspector: 'المختبر',
    navScrubber: 'تنظيف EXIF',
    navDevice: 'فحص الجهاز',
    navAi: 'التحليل الذكي',
    primaryCta: 'اختيار ملف',
    heroTitle: 'محطة الفحص الجنائي للوسائط والبيانات الوصفية',
    heroSubtitle:
      'استخرج بيانات EXIF وإحداثيات GPS ومواصفات الفيديو والصوت ومعلومات الجهاز محلياً في المتصفح، ثم نظّف الصور من بيانات التتبع أو حلّل المخاطر الأمنية عبر Gemini AI.',
    pickMediaBtn: 'اختيار صورة / فيديو / صوت',
    inspectDeviceBtn: 'فحص معلومات الجهاز الحالي',
    loadSampleBtn: 'تجربة صورة ببيانات GPS',
    analyzeAiBtn: 'تحليل البيانات عبر Gemini AI',
    analyzingAiBtn: 'جاري التحليل الجنائي...',
    dropzoneHint: 'اسحب وأفلت أي ملف وسائط هنا أو انقر للاختيار من جهازك',
    supportedFormats: 'JPG · PNG · WebP · HEIC · TIFF · MP4 · MOV · WebM · MP3 · WAV',
    tabSummary: 'الملخص التقني',
    tabRaw: 'البيانات الخام',
    tabScrub: 'تنظيف الخصوصية',
    searchPlaceholder: 'ابحث داخل الحقول أو القيم...',
    filterAll: 'الكل',
    filterGeneral: 'عام',
    filterCamera: 'الكاميرا',
    filterGps: 'الموقع GPS',
    filterMedia: 'الوسائط',
    filterDevice: 'الجهاز',
    noDataTitle: 'لم يتم فحص أي وسائط أو جهاز بعد',
    noDataDescription:
      'اختر صورة أو ملف فيديو أو مقطع صوتي من جهازك، أو اضغط على فحص معلومات الجهاز الحالي، أو جرّب الصورة النموذجية المزوّدة ببيانات GPS حقيقية.',
    noAiTitle: 'بانتظار تشغيل التحليل الأمني',
    noAiDescription:
      'بعد استخراج البيانات الوصفية للملف أو الجهاز، اضغط على زر التحليل عبر Gemini AI للحصول على ملخص تقني وتقييم لمخاطر الخصوصية ونصائح حماية مخصصة.',
    gpsDetected: 'تم العثور على إحداثيات GPS مضمّنة في الملف',
    noGpsDetected:
      'لا توجد إحداثيات GPS في هذا الملف (ملاحظة: تطبيقات المراسلة ولقطات الشاشة والملفات الصوتية غالباً لا تحتوي على بيانات موقع).',
    openGoogleMaps: 'عرض على خرائط Google',
    openOsm: 'عرض على OpenStreetMap',
    copyValue: 'نسخ',
    copied: 'تم النسخ',
    exportSectionTitle: 'تحويل النتيجة ومشاركة التقرير',
    shareReport: 'مشاركة التقرير',
    sharedSuccess: 'تمت المشاركة',
    copyReport: 'نسخ التقرير',
    downloadHtml: 'تقرير HTML / للطباعة',
    downloadTxt: 'ملف نصي (.txt)',
    downloadMd: 'تنزيل Markdown',
    downloadJson: 'تنزيل JSON',
    uploadGofile: 'تصدير رابط Gofile.io',
    uploadingGofile: 'جاري الرفع على Gofile.io...',
    gofileLinkReady: 'تم تجهيز رابط التنزيل المباشر عبر Gofile.io:',
    openGofileLink: 'فتح رابط Gofile',
    copyLink: 'نسخ الرابط',
    scrubTitle: 'مسح بيانات EXIF والموقع الجغرافي قبل المشاركة',
    scrubDescription:
      'تُعاد معالجة الصورة محلياً داخل المتصفح لإزالة كافة مقاطع EXIF وGPS وIPTC وXMP والصور المصغرة المخفية دون إرسال الصورة لأي خادم.',
    scrubFormatLabel: 'صيغة الإخراج النظيف',
    scrubQualityLabel: 'جودة الضغط',
    scrubActionBtn: 'تنظيف الصورة والتحقق من خلوها',
    scrubbingBtn: 'جاري التنظيف والتحقق...',
    downloadCleanImage: 'تنزيل الصورة النظيفة',
    shareCleanImage: 'مشاركة الصورة النظيفة',
    quickScrubGpsBtn: 'تنظيف الصورة من GPS الآن',
    originalFile: 'الملف الأصلي',
    cleanedFile: 'الملف المنظّف',
    tagsRemaining: 'حقل وصفي متبقٍ',
    tagsRemovedVerified: 'تم التحقق: 0 حقول EXIF/GPS متبقية',
    scrubImageOnly: 'تتوفر أداة مسح EXIF للصور فقط. يمكنك فحص أو تنزيل التقرير للملفات الأخرى.',
    riskHigh: 'مخاطر خصوصية مرتفعة',
    riskMedium: 'مخاطر خصوصية متوسطة',
    riskLow: 'مخاطر خصوصية منخفضة',
    technicalSummaryHeading: 'الملخص التقني',
    sensitiveFindingsHeading: 'البيانات الحساسة المكتشفة',
    recommendationsHeading: 'التوصيات التقنية والأمنية',
    narrativeReportHeading: 'التقرير التحليلي المفصّل',
    noSensitiveFindings: 'لم يتم رصد حقول حساسة للخصوصية في هذا السجل.',
    sha256Label: 'البصمة SHA-256',
    fileSizeLabel: 'حجم الملف',
    dimensionsLabel: 'الأبعاد',
    durationLabel: 'المدة',
    mimeTypeLabel: 'نوع MIME',
    rawTagsCount: 'حقل مستخرج',
    languageSwitchLabel: 'English',
    footerNote: 'تُقرأ ملفات الوسائط وتُنظَّف بيانات EXIF محلياً داخل المتصفح. يُرسَل النص الوصفي فقط عند طلب تحليل Gemini AI.',
    errorPrefix: 'تعذر إتمام العملية:',
    recentHistoryLabel: 'سجل الفحص الحالي',
    clearHistory: 'مسح السجل',
  },
  en: {
    brandTitle: 'Media & Device Inspector',
    navInspector: 'Inspector',
    navScrubber: 'EXIF Scrubber',
    navDevice: 'Device Probe',
    navAi: 'AI Analysis',
    primaryCta: 'Pick Media',
    heroTitle: 'Digital Media & Device Metadata Workstation',
    heroSubtitle:
      'Extract EXIF, GPS coordinates, video/audio container atoms, and device hardware telemetry locally in your browser. Strip tracking metadata before sharing or run a forensic privacy audit via Gemini AI.',
    pickMediaBtn: 'Pick Image / Video / Audio',
    inspectDeviceBtn: 'Inspect Current Device',
    loadSampleBtn: 'Try Sample GPS Photo',
    analyzeAiBtn: 'Analyze Metadata with Gemini AI',
    analyzingAiBtn: 'Running Forensic Analysis...',
    dropzoneHint: 'Drag and drop any media file here, or click to browse locally',
    supportedFormats: 'JPG · PNG · WebP · HEIC · TIFF · MP4 · MOV · WebM · MP3 · WAV',
    tabSummary: 'Technical Summary',
    tabRaw: 'Raw Metadata',
    tabScrub: 'Privacy Scrubber',
    searchPlaceholder: 'Filter keys or values...',
    filterAll: 'All',
    filterGeneral: 'General',
    filterCamera: 'Camera',
    filterGps: 'GPS',
    filterMedia: 'Media',
    filterDevice: 'Device',
    noDataTitle: 'No media file or device inspected yet',
    noDataDescription:
      'Select an image, video, or audio file from your device, run the current device hardware probe, or load the built-in sample photo containing real binary EXIF and GPS coordinates.',
    noAiTitle: 'Ready for Forensic AI Audit',
    noAiDescription:
      'Once metadata is extracted from a file or your device, run Gemini AI analysis to get a technical breakdown, privacy exposure assessment, and actionable hardening steps.',
    gpsDetected: 'Embedded GPS coordinates detected in file',
    noGpsDetected: 'No geographic coordinates found in this source',
    openGoogleMaps: 'Open in Google Maps',
    openOsm: 'Open in OpenStreetMap',
    copyValue: 'Copy',
    copied: 'Copied',
    exportSectionTitle: 'Export & Share Report',
    shareReport: 'Share Report',
    sharedSuccess: 'Shared',
    copyReport: 'Copy Report',
    downloadHtml: 'HTML / Printable Report',
    downloadTxt: 'Plain Text (.txt)',
    downloadMd: 'Download Markdown',
    downloadJson: 'Download JSON',
    uploadGofile: 'Export Gofile.io Link',
    uploadingGofile: 'Uploading to Gofile.io...',
    gofileLinkReady: 'Direct Gofile.io download link ready:',
    openGofileLink: 'Open Gofile Link',
    copyLink: 'Copy Link',
    scrubTitle: 'Strip EXIF & GPS Metadata Before Sharing',
    scrubDescription:
      'Your image is re-encoded locally in the browser to erase all EXIF, GPS, IPTC, XMP, and embedded thumbnail blocks without uploading the image file.',
    scrubFormatLabel: 'Clean Output Format',
    scrubQualityLabel: 'Compression Quality',
    scrubActionBtn: 'Scrub Metadata & Verify',
    scrubbingBtn: 'Scrubbing & Verifying...',
    downloadCleanImage: 'Download Clean Image',
    shareCleanImage: 'Share Clean Image',
    quickScrubGpsBtn: 'Strip GPS Now',
    originalFile: 'Original File',
    cleanedFile: 'Scrubbed File',
    tagsRemaining: 'tags remaining',
    tagsRemovedVerified: 'Verified: 0 EXIF/GPS tags remaining',
    scrubImageOnly: 'EXIF scrubbing applies to image files. Use the report exporter for video, audio, or device diagnostics.',
    riskHigh: 'High Privacy Exposure',
    riskMedium: 'Medium Privacy Exposure',
    riskLow: 'Low Privacy Exposure',
    technicalSummaryHeading: 'Technical Summary',
    sensitiveFindingsHeading: 'Sensitive Fields Detected',
    recommendationsHeading: 'Technical & Privacy Recommendations',
    narrativeReportHeading: 'Detailed Forensic Report',
    noSensitiveFindings: 'No high-sensitivity privacy fields detected in this record.',
    sha256Label: 'SHA-256 Digest',
    fileSizeLabel: 'File Size',
    dimensionsLabel: 'Dimensions',
    durationLabel: 'Duration',
    mimeTypeLabel: 'MIME Type',
    rawTagsCount: 'extracted tags',
    languageSwitchLabel: 'العربية',
    footerNote: 'Media files and EXIF scrubbing execute locally in the browser. Only extracted metadata text is sent when you trigger Gemini AI analysis.',
    errorPrefix: 'Operation failed:',
    recentHistoryLabel: 'Session History',
    clearHistory: 'Clear',
  },
};

export function getCopy(lang: Language): CopySet {
  return COPY[lang];
}
