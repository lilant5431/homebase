import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

function renderApp(media: string[] = []) {
  vi.stubGlobal('CSS', { supports: () => true, registerProperty: vi.fn() })
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: media.includes(query),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  return render(<App />)
}
beforeEach(() => vi.unstubAllGlobals())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})
async function reference(user: ReturnType<typeof userEvent.setup>, id: string) {
  const summary = screen.getByText('Sources & archived comparisons')
  if (!summary.parentElement?.hasAttribute('open')) await user.click(summary)
  await user.selectOptions(screen.getByLabelText('Technical comparison'), id)
}

describe('visual audition controls and isolation', () => {
  it('switches both themes and every effect using real controls', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    await user.click(screen.getByRole('button', { name: 'Daylight' }))
    expect(container.firstChild).toHaveAttribute('data-theme', 'day')
    await user.click(screen.getByRole('button', { name: 'Night Flight' }))
    expect(container.firstChild).toHaveAttribute('data-theme', 'night')
    for (const id of ['lattice', 'horizon', 'glass', 'beam', 'shimmer', 'baseline']) {
      await reference(user, id)
      expect(container.firstChild).toHaveAttribute('data-effect', id)
    }
  })
  it('presets change intensity and speed; manual tuning clears preset selection', async () => {
    const user = userEvent.setup()
    const { container } = renderApp(['(min-width: 1100px)'])
    await user.click(screen.getByRole('button', { name: 'Cinematic' }))
    expect(screen.getByRole('slider', { name: /Visual intensity/ })).toHaveValue('92')
    expect(screen.getByRole('slider', { name: /Animation speed/ })).toHaveValue('1.2')
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--intensity')).toBe('0.92')
    fireEvent.change(screen.getByRole('slider', { name: /Visual intensity/ }), { target: { value: '40' } })
    expect(screen.getByRole('button', { name: 'Cinematic' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.change(screen.getByRole('slider', { name: /Animation speed/ }), { target: { value: '0.5' } })
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--motion-duration')).toBe('36s')
  })
  it('pauses and resumes, and reset restores recommended tuning without changing theme or effect', async () => {
    const user = userEvent.setup()
    const { container } = renderApp(['(min-width: 1100px)'])
    await user.click(screen.getByRole('button', { name: 'Daylight' }))
    await reference(user, 'beam')
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(container.firstChild).toHaveAttribute('data-inactive', 'true')
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    expect(container.firstChild).toHaveAttribute('data-inactive', 'false')
    await user.click(screen.getByRole('button', { name: 'Cinematic' }))
    await user.click(screen.getByLabelText(/Reduce visual effects/))
    await user.click(screen.getByRole('button', { name: 'Reset recommended values' }))
    expect(screen.getByRole('slider', { name: /Visual intensity/ })).toHaveValue('65')
    expect(container.firstChild).toHaveAttribute('data-theme', 'day')
    expect(container.firstChild).toHaveAttribute('data-effect', 'beam')
    expect(container.firstChild).toHaveAttribute('data-reduced-effects', 'false')
  })
  it('manual reduced effects requests both opaque materials and stopped motion', async () => {
    const user = userEvent.setup()
    const { container } = renderApp(['(min-width: 1100px)'])
    await user.click(screen.getByLabelText(/Reduce visual effects/))
    expect(container.firstChild).toHaveAttribute('data-reduced-effects', 'true')
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true')
    expect(screen.getByRole('slider', { name: /Animation speed/ })).toBeDisabled()
    await user.click(screen.getByLabelText(/Reduce visual effects/))
    await user.click(screen.getByLabelText(/Reduce motion/))
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true')
    expect(container.firstChild).toHaveAttribute('data-reduced-effects', 'false')
  })
  it.each([
    '(prefers-reduced-motion: reduce)',
    '(prefers-reduced-transparency: reduce)',
    '(forced-colors: active)',
  ])('honors %s and reset cannot override it', async (query) => {
    const user = userEvent.setup()
    const { container } = renderApp(['(min-width: 1100px)', query])
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true')
    await user.click(screen.getByRole('button', { name: 'Reset recommended values' }))
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true')
  })
  it('compares library defaults only for licensed adaptations and disables irrelevant speed controls', async () => {
    const user = userEvent.setup()
    const { container } = renderApp(['(min-width: 1100px)'])
    await reference(user, 'integrated')
    expect(screen.getByLabelText(/Library defaults/)).toBeDisabled()
    await reference(user, 'lattice')
    await user.click(screen.getByLabelText(/Library defaults/))
    expect(container.firstChild).toHaveAttribute('data-candidate', 'true')
    expect(screen.getByRole('slider', { name: /Animation speed/ })).toBeDisabled()
    await reference(user, 'glass')
    expect(container.firstChild).toHaveAttribute('data-candidate', 'true')
    expect(screen.getByRole('slider', { name: /Animation speed/ })).toBeDisabled()
  })
  it('switches contextual compositions, inspects illustrative records, and plays a cue without claiming save', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Inspect The shape of a good argument' }))
    expect(screen.getByRole('complementary', { name: 'Illustrative record details' })).toHaveTextContent(
      'no editing or real planner state',
    )
    await user.click(screen.getByRole('button', { name: 'Close details' }))
    await user.click(screen.getByRole('button', { name: /Weekly Planner/ }))
    expect(screen.getByRole('heading', { name: 'A week with breathing room.' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Locked by you/ }))
    expect(screen.getByRole('complementary', { name: 'Illustrative record details' })).toHaveTextContent(
      'Read-only illustration',
    )
    await user.click(screen.getByRole('button', { name: 'Play light cue' }))
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(
      'does not save or schedule work',
    )
  })
  it('follows live OS changes and removes media listeners on unmount', () => {
    const listeners = new Set<() => void>()
    const media = {
      matches: false,
      addEventListener: (_: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    }
    vi.stubGlobal('matchMedia', (query: string) =>
      query === '(prefers-reduced-motion: reduce)'
        ? media
        : { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() },
    )
    const { container, unmount } = render(<App />)
    act(() => {
      media.matches = true
      listeners.forEach((listener) => listener())
    })
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'true')
    act(() => {
      media.matches = false
      listeners.forEach((listener) => listener())
    })
    expect(container.firstChild).toHaveAttribute('data-reduced-motion', 'false')
    unmount()
    expect(listeners.size).toBe(0)
  })
  it('renders and responds without matchMedia, CSS support APIs, or browser storage', async () => {
    vi.stubGlobal('matchMedia', undefined)
    vi.stubGlobal('CSS', undefined)
    const storage = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('No storage permitted')
    })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('No storage permitted')
    })
    try {
      render(<App />)
      await userEvent.setup().click(screen.getByRole('button', { name: 'Daylight' }))
      expect(storage).not.toHaveBeenCalled()
      expect(write).not.toHaveBeenCalled()
    } finally {
      storage.mockRestore()
      write.mockRestore()
    }
  })
})
