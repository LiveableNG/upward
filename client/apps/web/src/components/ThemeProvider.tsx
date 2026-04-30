'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')

  // Load from localStorage on mount
  useEffect(() => {
    // Shared localStorage key with upward-pay
    const saved = localStorage.getItem('upward-theme') as Theme
    if (saved) {
      setThemeState(saved)
    } else {
      // If no theme saved, check system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setThemeState(isDark ? 'dark' : 'light')
    }
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem('upward-theme', newTheme)
  }

  // Apply classes to root element
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('theme--light', 'theme--dark')

    if (theme === 'dark') {
      root.classList.add('theme--dark')
    } else if (theme === 'light') {
      root.classList.add('theme--light')
    } else if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.add(isDark ? 'theme--dark' : 'theme--light')
    }
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
