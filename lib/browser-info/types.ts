/**
 * Type definitions for browser information detection.
 * All data is gathered client-side from browser APIs.
 */

export interface BrowserIdentity {
  userAgent: string
  platform: string | null
  vendor: string | null
  appName: string | null
  appVersion: string | null
  appCodeName: string | null
  product: string | null
  productSub: string | null
  vendorSub: string | null
  buildId: string | null
  pdfViewerEnabled: boolean | null
  cookiesEnabled: boolean | null
  doNotTrack: string | null
  globalPrivacyControl: boolean | null
  javaEnabled: boolean | null
  online: boolean
  clientHints: ClientHints | null
}

export interface ClientHints {
  architecture: string | null
  bitness: string | null
  brand: string | null
  brands: Array<{ brand: string; version: string }> | null
  fullVersionList: Array<{ brand: string; version: string }> | null
  mobile: boolean | null
  model: string | null
  platform: string | null
  platformVersion: string | null
  uaFullVersion: string | null
  wow64: boolean | null
}

export interface OperatingSystem {
  name: string | null
  version: string | null
  architecture: string | null
}

export interface ScreenDisplay {
  width: number
  height: number
  availWidth: number
  availHeight: number
  innerWidth: number
  innerHeight: number
  outerWidth: number | null
  outerHeight: number | null
  screenX: number | null
  screenY: number | null
  devicePixelRatio: number
  colorDepth: number
  pixelDepth: number
  orientation: string | null
  colorGamut: string | null
  hdr: boolean | null
  colorScheme: string | null
  reducedMotion: boolean | null
  reducedTransparency: boolean | null
  contrast: string | null
  forcedColors: boolean | null
  invertedColors: boolean | null
  monochrome: boolean | null
}

export interface Hardware {
  hardwareConcurrency: number | null
  deviceMemory: number | null
  maxTouchPoints: number | null
  touchSupport: boolean
  gpu: GpuInfo | null
}

export interface GpuInfo {
  vendor: string | null
  renderer: string | null
  webglVersion: string | null
  shadingLanguageVersion: string | null
  maxTextureSize: number | null
  maxVertexAttribs: number | null
  maxViewportDims: number[] | null
  extensions: string[]
  antialiasing: boolean | null
}

export interface Network {
  type: string | null
  effectiveType: string | null
  downlink: number | null
  rtt: number | null
  saveData: boolean | null
}

export interface LocaleTime {
  language: string
  languages: string[]
  timezone: string
  timezoneOffset: number
}

export interface StorageFeatures {
  localStorage: boolean
  sessionStorage: boolean
  indexedDB: boolean
  openDatabase: boolean
  serviceWorker: boolean
  webWorker: boolean
  webAssembly: boolean
  webgl: boolean
  webgl2: boolean
  webRTC: boolean
}

export interface Plugins {
  plugins: Array<{ name: string; description: string; filename: string }>
  mimeTypes: Array<{ type: string; description: string; suffixes: string }>
}

/** Human-readable decoded interpretation of raw browser API values. */
export interface DecodedSummary {
  browser: { name: string | null; version: string | null; major: string | null }
  engine: { name: string | null; version: string | null }
  os: {
    name: string | null
    version: string | null
    versionName: string | null
  }
  platform: {
    type: string | null
    vendor: string | null
    model: string | null
  }
  cpu: {
    architecture: string | null
    bitness: string | null
    appleSilicon: boolean | null
  }
  deviceMemoryNote: string | null
  /** Cleaned GPU chip description from WebGL renderer (e.g. "Apple M1"). */
  gpuChipName: string | null
  /** Whether high-entropy Client Hints were available (Chromium-only). */
  clientHintsAvailable: boolean
}

export interface BrowserInfo {
  browserIdentity: BrowserIdentity
  operatingSystem: OperatingSystem
  screenDisplay: ScreenDisplay
  hardware: Hardware
  network: Network
  localeTime: LocaleTime
  storageFeatures: StorageFeatures
  plugins: Plugins
  /** Decoded interpretation layer; populated by decodeFromBrowserInfo(). */
  decoded: DecodedSummary | null
}
