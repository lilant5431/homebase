import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  parseAppearance,
  resolveAppearance,
  writeAppearance,
  type AppearancePreferences,
} from './appearance'
import {
  applyAppearance,
  browserCapabilities,
  initializeAppearance,
  mediaQueries,
  type AppearanceSnapshot,
} from './appearanceBrowser'

export const APPEARANCE_SAVE_WARNING =
  'Appearance applies to this tab; this browser could not save your preference.'
type AppearanceState = AppearanceSnapshot & {
  warning: string
  change: (patch: Partial<Omit<AppearancePreferences, 'version'>>) => void
  reset: () => void
}
const AppearanceContext = createContext<AppearanceState | null>(null)
export function useAppearance() {
  return useContext(AppearanceContext)
}

/** Content is an unchanged child element: preference changes cannot remount App or advance its plan. */
export default function AppearanceBoundary({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(
    () => window.__homebaseAppearance ?? initializeAppearance(window, document.documentElement),
  )
  const [warning, setWarning] = useState('')
  useLayoutEffect(() => {
    applyAppearance(document.documentElement, snapshot)
    window.__homebaseAppearance = snapshot
  }, [snapshot])
  useLayoutEffect(() => {
    function updateCapabilities() {
      setSnapshot((current) => ({
        selected: current.selected,
        effective: resolveAppearance(current.selected, browserCapabilities(window)),
      }))
    }
    const queries = mediaQueries(window)
    for (const { media } of queries) {
      if (media?.addEventListener) media.addEventListener('change', updateCapabilities)
      else media?.addListener?.(updateCapabilities)
    }
    function synchronize(event: StorageEvent) {
      if (event.key !== APPEARANCE_KEY && event.key !== null) return
      // Synthetic events may omit storageArea; sessionStorage must never synchronize us.
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return
      } catch {
        return
      }
      const selected = event.newValue === null ? { ...DEFAULT_APPEARANCE } : parseAppearance(event.newValue)
      if (!selected) return
      setSnapshot({ selected, effective: resolveAppearance(selected, browserCapabilities(window)) })
      setWarning('')
    }
    window.addEventListener('storage', synchronize)
    // Close the bootstrap → listener-install race without another preference read/write.
    updateCapabilities()
    return () => {
      for (const { media } of queries) {
        if (media?.removeEventListener) media.removeEventListener('change', updateCapabilities)
        else media?.removeListener?.(updateCapabilities)
      }
      window.removeEventListener('storage', synchronize)
    }
  }, [])
  function choose(selected: AppearancePreferences) {
    let saved = false
    try {
      saved = writeAppearance(window.localStorage, selected)
    } catch {
      /* Storage getter itself may be blocked. */
    }
    setWarning(saved ? '' : APPEARANCE_SAVE_WARNING)
    setSnapshot({ selected, effective: resolveAppearance(selected, browserCapabilities(window)) })
  }
  function change(patch: Partial<Omit<AppearancePreferences, 'version'>>) {
    const selected = parseAppearance(JSON.stringify({ ...snapshot.selected, ...patch, version: 1 }))!
    choose(selected)
  }
  return (
    <AppearanceContext.Provider
      value={{ ...snapshot, warning, change, reset: () => choose({ ...DEFAULT_APPEARANCE }) }}
    >
      {children}
    </AppearanceContext.Provider>
  )
}
