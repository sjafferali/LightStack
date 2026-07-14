import { useCallback, useEffect, useState } from 'react'

export type Mode = 'light' | 'dark'

const STORAGE_KEY = 'lightstack-mode'

function initialMode(): Mode {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  // Fall back to the operating system's preference until the user chooses.
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

/** Read and set the colour mode. The mode lives on <html data-mode>. */
export function useTheme() {
  const [mode, setMode] = useState<Mode>(initialMode)

  useEffect(() => {
    document.documentElement.dataset.mode = mode
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  const toggle = useCallback(() => setMode((m) => (m === 'dark' ? 'light' : 'dark')), [])

  return { mode, setMode, toggle }
}
