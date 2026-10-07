import type { AcademicData } from './domain'
import { parseScheduleData, type ScheduleData } from './scheduleData'

export type HomebaseBackupV1 = {
  backupVersion: 1
  exportedAt: string
  academic: AcademicData
  schedule: ScheduleData
}

/** Projects supported academic fields, without changing the academic store's validation contract. */
function copyAcademic(data: AcademicData): AcademicData {
  if (data.version !== 1) throw new RangeError('Unsupported academic backup schema')
  return {
    version: 1,
    classes: data.classes.map(({ id, name, color, createdAt }) => ({ id, name, color, createdAt })),
    assignments: data.assignments.map(
      ({
        id,
        classId,
        title,
        dueDate,
        dueTime,
        estimatedMinutes,
        notes,
        completed,
        createdAt,
        updatedAt,
      }) => ({
        id,
        classId,
        title,
        dueDate,
        ...(dueTime === undefined ? {} : { dueTime }),
        ...(estimatedMinutes === undefined ? {} : { estimatedMinutes }),
        ...(notes === undefined ? {} : { notes }),
        completed,
        createdAt,
        updatedAt,
      }),
    ),
    assessments: data.assessments.map(({ id, classId, title, date, time, kind, notes, createdAt }) => ({
      id,
      classId,
      title,
      date,
      ...(time === undefined ? {} : { time }),
      kind,
      ...(notes === undefined ? {} : { notes }),
      createdAt,
    })),
    commitments: data.commitments.map(({ id, title, date, startTime, endTime, notes, createdAt }) => ({
      id,
      title,
      date,
      startTime,
      endTime,
      ...(notes === undefined ? {} : { notes }),
      createdAt,
    })),
  }
}

/** No storage, downloads, restoration, or implicit clock. Academic input follows AcademicData's existing contract. */
export function createBackupPayload(
  academic: AcademicData,
  schedule: ScheduleData,
  exportedAt: string,
): HomebaseBackupV1 {
  if (typeof exportedAt !== 'string') throw new RangeError('Supply the backup timestamp explicitly')
  const parsed = parseScheduleData(schedule)
  if (parsed.status !== 'ok') throw new RangeError('Cannot back up invalid or unsupported schedule data')
  return { backupVersion: 1, exportedAt, academic: copyAcademic(academic), schedule: parsed.data }
}

export function serializeBackup(academic: AcademicData, schedule: ScheduleData, exportedAt: string): string {
  return JSON.stringify(createBackupPayload(academic, schedule, exportedAt), null, 2)
}
