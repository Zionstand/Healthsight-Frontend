"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconMenu2 } from "@tabler/icons-react"
import { useSidebar } from "@/components/ui/sidebar"
import { useNavItems } from "@/lib/nav"
import { cn } from "@/lib/utils"

/**
 * Phone navigation: the person's four main screens one tap away, and "Menu"
 * for everything else. Hidden from tablet width up, where the sidebar shows.
 */
export function MobileTabBar({ badges = {} }: { badges?: Record<string, number> }) {
  const pathname = usePathname()
  const nav = useNavItems().slice(0, 4)
  const { setOpenMobile } = useSidebar()

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <ul className="grid grid-cols-5">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/")
          const count = badges[href] ?? 0
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "text-primary"
                )}
              >
                {Icon && <Icon className="size-5" />}
                <span className="max-w-full truncate px-1">{shortLabel(label)}</span>
                {count > 0 && (
                  <span className="absolute top-2 left-1/2 ml-2 min-w-4 rounded-full bg-brand-amber-500 px-1 text-[10px] leading-4 text-brand-charcoal-900 tabular-nums">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
          >
            <IconMenu2 className="size-5" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

/** "My assessments" -> "Assessments", "Assessment analysis" -> "Analysis" */
function shortLabel(label: string) {
  const s = label.replace(/^(My|View|Admin)\s+/i, "").replace(/^Assessment analysis$/i, "Analysis")
  return s.charAt(0).toUpperCase() + s.slice(1)
}
