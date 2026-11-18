import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface AnalyzeRequestBody {
  metadataText?: string;
  sourceType?: 'image' | 'video' | 'audio' | 'device';
  fileName?: string;
  language?: 'ar' | 'en';
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '16mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze-metadata', async (req: Request, res: Response) => {
    const body = (req.body || {}) as AnalyzeRequestBody;
    const metadataText = typeof body.metadataText === 'string' ? body.metadataText.trim() : '';
    const sourceType = body.sourceType || 'image';
    const fileName = typeof body.fileName === 'string' ? body.fileName : 'unknown';
    const language = body.language === 'en' ? 'en' : 'ar';

    if (!metadataText) {
      res.status(400).json({
        error:
          language === 'ar'
            ? 'لا توجد بيانات وصفية كافية لإرسالها للتحليل.'
            : 'No extracted metadata was provided for analysis.',
      });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        error:
          language === 'ar'
            ? 'مفتاح GEMINI_API_KEY غير متوفر في إعدادات البيئة (Settings > Secrets).'
            : 'GEMINI_API_KEY is not configured in Settings > Secrets.',
      });
      return;
    }

    const systemInstruction =
      language === 'ar'
        ? [
            'أنت خبير في التحليل الجنائي الرقمي وأمن المعلومات وخصوصية البيانات.',
            'قم بتحليل البيانات الوصفية (Metadata) المستخرجة من الملف أو الجهاز بدقة وموضوعية.',
            'أجب باللغة العربية الفصحى الواضحة والمهنية دون مبالغة.',
            'صنّف مستوى مخاطر الخصوصية بدقة: high إذا وُجدت إحداثيات GPS دقيقة أو معرفات فريدة تكشف الهوية والموقع، medium إذا وُجد طراز جهاز دقيق أو بصمة متصفح/نظام أو تواريخ دقيقة، low إذا كانت البيانات تقنية عامة فقط ولا تكشف الموقع أو الهوية.',
          ].join(' ')
        : [
            'You are a senior digital forensics and information privacy specialist.',
            'Analyze the extracted file or device metadata objectively and accurately.',
            'Classify privacyRiskLevel strictly: "high" if exact GPS coordinates or directly identifying location/creator identifiers are present; "medium" if exact device model, timestamps, or unique hardware fingerprints are exposed; "low" if only generic technical parameters remain.',
          ].join(' ');

    const userPrompt =
      language === 'ar'
        ? `نوع المصدر: ${sourceType}
اسم الملف / الهدف: ${fileName}

البيانات الوصفية المستخرجة:
${metadataText.slice(0, 8000)}

المطلوب تحليل هذه البيانات وتقديم:
1. ملخص سريع للمعلومات التقنية.
2. تقييم مخاطر الخصوصية والحقول الحساسة المكتشفة (مثل موقع GPS، نوع الجهاز الدقيق، تاريخ الالتقاط، أو بصمة المتصفح).
3. نصائح تقنية وعملية مختصرة لحماية الخصوصية أو تحسين الأمان بناءً على هذه البيانات.
4. تقرير تحليلي متكامل.`
        : `Source type: ${sourceType}
Target name: ${fileName}

Extracted metadata:
${metadataText.slice(0, 8000)}

Provide:
1. A concise technical summary.
2. Privacy risk classification and sensitive fields detected (e.g. GPS coordinates, exact device model, capture timestamps, hardware fingerprints).
3. Practical technical and privacy recommendations tailored to this data.
4. A cohesive narrative forensic report.`;

    const startMs = Date.now();
    const callModel = async (modelName: string, timeoutMs: number) => {
      const abortController = new AbortController();
      const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);
      try {
        return await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            thinkingConfig: {
              thinkingLevel:
                modelName === 'gemini-3.1-flash-lite' ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW,
            },
            abortSignal: abortController.signal,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                technicalSummary: {
                  type: Type.STRING,
                  description: 'Concise technical summary of the inspected media or device.',
                },
                privacyRiskLevel: {
                  type: Type.STRING,
                  description: 'Strictly one of: low, medium, high',
                },
                sensitiveFindings: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      field: { type: Type.STRING },
                      severity: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['field', 'severity', 'reason'],
                  },
                },
                recommendations: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                narrativeReport: {
                  type: Type.STRING,
                  description: 'Clear multi-paragraph forensic & privacy explanation.',
                },
              },
              required: [
                'technicalSummary',
                'privacyRiskLevel',
                'sensitiveFindings',
                'recommendations',
                'narrativeReport',
              ],
            },
          },
        });
      } finally {
        clearTimeout(timeoutHandle);
      }
    };

    try {
      let usedModel = 'gemini-4-hydrogen';
      let response;

      try {
        response = await callModel('gemini-4-hydrogen', 18000);
      } catch (primaryErr: unknown) {
        const status = (primaryErr as { status?: number })?.status;
        const msg = String((primaryErr as { message?: string })?.message || '');
        const isTransient =
          status === 503 ||
          status === 500 ||
          status === 429 ||
          msg.includes('503') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('abort');

        if (!isTransient) {
          throw primaryErr;
        }

        await new Promise((r) => setTimeout(r, 700));
        try {
          usedModel = 'gemini-4-hydrogen';
          response = await callModel('gemini-4-hydrogen', 15000);
        } catch {
          usedModel = 'gemini-3.1-flash-lite';
          response = await callModel('gemini-3.1-flash-lite', 20000);
        }
      }

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        res.status(502).json({
          error:
            language === 'ar'
              ? 'لم يتم استلام استجابة من نموذج التحليل.'
              : 'Empty response received from Gemini model.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      const riskRaw = String(parsed.privacyRiskLevel || 'medium').toLowerCase();
      const privacyRiskLevel =
        riskRaw === 'high' || riskRaw === 'medium' || riskRaw === 'low' ? riskRaw : 'medium';

      console.log(`Gemini analysis (${usedModel}) completed in ${Date.now() - startMs}ms`);
      res.json({
        model: usedModel,
        analyzedAt: new Date().toISOString(),
        technicalSummary: String(parsed.technicalSummary || ''),
        privacyRiskLevel,
        sensitiveFindings: Array.isArray(parsed.sensitiveFindings) ? parsed.sensitiveFindings : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        narrativeReport: String(parsed.narrativeReport || ''),
      });
    } catch (error: unknown) {
      const errObj = error as { status?: number; message?: string; name?: string };
      const isAbort = errObj?.name === 'AbortError' || errObj?.message?.includes('abort');
      let cleanMsg = errObj?.message || 'Failed to analyze metadata with Gemini.';
      try {
        const inner = JSON.parse(cleanMsg);
        if (inner?.error?.message) {
          cleanMsg = inner.error.message;
        }
      } catch {
        // Keep raw message if not JSON
      }

      const message = isAbort
        ? language === 'ar'
          ? 'انتهت مهلة الاتصال بخدمة Gemini AI. يرجى المحاولة مرة أخرى.'
          : 'Gemini AI request timed out. Please try again.'
        : cleanMsg;
      const statusCode = isAbort
        ? 504
        : typeof errObj?.status === 'number' && errObj.status >= 400 && errObj.status < 600
        ? errObj.status
        : 500;

      console.error(`Gemini metadata analysis error (${Date.now() - startMs}ms):`, message);
      res.status(statusCode).json({
        error: message,
      });
    }
  });

  app.post('/api/export-gofile', async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      fileName?: string;
      mimeType?: string;
      base64Data?: string;
    };
    const fileName = typeof body.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : 'export.bin';
    const mimeType = typeof body.mimeType === 'string' && body.mimeType.trim() ? body.mimeType.trim() : 'application/octet-stream';
    const base64Data = typeof body.base64Data === 'string' ? body.base64Data.trim() : '';

    if (!base64Data) {
      res.status(400).json({ error: 'Missing file payload.' });
      return;
    }

    try {
      const serversResp = await fetch('https://api.gofile.io/servers');
      if (!serversResp.ok) {
        throw new Error(`Gofile server lookup failed (${serversResp.status})`);
      }
      const serversJson = (await serversResp.json()) as {
        status?: string;
        data?: { servers?: Array<{ name: string }> };
      };
      const servers = serversJson?.data?.servers || [];
      if (servers.length === 0) {
        throw new Error('No Gofile storage servers available.');
      }

      const fileBuffer = Buffer.from(base64Data, 'base64');
      let uploadedData: { downloadPage?: string; id?: string; name?: string; md5?: string } | null = null;
      let lastError = 'Gofile upload failed.';

      for (const srv of servers.slice(0, 3)) {
        try {
          const formData = new FormData();
          formData.append('file', new Blob([fileBuffer], { type: mimeType }), fileName);

          const uploadResp = await fetch(`https://${srv.name}.gofile.io/contents/uploadfile`, {
            method: 'POST',
            body: formData,
          });
          const uploadJson = (await uploadResp.json()) as {
            status?: string;
            data?: { downloadPage?: string; id?: string; name?: string; md5?: string };
          };
          if (uploadResp.ok && uploadJson?.status === 'ok' && uploadJson?.data?.downloadPage) {
            uploadedData = uploadJson.data;
            break;
          }
          lastError = `Gofile upload returned status: ${uploadJson?.status || uploadResp.status}`;
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.message : 'Network error during upload';
        }
      }

      if (!uploadedData?.downloadPage) {
        res.status(502).json({ error: lastError });
        return;
      }

      res.json({
        downloadPage: uploadedData.downloadPage,
        fileId: uploadedData.id || '',
        fileName: uploadedData.name || fileName,
        md5: uploadedData.md5 || '',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to upload to Gofile.io.';
      console.error('Gofile export error:', message);
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Media & Device Inspector server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
