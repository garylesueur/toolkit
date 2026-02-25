export type ChromeExtensionIconTarget = {
  filename: string
  size: number
}

/**
 * Standard icon sizes for Chrome extensions (Manifest V3).
 *
 * - 16px: toolbar icon
 * - 32px: high-DPI toolbar / Windows taskbar
 * - 48px: extensions management page
 * - 96px: high-DPI extensions management page
 * - 128px: Chrome Web Store & installation dialog
 */
export const chromeExtensionIconTargets: ChromeExtensionIconTarget[] = [
  { filename: "16.png", size: 16 },
  { filename: "32.png", size: 32 },
  { filename: "48.png", size: 48 },
  { filename: "96.png", size: 96 },
  { filename: "128.png", size: 128 },
]
