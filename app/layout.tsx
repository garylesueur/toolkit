import type { Metadata } from "next";
import { Geist, Geist_Mono, Public_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const revalidate = 31536000; // 1 year

const publicSans = Public_Sans({subsets:['latin'],variable:'--font-sans'});

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

export const metadata: Metadata = {
  metadataBase: new URL("https://toolkit.lesueur.uk"),
  title: {
    template: "%s | Toolkit",
    default: "Toolkit — Developer Utilities",
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: "Gary Le Sueur" }],
  openGraph: {
    type: "website",
    siteName: "Toolkit",
    locale: "en_GB",
    title: "Toolkit — Developer Utilities",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={publicSans.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
