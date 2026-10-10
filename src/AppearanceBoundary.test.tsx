import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useEffect, useLayoutEffect, useRef } from 'react'
import AppearanceBoundary, { APPEARANCE_SAVE_WARNING, useAppearance } from './AppearanceBoundary'
import AppearanceSettings from './AppearanceSettings'
import { initializeAppearance, browserCapabilities } from './appearanceBrowser'
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, resolveAppearance } from './appearance'
import { clearAppearanceBootstrap, mockAppearanceBrowser, storageAppearance } from './testFixtures/appearance'
import App from './App'
import { demoData } from './domain'
import { saveData } from './storage'
import { useAcademicPlanner } from './useAcademicPlanner'

beforeEach(() => {
  localStorage.clear()
  clearAppearanceBootstrap()
  mockAppearanceBrowser()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  clearAppearanceBootstrap()
})
function settings() {
  render(
    <AppearanceBoundary>
      <AppearanceSettings />
    </AppearanceBoundary>,
  )
  fireEvent.click(screen.getByText('Appearance'))
}
function select(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}
describe('bootstrap/runtime parity and preferences', () => {
  it.each(['light', 'dark'] as const)('adopts persisted %s opposite the OS before children mount', (mode) => {
    mockAppearanceBrowser({ dark: mode === 'light' })
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, mode, material: 'frosted' }))
    const initial = initializeAppearance(window, document.documentElement)
    const seen: string[] = []
    function Child() {
      seen.push(document.documentElement.dataset.palette!)
      expect(useAppearance()?.effective).toEqual(initial.effective)
      return null
    }
    render(
      <AppearanceBoundary>
        <Child />
      </AppearanceBoundary>,
    )
    expect(seen.every((value) => value === mode)).toBe(true)
    expect(initial.effective).toEqual(resolveAppearance(initial.selected, browserCapabilities(window)))
    expect(document.documentElement.style.colorScheme).toBe(mode)
  })
  it('reconciles Dark saved after the Light bootstrap and before listener installation', () => {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, mode: 'light' }))
    initializeAppearance(window, document.documentElement)
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, mode: 'dark' }))
    // The storage event is delivered before React subscribes, as while its module is loading.
    storageAppearance(localStorage.getItem(APPEARANCE_KEY))
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    settings()
    expect(document.documentElement.dataset.palette).toBe('dark')
    expect(screen.getByLabelText('Palette')).toHaveProperty('value', 'dark')
    expect(writes).not.toHaveBeenCalled()
  })
  it('reads only appearance once after bootstrap without overwriting future data during mount', () => {
    localStorage.setItem(APPEARANCE_KEY, '{"version":9,"mode":"dark"}')
    initializeAppearance(window, document.documentElement)
    const reads = vi.spyOn(Storage.prototype, 'getItem'),
      writes = vi.spyOn(Storage.prototype, 'setItem')
    settings()
    expect(reads.mock.calls).toEqual([[APPEARANCE_KEY]])
    expect(writes).not.toHaveBeenCalled()
    expect(document.documentElement.dataset.palette).toBe('light')
  })
  it.each(['{', '{"version":2,"mode":"light"}'])(
    'retains bootstrap choice for invalid gap data %s',
    (raw) => {
      localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, mode: 'dark' }))
      initializeAppearance(window, document.documentElement)
      localStorage.setItem(APPEARANCE_KEY, raw)
      const writes = vi.spyOn(Storage.prototype, 'setItem')
      settings()
      expect(document.documentElement.dataset.palette).toBe('dark')
      expect(localStorage.getItem(APPEARANCE_KEY)).toBe(raw)
      expect(writes).not.toHaveBeenCalled()
    },
  )
  it('reconciles key removal during the initialization gap without writing', () => {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, mode: 'dark' }))
    initializeAppearance(window, document.documentElement)
    localStorage.removeItem(APPEARANCE_KEY)
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    settings()
    expect(document.documentElement.dataset.palette).toBe('light')
    expect(writes).not.toHaveBeenCalled()
  })
  it('retains the bootstrap choice when the reconciliation read is blocked', () => {
    localStorage.setItem(APPEARANCE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, mode: 'dark' }))
    initializeAppearance(window, document.documentElement)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    settings()
    expect(document.documentElement.dataset.palette).toBe('dark')
  })
  it.each([false, true])('does not replace an early tab-only choice, StrictMode=%s', (strict) => {
    initializeAppearance(window, document.documentElement)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const reads = vi.spyOn(Storage.prototype, 'getItem')
    function EarlyChoice() {
      const initialChange = useRef(useAppearance()!.change)
      useLayoutEffect(() => {
        initialChange.current({ mode: 'dark' })
      }, [])
      return <AppearanceSettings />
    }
    const content = (
      <AppearanceBoundary>
        <EarlyChoice />
      </AppearanceBoundary>
    )
    render(strict ? <StrictMode>{content}</StrictMode> : content)
    expect(document.documentElement.dataset.palette).toBe('dark')
    expect(screen.getByRole('alert').textContent).toBe(APPEARANCE_SAVE_WARNING)
    expect(reads).not.toHaveBeenCalled()
  })
  it('a newer local selection wins over a stale reconciliation result', () => {
    initializeAppearance(window, document.documentElement)
    let choose: ReturnType<typeof useAppearance>
    function Child() {
      choose = useAppearance()
      return <AppearanceSettings />
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      choose!.change({ mode: 'dark' })
      return JSON.stringify({ ...DEFAULT_APPEARANCE, mode: 'light' })
    })
    render(
      <AppearanceBoundary>
        <Child />
      </AppearanceBoundary>,
    )
    expect(document.documentElement.dataset.palette).toBe('dark')
  })
  it('reconciles only once across StrictMode subscription replay', () => {
    initializeAppearance(window, document.documentElement)
    const reads = vi.spyOn(Storage.prototype, 'getItem')
    render(
      <StrictMode>
        <AppearanceBoundary>
          <AppearanceSettings />
        </AppearanceBoundary>
      </StrictMode>,
    )
    expect(reads.mock.calls).toEqual([[APPEARANCE_KEY]])
  })
  it('applies all real controls and reset; only appearance writes', () => {
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    settings()
    select('Environment', 'landscape')
    select('Palette', 'dark')
    select('Content material', 'frosted')
    select('Visual effects', 'reduced')
    select('Motion', 'reduced')
    expect(document.documentElement.dataset).toMatchObject({
      environment: 'landscape',
      palette: 'dark',
      selectedMaterial: 'frosted',
      material: 'solid',
      effects: 'reduced',
      motion: 'reduced',
    })
    expect(screen.getByRole('status').textContent).toContain('Frosted is selected')
    fireEvent.click(screen.getByRole('button', { name: 'Reset appearance' }))
    expect(JSON.parse(localStorage.getItem(APPEARANCE_KEY)!)).toEqual(DEFAULT_APPEARANCE)
    expect(writes.mock.calls.every(([key]) => key === APPEARANCE_KEY)).toBe(true)
  })
  it('applies tab-only choices and accessible truthful warning after write failure', () => {
    settings()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    select('Palette', 'dark')
    expect(document.documentElement.dataset.palette).toBe('dark')
    expect(screen.getByRole('alert').textContent).toBe(APPEARANCE_SAVE_WARNING)
    expect(screen.queryByText(/could not save changes/)).toBeNull()
  })
  it('survives a blocked localStorage getter', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('denied')
    })
    settings()
    select('Palette', 'dark')
    expect(screen.getByRole('alert').textContent).toBe(APPEARANCE_SAVE_WARNING)
  })
  it('follows live OS palette and reductions, then restores selected Frosted', () => {
    const os = mockAppearanceBrowser()
    settings()
    select('Content material', 'frosted')
    act(() => os.update('dark', true))
    expect(document.documentElement.dataset.palette).toBe('dark')
    act(() => os.update('reducedTransparency', true))
    expect(document.documentElement.dataset.material).toBe('solid')
    expect(document.documentElement.dataset.motion).toBe('reduced')
    act(() => os.update('reducedTransparency', false))
    expect(document.documentElement.dataset.material).toBe('frosted')
    select('Palette', 'light')
    act(() => os.update('dark', true))
    expect(document.documentElement.dataset.palette).toBe('light')
  })
  it('supports missing browser APIs with Light/opaque fallback', () => {
    vi.stubGlobal('matchMedia', undefined)
    vi.stubGlobal('CSS', undefined)
    settings()
    select('Content material', 'frosted')
    expect(document.documentElement.dataset).toMatchObject({
      palette: 'light',
      material: 'solid',
      selectedMaterial: 'frosted',
    })
  })
  it('cleans up live listeners on unmount', () => {
    const os = mockAppearanceBrowser()
    const listener = vi.spyOn(window, 'removeEventListener')
    const mounted = render(
      <AppearanceBoundary>
        <AppearanceSettings />
      </AppearanceBoundary>,
    )
    expect(os.listenerCount()).toBe(4)
    mounted.unmount()
    expect(os.listenerCount()).toBe(0)
    expect(listener).toHaveBeenCalledWith('storage', expect.any(Function))
  })
  it('restores defaults for a same-origin storage clear and does not write back', () => {
    settings()
    act(() => storageAppearance('{"version":1,"mode":"dark"}'))
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: null, newValue: null, storageArea: localStorage }),
      )
    })
    expect(document.documentElement.dataset.palette).toBe('light')
    expect(writes).not.toHaveBeenCalled()
  })
  it('StrictMode cleanup leaves one subscription per query', () => {
    const os = mockAppearanceBrowser()
    const mounted = render(
      <StrictMode>
        <AppearanceBoundary>
          <AppearanceSettings />
        </AppearanceBoundary>
      </StrictMode>,
    )
    expect(os.listenerCount()).toBe(4)
    mounted.unmount()
    expect(os.listenerCount()).toBe(0)
  })
  it('synchronizes valid events, ignores bad versions/data/other keys/session area, and handles removal', () => {
    settings()
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    act(() => storageAppearance('{"version":1,"mode":"dark"}'))
    expect(document.documentElement.dataset.palette).toBe('dark')
    for (const value of ['{', '[]', '{"version":2,"mode":"light"}']) act(() => storageAppearance(value))
    act(() => storageAppearance('{"version":1,"mode":"light"}', 'homebase.academic.v1'))
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: APPEARANCE_KEY,
          newValue: '{"version":1,"mode":"light"}',
          storageArea: sessionStorage,
        }),
      )
    })
    expect(document.documentElement.dataset.palette).toBe('dark')
    act(() => storageAppearance(null))
    expect(document.documentElement.dataset.palette).toBe('light')
    expect(writes).not.toHaveBeenCalled()
  })
})
describe('academic/editor/planner isolation', () => {
  it('keeps the actual active editor node and unsaved draft across OS/cross-tab transitions', () => {
    const os = mockAppearanceBrowser()
    saveData(demoData())
    const source = localStorage.getItem('homebase.academic.v1')
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    render(
      <AppearanceBoundary>
        <App />
      </AppearanceBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'New assignment' }))
    const title = screen.getByLabelText('Title')
    fireEvent.change(title, { target: { value: 'Unsaved appearance draft' } })
    act(() => os.update('dark', true))
    act(() => storageAppearance('{"version":1,"environment":"basic","material":"frosted"}'))
    expect(screen.getByLabelText('Title')).toBe(title)
    expect((title as HTMLInputElement).value).toBe('Unsaved appearance draft')
    expect(localStorage.getItem('homebase.academic.v1')).toBe(source)
    expect(writes).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })
  it('preserves planner source/plan/reference identity and mounts across every selection', () => {
    const sample = demoData('2026-10-12')
    const academic = {
      ...sample,
      commitments: [],
      assignments: [
        {
          ...sample.assignments[0],
          dueDate: '2026-10-13',
          dueTime: '18:00',
          estimatedMinutes: 60,
          completed: false,
        },
      ],
    }
    saveData(academic)
    localStorage.setItem(
      'homebase.schedule.v1',
      JSON.stringify({
        version: 1,
        planningWindows: [{ id: 'w', date: '2026-10-12', startTime: '16:00', endTime: '18:00' }],
        lockedBlocks: [],
      }),
    )
    const reference = { date: '2026-10-12', time: '15:00' }
    const observations: ReturnType<typeof useAcademicPlanner>[] = []
    let mounts = 0
    function Witness() {
      useAppearance()
      const planner = useAcademicPlanner(academic, reference)
      observations.push(planner)
      useEffect(() => {
        mounts += 1
      }, [])
      return null
    }
    const bytes = ['homebase.academic.v1', 'homebase.schedule.v1'].map((key) => localStorage.getItem(key))
    const writes = vi.spyOn(Storage.prototype, 'setItem')
    render(
      <AppearanceBoundary>
        <AppearanceSettings />
        <Witness />
      </AppearanceBoundary>,
    )
    fireEvent.click(screen.getByText('Appearance'))
    select('Environment', 'basic')
    select('Palette', 'dark')
    select('Content material', 'frosted')
    select('Motion', 'reduced')
    select('Visual effects', 'reduced')
    expect(observations.length).toBeGreaterThan(1)
    const initialPlan = observations[0].plan
    expect(initialPlan?.status === 'ok' && initialPlan.scheduledBlocks.length > 0).toBe(true)
    for (const planner of observations) {
      expect(planner.reference).toBe(observations[0].reference)
      expect(planner.scheduleLoad).toBe(observations[0].scheduleLoad)
      expect(planner.plan).toBe(observations[0].plan)
    }
    expect(mounts).toBe(1)
    expect(['homebase.academic.v1', 'homebase.schedule.v1'].map((key) => localStorage.getItem(key))).toEqual(
      bytes,
    )
    expect(writes.mock.calls.every(([key]) => key === APPEARANCE_KEY)).toBe(true)
  })
})
