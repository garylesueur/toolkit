export type FaviconTarget = {
  filename: string
  size: number
  includeInIco?: boolean
  purpose?: string
}

export const faviconTargets: FaviconTarget[] = [
  { filename: "favicon-16x16.png", size: 16, includeInIco: true },
  { filename: "favicon-32x32.png", size: 32, includeInIco: true },
  { filename: "favicon-48x48.png", size: 48, includeInIco: true },
  { filename: "apple-touch-icon.png", size: 180 },
  {
    filename: "android-chrome-192x192.png",
    size: 192,
    purpose: "any maskable",
  },
  {
    filename: "android-chrome-512x512.png",
    size: 512,
    purpose: "any maskable",
  },
]
