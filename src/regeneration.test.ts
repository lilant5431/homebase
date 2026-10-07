// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Assignment } from './domain'
import { generateAssignmentSchedule } from './placement'
import type { PriorityReference } from './priority'
import {
  regenerateAssignmentSchedule,
  type LockedAssignmentBlock,
  type RegeneratedScheduleBlock,
  type ScheduleRegenerationResult,
} from './regeneration'
import { calculateAvailableTime, type AvailableTimeBlock } from './scheduling'

const reference: PriorityReference = { date: '2026-10-06', time: '16:00' }
const nextDate = '2026-10-07'
const assignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: 'a',
  classId: 'class-a',
  title: 'Work',
  dueDate: reference.date,
  dueTime: '22:00',
  estimatedMinutes: 120,
  completed: false,
  createdAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-01T12:00:00Z',
  ...overrides,
})
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const available = (startTime: string, endTime: string, date = reference.date): AvailableTimeBlock => ({
  date,
  startTime,
  endTime,
  durationMinutes: minutes(endTime) - minutes(startTime),
})
const lock = (
  startTime = '17:00',
  endTime = '17:30',
  overrides: Partial<LockedAssignmentBlock> = {},
): LockedAssignmentBlock => ({
  blockId: 'lock-a',
  assignmentId: 'a',
  ...available(startTime, endTime),
  ...overrides,
})
const generated = (
  assignmentId: string,
  start: string,
  end: string,
  date = reference.date,
): RegeneratedScheduleBlock => ({
  assignmentId,
  ...available(start, end, date),
  source: 'generated',
})
const locked = (block: LockedAssignmentBlock): RegeneratedScheduleBlock => ({ ...block, source: 'locked' })
const regenerate = (
  work = [assignment()],
  blocks = [available('16:00', '20:00')],
  locks: LockedAssignmentBlock[] = [lock()],
) => regenerateAssignmentSchedule(work, blocks, locks, reference)
function ok(result: ScheduleRegenerationResult) {
  expect(result.status).toBe('ok')
  if (result.status !== 'ok') throw new Error('Expected successful regeneration')
  return result
}
function conflicts(result: ScheduleRegenerationResult) {
  expect(result.status).toBe('conflict')
  expect('scheduledBlocks' in result).toBe(false)
  expect('unplacedAssignments' in result).toBe(false)
  if (result.status !== 'conflict') throw new Error('Expected atomic conflict result')
  return result.conflicts
}

describe('empty locks and composition', () => {
  it('returns an empty successful schedule without work or locks', () => {
    expect(regenerate([], [], [])).toEqual({ status: 'ok', scheduledBlocks: [], unplacedAssignments: [] })
  })

  it.each([
    [assignment()],
    [assignment({ estimatedMinutes: 600 }), assignment({ id: 'b', dueTime: '17:00', estimatedMinutes: 30 })],
    [assignment({ estimatedMinutes: undefined }), assignment({ id: 'z', estimatedMinutes: 0 })],
    [assignment({ completed: true })],
  ])('empty locks exactly compose Phase 2.3 (%#)', (...work) => {
    const blocks = [available('15:00', '18:00'), available('19:00', '20:00')]
    const baseline = generateAssignmentSchedule(work, blocks, reference)
    expect(regenerate(work, blocks, [])).toEqual({
      status: 'ok',
      scheduledBlocks: baseline.scheduledBlocks.map((block) => ({ ...block, source: 'generated' })),
      unplacedAssignments: baseline.unplacedAssignments,
    })
  })

  it('empty availability without locks matches placement remainders', () => {
    const work = [assignment(), assignment({ id: 'missing', estimatedMinutes: undefined })]
    const baseline = generateAssignmentSchedule(work, [], reference)
    expect(regenerate(work, [], [])).toEqual({ status: 'ok', ...baseline })
  })

  it('empty availability with a lock is a feasibility conflict', () => {
    expect(conflicts(regenerate([assignment()], [], [lock()]))).toEqual([
      { reason: 'outsideAvailability', blockId: 'lock-a', assignmentId: 'a' },
    ])
  })
})

