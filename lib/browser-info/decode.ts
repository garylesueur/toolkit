/**
 * Decoded interpretation layer for browser information.
 * Uses Client Hints high-entropy values (Chromium) and bowser for structured parsing.
 * Produces human-readable summaries from raw browser API values.
 */

import Bowser from "bowser";

import type {
  BrowserInfo,
  ClientHints,
  DecodedSummary,
  GpuInfo,
  UaBrand,
  WebGpuInfo,
} from "./types";

/**
 * macOS codenames, keyed by the major version Client Hints reports.
 * Apple switched to year-based numbering after 15 (Sequoia), jumping straight
 * to 26 (Tahoe) — there is no macOS 16 through 25. Versions newer than this
 * table are shown without a codename rather than guessed at.
 */
const MACOS_VERSION_NAMES: Record<string, string> = {
  "10.13": "High Sierra",
  "10.14": "Mojave",
  "10.15": "Catalina",
  "11": "Big Sur",
  "12": "Monterey",
  "13": "Ventura",
  "14": "Sonoma",
  "15": "Sequoia",
  "26": "Tahoe",
};

/**
 * Chromium pads its brand list with a randomised junk entry to stop sites
 * hardcoding positions. The exact text is deliberately unstable — "Not:A-Brand",
 * "Not;A=Brand", "Not/A)Brand", " Not A;Brand" and more have all shipped — so
 * it is matched by shape: the words "not a brand" joined and padded by any
 * combination of Chromium's separator characters.
 */
const GREASE_BRAND_PATTERN =
  /^[^a-z0-9]*not[^a-z0-9]*a[^a-z0-9]*brand[^a-z0-9]*$/i;

/**
 * "Chromium" describes the engine rather than the product the user opened —
 * every Chromium browser lists it, so it is only used when the list carries
 * nothing more specific (as in a genuine Chromium or Electron build).
 * "Google Chrome" is deliberately absent: it is a real product name.
 */
const GENERIC_BRANDS = new Set(["chromium"]);

/** The `deviceMemory` API caps its answer at 8 GiB; anything less is exact. */
const DEVICE_MEMORY_CAP_GB = 8;

/**
 * Detects Apple Silicon via WebGL renderer string.
 * Works in Safari and Firefox where Client Hints architecture is unavailable.
 * Heuristic: "Apple" vendor + "Apple M1" (or M2, M3, etc.) in renderer, but not "Apple GPU" (Intel).
 */
function detectAppleSiliconFromGpu(gpu: GpuInfo | null): boolean | null {
  if (!gpu?.renderer) return null;

  const renderer = gpu.renderer;
  const vendor = gpu.vendor ?? "";

  // Apple Silicon: renderer contains "Apple M1", "Apple M2", "Apple M3", "Apple M4", etc.
  if (/Apple M\d+/i.test(renderer)) return true;

  // Intel Macs name the actual Intel or AMD part.
  if (/\b(Intel|Radeon|NVIDIA|GeForce)\b/i.test(renderer)) return false;

  // Apple GPU without M-series = Intel Mac integrated graphics
  if (/Apple/i.test(vendor) && /Apple GPU/i.test(renderer)) return false;

  return null;
}

/**
 * Maps a macOS version string to its codename (e.g. "15.3" -> "Sequoia").
 * Pre-11 releases are keyed on two components ("10.15"), later ones on the major.
 */
function getMacOSVersionName(
  version: string | null | undefined,
): string | null {
  if (!version || typeof version !== "string") return null;

  const parts = version.trim().split(".");
  const major = parts[0];
  if (!major) return null;

  if (major === "10") {
    const minor = parts[1];
    return minor ? (MACOS_VERSION_NAMES[`10.${minor}`] ?? null) : null;
  }

  return MACOS_VERSION_NAMES[major] ?? null;
}

/**
 * Extracts a short GPU chip description from the WebGL renderer string.
 * e.g. "ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max, ...)" -> "Apple M3 Max"
 */
