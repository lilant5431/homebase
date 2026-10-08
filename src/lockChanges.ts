import type { AcademicData } from './domain'
import { buildAcademicPlan, type AcademicPlanResult } from './planner'
import type { PriorityReference } from './priority'
import type { LockedAssignmentBlock, RegenerationConflict } from './regeneration'
import { parseScheduleData, type ScheduleData } from './scheduleData'
import { timeToMinutes, toScheduleInterval } from './scheduleInputs'

export type LockedBlockDraft = Pick<LockedAssignmentBlock, 'assignmentId' | 'date' | 'startTime' | 'endTime'>
export type LockedBlockChangeResult =
  | { status: 'ok'; schedule: ScheduleData; plan: AcademicPlanResult & { status: 'ok' } }
  | { status: 'conflict'; conflicts: RegenerationConflict[] }

/** Identity is supplied by the caller; this pure boundary never reads randomness or the clock. */
export function createLockedBlock(input: LockedBlockDraft & { blockId: string }): LockedAssignmentBlock {
  const block = {
    blockId: input.blockId,
    assignmentId: input.assignmentId,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: timeToMinutes(input.endTime) - timeToMinutes(input.startTime),
  }
  toScheduleInterval(block)
  if (!block.blockId.length) throw new RangeError('Block ID must be nonempty')
  return block
}

export function replaceOrAddLockedBlock(schedule: ScheduleData, block: LockedAssignmentBlock): ScheduleData {
  const exists = schedule.lockedBlocks.some((item) => item.blockId === block.blockId)
  return {
    ...schedule,
    lockedBlocks: exists
      ? schedule.lockedBlocks.map((item) => (item.blockId === block.blockId ? block : item))
      : [...schedule.lockedBlocks, block],
  }
}

/** Removal deliberately needs no healthy-plan preflight: other conflicts may remain for later repair. */
export function removeLockedBlock(schedule: ScheduleData, blockId: string): ScheduleData {
  return { ...schedule, lockedBlocks: schedule.lockedBlocks.filter((item) => item.blockId !== blockId) }
}

export function preflightLockedBlockChange(
  academic: AcademicData,
  schedule: ScheduleData,
  block: LockedAssignmentBlock,
  reference: PriorityReference,
): LockedBlockChangeResult {
  const parsed = parseScheduleData(replaceOrAddLockedBlock(schedule, block))
  if (parsed.status !== 'ok') throw new RangeError('Invalid candidate schedule')
  const plan = buildAcademicPlan(academic, parsed.data, reference)
  // The planner retains elapsed existing intent without credit. A *newly submitted* session must
  // not exploit that exclusion to save past intent: crossing intervals are rejected by regeneration.
  const elapsedCandidate = plan.expiredLockedBlocks.some((item) => item.blockId === block.blockId)
  const elapsedConflict: RegenerationConflict = {
    reason: 'beforeReference',
    blockId: block.blockId,
    assignmentId: block.assignmentId,
  }
  if (plan.status === 'conflict') {
    return {
      status: 'conflict',
      conflicts: elapsedCandidate ? [...plan.conflicts, elapsedConflict] : plan.conflicts,
    }
  }
  if (elapsedCandidate) return { status: 'conflict', conflicts: [elapsedConflict] }
  return { status: 'ok', schedule: parsed.data, plan }
}