describe('exact locks and workload accounting', () => {
  it('subtracts a partial lock from workload and labels both sources', () => {
    expect(regenerate()).toEqual({
      status: 'ok',
      scheduledBlocks: [generated('a', '16:00', '17:00'), locked(lock()), generated('a', '17:30', '18:00')],
      unplacedAssignments: [],
    })
  })

  it('sums multiple locks for the same assignment without double-counting', () => {
    const locks = [lock(), lock('18:00', '18:30', { blockId: 'second' })]
    expect(regenerate([assignment()], undefined, locks)).toEqual({
      status: 'ok',
      scheduledBlocks: [generated('a', '16:00', '17:00'), locked(locks[0]), locked(locks[1])],
      unplacedAssignments: [],
    })
  })

  it('fully locked work generates nothing and never reports zeroEstimate', () => {
    const full = lock('17:00', '18:00')
    expect(regenerate([assignment({ estimatedMinutes: 60 })], undefined, [full])).toEqual({
      status: 'ok',
      scheduledBlocks: [locked(full)],
      unplacedAssignments: [],
    })
  })

  it('fully locked work across several blocks is excluded from placement', () => {
    const locks = [lock('17:00', '18:00'), lock('19:00', '20:00', { blockId: 'second' })]
    expect(regenerate([assignment()], undefined, locks)).toEqual({
      status: 'ok',
      scheduledBlocks: locks.map(locked),
      unplacedAssignments: [],
    })
  })

  it('keeps genuine zero/missing estimates distinct from fully locked work', () => {
    const full = lock('16:00', '17:00')
    const result = ok(
      regenerate(
        [
          assignment({ estimatedMinutes: 60 }),
          assignment({ id: 'zero', estimatedMinutes: 0 }),
          assignment({ id: 'missing', estimatedMinutes: undefined }),
        ],
        [available('16:00', '17:00')],
        [full],
      ),
    )
    expect(result.scheduledBlocks).toEqual([locked(full)])
    expect(result.unplacedAssignments).toEqual([
      { assignmentId: 'missing', reason: 'missingEstimate' },
      { assignmentId: 'zero', reason: 'zeroEstimate', remainingMinutes: 0 },
    ])
  })

  it('reports exact remaining work when locks and capacity cannot fill the estimate', () => {
    expect(regenerate([assignment()], [available('16:00', '17:15')], [lock('16:30', '17:00')])).toEqual({
      status: 'ok',
      scheduledBlocks: [
        generated('a', '16:00', '16:30'),
        locked(lock('16:30', '17:00')),
        generated('a', '17:00', '17:15'),
      ],
      unplacedAssignments: [{ assignmentId: 'a', reason: 'insufficientAvailableTime', remainingMinutes: 45 }],
    })
  })

  it('preserves deadline metadata while placing only remaining work', () => {
    const intent = lock('16:15', '16:45')
    expect(regenerate([assignment({ dueTime: '17:00' })], undefined, [intent])).toEqual({
      status: 'ok',
      scheduledBlocks: [generated('a', '16:00', '16:15'), locked(intent), generated('a', '16:45', '17:00')],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 60 },
      ],
    })
  })

  it('re-ranks partially locked work using remaining estimate, not original workload', () => {
    const intent = lock('18:00', '19:30')
    expect(
      regenerate([assignment(), assignment({ id: 'b', estimatedMinutes: 60 })], undefined, [intent]),
    ).toEqual({
      status: 'ok',
      scheduledBlocks: [generated('b', '16:00', '17:00'), generated('a', '17:00', '17:30'), locked(intent)],
      unplacedAssignments: [],
    })
  })

  it('preserves priority tie-breaking for assignments without locks', () => {
    const intent = lock('18:00', '19:00')
    const result = ok(
      regenerate(
        [
          assignment({ estimatedMinutes: 60 }),
          assignment({ id: 'c', estimatedMinutes: 30 }),
          assignment({ id: 'b', estimatedMinutes: 30 }),
        ],
        undefined,
        [intent],
      ),
    )
    expect(result.scheduledBlocks).toEqual([
      generated('b', '16:00', '16:30'),
      generated('c', '16:30', '17:00'),
      locked(intent),
    ])
  })

  it('preserves multiple locks for different assignments exactly', () => {
    const a = lock('17:00', '17:30')
    const b = lock('18:00', '18:30', { blockId: 'b-lock', assignmentId: 'b' })
    expect(
      regenerate(
        [assignment({ estimatedMinutes: 60 }), assignment({ id: 'b', estimatedMinutes: 60 })],
        undefined,
        [b, a],
      ),
    ).toEqual({
      status: 'ok',
      scheduledBlocks: [
        generated('a', '16:00', '16:30'),
        generated('b', '16:30', '17:00'),
        locked(a),
        locked(b),
      ],
      unplacedAssignments: [],
    })
  })

  it('allows opaque IDs without UUID or object-key assumptions', () => {
    const intent = lock('17:00', '17:30', { blockId: ' arbitrary / intent ', assignmentId: '__proto__' })
    const result = ok(regenerate([assignment({ id: '__proto__' })], undefined, [intent]))
    expect(result.scheduledBlocks.filter((block) => block.source === 'locked')).toEqual([locked(intent)])
    expect(result.unplacedAssignments).toEqual([])
  })

  it('replaces, resizes, or removes intent by regenerating from original workload', () => {
    const work = [assignment()]
    const original = lock()
    const moved = lock('18:00', '18:30', { blockId: original.blockId })
    const resized = lock('17:00', '18:00', { blockId: original.blockId })
    for (const intent of [moved, resized]) {
      const result = ok(regenerate(work, undefined, [intent]))
      expect(result.scheduledBlocks.filter((block) => block.source === 'locked')).toEqual([locked(intent)])
      expect(result.scheduledBlocks.reduce((sum, block) => sum + block.durationMinutes, 0)).toBe(120)
      expect(result.unplacedAssignments).toEqual([])
    }
    expect(ok(regenerate(work, undefined, [])).scheduledBlocks).toEqual([generated('a', '16:00', '18:00')])
    expect(work[0].estimatedMinutes).toBe(120)
  })
})

