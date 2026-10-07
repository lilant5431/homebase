import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildAcademicPlan, referenceFromDate } from './planner'
import { emptyData, type AcademicData } from './domain'
import { emptyScheduleData, type ScheduleData } from './scheduleData'
import { calculateAvailableTime } from './scheduling'
import { regenerateAssignmentSchedule } from './regeneration'

const reference = { date: '2026-10-06', time: '16:00' }
function inputs(): { academic: AcademicData; schedule: ScheduleData } {
  return {
    academic: {
      ...emptyData(),
      assignments: [
        {
          id: 'a',
          classId: 'class',
          title: 'Homework',
          dueDate: reference.date,
          dueTime: '22:00',
          estimatedMinutes: 120,
          completed: false,
          createdAt: 'created',
          updatedAt: 'updated',
        },
      ],
    },
    schedule: {
      ...emptyScheduleData(),
      planningWindows: [{ id: 'window', date: reference.date, startTime: '16:00', endTime: '19:00' }],
    },
  }
}
function lock(startTime: string, endTime: string, durationMinutes: number) {
  return { blockId: 'lock', assignmentId: 'a', date: reference.date, startTime, endTime, durationMinutes }
}
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('pure academic planner', () => {
  it('composes availability and regeneration exactly without inventing defaults', () => {
    const { academic, schedule } = inputs()
    const available = calculateAvailableTime(schedule.planningWindows, academic.commitments)
    expect(buildAcademicPlan(academic, schedule, reference)).toEqual({
      availableTimeBlocks: available,
      expiredLockedBlocks: [],
      ...regenerateAssignmentSchedule(academic.assignments, available, [], reference),
    })
    expect(buildAcademicPlan(emptyData(), emptyScheduleData(), reference)).toEqual({
      status: 'ok',
      availableTimeBlocks: [],
      expiredLockedBlocks: [],
      scheduledBlocks: [],
      unplacedAssignments: [],
    })
  })
  it('subtracts commitments and uses only effective unioned source availability', () => {
    const { academic, schedule } = inputs()
    academic.commitments.push({
      id: 'c',
      title: 'Sport',
      date: reference.date,
      startTime: '17:00',
      endTime: '18:00',
      createdAt: 'created',
    })
    schedule.planningWindows.push({ ...schedule.planningWindows[0], id: 'overlap', startTime: '17:00' })
    const plan = buildAcademicPlan(academic, schedule, reference)
    expect(plan.status).toBe('ok')
    if (plan.status !== 'ok') throw new Error('Expected schedule')
    expect(plan.scheduledBlocks.map(({ startTime, endTime }) => [startTime, endTime])).toEqual([
      ['16:00', '17:00'],
      ['18:00', '19:00'],
    ])
    expect(schedule.planningWindows).toHaveLength(2)
  })
  it('delegates priority and multiple-assignment placement unchanged', () => {
    const { academic, schedule } = inputs()
    academic.assignments[0].dueTime = '23:59'
    academic.assignments.push({
      ...academic.assignments[0],
      id: 'urgent',
      estimatedMinutes: 30,
      dueTime: '17:00',
    })
    const plan = buildAcademicPlan(academic, schedule, reference)
    expect(plan).toMatchObject({
      status: 'ok',
      scheduledBlocks: [{ assignmentId: 'urgent' }, { assignmentId: 'a' }],
    })
  })
  it.each([undefined, 0])('reports estimate %s without creating work', (estimate) => {
    const { academic, schedule } = inputs()
    academic.assignments[0].estimatedMinutes = estimate
    expect(buildAcademicPlan(academic, schedule, reference)).toMatchObject({
      status: 'ok',
      scheduledBlocks: [],
      unplacedAssignments: [
        { assignmentId: 'a', reason: estimate === undefined ? 'missingEstimate' : 'zeroEstimate' },
      ],
    })
  })
  it('reports exact deadline-limited remaining work', () => {
    const { academic, schedule } = inputs()
    academic.assignments[0].dueTime = '16:30'
    expect(buildAcademicPlan(academic, schedule, reference)).toMatchObject({
      status: 'ok',
      unplacedAssignments: [{ reason: 'insufficientTimeBeforeDeadline', remainingMinutes: 90 }],
    })
  })
  it('reports capacity shortage without implicit study hours', () => {
    const { academic, schedule } = inputs()
    schedule.planningWindows = []
    expect(buildAcademicPlan(academic, schedule, reference)).toMatchObject({
      status: 'ok',
      scheduledBlocks: [],
      unplacedAssignments: [{ reason: 'insufficientAvailableTime', remainingMinutes: 120 }],
    })
  })
  it('preserves a future lock and reserves its workload/time', () => {
    const { academic, schedule } = inputs()
    schedule.lockedBlocks.push(lock('17:00', '17:30', 30))
    expect(buildAcademicPlan(academic, schedule, reference)).toMatchObject({
      status: 'ok',
      expiredLockedBlocks: [],
      scheduledBlocks: [
        { source: 'generated', durationMinutes: 60 },
        { ...schedule.lockedBlocks[0], source: 'locked' },
        { source: 'generated', durationMinutes: 30 },
      ],
    })
  })
  it.each([
    { date: '2026-10-05', startTime: '17:00', endTime: '18:00' },
    { date: reference.date, startTime: '14:00', endTime: '15:00' },
    { date: reference.date, startTime: '15:00', endTime: '16:00' },
  ])('expires fully elapsed intent with no workload/completion credit %j', (interval) => {
    const { academic, schedule } = inputs()
    academic.assignments[0].estimatedMinutes = 60
    schedule.lockedBlocks.push({ ...lock('15:00', '16:00', 60), ...interval })
    const before = JSON.stringify(schedule)
    expect(buildAcademicPlan(academic, schedule, reference)).toMatchObject({
      status: 'ok',
      expiredLockedBlocks: schedule.lockedBlocks,
      scheduledBlocks: [{ assignmentId: 'a', source: 'generated', durationMinutes: 60 }],
      unplacedAssignments: [],
    })
    expect(JSON.stringify(schedule)).toBe(before)
    expect(academic.assignments[0].completed).toBe(false)
  })
  it('retains expired zombie locks without active conflicts', () => {
    const { academic, schedule } = inputs()
    schedule.lockedBlocks.push({ ...lock('14:00', '15:00', 60), assignmentId: 'deleted' })
    expect(buildAcademicPlan(academic, schedule, reference)).toMatchObject({
      status: 'ok',
      expiredLockedBlocks: schedule.lockedBlocks,
    })
  })
  it('passes crossing-reference locks unchanged and returns atomic conflicts', () => {
    const { academic, schedule } = inputs()
    schedule.lockedBlocks.push(lock('15:30', '16:30', 60))
    const plan = buildAcademicPlan(academic, schedule, reference)
    expect(plan).toMatchObject({
      status: 'conflict',
      expiredLockedBlocks: [],
    })
    if (plan.status !== 'conflict') throw new Error('Expected conflict')
    expect(plan.conflicts.some((item) => item.reason === 'beforeReference')).toBe(true)
    expect(plan).not.toHaveProperty('scheduledBlocks')
    expect(schedule.lockedBlocks[0].startTime).toBe('15:30')
  })
  it('a lock starting exactly at reference remains active', () => {
    const { academic, schedule } = inputs()
    schedule.lockedBlocks.push(lock('16:00', '17:00', 60))
    expect(buildAcademicPlan(academic, schedule, reference)).toMatchObject({
      status: 'ok',
      expiredLockedBlocks: [],
      scheduledBlocks: [{ source: 'locked' }, { source: 'generated' }],
    })
  })
  it('returns canonical expired order regardless of source permutations', () => {
    const { academic, schedule } = inputs()
    schedule.lockedBlocks.push(lock('14:00', '15:00', 60), {
      ...lock('13:00', '14:00', 60),
      blockId: 'earlier',
    })
    const result = buildAcademicPlan(academic, schedule, reference)
    expect(result.expiredLockedBlocks.map((b) => b.blockId)).toEqual(['earlier', 'lock'])
    expect(
      buildAcademicPlan(
        { ...academic, assignments: [...academic.assignments].reverse() },
        {
          ...schedule,
          planningWindows: [...schedule.planningWindows].reverse(),
          lockedBlocks: [...schedule.lockedBlocks].reverse(),
        },
        reference,
      ),
    ).toEqual(result)
  })
  it('rejects malformed expired locks rather than hiding structural invalidity', () => {
    const { academic, schedule } = inputs()
    schedule.lockedBlocks.push(lock('14:00', '15:00', 30))
    expect(() => buildAcademicPlan(academic, schedule, reference)).toThrow(RangeError)
  })
  it('rejects invalid references even for empty input', () => {
    expect(() =>
      buildAcademicPlan(emptyData(), emptyScheduleData(), { ...reference, time: '24:00' }),
    ).toThrow(RangeError)
  })
  it('is immutable with frozen inputs and independent returned expired objects', () => {
    const { academic, schedule } = inputs()
    schedule.lockedBlocks.push(lock('14:00', '15:00', 60))
    for (const items of [
      academic.assignments,
      academic.classes,
      academic.assessments,
      academic.commitments,
      schedule.lockedBlocks,
      schedule.planningWindows,
    ]) {
      items.forEach(Object.freeze)
      Object.freeze(items)
    }
    Object.freeze(academic)
    Object.freeze(schedule)
    Object.freeze(reference)
    const before = JSON.stringify({ academic, schedule, reference })
    const plan = buildAcademicPlan(academic, schedule, reference)
    plan.expiredLockedBlocks[0].blockId = 'changed copy'
    expect(JSON.stringify({ academic, schedule, reference })).toBe(before)
  })
  it('reads no current clock or persistence and is reproducible', () => {
    const { academic, schedule } = inputs()
    vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Clock')
    })
    vi.spyOn(globalThis, 'localStorage', 'get').mockImplementation(() => {
      throw new Error('Storage')
    })
    expect(buildAcademicPlan(academic, schedule, reference)).toEqual(
      buildAcademicPlan(academic, schedule, reference),
    )
  })
})

describe('local reference conversion', () => {
  it('converts a caller date using local calendar and zero-padded minutes', () => {
    expect(referenceFromDate(new Date(2026, 9, 6, 7, 5, 59))).toEqual({ date: reference.date, time: '07:05' })
  })
  it('rejects an invalid caller date', () => {
    expect(() => referenceFromDate(new Date(NaN))).toThrow(RangeError)
  })
})

it('planner calendar validation may use a fixed epoch but never construct current time', () => {
  const { academic, schedule } = inputs()
  const RealDate = Date
  class ExplicitDate extends RealDate {
    constructor(value: number) {
      if (value === undefined) throw new Error('Implicit current-time constructor')
      super(value)
    }
    static now(): number {
      throw new Error('Implicit clock')
    }
  }
  vi.stubGlobal('Date', ExplicitDate)
  expect(buildAcademicPlan(academic, schedule, reference).status).toBe('ok')
})
