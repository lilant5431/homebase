import { useMemo, useRef, useState } from 'react'
import type { AcademicData } from './domain'
import { buildAcademicPlan, referenceFromDate } from './planner'
import type { PriorityReference } from './priority'
import type { StoredPlanningWindow } from './scheduleData'
import { loadScheduleData, saveScheduleData, type ScheduleLoadResult } from './scheduleStorage'

/** UI state/persistence boundary only; all scheduling policy remains in the pure planner. */
export function useAcademicPlanner(academic: AcademicData, initialReference?: PriorityReference) {
  const [scheduleLoad, setScheduleLoad] = useState<ScheduleLoadResult>(loadScheduleData)
  const scheduleRef = useRef(scheduleLoad)
  const [reference, setReference] = useState(() => initialReference ?? referenceFromDate(new Date()))
  const [saveError, setSaveError] = useState('')
  function refreshPlan() {
    setReference(referenceFromDate(new Date()))
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
  return { scheduleLoad, reference, plan, saveError, refreshPlan, changeWindow }
}
