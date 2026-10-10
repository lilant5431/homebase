import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

beforeEach(() => {
  vi.stubGlobal('CSS', { supports: () => true, registerProperty: vi.fn() })
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})
afterEach(() => vi.unstubAllGlobals())
function environment(value: string) {
  fireEvent.change(screen.getByLabelText('Environment'), { target: { value } })
}

describe('independent appearance dimensions', () => {
  it.each(
    ['lattice', 'landscape', 'basic'].flatMap((environment) =>
      ['light', 'dark'].map((mode) => ({ environment, mode })),
    ),
  )('renders $environment / $mode with the same functional composition', ({ environment: value, mode }) => {
    const { container } = render(<App />)
    environment(value)
    fireEvent.click(screen.getByRole('button', { name: mode === 'light' ? 'Light' : 'Dark' }))
    expect(container.firstChild).toHaveAttribute('data-environment', value)
    expect(container.firstChild).toHaveAttribute('data-mode', mode)
    expect((container.firstChild as HTMLElement).style.colorScheme).toBe(mode)
    expect(screen.getByRole('heading', { name: 'Make room for what matters.' })).toBeVisible()
    expect(container.querySelectorAll('.content-card')).toHaveLength(2)
    expect(container.querySelectorAll('.landscape-scene')).toHaveLength(value === 'landscape' ? 1 : 0)
  })
  it('environment and palette changes preserve the other dimension, tuning and view', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cinematic' }))
    fireEvent.click(screen.getByRole('button', { name: /Weekly Planner/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    for (const value of ['landscape', 'basic', 'lattice']) {
      environment(value)
      expect(container.firstChild).toHaveAttribute('data-mode', 'dark')
      expect(container.firstChild).toHaveAttribute('data-inactive', 'true')
    }
    environment('landscape')
    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(container.firstChild).toHaveAttribute('data-environment', 'landscape')
    expect(screen.getByRole('button', { name: 'Cinematic' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'A week with breathing room.' })).toBeVisible()
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--motion-duration')).toBe('15s')
  })
  it('System follows live OS appearance; explicit palette ignores it; listener is removed', () => {
    const listeners = new Set<() => void>()
    const media = {
      matches: true,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }
    vi.stubGlobal('matchMedia', (query: string) =>
      query === '(prefers-color-scheme: dark)'
        ? media
        : { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    )
    const { container, unmount } = render(<App />)
    environment('landscape')
    expect(container.firstChild).toHaveAttribute('data-preference', 'system')
    expect(container.firstChild).toHaveAttribute('data-mode', 'dark')
    act(() => {
      media.matches = false
      listeners.forEach((fn) => fn())
    })
    expect(container.firstChild).toHaveAttribute('data-mode', 'light')
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    act(() => {
      media.matches = true
      listeners.forEach((fn) => fn())
      media.matches = false
      listeners.forEach((fn) => fn())
    })
    expect(container.firstChild).toHaveAttribute('data-mode', 'dark')
    expect(container.firstChild).toHaveAttribute('data-environment', 'landscape')
    fireEvent.click(screen.getByRole('button', { name: 'System' }))
    expect(container.firstChild).toHaveAttribute('data-mode', 'light')
    unmount()
    expect(listeners.size).toBe(0)
  })
  it('keeps identical landscape paths in light/dark, with bounded stars and a water cue', () => {
    const { container } = render(<App />)
    environment('landscape')
    const paths = () =>
      Array.from(container.querySelectorAll('.landscape-scene path'), (p) => p.getAttribute('d'))
    const light = paths()
    expect(container.querySelectorAll('.landscape-stars circle')).toHaveLength(20)
    expect(container.querySelector('[data-cue-target="water"]')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(paths()).toEqual(light)
  })
  it('Basic deliberately disables ambient movement without turning off shared controls', () => {
    const { container } = render(<App />)
    environment('basic')
    expect(container.querySelector('.preview-stage')).toHaveAttribute('data-light-motion', 'false')
    expect(screen.getByRole('slider', { name: /Animation speed/ })).toBeDisabled()
    expect(container.firstChild).toHaveAttribute('data-reduced-effects', 'false')
    expect(screen.getByRole('button', { name: 'Play light cue' })).toBeEnabled()
    expect(container.querySelectorAll('.magic-glass')).toHaveLength(3)
  })
})

describe('full-page sketch and archived landscape', () => {
  it('places the sketch in the whole decorative atmosphere, not the content banner', () => {
    const { container } = render(<App />)
    environment('landscape')
    const sketch = screen.getByTestId('full-page-landscape')
    expect(sketch.parentElement).toHaveClass('atmosphere')
    expect(container.querySelector('.environment-band .landscape-scene')).toBeNull()
    expect(sketch.querySelectorAll('.sketch-range')).toHaveLength(3)
    expect(sketch.querySelectorAll('.landscape-stars circle')).toHaveLength(20)
    expect(sketch.querySelectorAll('.sketch-water')).toHaveLength(1)
    expect(sketch.querySelectorAll('[data-cue-target]')).toHaveLength(2)
  })
  it.each(['Light', 'Dark'])(
    'retains V3 as an explicit %s comparison and returns without resetting tuning',
    (mode) => {
      const { container } = render(<App />)
      environment('landscape')
      fireEvent.click(screen.getByRole('button', { name: mode }))
      fireEvent.click(screen.getByRole('button', { name: 'Cinematic' }))
      fireEvent.click(screen.getByRole('button', { name: /Weekly Planner/ }))
      fireEvent.change(screen.getByLabelText('Technical comparison'), {
        target: { value: 'landscape-legacy' },
      })
      expect(container.firstChild).toHaveAttribute('data-effect', 'landscape-legacy')
      expect(container.firstChild).toHaveAttribute('data-coordinated', 'true')
      expect(container.querySelector('.environment-band .landscape-legacy')).not.toBeNull()
      expect(screen.queryByTestId('full-page-landscape')).toBeNull()
      expect(screen.getByLabelText(/Library defaults/)).toBeDisabled()
      expect(screen.getByRole('heading', { name: 'V3 Landscape band' })).toBeVisible()
      fireEvent.change(screen.getByLabelText('Technical comparison'), { target: { value: 'integrated' } })
      expect(screen.getByTestId('full-page-landscape')).toBeVisible()
      expect(container.firstChild).toHaveAttribute('data-mode', mode.toLowerCase())
      expect(screen.getByRole('slider', { name: /Visual intensity/ })).toHaveValue('92')
      expect(screen.getByRole('heading', { name: 'A week with breathing room.' })).toBeVisible()
    },
  )
})
