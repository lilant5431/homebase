// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Assignment } from './domain'
import {
  rankAssignmentsByPriority,
  scoreAssignmentPriority,
  type PriorityBand,
  type PriorityReference,
} from './priority'

const reference: PriorityReference = { date: '2026-10-05', time: '12:00' }
const assignment = (overrides: Partial<Assignment> = {}): Assignment => ({
  id: 'assignment-1',
  classId: 'class-1',
  title: 'Schoolwork',
  dueDate: reference.date,
  dueTime: '13:00',
  completed: false,
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
  ...overrides,
})
const dueIn = (minutes: number, overrides: Partial<Assignment> = {}): Assignment => {
  const date = new Date(Date.UTC(2026, 9, 5, 12) + minutes * 60_000).toISOString()
  return assignment({ dueDate: date.slice(0, 10), dueTime: date.slice(11, 16), ...overrides })
}
const ids = (items: readonly Assignment[]) =>
  rankAssignmentsByPriority(items, reference).map((item) => item.assignmentId)

describe('deadline priority', () => {
  it.each<[number, PriorityBand, number]>([
    [-60, 'overdue', 100],
    [60, 'within6Hours', 90],
    [600, 'within24Hours', 80],
    [1800, 'within48Hours', 70],
    [3600, 'within3Days', 60],
    [6000, 'within7Days', 50],
    [15000, 'within14Days', 35],
    [30000, 'later', 20],
  ])('scores a deadline %i minutes away in band %s with %i base points', (minutes, band, points) => {
    expect(scoreAssignmentPriority(dueIn(minutes), reference)).toEqual({
      assignmentId: 'assignment-1',
      score: points,
      band,
      minutesUntilDue: minutes,
      deadlinePoints: points,
      workloadPoints: 0,
    })
  })

  it.each<[number, PriorityBand, PriorityBand]>([
    [-1, 'overdue', 'within6Hours'],
    [360, 'within6Hours', 'within24Hours'],
    [1440, 'within24Hours', 'within48Hours'],
    [2880, 'within48Hours', 'within3Days'],
    [4320, 'within3Days', 'within7Days'],
    [10080, 'within7Days', 'within14Days'],
    [20160, 'within14Days', 'later'],
  ])('uses inclusive deadline boundary %i with a transition one minute later', (minutes, band, nextBand) => {
    expect(scoreAssignmentPriority(dueIn(minutes - 1), reference)?.band).toBe(band)
    expect(scoreAssignmentPriority(dueIn(minutes), reference)?.band).toBe(band)
    expect(scoreAssignmentPriority(dueIn(minutes + 1), reference)?.band).toBe(nextBand)
  })

  it('treats a deadline exactly at the reference time as due now rather than overdue', () => {
    expect(scoreAssignmentPriority(dueIn(0), reference)).toMatchObject({
      minutesUntilDue: 0,
      band: 'within6Hours',
      deadlinePoints: 90,
    })
  })

  it('respects explicit due times on either side of the same-day reference', () => {
    expect(scoreAssignmentPriority(assignment({ dueTime: '11:59' }), reference)).toMatchObject({
      minutesUntilDue: -1,
      band: 'overdue',
    })
    expect(scoreAssignmentPriority(assignment({ dueTime: '12:01' }), reference)).toMatchObject({
      minutesUntilDue: 1,
      band: 'within6Hours',
    })
  })

  it('interprets missing dueTime as 23:59 without inserting it into the assignment', () => {
    const item = assignment({ dueTime: undefined })
    expect(scoreAssignmentPriority(item, reference)).toMatchObject({
      minutesUntilDue: 719,
      band: 'within24Hours',
      deadlinePoints: 80,
    })
    expect(item.dueTime).toBeUndefined()
  })

  it('handles an end-of-day deadline crossing midnight by exactly one minute', () => {
    expect(
      scoreAssignmentPriority(assignment({ dueTime: undefined }), { date: '2026-10-06', time: '00:00' }),
    ).toMatchObject({ minutesUntilDue: -1, band: 'overdue' })
  })

  it('does not increase overdue base points as lateness grows', () => {
    const recent = scoreAssignmentPriority(dueIn(-1), reference)!
    const old = scoreAssignmentPriority(dueIn(-100000), reference)!
    expect(old.deadlinePoints).toBe(recent.deadlinePoints)
    expect(old.score).toBe(100)
  })
})

