import * as React from "react"
import { cn } from "@/lib/utils"
import { DecorativeThemeSwitch } from "./decorative-theme-switch"

type ThemeToggleProps = {
  className?: string
}

export const ThemeToggle = React.forwardRef<HTMLDivElement, ThemeToggleProps>(
  function ThemeToggle({ className }, ref) {
    return (
      <div ref={ref} className={cn("inline-flex items-center", className)}>
        <DecorativeThemeSwitch />
      </div>
    )
  }
)
ThemeToggle.displayName = "ThemeToggle"
