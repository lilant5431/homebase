import { beforeEach, afterEach, it, expect, vi } from 'vitest'
import { initializeAppearance, browserCapabilities } from './appearanceBrowser'
import { DEFAULT_APPEARANCE, APPEARANCE_KEY } from './appearance'
import { clearAppearanceBootstrap, mockAppearanceBrowser } from './testFixtures/appearance'
import tokens from '../docs/design/phase-2-6/tokens.json'
import css from './styles/tokens.css?raw'

beforeEach(() => {
  localStorage.clear()
  clearAppearanceBootstrap()
  mockAppearanceBrowser()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  clearAppearanceBootstrap()
})
it('detects prefixed blur as well as standard blur', () => {
  vi.stubGlobal('CSS', { supports: (property: string) => property === '-webkit-backdrop-filter' })
  expect(browserCapabilities(window).backdropFilter).toBe(true)
})
it('uses safe defaults when browser capability getters throw', () => {
  vi.stubGlobal('matchMedia', () => {
    throw new Error('unavailable')
  })
  vi.stubGlobal('CSS', {
    supports() {
      throw new Error('unavailable')
    },
  })
  expect(browserCapabilities(window)).toEqual({
    dark: false,
    reducedMotion: false,
    reducedTransparency: false,
    forcedColors: false,
    backdropFilter: false,
  })
})
it('initialization is appearance-only and preserves corrupt bytes', () => {
  localStorage.setItem(APPEARANCE_KEY, 'corrupt')
  const reads = vi.spyOn(Storage.prototype, 'getItem'),
    writes = vi.spyOn(Storage.prototype, 'setItem')
  initializeAppearance(window, document.documentElement)
  expect(reads).toHaveBeenCalledExactlyOnceWith(APPEARANCE_KEY)
  expect(writes).not.toHaveBeenCalled()
  expect(window.__homebaseAppearance?.selected).toEqual(DEFAULT_APPEARANCE)
})
it('matches approved choices and defaults exactly', () => {
  expect(DEFAULT_APPEARANCE).toEqual(tokens.appearancePreference.defaults)
})
it.each(['light', 'dark'] as const)('CSS preserves every approved %s semantic color', (palette) => {
  const source = tokens.themes[palette === 'light' ? 'daylight' : 'night']
  const block =
    palette === 'light' ? css.split('}')[0] : css.split(":root[data-palette='dark']")[1].split('}')[0]
  for (const [role, value] of Object.entries(source)) {
    if (Array.isArray(value))
      value.forEach((color, index) =>
        expect(block).toContain(`--hb-subject-${index + 1}: ${color.toLowerCase()};`),
      )
    else
      expect(block).toContain(
        `--hb-${role.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value.toLowerCase()};`,
      )
  }
})