describe('workload adjustment', () => {
  it('gives missing estimates zero workload points', () => {
    expect(scoreAssignmentPriority(assignment(), reference)?.workloadPoints).toBe(0)
  })

  it.each([
    [0, 0],
    [1, 0],
    [30, 0],
    [31, 2],
    [60, 2],
    [61, 4],
    [120, 4],
    [121, 6],
    [100000, 6],
  ])('gives an estimate of %i minutes exactly %i workload points', (estimatedMinutes, points) => {
    const result = scoreAssignmentPriority(assignment({ estimatedMinutes }), reference)!
    expect(result.workloadPoints).toBe(points)
    expect(result.score).toBe(result.deadlinePoints + points)
  })

  it.each([-1, 360, 1440, 2880, 4320, 10080, 20160])(
    'cannot let workload cross the urgency boundary after minute %i',
    (boundary) => {
      const urgent = dueIn(boundary, { id: 'short', estimatedMinutes: 15 })
      const lessUrgent = dueIn(boundary + 1, { id: 'long', estimatedMinutes: 100000 })
      expect(ids([lessUrgent, urgent])).toEqual(['short', 'long'])
    },
  )

  it('ranks urgent short work above distant long work', () => {
    expect(
      ids([
        dueIn(30000, { id: 'distant', estimatedMinutes: 240 }),
        dueIn(60, { id: 'urgent', estimatedMinutes: 15 }),
      ]),
    ).toEqual(['urgent', 'distant'])
  })
})

describe('active ranking and tie-breaks', () => {
  it('returns null for completed work and excludes it from rankings', () => {
    const completed = dueIn(-100, { id: 'completed', completed: true, estimatedMinutes: 240 })
    const active = dueIn(30000, { id: 'active' })
    expect(scoreAssignmentPriority(completed, reference)).toBeNull()
    expect(ids([completed, active])).toEqual(['active'])
    expect(rankAssignmentsByPriority([completed], reference)).toEqual([])
  })

  it('returns an empty ranking for an empty assignment list', () => {
    expect(rankAssignmentsByPriority([], reference)).toEqual([])
  })

  it('ranks higher total scores first within the same deadline band', () => {
    expect(
      ids([
        dueIn(300, { id: 'long', estimatedMinutes: 90 }),
        dueIn(60, { id: 'short', estimatedMinutes: 15 }),
      ]),
    ).toEqual(['long', 'short'])
  })

  it('breaks score ties by earlier actual deadline before estimated duration', () => {
    expect(
      ids([
        dueIn(300, { id: 'later', estimatedMinutes: 60 }),
        dueIn(60, { id: 'earlier', estimatedMinutes: 31 }),
      ]),
    ).toEqual(['earlier', 'later'])
  })

  it('ranks earlier overdue deadlines first when scores are equal', () => {
    expect(ids([dueIn(-60, { id: 'recent' }), dueIn(-1440, { id: 'older' })])).toEqual(['older', 'recent'])
  })

  it('compares interpreted end-of-day deadlines with explicit deadlines', () => {
    expect(
      ids([
        assignment({ id: 'end-of-day', dueTime: undefined }),
        assignment({ id: 'explicit', dueTime: '23:00' }),
      ]),
    ).toEqual(['explicit', 'end-of-day'])
  })

  it('breaks equal score and deadline ties by longer estimated duration', () => {
    expect(
      ids([
        dueIn(60, { id: 'shorter', estimatedMinutes: 31 }),
        dueIn(60, { id: 'longer', estimatedMinutes: 60 }),
      ]),
    ).toEqual(['longer', 'shorter'])
  })

  it('treats missing estimates as zero only for the duration tie-break', () => {
    expect(ids([assignment({ id: 'missing' }), assignment({ id: 'known', estimatedMinutes: 15 })])).toEqual([
      'known',
      'missing',
    ])
  })

  it('resolves final ties with ascending ID code units, independent of locale', () => {
    expect(ids(['z', 'a', 'B', 'A'].map((id) => assignment({ id })))).toEqual(['A', 'B', 'a', 'z'])
  })

  it('returns the same ranking when input order is reversed', () => {
    const items = [
      dueIn(-60, { id: 'overdue' }),
      dueIn(60, { id: 'shorter', estimatedMinutes: 31 }),
      dueIn(60, { id: 'longer', estimatedMinutes: 60 }),
      dueIn(30000, { id: 'z' }),
      dueIn(30000, { id: 'a' }),
    ]
    expect(rankAssignmentsByPriority([...items].reverse(), reference)).toEqual(
      rankAssignmentsByPriority(items, reference),
    )
  })

  it('does not mutate frozen assignments, the array, or the reference', () => {
    const items = Object.freeze([
      Object.freeze(assignment({ id: 'missing-time', dueTime: undefined })),
      Object.freeze(dueIn(-60, { id: 'overdue', estimatedMinutes: 90 })),
    ])
    const fixedReference = Object.freeze({ ...reference })
    const original = JSON.stringify({ items, fixedReference })
    expect(rankAssignmentsByPriority(items, fixedReference)).toHaveLength(2)
    expect(scoreAssignmentPriority(items[0], fixedReference)).not.toBeNull()
    expect(JSON.stringify({ items, fixedReference })).toBe(original)
  })

  it('repeated scoring and ranking yield identical fresh results', () => {
    const item = dueIn(60, { estimatedMinutes: 90 })
    expect(scoreAssignmentPriority(item, reference)).toEqual(scoreAssignmentPriority(item, reference))
    const first = rankAssignmentsByPriority([item], reference)
    const second = rankAssignmentsByPriority([item], reference)
    expect(first).toEqual(second)
    expect(first[0]).not.toBe(second[0])
  })

  it('returns the same breakdown from individual scoring and ranking, with total equal to its components', () => {
    const items = [-60, 60, 600, 1800, 3600, 6000, 15000, 30000].map((minutes, index) =>
      dueIn(minutes, { id: String(index), estimatedMinutes: index * 30 }),
    )
    for (const result of rankAssignmentsByPriority(items, reference)) {
      expect(result.score).toBe(result.deadlinePoints + result.workloadPoints)
      expect(
        scoreAssignmentPriority(
          items.find((item) => item.id === result.assignmentId)!,
          reference,
        ),
      ).toEqual(result)
    }
  })
})