describe('availability reservation', () => {
  it('a locked hour splits capacity into both residual sides', () => {
    const intent = lock('17:00', '18:00')
    expect(regenerate([assignment({ estimatedMinutes: 240 })], undefined, [intent])).toEqual({
      status: 'ok',
      scheduledBlocks: [generated('a', '16:00', '17:00'), locked(intent), generated('a', '18:00', '20:00')],
      unplacedAssignments: [],
    })
  })

  it.each([
    ['16:00', '16:30', '16:30', '17:30'],
    ['19:30', '20:00', '16:00', '17:00'],
  ])(
    'preserves tails when a lock touches an availability edge (%#)',
    (start, end, generatedStart, generatedEnd) => {
      const intent = lock(start, end)
      const result = ok(regenerate([assignment({ estimatedMinutes: 90 })], undefined, [intent]))
      expect(result.scheduledBlocks.filter((block) => block.source === 'generated')).toEqual([
        generated('a', generatedStart, generatedEnd),
      ])
    },
  )

  it('multiple locks reserve separate spans and preserve the intervening capacity', () => {
    const a = lock('16:30', '17:00')
    const b = lock('18:00', '18:30', { blockId: 'second' })
    expect(regenerate([assignment({ estimatedMinutes: 180 })], undefined, [a, b])).toEqual({
      status: 'ok',
      scheduledBlocks: [
        generated('a', '16:00', '16:30'),
        locked(a),
        generated('a', '17:00', '18:00'),
        locked(b),
        generated('a', '18:30', '19:00'),
      ],
      unplacedAssignments: [],
    })
  })

  it('allows a lock across adjacent availability and reserves every covered portion', () => {
    const intent = lock('16:15', '16:45')
    expect(
      regenerate(
        [assignment({ estimatedMinutes: 60 })],
        [available('16:00', '16:30'), available('16:30', '17:00')],
        [intent],
      ),
    ).toEqual({
      status: 'ok',
      scheduledBlocks: [generated('a', '16:00', '16:15'), locked(intent), generated('a', '16:45', '17:00')],
      unplacedAssignments: [],
    })
  })

  it('joint adjacent containment works across more than two input elements', () => {
    const intent = lock('16:00', '17:00')
    expect(
      regenerate(
        [assignment({ estimatedMinutes: 60 })],
        [available('16:00', '16:15'), available('16:15', '16:30'), available('16:30', '17:00')],
        [intent],
      ),
    ).toEqual({
      status: 'ok',
      scheduledBlocks: [locked(intent)],
      unplacedAssignments: [],
    })
  })

  it('never merges or consumes separated availability gaps', () => {
    const intent = lock('18:00', '18:30')
    expect(
      regenerate([assignment()], [available('16:00', '16:30'), available('18:00', '19:30')], [intent]),
    ).toEqual({
      status: 'ok',
      scheduledBlocks: [generated('a', '16:00', '16:30'), locked(intent), generated('a', '18:30', '19:30')],
      unplacedAssignments: [],
    })
  })

  it('delegates ordinary reference clipping for generated work', () => {
    const intent = lock('17:00', '17:30')
    expect(ok(regenerate([assignment()], [available('15:00', '20:00')], [intent])).scheduledBlocks).toEqual([
      generated('a', '16:00', '17:00'),
      locked(intent),
      generated('a', '17:30', '18:00'),
    ])
  })

  it('composes availability already stripped of a commitment without overriding it', () => {
    const blocks = calculateAvailableTime(
      [{ date: reference.date, startTime: '16:00', endTime: '20:00' }],
      [
        {
          id: 'sport',
          title: 'Sport',
          date: reference.date,
          startTime: '17:00',
          endTime: '18:00',
          createdAt: '',
        },
      ],
    )
    expect(conflicts(regenerate([assignment()], blocks, [lock('16:30', '18:30')]))).toEqual([
      { reason: 'outsideAvailability', blockId: 'lock-a', assignmentId: 'a' },
    ])
  })
})

