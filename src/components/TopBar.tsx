import React from 'react';
import type { CopySet } from '../lib/i18n';

interface TopBarProps {
  copy: CopySet;
  onPickMedia: () => void;
  onSelectDevice: () => void;
  onFocusScrubber: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  copy,
  onPickMedia,
  onSelectDevice,
  onFocusScrubber,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          {copy.brandTitle}
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a
            href="#inspector"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {copy.navInspector}
          </a>
          <a
            href="#inspector"
            onClick={(e) => {
              e.preventDefault();
              onFocusScrubber();
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {copy.navScrubber}
          </a>
          <button
            type="button"
            onClick={onSelectDevice}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copy.navDevice}
          </button>
          <a
            href="#ai-analysis"
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            {copy.navAi}
          </a>
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onPickMedia}
            className="min-h-[40px] px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {copy.primaryCta}
          </button>
        </div>
      </div>
    </header>
  );
};
