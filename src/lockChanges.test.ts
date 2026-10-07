import { describe, expect, it, vi } from 'vitest'
import {
  createLockedBlock,
  replaceOrAddLockedBlock,
  removeLockedBlock,
  preflightLockedBlockChange,
} from './lockChanges'
import { lockAcademic, lockFixture, lockReference, lockSchedule } from './testFixtures/manualLocks'

it('constructs only lock intent and derives the exact interval duration', () => {
  const input = { ...lockFixture(), durationMinutes: 999 }
  const block = createLockedBlock(input)
  expect(block).toEqual(lockFixture())
  expect(Object.keys(block).sort()).toEqual([
    'assignmentId',
    'blockId',
    'date',
    'durationMinutes',
    'endTime',
    'startTime',
  ])
})
it.each([
  { date: '2026-02-29' },
  { startTime: '24:00' },
  { endTime: '24:00' },
  { startTime: '18:45' },
  { endTime: '18:00' },
  { endTime: '17:00' },
  { startTime: '18:00:01' },
  { blockId: '' },
])('rejects invalid lock structure %j', (change) => {
  expect(() => createLockedBlock({ ...lockFixture(), ...change })).toThrow(RangeError)
})
it('adds, replaces preserving identity, and removes only the selected intent without mutating frozen source', () => {
  const original = lockSchedule()
  original.lockedBlocks = [lockFixture(), lockFixture('17:00', '17:15', 'other')]
  Object.freeze(original.lockedBlocks)
  Object.freeze(original)
  const edited = replaceOrAddLockedBlock(original, lockFixture('18:00', '18:30'))
  expect(edited.lockedBlocks[0]).toEqual(lockFixture('18:00', '18:30'))
  expect(edited.lockedBlocks[1]).toEqual(original.lockedBlocks[1])
  const added = replaceOrAddLockedBlock(edited, lockFixture('16:00', '16:15', 'new'))
  expect(added.lockedBlocks).toHaveLength(3)
  expect(removeLockedBlock(added, 'intent').lockedBlocks.map((b) => b.blockId)).toEqual(['other', 'new'])
  expect(original.lockedBlocks[0].durationMinutes).toBe(45)
})
it('preflights a partial lock, reserving workload and time but returning only source data to save', () => {
  const academic = lockAcademic(),
    source = lockSchedule()
  const result = preflightLockedBlockChange(academic, source, lockFixture(), lockReference)
  expect(result.status).toBe('ok')
  if (result.status !== 'ok') throw new Error('Expected ok')
  expect(result.schedule.lockedBlocks).toEqual([lockFixture()])
  expect(
    result.plan.scheduledBlocks
      .filter((b) => b.source === 'generated')
      .reduce((n, b) => n + b.durationMinutes, 0),
  ).toBe(45)
  expect(Object.keys(result.schedule)).toEqual(['version', 'planningWindows', 'lockedBlocks'])
  expect(source.lockedBlocks).toEqual([])
  expect(academic.assignments[0].estimatedMinutes).toBe(90)
})
it('fully locked work does not generate a zeroEstimate error', () => {
  const result = preflightLockedBlockChange(lockAcademic(45), lockSchedule(), lockFixture(), lockReference)
  expect(result.status).toBe('ok')
  if (result.status !== 'ok') throw new Error('Expected ok')
  expect(result.plan.unplacedAssignments).toEqual([])
  expect(result.plan.scheduledBlocks).toHaveLength(1)
})
describe('full candidate preflight', () => {
  it.each([
    'outsideAvailability',
    'afterDeadline',
    'overlapsLockedBlock',
    'lockedTimeExceedsEstimate',
    'missingEstimate',
    'zeroEstimate',
    'beforeReference',
  ] as const)('rejects %s without returning a source to save', (reason) => {
    const academic = lockAcademic(),
      source = lockSchedule()
    let block = lockFixture()
    if (reason === 'outsideAvailability') source.planningWindows = []
    if (reason === 'afterDeadline') academic.assignments[0].dueTime = '18:30'
    if (reason === 'overlapsLockedBlock') source.lockedBlocks = [lockFixture('18:00', '18:15', 'other')]
    if (reason === 'lockedTimeExceedsEstimate') academic.assignments[0].estimatedMinutes = 30
    if (reason === 'missingEstimate') academic.assignments[0].estimatedMinutes = undefined
    if (reason === 'zeroEstimate') academic.assignments[0].estimatedMinutes = 0
    if (reason === 'beforeReference') block = lockFixture('15:45', '16:15')
    const result = preflightLockedBlockChange(academic, source, block, lockReference)
    expect(result.status).toBe('conflict')
    if (result.status !== 'conflict') throw new Error('Expected conflict')
    expect(result.conflicts.some((c) => c.reason === reason)).toBe(true)
    expect(result).not.toHaveProperty('schedule')
  })
  it('rejects a wholly elapsed new candidate rather than accepting the planner expired-lock exclusion', () => {
    const result = preflightLockedBlockChange(
      lockAcademic(),
      lockSchedule(),
      lockFixture('15:00', '15:30'),
      lockReference,
    )
    expect(result).toEqual({
      status: 'conflict',
      conflicts: [{ reason: 'beforeReference', blockId: 'intent', assignmentId: 'a' }],
    })
  })
  it('a commitment is checked by the composed planner', () => {
    const academic = lockAcademic()
    academic.commitments = [
      {
        id: 'c',
        title: 'Practice',
        date: lockReference.date,
        startTime: '18:00',
        endTime: '19:00',
        createdAt: 'created',
      },
    ]
    const result = preflightLockedBlockChange(academic, lockSchedule(), lockFixture(), lockReference)
    expect(result.status).toBe('conflict')
    if (result.status !== 'conflict') throw new Error('Expected conflict')
    expect(result.conflicts[0].reason).toBe('outsideAvailability')
  })
  it('checks other locks, not just the candidate', () => {
    const source = lockSchedule()
    source.lockedBlocks = [{ ...lockFixture('17:00', '17:15', 'zombie'), assignmentId: 'deleted' }]
    const result = preflightLockedBlockChange(lockAcademic(), source, lockFixture(), lockReference)
    expect(result.status).toBe('conflict')
  })
})
it('unlock restores the entire original estimate to generated work', () => {
  const source = lockSchedule()
  source.lockedBlocks = [lockFixture()]
  const removed = removeLockedBlock(source, 'intent')
  expect(removed.lockedBlocks).toEqual([])
  expect(source.lockedBlocks).toHaveLength(1)
})

it('preflight accepts frozen inputs and does not read the runtime clock or mutate any source', () => {
  const academic = lockAcademic(),
    schedule = lockSchedule(),
    block = lockFixture(),
    reference = { ...lockReference }
  const before = JSON.stringify({ academic, schedule, block, reference })
  academic.assignments.forEach(Object.freeze)
  Object.freeze(academic.assignments)
  Object.freeze(academic)
  schedule.planningWindows.forEach(Object.freeze)
  Object.freeze(schedule.planningWindows)
  Object.freeze(schedule.lockedBlocks)
  Object.freeze(schedule)
  Object.freeze(block)
  Object.freeze(reference)
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => {
    throw new Error('Unexpected clock read')
  })
  let result
  try {
    result = preflightLockedBlockChange(academic, schedule, block, reference)
  } finally {
    clock.mockRestore()
  }
  expect(result.status).toBe('ok')
  expect(JSON.stringify({ academic, schedule, block, reference })).toBe(before)
})
