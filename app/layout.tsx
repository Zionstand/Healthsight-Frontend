import { Outfit } from "next/font/google"

import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_LONG_NAME,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_LONG_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: "Lagos State Health District I" }],
  creator: "Lagos State Health District I",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_LONG_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_LONG_NAME,
    description: SITE_DESCRIPTION,
  },
  icons: { icon: "/favicon.ico" },
  robots: { index: true, follow: true },
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
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  )
}
