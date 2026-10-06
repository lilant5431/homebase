// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import type { Assignment } from './domain'
import { generateAssignmentSchedule, type ScheduledAssignmentBlock } from './placement'
import { rankAssignmentsByPriority, type PriorityReference } from './priority'
import { calculateAvailableTime, type AvailableTimeBlock } from './scheduling'

const reference: PriorityReference = { date: '2026-10-05', time: '16:00' }
const nextDate = '2026-10-06'
const assignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: 'a',
  classId: 'class-1',
  title: 'Work',
  dueDate: reference.date,
  dueTime: '22:00',
  estimatedMinutes: 60,
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
const scheduled = (
  assignmentId: string,
  startTime: string,
  endTime: string,
  date = reference.date,
): ScheduledAssignmentBlock => ({ assignmentId, ...available(startTime, endTime, date) })
const generate = (assignments: readonly Assignment[], blocks = [available('16:00', '18:00')]) =>
  generateAssignmentSchedule(assignments, blocks, reference)

describe('basic placement and priority integration', () => {
  it('returns empty output when there are no assignments', () => {
    expect(generate([])).toEqual({ scheduledBlocks: [], unplacedAssignments: [] })
  })

  it('reports all work when there is no availability', () => {
    expect(generate([assignment()], [])).toEqual({
      scheduledBlocks: [],
      unplacedAssignments: [{ assignmentId: 'a', reason: 'insufficientAvailableTime', remainingMinutes: 60 }],
    })
  })

  it('exactly fills a block', () => {
    expect(generate([assignment()], [available('16:00', '17:00')])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:00')],
      unplacedAssignments: [],
    })
  })

  it('does not fill more than the estimate', () => {
    expect(generate([assignment({ estimatedMinutes: 30 })])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '16:30')],
      unplacedAssignments: [],
    })
  })

  it('lets two assignments share one block without overlap', () => {
    expect(generate([assignment({ id: 'b' }), assignment()])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:00'), scheduled('b', '17:00', '18:00')],
      unplacedAssignments: [],
    })
  })

  it('preserves an unused tail for the next assignment', () => {
    expect(
      generate([
        assignment({ estimatedMinutes: 30, dueTime: '17:00' }),
        assignment({ id: 'b', dueDate: nextDate }),
      ]),
    ).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '16:30'), scheduled('b', '16:30', '17:30')],
      unplacedAssignments: [],
    })
  })

  it('places urgent short work ahead of distant long work', () => {
    expect(
      generate([
        assignment({ id: 'distant', dueDate: '2026-10-30', estimatedMinutes: 180 }),
        assignment({ id: 'urgent', dueTime: '17:00', estimatedMinutes: 30 }),
      ]),
    ).toEqual({
      scheduledBlocks: [scheduled('urgent', '16:00', '16:30'), scheduled('distant', '16:30', '18:00')],
      unplacedAssignments: [
        { assignmentId: 'distant', reason: 'insufficientAvailableTime', remainingMinutes: 90 },
      ],
    })
  })

  it('uses the real Phase 2.2 ranking as the authoritative processing order', () => {
    const work = [
      assignment({ id: 'later', dueDate: nextDate }),
      assignment({ id: 'due-now', dueTime: '16:00' }),
      assignment({ id: 'overdue', dueDate: '2026-10-04' }),
      assignment({ id: 'long', estimatedMinutes: 120 }),
    ]
    const result = generate(work, [available('16:00', '22:00')])
    expect(result.scheduledBlocks.map((block) => block.assignmentId)).toEqual(
      rankAssignmentsByPriority(work, reference).map((entry) => entry.assignmentId),
    )
    expect(result.unplacedAssignments).toEqual([])
  })

  it.each([
    [assignment({ id: 'b' }), assignment({ id: 'a' }), 'a'],
    [assignment({ id: 'a', estimatedMinutes: 31 }), assignment({ id: 'b', estimatedMinutes: 60 }), 'b'],
    [assignment({ id: 'a', dueTime: '22:00' }), assignment({ id: 'b', dueTime: '21:00' }), 'b'],
  ])('preserves priority ID, estimate, and deadline tie-breaks (%#)', (a, b, firstId) => {
    const result = generate([a, b])
    expect(result.scheduledBlocks[0].assignmentId).toBe(firstId)
    expect(generate([b, a])).toEqual(result)
  })

  it('excludes completed work even when it has no estimate', () => {
    expect(generate([assignment({ completed: true, estimatedMinutes: undefined })])).toEqual({
      scheduledBlocks: [],
      unplacedAssignments: [],
    })
  })

  it('makes greedy capacity conflicts explicit rather than backtracking', () => {
    expect(
      generate([
        assignment({ id: 'earlier', dueTime: '17:00', estimatedMinutes: 30 }),
        assignment({ id: 'long', dueTime: '18:00', estimatedMinutes: 120 }),
      ]),
    ).toEqual({
      scheduledBlocks: [scheduled('long', '16:00', '18:00')],
      unplacedAssignments: [
        { assignmentId: 'earlier', reason: 'insufficientAvailableTime', remainingMinutes: 30 },
      ],
    })
  })
})

