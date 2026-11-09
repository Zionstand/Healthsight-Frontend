// Central SEO constants for Healthsight (Lagos State Health District I).

export const SITE_NAME = "Healthsight"
export const SITE_LONG_NAME = "Healthsight — Lagos State Health District I"

export const SITE_DESCRIPTION =
  "Healthsight is the digital health platform for Lagos State Health District I — coordinating primary healthcare, patient screenings, facility assessments, and appointments across the district."

export const SITE_KEYWORDS = [
  "Lagos State Health District I",
  "LSHD1",
  "Healthsight",
  "primary healthcare Lagos",
  "PHC",
  "health screening",
  "SafeCare assessment",
  "patient management",
  "Lagos State health",
  "healthcare Nigeria",
]

// metadataBase / canonical root. NEXT_PUBLIC_SITE_URL wins (set it once a custom
// domain exists). Otherwise use Vercel's production domain, which Vercel injects at
// build time, so canonicals and share links never point at localhost in production.
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, "")
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return "http://localhost:3000"
}

export const SITE_URL = resolveSiteUrl()

export const ORG_NAME = "Lagos State Health District I"
export const THEME_COLOR = "#1e8dbb"

/** Build a "<title> | Healthsight" string for client-side document.title use. */
export function pageTitle(title?: string) {
  return title ? `${title} | ${SITE_NAME}` : SITE_LONG_NAME
}
