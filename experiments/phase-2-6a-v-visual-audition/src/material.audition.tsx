import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  vi.stubGlobal('CSS', { supports: () => true, registerProperty: vi.fn() })
})
afterEach(() => vi.unstubAllGlobals())

describe('shared gallery-only content material', () => {
  it('starts opaque and offers exactly three materials', () => {
    const { container } = render(<App />)
    expect(container.firstChild).toHaveAttribute('data-effective-material', 'solid')
    expect(screen.getByLabelText('Content material').querySelectorAll('option')).toHaveLength(3)
  })
  it.each(['solid', 'frosted', 'clearer'])(
    'retains %s across all six appearances and composition/tuning changes',
    (material) => {
      const { container } = render(<App />)
      fireEvent.change(screen.getByLabelText('Content material'), { target: { value: material } })
      for (const environment of ['lattice', 'landscape', 'basic']) {
        fireEvent.change(screen.getByLabelText('Environment'), { target: { value: environment } })
        for (const mode of ['Light', 'Dark']) {
          fireEvent.click(screen.getByRole('button', { name: mode }))
          expect(container.firstChild).toHaveAttribute('data-content-material', material)
          expect(container.firstChild).toHaveAttribute('data-effective-material', material)
        }
      }
      fireEvent.click(screen.getByRole('button', { name: /Weekly Planner/ }))
      fireEvent.click(screen.getByRole('button', { name: 'Cinematic' }))
      fireEvent.click(screen.getByRole('button', { name: 'Reset recommended values' }))
      expect(container.firstChild).toHaveAttribute('data-effective-material', material)
      expect(screen.getByRole('heading', { name: 'A week with breathing room.' })).toBeVisible()
    },
  )
  it.each(['frosted', 'clearer'])(
    'temporarily overrides %s when effects are reduced, then restores it',
    (material) => {
      const { container } = render(<App />)
      fireEvent.change(screen.getByLabelText('Content material'), { target: { value: material } })
      fireEvent.click(screen.getByLabelText(/Reduce visual effects/))
      expect(container.firstChild).toHaveAttribute('data-content-material', material)
      expect(container.firstChild).toHaveAttribute('data-effective-material', 'solid')
      expect(screen.getByText(/Your selection is retained/)).toBeVisible()
      fireEvent.click(screen.getByLabelText(/Reduce visual effects/))
      expect(container.firstChild).toHaveAttribute('data-effective-material', material)
    },
  )
  it('retains the preference but uses opaque fallback without backdrop support', () => {
    vi.stubGlobal('CSS', { supports: () => false })
    const { container } = render(<App />)
    fireEvent.change(screen.getByLabelText('Content material'), { target: { value: 'clearer' } })
    expect(container.firstChild).toHaveAttribute('data-content-material', 'clearer')
    expect(container.firstChild).toHaveAttribute('data-effective-material', 'solid')
    expect(screen.getByText(/Your selection is retained/)).toBeVisible()
  })
  it('names only the dark Lattice appearance Moonlit without adding an environment', () => {
    render(<App />)
    expect(screen.getByLabelText('Environment').querySelectorAll('option')).toHaveLength(3)
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(screen.getByRole('heading', { name: 'Moonlit Lattice — Dark' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(screen.getByRole('heading', { name: 'Sunlit Lattice — Light' })).toBeVisible()
  })
})
