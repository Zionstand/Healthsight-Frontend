import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Everything behind authentication stays out of search indexes.
      disallow: [
        "/admin",
        "/dashboard",
        "/patients",
        "/appointments",
        "/assessment",
        "/reports",
        "/analytics",
        "/screenings",
        "/volunteers",
        "/dividers",
        "/change-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