describe('reference time and deadlines', () => {
  it.each([
    available('13:00', '15:00'),
    available('15:00', '16:00'),
    available('17:00', '18:00', '2026-10-04'),
  ])('ignores availability ending at/before the reference (%#)', (block) => {
    expect(generate([assignment()], [block])).toEqual({
      scheduledBlocks: [],
      unplacedAssignments: [{ assignmentId: 'a', reason: 'insufficientAvailableTime', remainingMinutes: 60 }],
    })
  })

  it('clips a same-day block at the reference', () => {
    expect(generate([assignment()], [available('15:00', '18:00')]).scheduledBlocks).toEqual([
      scheduled('a', '16:00', '17:00'),
    ])
  })

  it('keeps future-day availability usable', () => {
    expect(generate([assignment({ dueDate: nextDate })], [available('08:00', '10:00', nextDate)])).toEqual({
      scheduledBlocks: [scheduled('a', '08:00', '09:00', nextDate)],
      unplacedAssignments: [],
    })
  })

  it('clips both reference and future deadline on one block', () => {
    expect(
      generate([assignment({ dueTime: '17:00', estimatedMinutes: 90 })], [available('15:00', '18:00')]),
    ).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:00')],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 30 },
      ],
    })
  })

  it('allows completion exactly at a future deadline', () => {
    expect(generate([assignment({ dueTime: '17:00' })])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:00')],
      unplacedAssignments: [],
    })
  })

  it('cannot use a block starting exactly at the future deadline', () => {
    expect(generate([assignment({ dueTime: '17:00' })], [available('17:00', '18:00')])).toEqual({
      scheduledBlocks: [],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 60 },
      ],
    })
  })

  it('cannot use later dates after a future deadline', () => {
    expect(generate([assignment()], [available('08:00', '10:00', nextDate)])).toEqual({
      scheduledBlocks: [],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 60 },
      ],
    })
  })

  it('interprets missing dueTime as 23:59 and leaves later-date capacity unused', () => {
    expect(
      generate(
        [assignment({ dueTime: undefined, estimatedMinutes: 90 })],
        [available('23:00', '23:59'), available('00:00', '01:00', nextDate)],
      ),
    ).toEqual({
      scheduledBlocks: [scheduled('a', '23:00', '23:59')],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 31 },
      ],
    })
  })

  it.each(['16:00', '15:59'])('keeps due-now/overdue work at %s schedulable', (dueTime) => {
    expect(generate([assignment({ dueTime })])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:00')],
      unplacedAssignments: [],
    })
  })

  it('schedules overdue work on a later date', () => {
    expect(
      generate([assignment({ dueDate: '2026-10-04' })], [available('08:00', '09:00', nextDate)]),
    ).toEqual({ scheduledBlocks: [scheduled('a', '08:00', '09:00', nextDate)], unplacedAssignments: [] })
  })

  it('preserves the deadline-clipped tail for another assignment', () => {
    expect(
      generate([assignment({ dueTime: '17:00', estimatedMinutes: 90 }), assignment({ id: 'b' })]),
    ).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:00'), scheduled('b', '17:00', '18:00')],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 30 },
      ],
    })
  })

  it('handles a midnight deadline without using the next-day block', () => {
    expect(
      generate(
        [assignment({ dueDate: nextDate, dueTime: '00:00', estimatedMinutes: 60 })],
        [available('23:30', '23:59'), available('00:00', '01:00', nextDate)],
      ),
    ).toEqual({
      scheduledBlocks: [scheduled('a', '23:30', '23:59')],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 31 },
      ],
    })
  })
})

