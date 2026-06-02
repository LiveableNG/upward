'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Force theme to default to 'light' (temporarily ignoring system or saved preferences)
  const [theme, setThemeState] = useState<Theme>('light')

  // Load from localStorage on mount
  useEffect(() => {
    // Stored theme is ignored for now to default to light mode across the app
    /*
    const saved = localStorage.getItem('upward-theme') as Theme
    if (saved) {
      setThemeState(saved)
    } else {
      // If no theme saved, check system preference
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setThemeState(isDark ? 'dark' : 'light')
    }
    */
    setThemeState('light')
  }, [])

  const setTheme = (newTheme: Theme) => {
    // Temporarily always set 'light' mode
    setThemeState('light')
  }

  // Apply classes to root element
  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove('theme--light', 'theme--dark')
    root.classList.add('theme--light') // Always force light mode
  }, [theme])

  return <ThemeContext.Provider value={{ theme: 'light', setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
