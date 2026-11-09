"use client"

// Last line of defence: replaces the root layout itself, so it can't rely on
// the app's providers or styles and keeps everything inline.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>Healthsight couldn&apos;t load</h1>
          <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            Something went wrong while starting the app. Please try again.
            {error.digest && <><br />Reference: {error.digest}</>}
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 8,
              padding: "10px 18px",
              borderRadius: 8,
              border: 0,
              background: "#1e8dbb",
              color: "#fff",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