describe('user-resolvable conflicts are atomic', () => {
  it.each([
    { work: [], reason: 'assignmentMissing' },
    { work: [assignment({ completed: true })], reason: 'assignmentCompleted' },
    { work: [assignment({ estimatedMinutes: undefined })], reason: 'missingEstimate' },
    { work: [assignment({ estimatedMinutes: 0 })], reason: 'zeroEstimate' },
  ])('reports $reason without throwing or returning a schedule', ({ work, reason }) => {
    expect(conflicts(regenerate(work))).toEqual([{ reason, blockId: 'lock-a', assignmentId: 'a' }])
  })

  it('completed assignment locks conflict even when their stale metadata is invalid', () => {
    expect(
      conflicts(regenerate([assignment({ completed: true, estimatedMinutes: -1, dueDate: 'stale' })])),
    ).toEqual([{ reason: 'assignmentCompleted', blockId: 'lock-a', assignmentId: 'a' }])
  })

  it.each([
    ['14:00', '15:00'],
    ['15:30', '16:30'],
  ])('past/crossing lock %s–%s is not clipped or credited as work', (start, end) => {
    const intent = lock(start, end)
    const original = structuredClone(intent)
    expect(conflicts(regenerate([assignment()], [available('13:00', '20:00')], [intent]))).toEqual([
      { reason: 'beforeReference', blockId: 'lock-a', assignmentId: 'a' },
      { reason: 'outsideAvailability', blockId: 'lock-a', assignmentId: 'a' },
    ])
    expect(intent).toEqual(original)
  })

  it('a lock starting exactly at the reference is valid', () => {
    const intent = lock('16:00', '16:30')
    expect(ok(regenerate(undefined, undefined, [intent])).scheduledBlocks[0]).toEqual(locked(intent))
  })

  it('a future-day lock is valid and preserves its date', () => {
    const intent = lock('09:00', '09:30', { date: nextDate })
    expect(
      regenerate(
        [assignment({ dueDate: nextDate, estimatedMinutes: 30 })],
        [available('09:00', '10:00', nextDate)],
        [intent],
      ),
    ).toEqual({
      status: 'ok',
      scheduledBlocks: [locked(intent)],
      unplacedAssignments: [],
    })
  })

  it('a future lock may finish exactly at the assignment deadline', () => {
    const intent = lock('17:00', '18:00')
    expect(regenerate([assignment({ dueTime: '18:00', estimatedMinutes: 60 })], undefined, [intent])).toEqual(
      {
        status: 'ok',
        scheduledBlocks: [locked(intent)],
        unplacedAssignments: [],
      },
    )
  })

  it('a future lock extending even one minute past deadline conflicts', () => {
    expect(conflicts(regenerate([assignment({ dueTime: '17:29' })]))).toEqual([
      { reason: 'afterDeadline', blockId: 'lock-a', assignmentId: 'a' },
    ])
  })

  it('missing dueTime permits work through 23:59 but not a later date', () => {
    const work = [assignment({ dueTime: undefined, estimatedMinutes: 30 })]
    const late = lock('23:29', '23:59')
    expect(regenerate(work, [available('23:00', '23:59')], [late])).toEqual({
      status: 'ok',
      scheduledBlocks: [locked(late)],
      unplacedAssignments: [],
    })
    expect(
      conflicts(
        regenerate(
          work,
          [available('09:00', '10:00', nextDate)],
          [lock('09:00', '09:30', { date: nextDate })],
        ),
      ),
    ).toEqual([{ reason: 'afterDeadline', blockId: 'lock-a', assignmentId: 'a' }])
    expect(work[0].dueTime).toBeUndefined()
  })

  it.each(['16:00', '15:59'])(
    'due-now/overdue deadline %s keeps future catch-up locks feasible',
    (dueTime) => {
      const intent = lock('18:00', '18:30')
      expect(regenerate([assignment({ dueTime, estimatedMinutes: 30 })], undefined, [intent])).toEqual({
        status: 'ok',
        scheduledBlocks: [locked(intent)],
        unplacedAssignments: [],
      })
    },
  )

  it('overdue work can be locked on a later day without a deadline cap', () => {
    const intent = lock('09:00', '09:30', { date: nextDate })
    expect(
      regenerate(
        [assignment({ dueDate: '2026-10-05', estimatedMinutes: 30 })],
        [available('09:00', '10:00', nextDate)],
        [intent],
      ),
    ).toEqual({
      status: 'ok',
      scheduledBlocks: [locked(intent)],
      unplacedAssignments: [],
    })
  })

  it.each([
    ['20:00', '20:30'],
    ['15:30', '16:30'],
    ['19:30', '20:30'],
  ])('out-of-availability intent %s–%s is not moved or shrunk', (start, end) => {
    const result = conflicts(regenerate(undefined, undefined, [lock(start, end)]))
    expect(result).toContainEqual({ reason: 'outsideAvailability', blockId: 'lock-a', assignmentId: 'a' })
  })

  it('a lock spanning even a one-minute availability gap conflicts', () => {
    expect(
      conflicts(
        regenerate(
          undefined,
          [available('16:00', '16:30'), available('16:31', '17:00')],
          [lock('16:15', '16:45')],
        ),
      ),
    ).toEqual([{ reason: 'outsideAvailability', blockId: 'lock-a', assignmentId: 'a' }])
  })

  it.each([
    [lock('16:30', '18:00'), lock('17:00', '18:30', { blockId: 'second' })],
    [lock('16:30', '18:30'), lock('17:00', '18:00', { blockId: 'second' })],
    [lock('17:00', '18:00'), lock('17:00', '18:00', { blockId: 'second' })],
  ])('overlapping, nested, or duplicate-time locks cannot be merged (%#)', (first, second) => {
    const work = [assignment({ estimatedMinutes: 300 })]
    const result = conflicts(regenerate(work, undefined, [first, second]))
    expect(result).toEqual([
      { reason: 'overlapsLockedBlock', blockId: 'lock-a', assignmentId: 'a', conflictingBlockId: 'second' },
    ])
    expect(regenerate(work, undefined, [second, first])).toEqual({ status: 'conflict', conflicts: result })
  })

  it('overlap conflicts also apply across assignments', () => {
    const a = lock()
    const b = lock('17:15', '17:45', { blockId: 'b', assignmentId: 'b' })
    expect(conflicts(regenerate([assignment(), assignment({ id: 'b' })], undefined, [a, b]))).toEqual([
      { reason: 'overlapsLockedBlock', blockId: 'b', assignmentId: 'b', conflictingBlockId: 'lock-a' },
    ])
  })

  it('reports all nested overlap pairs, not just neighbors', () => {
    const outer = lock('16:00', '20:00', { blockId: 'outer' })
    const inner1 = lock('17:00', '17:30', { blockId: 'one' })
    const inner2 = lock('18:00', '18:30', { blockId: 'two' })
    expect(
      conflicts(regenerate([assignment({ estimatedMinutes: 300 })], undefined, [inner2, outer, inner1])),
    ).toEqual([
      { reason: 'overlapsLockedBlock', blockId: 'one', assignmentId: 'a', conflictingBlockId: 'outer' },
      { reason: 'overlapsLockedBlock', blockId: 'outer', assignmentId: 'a', conflictingBlockId: 'two' },
    ])
  })

  it('adjacent locks are valid and remain separate user blocks', () => {
    const locks = [lock('16:00', '17:00'), lock('17:00', '18:00', { blockId: 'second' })]
    expect(regenerate(undefined, undefined, locks)).toEqual({
      status: 'ok',
      scheduledBlocks: locks.map(locked),
      unplacedAssignments: [],
    })
  })

  it.each([60, 59])('one 60-minute lock against estimate %i is accounted for exactly', (estimate) => {
    const intent = lock('17:00', '18:00')
    const result = regenerate([assignment({ estimatedMinutes: estimate })], undefined, [intent])
    if (estimate === 60) {
      expect(result).toEqual({ status: 'ok', scheduledBlocks: [locked(intent)], unplacedAssignments: [] })
    } else {
      expect(conflicts(result)).toEqual([
        {
          reason: 'lockedTimeExceedsEstimate',
          assignmentId: 'a',
          blockIds: ['lock-a'],
          lockedMinutes: 60,
          estimatedMinutes: 59,
        },
      ])
    }
  })

  it('aggregate excess minutes across locks are explicit and IDs are sorted', () => {
    const locks = [lock('17:00', '18:00', { blockId: 'z' }), lock('18:00', '19:00', { blockId: 'a' })]
    expect(conflicts(regenerate([assignment({ estimatedMinutes: 90 })], undefined, locks))).toEqual([
      {
        reason: 'lockedTimeExceedsEstimate',
        assignmentId: 'a',
        blockIds: ['a', 'z'],
        lockedMinutes: 120,
        estimatedMinutes: 90,
      },
    ])
  })

  it('one valid lock plus one invalid intent yields no partial schedule', () => {
    const result = regenerate(undefined, undefined, [lock(), lock('20:00', '20:30', { blockId: 'bad' })])
    expect(result).toEqual({
      status: 'conflict',
      conflicts: [{ reason: 'outsideAvailability', blockId: 'bad', assignmentId: 'a' }],
    })
    conflicts(result)
  })

  it('reports multiple applicable conflict reasons in canonical order across all permutations', () => {
    const work = [
      assignment({ dueTime: '17:00', estimatedMinutes: 30 }),
      assignment({ id: 'done', completed: true }),
    ]
    const blocks = [available('16:00', '18:00'), available('19:00', '20:00')]
    const locks = [
      lock('17:00', '18:00', { blockId: 'z' }),
      lock('17:30', '18:30', { blockId: 'a' }),
      lock('19:00', '19:30', { blockId: 'done', assignmentId: 'done' }),
      lock('19:30', '20:00', { blockId: 'missing', assignmentId: 'gone' }),
    ]
    const result = regenerate(work, blocks, locks)
    expect(conflicts(result)).toEqual([
      { reason: 'afterDeadline', blockId: 'a', assignmentId: 'a' },
      { reason: 'afterDeadline', blockId: 'z', assignmentId: 'a' },
      { reason: 'assignmentCompleted', blockId: 'done', assignmentId: 'done' },
      { reason: 'assignmentMissing', blockId: 'missing', assignmentId: 'gone' },
      {
        reason: 'lockedTimeExceedsEstimate',
        assignmentId: 'a',
        blockIds: ['a', 'z'],
        lockedMinutes: 120,
        estimatedMinutes: 30,
      },
      { reason: 'outsideAvailability', blockId: 'a', assignmentId: 'a' },
      { reason: 'overlapsLockedBlock', blockId: 'a', assignmentId: 'a', conflictingBlockId: 'z' },
    ])
    for (const items of [work, [...work].reverse()]) {
      for (const windows of [blocks, [...blocks].reverse()]) {
        for (const intent of [locks, [...locks].reverse()])
          expect(regenerate(items, windows, intent)).toEqual(result)
      }
    }
  })
})

