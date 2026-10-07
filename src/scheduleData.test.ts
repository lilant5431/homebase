import { describe, expect, it } from 'vitest'
import { emptyScheduleData, parseScheduleData } from './scheduleData'
import { scheduleFixture } from './testFixtures/schedule'
import { toScheduleInterval } from './scheduleInputs'

describe('schedule source schema', () => {
  it('constructs fresh empty arrays', () => {
    const a = emptyScheduleData(),
      b = emptyScheduleData()
    expect(a).toEqual({ version: 1, planningWindows: [], lockedBlocks: [] })
    a.planningWindows.push(scheduleFixture().planningWindows[0])
    expect(b.planningWindows).toEqual([])
    expect(a.lockedBlocks).not.toBe(b.lockedBlocks)
  })
  it('parses valid source records into independent objects', () => {
    const data = scheduleFixture()
    const result = parseScheduleData(data)
    expect(result).toEqual({ status: 'ok', data })
    if (result.status !== 'ok') throw new Error('Expected valid schema')
    result.data.planningWindows[0].id = 'changed'
    result.data.lockedBlocks[0].assignmentId = 'changed'
    expect(data.planningWindows[0].id).toBe('window')
    expect(data.lockedBlocks[0].assignmentId).toBe('deleted')
  })
  it('retains overlapping/adjacent windows, overlapping locks and stale assignment intent', () => {
    const data = scheduleFixture()
    data.planningWindows.push(
      { ...data.planningWindows[0], id: 'adjacent', startTime: '18:00', endTime: '19:00' },
      { ...data.planningWindows[0], id: 'overlap' },
    )
    data.lockedBlocks.push(
      { ...data.lockedBlocks[0], blockId: 'overlap' },
      { ...data.lockedBlocks[0], blockId: 'past', date: '2000-01-01', assignmentId: '' },
    )
    expect(parseScheduleData(data)).toEqual({ status: 'ok', data })
  })
  it.each([
    null,
    [],
    {},
    { version: 1 },
    { version: 1, planningWindows: null, lockedBlocks: [] },
    { version: 1, planningWindows: [], lockedBlocks: {} },
  ])('rejects invalid root %j', (value) => {
    expect(parseScheduleData(value)).toEqual({ status: 'invalid' })
  })
  it.each([2, 0, '1', null])('distinguishes unsupported version %j', (version) => {
    expect(parseScheduleData({ ...emptyScheduleData(), version })).toEqual({
      status: 'unsupportedVersion',
      version,
    })
  })
  it.each([
    'generatedBlocks',
    'scheduledBlocks',
    'regeneratedSchedule',
    'cachedSchedule',
    'priorityScores',
    'availableTimeBlocks',
    'conflicts',
    'unplacedAssignments',
    'reference',
    'uiState',
  ])('rejects unknown/derived root field %s', (field) => {
    expect(parseScheduleData({ ...emptyScheduleData(), [field]: [] })).toEqual({ status: 'invalid' })
  })
  const invalidIntervals = [
    { date: '2026-2-01' },
    { date: '2026-02-29' },
    { date: '2026-04-31' },
    { date: '0000-01-01' },
    { date: '2026-01-01\n' },
    { date: null },
    { startTime: '9:00' },
    { startTime: '24:00' },
    { endTime: '18:60' },
    { startTime: null },
    { endTime: '16:00' },
    { endTime: '15:00' },
  ]
  describe.each(['planningWindows', 'lockedBlocks'] as const)('%s', (collection) => {
    it.each(invalidIntervals)('rejects bad interval %j', (override) => {
      const data = scheduleFixture()
      const value = { ...data, [collection]: [{ ...data[collection][0], ...override }] }
      expect(parseScheduleData(value)).toEqual({ status: 'invalid' })
    })
    it.each([null, 1, 'record', []])('rejects malformed record %j', (record) => {
      expect(parseScheduleData({ ...scheduleFixture(), [collection]: [record] })).toEqual({
        status: 'invalid',
      })
    })
    it('rejects duplicate IDs', () => {
      const data = scheduleFixture()
      expect(
        parseScheduleData({ ...data, [collection]: [data[collection][0], data[collection][0]] }),
      ).toEqual({ status: 'invalid' })
    })
    it('rejects unknown record fields rather than dropping intent', () => {
      const data = scheduleFixture()
      expect(
        parseScheduleData({ ...data, [collection]: [{ ...data[collection][0], source: 'generated' }] }),
      ).toEqual({ status: 'invalid' })
    })
  })
  it.each(['', null, 42])('rejects invalid window ID %j', (id) => {
    const data = scheduleFixture()
    expect(parseScheduleData({ ...data, planningWindows: [{ ...data.planningWindows[0], id }] })).toEqual({
      status: 'invalid',
    })
  })
  it.each(['', null, 42])('rejects invalid block ID %j', (blockId) => {
    const data = scheduleFixture()
    expect(parseScheduleData({ ...data, lockedBlocks: [{ ...data.lockedBlocks[0], blockId }] })).toEqual({
      status: 'invalid',
    })
  })
  it.each([null, 42])('requires string assignment ID %j', (assignmentId) => {
    const data = scheduleFixture()
    expect(parseScheduleData({ ...data, lockedBlocks: [{ ...data.lockedBlocks[0], assignmentId }] })).toEqual(
      { status: 'invalid' },
    )
  })
  it.each([0, -30, 1.5, 29, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '30'])(
    'rejects invalid/mismatched lock duration %s',
    (durationMinutes) => {
      const data = scheduleFixture()
      expect(
        parseScheduleData({ ...data, lockedBlocks: [{ ...data.lockedBlocks[0], durationMinutes }] }),
      ).toEqual({ status: 'invalid' })
    },
  )
  it.each(['0001-01-01', '0099-01-01', '2028-02-29', '9999-12-31'])(
    'shares calendar rules with engine for %s',
    (date) => {
      const data = scheduleFixture()
      data.planningWindows[0].date = date
      data.lockedBlocks[0].date = date
      expect(parseScheduleData(data).status).toBe('ok')
      expect(() => toScheduleInterval({ ...data.planningWindows[0], durationMinutes: 120 })).not.toThrow()
      expect(() => toScheduleInterval(data.lockedBlocks[0])).not.toThrow()
    },
  )
})

