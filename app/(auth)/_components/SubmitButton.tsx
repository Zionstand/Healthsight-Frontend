import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Full-width primary action used by every auth form. */
export function SubmitButton({
  pending,
  pendingLabel,
  children,
  className,
  style,
}: {
  pending: boolean
  pendingLabel: string
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <Button
      type="submit"
      className={cn(
        "animate-brand-fade-up h-12 w-full font-ui text-base font-semibold transition-transform active:scale-[0.98]",
        className
      )}
      style={style}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <Loader2 className="size-5 animate-spin" aria-label={pendingLabel} /> : children}
    </Button>
  )
}
