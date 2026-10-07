import { localDate, type AcademicData } from './domain'
import type { UnplacedAssignment } from './placement'
import type { PriorityReference } from './priority'
import {
  regenerateAssignmentSchedule,
  type LockedAssignmentBlock,
  type RegeneratedScheduleBlock,
  type RegenerationConflict,
} from './regeneration'
import { parseScheduleData, type ScheduleData } from './scheduleData'
import { prepareScheduleInputs, toScheduleInterval } from './scheduleInputs'
import { calculateAvailableTime, type AvailableTimeBlock } from './scheduling'

export type AcademicPlanResult =
  | {
      status: 'ok'
      availableTimeBlocks: AvailableTimeBlock[]
      scheduledBlocks: RegeneratedScheduleBlock[]
      unplacedAssignments: UnplacedAssignment[]
      expiredLockedBlocks: LockedAssignmentBlock[]
    }
  | {
      status: 'conflict'
      availableTimeBlocks: AvailableTimeBlock[]
      conflicts: RegenerationConflict[]
      expiredLockedBlocks: LockedAssignmentBlock[]
    }

/** Converts caller-provided local time. Capturing now belongs to the UI, never this helper. */
export function referenceFromDate(date: Date): PriorityReference {
  if (!Number.isFinite(date.getTime())) throw new RangeError('Reference date must be valid')
  return {
    date: localDate(date),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  }
}

/** One pure composition boundary; elapsed intent remains source data and earns no work credit. */
export function buildAcademicPlan(
  academic: AcademicData,
  schedule: ScheduleData,
  reference: PriorityReference,
): AcademicPlanResult {
  const parsed = parseScheduleData(schedule)
  if (parsed.status !== 'ok') throw new RangeError('Invalid schedule source data')
  const referenceMinutes = prepareScheduleInputs([], [], reference).referenceMinutes
  const availableTimeBlocks = calculateAvailableTime(parsed.data.planningWindows, academic.commitments)
  const expiredLockedBlocks: LockedAssignmentBlock[] = []
  const activeLockedBlocks: LockedAssignmentBlock[] = []
  for (const block of parsed.data.lockedBlocks) {
    if (toScheduleInterval(block).end <= referenceMinutes) expiredLockedBlocks.push(block)
    else activeLockedBlocks.push(block)
  }
  expiredLockedBlocks.sort((a, b) => {
    const chronological =
      toScheduleInterval(a).start - toScheduleInterval(b).start ||
      toScheduleInterval(a).end - toScheduleInterval(b).end
    return chronological || (a.blockId < b.blockId ? -1 : a.blockId > b.blockId ? 1 : 0)
  })
  const result = regenerateAssignmentSchedule(
    academic.assignments,
    availableTimeBlocks,
    activeLockedBlocks,
    reference,
  )
  return { ...result, availableTimeBlocks, expiredLockedBlocks }
}
