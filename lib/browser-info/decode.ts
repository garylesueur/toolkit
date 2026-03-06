/**
 * Decoded interpretation layer for browser information.
 * Uses Client Hints high-entropy values (Chromium) and bowser for structured parsing.
 * Produces human-readable summaries from raw browser API values.
 */

import Bowser from "bowser"
import type { BrowserInfo, DecodedSummary, GpuInfo } from "./types"

/** macOS version to codename mapping (major version). */
const MACOS_VERSION_NAMES: Record<string, string> = {
  "10.15": "Catalina",
  "10.14": "Mojave",
  "10.13": "High Sierra",
  "11": "Big Sur",
  "12": "Monterey",
  "13": "Ventura",
  "14": "Sonoma",
  "15": "Sequoia",
  "16": "Tahoe",
}

/** High-entropy hint names to request from getHighEntropyValues(). */
const HIGH_ENTROPY_HINTS = [
  "platformVersion",
  "architecture",
  "bitness",
  "fullVersionList",
] as const

/**
 * Merged Client Hints type: low-entropy (sync) + high-entropy (async).
 * Bowser expects this shape.
 */
interface MergedClientHints {
  brands?: Array<{ brand: string; version: string }>
  mobile?: boolean
  platform?: string
  platformVersion?: string
  architecture?: string
  bitness?: string
  fullVersionList?: Array<{ brand: string; version: string }>
  model?: string
  wow64?: boolean
}

/**
 * Fetches high-entropy Client Hints from the browser.
 * Only available in Chromium-based browsers (Chrome, Edge, Opera).
 * Requires secure context (HTTPS or localhost).
 */
/** Navigator with User-Agent Client Hints (Chromium). */
interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>
    mobile?: boolean
    platform?: string
    getHighEntropyValues?: (hints: string[]) => Promise<MergedClientHints>
  }
}

async function fetchHighEntropyHints(): Promise<MergedClientHints | null> {
  if (typeof navigator === "undefined") return null

  const uaData = (navigator as NavigatorWithUAData).userAgentData
  if (!uaData || typeof uaData.getHighEntropyValues !== "function") {
    return null
  }

  try {
    const high = await uaData.getHighEntropyValues([...HIGH_ENTROPY_HINTS])
    const merged: MergedClientHints = {
      brands: uaData.brands ?? undefined,
      mobile: uaData.mobile ?? undefined,
      platform: uaData.platform ?? undefined,
      ...high,
    }
    return merged
  } catch {
    return null
  }
}

/**
 * Detects Apple Silicon via WebGL renderer string.
 * Works in Safari and Firefox where Client Hints architecture is unavailable.
 * Heuristic: "Apple" vendor + "Apple M1" (or M2, M3, etc.) in renderer, but not "Apple GPU" (Intel).
 */
function detectAppleSiliconFromGpu(gpu: GpuInfo | null): boolean | null {
  if (!gpu?.renderer) return null

  const renderer = gpu.renderer
  const vendor = gpu.vendor ?? ""

  // Apple Silicon: renderer contains "Apple M1", "Apple M2", "Apple M3", "Apple M4", etc.
  if (/Apple M\d+/i.test(renderer)) return true

  // Apple GPU without M-series = Intel Mac integrated graphics
  if (/Apple/i.test(vendor) && /Apple GPU/i.test(renderer)) return false

  // ANGLE on macOS reports "ANGLE (Apple, Apple M1, ...)" for Apple Silicon
  if (/ANGLE\s*\([^)]*Apple\s+M\d+/i.test(renderer)) return true

  // Fallback: Apple vendor + renderer mentions Apple but not "Intel"
  if (/Apple/i.test(vendor) && !/Intel/i.test(renderer) && /Apple/i.test(renderer)) {
    // Could be Apple Silicon or older Intel; prefer Apple Silicon on modern Macs
    return null
  }

  return null
}

/**
 * Maps a macOS version string to its codename (e.g. "15.3" -> "Sequoia").
 */
function getMacOSVersionName(version: string | null | undefined): string | null {
  if (!version || typeof version !== "string") return null

  const trimmed = version.trim()
  const major = trimmed.split(".")[0]
  if (!major) return null

  return MACOS_VERSION_NAMES[major] ?? null
}

/**
 * Extracts a short GPU chip description from the WebGL renderer string.
 * e.g. "ANGLE (Apple, Apple M1, OpenGL 4.1)" -> "Apple M1"
 */
