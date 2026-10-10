import { vi } from 'vitest'
import { appearanceQueries } from '../appearanceBrowser'
import type { AppearanceCapabilities } from '../appearance'

export function mockAppearanceBrowser(overrides: Partial<AppearanceCapabilities> = {}) {
  const flags: AppearanceCapabilities = {
    dark: false,
    reducedMotion: false,
    reducedTransparency: false,
    forcedColors: false,
    backdropFilter: true,
    ...overrides,
  }
  const listeners = new Map<string, Set<() => void>>()
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => {
      const key = Object.keys(appearanceQueries).find(
        (key) => appearanceQueries[key as keyof typeof appearanceQueries] === query,
      ) as keyof typeof appearanceQueries | undefined
      const handlers = listeners.get(query) ?? new Set<() => void>()
      listeners.set(query, handlers)
      return {
        media: query,
        get matches() {
          return key ? flags[key] : false
        },
        addEventListener: (_type: string, handler: () => void) => handlers.add(handler),
        removeEventListener: (_type: string, handler: () => void) => handlers.delete(handler),
      } as unknown as MediaQueryList
    }),
  )
  vi.stubGlobal('CSS', { supports: () => flags.backdropFilter })
  return {
    flags,
    update(key: keyof typeof appearanceQueries, value: boolean) {
      flags[key] = value
      for (const listener of listeners.get(appearanceQueries[key]) ?? []) listener()
    },
    listenerCount: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
  }
}
export function clearAppearanceBootstrap() {
  delete window.__homebaseAppearance
  for (const key of Object.keys(document.documentElement.dataset))
    delete document.documentElement.dataset[key]
  document.documentElement.style.colorScheme = ''
}
export function storageAppearance(value: string | null, key = 'homebase.appearance.v1') {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: value }))
}
