import { ActivityIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "flex items-center gap-2 font-semibold tracking-tight",
        className
      )}
    >
      <ActivityIcon className="size-[1.1em] text-primary" />
      StackPulse
    </Link>
  )
}
