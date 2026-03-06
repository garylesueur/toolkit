/**
 * Browser information detection functions.
 * All detection runs client-side by calling browser APIs directly.
 */

import type {
  BrowserInfo,
  BrowserIdentity,
  Hardware,
  GpuInfo,
  LocaleTime,
  Network,
  OperatingSystem,
  Plugins,
  ScreenDisplay,
  StorageFeatures,
} from "./types"

/**
 * Network Information API type definition.
 */
interface NetworkInformation {
  type?: string
  effectiveType?: string
  downlink?: number
  rtt?: number
  saveData?: boolean
}

/**
 * User-Agent Client Hints API type definition.
 */
interface UserAgentData {
  architecture?: string
  bitness?: string
  brand?: string
  brands?: Array<{ brand: string; version: string }>
  fullVersionList?: Array<{ brand: string; version: string }>
  mobile?: boolean
  model?: string
  platform?: string
  platformVersion?: string
  uaFullVersion?: string
  wow64?: boolean
  getHighEntropyValues?: (hints: string[]) => Promise<Record<string, unknown>>
}

/**
 * Extended navigator type covering non-standard properties
 * that various browsers expose.
 */
interface ExtendedNavigator extends Omit<Navigator, "pdfViewerEnabled"> {
  buildID?: string
  pdfViewerEnabled?: boolean
  globalPrivacyControl?: boolean
  deviceMemory?: number
  connection?: NetworkInformation
  mozConnection?: NetworkInformation
  webkitConnection?: NetworkInformation
  oscpu?: string
  cpuClass?: string
  userAgentData?: UserAgentData
}

/**
 * Detects browser identity information from navigator APIs.
 */
export function detectBrowserIdentity(): BrowserIdentity {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as ExtendedNavigator)
      : null

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
    }
  }

  let clientHints: BrowserIdentity["clientHints"] = null

  if (
    nav.userAgentData &&
    typeof nav.userAgentData.getHighEntropyValues === "function"
  ) {
    try {
      const uaData = nav.userAgentData
      clientHints = {
        architecture: uaData.architecture || null,
        bitness: uaData.bitness || null,
        brand: uaData.brand || null,
        brands: uaData.brands || null,
        fullVersionList: uaData.fullVersionList || null,
        mobile: uaData.mobile ?? null,
        model: uaData.model || null,
        platform: uaData.platform || null,
        platformVersion: uaData.platformVersion || null,
        uaFullVersion: uaData.uaFullVersion || null,
        wow64: uaData.wow64 ?? null,
      }
    } catch {
      // Client Hints not available
    }
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
  }
}

/**
 * Detects operating system information from user agent and platform.
 */
