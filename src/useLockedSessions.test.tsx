import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAcademicPlanner } from './useAcademicPlanner'
import * as plannerCore from './planner'
import * as storage from './scheduleStorage'
import { lockAcademic, lockFixture, lockReference, lockSchedule } from './testFixtures/manualLocks'

function launchHook() {
  const academic = lockAcademic()
  return renderHook(() => useAcademicPlanner(academic, lockReference))
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 6, 16, 0))
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
it('adopts exactly the preflight reference even if a write crosses a minute boundary', () => {
  storage.saveScheduleData(lockSchedule())
  const { result } = launchHook()
  const capture = vi.spyOn(plannerCore, 'referenceFromDate')
  const realSave = storage.saveScheduleData
  vi.spyOn(storage, 'saveScheduleData').mockImplementation((next) => {
    expect(result.current.reference).toEqual(lockReference)
    vi.setSystemTime(new Date(2026, 9, 6, 16, 1))
    return realSave(next)
  })
  act(() => {
    expect(result.current.changeLockedBlock(lockFixture('16:00', '16:30'))).toBe(true)
  })
  expect(result.current.reference).toEqual(lockReference)
  expect(capture).toHaveBeenCalledOnce()
  expect(result.current.plan?.status).toBe('ok')
})

it.each(['false', 'throw'] as const)(
  'failed lock save (%s) adopts neither source, plan nor reference',
  (failure) => {
    const source = lockSchedule()
    source.lockedBlocks = [lockFixture()]
    storage.saveScheduleData(source)
    const { result } = launchHook()
    const previous = result.current,
      bytes = localStorage.getItem(storage.SCHEDULE_STORAGE_KEY)
    vi.setSystemTime(new Date(2026, 9, 6, 16, 10))
    vi.spyOn(storage, 'saveScheduleData').mockImplementation(() => {
      if (failure === 'throw') throw new Error('write failed')
      return false
    })
    act(() => expect(result.current.changeLockedBlock(lockFixture('17:00', '17:45'), 'intent')).toBe(false))
    expect(result.current.scheduleLoad).toBe(previous.scheduleLoad)
    expect(result.current.plan).toBe(previous.plan)
    expect(result.current.reference).toBe(previous.reference)
    expect(localStorage.getItem(storage.SCHEDULE_STORAGE_KEY)).toBe(bytes)
    expect(result.current.lockError?.kind).toBe('saveFailed')
  },
)
it('successful editing keeps identity and saves only source fields without academic writes', () => {
  const source = lockSchedule()
  source.lockedBlocks = [lockFixture()]
  storage.saveScheduleData(source)
  localStorage.setItem('homebase.academic.v1', 'unchanged academic bytes')
  const { result } = launchHook()
  const set = vi.spyOn(Storage.prototype, 'setItem')
  act(() => expect(result.current.changeLockedBlock(lockFixture('17:00', '17:30'), 'intent')).toBe(true))
  const loaded = storage.loadScheduleData()
  if (loaded.status !== 'ok') throw new Error('Expected saved schedule')
  expect(loaded.data.lockedBlocks).toEqual([lockFixture('17:00', '17:30')])
  expect(Object.keys(loaded.data)).toEqual(['version', 'planningWindows', 'lockedBlocks'])
  expect(set).toHaveBeenCalledOnce()
  expect(set.mock.calls[0][0]).toBe(storage.SCHEDULE_STORAGE_KEY)
  expect(localStorage.getItem('homebase.academic.v1')).toBe('unchanged academic bytes')
})
it.each(['invalid', 'unsupportedVersion', 'unavailable'] as const)(
  'all direct lock actions are blocked after %s initialization',
  (status) => {
    if (status === 'invalid') localStorage.setItem(storage.SCHEDULE_STORAGE_KEY, '{bad')
    if (status === 'unsupportedVersion')
      localStorage.setItem(storage.SCHEDULE_STORAGE_KEY, JSON.stringify({ version: 2 }))
    if (status === 'unavailable')
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Denied')
      })
    const save = vi.spyOn(storage, 'saveScheduleData')
    const { result } = launchHook()
    act(() => {
      expect(result.current.changeLockedBlock(lockFixture())).toBe(false)
      expect(result.current.changeLockedBlock(lockFixture(), 'intent')).toBe(false)
      expect(result.current.unlockLockedBlock('intent')).toBe(false)
    })
    expect(save).not.toHaveBeenCalled()
    expect(result.current.reference).toEqual(lockReference)
    expect(result.current.lockError?.kind).toBe('sourceBlocked')
  },
)
it('current conflicts block arbitrary direct create/edit but allow incremental removal', () => {
  const source = lockSchedule()
  source.lockedBlocks = [
    lockFixture('17:00', '17:30', 'a'),
    lockFixture('17:00', '17:30', 'b'),
    { ...lockFixture('18:00', '18:15', 'c'), assignmentId: 'deleted' },
  ]
  storage.saveScheduleData(source)
  const { result } = launchHook()
  const save = vi.spyOn(storage, 'saveScheduleData')
  act(() => {
    expect(result.current.changeLockedBlock(lockFixture())).toBe(false)
    expect(result.current.changeLockedBlock(lockFixture('16:00', '16:15'), 'a')).toBe(false)
  })
  expect(save).not.toHaveBeenCalled()
  act(() => expect(result.current.unlockLockedBlock('a')).toBe(true))
  expect(result.current.plan?.status).toBe('conflict')
  if (result.current.scheduleLoad.status !== 'ok') throw new Error('Expected ready')
  expect(result.current.scheduleLoad.data.lockedBlocks).toEqual(source.lockedBlocks.slice(1))
  act(() => expect(result.current.unlockLockedBlock('c')).toBe(true))
  expect(result.current.plan?.status).toBe('ok')
})
it('unlocked work regenerates without completion credit even in the same time slot', () => {
  const source = lockSchedule()
  source.lockedBlocks = [lockFixture('16:00', '17:30')]
  storage.saveScheduleData(source)
  const academic = lockAcademic()
  const { result } = renderHook(() => useAcademicPlanner(academic, lockReference))
  act(() => expect(result.current.unlockLockedBlock('intent')).toBe(true))
  expect(result.current.plan?.status).toBe('ok')
  if (result.current.plan?.status !== 'ok') throw new Error('Expected ok')
  expect(result.current.plan.scheduledBlocks).toEqual([
    {
      assignmentId: 'a',
      date: lockReference.date,
      startTime: '16:00',
      endTime: '17:30',
      durationMinutes: 90,
      source: 'generated',
    },
  ])
  expect(academic.assignments[0].completed).toBe(false)
  expect(academic.assignments[0].estimatedMinutes).toBe(90)
})
it('preflight rejection writes no bytes and leaves authoritative reference unchanged', () => {
  storage.saveScheduleData(lockSchedule())
  const { result } = launchHook()
  const save = vi.spyOn(storage, 'saveScheduleData'),
    before = result.current
  vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
  act(() => expect(result.current.changeLockedBlock(lockFixture('16:30', '17:30'))).toBe(false))
  expect(save).not.toHaveBeenCalled()
  expect(result.current.lockError?.kind).toBe('conflict')
  expect(result.current.scheduleLoad).toBe(before.scheduleLoad)
  expect(result.current.plan).toBe(before.plan)
  expect(result.current.reference).toBe(before.reference)
})
it('invalid intervals do not invoke saving or secure identity creation', () => {
  const { result } = launchHook()
  const save = vi.spyOn(storage, 'saveScheduleData'),
    rng = vi.spyOn(crypto, 'randomUUID')
  act(() => expect(result.current.changeLockedBlock({ ...lockFixture(), endTime: '17:00' })).toBe(false))
  expect(result.current.lockError?.kind).toBe('invalidInput')
  expect(save).not.toHaveBeenCalled()
  expect(rng).not.toHaveBeenCalled()
})
it('structural planner failure is distinguished from candidate conflicts and browser writes', () => {
  const academic = lockAcademic(-10)
  const { result } = renderHook(() => useAcademicPlanner(academic, lockReference)),
    save = vi.spyOn(storage, 'saveScheduleData')
  act(() => expect(result.current.changeLockedBlock(lockFixture())).toBe(false))
  expect(result.current.lockError?.kind).toBe('planError')
  expect(save).not.toHaveBeenCalled()
})
it('expired intent remains stored and receives no credit during another lock change', () => {
  const source = lockSchedule()
  source.lockedBlocks = [lockFixture('15:00', '15:30', 'elapsed')]
  storage.saveScheduleData(source)
  const { result } = launchHook()
  act(() => expect(result.current.changeLockedBlock(lockFixture())).toBe(true))
  if (result.current.plan?.status !== 'ok') throw new Error('Expected ok')
  expect(result.current.plan.expiredLockedBlocks).toEqual(source.lockedBlocks)
  expect(result.current.plan.scheduledBlocks.reduce((n, b) => n + b.durationMinutes, 0)).toBe(90)
  if (result.current.scheduleLoad.status !== 'ok') throw new Error('Expected ready')
  expect(result.current.scheduleLoad.data.lockedBlocks[0]).toEqual(source.lockedBlocks[0])
})
it('a missing edit target or changed assignment cannot turn editing into creation', () => {
  storage.saveScheduleData(lockSchedule())
  const { result } = launchHook(),
    save = vi.spyOn(storage, 'saveScheduleData')
  act(() => expect(result.current.changeLockedBlock(lockFixture(), 'missing')).toBe(false))
  expect(save).not.toHaveBeenCalled()
})
it('failed unlock retains source, plan and reference', () => {
  const source = lockSchedule()
  source.lockedBlocks = [lockFixture()]
  storage.saveScheduleData(source)
  const { result } = launchHook(),
    before = result.current
  vi.spyOn(storage, 'saveScheduleData').mockReturnValue(false)
  vi.setSystemTime(new Date(2026, 9, 6, 17, 0))
  act(() => expect(result.current.unlockLockedBlock('intent')).toBe(false))
  expect(result.current.reference).toBe(before.reference)
  expect(result.current.scheduleLoad).toBe(before.scheduleLoad)
  expect(result.current.plan).toBe(before.plan)
})

