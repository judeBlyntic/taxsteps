import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEMES, type ThemeName } from '@taxsteps/core'
import { applyTheme } from './theme'

// The account's theme lives on the profile; this device keeps a copy so the app opens in it before the profile loads.
const KEY = 'taxsteps.theme'
const isTheme = (v: unknown): v is ThemeName => (THEMES as readonly unknown[]).includes(v)

const ThemeContext = createContext<{ theme: ThemeName; setTheme: (t: ThemeName) => void } | null>(null)

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName | null>(null)
  useEffect(() => {
    void AsyncStorage.getItem(KEY).catch(() => null).then((saved) => {
      const t = isTheme(saved) ? saved : 'fresh'
      applyTheme(t)
      setThemeState(t)
    })
  }, [])
  const setTheme = useCallback((t: ThemeName) => {
    applyTheme(t)
    void AsyncStorage.setItem(KEY, t).catch(() => undefined)
    setThemeState(t)
  }, [])
  if (!theme) return null // splash screen stays up
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useAppTheme outside AppThemeProvider')
  return ctx
}
