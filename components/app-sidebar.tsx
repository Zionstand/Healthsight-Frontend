"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/store/useAuth"
import { getNavByRole } from "@/lib/getNavByRole"
import { Logo } from "./Logo"
import Link from "next/link"


export function AppSidebar({
  badges,
  ...props
}: React.ComponentProps<typeof Sidebar> & { badges?: Record<string, number> }) {
  const { user } = useAuth()

  const navItems = React.useMemo(() => getNavByRole(user), [user])


  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-transparent"
            >
              <Link href="/dashboard" aria-label="Healthsight home">
                <Logo className="size-9" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={navItems} badges={badges} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
