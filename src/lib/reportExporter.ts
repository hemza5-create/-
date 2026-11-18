import type { AiAnalysisResult, InspectionResult, Language } from '../types/inspector';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildMarkdownReport(
  inspection: InspectionResult,
  aiAnalysis: AiAnalysisResult | null,
  lang: Language
): string {
  const isAr = lang === 'ar';
  const lines: string[] = [];

  lines.push(
    isAr
      ? `# تقرير الفحص الجنائي الرقمي — ${inspection.fileName}`
      : `# Digital Media & Device Forensic Report — ${inspection.fileName}`
  );
  lines.push('');
  lines.push(
    isAr
      ? `- **نوع المصدر:** ${inspection.sourceType}`
      : `- **Source Type:** ${inspection.sourceType}`
  );
  lines.push(
    isAr
      ? `- **تاريخ التقرير:** ${new Date().toISOString()}`
      : `- **Generated At:** ${new Date().toISOString()}`
  );
  if (inspection.sha256) {
    lines.push(`- **SHA-256:** \`${inspection.sha256}\``);
  }
  lines.push('');

  lines.push(isAr ? '## البيانات المستخرجة (Metadata)' : '## Extracted Metadata');
  lines.push('');
  for (const entry of inspection.summaryEntries) {
    const label = isAr ? entry.labelAr : entry.labelEn;
    lines.push(`- **${label}:** ${entry.value}`);
  }

  if (inspection.gps) {
    lines.push('');
    lines.push(isAr ? '## بيانات الموقع الجغرافي (GPS)' : '## Embedded GPS Coordinates');
    lines.push(`- **Latitude / Longitude:** ${inspection.gps.latitude}, ${inspection.gps.longitude}`);
    lines.push(`- **Google Maps:** ${inspection.gps.googleMapsUrl}`);
    lines.push(`- **OpenStreetMap:** ${inspection.gps.osmUrl}`);
  }

  if (aiAnalysis) {
    lines.push('');
    lines.push(isAr ? '## تحليل Gemini AI الأمني والتقني' : '## Gemini AI Forensic & Privacy Audit');
    lines.push(
      isAr
        ? `- **مستوى مخاطر الخصوصية:** ${aiAnalysis.privacyRiskLevel.toUpperCase()}`
        : `- **Privacy Risk Level:** ${aiAnalysis.privacyRiskLevel.toUpperCase()}`
    );
    lines.push('');
    lines.push(isAr ? '### الملخص التقني' : '### Technical Summary');
    lines.push(aiAnalysis.technicalSummary);

    if (aiAnalysis.sensitiveFindings.length > 0) {
      lines.push('');
      lines.push(isAr ? '### الحقول الحساسة المكتشفة' : '### Sensitive Findings');
      for (const f of aiAnalysis.sensitiveFindings) {
        lines.push(`- **${f.field}** (${f.severity}): ${f.reason}`);
      }
    }

    if (aiAnalysis.recommendations.length > 0) {
      lines.push('');
      lines.push(isAr ? '### التوصيات' : '### Recommendations');
      for (const rec of aiAnalysis.recommendations) {
        lines.push(`- ${rec}`);
      }
    }

    lines.push('');
    lines.push(isAr ? '### التقرير التحليلي' : '### Narrative Report');
    lines.push(aiAnalysis.narrativeReport);
  }

  if (inspection.rawEntries.length > 0) {
    lines.push('');
    lines.push(isAr ? '## البيانات الخام (Raw Tags)' : '## Raw Metadata Tags');
    lines.push('');
    lines.push('| Tag | Value |');
    lines.push('| --- | --- |');
    for (const raw of inspection.rawEntries.slice(0, 120)) {
      lines.push(`| ${raw.key} | ${raw.value.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |`);
    }
  }

  return lines.join('\n');
}

export function buildPlainTextReport(
  inspection: InspectionResult,
  aiAnalysis: AiAnalysisResult | null,
  lang: Language
): string {
  const isAr = lang === 'ar';
  const lines: string[] = [];
  lines.push(
    isAr
      ? `تقرير الفحص الجنائي الرقمي — ${inspection.fileName}`
      : `Digital Media & Device Forensic Report — ${inspection.fileName}`
  );
  lines.push('==================================================');
  lines.push(`${isAr ? 'نوع المصدر' : 'Source Type'}: ${inspection.sourceType}`);
  lines.push(`${isAr ? 'تاريخ التقرير' : 'Generated'}: ${new Date().toISOString()}`);
  if (inspection.sha256) {
    lines.push(`SHA-256: ${inspection.sha256}`);
  }
  lines.push('');
  lines.push(isAr ? '--- البيانات المستخرجة ---' : '--- Extracted Metadata ---');
  for (const entry of inspection.summaryEntries) {
    lines.push(`${isAr ? entry.labelAr : entry.labelEn}: ${entry.value}`);
  }
  if (inspection.gps) {
    lines.push('');
    lines.push(
      `${isAr ? 'إحداثيات GPS' : 'GPS Coordinates'}: ${inspection.gps.latitude}, ${inspection.gps.longitude}`
    );
    lines.push(`Google Maps: ${inspection.gps.googleMapsUrl}`);
  }
  if (aiAnalysis) {
    lines.push('');
    lines.push(isAr ? '--- التحليل الأمني (Gemini AI) ---' : '--- Gemini AI Privacy Audit ---');
    lines.push(
      `${isAr ? 'مستوى المخاطر' : 'Privacy Risk'}: ${aiAnalysis.privacyRiskLevel.toUpperCase()}`
    );
    lines.push(aiAnalysis.technicalSummary);
    if (aiAnalysis.recommendations.length > 0) {
      lines.push('');
      lines.push(isAr ? 'التوصيات:' : 'Recommendations:');
      aiAnalysis.recommendations.forEach((rec, i) => lines.push(`${i + 1}. ${rec}`));
    }
    lines.push('');
    lines.push(aiAnalysis.narrativeReport);
  }
  return lines.join('\n');
}

