/** Appearance is derived presentation state; it has no academic/planner dependencies. */
export const APPEARANCE_KEY = 'homebase.appearance.v1'
export const appearanceChoices = {
  environment: ['lattice', 'landscape', 'basic'],
  mode: ['system', 'light', 'dark'],
  material: ['solid', 'frosted'],
  effects: ['system', 'reduced'],
  motion: ['system', 'reduced'],
} as const
export type AppearancePreferences = {
  version: 1
  environment: (typeof appearanceChoices.environment)[number]
  mode: (typeof appearanceChoices.mode)[number]
  material: (typeof appearanceChoices.material)[number]
  effects: (typeof appearanceChoices.effects)[number]
  motion: (typeof appearanceChoices.motion)[number]
}
export const DEFAULT_APPEARANCE: Readonly<AppearancePreferences> = Object.freeze({
  version: 1,
  environment: 'lattice',
  mode: 'system',
  material: 'solid',
  effects: 'system',
  motion: 'system',
})
export type AppearanceCapabilities = {
  dark: boolean
  reducedMotion: boolean
  reducedTransparency: boolean
  forcedColors: boolean
  backdropFilter: boolean
}
export type EffectiveAppearance = {
  environment: AppearancePreferences['environment']
  palette: 'light' | 'dark'
  material: AppearancePreferences['material']
  reducedEffects: boolean
  reducedMotion: boolean
  forcedColors: boolean
  continuousAtmosphere: boolean
}
/** null distinguishes invalid/future events from a valid partial version-1 preference. */
export function parseAppearance(raw: string | null): AppearancePreferences | null {
  if (raw === null) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const object = value as Record<string, unknown>
  if (object.version !== 1) return null
  const result = { ...DEFAULT_APPEARANCE }
  for (const field of Object.keys(appearanceChoices) as (keyof typeof appearanceChoices)[]) {
    const candidate = object[field]
    // Each field is checked independently: invalid siblings cannot discard valid selections.
    if (typeof candidate === 'string' && (appearanceChoices[field] as readonly string[]).includes(candidate))
      Object.assign(result, { [field]: candidate })
  }
  return result
}
export function readAppearance(storage: Pick<Storage, 'getItem'>): AppearancePreferences {
  try {
    return parseAppearance(storage.getItem(APPEARANCE_KEY)) ?? { ...DEFAULT_APPEARANCE }
  } catch {
    return { ...DEFAULT_APPEARANCE }
  }
}
export function writeAppearance(
  storage: Pick<Storage, 'setItem'>,
  preference: AppearancePreferences,
): boolean {
  try {
    storage.setItem(APPEARANCE_KEY, JSON.stringify(preference))
    return true
  } catch {
    return false
  }
}
export function resolveAppearance(
  selected: Readonly<AppearancePreferences>,
  capabilities: Readonly<AppearanceCapabilities>,
): EffectiveAppearance {
  const reducedEffects =
    selected.effects === 'reduced' || capabilities.reducedTransparency || capabilities.forcedColors
  const reducedMotion = selected.motion === 'reduced' || capabilities.reducedMotion || reducedEffects
  return {
    environment: selected.environment,
    palette: selected.mode === 'system' ? (capabilities.dark ? 'dark' : 'light') : selected.mode,
    material: reducedEffects || !capabilities.backdropFilter ? 'solid' : selected.material,
    reducedEffects,
    reducedMotion,
    forcedColors: capabilities.forcedColors,
    continuousAtmosphere: selected.environment !== 'basic' && !reducedMotion,
  }
}
