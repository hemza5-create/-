import React, { useMemo, useState } from 'react';
import { Check, Copy, Search, ShieldAlert } from 'lucide-react';
import type { CopySet } from '../lib/i18n';
import type { Language, MetadataCategory, MetadataEntry } from '../types/inspector';

interface MetadataTableProps {
  entries: MetadataEntry[];
  language: Language;
  copy: CopySet;
  showFilters?: boolean;
}

export const MetadataTable: React.FC<MetadataTableProps> = ({
  entries,
  language,
  copy,
  showFilters = false,
}) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | MetadataCategory>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const present = new Set(entries.map((e) => e.category));
    const list: Array<{ id: 'all' | MetadataCategory; label: string }> = [
      { id: 'all', label: copy.filterAll },
    ];
    if (present.has('general')) list.push({ id: 'general', label: copy.filterGeneral });
    if (present.has('camera')) list.push({ id: 'camera', label: copy.filterCamera });
    if (present.has('gps')) list.push({ id: 'gps', label: copy.filterGps });
    if (present.has('media')) list.push({ id: 'media', label: copy.filterMedia });
    if (present.has('device')) list.push({ id: 'device', label: copy.filterDevice });
    return list;
  }, [entries, copy]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false;
      if (!q) return true;
      const label = (language === 'ar' ? entry.labelAr : entry.labelEn).toLowerCase();
      return (
        entry.key.toLowerCase().includes(q) ||
        label.includes(q) ||
        entry.value.toLowerCase().includes(q)
      );
    });
  }, [entries, category, query, language]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="w-full min-h-[40px] ps-9 pe-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {availableCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === cat.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              {language === 'ar'
                ? 'لا توجد حقول مطابقة لبحثك الحالي.'
                : 'No metadata entries match your filter.'}
            </div>
          ) : (
            filtered.map((entry, idx) => {
              const label = language === 'ar' ? entry.labelAr : entry.labelEn;
              const isCopied = copiedKey === `${entry.key}-${idx}`;
              return (
                <div
                  key={`${entry.key}-${idx}`}
                  className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 sm:w-2/5">
                    {entry.sensitive && (
                      <ShieldAlert
                        className="w-3.5 h-3.5 text-amber-600 shrink-0"
                        aria-label={language === 'ar' ? 'بيانات حساسة' : 'Sensitive field'}
                      />
                    )}
                    <span className="text-sm font-medium text-slate-700 truncate" title={label}>
                      {label}
                    </span>
                    {label !== entry.key && (
                      <span className="text-xs font-mono text-slate-400 truncate hidden md:inline">
                        {entry.key}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0 sm:w-3/5">
                    <span
                      className="text-xs sm:text-sm font-mono tabular-nums text-slate-900 break-all text-start sm:text-end"
                      dir="ltr"
                    >
                      {entry.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${entry.key}-${idx}`, entry.value)}
                      className="min-h-[32px] px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                      title={copy.copyValue}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">{copy.copied}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span className="sr-only">{copy.copyValue}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
