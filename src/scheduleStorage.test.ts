import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emptyScheduleData } from './scheduleData'
import { loadScheduleData, saveScheduleData, SCHEDULE_STORAGE_KEY } from './scheduleStorage'
import { scheduleFixture } from './testFixtures/schedule'

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('isolated non-destructive schedule storage', () => {
  it('uses the exact independent key and returns a fresh empty state for absence', () => {
    expect(SCHEDULE_STORAGE_KEY).toBe('homebase.schedule.v1')
    const a = loadScheduleData(),
      b = loadScheduleData()
    expect(a).toEqual({ status: 'empty', data: emptyScheduleData() })
    if (a.status !== 'empty' || b.status !== 'empty') throw new Error('Expected empty')
    expect(a.data.planningWindows).not.toBe(b.data.planningWindows)
  })
  it('round-trips user records without touching academic bytes or other keys', () => {
    localStorage.setItem('homebase.academic.v1', 'academic sentinel bytes')
    const data = scheduleFixture(),
      before = JSON.stringify(data)
    const set = vi.spyOn(Storage.prototype, 'setItem')
    expect(saveScheduleData(data)).toBe(true)
    expect(set).toHaveBeenCalledExactlyOnceWith(SCHEDULE_STORAGE_KEY, before)
    expect(loadScheduleData()).toEqual({ status: 'ok', data })
    expect(localStorage.getItem('homebase.academic.v1')).toBe('academic sentinel bytes')
    expect(JSON.stringify(data)).toBe(before)
  })
  it.each(['', '{oops', 'null', '[]', '{}', '{"version":1,"planningWindows":[null],"lockedBlocks":[]}'])(
    'preserves corrupt JSON/schema %j',
    (raw) => {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, raw)
      localStorage.setItem('homebase.academic.v1', 'sentinel')
      const set = vi.spyOn(Storage.prototype, 'setItem'),
        remove = vi.spyOn(Storage.prototype, 'removeItem')
      expect(loadScheduleData()).toEqual({ status: 'invalid' })
      expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(raw)
      expect(localStorage.getItem('homebase.academic.v1')).toBe('sentinel')
      expect(set).not.toHaveBeenCalled()
      expect(remove).not.toHaveBeenCalled()
    },
  )
  it('preserves unsupported version without rewriting or migrating', () => {
    const raw = JSON.stringify({ version: 2, future: 'unknown source data' })
    localStorage.setItem(SCHEDULE_STORAGE_KEY, raw)
    const set = vi.spyOn(Storage.prototype, 'setItem')
    expect(loadScheduleData()).toEqual({ status: 'unsupportedVersion', version: 2 })
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe(raw)
    expect(set).not.toHaveBeenCalled()
  })
  it('all normal reads are read-only', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem'),
      remove = vi.spyOn(Storage.prototype, 'removeItem')
    loadScheduleData()
    expect(set).not.toHaveBeenCalled()
    saveScheduleData(scheduleFixture())
    set.mockClear()
    loadScheduleData()
    expect(set).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
  })
  it('reports a read exception as unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Denied')
    })
    expect(loadScheduleData()).toEqual({ status: 'unavailable' })
  })
  it('reports missing browser storage explicitly', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadScheduleData()).toEqual({ status: 'unavailable' })
    expect(saveScheduleData(emptyScheduleData())).toBe(false)
  })
  it.each([null, { ...emptyScheduleData(), version: 2 }, { ...emptyScheduleData(), generatedBlocks: [] }])(
    'rejects malformed caller state before any write %j',
    (value) => {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, 'old bytes')
      const set = vi.spyOn(Storage.prototype, 'setItem')
      expect(() => saveScheduleData(value)).toThrow(RangeError)
      expect(set).not.toHaveBeenCalled()
      expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe('old bytes')
    },
  )
  it('reports a failed write and preserves prior schedule and academic bytes', () => {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, 'old bytes')
    localStorage.setItem('homebase.academic.v1', 'academic bytes')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded')
    })
    expect(saveScheduleData(scheduleFixture())).toBe(false)
    expect(localStorage.getItem(SCHEDULE_STORAGE_KEY)).toBe('old bytes')
    expect(localStorage.getItem('homebase.academic.v1')).toBe('academic bytes')
  })
})

it('catches storage property-access failures as well as method failures', () => {
  vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
    throw new DOMException('Storage disabled')
  })
  expect(loadScheduleData()).toEqual({ status: 'unavailable' })
  expect(saveScheduleData(emptyScheduleData())).toBe(false)
})

it('faithfully round-trips infeasible intent without an academic/reference/availability context', () => {
  const data = scheduleFixture()
  data.lockedBlocks.push({ ...data.lockedBlocks[0], blockId: 'second overlapping lock' })
  data.lockedBlocks[0].date = '2000-01-01'
  data.lockedBlocks[1].date = '2000-01-01'
  expect(saveScheduleData(data)).toBe(true)
  expect(loadScheduleData()).toEqual({ status: 'ok', data })
})
