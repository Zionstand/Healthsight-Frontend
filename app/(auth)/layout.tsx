import React from "react"

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <>
      {/* Atmospheric backdrop — sky radial fading into the base tint (PRD §6.2),
          shared by every signed-out screen. */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-[radial-gradient(125%_125%_at_85%_10%,var(--brand-sky-100)_0%,var(--bg-base)_42%,var(--bg-base)_100%)]"
      />
      <div className="container flex min-h-screen items-center justify-center py-16">
        {children}
      </div>
    </>
  )
}
