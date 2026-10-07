import type { ScheduleData } from '../scheduleData'

export function scheduleFixture(): ScheduleData {
  return {
    version: 1,
    planningWindows: [{ id: 'window', date: '2026-10-06', startTime: '16:00', endTime: '18:00' }],
    lockedBlocks: [
      {
        blockId: 'opaque lock',
        assignmentId: 'deleted',
        date: '2026-10-06',
        startTime: '16:30',
        endTime: '17:00',
        durationMinutes: 30,
      },
    ],
  }
}