describe('splitting, partial work, and estimates', () => {
  it('splits only at separated availability boundaries', () => {
    expect(
      generate(
        [assignment({ estimatedMinutes: 90 })],
        [available('16:00', '16:30'), available('18:00', '19:00')],
      ),
    ).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '16:30'), scheduled('a', '18:00', '19:00')],
      unplacedAssignments: [],
    })
  })

  it('splits across dates and completes on exact total capacity', () => {
    expect(
      generate(
        [assignment({ dueDate: nextDate, estimatedMinutes: 90 })],
        [
          available('16:00', '16:30'),
          available('08:00', '08:30', nextDate),
          available('09:00', '09:30', nextDate),
        ],
      ),
    ).toEqual({
      scheduledBlocks: [
        scheduled('a', '16:00', '16:30'),
        scheduled('a', '08:00', '08:30', nextDate),
        scheduled('a', '09:00', '09:30', nextDate),
      ],
      unplacedAssignments: [],
    })
  })

  it('allows adjacent input blocks and splits at their supplied boundary', () => {
    expect(generate([assignment()], [available('16:00', '16:30'), available('16:30', '17:00')])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '16:30'), scheduled('a', '16:30', '17:00')],
      unplacedAssignments: [],
    })
  })

  it('places partial work and reports the exact remainder', () => {
    expect(generate([assignment({ estimatedMinutes: 120 })], [available('16:00', '17:15')])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:15')],
      unplacedAssignments: [{ assignmentId: 'a', reason: 'insufficientAvailableTime', remainingMinutes: 45 }],
    })
  })

  it('reports capacity exhaustion when all supplied time is before the deadline', () => {
    expect(
      generate([assignment({ dueTime: '18:00', estimatedMinutes: 120 })], [available('16:00', '17:00')])
        .unplacedAssignments,
    ).toEqual([{ assignmentId: 'a', reason: 'insufficientAvailableTime', remainingMinutes: 60 }])
  })

  it('reports a deadline restriction even when total capacity is also insufficient', () => {
    expect(generate([assignment({ dueTime: '17:00', estimatedMinutes: 180 })]).unplacedAssignments).toEqual([
      { assignmentId: 'a', reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 120 },
    ])
  })

  it('does not allocate partially placed work twice or reuse its consumed minutes', () => {
    expect(generate([assignment({ estimatedMinutes: 180 }), assignment({ id: 'b' })])).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '18:00')],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'insufficientAvailableTime', remainingMinutes: 60 },
        { assignmentId: 'b', reason: 'insufficientAvailableTime', remainingMinutes: 60 },
      ],
    })
  })

  it.each([undefined, 0])('reports estimate %s without consuming any availability', (estimatedMinutes) => {
    const a = assignment({ estimatedMinutes, dueDate: '2026-10-04' })
    expect(generate([a, assignment({ id: 'b' })])).toEqual({
      scheduledBlocks: [scheduled('b', '16:00', '17:00')],
      unplacedAssignments: [
        estimatedMinutes === undefined
          ? { assignmentId: 'a', reason: 'missingEstimate' }
          : { assignmentId: 'a', reason: 'zeroEstimate', remainingMinutes: 0 },
      ],
    })
  })

  it('reports missing and zero estimates even without availability', () => {
    expect(
      generate(
        [assignment({ estimatedMinutes: undefined }), assignment({ id: 'b', estimatedMinutes: 0 })],
        [],
      ),
    ).toEqual({
      scheduledBlocks: [],
      unplacedAssignments: [
        { assignmentId: 'a', reason: 'missingEstimate' },
        { assignmentId: 'b', reason: 'zeroEstimate', remainingMinutes: 0 },
      ],
    })
  })

  it('allows one-minute work without a minimum session size', () => {
    expect(generate([assignment({ estimatedMinutes: 1 })]).scheduledBlocks).toEqual([
      scheduled('a', '16:00', '16:01'),
    ])
  })

  it('returns only positive blocks when an assignment ends at a boundary', () => {
    expect(
      generate(
        [assignment({ estimatedMinutes: 30 })],
        [available('16:00', '16:30'), available('18:00', '19:00')],
      ),
    ).toEqual({ scheduledBlocks: [scheduled('a', '16:00', '16:30')], unplacedAssignments: [] })
  })
})