function extractGpuChipName(
  renderer: string | null | undefined,
): string | null {
  if (!renderer) return null;

  // Apple Silicon variants matter: M3, M3 Pro, M3 Max and M3 Ultra are
  // different chips, so the suffix is kept rather than truncated away.
  const appleMatch = renderer.match(/Apple (M\d+(?:\s+(?:Pro|Max|Ultra))?)/i);
  if (appleMatch) return `Apple ${appleMatch[1]}`;

  // ANGLE wraps the real name: "ANGLE (vendor, renderer, driver version)".
  // Take the middle field and strip ANGLE's own backend prefix.
  const angleMatch = renderer.match(/^ANGLE\s*\((.*)\)$/i);
  if (angleMatch) {
    const parts = angleMatch[1].split(",").map((part) => part.trim());
    const inner = (parts.length > 1 ? parts[1] : parts[0]) ?? "";
    const cleaned = inner
      .replace(/^ANGLE\s+\w+\s+Renderer:\s*/i, "")
      .replace(/\s*\(0x[0-9A-F]+\)/gi, "")
      .replace(/\s+Direct3D\d+.*$/i, "")
      .trim();
    if (cleaned) return cleaned;
  }

  const nvidiaMatch = renderer.match(
    /((?:NVIDIA\s+)?(?:GeForce|Quadro|RTX)[^,()/]*)/i,
  );
  if (nvidiaMatch) return nvidiaMatch[1].trim() || null;

  const amdMatch = renderer.match(/((?:AMD\s+)?Radeon[^,()/]*)/i);
  if (amdMatch) return amdMatch[1].trim() || null;

  const intelMatch = renderer.match(/(Intel[^,()/]*)/i);
  if (intelMatch) return intelMatch[1].trim() || null;

  const adrenoMatch = renderer.match(/((?:Adreno|Mali|PowerVR)[^,()/]*)/i);
  if (adrenoMatch) return adrenoMatch[1].trim() || null;

  return null;
}

/**
 * Falls back to WebGPU's adapter info, which names the chip directly instead of
 * hiding it inside an ANGLE string.
 */