describe('adversarial caller structures', () => {
  it.each(['planningWindows', 'lockedBlocks'] as const)(
    'rejects sparse %s instead of serializing holes to null',
    (collection) => {
      expect(parseScheduleData({ ...emptyScheduleData(), [collection]: new Array(1) })).toEqual({
        status: 'invalid',
      })
    },
  )
  it('accepts frozen source input without modification', () => {
    const data = scheduleFixture()
    data.planningWindows.forEach(Object.freeze)
    data.lockedBlocks.forEach(Object.freeze)
    Object.freeze(data.planningWindows)
    Object.freeze(data.lockedBlocks)
    Object.freeze(data)
    expect(parseScheduleData(data)).toEqual({ status: 'ok', data })
  })
  it.each(['id', 'date', 'startTime', 'endTime'])('rejects missing window field %s', (field) => {
    const record: Record<string, unknown> = { ...scheduleFixture().planningWindows[0] }
    delete record[field]
    expect(parseScheduleData({ ...emptyScheduleData(), planningWindows: [record] })).toEqual({
      status: 'invalid',
    })
  })
  it.each(['blockId', 'assignmentId', 'date', 'startTime', 'endTime', 'durationMinutes'])(
    'rejects missing lock field %s',
    (field) => {
      const record: Record<string, unknown> = { ...scheduleFixture().lockedBlocks[0] }
      delete record[field]
      expect(parseScheduleData({ ...emptyScheduleData(), lockedBlocks: [record] })).toEqual({
        status: 'invalid',
      })
    },
  )
})