describe('structural errors precede feasibility conflicts', () => {
  it.each([null, undefined])('a missing/null lock time is a structural RangeError (%s)', (startTime) => {
    const malformed = { ...lock(), startTime } as unknown as LockedAssignmentBlock
    expect(() => regenerate(undefined, undefined, [malformed])).toThrow(RangeError)
  })

  it('a missing reference time is a structural RangeError with or without locks', () => {
    const malformed = { date: reference.date } as PriorityReference
    expect(() => regenerateAssignmentSchedule([], [], [], malformed)).toThrow(RangeError)
    expect(() =>
      regenerateAssignmentSchedule([assignment()], [available('16:00', '20:00')], [lock()], malformed),
    ).toThrow(RangeError)
  })

  it.each(['9:00', '24:00', '16:60', '16:00:00', '16:00\n'])(
    'malformed lock start %j throws RangeError',
    (startTime) => {
      expect(() => regenerate(undefined, undefined, [lock(undefined, undefined, { startTime })])).toThrow(
        RangeError,
      )
    },
  )

  it.each(['24:00', 'oops', '17:30\n'])('malformed lock end %j throws', (endTime) => {
    expect(() => regenerate(undefined, undefined, [lock(undefined, undefined, { endTime })])).toThrow(
      RangeError,
    )
  })

  it.each(['2026-02-30', '2026-13-01', '0000-01-01', '2026-1-01', '2026-10-06\n'])(
    'invalid lock date %j throws',
    (date) => {
      expect(() => regenerate(undefined, undefined, [lock(undefined, undefined, { date })])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    ['17:00', '17:00'],
    ['18:00', '17:00'],
    ['23:00', '01:00'],
  ])('nonpositive/overnight lock %s–%s throws', (start, end) => {
    expect(() => regenerate(undefined, undefined, [lock(start, end)])).toThrow(RangeError)
  })

  it.each([0, -1, 29, 31, 30.5, Infinity, NaN])('incorrect lock duration %s throws', (durationMinutes) => {
    expect(() => regenerate(undefined, undefined, [lock(undefined, undefined, { durationMinutes })])).toThrow(
      RangeError,
    )
  })

  it('empty blockId throws rather than becoming a scheduling conflict', () => {
    expect(() => regenerate(undefined, undefined, [lock(undefined, undefined, { blockId: '' })])).toThrow(
      RangeError,
    )
  })

  it('duplicate blockId throws even for non-overlapping locks', () => {
    expect(() => regenerate(undefined, undefined, [lock(), lock('18:00', '18:30')])).toThrow(RangeError)
  })

  it.each([
    [available('16:00', '16:00')],
    [available('18:00', '16:00')],
    [{ ...available('16:00', '20:00'), durationMinutes: 1 }],
    [{ ...available('16:00', '20:00'), startTime: '24:00' }],
    [available('16:00', '18:00'), available('17:00', '19:00')],
    [available('16:00', '18:00', '2026-02-30')],
  ])('invalid availability is structural, not outsideAvailability (%#)', (...blocks) => {
    expect(() => regenerate(undefined, blocks)).toThrow(RangeError)
  })

  it('past availability is validated before ignoring it', () => {
    expect(() => regenerate(undefined, [{ ...available('13:00', '15:00'), durationMinutes: 1 }])).toThrow(
      RangeError,
    )
  })

  it.each([
    { date: '2026-02-30', time: '16:00' },
    { ...reference, time: '24:00' },
  ])('invalid reference throws (%#)', (now) => {
    expect(() => regenerateAssignmentSchedule([], [], [], now)).toThrow(RangeError)
    expect(() =>
      regenerateAssignmentSchedule([assignment()], [available('16:00', '20:00')], [lock()], now),
    ).toThrow(RangeError)
  })

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'invalid active estimate %s throws before conflicts',
    (estimate) => {
      expect(() => regenerate([assignment({ estimatedMinutes: estimate })], [], [lock()])).toThrow(RangeError)
    },
  )

  it('invalid active deadline throws even for fully locked work', () => {
    expect(() => regenerate([assignment({ dueDate: 'invalid', estimatedMinutes: 30 })])).toThrow(RangeError)
  })

  it('invalid unlocked assignment still prevents structural validation from being bypassed', () => {
    expect(() => regenerate([assignment(), assignment({ id: 'bad', estimatedMinutes: 0.5 })])).toThrow(
      RangeError,
    )
  })

  it('duplicate assignment identities do not permit input-order-dependent lock resolution', () => {
    const work = [assignment(), assignment({ completed: true })]
    expect(() => regenerate(work)).toThrow(RangeError)
    expect(() => regenerate([...work].reverse())).toThrow(RangeError)
  })

  it('malformed lock structure is not hidden by an earlier missing-assignment conflict', () => {
    const locks = [
      lock(undefined, undefined, { assignmentId: 'gone' }),
      lock('18:00', '18:30', { blockId: 'bad', endTime: 'bad' }),
    ]
    expect(() => regenerate(undefined, undefined, locks)).toThrow(RangeError)
    expect(() => regenerate(undefined, undefined, [...locks].reverse())).toThrow(RangeError)
  })
})