describe('input integrity', () => {
  it.each(['9:00', '24:00', '16:60', '16:00:00', '16:00\n'])('rejects malformed time %j', (startTime) => {
    expect(() => generate([assignment()], [{ ...available('16:00', '18:00'), startTime }])).toThrow(
      RangeError,
    )
  })

  it('rejects malformed end times', () => {
    expect(() => generate([assignment()], [{ ...available('16:00', '18:00'), endTime: 'oops' }])).toThrow(
      RangeError,
    )
  })

  it.each([available('16:00', '16:00'), available('18:00', '16:00'), available('23:00', '01:00')])(
    'rejects zero, negative, and overnight intervals (%#)',
    (block) => {
      expect(() => generate([assignment()], [block])).toThrow(RangeError)
    },
  )

  it.each([0, -1, 119, 121, 120.5, NaN, Infinity])(
    'rejects wrong duration metadata %s',
    (durationMinutes) => {
      expect(() => generate([assignment()], [{ ...available('16:00', '18:00'), durationMinutes }])).toThrow(
        RangeError,
      )
    },
  )

  it.each([
    [available('16:00', '18:00'), available('17:00', '19:00')],
    [available('16:00', '18:00'), available('16:30', '17:00')],
    [available('16:00', '18:00'), available('16:00', '18:00')],
  ])('rejects overlapping, nested, and duplicate availability (%#)', (first, second) => {
    const blocks = [first, second]
    expect(() => generate([assignment()], blocks)).toThrow(RangeError)
    expect(() => generate([assignment()], [...blocks].reverse())).toThrow(RangeError)
  })

  it('validates availability even when past or there is no active work', () => {
    expect(() => generate([], [{ ...available('13:00', '15:00'), durationMinutes: 1 }])).toThrow(RangeError)
    expect(() => generate([], [available('13:00', '15:00'), available('14:00', '16:00')])).toThrow(RangeError)
  })

  it.each(['2026-02-30', '2026-13-01', '0000-01-01', '2026-1-05', '2026-10-05\n'])(
    'rejects invalid availability date %j',
    (date) => {
      expect(() => generate([], [available('16:00', '18:00', date)])).toThrow(RangeError)
    },
  )

  it.each([-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid active estimate %s',
    (estimate) => {
      expect(() => generate([assignment({ estimatedMinutes: estimate })])).toThrow(RangeError)
    },
  )

  it('rejects duplicate active IDs rather than conflating their work', () => {
    expect(() => generate([assignment(), assignment({ estimatedMinutes: 30 })])).toThrow(RangeError)
  })

  it('inherits priority validation for reference and active deadlines', () => {
    expect(() => generateAssignmentSchedule([], [], { date: '2026-02-30', time: '16:00' })).toThrow(
      RangeError,
    )
    expect(() => generateAssignmentSchedule([], [], { ...reference, time: '24:00' })).toThrow(RangeError)
    expect(() => generate([assignment({ dueTime: '24:00' })])).toThrow(RangeError)
  })

  it('ignores invalid fields of completed work as Phase 2.2 does', () => {
    expect(generate([assignment({ completed: true, dueDate: 'invalid', estimatedMinutes: -1 })])).toEqual({
      scheduledBlocks: [],
      unplacedAssignments: [],
    })
  })
})

describe('composition and quality properties', () => {
  it('consumes Phase 2.1 output without recomputing commitments', () => {
    const blocks = calculateAvailableTime(
      [{ date: reference.date, startTime: '15:00', endTime: '20:00' }],
      [
        {
          id: 'c',
          title: 'Sport',
          date: reference.date,
          startTime: '17:00',
          endTime: '18:00',
          createdAt: '',
        },
      ],
    )
    expect(generate([assignment({ estimatedMinutes: 150 })], blocks)).toEqual({
      scheduledBlocks: [scheduled('a', '16:00', '17:00'), scheduled('a', '18:00', '19:30')],
      unplacedAssignments: [],
    })
  })

  it('does not mutate assignments, availability, or reference, including frozen inputs', () => {
    const work = Object.freeze([Object.freeze(assignment({ dueTime: undefined, estimatedMinutes: 90 }))])
    const blocks = Object.freeze([Object.freeze(available('15:00', '18:00'))])
    const now = Object.freeze({ ...reference })
    const before = structuredClone({ work, blocks, now })
    generateAssignmentSchedule(work, blocks, now)
    expect({ work, blocks, now }).toEqual(before)
  })

  it('is chronological, deterministic, bounded, and conservative across input permutations', () => {
    const work = [
      assignment({ id: 'overdue', dueDate: '2026-10-04', estimatedMinutes: 31 }),
      assignment({ id: 'a', dueTime: '17:00', estimatedMinutes: 60 }),
      assignment({ id: 'b', dueDate: nextDate, estimatedMinutes: 120 }),
      assignment({ id: 'c', dueDate: nextDate, estimatedMinutes: 90 }),
      assignment({ id: 'missing', estimatedMinutes: undefined }),
    ]
    const blocks = [
      available('18:00', '19:00', nextDate),
      available('15:00', '18:00'),
      available('19:00', '20:00'),
    ]
    const result = generate(work, blocks)
    for (const items of [work, [...work].reverse(), [...work.slice(2), ...work.slice(0, 2)]]) {
      for (const windows of [blocks, [...blocks].reverse(), [...blocks.slice(1), blocks[0]]]) {
        expect(generate(items, windows)).toEqual(result)
      }
    }
    const keys = result.scheduledBlocks.map((block) => `${block.date} ${block.startTime}`)
    expect(keys).toEqual([...keys].sort())
    for (const [index, block] of result.scheduledBlocks.entries()) {
      expect(block.durationMinutes).toBeGreaterThan(0)
      expect(block.durationMinutes).toBe(minutes(block.endTime) - minutes(block.startTime))
      expect(`${block.date} ${block.startTime}` >= `${reference.date} ${reference.time}`).toBe(true)
      expect(
        blocks.some(
          (window) =>
            window.date === block.date &&
            window.startTime <= block.startTime &&
            window.endTime >= block.endTime,
        ),
      ).toBe(true)
      const previous = result.scheduledBlocks[index - 1]
      if (previous)
        expect(`${previous.date} ${previous.endTime}` <= `${block.date} ${block.startTime}`).toBe(true)
      const item = work.find((entry) => entry.id === block.assignmentId)!
      const deadline = `${item.dueDate} ${item.dueTime ?? '23:59'}`
      if (deadline > `${reference.date} ${reference.time}`)
        expect(`${block.date} ${block.endTime}` <= deadline).toBe(true)
    }
    for (const item of work.filter((entry) => entry.estimatedMinutes !== undefined)) {
      const placed = result.scheduledBlocks
        .filter((block) => block.assignmentId === item.id)
        .reduce((total, block) => total + block.durationMinutes, 0)
      const remaining =
        result.unplacedAssignments.find((entry) => entry.assignmentId === item.id)?.remainingMinutes ?? 0
      expect(placed).toBeLessThanOrEqual(item.estimatedMinutes!)
      expect(placed + remaining).toBe(item.estimatedMinutes)
    }
  })

  it('does not read the runtime clock', () => {
    const spy = vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Implicit clock read')
    })
    try {
      expect(generate([assignment()]).scheduledBlocks).toEqual([scheduled('a', '16:00', '17:00')])
      expect(spy).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })

  it.each([
    ['2026-03-08', '01:30', '03:30'],
    ['2026-11-01', '00:30', '02:30'],
    ['2028-02-29', '16:00', '18:00'],
    ['0099-01-01', '16:00', '18:00'],
  ])('uses calendar minutes across DST, leap dates, and early years (%s)', (date, start, end) => {
    const result = generateAssignmentSchedule(
      [assignment({ dueDate: date, dueTime: end, estimatedMinutes: 120 })],
      [available(start, end, date)],
      { date, time: start },
    )
    expect(result).toEqual({ scheduledBlocks: [scheduled('a', start, end, date)], unplacedAssignments: [] })
  })
})
