import { ImageResponse } from "next/og"
import { readFileSync } from "node:fs"
import { join } from "node:path"

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = "image/png"

// Inline the seal once (node runtime) so satori can render it.
let sealDataUri: string | null = null
try {
  const buf = readFileSync(
    join(process.cwd(), "public/assets/images/logo.jpeg")
  )
  sealDataUri = `data:image/jpeg;base64,${buf.toString("base64")}`
} catch {
  sealDataUri = null
}

// Outfit, the site's only typeface. Satori can't read the woff2 that next/font
// serves, so static TTFs are bundled for the share image.
type OgFont = { name: string; data: Buffer; weight: 400 | 700; style: "normal" }
const ogFonts: OgFont[] = []
for (const weight of [400, 700] as const) {
  try {
    ogFonts.push({
      name: "Outfit",
      data: readFileSync(join(process.cwd(), `assets/fonts/Outfit-${weight}.ttf`)),
      weight,
      style: "normal",
    })
  } catch {
    // Falls back to satori's built-in font rather than failing the image.
  }
}

type OgOptions = {
  title: string
  subtitle?: string
  eyebrow?: string
}

/** Branded LSHD1 OpenGraph image (1200×630) built with next/og. */
export function renderOgImage({
  title,
  subtitle,
  eyebrow = "Lagos State Health District I",
}: OgOptions) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(135deg, #1e8dbb 0%, #166e93 45%, #063242 100%)",
          color: "#ffffff",
          fontFamily: "Outfit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {sealDataUri ? (
            <div
              style={{
                display: "flex",
                width: 128,
                height: 128,
                borderRadius: 999,
                background: "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sealDataUri}
                width={118}
                height={118}
                style={{ borderRadius: 999 }}
                alt=""
              />
            </div>
          ) : null}
          <div
            style={{
              display: "flex",
              fontSize: 30,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#c5e9f8",
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                display: "flex",
                fontSize: 34,
                color: "#c5e9f8",
                maxWidth: 920,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            height: 14,
            width: 320,
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div style={{ flex: 1, background: "#29abe2" }} />
          <div style={{ flex: 1, background: "#be1e2d" }} />
          <div style={{ flex: 1, background: "#f7941d" }} />
          <div style={{ flex: 1, background: "#2a7a2e" }} />
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: ogFonts }
  )
}
