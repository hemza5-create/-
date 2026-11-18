/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  Eraser,
  ExternalLink,
  FileAudio,
  FileImage,
  FileVideo,
  Globe,
  HardDrive,
  Languages,
  Loader2,
  MapPin,
  Smartphone,
  Upload,
} from 'lucide-react';
import { AiAnalysisPanel } from './components/AiAnalysisPanel';
import { ExifScrubberPanel } from './components/ExifScrubberPanel';
import { MetadataTable } from './components/MetadataTable';
import { TopBar } from './components/TopBar';
import { inspectCurrentDevice } from './lib/deviceInspector';
import { getCopy } from './lib/i18n';
import { formatBytes, formatDuration, inspectMediaFile } from './lib/mediaInspector';
import { generateSampleGpsPhoto } from './lib/sampleGenerator';
import type { AiAnalysisResult, InspectionResult, Language } from './types/inspector';

type ActiveTab = 'summary' | 'raw' | 'scrub';

interface SessionItem {
  inspection: InspectionResult;
  analysis: AiAnalysisResult | null;
}

export default function App() {
  const [language, setLanguage] = useState<Language>('ar');
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [autoScrubTrigger, setAutoScrubTrigger] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copy = getCopy(language);

  const activeSession = sessions.find((s) => s.inspection.id === activeId) ?? null;
  const activeInspection = activeSession?.inspection ?? null;
  const activeAnalysis = activeSession?.analysis ?? null;

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const registerInspection = useCallback((result: InspectionResult) => {
    setSessions((prev) => [{ inspection: result, analysis: null }, ...prev].slice(0, 8));
    setActiveId(result.id);
    setActiveTab('summary');
    setAiError(null);
    setExtractError(null);
  }, []);

  const handleFileProcess = useCallback(
    async (file: File) => {
      setExtracting(true);
      setExtractError(null);
      try {
        const result = await inspectMediaFile(file);
        registerInspection(result);
      } catch (err: unknown) {
        setExtractError(err instanceof Error ? err.message : 'Unable to read file metadata.');
      } finally {
        setExtracting(false);
      }
    },
    [registerInspection]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
    e.target.value = '';
  };

  const handleInspectDevice = async () => {
    setExtracting(true);
    setExtractError(null);
    try {
      const result = await inspectCurrentDevice();
      registerInspection(result);
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Unable to probe device.');
    } finally {
      setExtracting(false);
    }
  };

  const handleLoadSample = async () => {
    setExtracting(true);
    setExtractError(null);
    try {
      const sampleFile = await generateSampleGpsPhoto();
      const result = await inspectMediaFile(sampleFile);
      registerInspection(result);
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Unable to generate sample image.');
    } finally {
      setExtracting(false);
    }
  };

  const handleAnalyzeWithAi = async () => {
    if (!activeInspection) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch('/api/analyze-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadataText: activeInspection.formattedText,
          sourceType: activeInspection.sourceType,
          fileName: activeInspection.fileName,
          language,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Request failed (${response.status})`);
      }

      const targetId = activeInspection.id;
      setSessions((prev) =>
        prev.map((item) =>
          item.inspection.id === targetId ? { ...item, analysis: data as AiAnalysisResult } : item
        )
      );
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Failed to analyze metadata.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearHistory = () => {
    for (const item of sessions) {
      if (item.inspection.previewUrl) {
        URL.revokeObjectURL(item.inspection.previewUrl);
      }
    }
    setSessions([]);
    setActiveId(null);
    setAiError(null);
    setExtractError(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileProcess(file);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const renderSourceIcon = (sourceType: InspectionResult['sourceType']) => {
    if (sourceType === 'image') return <FileImage className="w-5 h-5 text-blue-700 shrink-0" />;
    if (sourceType === 'video') return <FileVideo className="w-5 h-5 text-blue-700 shrink-0" />;
    if (sourceType === 'audio') return <FileAudio className="w-5 h-5 text-blue-700 shrink-0" />;
    return <Smartphone className="w-5 h-5 text-blue-700 shrink-0" />;
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <TopBar
        copy={copy}
        onPickMedia={openFilePicker}
        onSelectDevice={handleInspectDevice}
        onFocusScrubber={() => {
          setActiveTab('scrub');
          document.getElementById('inspector')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero & Action Intake Toolbar */}
        <section className="border border-slate-200 rounded-xl bg-white p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 headline-balance">
                {copy.heroTitle}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                {copy.heroSubtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLanguage((prev) => (prev === 'ar' ? 'en' : 'ar'))}
              className="self-start min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Languages className="w-4 h-4 text-slate-600" />
              <span>{copy.languageSwitchLabel}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openFilePicker}
              disabled={extracting}
              className="min-h-[42px] px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>{copy.pickMediaBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleInspectDevice}
              disabled={extracting}
              className="min-h-[42px] px-4 py-2 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-slate-700" />
              <span>{copy.inspectDeviceBtn}</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              disabled={extracting}
              className="min-h-[42px] px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-600" />
              <span>{copy.loadSampleBtn}</span>
            </button>
          </div>

          {/* Drag & Drop Intake Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFilePicker();
              }
            }}
            className={`border border-dashed rounded-lg px-4 py-5 text-center transition-colors cursor-pointer ${
              isDragging
                ? 'border-blue-600 bg-blue-50/70'
                : 'border-slate-300 bg-slate-50/60 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            <p className="text-sm font-medium text-slate-700">{copy.dropzoneHint}</p>
            <p className="text-xs font-mono text-slate-500 mt-1" dir="ltr">
              {copy.supportedFormats}
            </p>
          </div>

          {extractError && (
            <div className="border border-red-200 bg-red-50 text-red-800 rounded-lg p-3 text-sm">
              {copy.errorPrefix} {extractError}
            </div>
          )}

          {sessions.length > 0 && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                  {copy.recentHistoryLabel}:
                </span>
                {sessions.map((item) => {
                  const isActive = item.inspection.id === activeId;
                  return (
                    <button
                      key={item.inspection.id}
                      type="button"
                      onClick={() => {
                        setActiveId(item.inspection.id);
                        setAiError(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors max-w-[200px] truncate cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title={item.inspection.fileName}
                    >
                      {item.inspection.fileName}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs font-medium text-slate-500 hover:text-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                {copy.clearHistory}
              </button>
            </div>
          )}
        </section>

        {/* Main 12-Column Forensic Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Primary Column: Media Preview & Metadata Explorer */}
          <section
            id="inspector"
            className="lg:col-span-7 border border-slate-200 rounded-xl bg-white p-5 sm:p-6 space-y-5"
          >
            {!activeInspection ? (
              <div className="py-14 px-4 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <HardDrive className="w-6 h-6 text-slate-500" />
                </div>
                <h2 className="text-base font-semibold text-slate-900">{copy.noDataTitle}</h2>
                <p className="text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                  {copy.noDataDescription}
                </p>
              </div>
            ) : (
              <>
                {/* Source Identity & Key Metrics */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                      {renderSourceIcon(activeInspection.sourceType)}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h2
                        className="text-base font-semibold text-slate-900 truncate"
                        title={activeInspection.fileName}
                      >
                        {activeInspection.fileName}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
                        <span className="font-mono">{activeInspection.mimeType}</span>
                        {activeInspection.fileSizeBytes !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{formatBytes(activeInspection.fileSizeBytes)}</span>
                          </>
                        )}
                        {activeInspection.dimensions && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span dir="ltr">{activeInspection.dimensions}</span>
                          </>
                        )}
                        {activeInspection.durationSeconds !== null && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span dir="ltr">{formatDuration(activeInspection.durationSeconds)}</span>
                          </>
                        )}
                        {activeInspection.rawEntries.length > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {activeInspection.rawEntries.length} {copy.rawTagsCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Viewport (Image / Video / Audio) */}
                {activeInspection.previewUrl && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center">
                    {activeInspection.sourceType === 'image' && (
                      <img
                        src={activeInspection.previewUrl}
                        alt={activeInspection.fileName}
                        referrerPolicy="no-referrer"
                        className="max-h-[340px] w-auto object-contain"
                      />
                    )}
                    {activeInspection.sourceType === 'video' && (
                      <video
                        src={activeInspection.previewUrl}
                        controls
                        className="max-h-[340px] w-full"
                      />
                    )}
                    {activeInspection.sourceType === 'audio' && (
                      <div className="w-full p-5 bg-slate-50">
                        <audio src={activeInspection.previewUrl} controls className="w-full" />
                      </div>
                    )}
                  </div>
                )}

                {/* GPS Location Alert Strip */}
                {activeInspection.gps ? (
                  <div className="border border-amber-200 bg-amber-50/70 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-amber-950">
                          {copy.gpsDetected}
                        </div>
                        <div className="text-xs font-mono tabular-nums text-amber-900" dir="ltr">
                          {activeInspection.gps.latitude}, {activeInspection.gps.longitude}
                          {activeInspection.gps.altitude !== null
                            ? ` · Alt ${activeInspection.gps.altitude}m`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {activeInspection.sourceType === 'image' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('scrub');
                            setAutoScrubTrigger((n) => n + 1);
                          }}
                          className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-white bg-amber-800 hover:bg-amber-900 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>{copy.quickScrubGpsBtn}</span>
                        </button>
                      )}
                      <a
                        href={activeInspection.gps.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-amber-950 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span>{copy.openGoogleMaps}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <a
                        href={activeInspection.gps.osmUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-amber-950 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>{copy.openOsm}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 flex items-center gap-2 px-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{copy.noGpsDetected}</span>
                  </div>
                )}

                {/* Segmented Inspector View Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit max-w-full overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('summary')}
                    className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'summary'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {copy.tabSummary}
                  </button>

                  {activeInspection.rawEntries.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('raw')}
                      className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        activeTab === 'raw'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {copy.tabRaw} ({activeInspection.rawEntries.length})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActiveTab('scrub')}
                    className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === 'scrub'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {copy.tabScrub}
                  </button>
                </div>

                {/* Tab Body */}
                {activeTab === 'summary' && (
                  <MetadataTable
                    entries={activeInspection.summaryEntries}
                    language={language}
                    copy={copy}
                    showFilters={false}
                  />
                )}

                {activeTab === 'raw' && (
                  <MetadataTable
                    entries={activeInspection.rawEntries}
                    language={language}
                    copy={copy}
                    showFilters={true}
                  />
                )}

                {activeTab === 'scrub' && (
                  <ExifScrubberPanel
                    inspection={activeInspection}
                    language={language}
                    copy={copy}
                    autoTriggerKey={autoScrubTrigger}
                  />
                )}
              </>
            )}
          </section>

          {/* Secondary Column: Gemini AI Forensic Audit & Export */}
          <div className="lg:col-span-5">
            <AiAnalysisPanel
              inspection={activeInspection}
              analysis={activeAnalysis}
              loading={aiLoading}
              error={aiError}
              language={language}
              copy={copy}
              onAnalyze={handleAnalyzeWithAi}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>{copy.brandTitle}</span>
          <span className="text-center sm:text-end">{copy.footerNote}</span>
        </div>
      </footer>
    </div>
  );
}
