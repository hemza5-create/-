import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CloudUpload,
  Copy,
  ExternalLink,
  FileCode2,
  FileDown,
  FileJson,
  FileText,
  Loader2,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { uploadBlobToGofile } from '../lib/gofileClient';
import {
  buildMarkdownReport,
  buildPlainTextReport,
  buildStandaloneHtmlReport,
  triggerTextDownload,
} from '../lib/reportExporter';
import type { CopySet } from '../lib/i18n';
import type { AiAnalysisResult, InspectionResult, Language } from '../types/inspector';

interface AiAnalysisPanelProps {
  inspection: InspectionResult | null;
  analysis: AiAnalysisResult | null;
  loading: boolean;
  error: string | null;
  language: Language;
  copy: CopySet;
  onAnalyze: () => void;
}

export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({
  inspection,
  analysis,
  loading,
  error,
  language,
  copy,
  onAnalyze,
}) => {
  const [copiedReport, setCopiedReport] = useState(false);
  const [sharedReport, setSharedReport] = useState(false);
  const [gofileUploading, setGofileUploading] = useState(false);
  const [gofileUrl, setGofileUrl] = useState<string | null>(null);
  const [gofileError, setGofileError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    setGofileUrl(null);
    setGofileError(null);
  }, [inspection?.id, analysis?.analyzedAt]);

  const safeBaseName = (inspection?.fileName || 'report').replace(/[^a-zA-Z0-9._-]/g, '_');

  const handleCopyReport = async () => {
    if (!inspection) return;
    const text = buildPlainTextReport(inspection, analysis, language);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedReport(true);
      window.setTimeout(() => setCopiedReport(false), 1800);
    } catch {
      // Clipboard restricted
    }
  };

  const handleShareReport = async () => {
    if (!inspection) return;
    const plainText = buildPlainTextReport(inspection, analysis, language);
    const htmlContent = buildStandaloneHtmlReport(inspection, analysis, language);
    const htmlFile = new File([htmlContent], `${safeBaseName}-forensic-report.html`, {
      type: 'text/html',
    });

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [htmlFile] })) {
          await navigator.share({
            title: `${copy.brandTitle} — ${inspection.fileName}`,
            text: plainText.slice(0, 600),
            files: [htmlFile],
          });
        } else {
          await navigator.share({
            title: `${copy.brandTitle} — ${inspection.fileName}`,
            text: plainText,
          });
        }
        setSharedReport(true);
        window.setTimeout(() => setSharedReport(false), 1800);
        return;
      } catch {
        // Fallback to clipboard copy below
      }
    }

    await handleCopyReport();
  };

  const handleUploadGofile = async () => {
    if (!inspection) return;
    setGofileUploading(true);
    setGofileError(null);
    try {
      const html = buildStandaloneHtmlReport(inspection, analysis, language);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const uploaded = await uploadBlobToGofile(
        blob,
        `${safeBaseName}-forensic-report.html`,
        'text/html'
      );
      setGofileUrl(uploaded.downloadPage);
    } catch (err: unknown) {
      setGofileError(err instanceof Error ? err.message : 'Failed to upload report to Gofile.io');
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

  const handleDownloadHtml = () => {
    if (!inspection) return;
    const html = buildStandaloneHtmlReport(inspection, analysis, language);
    triggerTextDownload(html, `${safeBaseName}-forensic-report.html`, 'text/html;charset=utf-8');
  };

  const handleDownloadTxt = () => {
    if (!inspection) return;
    const txt = buildPlainTextReport(inspection, analysis, language);
    triggerTextDownload(txt, `${safeBaseName}-forensic-report.txt`, 'text/plain;charset=utf-8');
  };

  const handleDownloadMd = () => {
    if (!inspection) return;
    const md = buildMarkdownReport(inspection, analysis, language);
    triggerTextDownload(md, `${safeBaseName}-forensic-report.md`, 'text/markdown;charset=utf-8');
  };

  const handleDownloadJson = () => {
    if (!inspection) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      inspection: {
        sourceType: inspection.sourceType,
        fileName: inspection.fileName,
        mimeType: inspection.mimeType,
        fileSizeBytes: inspection.fileSizeBytes,
        sha256: inspection.sha256,
        dimensions: inspection.dimensions,
        durationSeconds: inspection.durationSeconds,
        gps: inspection.gps,
        summaryEntries: inspection.summaryEntries,
        rawEntries: inspection.rawEntries,
      },
      aiAnalysis: analysis,
    };
    triggerTextDownload(
      JSON.stringify(payload, null, 2),
      `${safeBaseName}-forensic-data.json`,
      'application/json;charset=utf-8'
    );
  };

  const renderRiskBanner = (level: 'low' | 'medium' | 'high') => {
    if (level === 'high') {
      return (
        <div className="border border-red-200 bg-red-50/80 rounded-lg px-4 py-3 flex items-center gap-3 text-red-900">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
          <span className="text-sm font-semibold">{copy.riskHigh}</span>
        </div>
      );
    }
    if (level === 'medium') {
      return (
        <div className="border border-amber-200 bg-amber-50/80 rounded-lg px-4 py-3 flex items-center gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-sm font-semibold">{copy.riskMedium}</span>
        </div>
      );
    }
    return (
      <div className="border border-emerald-200 bg-emerald-50/80 rounded-lg px-4 py-3 flex items-center gap-3 text-emerald-900">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <span className="text-sm font-semibold">{copy.riskLow}</span>
      </div>
    );
  };

  return (
    <section
      id="ai-analysis"
      className="border border-slate-200 rounded-xl bg-white p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {language === 'ar' ? 'التحليل الجنائي وتقييم الخصوصية' : 'Forensic & Privacy Audit'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'ar'
              ? 'تحليل ذكي عبر Gemini للبيانات المستخرجة وكشف التسريبات الحساسة'
              : 'Powered by server-side Gemini analysis of extracted metadata'}
          </p>
        </div>

        <button
          type="button"
          onClick={onAnalyze}
          disabled={!inspection || loading}
          className="min-h-[42px] px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-500 rounded-lg transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{copy.analyzingAiBtn}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{copy.analyzeAiBtn}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-sm text-red-800 space-y-1">
          <div className="font-semibold">{copy.errorPrefix}</div>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4 animate-pulse" aria-busy="true">
          <div className="h-11 bg-slate-100 rounded-lg" />
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-5/6" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="h-16 bg-slate-100 rounded" />
          </div>
        </div>
      )}

      {!loading && !analysis && !error && (
        <div className="border border-dashed border-slate-200 rounded-lg p-6 text-center space-y-2 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-800">{copy.noAiTitle}</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            {copy.noAiDescription}
          </p>
        </div>
      )}

      {!loading && analysis && (
        <div className="space-y-5">
          {renderRiskBanner(analysis.privacyRiskLevel)}

          <div className="space-y-1.5">
            <h3 className="text-xs font-semibold text-slate-500">
              {copy.technicalSummaryHeading}
            </h3>
            <p className="text-sm text-slate-800 leading-relaxed">{analysis.technicalSummary}</p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500">
              {copy.sensitiveFindingsHeading}
            </h3>
            {analysis.sensitiveFindings.length === 0 ? (
              <p className="text-sm text-slate-600">{copy.noSensitiveFindings}</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {analysis.sensitiveFindings.map((finding, idx) => (
                  <div key={`${finding.field}-${idx}`} className="p-3 bg-white space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-900">
                        {finding.field}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          finding.severity.toLowerCase() === 'high'
                            ? 'text-red-700'
                            : finding.severity.toLowerCase() === 'medium'
                            ? 'text-amber-700'
                            : 'text-slate-600'
                        }`}
                      >
                        {finding.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{finding.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {analysis.recommendations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-500">
                {copy.recommendationsHeading}
              </h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-semibold text-slate-500">
              {copy.narrativeReportHeading}
            </h3>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {analysis.narrativeReport}
            </div>
          </div>
        </div>
      )}

      {inspection && (
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="text-xs font-medium text-slate-500">{copy.exportSectionTitle}</div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleUploadGofile}
              disabled={gofileUploading}
              className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {gofileUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CloudUpload className="w-3.5 h-3.5" />
              )}
              <span>{gofileUploading ? copy.uploadingGofile : copy.uploadGofile}</span>
            </button>

            <button
              type="button"
              onClick={handleShareReport}
              className="min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {sharedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{copy.sharedSuccess}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{copy.shareReport}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownloadHtml}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileCode2 className="w-3.5 h-3.5" />
              <span>{copy.downloadHtml}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{copy.downloadTxt}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadMd}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{copy.downloadMd}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadJson}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>{copy.downloadJson}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyReport}
              className="min-h-[38px] px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{copy.copied}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copy.copyReport}</span>
                </>
              )}
            </button>
          </div>

          {gofileError && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-xs text-red-800">
              {copy.errorPrefix} {gofileError}
            </div>
          )}

          {gofileUrl && (
            <div className="border border-blue-200 bg-blue-50/70 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
                  className="min-h-[34px] px-2.5 py-1 text-xs font-medium text-blue-900 bg-white border border-blue-200 hover:bg-blue-100 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? copy.copied : copy.copyLink}</span>
                </button>
                <a
                  href={gofileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[34px] px-2.5 py-1 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{copy.openGofileLink}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