function chipNameFromWebGpu(webgpu: WebGpuInfo | null): string | null {
  if (!webgpu) return null;

  const fromDescription = extractGpuChipName(webgpu.description);
  if (fromDescription) return fromDescription;

  const parts = [webgpu.vendor, webgpu.architecture].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

/**
 * Returns a note about device memory when the browser caps it.
 */
function getDeviceMemoryNote(
  deviceMemory: number | null | undefined,
): string | null {
  if (deviceMemory === null || deviceMemory === undefined) return null;

  // Only the capped value is ambiguous — a browser reporting more than the cap
  // (Electron does) is giving a real figure.
  if (deviceMemory === DEVICE_MEMORY_CAP_GB) {
    return "Browser-reported maximum; actual RAM may be higher";
  }

  return null;
}

/**
 * Picks the brand that names the browser the user actually opened.
 * Skips Chromium's randomised placeholder entry, and prefers a specific product
 * (Microsoft Edge, Opera, Brave) over the generic engine brands that every
 * Chromium build also advertises.
 */
function findRealBrand(entries: UaBrand[] | null | undefined): UaBrand | null {
  if (!entries || entries.length === 0) return null;

  const named = entries.filter(
    (entry) =>
      entry?.brand &&
      typeof entry.brand === "string" &&
      !GREASE_BRAND_PATTERN.test(entry.brand),
  );
  if (named.length === 0) return null;

  const specific = named.find(
    (entry) => !GENERIC_BRANDS.has(entry.brand.trim().toLowerCase()),
  );
  return specific ?? named[0];
}

/**
 * Normalises architecture string from Client Hints (x86, amd64, arm) to display form.
 */
function normaliseArchitecture(
  arch: string | null | undefined,
  bitness: string | null | undefined,
): string | null {
  if (!arch || typeof arch !== "string") return null;

  const lower = arch.toLowerCase();
  if (lower === "x86" || lower === "amd64") {
    return bitness === "32" ? "x86" : "x64";
  }
  if (lower === "arm") {
    return bitness === "32" ? "arm" : "arm64";
  }
  return arch;
}

/**
 * Converts our ClientHints (null for absent) to bowser's shape (undefined for
 * absent), dropping empty entries so bowser falls back to the user agent.
 */
function toBowserClientHints(
  hints: ClientHints | null,
): Bowser.ClientHints | undefined {
  if (!hints) return undefined;

  return {
    architecture: hints.architecture ?? undefined,
    brands: hints.fullVersionList ?? hints.brands ?? undefined,
    mobile: hints.mobile ?? undefined,
    model: hints.model ?? undefined,
    platform: hints.platform ?? undefined,
    platformVersion: hints.platformVersion ?? undefined,
    wow64: hints.wow64 ?? undefined,
  };
}

/**
 * Decodes raw BrowserInfo into a human-readable DecodedSummary.
 * Reads the Client Hints already gathered during detection (Chromium only) and
 * falls back to bowser plus GPU heuristics elsewhere.
 */
export function decodeFromBrowserInfo(info: BrowserInfo): DecodedSummary {
  const { browserIdentity, operatingSystem, hardware } = info;
  const ua = browserIdentity.userAgent;

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
    };
  }

  const hints: ClientHints | null = browserIdentity.clientHints;
  // The low-entropy half is always present in Chromium; the high-entropy half
  // needs a secure context, so treat it as the real availability signal.
  const clientHintsAvailable = Boolean(hints?.platformVersion);

  const parser = Bowser.getParser(ua, false, toBowserClientHints(hints));
  const bowserResult = parser.getResult();

  const browser = bowserResult.browser ?? {};
  const engine = bowserResult.engine ?? {};
  const os = bowserResult.os ?? {};
  const platform = bowserResult.platform ?? {};

  const osName = operatingSystem.name ?? os.name ?? null;
  const isMac = osName?.toLowerCase() === "macos";

  /**
   * Prefer the version detection already did — it consults Client Hints, which
   * is the only accurate source on macOS. Bowser's `versionName` is derived
   * from the frozen user agent, so it must not survive alongside a real
   * platform version; that is what produced "macOS 27.0.0 (Catalina)".
   */
  const osVersion = operatingSystem.version ?? os.version ?? null;
  let osVersionName: string | null = null;
  if (isMac) {
    osVersionName = getMacOSVersionName(osVersion);
  } else if (osVersion === os.version) {
    osVersionName = os.versionName ?? null;
  }

  /**
   * Client Hints are the only architecture signal that is actually reliable on
   * macOS. Keep them separate from the user-agent guess so the weaker signal
   * can never override the GPU renderer below.
   */
  const hintedArchitecture = normaliseArchitecture(
    hints?.architecture,
    hints?.bitness,
  );
  const bitness = hints?.bitness ? `${hints.bitness}-bit` : null;

  let appleSilicon: boolean | null;
  if (isMac && hintedArchitecture) {
    appleSilicon = hintedArchitecture.startsWith("arm");
  } else if (isMac) {
    // Safari sends no Client Hints and its UA claims "Intel" on every Mac, so
    // the GPU renderer ("Apple M1", …) is the only thing left worth reading.
    appleSilicon = detectAppleSiliconFromGpu(hardware.gpu);
  } else {
    appleSilicon = null;
  }

  const uaArchitecture = normaliseArchitecture(
    operatingSystem.architecture,
    hints?.bitness,
  );
  const architecture =
    hintedArchitecture ??
    (isMac && appleSilicon !== null
      ? appleSilicon
        ? "arm64"
        : "x64"
      : uaArchitecture);

  const deviceMemoryNote = getDeviceMemoryNote(hardware.deviceMemory);
  const gpuChipName =
    extractGpuChipName(hardware.gpu?.renderer) ??
    chipNameFromWebGpu(hardware.webgpu);

  // Client Hints name the browser precisely; the user agent is a last resort.
  const realBrand =
    findRealBrand(hints?.fullVersionList) ?? findRealBrand(hints?.brands);
  const browserName = realBrand?.brand ?? browser.name ?? null;
  const versionStr = realBrand?.version ?? browser.version ?? null;
  const major = versionStr ? (versionStr.split(".")[0] ?? null) : null;

  /**
   * Client Hints' `mobile` flag is the authoritative form-factor signal;
   * bowser has to infer it from the user agent, which desktop-mode iPadOS and
   * "request desktop site" both defeat.
   */
  let platformType = platform.type ?? null;
  if (hints?.formFactors?.length) {
    platformType = hints.formFactors[0].toLowerCase();
  } else if (hints?.mobile === true) {
    platformType = "mobile";
  } else if (hints?.mobile === false) {
    platformType = "desktop";
  } else if (osName === "iPadOS") {
    platformType = "tablet";
  }

  return {
    browser: {
      name: browserName,
      version: versionStr,
      major,
    },
    engine: {
      name: engine.name ?? null,
      version: engine.version ?? null,
    },
    os: {
      name: osName,
      version: osVersion,
      versionName: osVersionName,
    },
    platform: {
      type: platformType,
      vendor: platform.vendor ?? null,
      model: hints?.model ?? platform.model ?? null,
    },
    cpu: {
      architecture,
      bitness,
      appleSilicon,
    },
    deviceMemoryNote,
    gpuChipName,
    clientHintsAvailable,
  };
}
