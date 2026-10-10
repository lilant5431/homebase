import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

const original = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
let animations: { cancel: ReturnType<typeof vi.fn> }[]
beforeEach(() => {
  animations = []
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.stubGlobal('CSS', { supports: () => true, registerProperty: vi.fn() })
  Object.defineProperty(Element.prototype, 'animate', {
    configurable: true,
    value: vi.fn(() => {
      const animation = { cancel: vi.fn() }
      animations.push(animation)
      return animation
    }),
  })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  if (original) Object.defineProperty(Element.prototype, 'animate', original)
  else Reflect.deleteProperty(Element.prototype, 'animate')
})

describe('bounded coordinated lighting cue', () => {
  it('reuses five fixed surfaces and one timer on repeated taps, then finishes', () => {
    const { container } = render(<App />)
    const targets = container.querySelectorAll('[data-cue-target]').length
    expect(targets).toBe(5)
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    expect(container.firstChild).toHaveAttribute('data-cue-active', 'true')
    expect(animations).toHaveLength(5)
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    expect(animations.slice(0, 5).every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    expect(container.querySelectorAll('[data-cue-target]')).toHaveLength(targets)
    expect(vi.getTimerCount()).toBe(1)
    act(() => {
      vi.advanceTimersByTime(1180)
    })
    expect(container.firstChild).toHaveAttribute('data-cue-active', 'false')
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it.each(['pause', 'motion', 'effects', 'theme', 'environment'])(
    'cancels an in-flight cue on %s',
    (action) => {
      const { container } = render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
      if (action === 'pause') fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
      if (action === 'motion') fireEvent.click(screen.getByLabelText(/Reduce motion/))
      if (action === 'effects') fireEvent.click(screen.getByLabelText(/Reduce visual effects/))
      if (action === 'theme') fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
      if (action === 'environment')
        fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'landscape' } })
      expect(container.firstChild).toHaveAttribute('data-cue-active', 'false')
      expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    },
  )
  it('coordinates landscape sky and water without accumulating cue work', () => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'landscape' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    expect(container.querySelectorAll('[data-cue-target]')).toHaveLength(7)
    expect(animations).toHaveLength(7)
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    expect(animations.slice(0, 7).every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('pulses scene targets in place and sweeps only locally clipped chrome', () => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'landscape' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    const animate = vi.mocked(Element.prototype.animate)
    const targets = [...container.querySelectorAll<HTMLElement>('[data-cue-target]')]
    expect(animate).toHaveBeenCalledTimes(7)
    targets.forEach((target, index) => {
      const frames = animate.mock.calls[index][0] as Keyframe[]
      if (['environment', 'sky', 'water'].includes(target.dataset.cueTarget!)) {
        expect(frames.every((frame) => frame.transform === undefined)).toBe(true)
        expect(frames[1].opacity).toBe(0.65)
      } else expect(frames[0].transform).toBe('translateX(-35%)')
    })
  })
  it('cancels a sketch cue when changing to the V3 reference without silently replaying', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'landscape' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    fireEvent.change(screen.getByLabelText('Technical comparison'), { target: { value: 'landscape-legacy' } })
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    expect(animations).toHaveLength(7)
  })
  it.each(['solid', 'frosted'])('keeps an in-flight cue and navigation under %s material', (material) => {
    const { container } = render(<App />)
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'landscape' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    fireEvent.change(screen.getByLabelText('Content material'), { target: { value: material } })
    fireEvent.click(screen.getByRole('button', { name: /Weekly Planner/ }))
    expect(container.firstChild).toHaveAttribute('data-cue-active', 'true')
    expect(animations).toHaveLength(7)
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 0)).toBe(true)
    expect(vi.getTimerCount()).toBe(1)
  })
  it('uses static confirmation when reduced and does not replay on restoration', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByLabelText(/Reduce motion/))
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    expect(animations).toHaveLength(0)
    expect(screen.getByText(/Light cue confirmed/)).toHaveTextContent('does not save or schedule work')
    fireEvent.click(screen.getByLabelText(/Reduce motion/))
    expect(animations).toHaveLength(0)
    expect(container.firstChild).toHaveAttribute('data-cue-active', 'false')
  })
  it('cancels work and removes its timer on unmount', () => {
    const { unmount } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    unmount()
    expect(animations.every((animation) => animation.cancel.mock.calls.length === 1)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('falls back to static confirmation when the animation API is unavailable', () => {
    Reflect.deleteProperty(Element.prototype, 'animate')
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Play light cue' }))
    expect(animations).toHaveLength(0)
    expect(screen.getByText(/Light cue confirmed/)).toBeVisible()
  })
  it('switches integrated scenes without resetting preset, speed, reductions, or composition', () => {
    const { container } = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Cinematic' }))
    fireEvent.click(screen.getByRole('button', { name: /Weekly Planner/ }))
    fireEvent.click(screen.getByLabelText(/Reduce motion/))
    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(container.firstChild).toHaveAttribute('data-effect', 'lattice')
    expect(screen.getByRole('button', { name: 'Cinematic' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText(/Reduce motion/)).toBeChecked()
    expect(screen.getByRole('heading', { name: 'A week with breathing room.' })).toBeVisible()
    fireEvent.change(screen.getByLabelText('Environment'), { target: { value: 'landscape' } })
    expect(container.firstChild).toHaveAttribute('data-effect', 'landscape')
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--shimmer-duration')).toBe('5s')
  })
})
