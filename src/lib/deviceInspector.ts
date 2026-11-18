import type { InspectionResult, MetadataEntry } from '../types/inspector';

interface NavigatorExtended extends Navigator {
  deviceMemory?: number;
  connection?: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
    mobile?: boolean;
    platform?: string;
    getHighEntropyValues?: (hints: string[]) => Promise<{
      architecture?: string;
      bitness?: string;
      model?: string;
      platformVersion?: string;
      uaFullVersion?: string;
    }>;
  };
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
  }>;
}

function getWebGLInfo(): { vendor: string; renderer: string } | null {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      return {
        vendor: String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || ''),
        renderer: String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''),
      };
    }
    return {
      vendor: String(gl.getParameter(gl.VENDOR) || ''),
      renderer: String(gl.getParameter(gl.RENDERER) || ''),
    };
  } catch {
    return null;
  }
}

export async function inspectCurrentDevice(): Promise<InspectionResult> {
  const nav = navigator as NavigatorExtended;
  const entries: MetadataEntry[] = [];

  let platform = nav.userAgentData?.platform || nav.platform || 'Unknown';
  let model = '';
  let arch = '';
  let platformVersion = '';
  const isMobile = nav.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/i.test(nav.userAgent);

  if (nav.userAgentData?.getHighEntropyValues) {
    try {
      const high = await nav.userAgentData.getHighEntropyValues([
        'architecture',
        'bitness',
        'model',
        'platformVersion',
      ]);
      if (high.model) model = high.model;
      if (high.architecture) {
        arch = high.bitness ? `${high.architecture} (${high.bitness}-bit)` : high.architecture;
      }
      if (high.platformVersion) platformVersion = high.platformVersion;
    } catch {
      // Ignore if browser blocks high entropy hints
    }
  }

  entries.push({
    key: 'Platform',
    labelAr: 'نظام التشغيل / المنصة',
    labelEn: 'OS / Platform',
    value: platformVersion ? `${platform} ${platformVersion}` : platform,
    category: 'device',
    sensitive: true,
  });

  if (model) {
    entries.push({
      key: 'DeviceModel',
      labelAr: 'طراز الجهاز',
      labelEn: 'Device Model',
      value: model,
      category: 'device',
      sensitive: true,
    });
  }

  entries.push({
    key: 'FormFactor',
    labelAr: 'نوع الجهاز',
    labelEn: 'Form Factor',
    value: isMobile ? 'Mobile / Touch' : 'Desktop / Workstation',
    category: 'device',
  });

  if (arch) {
    entries.push({
      key: 'Architecture',
      labelAr: 'معمارية المعالج',
      labelEn: 'CPU Architecture',
      value: arch,
      category: 'device',
    });
  }

  entries.push({
    key: 'HardwareConcurrency',
    labelAr: 'أنوية المعالج المنطقية',
    labelEn: 'Logical CPU Cores',
    value: nav.hardwareConcurrency ? `${nav.hardwareConcurrency} cores` : 'Unavailable',
    category: 'device',
  });

  if (typeof nav.deviceMemory === 'number') {
    entries.push({
      key: 'DeviceMemory',
      labelAr: 'الذاكرة التقريبية (RAM)',
      labelEn: 'Approx. Device Memory',
      value: `${nav.deviceMemory} GB`,
      category: 'device',
    });
  }

  const webgl = getWebGLInfo();
  if (webgl && (webgl.renderer || webgl.vendor)) {
    entries.push({
      key: 'GpuRenderer',
      labelAr: 'معالج الرسوميات (GPU)',
      labelEn: 'GPU / WebGL Renderer',
      value: [webgl.vendor, webgl.renderer].filter(Boolean).join(' — '),
      category: 'device',
      sensitive: true,
    });
  }

  const gamut = window.matchMedia('(color-gamut: p3)').matches ? 'Display P3' : 'sRGB';
  entries.push({
    key: 'ScreenDisplay',
    labelAr: 'الشاشة ونسبة البكسل',
    labelEn: 'Screen & DPR',
    value: `${window.screen.width} × ${window.screen.height} · DPR ${window.devicePixelRatio} · ${window.screen.colorDepth}-bit · ${gamut}`,
    category: 'device',
  });

  entries.push({
    key: 'ViewportSize',
    labelAr: 'مساحة العرض الحالية',
    labelEn: 'Active Viewport',
    value: `${window.innerWidth} × ${window.innerHeight} px`,
    category: 'device',
  });

  entries.push({
    key: 'TouchSupport',
    labelAr: 'نقاط اللمس المدعومة',
    labelEn: 'Max Touch Points',
    value: `${nav.maxTouchPoints ?? 0}`,
    category: 'device',
  });

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  entries.push({
    key: 'TimezoneLocale',
    labelAr: 'المنطقة الزمنية واللغة',
    labelEn: 'Timezone & Locale',
    value: `${tz} · ${nav.languages?.join(', ') || nav.language}`,
    category: 'device',
    sensitive: true,
  });

  if (nav.connection) {
    const conn = nav.connection;
    const parts = [
      conn.effectiveType ? `Type: ${conn.effectiveType.toUpperCase()}` : '',
      typeof conn.downlink === 'number' ? `${conn.downlink} Mbps` : '',
      typeof conn.rtt === 'number' ? `RTT ${conn.rtt}ms` : '',
    ].filter(Boolean);
    if (parts.length > 0) {
      entries.push({
        key: 'NetworkInfo',
        labelAr: 'حالة الاتصال والشبكة',
        labelEn: 'Network Telemetry',
        value: parts.join(' · '),
        category: 'device',
      });
    }
  }

  if (typeof nav.getBattery === 'function') {
    try {
      const battery = await nav.getBattery();
      entries.push({
        key: 'BatteryStatus',
        labelAr: 'حالة البطارية',
        labelEn: 'Battery Status',
        value: `${Math.round(battery.level * 100)}% (${battery.charging ? 'Charging' : 'Discharging'})`,
        category: 'device',
      });
    } catch {
      // Ignore battery API restrictions
    }
  }

  entries.push({
    key: 'UserAgent',
    labelAr: 'سلسلة وكيل المستخدم (User-Agent)',
    labelEn: 'User-Agent String',
    value: nav.userAgent,
    category: 'device',
    sensitive: true,
  });

  const formattedText = entries.map((e) => `${e.labelEn} (${e.key}): ${e.value}`).join('\n');

  return {
    id: `device-${Date.now()}`,
    sourceType: 'device',
    fileName: model || platform || 'Current Browser Device',
    mimeType: 'application/x-device-telemetry',
    fileSizeBytes: null,
    sha256: null,
    previewUrl: null,
    dimensions: `${window.screen.width} × ${window.screen.height}`,
    durationSeconds: null,
    gps: null,
    summaryEntries: entries,
    rawEntries: entries,
    formattedText,
    capturedAt: new Date().toISOString(),
  };
}
