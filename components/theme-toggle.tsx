"use client"

import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { RiSunLine, RiMoonLine, RiComputerLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ThemeOption = "light" | "dark" | "system"

interface ThemeEntry {
  value: ThemeOption
  label: string
  icon: typeof RiSunLine
}

const THEME_OPTIONS: ThemeEntry[] = [
  { value: "light", label: "Light", icon: RiSunLine },
  { value: "dark", label: "Dark", icon: RiMoonLine },
  { value: "system", label: "System", icon: RiComputerLine },
]

/**
 * Dropdown toggle for switching between light, dark, and system themes.
 * Renders a skeleton-sized placeholder until mounted to avoid hydration mismatch.
 */
export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {mounted ? (
            <>
              <RiSunLine className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
              <RiMoonLine className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
            </>
          ) : (
            <span className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            data-active={theme === value || undefined}
          >
            <Icon className="size-4" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
