import { useMemo, useRef, useState } from 'react'
import { newId, type AcademicData } from './domain'
import {
  createLockedBlock,
  preflightLockedBlockChange,
  removeLockedBlock,
  type LockedBlockDraft,
} from './lockChanges'
import type { LockedAssignmentBlock, RegenerationConflict } from './regeneration'
import { buildAcademicPlan, referenceFromDate } from './planner'
import type { PriorityReference } from './priority'
import type { ScheduleData, StoredPlanningWindow } from './scheduleData'
import { loadScheduleData, saveScheduleData, type ScheduleLoadResult } from './scheduleStorage'

export type LockActionError =
  | { kind: 'conflict'; message: string; conflicts: RegenerationConflict[] }
  | {
      kind: 'invalidInput' | 'saveFailed' | 'sourceBlocked' | 'planError' | 'notEditable' | 'idUnavailable'
      message: string
    }

/** UI state/persistence boundary only; all scheduling policy remains in the pure planner. */
export function useAcademicPlanner(academic: AcademicData, initialReference?: PriorityReference) {
  const [scheduleLoad, setScheduleLoad] = useState<ScheduleLoadResult>(loadScheduleData)
  const scheduleRef = useRef(scheduleLoad)
  const [reference, setReference] = useState(() => initialReference ?? referenceFromDate(new Date()))
  const referenceRef = useRef(reference)
  const [lockError, setLockError] = useState<LockActionError | null>(null)
  const [saveError, setSaveError] = useState('')
  function refreshPlan() {
    const nextReference = referenceFromDate(new Date())
    referenceRef.current = nextReference
    setReference(nextReference)
  }
  const plan = useMemo(() => {
    if (scheduleLoad.status !== 'ok' && scheduleLoad.status !== 'empty') return null
    try {
      return buildAcademicPlan(academic, scheduleLoad.data, reference)
    } catch {
      return { status: 'error' } as const
    }
  }, [academic, scheduleLoad, reference])

  function changeWindow(item: StoredPlanningWindow | string): boolean {
    const current = scheduleRef.current
    if (current.status !== 'ok' && current.status !== 'empty') return false
    const windows = current.data.planningWindows
    const next = {
      ...current.data,
      planningWindows:
        typeof item === 'string'
          ? windows.filter((window) => window.id !== item)
          : windows.some((window) => window.id === item.id)
            ? windows.map((window) => (window.id === item.id ? item : window))
            : [...windows, item],
    }
    try {
      if (!saveScheduleData(next)) {
        setSaveError(
          'Could not save study availability. Your previous availability is unchanged. Check browser storage and try again.',
        )
        return false
      }
    } catch {
      setSaveError('This availability could not be saved. Check its date and times.')
      return false
    }
    const loaded: ScheduleLoadResult = { status: 'ok', data: next }
    scheduleRef.current = loaded
    setScheduleLoad(loaded)
    setSaveError('')
    refreshPlan()
    return true
  }

  function lockSource() {
    const current = scheduleRef.current
    if (current.status !== 'ok' && current.status !== 'empty') {
      setLockError({
        kind: 'sourceBlocked',
        message: 'Saved scheduling data is unavailable or unreadable. No session changes were saved.',
      })
      return null
    }
    return current.data
  }
  function adoptLockChange(
    next: { status: 'ok'; data: ScheduleData },
    candidateReference: PriorityReference,
  ) {
    scheduleRef.current = next
    referenceRef.current = candidateReference
    setScheduleLoad(next)
    setReference(candidateReference)
    setLockError(null)
  }
  function persistLockChange(next: ScheduleData, candidateReference: PriorityReference): boolean {
    try {
      if (!saveScheduleData(next)) {
        setLockError({
          kind: 'saveFailed',
          message:
            'Browser storage could not save this session change. Your previous sessions and plan are unchanged. Try again.',
        })
        return false
      }
    } catch {
      setLockError({
        kind: 'saveFailed',
        message:
          'The session change could not be written. Your previous sessions and plan are unchanged. Try again.',
      })
      return false
    }
    adoptLockChange({ status: 'ok', data: next }, candidateReference)
    return true
  }
  function changeLockedBlock(draft: LockedBlockDraft, existingBlockId?: string): boolean {
    const source = lockSource()
    if (!source) return false
    try {
      const currentPlan = buildAcademicPlan(academic, source, referenceRef.current)
      const existing =
        existingBlockId === undefined
          ? undefined
          : source.lockedBlocks.find((block) => block.blockId === existingBlockId)
      if (
        currentPlan.status !== 'ok' ||
        (existingBlockId !== undefined &&
          (!existing ||
            existing.assignmentId !== draft.assignmentId ||
            currentPlan.expiredLockedBlocks.some((block) => block.blockId === existingBlockId)))
      ) {
        setLockError({
          kind: 'notEditable',
          message:
            'Session customization requires a healthy plan and a current locked session. Resolve conflicts by unlocking sessions or editing related academic data.',
        })
        return false
      }
    } catch {
      setLockError({
        kind: 'planError',
        message: 'The planner could not validate its source data. No session changes were saved.',
      })
      return false
    }
    // Check form structure before requesting secure randomness.
    let block: LockedAssignmentBlock
    try {
      block = createLockedBlock({ ...draft, blockId: existingBlockId ?? 'candidate' })
    } catch {
      setLockError({
        kind: 'invalidInput',
        message: 'Enter a valid date and times, with the end after the start on the same day.',
      })
      return false
    }
    if (existingBlockId === undefined) {
      try {
        block = { ...block, blockId: newId() }
        if (source.lockedBlocks.some((item) => item.blockId === block.blockId))
          throw new RangeError('New identity must be unique')
      } catch {
        setLockError({
          kind: 'idUnavailable',
          message: 'Secure ID generation is unavailable in this browser. No session was saved.',
        })
        return false
      }
    }
    const candidateReference = referenceFromDate(new Date())
    try {
      const result = preflightLockedBlockChange(academic, source, block, candidateReference)
      if (result.status === 'conflict') {
        setLockError({
          kind: 'conflict',
          message: 'This session would create a schedule conflict. Nothing was saved.',
          conflicts: result.conflicts,
        })
        return false
      }
      return persistLockChange(result.schedule, candidateReference)
    } catch {
      setLockError({
        kind: 'planError',
        message:
          'The planner could not validate this change. Check the planning dates, times, and estimates. Nothing was saved.',
      })
      return false
    }
  }
  function unlockLockedBlock(blockId: string): boolean {
    const source = lockSource()
    if (!source) return false
    if (!source.lockedBlocks.some((block) => block.blockId === blockId)) {
      setLockError({
        kind: 'notEditable',
        message: 'This locked session no longer exists. Nothing was changed.',
      })
      return false
    }
    return persistLockChange(removeLockedBlock(source, blockId), referenceFromDate(new Date()))
  }
  function clearLockError() {
    setLockError(null)
  }
  return {
    scheduleLoad,
    reference,
    plan,
    saveError,
    refreshPlan,
    changeWindow,
    lockError,
    changeLockedBlock,
    unlockLockedBlock,
    clearLockError,
  }
}
