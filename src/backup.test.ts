import { afterEach, describe, expect, it, vi } from 'vitest'
import { createBackupPayload, serializeBackup } from './backup'
import { demoData, emptyData } from './domain'
import { emptyScheduleData } from './scheduleData'
import { scheduleFixture } from './testFixtures/schedule'

afterEach(() => vi.restoreAllMocks())
const timestamp = '2026-10-06T19:00:00-04:00'

describe('versioned pure backup', () => {
  it('joins source stores and preserves every supported academic and schedule field', () => {
    const academic = demoData('2026-10-06'),
      schedule = scheduleFixture()
    academic.assignments[0] = { ...academic.assignments[0], dueTime: '21:00', notes: 'Private work notes' }
    academic.assessments[0].notes = 'Review'
    academic.commitments[0].notes = 'Fixed'
    expect(createBackupPayload(academic, schedule, timestamp)).toEqual({
      backupVersion: 1,
      exportedAt: timestamp,
      academic,
      schedule,
    })
  })
  it('emits deterministic valid JSON', () => {
    const academic = demoData('2026-10-06'),
      schedule = scheduleFixture()
    const json = serializeBackup(academic, schedule, timestamp)
    const parsed: unknown = JSON.parse(json)
    expect(parsed).toEqual(createBackupPayload(academic, schedule, timestamp))
    expect(serializeBackup(academic, schedule, timestamp)).toBe(json)
  })
  it('supports empty source stores without an implicit clock', () => {
    vi.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('Implicit clock')
    })
    vi.spyOn(Date.prototype, 'toISOString').mockImplementation(() => {
      throw new Error('Implicit clock')
    })
    expect(createBackupPayload(emptyData(), emptyScheduleData(), timestamp)).toEqual({
      backupVersion: 1,
      exportedAt: timestamp,
      academic: emptyData(),
      schedule: emptyScheduleData(),
    })
  })
  it('does not mutate or alias source entities and collections', () => {
    const academic = demoData('2026-10-06'),
      schedule = scheduleFixture()
    const before = JSON.stringify({ academic, schedule })
    for (const collection of [
      academic.classes,
      academic.assignments,
      academic.assessments,
      academic.commitments,
      schedule.planningWindows,
      schedule.lockedBlocks,
    ]) {
      collection.forEach(Object.freeze)
      Object.freeze(collection)
    }
    Object.freeze(academic)
    Object.freeze(schedule)
    const result = createBackupPayload(academic, schedule, timestamp)
    result.academic.classes[0].name = 'Changed'
    result.academic.assignments[0].title = 'Changed'
    result.academic.assessments[0].title = 'Changed'
    result.academic.commitments[0].title = 'Changed'
    result.schedule.planningWindows[0].id = 'Changed'
    result.schedule.lockedBlocks[0].blockId = 'Changed'
    expect(JSON.stringify({ academic, schedule })).toBe(before)
  })
  it('projects only supported academic fields and rejects transient schedule fields', () => {
    const academic = { ...emptyData(), uiState: {}, conflicts: [], generatedBlocks: [] }
    expect(Object.keys(createBackupPayload(academic, emptyScheduleData(), timestamp))).toEqual([
      'backupVersion',
      'exportedAt',
      'academic',
      'schedule',
    ])
    expect(createBackupPayload(academic, emptyScheduleData(), timestamp).academic).toEqual(emptyData())
    const schedule = { ...emptyScheduleData(), scheduledBlocks: [], conflicts: [], unplacedAssignments: [] }
    expect(() => createBackupPayload(academic, schedule, timestamp)).toThrow(RangeError)
  })
  it('backup schedule contains exactly source/intent fields', () => {
    const result = createBackupPayload(emptyData(), scheduleFixture(), timestamp)
    expect(Object.keys(result.schedule)).toEqual(['version', 'planningWindows', 'lockedBlocks'])
    expect(Object.keys(result.schedule.planningWindows[0])).toEqual(['id', 'date', 'startTime', 'endTime'])
    expect(Object.keys(result.schedule.lockedBlocks[0])).toEqual([
      'blockId',
      'assignmentId',
      'date',
      'startTime',
      'endTime',
      'durationMinutes',
    ])
  })
})
