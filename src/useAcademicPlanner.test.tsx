import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAcademicPlanner } from './useAcademicPlanner'
import { emptyData } from './domain'
import { emptyScheduleData } from './scheduleData'
import * as storage from './scheduleStorage'

const reference = { date: '2026-10-06', time: '16:00' }
const window = { id: 'opaque', date: reference.date, startTime: '17:00', endTime: '18:00' }
beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it.each(['invalid', 'unsupportedVersion', 'unavailable'] as const)(
  'direct edit attempts cannot save after %s initialization',
  (status) => {
    if (status === 'invalid') localStorage.setItem(storage.SCHEDULE_STORAGE_KEY, 'corrupt')
    if (status === 'unsupportedVersion')
      localStorage.setItem(storage.SCHEDULE_STORAGE_KEY, JSON.stringify({ version: 2 }))
    if (status === 'unavailable')
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Denied')
      })
    const save = vi.spyOn(storage, 'saveScheduleData')
    const { result } = renderHook(() => useAcademicPlanner(emptyData(), reference))
    expect(result.current.scheduleLoad.status).toBe(status)
    act(() => {
      expect(result.current.changeWindow(window)).toBe(false)
    })
    expect(save).not.toHaveBeenCalled()
    expect(result.current.reference).toEqual(reference)
  },
)

it('save observes old state and reference; adoption happens only after a true result', () => {
  const { result } = renderHook(() => useAcademicPlanner(emptyData(), reference))
  const save = vi.spyOn(storage, 'saveScheduleData').mockImplementation(() => {
    expect(result.current.scheduleLoad).toEqual({ status: 'empty', data: emptyScheduleData() })
    expect(result.current.reference).toEqual(reference)
    return true
  })
  act(() => {
    expect(result.current.changeWindow(window)).toBe(true)
  })
  expect(save).toHaveBeenCalledOnce()
  expect(result.current.scheduleLoad).toEqual({
    status: 'ok',
    data: { ...emptyScheduleData(), planningWindows: [window] },
  })
})

it('a structural save RangeError is surfaced without replacing source state or reference', () => {
  const { result } = renderHook(() => useAcademicPlanner(emptyData(), reference))
  act(() => {
    expect(result.current.changeWindow({ ...window, endTime: '16:00' })).toBe(false)
  })
  expect(result.current.scheduleLoad).toEqual({ status: 'empty', data: emptyScheduleData() })
  expect(result.current.reference).toEqual(reference)
  expect(result.current.saveError).toContain('Check its date and times')
  expect(localStorage.getItem(storage.SCHEDULE_STORAGE_KEY)).toBeNull()
})
