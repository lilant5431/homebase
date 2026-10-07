import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { newId } from './domain'
import { emptyScheduleData, parseScheduleData, type StoredPlanningWindow } from './scheduleData'

export default function PlanningWindowModal({
  date,
  item,
  saveError,
  onSave,
  onClose,
}: {
  date: string
  item?: StoredPlanningWindow
  saveError: string
  onSave: (window: StoredPlanningWindow) => boolean
  onClose: () => void
}) {
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const get = (key: string) => {
      const value = fields.get(key)
      return typeof value === 'string' ? value : ''
    }
    const candidate = {
      id: item?.id ?? 'new',
      date: get('date'),
      startTime: get('startTime'),
      endTime: get('endTime'),
    }
    if (parseScheduleData({ ...emptyScheduleData(), planningWindows: [candidate] }).status !== 'ok') {
      setError('Enter a valid date and times, with the end after the start on the same day.')
      return
    }
    setError('')
    try {
      if (onSave({ ...candidate, id: item?.id ?? newId() })) onClose()
    } catch {
      setError(
        'Study availability could not be created. Secure ID generation may be unavailable in this browser.',
      )
    }
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="availability-modal-title">
        <div className="modal-header">
          <div>
            <span className="section-kicker">PROTECT YOUR STUDY TIME</span>
            <h2 id="availability-modal-title">{item ? 'Edit' : 'Add'} study availability</h2>
          </div>
          <button className="icon-button" aria-label="Close availability editor" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <label>
              Date
              <input type="date" name="date" required defaultValue={item?.date ?? date} />
            </label>
            <div className="form-grid">
              <label>
                Start time
                <input type="time" name="startTime" required defaultValue={item?.startTime ?? ''} />
              </label>
              <label>
                End time
                <input type="time" name="endTime" required defaultValue={item?.endTime ?? ''} />
              </label>
            </div>
            <p>
              Choose a date-specific time when you're willing to study. Fixed commitments will be protected.
            </p>
            {(error || saveError) && (
              <p className="form-error" role="alert">
                {error || saveError}
              </p>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              Save availability
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