function extractGpuChipName(renderer: string | null | undefined): string | null {
  if (!renderer) return null

  const appleMatch = renderer.match(/Apple M(\d+)/i)
  if (appleMatch) return `Apple M${appleMatch[1]}`

  const amdMatch = renderer.match(/(?:AMD|Radeon)\s+([^(]+)/i)
  if (amdMatch) return amdMatch[1].trim() || null

  const nvidiaMatch = renderer.match(/(?:NVIDIA|GeForce)\s+([^(]+)/i)
  if (nvidiaMatch) return nvidiaMatch[1].trim() || null

  const intelMatch = renderer.match(/Intel[^\s]*\s+([^(]+)/i)
  if (intelMatch) return intelMatch[1].trim() || null

  return null
}

/**
 * Returns a note about device memory when the browser caps it (e.g. at 8GB).
 */
function getDeviceMemoryNote(
  deviceMemory: number | null | undefined
): string | null {
  if (deviceMemory === null || deviceMemory === undefined) return null

  // Browsers cap deviceMemory at 8; actual RAM may be higher
  if (deviceMemory >= 8) {
    return "Browser-reported maximum; actual RAM may be higher"
  }

  return null
}

/**
 * Normalises architecture string from Client Hints (x86, amd64, arm) to display form.
 */
function normaliseArchitecture(arch: string | null | undefined): string | null {
  if (!arch || typeof arch !== "string") return null

  const lower = arch.toLowerCase()
  if (lower === "x86" || lower === "amd64") return "x64"
  if (lower === "arm") return "arm64"
  return arch
}

/**
 * Decodes raw BrowserInfo into a human-readable DecodedSummary.
 * Calls getHighEntropyValues() when available (Chromium); otherwise falls back to bowser + heuristics.
 */
export async function decodeFromBrowserInfo(
  info: BrowserInfo
): Promise<DecodedSummary> {
  const { browserIdentity, operatingSystem, hardware } = info
  const ua = browserIdentity.userAgent

  if (!ua || ua === "Not available") {
    return {
      browser: { name: null, version: null, major: null },
      engine: { name: null, version: null },
      os: { name: null, version: null, versionName: null },
      platform: { type: null, vendor: null, model: null },
      cpu: { architecture: null, bitness: null, appleSilicon: null },
      deviceMemoryNote: null,
      gpuChipName: null,
      clientHintsAvailable: false,
    }
  }

  const highEntropyHints = await fetchHighEntropyHints()
  const clientHintsAvailable = highEntropyHints !== null

  const clientHintsForBowser: MergedClientHints | null = highEntropyHints

  const parser = Bowser.getParser(ua, false, clientHintsForBowser ?? undefined)
  const bowserResult = parser.getResult()

  const browser = bowserResult.browser ?? {}
  const engine = bowserResult.engine ?? {}
  const os = bowserResult.os ?? {}
  const platform = bowserResult.platform ?? {}

  let osVersion = os.version ?? operatingSystem.version
  let osVersionName = os.versionName ?? null

  if (highEntropyHints?.platformVersion) {
    osVersion = highEntropyHints.platformVersion
    osVersionName = getMacOSVersionName(osVersion) ?? osVersionName
  } else if (osVersion && os.name?.toLowerCase() === "macos") {
    osVersionName = getMacOSVersionName(osVersion) ?? osVersionName
  }

  let architecture = normaliseArchitecture(
    highEntropyHints?.architecture ??
      operatingSystem.architecture ??
      undefined
  )
  const bitness = highEntropyHints?.bitness
    ? `${highEntropyHints.bitness}-bit`
    : null

  let appleSilicon: boolean | null = null
  if (architecture === "arm64" && os.name?.toLowerCase() === "macos") {
    appleSilicon = true
  } else if (architecture === "x64" && os.name?.toLowerCase() === "macos") {
    appleSilicon = false
  } else {
    appleSilicon = detectAppleSiliconFromGpu(hardware.gpu)
  }

  const deviceMemoryNote = getDeviceMemoryNote(hardware.deviceMemory)
  const gpuChipName = extractGpuChipName(hardware.gpu?.renderer)

  const fullVersion =
    highEntropyHints?.fullVersionList?.[0]?.version ?? browser.version
  const versionStr = fullVersion ?? browser.version ?? null
  const major = versionStr ? versionStr.split(".")[0] ?? null : null

  return {
    browser: {
      name: browser.name ?? null,
      version: versionStr,
      major,
    },
    engine: {
      name: engine.name ?? null,
      version: engine.version ?? null,
    },
    os: {
      name: os.name ?? null,
      version: osVersion ?? null,
      versionName: osVersionName ?? null,
    },
    platform: {
      type: platform.type ?? null,
      vendor: platform.vendor ?? null,
      model: platform.model ?? null,
    },
    cpu: {
      architecture,
      bitness,
      appleSilicon,
    },
    deviceMemoryNote,
    gpuChipName,
    clientHintsAvailable,
  }
}
