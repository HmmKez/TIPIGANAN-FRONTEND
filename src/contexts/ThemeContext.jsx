import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'tipiganan_theme'
const MOTION_KEY = 'tipiganan_reduce_motion'

// 'system' means "no explicit choice" — the CSS media query handles it, so
// the only thing to do here is make sure no leftover data-theme overrides it.
function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme)
  else root.removeAttribute('data-theme')
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')
  const [reduceMotion, setReduceMotionState] = useState(() => localStorage.getItem(MOTION_KEY) === '1')

  // index.html already stamped data-theme synchronously before first paint
  // (avoids a flash of the wrong theme) — this just keeps state in sync on
  // mount and whenever the user changes it afterward.
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
  }, [reduceMotion])

  const setTheme = (next) => {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }

  const setReduceMotion = (next) => {
    localStorage.setItem(MOTION_KEY, next ? '1' : '0')
    setReduceMotionState(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, reduceMotion, setReduceMotion }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
