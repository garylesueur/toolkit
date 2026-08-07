import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";

import { JsonLd } from "@/components/json-ld";
import { ThemeProvider } from "@/components/theme-provider";
import { ToolCommandMenu } from "@/components/tool-command-menu";
import { ROOT_OG_IMAGE } from "@/lib/seo/root-og-image";
import { createWebSiteJsonLd } from "@/lib/seo/website-json-ld";
import { canonicalPath, getSiteUrl, isPreviewDeployment } from "@/lib/site";

import "./globals.css";

export const revalidate = 31536000; // 1 year

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "A growing collection of handy developer utilities — no sign-ups, no nonsense. By Gary Le Sueur.";

const googleSiteVerification = process.env.GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    template: "%s | Toolkit",
    default: "Toolkit — Developer Utilities",
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: "Gary Le Sueur" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Toolkit",
    locale: "en_GB",
    title: "Toolkit — Developer Utilities",
    description: SITE_DESCRIPTION,
    url: canonicalPath("/"),
    images: [ROOT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Toolkit — Developer Utilities",
    description: SITE_DESCRIPTION,
    images: [ROOT_OG_IMAGE.url],
  },
  manifest: "/site.webmanifest",
  robots: isPreviewDeployment()
    ? { index: false, follow: false }
    : { index: true, follow: true },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
};

/**
 * Next requires `themeColor` here rather than in the `metadata` export —
 * it is silently dropped from `metadata` and no meta tag is emitted.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={publicSans.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <JsonLd data={createWebSiteJsonLd()} />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <ToolCommandMenu />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
