import type { LockedAssignmentBlock } from './regeneration'
import type { PlanningWindow } from './scheduling'
import { timeToMinutes, toScheduleInterval } from './scheduleInputs'

export type StoredPlanningWindow = PlanningWindow & { id: string }
export type ScheduleData = {
  version: 1
  planningWindows: StoredPlanningWindow[]
  lockedBlocks: LockedAssignmentBlock[]
}
export type ScheduleParseResult =
  | { status: 'ok'; data: ScheduleData }
  | { status: 'invalid' }
  | { status: 'unsupportedVersion'; version: unknown }

export function emptyScheduleData(): ScheduleData {
  return { version: 1, planningWindows: [], lockedBlocks: [] }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new RangeError('Expected a schedule record')
  }
  return value as Record<string, unknown>
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const actual = Reflect.ownKeys(value)
  if (actual.length !== keys.length || !keys.every((key) => Object.hasOwn(value, key))) {
    throw new RangeError('Schedule records must contain only the versioned schema fields')
  }
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw new RangeError('Expected a string')
  return value
}
function id(value: unknown): string {
  const result = text(value)
  if (result.length === 0) throw new RangeError('IDs must be nonempty')
  return result
}
function interval(value: Record<string, unknown>): PlanningWindow {
  const date = text(value.date),
    startTime = text(value.startTime),
    endTime = text(value.endTime)
  // Reuse the existing calendar/time/positive-interval contract, without allocation or feasibility rules.
  toScheduleInterval({
    date,
    startTime,
    endTime,
    durationMinutes: timeToMinutes(endTime) - timeToMinutes(startTime),
  })
  return { date, startTime, endTime }
}
function planningWindow(value: unknown): StoredPlanningWindow {
  const input = record(value)
  exactKeys(input, ['id', 'date', 'startTime', 'endTime'])
  return { id: id(input.id), ...interval(input) }
}
function lockedBlock(value: unknown): LockedAssignmentBlock {
  const input = record(value)
  exactKeys(input, ['blockId', 'assignmentId', 'date', 'startTime', 'endTime', 'durationMinutes'])
  const duration = input.durationMinutes
  if (typeof duration !== 'number' || !Number.isSafeInteger(duration) || duration <= 0) {
    throw new RangeError('Locked duration must be positive safe whole minutes')
  }
  const result = {
    blockId: id(input.blockId),
    assignmentId: text(input.assignmentId),
    ...interval(input),
    durationMinutes: duration,
  }
  toScheduleInterval(result)
  return result
}
function unique(ids: readonly string[]): void {
  if (new Set(ids).size !== ids.length) throw new RangeError('Schedule record IDs must be unique')
}

/** Strict v1 parser; fresh records, no clock, storage access, normalization, or lock feasibility checks. */
export function parseScheduleData(value: unknown): ScheduleParseResult {
  try {
    const input = record(value)
    if (!Object.hasOwn(input, 'version')) return { status: 'invalid' }
    if (input.version !== 1) return { status: 'unsupportedVersion', version: input.version }
    exactKeys(input, ['version', 'planningWindows', 'lockedBlocks'])
    if (!Array.isArray(input.planningWindows) || !Array.isArray(input.lockedBlocks))
      return { status: 'invalid' }
    // Array.from visits holes too: sparse caller arrays must not serialize as corrupt null records.
    const planningWindows = Array.from(input.planningWindows, (item: unknown) => planningWindow(item))
    const lockedBlocks = Array.from(input.lockedBlocks, (item: unknown) => lockedBlock(item))
    unique(planningWindows.map((item) => item.id))
    unique(lockedBlocks.map((item) => item.blockId))
    return { status: 'ok', data: { version: 1, planningWindows, lockedBlocks } }
  } catch {
    return { status: 'invalid' }
  }
}