// Independent minute-set oracle: no production interval helpers are used.
function slots(block: AvailableTimeBlock): string[] {
  const keys: string[] = []
  for (let minute = minutes(block.startTime); minute < minutes(block.endTime); minute++)
    keys.push(`${block.date}|${minute}`)
  return keys
}
function assertSafety(
  work: readonly Assignment[],
  blocks: readonly AvailableTimeBlock[],
  locks: readonly LockedAssignmentBlock[],
  result: Extract<ScheduleRegenerationResult, { status: 'ok' }>,
) {
  const availableSlots = new Set(blocks.flatMap(slots))
  const lockedSlots = new Set(locks.flatMap(slots))
  const allScheduled = result.scheduledBlocks.flatMap(slots)
  expect(new Set(allScheduled).size).toBe(allScheduled.length)
  expect(allScheduled.every((slot) => availableSlots.has(slot))).toBe(true)
  expect(result.scheduledBlocks.filter((block) => block.source === 'locked')).toEqual(
    [...locks]
      .sort((a, b) =>
        a.date < b.date ? -1 : a.date > b.date ? 1 : minutes(a.startTime) - minutes(b.startTime),
      )
      .map(locked),
  )
  const keys = result.scheduledBlocks.map((block) => `${block.date} ${block.startTime}`)
  expect(keys).toEqual([...keys].sort())
  for (const block of result.scheduledBlocks) {
    expect(block.durationMinutes).toBeGreaterThan(0)
    expect(block.durationMinutes).toBe(minutes(block.endTime) - minutes(block.startTime))
    expect(`${block.date} ${block.startTime}` >= `${reference.date} ${reference.time}`).toBe(true)
    const original = work.find((item) => item.id === block.assignmentId)!
    const deadline = `${original.dueDate} ${original.dueTime ?? '23:59'}`
    if (deadline > `${reference.date} ${reference.time}`)
      expect(`${block.date} ${block.endTime}` <= deadline).toBe(true)
    if (block.source === 'generated') expect(slots(block).every((slot) => !lockedSlots.has(slot))).toBe(true)
  }
  for (const item of work.filter((item) => !item.completed && item.estimatedMinutes !== undefined)) {
    const scheduledMinutes = result.scheduledBlocks
      .filter((block) => block.assignmentId === item.id)
      .reduce((sum, block) => sum + block.durationMinutes, 0)
    const remaining =
      result.unplacedAssignments.find((entry) => entry.assignmentId === item.id)?.remainingMinutes ?? 0
    expect(scheduledMinutes).toBeLessThanOrEqual(item.estimatedMinutes!)
    expect(scheduledMinutes + remaining).toBe(item.estimatedMinutes)
    const lockedMinutes = locks
      .filter((block) => block.assignmentId === item.id)
      .reduce((sum, block) => sum + block.durationMinutes, 0)
    if (lockedMinutes > 0 && lockedMinutes === item.estimatedMinutes) {
      expect(result.unplacedAssignments.some((entry) => entry.assignmentId === item.id)).toBe(false)
    }
  }
}

