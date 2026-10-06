import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { demoData, emptyData } from './domain'
import { loadData, saveData } from './storage'

describe('sample-data initialization', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('offers and loads sample data for a completely empty planner', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Explore with sample data' }))

    const saved = loadData()
    expect(saved.classes).toHaveLength(3)
    expect(saved.assignments).toHaveLength(4)
    expect(saved.assessments).toHaveLength(1)
    expect(saved.commitments).toHaveLength(1)
    expect(screen.queryByRole('button', { name: 'Explore with sample data' })).toBeNull()
  })

  it.each(['classes', 'assignments', 'assessments', 'commitments'] as const)(
    'hides sample initialization and preserves a planner containing only %s',
    (collection) => {
      const sample = demoData('2026-10-04')
      const existing = { ...emptyData(), [collection]: sample[collection].slice(0, 1) }
      saveData(existing)
      render(<App />)

      expect(screen.queryByRole('button', { name: 'Explore with sample data' })).toBeNull()
      expect(loadData()).toEqual(existing)
    },
  )
})
