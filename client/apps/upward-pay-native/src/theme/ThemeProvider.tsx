import { createContext, useContext, useMemo, type ReactNode } from 'react'

import { lightColors } from '@/theme/colors'
import { radius } from '@/theme/radius'
import { spacing } from '@/theme/spacing'

export type AppTheme = {
  colors: typeof lightColors
  spacing: typeof spacing
  radius: typeof radius
  fontsLoaded: boolean
}

const ThemeContext = createContext<AppTheme | null>(null)

export function AppThemeProvider({
  fontsLoaded,
  children,
}: {
  fontsLoaded: boolean
  children: ReactNode
}) {
  const value = useMemo<AppTheme>(
    () => ({
      colors: lightColors,
      spacing,
      radius,
      fontsLoaded,
    }),
    [fontsLoaded],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useAppTheme(): AppTheme {
  const theme = useContext(ThemeContext)
  if (!theme) {
    throw new Error('useAppTheme must be used within AppThemeProvider')
  }
  return theme
}