describe('calendar arithmetic and validation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it.each([
    ['2026-03-08', '2026-03-09'],
    ['2026-11-01', '2026-11-02'],
    ['2026-01-31', '2026-02-01'],
    ['2026-12-31', '2027-01-01'],
    ['2024-02-28', '2024-02-29'],
    ['2024-02-29', '2024-03-01'],
    ['2000-02-28', '2000-02-29'],
    ['0099-12-31', '0100-01-01'],
  ])('counts %s to %s as 1440 calendar minutes', (startDate, endDate) => {
    expect(
      scoreAssignmentPriority(assignment({ dueDate: endDate, dueTime: '12:00' }), {
        date: startDate,
        time: '12:00',
      }),
    ).toMatchObject({ minutesUntilDue: 1440, band: 'within24Hours' })
  })

  it('produces identical calendar differences across runtime timezones at a daylight-saving boundary', () => {
    const item = assignment({ dueDate: '2026-03-09', dueTime: '12:00' })
    const fixedReference = { date: '2026-03-08', time: '12:00' }
    const expected = scoreAssignmentPriority(item, fixedReference)
    for (const timezone of ['UTC', 'America/New_York', 'Asia/Tokyo']) {
      vi.stubEnv('TZ', timezone)
      expect(scoreAssignmentPriority(item, fixedReference)).toEqual(expected)
    }
    expect(expected?.minutesUntilDue).toBe(1440)
  })

  it('computes the explicit reference without consulting Date.now', () => {
    vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Implicit clock access')
    })
    expect(scoreAssignmentPriority(dueIn(60), reference)?.minutesUntilDue).toBe(60)
  })

  it.each([
    '2026-2-01',
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-01-00',
    '0000-01-01',
    '1900-02-29',
    '2026-10-05\n',
  ])('rejects invalid date %s in both references and active deadlines', (date) => {
    expect(() => scoreAssignmentPriority(assignment(), { ...reference, date })).toThrow(RangeError)
    expect(() => scoreAssignmentPriority(assignment({ dueDate: date }), reference)).toThrow(RangeError)
  })

  it.each(['9:00', '24:00', '12:60', '12:00:00', '', '12:00\n'])('rejects invalid HH:mm time %s', (time) => {
    expect(() => scoreAssignmentPriority(assignment(), { ...reference, time })).toThrow(RangeError)
    expect(() => scoreAssignmentPriority(assignment({ dueTime: time }), reference)).toThrow(RangeError)
  })

  it('validates the reference even for empty or completed-only input', () => {
    const invalid = { date: reference.date, time: '24:00' }
    expect(() => rankAssignmentsByPriority([], invalid)).toThrow(RangeError)
    expect(() => scoreAssignmentPriority(assignment({ completed: true }), invalid)).toThrow(RangeError)
  })

  it.each([NaN, Infinity, -1])('rejects invalid active estimated duration %s', (estimatedMinutes) => {
    expect(() => scoreAssignmentPriority(assignment({ estimatedMinutes }), reference)).toThrow(RangeError)
  })

  it('ignores deadline and estimate fields of completed assignments', () => {
    const completed = assignment({
      completed: true,
      dueDate: 'invalid',
      dueTime: 'invalid',
      estimatedMinutes: NaN,
    })
    expect(scoreAssignmentPriority(completed, reference)).toBeNull()
    expect(rankAssignmentsByPriority([completed], reference)).toEqual([])
  })
})
