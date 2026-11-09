"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { Breadcrumbs } from "./Breadcrumbs"
import { SearchTrigger } from "./CommandPalette"

/** The bar above every signed-in screen: menu, where you are, search, theme. */
export function AppTopBar() {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <SidebarTrigger className="-ml-1" aria-label="Toggle menu" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-2">
        <SearchTrigger />
        <ThemeSwitcher />
      </div>
    </header>
  )
}
