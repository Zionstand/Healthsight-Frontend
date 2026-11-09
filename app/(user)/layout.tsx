import type { Metadata } from "next"

// Everything under (user) sits behind sign-in, including the client-rendered
// admin area, which can't export metadata itself. robots.txt only blocks
// crawling, so a linked URL can still be listed. noindex keeps them out.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return children
}