export function detectOperatingSystem(): OperatingSystem {
  const nav = typeof navigator !== "undefined" ? navigator : null
  const platform = nav?.platform || ""
  const userAgent = nav?.userAgent || ""

  let name: string | null = null
  let version: string | null = null
  let architecture: string | null = null

  // Check Client Hints first for accurate architecture (if available)
  const navExtended = nav as ExtendedNavigator | null
  if (
    navExtended &&
    navExtended.userAgentData &&
    typeof navExtended.userAgentData.architecture === "string"
  ) {
    const uaArch = navExtended.userAgentData.architecture.toLowerCase()
    if (uaArch === "x86" || uaArch === "amd64") {
      architecture = "x64"
    } else if (uaArch === "arm") {
      architecture = "arm64"
    } else {
      architecture = uaArch
    }
  }

  // Simple OS detection from platform and user agent
  if (platform.includes("Win")) {
    name = "Windows"
    if (userAgent.includes("Windows NT 10.0")) version = "10/11"
    else if (userAgent.includes("Windows NT 6.3")) version = "8.1"
    else if (userAgent.includes("Windows NT 6.2")) version = "8"
    else if (userAgent.includes("Windows NT 6.1")) version = "7"
  } else if (platform.includes("Mac")) {
    name = "macOS"
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/)
    if (match) version = match[1].replace("_", ".")

    // macOS architecture detection
    // navigator.platform always returns "MacIntel" even on Apple Silicon for compatibility
    // So we need to check other signals
    if (!architecture) {
      if (userAgent.includes("Intel")) {
        architecture = "x64"
      } else if (
        userAgent.includes("arm64") ||
        userAgent.includes("aarch64")
      ) {
        architecture = "arm64"
      } else {
        // On modern macOS, if no Intel mention and platform is MacIntel,
        // it's likely Apple Silicon (M1/M2/M3)
        // This is a heuristic but works for most cases
        architecture = "arm64"
      }
    }
  } else if (platform.includes("Linux")) {
    name = "Linux"
  } else if (platform.includes("iPhone") || platform.includes("iPad")) {
    name = platform.includes("iPad") ? "iPadOS" : "iOS"
    const match = userAgent.match(/OS (\d+[._]\d+)/)
    if (match) version = match[1].replace("_", ".")
    if (!architecture) architecture = "arm64"
  } else if (platform.includes("Android")) {
    name = "Android"
    const match = userAgent.match(/Android (\d+\.\d+)/)
    if (match) version = match[1]
  }

  // Architecture detection fallback (if Client Hints didn't provide it)
  if (!architecture) {
    if (userAgent.includes("x64") || userAgent.includes("WOW64")) {
      architecture = "x64"
    } else if (userAgent.includes("x86") || userAgent.includes("Win32")) {
      architecture = "x86"
    } else if (userAgent.includes("arm64") || userAgent.includes("aarch64")) {
      architecture = "arm64"
    } else if (userAgent.includes("arm")) {
      architecture = "arm"
    }
  }

  return { name, version, architecture }
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
    }
  }

  const matchesMedia = (query: string): boolean | null => {
    try {
      return window.matchMedia(query).matches
    } catch {
      return null
    }
  }

  let colorGamut: string | null = null
  if (matchesMedia("(color-gamut: rec2020)")) colorGamut = "rec2020"
  else if (matchesMedia("(color-gamut: p3)")) colorGamut = "p3"
  else if (matchesMedia("(color-gamut: srgb)")) colorGamut = "srgb"

  let colorScheme: string | null = null
  if (matchesMedia("(prefers-color-scheme: dark)")) colorScheme = "dark"
  else if (matchesMedia("(prefers-color-scheme: light)")) colorScheme = "light"

  let contrast: string | null = null
  if (matchesMedia("(prefers-contrast: more)")) contrast = "more"
  else if (matchesMedia("(prefers-contrast: less)")) contrast = "less"

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
  }
}

/**
 * Detects hardware information including CPU, memory, and GPU.
 */
export function detectHardware(): Hardware {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as ExtendedNavigator)
      : null

  if (!nav) {
    return {
      hardwareConcurrency: null,
      deviceMemory: null,
      maxTouchPoints: null,
      touchSupport: false,
      gpu: null,
    }
  }

  let gpu: GpuInfo | null = null

  try {
    const canvas = document.createElement("canvas")
    const gl =
      canvas.getContext("webgl") ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)

    if (gl) {
      const debugInfo =
        gl.getExtension("WEBGL_debug_renderer_info") ||
        (gl.getExtension("WEBGL_lose_context") &&
          gl.getExtension("WEBGL_debug_renderer_info"))

      const vendor =
        debugInfo &&
        gl.getParameter(
          (debugInfo as WEBGL_debug_renderer_info).UNMASKED_VENDOR_WEBGL
        )
      const renderer =
        debugInfo &&
        gl.getParameter(
          (debugInfo as WEBGL_debug_renderer_info).UNMASKED_RENDERER_WEBGL
        )

      const version = gl.getParameter(gl.VERSION)
      const shadingLanguageVersion = gl.getParameter(
        gl.SHADING_LANGUAGE_VERSION
      )
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
      const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
      const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
      const extensions = gl.getSupportedExtensions() || []
      const antialiasing = gl.getContextAttributes()?.antialias ?? null

      gpu = {
        vendor: (vendor as string) || null,
        renderer: (renderer as string) || null,
        webglVersion: (version as string) || null,
        shadingLanguageVersion: (shadingLanguageVersion as string) || null,
        maxTextureSize: (maxTextureSize as number) || null,
        maxVertexAttribs: (maxVertexAttribs as number) || null,
        maxViewportDims: Array.isArray(maxViewportDims)
          ? [maxViewportDims[0], maxViewportDims[1]]
          : null,
        extensions,
        antialiasing,
      }
    }
  } catch {
    // WebGL not available or error
  }

  return {
    hardwareConcurrency: nav.hardwareConcurrency || null,
    deviceMemory: nav.deviceMemory ?? null,
    maxTouchPoints: nav.maxTouchPoints || null,
    touchSupport: "ontouchstart" in window,
    gpu,
  }
}

/**
 * Detects network connection information.
 */
