export type ClassItem = { id: string; name: string; color: string; createdAt: string }
export type Assignment = {
  id: string
  classId: string
  title: string
  dueDate: string
  dueTime?: string
  estimatedMinutes?: number
  notes?: string
  completed: boolean
  createdAt: string
  updatedAt: string
}
export type Assessment = {
  id: string
  classId: string
  title: string
  date: string
  time?: string
  kind: 'Test' | 'Quiz' | 'Project' | 'Other'
  notes?: string
  createdAt: string
}
export type Commitment = {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  notes?: string
  createdAt: string
}
export type AcademicData = {
  version: 1
  classes: ClassItem[]
  assignments: Assignment[]
  assessments: Assessment[]
  commitments: Commitment[]
}
export type Entity = 'class' | 'assignment' | 'assessment' | 'commitment'

export const emptyData = (): AcademicData => ({
  version: 1,
  classes: [],
  assignments: [],
  assessments: [],
  commitments: [],
})
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
export const parseDate = (value: string) => new Date(`${value}T12:00:00`)
export const addDays = (value: string, count: number) => {
  const date = parseDate(value)
  date.setDate(date.getDate() + count)
  return localDate(date)
}
export const mondayOf = (value: string) => addDays(value, -((parseDate(value).getDay() + 6) % 7))
export const formatDate = (
  value: string,
  options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' },
) => parseDate(value).toLocaleDateString(undefined, options)
export const formatTime = (value?: string) =>
  value
    ? new Date(`2000-01-01T${value}:00`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : ''
export const dueLabel = (date: string, today = localDate()) =>
  date < today
    ? `Overdue · ${formatDate(date)}`
    : date === today
      ? 'Today'
      : date === addDays(today, 1)
        ? 'Tomorrow'
        : formatDate(date)
export const classFor = (data: AcademicData, classId: string) =>
  data.classes.find((item) => item.id === classId)
export const newId = () => crypto.randomUUID()

export function removeEntity(data: AcademicData, entity: Entity, id: string): AcademicData {
  switch (entity) {
    case 'class':
      return {
        ...data,
        classes: data.classes.filter((item) => item.id !== id),
        assignments: data.assignments.filter((item) => item.classId !== id),
        assessments: data.assessments.filter((item) => item.classId !== id),
      }
    case 'assignment':
      return { ...data, assignments: data.assignments.filter((item) => item.id !== id) }
    case 'assessment':
      return { ...data, assessments: data.assessments.filter((item) => item.id !== id) }
    case 'commitment':
      return { ...data, commitments: data.commitments.filter((item) => item.id !== id) }
  }
}

export function upsertEntity(
  data: AcademicData,
  entity: Entity,
  item: ClassItem | Assignment | Assessment | Commitment,
): AcademicData {
  const key = (
    {
      class: 'classes',
      assignment: 'assignments',
      assessment: 'assessments',
      commitment: 'commitments',
    } as const
  )[entity]
  // The form supplies an item matching the selected collection.
  const collection = data[key] as Array<{ id: string }>
  return {
    ...data,
    [key]: collection.some((current) => current.id === item.id)
      ? collection.map((current) => (current.id === item.id ? item : current))
      : [...collection, item],
  } as AcademicData
}

export function demoData(today = localDate()): AcademicData {
  const science = newId(),
    literature = newId(),
    math = newId(),
    now = new Date().toISOString()
  return {
    version: 1,
    classes: [
      { id: science, name: 'Biology', color: '#6b8b74', createdAt: now },
      { id: literature, name: 'English Literature', color: '#a17a90', createdAt: now },
      { id: math, name: 'Algebra II', color: '#6687aa', createdAt: now },
    ],
    assignments: [
      {
        id: newId(),
        classId: science,
        title: 'Cell structure worksheet',
        dueDate: addDays(today, 1),
        estimatedMinutes: 45,
        completed: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newId(),
        classId: literature,
        title: 'Read chapters 7–9',
        dueDate: addDays(today, 2),
        estimatedMinutes: 60,
        completed: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newId(),
        classId: math,
        title: 'Practice problems: quadratics',
        dueDate: addDays(today, 4),
        estimatedMinutes: 35,
        completed: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: newId(),
        classId: science,
        title: 'Lab reflection',
        dueDate: addDays(today, -1),
        estimatedMinutes: 25,
        completed: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    assessments: [
      {
        id: newId(),
        classId: math,
        title: 'Quadratics quiz',
        date: addDays(today, 5),
        time: '10:00',
        kind: 'Quiz',
        createdAt: now,
      },
    ],
    commitments: [
      {
        id: newId(),
        title: 'Soccer practice',
        date: addDays(today, 2),
        startTime: '16:00',
        endTime: '17:30',
        createdAt: now,
      },
    ],
  }
}
