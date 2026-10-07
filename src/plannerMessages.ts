import type { RegenerationConflict } from './regeneration'

export const conflictMessages: Record<RegenerationConflict['reason'], string> = {
  assignmentMissing: 'A locked session belongs to an assignment that was deleted.',
  assignmentCompleted: 'A locked session belongs to a completed assignment.',
  missingEstimate: 'A locked assignment needs a work estimate.',
  zeroEstimate: 'A locked assignment has a 0-minute estimate.',
  beforeReference:
    'A locked session starts before the plan reference. Unlock it to return this work to automatic scheduling.',
  outsideAvailability: 'A locked session is outside available study time or overlaps a commitment.',
  afterDeadline: 'A locked session ends after its assignment deadline.',
  overlapsLockedBlock: 'Two locked study sessions overlap.',
  lockedTimeExceedsEstimate: 'Locked study time exceeds the assignment estimate.',
}
export function conflictLockIds(conflict: RegenerationConflict): string[] {
  if ('blockIds' in conflict) return conflict.blockIds
  return 'conflictingBlockId' in conflict
    ? [conflict.blockId, conflict.conflictingBlockId]
    : [conflict.blockId]
}
export function conflictKey(conflict: RegenerationConflict): string {
  return JSON.stringify([conflict.reason, conflict.assignmentId, [...conflictLockIds(conflict)].sort()])
}
export function conflictAllowsAssignmentEdit(conflict: RegenerationConflict): boolean {
  return [
    'assignmentCompleted',
    'missingEstimate',
    'zeroEstimate',
    'afterDeadline',
    'lockedTimeExceedsEstimate',
  ].includes(conflict.reason)
}
