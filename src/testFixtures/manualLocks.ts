import { emptyData, type AcademicData } from '../domain'
import { emptyScheduleData, type ScheduleData } from '../scheduleData'
import type { LockedAssignmentBlock } from '../regeneration'

export const lockReference = { date: '2026-10-06', time: '16:00' }
export function lockAcademic(estimate: number | undefined = 90): AcademicData {
  return {
    ...emptyData(),
    classes: [{ id: 'class', name: 'Biology', color: '#6b8b74', createdAt: 'created' }],
    assignments: [
      {
        id: 'a',
        classId: 'class',
        title: 'Cell homework',
        dueDate: lockReference.date,
        dueTime: '22:00',
        estimatedMinutes: estimate,
        completed: false,
        createdAt: 'created',
        updatedAt: 'updated',
      },
    ],
  }
}
export function lockSchedule(): ScheduleData {
  return {
    ...emptyScheduleData(),
    planningWindows: [{ id: 'window', date: lockReference.date, startTime: '16:00', endTime: '19:00' }],
  }
}
export function lockFixture(
  startTime = '18:00',
  endTime = '18:45',
  blockId = 'intent',
): LockedAssignmentBlock {
  const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  return {
    blockId,
    assignmentId: 'a',
    date: lockReference.date,
    startTime,
    endTime,
    durationMinutes: minute(endTime) - minute(startTime),
  }
}
