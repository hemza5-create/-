import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  Download,
  Eraser,
  ExternalLink,
  Loader2,
  Share2,
} from 'lucide-react';
import { scrubImageMetadata, type ScrubOutputFormat } from '../lib/exifScrubber';
import { uploadBlobToGofile } from '../lib/gofileClient';
import { formatBytes } from '../lib/mediaInspector';
import type { CopySet } from '../lib/i18n';
import type { InspectionResult, Language, ScrubbedImageResult } from '../types/inspector';

interface ExifScrubberPanelProps {
  inspection: InspectionResult;
  language: Language;
  copy: CopySet;
  autoTriggerKey?: number;
}

export const ExifScrubberPanel: React.FC<ExifScrubberPanelProps> = ({
  inspection,
  language,
  copy,
  autoTriggerKey = 0,
}) => {
  const [format, setFormat] = useState<ScrubOutputFormat>('image/jpeg');
  const [quality, setQuality] = useState<number>(0.92);
  const [scrubbing, setScrubbing] = useState(false);
  const [result, setResult] = useState<ScrubbedImageResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [gofileUploading, setGofileUploading] = useState(false);
  const [gofileUrl, setGofileUrl] = useState<string | null>(null);
  const [gofileError, setGofileError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleScrub = useCallback(async () => {
    if (!inspection.sourceFile) return;
    setScrubbing(true);
    setError(null);
    setGofileUrl(null);
    setGofileError(null);
    try {
      const scrubbed = await scrubImageMetadata(
        inspection.sourceFile,
        format,
        inspection.rawEntries.length,
        quality
      );
      setResult((prev) => {
        if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
        return scrubbed;
      });
      if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function') {
        const testFile = new File([scrubbed.blob], scrubbed.fileName, {
          type: scrubbed.mimeType,
        });
        setCanShareFile(navigator.canShare({ files: [testFile] }));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to scrub image metadata');
    } finally {
      setScrubbing(false);
    }
  }, [inspection.sourceFile, inspection.rawEntries.length, format, quality]);

  useEffect(() => {
    setResult((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setError(null);
    setGofileUrl(null);
    setGofileError(null);
  }, [inspection.id]);

  useEffect(() => {
    if (autoTriggerKey > 0 && inspection.sourceType === 'image' && inspection.sourceFile) {
      void handleScrub();
    }
  }, [autoTriggerKey, inspection.sourceType, inspection.sourceFile, handleScrub]);

  if (inspection.sourceType !== 'image' || !inspection.sourceFile) {
    return (
      <div className="border border-slate-200 rounded-lg bg-slate-50 p-6 text-sm text-slate-600">
        {copy.scrubImageOnly}
      </div>
    );
  }

  const handleShare = async () => {
    if (!result || typeof navigator.share !== 'function') return;
    const cleanFile = new File([result.blob], result.fileName, { type: result.mimeType });
    try {
      await navigator.share({
        title: result.fileName,
        files: [cleanFile],
      });
    } catch {
      // User cancelled share sheet
    }
  };

  const handleUploadGofile = async () => {
    if (!result) return;
    setGofileUploading(true);
    setGofileError(null);
    try {
      const uploaded = await uploadBlobToGofile(result.blob, result.fileName, result.mimeType);
      setGofileUrl(uploaded.downloadPage);
    } catch (err: unknown) {
      setGofileError(err instanceof Error ? err.message : 'Failed to upload to Gofile.io');
    } finally {
      setGofileUploading(false);
    }
  };

  const handleCopyGofileUrl = async () => {
    if (!gofileUrl) return;
    try {
      await navigator.clipboard.writeText(gofileUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // Clipboard restricted
    }
  };

  return (
    <div id="scrubber" className="space-y-5">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-slate-900">{copy.scrubTitle}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{copy.scrubDescription}</p>
      </div>

      <div className="flex flex-col gap-4 border border-slate-200 rounded-lg p-4 bg-slate-50/70">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-slate-600">{copy.scrubFormatLabel}</span>
            <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {(
                [
                  { mime: 'image/jpeg', label: 'JPEG' },
                  { mime: 'image/png', label: 'PNG' },
                  { mime: 'image/webp', label: 'WebP' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.mime}
                  type="button"
                  onClick={() => setFormat(opt.mime)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    format === opt.mime
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {format !== 'image/png' && (
            <div className="space-y-1.5">
              <span className="block text-xs font-medium text-slate-600">
                {copy.scrubQualityLabel}
              </span>
              <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                {(
                  [
                    { val: 0.75, label: '75%' },
                    { val: 0.92, label: '92%' },
                    { val: 1.0, label: '100%' },
                  ] as const
                ).map((q) => (
                  <button
                    key={q.val}
                    type="button"
                    onClick={() => setQuality(q.val)}
                    className={`px-3 py-1.5 text-xs font-mono tabular-nums font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      quality === q.val
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleScrub}
            disabled={scrubbing}
            className="min-h-[42px] px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {scrubbing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{copy.scrubbingBtn}</span>
              </>
            ) : (
              <>
                <Eraser className="w-4 h-4" />
                <span>{copy.scrubActionBtn}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3 text-sm">
          {copy.errorPrefix} {error}
        </div>
      )}

      {result && (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-emerald-50/70 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{copy.tagsRemovedVerified}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canShareFile && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-emerald-900 bg-white border border-emerald-300 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copy.shareCleanImage}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleUploadGofile}
                disabled={gofileUploading}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                {gofileUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CloudUpload className="w-3.5 h-3.5" />
                )}
                <span>{gofileUploading ? copy.uploadingGofile : copy.uploadGofile}</span>
              </button>
              <a
                href={result.previewUrl}
                download={result.fileName}
                className="min-h-[38px] px-4 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{copy.downloadCleanImage}</span>
              </a>
            </div>
          </div>

          {gofileError && (
            <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-800">
              {copy.errorPrefix} {gofileError}
            </div>
          )}

          {gofileUrl && (
            <div className="px-4 py-3 bg-blue-50/70 border-b border-blue-200 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-medium text-blue-900">{copy.gofileLinkReady}</div>
                <a
                  href={gofileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono text-blue-700 hover:underline break-all"
                  dir="ltr"
                >
                  {gofileUrl}
                </a>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyGofileUrl}
                  className="min-h-[34px] px-3 py-1 text-xs font-medium text-blue-900 bg-white border border-blue-200 hover:bg-blue-100 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? copy.copied : copy.copyLink}</span>
                </button>
                <a
                  href={gofileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[34px] px-3 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{copy.openGofileLink}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200">
            <div className="p-4 space-y-2">
              <div className="text-xs font-medium text-slate-500">{copy.originalFile}</div>
              <div className="text-sm font-medium text-slate-900 truncate">{inspection.fileName}</div>
              <div className="text-xs font-mono tabular-nums text-slate-600 flex items-center gap-2">
                <span>{formatBytes(result.originalSizeBytes)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {result.originalTagCount} {copy.rawTagsCount}
                </span>
              </div>
            </div>

            <div className="p-4 space-y-2">
              <div className="text-xs font-medium text-slate-500">{copy.cleanedFile}</div>
              <div className="text-sm font-medium text-slate-900 truncate">{result.fileName}</div>
              <div className="text-xs font-mono tabular-nums text-emerald-700 flex items-center gap-2">
                <span>{formatBytes(result.scrubbedSizeBytes)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {result.remainingTagCount} {copy.tagsRemaining}
                </span>
                {language === 'ar' ? null : (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {result.width}×{result.height}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