export function buildStandaloneHtmlReport(
  inspection: InspectionResult,
  aiAnalysis: AiAnalysisResult | null,
  lang: Language
): string {
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const title = isAr
    ? `تقرير الفحص الجنائي — ${inspection.fileName}`
    : `Forensic Inspection Report — ${inspection.fileName}`;

  const summaryRows = inspection.summaryEntries
    .map(
      (entry) => `
      <tr>
        <th>${escapeHtml(isAr ? entry.labelAr : entry.labelEn)}</th>
        <td><code>${escapeHtml(entry.value)}</code></td>
      </tr>`
    )
    .join('');

  const rawRows = inspection.rawEntries
    .slice(0, 150)
    .map(
      (entry) => `
      <tr>
        <th><code>${escapeHtml(entry.key)}</code></th>
        <td><code>${escapeHtml(entry.value)}</code></td>
      </tr>`
    )
    .join('');

  const gpsSection = inspection.gps
    ? `
    <section class="card alert">
      <h2>${isAr ? 'بيانات الموقع الجغرافي (GPS)' : 'Embedded GPS Location'}</h2>
      <p><code>${inspection.gps.latitude}, ${inspection.gps.longitude}</code>${
        inspection.gps.altitude !== null ? ` · Alt ${inspection.gps.altitude}m` : ''
      }</p>
      <p>
        <a href="${escapeHtml(inspection.gps.googleMapsUrl)}" target="_blank" rel="noopener noreferrer">Google Maps</a> ·
        <a href="${escapeHtml(inspection.gps.osmUrl)}" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </p>
    </section>`
    : '';

  const aiSection = aiAnalysis
    ? `
    <section class="card">
      <h2>${isAr ? 'التحليل الجنائي وتقييم الخصوصية (Gemini AI)' : 'Gemini AI Forensic & Privacy Audit'}</h2>
      <p><strong>${isAr ? 'مستوى المخاطر:' : 'Risk Level:'}</strong> ${escapeHtml(
        aiAnalysis.privacyRiskLevel.toUpperCase()
      )}</p>
      <p>${escapeHtml(aiAnalysis.technicalSummary)}</p>
      ${
        aiAnalysis.sensitiveFindings.length > 0
          ? `<h3>${isAr ? 'الحقول الحساسة' : 'Sensitive Findings'}</h3>
             <ul>${aiAnalysis.sensitiveFindings
               .map(
                 (f) =>
                   `<li><strong>${escapeHtml(f.field)}</strong> (${escapeHtml(f.severity)}): ${escapeHtml(
                     f.reason
                   )}</li>`
               )
               .join('')}</ul>`
          : ''
      }
      ${
        aiAnalysis.recommendations.length > 0
          ? `<h3>${isAr ? 'التوصيات' : 'Recommendations'}</h3>
             <ul>${aiAnalysis.recommendations
               .map((r) => `<li>${escapeHtml(r)}</li>`)
               .join('')}</ul>`
          : ''
      }
      <h3>${isAr ? 'التقرير المفصّل' : 'Narrative Report'}</h3>
      <p style="white-space: pre-line;">${escapeHtml(aiAnalysis.narrativeReport)}</p>
    </section>`
    : '';

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px 16px; line-height: 1.6; }
    .container { max-width: 900px; margin: 0 auto; }
    header { margin-bottom: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 16px; }
    h1 { font-size: 22px; margin: 0 0 6px; }
    h2 { font-size: 16px; margin: 0 0 12px; color: #0f172a; }
    h3 { font-size: 14px; margin: 16px 0 8px; color: #334155; }
    .meta { font-size: 12px; color: #475569; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 18px; }
    .alert { background: #fffbeb; border-color: #fde68a; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: start; padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    th { width: 35%; color: #475569; font-weight: 600; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; word-break: break-all; }
    a { color: #1d4ed8; }
    @media print { body { background: #fff; padding: 0; } .card { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">${escapeHtml(inspection.mimeType)} · ${escapeHtml(
    new Date().toISOString().replace('T', ' ').slice(0, 19)
  )} UTC</div>
    </header>
    ${gpsSection}
    <section class="card">
      <h2>${isAr ? 'الملخص التقني والبيانات المستخرجة' : 'Technical Summary & Extracted Metadata'}</h2>
      <table><tbody>${summaryRows}</tbody></table>
    </section>
    ${aiSection}
    ${
      rawRows
        ? `<section class="card">
             <h2>${isAr ? 'البيانات الخام' : 'Raw Metadata Tags'}</h2>
             <table><tbody>${rawRows}</tbody></table>
           </section>`
        : ''
    }
  </div>
</body>
</html>`;
}

export function triggerTextDownload(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
