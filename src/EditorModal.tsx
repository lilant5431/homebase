import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import ModalBackdrop from './ModalBackdrop'
import {
  newId,
  type AcademicData,
  type Assignment,
  type Assessment,
  type ClassItem,
  type Commitment,
  type Entity,
} from './domain'

export type Modal = { entity: Entity; item?: ClassItem | Assignment | Assessment | Commitment }
export const entityLabel: Record<Entity, string> = {
  class: 'class',
  assignment: 'assignment',
  assessment: 'assessment',
  commitment: 'commitment',
}
const colors = ['#6b8b74', '#6687aa', '#a17a90', '#b99261', '#7f7db1', '#759c9c']

export default function EditorModal({
  modal,
  data,
  onClose,
  onSave,
}: {
  modal: Modal
  data: AcademicData
  onClose: () => void
  onSave: (item: ClassItem | Assignment | Assessment | Commitment) => void
}) {
  const item = modal.item
  const existing = Boolean(item)
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const get = (key: string) => {
      const value = fields.get(key)
      return typeof value === 'string' ? value.trim() : ''
    }
    const now = new Date().toISOString(),
      id = item?.id || newId()
    const title = get('title')
    if (!title) {
      setError('Please enter a name or title.')
      return
    }
    if (modal.entity === 'class') {
      onSave({
        id,
        name: title,
        color: get('color') || colors[0],
        createdAt: (item as ClassItem | undefined)?.createdAt || now,
      })
      return
    }
    if (modal.entity === 'assignment') {
      const old = item as Assignment | undefined,
        duration = get('estimatedMinutes')
      if (!get('classId') || !get('date')) {
        setError('Choose a class and due date.')
        return
      }
      if (duration && (!Number.isInteger(Number(duration)) || Number(duration) <= 0)) {
        setError('Estimated minutes must be a positive whole number.')
        return
      }
      onSave({
        id,
        classId: get('classId'),
        title,
        dueDate: get('date'),
        dueTime: get('time') || undefined,
        estimatedMinutes: duration ? Number(duration) : undefined,
        notes: get('notes') || undefined,
        completed: old?.completed || false,
        createdAt: old?.createdAt || now,
        updatedAt: now,
      })
      return
    }
    if (modal.entity === 'assessment') {
      const old = item as Assessment | undefined
      if (!get('classId') || !get('date')) {
        setError('Choose a class and date.')
        return
      }
      onSave({
        id,
        classId: get('classId'),
        title,
        date: get('date'),
        time: get('time') || undefined,
        kind: get('kind') as Assessment['kind'],
        notes: get('notes') || undefined,
        createdAt: old?.createdAt || now,
      })
      return
    }
    const old = item as Commitment | undefined
    if (!get('date') || !get('startTime') || !get('endTime')) {
      setError('Enter a date and start and end times.')
      return
    }
    if (get('endTime') <= get('startTime')) {
      setError('End time must be after start time.')
      return
    }
    onSave({
      id,
      title,
      date: get('date'),
      startTime: get('startTime'),
      endTime: get('endTime'),
      notes: get('notes') || undefined,
      createdAt: old?.createdAt || now,
    })
  }
  const classItem = item as ClassItem | undefined,
    assignment = item as Assignment | undefined,
    assessment = item as Assessment | undefined,
    commitment = item as Commitment | undefined
  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1}>
        <div className="modal-header">
          <div>
            <span className="section-kicker">{existing ? 'MAKE A CHANGE' : 'ADD TO YOUR SPACE'}</span>
            <h2 id="modal-title">
              {existing ? 'Edit' : 'New'} {entityLabel[modal.entity]}
            </h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <label>
              {modal.entity === 'class'
                ? 'Class name'
                : modal.entity === 'commitment'
                  ? 'Commitment name'
                  : 'Title'}
              <input
                name="title"
                required
                maxLength={120}
                defaultValue={
                  modal.entity === 'class'
                    ? classItem?.name
                    : (item as Assignment | Assessment | Commitment | undefined)?.title
                }
                placeholder={
                  modal.entity === 'class'
                    ? 'e.g. Biology'
                    : modal.entity === 'commitment'
                      ? 'e.g. Soccer practice'
                      : 'e.g. Chapter 5 reading'
                }
              />
            </label>
            {modal.entity === 'class' && (
              <fieldset className="color-field">
                <legend>Color</legend>
                <div className="color-options">
                  {colors.map((color, index) => (
                    <label key={color} className="color-choice">
                      <input
                        type="radio"
                        name="color"
                        value={color}
                        defaultChecked={(classItem?.color || colors[0]) === color}
                        aria-label={`Color ${index + 1}`}
                      />
                      <span style={{ background: color }} />
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            {(modal.entity === 'assignment' || modal.entity === 'assessment') && (
              <label>
                Class
                <select
                  name="classId"
                  required
                  defaultValue={modal.entity === 'assignment' ? assignment?.classId : assessment?.classId}
                >
                  <option value="">Select a class</option>
                  {data.classes.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {modal.entity === 'assessment' && (
              <label>
                Type
                <select name="kind" defaultValue={assessment?.kind || 'Test'}>
                  <option>Test</option>
                  <option>Quiz</option>
                  <option>Project</option>
                  <option>Other</option>
                </select>
              </label>
            )}
            {modal.entity !== 'class' && (
              <div className="form-grid">
                <label>
                  {modal.entity === 'assignment' ? 'Due date' : 'Date'}
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={
                      modal.entity === 'assignment'
                        ? assignment?.dueDate || ''
                        : modal.entity === 'assessment'
                          ? assessment?.date || ''
                          : commitment?.date || ''
                    }
                  />
                </label>
                {modal.entity !== 'commitment' && (
                  <label>
                    Time <span className="optional">optional</span>
                    <input
                      type="time"
                      name="time"
                      defaultValue={
                        modal.entity === 'assignment' ? assignment?.dueTime || '' : assessment?.time || ''
                      }
                    />
                  </label>
                )}
                {modal.entity === 'commitment' && (
                  <label>
                    Start time
                    <input type="time" name="startTime" required defaultValue={commitment?.startTime || ''} />
                  </label>
                )}
              </div>
            )}
            {modal.entity === 'commitment' && (
              <label>
                End time
                <input type="time" name="endTime" required defaultValue={commitment?.endTime || ''} />
              </label>
            )}
            {modal.entity === 'assignment' && (
              <label>
                Estimated work <span className="optional">optional</span>
                <div className="input-suffix">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    name="estimatedMinutes"
                    defaultValue={assignment?.estimatedMinutes || ''}
                    placeholder="e.g. 45"
                  />
                  <span>minutes</span>
                </div>
              </label>
            )}
            {modal.entity !== 'class' && (
              <label>
                Notes <span className="optional">optional</span>
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={2000}
                  placeholder="Any details you want to remember…"
                  defaultValue={
                    modal.entity === 'assignment'
                      ? assignment?.notes || ''
                      : modal.entity === 'assessment'
                        ? assessment?.notes || ''
                        : commitment?.notes || ''
                  }
                />
              </label>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {existing ? 'Save changes' : `Add ${entityLabel[modal.entity]}`}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  )
}
