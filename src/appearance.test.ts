import { describe, it, expect, vi } from 'vitest'
import {
  APPEARANCE_KEY,
  DEFAULT_APPEARANCE,
  appearanceChoices,
  parseAppearance,
  readAppearance,
  writeAppearance,
  resolveAppearance,
  type AppearanceCapabilities,
} from './appearance'

const capabilities: AppearanceCapabilities = {
  dark: false,
  reducedMotion: false,
  reducedTransparency: false,
  forcedColors: false,
  backdropFilter: true,
}
describe('appearance preferences', () => {
  it('uses the approved defaults without reading other keys or writing recovery data', () => {
    const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
    expect(readAppearance(storage)).toEqual(DEFAULT_APPEARANCE)
    expect(storage.getItem).toHaveBeenCalledExactlyOnceWith(APPEARANCE_KEY)
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  for (const field of Object.keys(appearanceChoices) as (keyof typeof appearanceChoices)[]) {
    it.each(appearanceChoices[field])(`accepts %s for ${field}`, (value) => {
      expect(parseAppearance(JSON.stringify({ version: 1, [field]: value }))).toEqual({
        ...DEFAULT_APPEARANCE,
        [field]: value,
      })
    })
    it.each([null, true, 1, {}, [], 'invalid', 'LIGHT'])(
      `defaults invalid ${field}: %j without dropping siblings`,
      (value) => {
        const sibling = field === 'environment' ? { mode: 'dark' } : { environment: 'basic' }
        expect(parseAppearance(JSON.stringify({ version: 1, ...sibling, [field]: value }))).toEqual({
          ...DEFAULT_APPEARANCE,
          ...sibling,
        })
      },
    )
  }
  it('ignores unknown fields and fills absent fields', () => {
    expect(parseAppearance('{"version":1,"mode":"dark","unknown":"value"}')).toEqual({
      ...DEFAULT_APPEARANCE,
      mode: 'dark',
    })
    expect(parseAppearance('{"version":1}')).toEqual(DEFAULT_APPEARANCE)
  })
  it.each([
    null,
    '',
    '{',
    'null',
    '[]',
    'true',
    '1',
    '{}',
    '{"version":2}',
    '{"version":"1"}',
    '{"version":false}',
  ])('rejects invalid source %s without rewriting it', (raw) => {
    const storage = { getItem: () => raw, setItem: vi.fn() }
    expect(parseAppearance(raw)).toBeNull()
    expect(readAppearance(storage)).toEqual(DEFAULT_APPEARANCE)
    expect(storage.setItem).not.toHaveBeenCalled()
  })
  it('survives blocked reads', () => {
    expect(
      readAppearance({
        getItem() {
          throw new Error('denied')
        },
      }),
    ).toEqual(DEFAULT_APPEARANCE)
  })
  it('writes only the independent key and reports blocked writes', () => {
    const setItem = vi.fn()
    expect(writeAppearance({ setItem }, DEFAULT_APPEARANCE)).toBe(true)
    expect(setItem).toHaveBeenCalledExactlyOnceWith(APPEARANCE_KEY, JSON.stringify(DEFAULT_APPEARANCE))
    expect(
      writeAppearance(
        {
          setItem() {
            throw new Error('quota')
          },
        },
        DEFAULT_APPEARANCE,
      ),
    ).toBe(false)
  })
})
describe('deterministic selected/effective resolution', () => {
  for (const environment of appearanceChoices.environment) {
    it.each(['light', 'dark'] as const)(`${environment} with explicit %s`, (mode) => {
      expect(
        resolveAppearance(
          { ...DEFAULT_APPEARANCE, environment, mode },
          { ...capabilities, dark: mode === 'light' },
        ),
      ).toMatchObject({ environment, palette: mode })
    })
  }
  it.each([false, true])('System follows OS dark=%s', (dark) => {
    expect(resolveAppearance(DEFAULT_APPEARANCE, { ...capabilities, dark }).palette).toBe(
      dark ? 'dark' : 'light',
    )
  })
  it.each(['reducedMotion', 'reducedTransparency', 'forcedColors'] as const)(
    'OS %s cannot be overridden',
    (key) => {
      const effective = resolveAppearance(
        { ...DEFAULT_APPEARANCE, material: 'frosted' },
        { ...capabilities, [key]: true },
      )
      expect(effective.reducedMotion).toBe(true)
      expect(effective.continuousAtmosphere).toBe(false)
      if (key !== 'reducedMotion') expect(effective.material).toBe('solid')
      else expect(effective.material).toBe('frosted')
    },
  )
  it.each(['effects', 'motion'] as const)('explicit %s reduction is honored', (key) => {
    expect(resolveAppearance({ ...DEFAULT_APPEARANCE, [key]: 'reduced' }, capabilities).reducedMotion).toBe(
      true,
    )
  })
  it('preserves selected Frosted through unsupported blur/reduction and restoration', () => {
    const selected = Object.freeze({ ...DEFAULT_APPEARANCE, material: 'frosted' as const })
    expect(resolveAppearance(selected, { ...capabilities, backdropFilter: false }).material).toBe('solid')
    expect(resolveAppearance(selected, { ...capabilities, reducedTransparency: true }).material).toBe('solid')
    expect(resolveAppearance(selected, capabilities).material).toBe('frosted')
    expect(selected.material).toBe('frosted')
  })
  it('Basic never permits continuous atmosphere; no clock or mutation', () => {
    const now = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('no clock')
    })
    try {
      const selected = Object.freeze({ ...DEFAULT_APPEARANCE, environment: 'basic' as const })
      expect(resolveAppearance(selected, Object.freeze(capabilities))).toEqual(
        resolveAppearance(selected, capabilities),
      )
      expect(resolveAppearance(selected, capabilities).continuousAtmosphere).toBe(false)
      expect(now).not.toHaveBeenCalled()
    } finally {
      now.mockRestore()
    }
  })
})

describe('reduction precedence properties', () => {
  it('checks all 2,304 preference/capability combinations without losing selected intent', () => {
    for (const environment of appearanceChoices.environment)
      for (const mode of appearanceChoices.mode)
        for (const material of appearanceChoices.material)
          for (const effects of appearanceChoices.effects)
            for (const motion of appearanceChoices.motion)
              for (let mask = 0; mask < 32; mask += 1) {
                const selected = Object.freeze({
                  version: 1 as const,
                  environment,
                  mode,
                  material,
                  effects,
                  motion,
                })
                const caps = Object.freeze({
                  dark: Boolean(mask & 1),
                  reducedMotion: Boolean(mask & 2),
                  reducedTransparency: Boolean(mask & 4),
                  forcedColors: Boolean(mask & 8),
                  backdropFilter: Boolean(mask & 16),
                })
                const result = resolveAppearance(selected, caps)
                const reducedEffects = effects === 'reduced' || caps.reducedTransparency || caps.forcedColors
                const reducedMotion = motion === 'reduced' || caps.reducedMotion || reducedEffects
                expect(result).toEqual({
                  environment,
                  palette: mode === 'system' ? (caps.dark ? 'dark' : 'light') : mode,
                  material: reducedEffects || !caps.backdropFilter ? 'solid' : material,
                  reducedEffects,
                  reducedMotion,
                  forcedColors: caps.forcedColors,
                  continuousAtmosphere: environment !== 'basic' && !reducedMotion,
                })
                expect(selected.material).toBe(material)
              }
  })
})
