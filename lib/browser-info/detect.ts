/**
 * Browser information detection functions.
 * All detection runs client-side by calling browser APIs directly.
 */

import type {
  BrowserInfo,
  BrowserIdentity,
  ClientHints,
  Hardware,
  GpuInfo,
  LocaleTime,
  Network,
  OperatingSystem,
  Plugins,
  ScreenDisplay,
  StorageFeatures,
  UaBrand,
  WebGpuInfo,
} from "./types";

/**
 * Network Information API type definition.
 */
interface NetworkInformation {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

/**
 * Hints that only `getHighEntropyValues()` will return. The `NavigatorUAData`
 * object exposes nothing but `brands`, `mobile` and `platform` synchronously,
 * so every one of these has to be awaited.
 */
const HIGH_ENTROPY_HINTS = [
  "architecture",
  "bitness",
  "formFactors",
  "fullVersionList",
  "model",
  "platformVersion",
  "uaFullVersion",
  "wow64",
] as const;

/** Values returned by `getHighEntropyValues()`. */
interface HighEntropyValues {
  architecture?: string;
  bitness?: string;
  formFactors?: string[];
  fullVersionList?: UaBrand[];
  model?: string;
  platformVersion?: string;
  uaFullVersion?: string;
  wow64?: boolean;
}

/**
 * User-Agent Client Hints API type definition.
 */
interface UserAgentData {
  brands?: UaBrand[];
  mobile?: boolean;
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<HighEntropyValues>;
}

/** GPUAdapterInfo / WebGPU surface, typed only as far as this tool reads it. */
interface GpuAdapterInfo {
  vendor?: string;
  architecture?: string;
  device?: string;
  description?: string;
}

interface GpuAdapter {
  info?: GpuAdapterInfo;
  requestAdapterInfo?: () => Promise<GpuAdapterInfo>;
}

interface NavigatorGpu {
  requestAdapter: () => Promise<GpuAdapter | null>;
}

/**
 * Extended navigator type covering non-standard properties
 * that various browsers expose.
 */
interface ExtendedNavigator extends Omit<
  Navigator,
  "pdfViewerEnabled" | "gpu"
> {
  buildID?: string;
  pdfViewerEnabled?: boolean;
  globalPrivacyControl?: boolean;
  deviceMemory?: number;
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
  oscpu?: string;
  cpuClass?: string;
  userAgentData?: UserAgentData;
  gpu?: NavigatorGpu;
}

/**
 * Reads the full set of User-Agent Client Hints (Chromium only).
 * The high-entropy half is asynchronous and gated on a secure context, so this
 * resolves to null in Safari, Firefox, and over plain HTTP.
 */
export async function detectClientHints(): Promise<ClientHints | null> {
  const nav =
    typeof navigator !== "undefined" ? (navigator as ExtendedNavigator) : null;
  const uaData = nav?.userAgentData;
  if (!uaData) return null;

  let high: HighEntropyValues = {};
  if (typeof uaData.getHighEntropyValues === "function") {
    try {
      high = await uaData.getHighEntropyValues([...HIGH_ENTROPY_HINTS]);
    } catch {
      // Insecure context or a hint this browser rejects; keep the low-entropy half.
    }
  }

  return {
    architecture: high.architecture || null,
    bitness: high.bitness || null,
    brands: uaData.brands ?? null,
    fullVersionList: high.fullVersionList ?? null,
    formFactors: high.formFactors ?? null,
    // Desktop Chromium returns "" here rather than omitting it.
    model: high.model || null,
    mobile: uaData.mobile ?? null,
    platform: uaData.platform || null,
    platformVersion: high.platformVersion || null,
    uaFullVersion: high.uaFullVersion || null,
    wow64: high.wow64 ?? null,
  };
}

/**
 * Detects browser identity information from navigator APIs.
 */
export function detectBrowserIdentity(
  clientHints: ClientHints | null,
): BrowserIdentity {
  const nav =
    typeof navigator !== "undefined" ? (navigator as ExtendedNavigator) : null;

  if (!nav) {
    return {
      userAgent: "Not available",
      platform: null,
      vendor: null,
      appName: null,
      appVersion: null,
      appCodeName: null,
      product: null,
      productSub: null,
      vendorSub: null,
      buildId: null,
      pdfViewerEnabled: null,
      cookiesEnabled: null,
      doNotTrack: null,
      globalPrivacyControl: null,
      javaEnabled: null,
      online: false,
      clientHints: null,
    };
  }

  return {
    userAgent: nav.userAgent || "Not available",
    platform: nav.platform || null,
    vendor: nav.vendor || null,
    appName: nav.appName || null,
    appVersion: nav.appVersion || null,
    appCodeName: nav.appCodeName || null,
    product: nav.product || null,
    productSub: nav.productSub || null,
    vendorSub: nav.vendorSub || null,
    buildId: nav.buildID || null,
    pdfViewerEnabled: nav.pdfViewerEnabled ?? null,
    cookiesEnabled: nav.cookieEnabled ?? null,
    doNotTrack: nav.doNotTrack || null,
    globalPrivacyControl: nav.globalPrivacyControl ?? null,
    javaEnabled:
      typeof nav.javaEnabled === "function" ? nav.javaEnabled() : null,
    online: nav.onLine ?? false,
    clientHints,
  };
}

/**
 * Windows stopped moving its NT version after 10, so every Windows 10 and 11
 * machine sends "Windows NT 10.0". The Client Hints platform version is the
 * only in-page signal that separates them: Windows 11 reports 13 or higher.
 */
const WINDOWS_11_MIN_PLATFORM_VERSION = 13;

function windowsVersionFromHints(
  platformVersion: string | null,
): string | null {
  if (!platformVersion) return null;

  const major = Number.parseInt(platformVersion.split(".")[0] ?? "", 10);
  if (Number.isNaN(major)) return null;

  if (major >= WINDOWS_11_MIN_PLATFORM_VERSION) return "11";
  if (major >= 1) return "10";
  return "8.1 or earlier";
}

/**
 * Detects operating system information from Client Hints, user agent and platform.
 */
export function detectOperatingSystem(
  clientHints: ClientHints | null,
): OperatingSystem {
  const nav =
    typeof navigator !== "undefined" ? (navigator as ExtendedNavigator) : null;
  const platform = nav?.platform || "";
  const userAgent = nav?.userAgent || "";
  const maxTouchPoints = nav?.maxTouchPoints ?? 0;

  let name: string | null = null;
  let version: string | null = null;
  let architecture: string | null = null;

  if (clientHints?.architecture) {
    const uaArch = clientHints.architecture.toLowerCase();
    if (uaArch === "x86" || uaArch === "amd64") {
      architecture = clientHints.bitness === "32" ? "x86" : "x64";
    } else if (uaArch === "arm") {
      architecture = clientHints.bitness === "32" ? "arm" : "arm64";
    } else {
      architecture = uaArch;
    }
  }

  /**
   * Order matters. `navigator.platform` is a poor discriminator on mobile:
   * Android reports "Linux armv8l" and iPadOS reports "MacIntel", so both get
   * misfiled as desktop unless the user agent is checked first.
   */
  const hintedPlatform = clientHints?.platform ?? null;
  const isAndroid =
    hintedPlatform === "Android" || /\bAndroid\b/.test(userAgent);
  const isIPhone = /\b(iPhone|iPod)\b/.test(userAgent);
  // iPadOS 13+ requests desktop sites by default: same UA as a Mac, but a Mac
  // has no touchscreen.
  const isIPad =
    /\biPad\b/.test(userAgent) ||
    (platform === "MacIntel" && maxTouchPoints > 1);

  if (isAndroid) {
    name = "Android";
    const uaMatch = userAgent.match(/Android (\d+(?:\.\d+)*)/);
    version = clientHints?.platformVersion ?? uaMatch?.[1] ?? null;
  } else if (isIPhone || isIPad) {
    name = isIPad ? "iPadOS" : "iOS";
    const match = userAgent.match(/(?:iPhone )?OS (\d+[._]\d+(?:[._]\d+)?)/);
    // Desktop-mode iPadOS carries no OS version at all; leave it unknown
    // rather than reporting Safari's frozen "10.15".
    if (match) version = match[1].replace(/_/g, ".");
    if (!architecture) architecture = "arm64";
  } else if (hintedPlatform === "Windows" || platform.includes("Win")) {
    name = "Windows";
    const hinted = windowsVersionFromHints(
      clientHints?.platformVersion ?? null,
    );
    if (hinted) version = hinted;
    else if (userAgent.includes("Windows NT 10.0")) version = "10 or 11";
    else if (userAgent.includes("Windows NT 6.3")) version = "8.1";
    else if (userAgent.includes("Windows NT 6.2")) version = "8";
    else if (userAgent.includes("Windows NT 6.1")) version = "7";
  } else if (hintedPlatform === "macOS" || platform.includes("Mac")) {
    name = "macOS";
    /**
     * Safari and Chromium both freeze the user agent at "10_15_7" on every Mac,
     * so the Client Hints platform version is the only real version signal.
     */
    if (clientHints?.platformVersion) {
      version = clientHints.platformVersion;
    } else {
      const match = userAgent.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/);
      if (match) version = match[1].replace(/_/g, ".");
    }

    /**
     * `navigator.platform` is frozen at "MacIntel" on Apple Silicon, and Safari
     * reports "Intel Mac OS X" in its user agent there too — so neither string
     * can tell the two apart. Only an explicit arm token is worth trusting;
     * otherwise leave this unset and let the GPU renderer decide in `decode.ts`.
     */
    if (!architecture) {
      if (userAgent.includes("arm64") || userAgent.includes("aarch64")) {
        architecture = "arm64";
      }
    }
  } else if (/\bCrOS\b/.test(userAgent) || hintedPlatform === "Chrome OS") {
    name = "ChromeOS";
    version = clientHints?.platformVersion ?? null;
  } else if (hintedPlatform === "Linux" || platform.includes("Linux")) {
    name = "Linux";
    version = clientHints?.platformVersion ?? null;
  }

