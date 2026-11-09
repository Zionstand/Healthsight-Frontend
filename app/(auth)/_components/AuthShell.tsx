import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"

import { Logo } from "@/components/Logo"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { cn } from "@/lib/utils"

type BrandCopy = {
  /** Large line on the blue panel. */
  headline: string
  /** Supporting sentence under the headline. */
  message: string
  /** Short reassurance shown in the frosted box at the bottom of the panel. */
  note: string
}

type AuthShellProps = {
  brand: BrandCopy
  /** Heading above the form; omit when the content supplies its own. */
  title?: ReactNode
  description?: ReactNode
  /** Small icon badge shown above the title (e.g. on reset steps). */
  icon?: ReactNode
  /** Gives the form side more room — used by the multi-field sign-up form. */
  wide?: boolean
  children: ReactNode
}

/**
 * The shared frame for every signed-out screen — sign in, sign up, password
 * reset and forced password change — so they all look the same: brand panel on
 * the left (hidden on small screens), form on the right.
 */
export function AuthShell({ brand, title, description, icon, wide, children }: AuthShellProps) {
  return (
    <div
      className={cn(
        "relative grid w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[0_28px_70px_-28px_rgba(22,110,147,0.45)]",
        wide ? "max-w-6xl md:grid-cols-[0.8fr_1.2fr]" : "max-w-5xl md:grid-cols-[1.05fr_1fr]"
      )}
    >
      <ThemeSwitcher className="absolute top-4 right-4 z-20" />

      {/* ───────────────── Brand panel ───────────────── */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-sky-600 via-brand-sky-700 to-brand-sky-900 p-10 md:flex lg:p-12">
        {/* seal-quadrant accent bar (sky · crimson · amber · verdant) */}
        <div className="absolute inset-x-0 top-0 z-10 flex h-1.5">
          <span className="flex-1 bg-brand-sky-500" />
          <span className="flex-1 bg-brand-crimson-500" />
          <span className="flex-1 bg-brand-amber-500" />
          <span className="flex-1 bg-brand-verdant-500" />
        </div>

        {/* atmosphere */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:22px_22px]"
        />
        <div
          aria-hidden
          className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-brand-amber-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand-verdant-500/25 blur-3xl"
        />

        {/* top — seal (transparent, framed by a thin outline ring) */}
        <div className="relative z-10">
          <div className="inline-flex rounded-full border-2 border-white/40 p-1.5">
            <Logo className="w-28" />
          </div>
        </div>

        {/* middle — institutional message */}
        <div className="relative z-10 max-w-sm space-y-4">
          <p className="font-ui text-xs font-medium tracking-[0.22em] text-brand-sky-100 uppercase">
            Lagos State Health District I
          </p>
          <h2 className="font-display text-3xl leading-tight font-semibold text-white lg:text-4xl">
            {brand.headline}
          </h2>
          <p className="font-sans text-base leading-relaxed text-brand-sky-100/80">
            {brand.message}
          </p>
        </div>

        {/* bottom — trust + motto */}
        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-brand-amber-300" />
            <p className="font-ui text-sm text-white/90">{brand.note}</p>
          </div>
          <p className="font-accent text-lg text-brand-sky-100/80 italic">
            “Justice and Progress”
          </p>
        </div>
      </aside>

      {/* ───────────────── Form ───────────────── */}
      <div className="flex flex-col justify-center bg-card p-8 sm:p-10 lg:p-12">
        {/* seal — mobile only (panel hidden < md) */}
        <div className="mb-8 flex justify-center md:hidden">
          <div className="inline-flex rounded-full border-2 border-brand-sky-200 p-1.5">
            <Logo className="w-24" />
          </div>
        </div>

        {(title || description || icon) && (
          <div className="animate-brand-fade-up space-y-1.5">
            {icon && (
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-sky-100 text-brand-sky-700 dark:bg-brand-sky-900/50 dark:text-brand-sky-200">
                {icon}
              </div>
            )}
            {title && (
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="font-sans text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  )
}

/** Fade-up delay for the n-th item in a form, matching the sign-in page's rhythm. */
export const stagger = (n: number) => ({ animationDelay: `${n * 80}ms` })

/** Label style shared by every auth form. */
export const authLabel = "font-ui text-sm text-muted-foreground"
