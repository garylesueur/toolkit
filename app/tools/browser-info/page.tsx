"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CopyableRow } from "@/components/copyable-row"
import {
  RiCheckLine,
  RiFileCopyLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
} from "@remixicon/react"
import { detectAllBrowserInfo } from "@/lib/browser-info/detect"
import { decodeFromBrowserInfo } from "@/lib/browser-info/decode"
import {
  createShareableUrl,
  extractSharedInfoFromHash,
} from "@/lib/browser-info/share"
import type { BrowserInfo, DecodedSummary } from "@/lib/browser-info/types"

const COPY_RESET_MS = 2000

type ViewState = "consent" | "results" | "shared"

interface InfoRow {
  label: string
  value: string
}

interface InfoSection {
  title: string
  rows: InfoRow[]
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "Not supported"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return value.toLocaleString()
  if (Array.isArray(value)) return value.length === 0 ? "None" : value.join(", ")
  if (typeof value === "object") return JSON.stringify(value, null, 2)
  return String(value)
}

function formatWithUnit(
  value: number | null | undefined,
  unit: string
): string {
  if (value === null || value === undefined) return "Not supported"
  return `${value.toLocaleString()} ${unit}`
}

function DecodedSummaryCard({ decoded }: { decoded: DecodedSummary }) {
  const { browser, engine, os, platform, cpu, deviceMemoryNote, gpuChipName, clientHintsAvailable } =
    decoded

  const items: { label: string; value: string }[] = []

  const browserStr = [browser.name, browser.version].filter(Boolean).join(" ")
  if (browserStr) items.push({ label: "Browser", value: browserStr })

  const engineStr = [engine.name, engine.version].filter(Boolean).join(" ")
  if (engineStr) items.push({ label: "Engine", value: engineStr })

  const osVersionPart = os.version ? os.version : null
  const osVersionNamePart = os.versionName ? ` (${os.versionName})` : ""
  const osStr =
    os.name && osVersionPart
      ? `${os.name} ${osVersionPart}${osVersionNamePart}`
      : os.name ?? null
  if (osStr) items.push({ label: "Operating System", value: osStr })

  const platformParts: string[] = []
  if (platform.type) platformParts.push(platform.type)
  if (cpu.appleSilicon === true) platformParts.push("Apple Silicon")
  else if (cpu.appleSilicon === false) platformParts.push("Intel")
  const platformStr = platformParts.length > 0 ? platformParts.join(" · ") : null
  if (platformStr) items.push({ label: "Platform", value: platformStr })

  const archParts = [cpu.architecture, cpu.bitness].filter(Boolean)
  if (archParts.length > 0) {
    items.push({ label: "Architecture", value: archParts.join(" ") })
  }

  if (gpuChipName) items.push({ label: "GPU", value: gpuChipName })

  if (deviceMemoryNote) {
    items.push({ label: "Device Memory Note", value: deviceMemoryNote })
  }

  if (items.length === 0) return null

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Decoded summary
          {!clientHintsAvailable && (
            <span className="font-normal text-muted-foreground">
              (Client Hints not available — Safari/Firefox show limited data)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
          {items.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <dt className="text-muted-foreground text-sm">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function buildSections(info: BrowserInfo): InfoSection[] {
  const { browserIdentity: bi, operatingSystem: os, screenDisplay: sd } = info
  const { hardware: hw, network: net, localeTime: lt } = info
  const { storageFeatures: sf, plugins: pl, decoded } = info

  const decodedOs = decoded?.os
  const decodedOsVersion = decodedOs?.version
    ? `${decodedOs.version}${decodedOs.versionName ? ` (${decodedOs.versionName})` : ""}`
    : null
  const osVersionValue =
    decodedOsVersion && os.version && decodedOs?.version !== os.version
      ? `${formatValue(os.version)} → ${decodedOsVersion}`
      : decodedOsVersion ?? formatValue(os.version)

  const archValue = decoded?.cpu?.architecture
    ? decoded.cpu.architecture +
      (decoded.cpu.bitness ? ` (${decoded.cpu.bitness})` : "")
    : formatValue(os.architecture)

  const deviceMemoryValue = hw.deviceMemory
    ? `${hw.deviceMemory} GB${decoded?.deviceMemoryNote ? ` — ${decoded.deviceMemoryNote}` : ""}`
    : formatValue(hw.deviceMemory)

  const gpuRendererValue = hw.gpu?.renderer
    ? formatValue(hw.gpu.renderer) +
      (decoded?.gpuChipName ? ` (chip: ${decoded.gpuChipName})` : "")
    : formatValue(hw.gpu?.renderer)

  const sections: InfoSection[] = [
    {
      title: "Browser Identity",
      rows: [
        { label: "User Agent", value: bi.userAgent },
        { label: "Platform", value: formatValue(bi.platform) },
        { label: "Vendor", value: formatValue(bi.vendor) },
        { label: "App Name", value: formatValue(bi.appName) },
        { label: "App Version", value: formatValue(bi.appVersion) },
        { label: "PDF Viewer Enabled", value: formatValue(bi.pdfViewerEnabled) },
        { label: "Cookies Enabled", value: formatValue(bi.cookiesEnabled) },
        { label: "Do Not Track", value: formatValue(bi.doNotTrack) },
        { label: "Global Privacy Control", value: formatValue(bi.globalPrivacyControl) },
        { label: "Java Enabled", value: formatValue(bi.javaEnabled) },
        { label: "Online Status", value: formatValue(bi.online) },
        ...(bi.clientHints
          ? [
              { label: "Client Hints — Architecture", value: formatValue(bi.clientHints.architecture) },
              { label: "Client Hints — Mobile", value: formatValue(bi.clientHints.mobile) },
              { label: "Client Hints — Platform", value: formatValue(bi.clientHints.platform) },
            ]
          : []),
      ],
    },
    {
      title: "Operating System & Device",
      rows: [
        { label: "OS Name", value: formatValue(os.name) },
        { label: "OS Version", value: osVersionValue },
        { label: "Architecture", value: archValue },
      ],
    },
    {
      title: "Screen & Display",
      rows: [
        { label: "Screen Resolution", value: `${sd.width} × ${sd.height}` },
        { label: "Available Screen", value: `${sd.availWidth} × ${sd.availHeight}` },
        { label: "Viewport Size", value: `${sd.innerWidth} × ${sd.innerHeight}` },
        { label: "Device Pixel Ratio", value: formatValue(sd.devicePixelRatio) },
        { label: "Colour Depth", value: formatWithUnit(sd.colorDepth, "bits") },
        { label: "Pixel Depth", value: formatWithUnit(sd.pixelDepth, "bits") },
        { label: "Orientation", value: formatValue(sd.orientation) },
        { label: "Colour Gamut", value: formatValue(sd.colorGamut) },
        { label: "HDR Support", value: formatValue(sd.hdr) },
        { label: "Colour Scheme Preference", value: formatValue(sd.colorScheme) },
        { label: "Reduced Motion", value: formatValue(sd.reducedMotion) },
        { label: "Reduced Transparency", value: formatValue(sd.reducedTransparency) },
        { label: "Contrast Preference", value: formatValue(sd.contrast) },
        { label: "Forced Colours", value: formatValue(sd.forcedColors) },
        { label: "Inverted Colours", value: formatValue(sd.invertedColors) },
        { label: "Monochrome", value: formatValue(sd.monochrome) },
      ],
    },
    {
      title: "Hardware",
      rows: [
        { label: "CPU Cores", value: formatValue(hw.hardwareConcurrency) },
        { label: "Device Memory", value: deviceMemoryValue },
        { label: "Max Touch Points", value: formatValue(hw.maxTouchPoints) },
        { label: "Touch Support", value: formatValue(hw.touchSupport) },
        ...(hw.gpu
          ? [
              { label: "GPU Vendor", value: formatValue(hw.gpu.vendor) },
              { label: "GPU Renderer", value: gpuRendererValue },
              { label: "WebGL Version", value: formatValue(hw.gpu.webglVersion) },
              { label: "Shading Language Version", value: formatValue(hw.gpu.shadingLanguageVersion) },
              { label: "Max Texture Size", value: formatValue(hw.gpu.maxTextureSize) },
              { label: "Max Vertex Attribs", value: formatValue(hw.gpu.maxVertexAttribs) },
              { label: "Antialiasing", value: formatValue(hw.gpu.antialiasing) },
              { label: "WebGL Extensions", value: formatValue(hw.gpu.extensions) },
            ]
          : []),
      ],
    },
    {
      title: "Network",
      rows: [
        { label: "Connection Type", value: formatValue(net.type) },
        { label: "Effective Type", value: formatValue(net.effectiveType) },
        { label: "Downlink", value: net.downlink ? `${net.downlink} Mbps` : formatValue(net.downlink) },
        { label: "RTT", value: net.rtt ? `${net.rtt} ms` : formatValue(net.rtt) },
        { label: "Data Saver", value: formatValue(net.saveData) },
      ],
    },
    {
      title: "Locale & Time",
      rows: [
        { label: "Language", value: lt.language },
        { label: "Languages", value: formatValue(lt.languages) },
        { label: "Timezone", value: lt.timezone },
        { label: "Timezone Offset", value: `${lt.timezoneOffset} minutes` },
      ],
    },
    {
      title: "Storage & Features",
      rows: [
        { label: "localStorage", value: formatValue(sf.localStorage) },
        { label: "sessionStorage", value: formatValue(sf.sessionStorage) },
        { label: "IndexedDB", value: formatValue(sf.indexedDB) },
        { label: "WebSQL", value: formatValue(sf.openDatabase) },
        { label: "Service Worker", value: formatValue(sf.serviceWorker) },
        { label: "Web Worker", value: formatValue(sf.webWorker) },
        { label: "WebAssembly", value: formatValue(sf.webAssembly) },
        { label: "WebGL", value: formatValue(sf.webgl) },
        { label: "WebGL2", value: formatValue(sf.webgl2) },
        { label: "WebRTC", value: formatValue(sf.webRTC) },
      ],
    },
    {
      title: "Plugins",
      rows: [
        { label: "Plugins Count", value: formatValue(pl.plugins.length) },
        ...pl.plugins.map((p) => ({
          label: p.name,
          value: [p.description, p.filename].filter(Boolean).join(" — "),
        })),
        { label: "MIME Types Count", value: formatValue(pl.mimeTypes.length) },
      ],
    },
  ]

  return sections
}


// --- Reusable components ---

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle>{title}</CardTitle>
          {isOpen ? (
            <RiArrowUpSLine className="h-5 w-5" />
          ) : (
            <RiArrowDownSLine className="h-5 w-5" />
          )}
        </button>
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  )
}

interface SectionGridProps {
  sections: InfoSection[]
  copiedValue: string | null
  onCopy: (value: string) => void
}

function SectionGrid({ sections, copiedValue, onCopy }: SectionGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sections.map((section) => (
        <CollapsibleSection key={section.title} title={section.title}>
          <div className="space-y-2">
            {section.rows.map((row) => (
              <CopyableRow
                key={`${section.title}-${row.label}`}
                label={row.label}
                value={row.value}
                copiedValue={copiedValue}
                onCopy={onCopy}
              />
            ))}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  )
}

function PageHeading() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Browser Info</h1>
      <p className="text-muted-foreground mt-1">
        See everything your browser reveals — user agent, screen, GPU, network,
        and more.
      </p>
    </>
  )
}

// --- Main page ---

export default function BrowserInfoPage() {
  const [viewState, setViewState] = useState<ViewState>("consent")
  const [browserInfo, setBrowserInfo] = useState<BrowserInfo | null>(null)
  const [sharedInfo, setSharedInfo] = useState<BrowserInfo | null>(null)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isLoadingShared, setIsLoadingShared] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  useEffect(() => {
    async function loadShared() {
      setIsLoadingShared(true)
      try {
        const shared = await extractSharedInfoFromHash()
        if (shared) {
          setSharedInfo(shared)
          setViewState("shared")
        }
      } catch (error) {
        setShareError(
          error instanceof Error ? error.message : "Failed to load shared data"
        )
      } finally {
        setIsLoadingShared(false)
      }
    }
    loadShared()
  }, [])

  const handleDetect = useCallback(async () => {
    const info = detectAllBrowserInfo()
    setBrowserInfo(info)
    setViewState("results")

    let enrichedInfo: BrowserInfo = info
    try {
      const decoded = await decodeFromBrowserInfo(info)
      enrichedInfo = { ...info, decoded }
      setBrowserInfo(enrichedInfo)
    } catch (error) {
      console.error("Failed to decode browser info:", error)
    }

    try {
      const url = await createShareableUrl(
        window.location.href.split("#")[0],
        enrichedInfo
      )
      setShareUrl(url)
    } catch (error) {
      console.error("Failed to create share URL:", error)
    }
  }, [])

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedValue(text)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [])

  const handleShare = useCallback(async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopiedValue(shareUrl)
    setTimeout(() => setCopiedValue(null), COPY_RESET_MS)
  }, [shareUrl])

  const handleViewOwn = useCallback(() => {
    window.history.replaceState(null, "", window.location.pathname)
    setSharedInfo(null)
    setViewState("consent")
  }, [])

  // --- Shared profile view ---
  if (viewState === "shared") {
    if (isLoadingShared) {
      return (
        <div>
          <PageHeading />
          <div className="mt-8 text-center text-muted-foreground">
            Loading shared browser profile...
          </div>
        </div>
      )
    }

    if (shareError || !sharedInfo) {
      return (
        <div>
          <PageHeading />
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Error Loading Shared Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-destructive">
                {shareError ||
                  "The shared browser profile could not be loaded. It may have expired or the link is invalid."}
              </p>
              <Button variant="outline" onClick={handleViewOwn}>
                Detect your own browser
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    const sections = buildSections(sharedInfo)
    return (
      <div>
        <PageHeading />

        <div className="mt-6 rounded-md border border-blue-500/50 bg-blue-500/10 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">
              You are viewing a shared browser profile.
            </p>
            <Button variant="outline" size="sm" onClick={handleViewOwn}>
              Detect your own browser
            </Button>
          </div>
        </div>

        {sharedInfo.decoded && (
          <div className="mt-8">
            <DecodedSummaryCard decoded={sharedInfo.decoded} />
          </div>
        )}

        <div className="mt-8">
          <SectionGrid
            sections={sections}
            copiedValue={copiedValue}
            onCopy={handleCopy}
          />
        </div>
      </div>
    )
  }

  // --- Consent screen ---
  if (viewState === "consent") {
    return (
      <div>
        <PageHeading />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Consent Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              This tool reads information your browser exposes — user agent,
              screen size, GPU, network, timezone, and more. Everything runs
              client-side in your browser. No data is sent to any server.
            </p>
            <p className="text-muted-foreground text-sm">
              Click the button below to begin detection.
            </p>
            <Button onClick={handleDetect} className="w-full sm:w-auto">
              Detect My Browser
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- Results view ---
  if (viewState === "results" && browserInfo) {
    const sections = buildSections(browserInfo)
    return (
      <div>
        <PageHeading />

        <div className="mt-6">
          <Button
            variant="outline"
            onClick={handleShare}
            disabled={!shareUrl}
            className="flex items-center gap-2"
          >
            {copiedValue === shareUrl ? (
              <>
                <RiCheckLine className="size-4" />
                Link Copied
              </>
            ) : (
              <>
                <RiFileCopyLine className="size-4" />
                Copy Share Link
              </>
            )}
          </Button>
        </div>

        {browserInfo.decoded && (
          <div className="mt-8">
            <DecodedSummaryCard decoded={browserInfo.decoded} />
          </div>
        )}

        <div className="mt-8">
          <SectionGrid
            sections={sections}
            copiedValue={copiedValue}
            onCopy={handleCopy}
          />
        </div>
      </div>
    )
  }

  return null
}
