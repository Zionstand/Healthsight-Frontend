"use client";

import { type Icon } from "@tabler/icons-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "./ui/badge";
import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function NavMain({
  items,
  badges = {},
}: {
  /** Counts shown next to a link, keyed by its slug. */
  badges?: Record<string, number>;
  items: {
    label: string;
    slug: string;
    icon?: Icon | LucideIcon;
    comingSoon?: boolean;
    allowedRoles?: string[]; // Add this to the interface
  }[];
}) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive =
              pathname === item.slug || pathname.startsWith(`${item.slug}/`);
            const IconComponent = item.icon;

            return (
              <SidebarMenuItem key={item.slug}>
                {item.comingSoon ? (
                  <SidebarMenuButton
                    tooltip={item.label}
                    className="opacity-50 cursor-not-allowed"
                    disabled
                  >
                    {IconComponent && <IconComponent className="size-4" />}
                    <span>{item.label.replace("Admin ", "")}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      Soon
                    </Badge>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton tooltip={item.label} asChild isActive={isActive}>
                    <Link href={item.slug} onClick={handleLinkClick}>
                      {IconComponent && <IconComponent className="size-4" />}
                      <span>{item?.label.replace("Admin ", "")}</span>
                    </Link>
                  </SidebarMenuButton>
                )}
                {(badges[item.slug] ?? 0) > 0 && (
                  <SidebarMenuBadge className="rounded-full bg-brand-amber-500 px-1.5 text-brand-charcoal-900 tabular-nums">
                    {badges[item.slug]}
                  </SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
