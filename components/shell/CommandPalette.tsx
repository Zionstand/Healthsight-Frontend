"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  IconLogout,
  IconMoon,
  IconSearch,
  IconSun,
  IconUser,
} from "@tabler/icons-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { useNavItems } from "@/lib/nav"
import { useApiQuery } from "@/lib/queries"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { useSignout } from "@/hooks/use-signout"
import { cn } from "@/lib/utils"

const PaletteContext = createContext<(open: boolean) => void>(() => {})

/**
 * Ctrl+K (⌘K on Mac) opens a search over every screen this person can reach
 * and, for staff with patient access, the patients themselves.
 */
export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <PaletteContext.Provider value={setOpen}>
      {children}
      <Palette open={open} onOpenChange={setOpen} />
    </PaletteContext.Provider>
  )
}

export const useCommandPalette = () => useContext(PaletteContext)

type PatientHit = {
  id: string
  firstName: string
  lastName: string
  patientNumber: string
}

function Palette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const nav = useNavItems()
  const signout = useSignout()
  const { resolvedTheme, setTheme } = useTheme()
  const [query, setQuery] = useState("")
  const term = useDebouncedValue(query.trim(), 250)

  const canSearchPatients = nav.some((n) => n.href === "/patients")
  const { data: patients, isFetching } = useApiQuery<{ data: PatientHit[] }>(
    open && canSearchPatients && term.length >= 2 ? "/patients" : null,
    { params: { search: term, limit: 6 }, silent: true }
  )
  const hits = term.length >= 2 ? (patients?.data ?? []) : []

  const run = (fn: () => void) => {
    onOpenChange(false)
    setQuery("")
    fn()
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery("")
      }}
      title="Search Healthsight"
      description="Jump to a screen or find a patient"
    >
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2">
        <CommandInput
          placeholder={
            canSearchPatients
              ? "Search screens or patients…"
              : "Search screens…"
          }
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isFetching ? "Searching…" : "Nothing found."}
          </CommandEmpty>

          {hits.length > 0 && (
            <CommandGroup heading="Patients">
              {hits.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`patient ${p.firstName} ${p.lastName} ${p.patientNumber}`}
                  onSelect={() => run(() => router.push(`/patients/${p.id}`))}
                >
                  <IconUser />
                  <span>
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {p.patientNumber}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Go to">
            {nav.map(({ label, href, icon: Icon }) => (
              <CommandItem
                key={href}
                value={`go ${label}`}
                onSelect={() => run(() => router.push(href))}
              >
                {Icon && <Icon />}
                <span>{label}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Settings">
            <CommandItem
              value="toggle theme dark light mode"
              onSelect={() =>
                run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))
              }
            >
              {resolvedTheme === "dark" ? <IconSun /> : <IconMoon />}
              <span>
                Switch to {resolvedTheme === "dark" ? "light" : "dark"} mode
              </span>
            </CommandItem>
            <CommandItem
              value="sign out log out"
              onSelect={() => run(() => void signout())}
            >
              <IconLogout />
              <span>Sign out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

/** The search box in the top bar; opens the palette. */
export function SearchTrigger({ className }: { className?: string }) {
  const open = useCommandPalette()
  const [mac, setMac] = useState(false)
  useEffect(() => {
    // Read after mount so the server and first client render agree.
    const id = requestAnimationFrame(() =>
      setMac(/Mac|iPhone|iPad/.test(navigator.platform))
    )
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <Button
      variant="outline"
      onClick={() => open(true)}
      aria-label="Search"
      className={cn(
        "h-9 justify-start gap-2 px-2.5 font-normal text-muted-foreground sm:w-56 sm:pr-1.5",
        className
      )}
    >
      <IconSearch className="size-4" />
      <span className="hidden sm:inline">Search…</span>
      <CommandShortcut className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] tracking-normal sm:inline">
        {mac ? "⌘K" : "Ctrl K"}
      </CommandShortcut>
    </Button>
  )
}
