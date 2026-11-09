import { Suspense } from "react"
import type { Metadata } from "next"
import { LoginForm } from "./_components/LoginForm"
import {
  ORG_NAME,
  SITE_DESCRIPTION,
  SITE_LONG_NAME,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo"

export const metadata: Metadata = {
  // The home page leads with the brand, not "Sign in", in search results.
  title: { absolute: SITE_LONG_NAME },
  description:
    "Sign in to Healthsight, the Lagos State Health District I platform for staff, doctors, and administrators.",
  alternates: { canonical: "/" },
}

// Structured data: tells search engines who runs the site and what it is.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "GovernmentOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: ORG_NAME,
      alternateName: "LSHD1",
      url: SITE_URL,
      logo: `${SITE_URL}/assets/images/logo.jpeg`,
      areaServed: { "@type": "State", name: "Lagos State, Nigeria" },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: SITE_LONG_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "en-NG",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
}

const Page = () => (
  <>
    <script
      type="application/ld+json"
      // Static, server-built JSON. "<" is escaped so it can't close the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
    <Suspense>
      <LoginForm />
    </Suspense>
  </>
)

export default Page