  // Architecture detection fallback (if Client Hints didn't provide it)
  if (!architecture) {
    if (userAgent.includes("x64") || userAgent.includes("WOW64")) {
      architecture = "x64";
    } else if (userAgent.includes("x86") || userAgent.includes("Win32")) {
      architecture = "x86";
    } else if (userAgent.includes("arm64") || userAgent.includes("aarch64")) {
      architecture = "arm64";
    } else if (userAgent.includes("arm")) {
      architecture = "arm";
    }
  }

  return { name, version, architecture };
}

/**
 * Detects screen and display information.
 */
export function detectScreenDisplay(): ScreenDisplay {
  if (typeof screen === "undefined" || typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      availWidth: 0,
      availHeight: 0,
      innerWidth: 0,
      innerHeight: 0,
      outerWidth: null,
      outerHeight: null,
      screenX: null,
      screenY: null,
      devicePixelRatio: 1,
      colorDepth: 0,
      pixelDepth: 0,
      orientation: null,
      colorGamut: null,
      hdr: null,
      colorScheme: null,
      reducedMotion: null,
      reducedTransparency: null,
      contrast: null,
      forcedColors: null,
      invertedColors: null,
      monochrome: null,
    };
  }

  const matchesMedia = (query: string): boolean | null => {
    try {
      return window.matchMedia(query).matches;
    } catch {
      return null;
    }
  };

  let colorGamut: string | null = null;
  if (matchesMedia("(color-gamut: rec2020)")) colorGamut = "rec2020";
  else if (matchesMedia("(color-gamut: p3)")) colorGamut = "p3";
  else if (matchesMedia("(color-gamut: srgb)")) colorGamut = "srgb";

  let colorScheme: string | null = null;
  if (matchesMedia("(prefers-color-scheme: dark)")) colorScheme = "dark";
  else if (matchesMedia("(prefers-color-scheme: light)")) colorScheme = "light";

  let contrast: string | null = null;
  if (matchesMedia("(prefers-contrast: more)")) contrast = "more";
  else if (matchesMedia("(prefers-contrast: less)")) contrast = "less";

  return {
    width: screen.width || 0,
    height: screen.height || 0,
    availWidth: screen.availWidth || 0,
    availHeight: screen.availHeight || 0,
    innerWidth: window.innerWidth || 0,
    innerHeight: window.innerHeight || 0,
    outerWidth: window.outerWidth || null,
    outerHeight: window.outerHeight || null,
    screenX: window.screenX || null,
    screenY: window.screenY || null,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorDepth: screen.colorDepth || 0,
    pixelDepth: screen.pixelDepth || 0,
    orientation: screen.orientation?.type || null,
    colorGamut,
    hdr: matchesMedia("(dynamic-range: high)"),
    colorScheme,
    reducedMotion: matchesMedia("(prefers-reduced-motion: reduce)"),
    reducedTransparency: matchesMedia("(prefers-reduced-transparency: reduce)"),
    contrast,
    forcedColors: matchesMedia("(forced-colors: active)"),
    invertedColors: matchesMedia("(inverted-colors: inverted)"),
    monochrome: matchesMedia("(monochrome)"),
  };
}

