"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "@radix-ui/react-icons"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  // Prevent hydration mismatch by not rendering icons until mounted
  if (!mounted) {
    return <Button variant="default" size="icon" />
  }

  return (
    <Button variant="default" size="icon" onClick={toggleTheme}>
      <img src="/symbol.svg" alt="Imacx Symbol" className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
} 