it('batched direct actions use the latest saved source instead of overwriting intent from a stale render', () => {
  storage.saveScheduleData(lockSchedule())
  const { result } = launchHook()
  const save = vi.spyOn(storage, 'saveScheduleData')
  act(() => {
    expect(result.current.changeLockedBlock(lockFixture('16:00', '17:00'))).toBe(true)
    expect(result.current.changeLockedBlock(lockFixture('17:00', '18:00'))).toBe(false)
  })
  expect(save).toHaveBeenCalledOnce()
  const loaded = storage.loadScheduleData()
  if (loaded.status !== 'ok') throw new Error('Expected saved intent')
  expect(loaded.data.lockedBlocks).toHaveLength(1)
  expect(loaded.data.lockedBlocks[0].durationMinutes).toBe(60)
  expect(result.current.lockError?.kind).toBe('conflict')
})
it('an accidental secure ID collision cannot replace an existing lock', () => {
  const source = lockSchedule()
  const id = 'af33df40-480d-4a91-8c4a-8be36f3c5075'
  source.lockedBlocks = [lockFixture('18:00', '18:15', id)]
  storage.saveScheduleData(source)
  const { result } = launchHook()
  vi.spyOn(crypto, 'randomUUID').mockReturnValue(id)
  const save = vi.spyOn(storage, 'saveScheduleData')
  act(() => expect(result.current.changeLockedBlock(lockFixture('17:00', '17:30'))).toBe(false))
  expect(save).not.toHaveBeenCalled()
  const loaded = storage.loadScheduleData()
  expect(loaded.status === 'ok' && loaded.data.lockedBlocks).toEqual(source.lockedBlocks)
})
it('elapsed intent cannot be edited through a direct handler', () => {
  const source = lockSchedule()
  source.lockedBlocks = [lockFixture('15:00', '15:30')]
  storage.saveScheduleData(source)
  const { result } = launchHook()
  const save = vi.spyOn(storage, 'saveScheduleData')
  act(() => expect(result.current.changeLockedBlock(lockFixture(), 'intent')).toBe(false))
  expect(save).not.toHaveBeenCalled()
  expect(result.current.lockError?.kind).toBe('notEditable')
})