export function detectNetwork(): Network {
  const nav =
    typeof navigator !== "undefined"
      ? (navigator as ExtendedNavigator)
      : null

  if (!nav) {
    return {
      type: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: null,
    }
  }

  const connection =
    nav.connection || nav.mozConnection || nav.webkitConnection || null

  if (!connection) {
    return {
      type: null,
      effectiveType: null,
      downlink: null,
      rtt: null,
      saveData: null,
    }
  }

  return {
    type: connection.type || null,
    effectiveType: connection.effectiveType || null,
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData ?? null,
  }
}

/**
 * Detects locale and timezone information.
 */
export function detectLocaleTime(): LocaleTime {
  const nav = typeof navigator !== "undefined" ? navigator : null

  if (!nav) {
    return {
      language: "unknown",
      languages: [],
      timezone: "Unknown",
      timezoneOffset: 0,
    }
  }

  let timezone = "Unknown"
  try {
    timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown"
  } catch {
    // Fallback
  }

  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset()

  return {
    language: nav.language || "unknown",
    languages: nav.languages ? [...nav.languages] : [nav.language || "unknown"],
    timezone,
    timezoneOffset,
  }
}

/**
 * Detects storage and feature support.
 */
export function detectStorageFeatures(): StorageFeatures {
  const win = typeof window !== "undefined" ? window : null

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
    }
  }

  // Test localStorage
  let localStorage = false
  try {
    localStorage = !!win.localStorage
    win.localStorage.setItem("__test__", "1")
    win.localStorage.removeItem("__test__")
  } catch {
    localStorage = false
  }

  // Test sessionStorage
  let sessionStorage = false
  try {
    sessionStorage = !!win.sessionStorage
    win.sessionStorage.setItem("__test__", "1")
    win.sessionStorage.removeItem("__test__")
  } catch {
    sessionStorage = false
  }

  // Test IndexedDB
  let indexedDB = false
  try {
    indexedDB = !!win.indexedDB
  } catch {
    indexedDB = false
  }

  // Test WebSQL
  let openDatabase = false
  try {
    openDatabase = !!(win as Window & { openDatabase?: unknown }).openDatabase
  } catch {
    openDatabase = false
  }

  // Test Service Worker
  const serviceWorker = "serviceWorker" in navigator

  // Test Web Worker
  const webWorker = typeof Worker !== "undefined"

  // Test WebAssembly
  const webAssembly = typeof WebAssembly !== "undefined"

  // Test WebGL
  let webgl = false
  let webgl2 = false
  try {
    const canvas = document.createElement("canvas")
    webgl = !!(
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    )
    webgl2 = !!canvas.getContext("webgl2")
  } catch {
    // Ignore
  }

  // Test WebRTC
  const webRTC =
    typeof RTCPeerConnection !== "undefined" ||
    typeof (win as Window & { webkitRTCPeerConnection?: unknown })
      .webkitRTCPeerConnection !== "undefined" ||
    typeof (win as Window & { mozRTCPeerConnection?: unknown })
      .mozRTCPeerConnection !== "undefined"

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
  }
}

/**
 * Detects installed plugins and MIME types.
 */
export function detectPlugins(): Plugins {
  const nav = typeof navigator !== "undefined" ? navigator : null

  if (!nav || !nav.plugins) {
    return {
      plugins: [],
      mimeTypes: [],
    }
  }

  const plugins: Array<{ name: string; description: string; filename: string }> =
    []
  for (let i = 0; i < nav.plugins.length; i++) {
    const plugin = nav.plugins[i]
    plugins.push({
      name: plugin.name,
      description: plugin.description,
      filename: plugin.filename,
    })
  }

  const mimeTypes: Array<{
    type: string
    description: string
    suffixes: string
  }> = []
  if (nav.mimeTypes) {
    for (let i = 0; i < nav.mimeTypes.length; i++) {
      const mimeType = nav.mimeTypes[i]
      mimeTypes.push({
        type: mimeType.type,
        description: mimeType.description,
        suffixes: mimeType.suffixes,
      })
    }
  }

  return {
    plugins,
    mimeTypes,
  }
}

/**
 * Detects all browser information by calling all detection functions.
 * Decoded summary is left null; call decodeFromBrowserInfo() to populate it.
 */
export function detectAllBrowserInfo(): BrowserInfo {
  return {
    browserIdentity: detectBrowserIdentity(),
    operatingSystem: detectOperatingSystem(),
    screenDisplay: detectScreenDisplay(),
    hardware: detectHardware(),
    network: detectNetwork(),
    localeTime: detectLocaleTime(),
    storageFeatures: detectStorageFeatures(),
    plugins: detectPlugins(),
    decoded: null,
  }
}
