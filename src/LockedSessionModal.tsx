import { useEffect, useRef, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { Assignment } from './domain'
import type { LockedBlockDraft } from './lockChanges'
import type { RegeneratedScheduleBlock } from './regeneration'
import type { LockActionError } from './useAcademicPlanner'
import { conflictKey, conflictMessages } from './plannerMessages'

export default function LockedSessionModal({
  block,
  assignment,
  className,
  error,
  onSave,
  onUnlock,
  onEditAssignment,
  onClose,
}: {
  block: RegeneratedScheduleBlock
  assignment: Assignment
  className: string
  error: LockActionError | null
  onSave: (draft: LockedBlockDraft, blockId?: string) => boolean
  onUnlock: (blockId: string) => boolean
  onEditAssignment: () => void
  onClose: () => void
}) {
  const dialog = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  }, [onClose])
  useEffect(() => {
    const previous = document.activeElement
    const root = dialog.current
    root?.querySelector('input')?.focus()
    function keyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
      }
      if (event.key !== 'Tab' || !root) return
      const controls = Array.from(
        root.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]'),
      )
      const first = controls[0],
        last = controls[controls.length - 1]
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    root?.addEventListener('keydown', keyboard)
    return () => {
      root?.removeEventListener('keydown', keyboard)
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const get = (name: string) => {
      const value = fields.get(name)
      return typeof value === 'string' ? value : ''
    }
    if (
      onSave(
        {
          assignmentId: assignment.id,
          date: get('date'),
          startTime: get('startTime'),
          endTime: get('endTime'),
        },
        block.source === 'locked' ? block.blockId : undefined,
      )
    )
      onClose()
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="modal locked-session-modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="locked-session-title"
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <span className="section-kicker">YOUR STUDY PLAN</span>
            <h2 id="locked-session-title">
              {block.source === 'locked' ? 'Edit locked session' : 'Customize study session'}
            </h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close session editor" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <strong>{assignment.title}</strong>
            <p>{className}</p>
            <button
              type="button"
              className="text-button session-assignment-action"
              onClick={onEditAssignment}
            >
              Edit assignment
            </button>
            <label>
              Date
              <input type="date" name="date" required defaultValue={block.date} />
            </label>
            <div className="form-grid">
              <label>
                Start time
                <input type="time" name="startTime" required defaultValue={block.startTime} />
              </label>
              <label>
                End time
                <input type="time" name="endTime" required defaultValue={block.endTime} />
              </label>
            </div>
            <p>
              Duration comes from these times. Locked sessions must fit your availability, commitments,
              assignment estimate, and deadline.
            </p>
            {error && (
              <div className="form-error" role="alert">
                <p>{error.message}</p>
                {error.kind === 'conflict' && (
                  <ul>
                    {error.conflicts.map((conflict) => (
                      <li key={conflictKey(conflict)}>{conflictMessages[conflict.reason]}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {block.source === 'locked' && (
              <p>
                Unlocking returns this work to automatic scheduling. It may be recommended at the same time
                again; it does not mark work complete.
              </p>
            )}
          </div>
          <div className="modal-footer session-modal-footer">
            {block.source === 'locked' && (
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  if (onUnlock(block.blockId)) onClose()
                }}
              >
                Unlock session
              </button>
            )}
            <button type="button" className="outline-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {block.source === 'locked' ? 'Save changes' : 'Lock session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