/**
 * Reads GPU details from a WebGL context.
 * Prefers WebGL 2 so the reported version and limits reflect what the machine
 * can actually do, and falls back to the masked vendor/renderer strings when
 * WEBGL_debug_renderer_info is unavailable (Firefox with the pref off, and any
 * browser blocking it for fingerprinting reasons).
 */
function detectGpu(): GpuInfo | null {
  if (typeof document === "undefined") return null;

  try {
    const canvas = document.createElement("canvas");
    const gl: WebGLRenderingContext | WebGL2RenderingContext | null =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) return null;

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

    let vendor: string | null = null;
    let renderer: string | null = null;
    let unmasked = false;

    if (debugInfo) {
      vendor =
        (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string) || null;
      renderer =
        (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string) || null;
      unmasked = Boolean(vendor || renderer);
    }

    if (!vendor) vendor = (gl.getParameter(gl.VENDOR) as string) || null;
    if (!renderer) renderer = (gl.getParameter(gl.RENDERER) as string) || null;

    const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

    return {
      vendor,
      renderer,
      unmasked,
      webglVersion: (gl.getParameter(gl.VERSION) as string) || null,
      shadingLanguageVersion:
        (gl.getParameter(gl.SHADING_LANGUAGE_VERSION) as string) || null,
      maxTextureSize: (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || null,
      maxVertexAttribs:
        (gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number) || null,
      maxViewportDims:
        maxViewportDims && maxViewportDims.length >= 2
          ? [maxViewportDims[0], maxViewportDims[1]]
          : null,
      extensions: gl.getSupportedExtensions() || [],
      antialiasing: gl.getContextAttributes()?.antialias ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Reads GPUAdapterInfo, which names the chip directly instead of burying it in
 * an ANGLE renderer string. Only available in browsers shipping WebGPU.
 */
async function detectWebGpu(): Promise<WebGpuInfo | null> {
  const gpuApi = (navigator as ExtendedNavigator).gpu;
  if (!gpuApi || typeof gpuApi.requestAdapter !== "function") return null;

  try {
    const adapter = await gpuApi.requestAdapter();
    if (!adapter) return null;

    // `info` is the current API; `requestAdapterInfo()` was the earlier spelling.
    const info =
      adapter.info ??
      (typeof adapter.requestAdapterInfo === "function"
        ? await adapter.requestAdapterInfo()
        : null);
    if (!info) return null;

    return {
      vendor: info.vendor || null,
      architecture: info.architecture || null,
      device: info.device || null,
      description: info.description || null,
    };
  } catch {
    return null;
  }
}

/**
 * Detects hardware information including CPU, memory, and GPU.
 */
export async function detectHardware(): Promise<Hardware> {
  const nav =
    typeof navigator !== "undefined" ? (navigator as ExtendedNavigator) : null;

  if (!nav) {
    return {
      hardwareConcurrency: null,
      deviceMemory: null,
      maxTouchPoints: null,
      touchSupport: false,
      gpu: null,
      webgpu: null,
    };
  }

  const maxTouchPoints = nav.maxTouchPoints ?? null;

  return {
    hardwareConcurrency: nav.hardwareConcurrency || null,
    deviceMemory: nav.deviceMemory ?? null,
    maxTouchPoints,
    // Desktop Chrome exposes `ontouchstart` regardless of hardware, so a real
    // touchscreen needs the touch-point count to agree.
    touchSupport:
      (maxTouchPoints ?? 0) > 0 ||
      (typeof window !== "undefined" && "ontouchstart" in window),
    gpu: detectGpu(),
    webgpu: await detectWebGpu(),
  };
}

/**
 * Detects network connection information.
 */
export function detectNetwork(): Network {
  const nav =
    typeof navigator !== "undefined" ? (navigator as ExtendedNavigator) : null;

  if (!nav) {
    return {
      type: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: null,
    };
  }

  const connection =
    nav.connection || nav.mozConnection || nav.webkitConnection || null;

  if (!connection) {
    return {
      type: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: null,
    };
  }

  // A downlink or RTT of 0 is a real reading (offline, or a loopback-fast link),
  // so `??` rather than `||` — the latter reported it as unsupported.
  return {
    type: connection.type || null,
    effectiveType: connection.effectiveType || null,
    downlink: connection.downlink ?? null,
    rtt: connection.rtt ?? null,
    saveData: connection.saveData ?? null,
  };
}

/**
 * Detects locale and timezone information.
 */
export function detectLocaleTime(): LocaleTime {
  const nav = typeof navigator !== "undefined" ? navigator : null;

  if (!nav) {
    return {
      language: "unknown",
      languages: [],
      timezone: "Unknown",
      timezoneOffset: 0,
    };
  }

  let timezone = "Unknown";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
  } catch {
    // Fallback
  }

  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();

  return {
    language: nav.language || "unknown",
    languages: nav.languages ? [...nav.languages] : [nav.language || "unknown"],
    timezone,
    timezoneOffset,
  };
}

/**
 * Detects storage and feature support.
 */
export function detectStorageFeatures(): StorageFeatures {
  const win = typeof window !== "undefined" ? window : null;

  if (!win) {
    return {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false,
      openDatabase: false,
      serviceWorker: false,
      webWorker: false,
      webAssembly: false,
      webgl: false,
      webgl2: false,
      webRTC: false,
    };
  }

  // Test localStorage
  let localStorage = false;
  try {
    localStorage = !!win.localStorage;
    win.localStorage.setItem("__test__", "1");
    win.localStorage.removeItem("__test__");
  } catch {
    localStorage = false;
  }

  // Test sessionStorage
  let sessionStorage = false;
  try {
    sessionStorage = !!win.sessionStorage;
    win.sessionStorage.setItem("__test__", "1");
    win.sessionStorage.removeItem("__test__");
  } catch {
    sessionStorage = false;
  }

  // Test IndexedDB
  let indexedDB = false;
  try {
    indexedDB = !!win.indexedDB;
  } catch {
    indexedDB = false;
  }

  // Test WebSQL
  let openDatabase = false;
  try {
    openDatabase = !!(win as Window & { openDatabase?: unknown }).openDatabase;
  } catch {
    openDatabase = false;
  }

  // Test Service Worker
  const serviceWorker = "serviceWorker" in navigator;

  // Test Web Worker
  const webWorker = typeof Worker !== "undefined";

  // Test WebAssembly
  const webAssembly = typeof WebAssembly !== "undefined";

  // Test WebGL
  let webgl = false;
  let webgl2 = false;
  try {
    const canvas = document.createElement("canvas");
    webgl = !!(
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    );
    webgl2 = !!canvas.getContext("webgl2");
  } catch {
    // Ignore
  }

  // Test WebRTC
  const webRTC =
    typeof RTCPeerConnection !== "undefined" ||
    typeof (win as Window & { webkitRTCPeerConnection?: unknown })
      .webkitRTCPeerConnection !== "undefined" ||
    typeof (win as Window & { mozRTCPeerConnection?: unknown })
      .mozRTCPeerConnection !== "undefined";

  return {
    localStorage,
    sessionStorage,
    indexedDB,
    openDatabase,
    serviceWorker,
    webWorker,
    webAssembly,
    webgl,
    webgl2,
    webRTC,
  };
}

/**
 * Detects installed plugins and MIME types.
 */
export function detectPlugins(): Plugins {
  const nav = typeof navigator !== "undefined" ? navigator : null;

  if (!nav || !nav.plugins) {
    return {
      plugins: [],
      mimeTypes: [],
    };
  }

  const plugins: Array<{
    name: string;
    description: string;
    filename: string;
  }> = [];
  for (let i = 0; i < nav.plugins.length; i++) {
    const plugin = nav.plugins[i];
    plugins.push({
      name: plugin.name,
      description: plugin.description,
      filename: plugin.filename,
    });
  }

  const mimeTypes: Array<{
    type: string;
    description: string;
    suffixes: string;
  }> = [];
  if (nav.mimeTypes) {
    for (let i = 0; i < nav.mimeTypes.length; i++) {
      const mimeType = nav.mimeTypes[i];
      mimeTypes.push({
        type: mimeType.type,
        description: mimeType.description,
        suffixes: mimeType.suffixes,
      });
    }
  }

  return {
    plugins,
    mimeTypes,
  };
}

/**
 * Detects all browser information by calling all detection functions.
 * Decoded summary is left null; call decodeFromBrowserInfo() to populate it.
 */
export async function detectAllBrowserInfo(): Promise<BrowserInfo> {
  // Client Hints are read once and threaded through, so the async high-entropy
  // call happens a single time rather than per consumer.
  const clientHints = await detectClientHints();

  return {
    browserIdentity: detectBrowserIdentity(clientHints),
    operatingSystem: detectOperatingSystem(clientHints),
    screenDisplay: detectScreenDisplay(),
    hardware: await detectHardware(),
    network: detectNetwork(),
    localeTime: detectLocaleTime(),
    storageFeatures: detectStorageFeatures(),
    plugins: detectPlugins(),
    decoded: null,
  };
}
