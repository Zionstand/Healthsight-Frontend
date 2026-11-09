import { Outfit } from "next/font/google"

import type { Metadata, Viewport } from "next"

import "./globals.css"
import { cn } from "@/lib/utils"
import { Providers } from "@/components/providers"
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LONG_NAME,
  SITE_NAME,
  SITE_URL,
  ORG_NAME,
  THEME_COLOR,
} from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_LONG_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: ORG_NAME }],
  creator: ORG_NAME,
  publisher: ORG_NAME,
  category: "health",
  // Stop iOS turning numbers in patient records into tap-to-call links.
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_LONG_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_LONG_NAME,
    description: SITE_DESCRIPTION,
  },
  // Icons come from the file conventions: app/favicon.ico, app/icon.png,
  // app/apple-icon.png. The web manifest is app/manifest.ts.
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION && {
    verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION },
  }),
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: "#063242" },
  ],
}

// Outfit is the single typeface for the whole site. Every font token in
// globals.css (sans, display, heading, ui, accent, mono) resolves to it.
const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased font-sans",
        outfit.variable
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
