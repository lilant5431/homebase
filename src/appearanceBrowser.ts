import {
  DEFAULT_APPEARANCE,
  readAppearance,
  resolveAppearance,
  type AppearanceCapabilities,
  type AppearancePreferences,
  type EffectiveAppearance,
} from './appearance'

export const appearanceQueries = {
  dark: '(prefers-color-scheme: dark)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  forcedColors: '(forced-colors: active)',
} as const
export type AppearanceSnapshot = {
  selected: AppearancePreferences
  effective: EffectiveAppearance
}
declare global {
  interface Window {
    __homebaseAppearance?: AppearanceSnapshot
  }
}
export function mediaQueries(browser: Window) {
  return Object.entries(appearanceQueries).map(([key, query]) => {
    let media: MediaQueryList | undefined
    try {
      media = browser.matchMedia?.(query)
    } catch {
      /* Missing/denied capability is not reported. */
    }
    return { key: key as keyof typeof appearanceQueries, media }
  })
}
export function browserCapabilities(
  browser: Window & { CSS?: Pick<typeof CSS, 'supports'> },
): AppearanceCapabilities {
  const result: AppearanceCapabilities = {
    dark: false,
    reducedMotion: false,
    reducedTransparency: false,
    forcedColors: false,
    backdropFilter: false,
  }
  for (const { key, media } of mediaQueries(browser)) result[key] = media?.matches ?? false
  try {
    result.backdropFilter =
      browser.CSS?.supports('backdrop-filter', 'blur(1px)') === true ||
      browser.CSS?.supports('-webkit-backdrop-filter', 'blur(1px)') === true
  } catch {
    /* Safe opaque fallback. */
  }
  return result
}
export function applyAppearance(root: HTMLElement, snapshot: AppearanceSnapshot) {
  const { selected, effective } = snapshot
  root.dataset.environment = effective.environment
  root.dataset.mode = selected.mode
  root.dataset.palette = effective.palette
  root.dataset.selectedMaterial = selected.material
  root.dataset.material = effective.material
  root.dataset.effects = effective.reducedEffects ? 'reduced' : 'standard'
  root.dataset.motion = effective.reducedMotion ? 'reduced' : 'standard'
  root.dataset.atmosphere = effective.continuousAtmosphere ? 'permitted' : 'static'
  root.dataset.forcedColors = String(effective.forcedColors)
  root.style.colorScheme = effective.palette
}
export function initializeAppearance(browser: Window, root: HTMLElement): AppearanceSnapshot {
  let selected: AppearancePreferences
  try {
    selected = readAppearance(browser.localStorage)
  } catch {
    selected = { ...DEFAULT_APPEARANCE }
  }
  const snapshot = { selected, effective: resolveAppearance(selected, browserCapabilities(browser)) }
  applyAppearance(root, snapshot)
  browser.__homebaseAppearance = snapshot
  return snapshot
}
