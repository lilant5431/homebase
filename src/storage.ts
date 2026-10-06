import { emptyData, type AcademicData } from './domain'

const KEY = 'homebase.academic.v1'
export function loadData(): AcademicData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return emptyData()
    const data = value as Partial<AcademicData>
    if (
      data.version !== 1 ||
      !Array.isArray(data.classes) ||
      !Array.isArray(data.assignments) ||
      !Array.isArray(data.assessments) ||
      !Array.isArray(data.commitments)
    )
      return emptyData()
    return data as AcademicData
  } catch {
    return emptyData()
  }
}
export function saveData(data: AcademicData): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}
