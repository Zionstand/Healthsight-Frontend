"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Fragment } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { usePageLabel } from "@/store/usePageLabel"

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  analytics: "Assessment analysis",
  patients: "Patients",
  register: "Register patient",
  screenings: "Screenings",
  appointments: "Appointments",
  assessment: "Assessments",
  general: "General assessment",
  safecare: "SafeCare assessment",
  users: "Staff",
  "pending-users": "Pending approvals",
  phcs: "PHCs",
  map: "Map",
  roles: "Roles & permissions",
  sms: "SMS logs",
  directors: "Directors",
  dividers: "Dividers",
  volunteers: "Volunteers",
  reports: "Reports",
}

// Only these get a link; in-between paths like /admin/assessment have no page.
const ROUTES = new Set([
  "/dashboard", "/analytics", "/patients", "/patients/register", "/screenings",
  "/appointments", "/assessment", "/dividers", "/volunteers", "/reports",
  "/admin/dashboard", "/admin/analytics", "/admin/users", "/admin/pending-users",
  "/admin/phcs", "/admin/phcs/map", "/admin/roles", "/admin/sms", "/admin/directors",
  "/admin/assessment/general", "/admin/assessment/safecare",
])

/**
 * Where you are, e.g. "Patients / Tomiwa Adelae". Shown on nested screens; on a
 * top-level screen it is just the page name.
 */
export function Breadcrumbs() {
  const pathname = usePathname()
  const label = usePageLabel((s) => (s.path === pathname ? s.label : null))

  const parts = pathname.split("/").filter(Boolean)
  const offset = parts[0] === "admin" ? 1 : 0
  const crumbs = parts.slice(offset).map((seg, i) => {
    const href = "/" + parts.slice(0, offset + i + 1).join("/")
    const last = i === parts.length - offset - 1
    const name = LABELS[seg] ?? (last ? (label ?? "Details") : "Details")
    return { href, name: last && label ? label : name, linkable: !last && ROUTES.has(href) }
  })

  if (crumbs.length === 0) return null

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            {i > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
            <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden sm:inline-flex" : "min-w-0"}>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage className="truncate font-medium">{c.name}</BreadcrumbPage>
              ) : c.linkable ? (
                <BreadcrumbLink asChild>
                  <Link href={c.href}>{c.name}</Link>
                </BreadcrumbLink>
              ) : (
                <span>{c.name}</span>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