describe('conservation, non-overlap, immutability, and determinism', () => {
  it('exhaustively checks workload/capacity combinations and all input reversals', () => {
    const blocks = [
      available('15:00', '16:30'),
      available('16:30', '18:00'),
      available('19:00', '20:00'),
      available('09:00', '10:30', nextDate),
    ]
    const a1 = lock('16:15', '16:45')
    const a2 = lock('19:15', '19:30', { blockId: 'second' })
    const b1 = lock('09:15', '09:30', { date: nextDate, assignmentId: 'b', blockId: 'b-lock' })
    let scenarios = 0
    for (const locks of [[], [a1], [a1, a2], [a1, a2, b1]]) {
      for (const aExtra of [0, 1, 30, 90, 240, 600]) {
        for (const bExtra of [0, 30, 180]) {
          const reservedA = locks
            .filter((block) => block.assignmentId === 'a')
            .reduce((sum, block) => sum + block.durationMinutes, 0)
          const reservedB = locks
            .filter((block) => block.assignmentId === 'b')
            .reduce((sum, block) => sum + block.durationMinutes, 0)
          const work = [
            assignment({ dueTime: '20:00', estimatedMinutes: reservedA + aExtra }),
            assignment({
              id: 'b',
              dueDate: nextDate,
              dueTime: '10:00',
              estimatedMinutes: reservedB + bExtra,
            }),
            assignment({ id: 'unknown', estimatedMinutes: undefined }),
            assignment({ id: 'done', completed: true }),
          ]
          const result = ok(regenerate(work, blocks, locks))
          assertSafety(work, blocks, locks, result)
          expect(result.unplacedAssignments).toContainEqual({
            assignmentId: 'unknown',
            reason: 'missingEstimate',
          })
          expect(result.scheduledBlocks.some((block) => block.assignmentId === 'done')).toBe(false)
          for (const items of [work, [...work].reverse()]) {
            for (const windows of [blocks, [...blocks].reverse()]) {
              for (const intent of [locks, [...locks].reverse()])
                expect(regenerate(items, windows, intent)).toEqual(result)
            }
          }
          scenarios++
        }
      }
    }
    expect(scenarios).toBe(72)
  })

  it('frozen inputs preserve all fields and returned locks do not alias their objects', () => {
    const work = Object.freeze([Object.freeze(assignment({ notes: 'Private notes', title: 'Essay' }))])
    const blocks = Object.freeze([Object.freeze(available('15:00', '20:00'))])
    const locks = Object.freeze([Object.freeze(lock())])
    const now = Object.freeze({ ...reference })
    const before = structuredClone({ work, blocks, locks, now })
    const result = ok(regenerateAssignmentSchedule(work, blocks, locks, now))
    expect({ work, blocks, locks, now }).toEqual(before)
    const returned = result.scheduledBlocks.find((block) => block.source === 'locked')!
    expect(returned).not.toBe(locks[0])
    returned.startTime = '00:00'
    expect(locks[0].startTime).toBe('17:00')
  })

  it('conflict detection also preserves frozen inputs', () => {
    const work = Object.freeze([Object.freeze(assignment({ estimatedMinutes: 1 }))])
    const blocks = Object.freeze([Object.freeze(available('16:00', '20:00'))])
    const locks = Object.freeze([Object.freeze(lock())])
    const now = Object.freeze({ ...reference })
    const before = structuredClone({ work, blocks, locks, now })
    conflicts(regenerateAssignmentSchedule(work, blocks, locks, now))
    expect({ work, blocks, locks, now }).toEqual(before)
  })

  it('repeated calls remain identical without reading the runtime clock', () => {
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Implicit clock read')
    })
    try {
      expect(regenerate()).toEqual(regenerate())
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it.each(['2026-03-08', '2026-11-01', '2028-02-29', '0099-01-01'])(
    'calendar-minute lock validation is timezone-independent (%s)',
    (date) => {
      const intent = lock('01:30', '03:30', { date })
      expect(
        regenerateAssignmentSchedule(
          [assignment({ dueDate: date, estimatedMinutes: 120 })],
          [available('00:00', '04:00', date)],
          [intent],
          { date, time: '00:00' },
        ),
      ).toEqual({
        status: 'ok',
        scheduledBlocks: [locked(intent)],
        unplacedAssignments: [],
      })
    },
  )
})
