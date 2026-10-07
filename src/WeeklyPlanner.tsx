import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addDays, classFor, formatDate, formatTime, mondayOf, type AcademicData } from './domain'
import { PageHeader } from './AcademicUI'
import type { Modal } from './EditorModal'
import type { StoredPlanningWindow } from './scheduleData'
import type { RegenerationConflict } from './regeneration'
import type { UnplacedAssignment } from './placement'
import type { useAcademicPlanner } from './useAcademicPlanner'
import PlanningWindowModal from './PlanningWindowModal'

const conflictMessages: Record<RegenerationConflict['reason'], string> = {
  assignmentMissing: 'A locked session belongs to an assignment that was deleted.',
  assignmentCompleted: 'A locked session belongs to a completed assignment.',
  missingEstimate: 'A locked assignment needs a work estimate.',
  zeroEstimate: 'A locked assignment has a 0-minute estimate.',
  beforeReference: 'A locked session starts before the plan reference and extends past it.',
  outsideAvailability: 'A locked session is outside available study time or overlaps a commitment.',
  afterDeadline: 'A locked session ends after its assignment deadline.',
  overlapsLockedBlock: 'Two locked study sessions overlap.',
  lockedTimeExceedsEstimate: 'Locked study time exceeds the assignment estimate.',
}
const loadMessages = {
  invalid: "Homebase couldn't read your saved scheduling data. It has been left unchanged.",
  unsupportedVersion:
    'This scheduling data was created by a different Homebase version and has been left unchanged.',
  unavailable: 'Scheduling storage is unavailable in this browser right now.',
}
function unplacedMessage(item: UnplacedAssignment): string {
  const remaining = item.remainingMinutes === undefined ? 'Some work' : `${item.remainingMinutes} minutes`
  switch (item.reason) {
    case 'missingEstimate':
      return 'Add an estimate before Homebase can schedule this assignment.'
    case 'zeroEstimate':
      return 'This assignment has a 0-minute estimate.'
    case 'insufficientAvailableTime':
      return `${remaining} could not fit in your available study time.`
    case 'insufficientTimeBeforeDeadline':
      return `${remaining} could not be scheduled before the deadline.`
  }
}

export default function WeeklyPlanner({
  data,
  today,
  weekStart,
  onWeekChange,
  planner,
  onEdit,
  onCreateCommitment,
}: {
  data: AcademicData
  today: string
  weekStart: string
  onWeekChange: (date: string) => void
  planner: ReturnType<typeof useAcademicPlanner>
  onEdit: (modal: Modal) => void
  onCreateCommitment: () => void
}) {
  const [editor, setEditor] = useState<{ date: string; item?: StoredPlanningWindow } | null>(null)
  const { scheduleLoad, plan, reference, saveError } = planner
  const ready = scheduleLoad.status === 'empty' || scheduleLoad.status === 'ok'
  const windows = ready ? scheduleLoad.data.planningWindows : []
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
  const visibleWindows = windows.filter((window) => days.includes(window.date))
  return (
    <>
      <PageHeader
        eyebrow="YOUR TIME AT A GLANCE"
        title="Weekly view"
        subtitle="Your deadlines, fixed plans, and recommended study sessions."
        action="Add commitment"
        onAction={onCreateCommitment}
      />
      <div className="week-toolbar">
        <div>
          <strong>
            {formatDate(weekStart, { month: 'long', day: 'numeric' })} –{' '}
            {formatDate(addDays(weekStart, 6), { month: 'long', day: 'numeric', year: 'numeric' })}
          </strong>
          <span>Monday to Sunday</span>
        </div>
        <div className="week-controls">
          <button className="outline-button" onClick={() => onWeekChange(mondayOf(today))}>
            Today
          </button>
          <button
            className="icon-button bordered"
            aria-label="Previous week"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button bordered"
            aria-label="Next week"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div className="planner-reference">
        <span data-testid="plan-reference">
          Plan reference: {formatDate(reference.date, { month: 'short', day: 'numeric', year: 'numeric' })} ·{' '}
          {reference.time}
        </span>
        <button className="outline-button" disabled={!ready} onClick={planner.refreshPlan}>
          Refresh plan
        </button>
      </div>
      {!ready && (
        <div className="planner-notice" role="alert">
          {loadMessages[scheduleLoad.status]} Study availability editing is disabled.
        </div>
      )}
      {saveError && !editor && (
        <div className="planner-notice" role="alert">
          {saveError}
        </div>
      )}
      <section className="panel availability-panel" aria-labelledby="availability-title">
        <h2 id="availability-title">Study availability</h2>
        {ready && !visibleWindows.length && (
          <p>Add the times you're available to study and Homebase can build your plan.</p>
        )}
        <div className="availability-grid">
          {days.map((day) => (
            <div className="availability-day" key={day}>
              <h3>{formatDate(day, { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
              {windows
                .filter((window) => window.date === day)
                .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id))
                .map((window) => (
                  <div className="availability-window" key={window.id}>
                    <span>
                      {formatTime(window.startTime)}–{formatTime(window.endTime)}
                    </span>
                    <div className="availability-actions">
                      <button
                        className="text-button"
                        aria-label={`Edit availability ${formatDate(day)} ${window.startTime}–${window.endTime}`}
                        onClick={() => setEditor({ date: day, item: window })}
                      >
                        Edit
                      </button>
                      <button
                        className="text-button"
                        aria-label={`Delete availability ${formatDate(day)} ${window.startTime}–${window.endTime}`}
                        onClick={() => {
                          if (windowConfirmDelete()) planner.changeWindow(window.id)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              <button
                className="outline-button add-availability"
                disabled={!ready}
                aria-label={`Add availability for ${formatDate(day)}`}
                onClick={() => setEditor({ date: day })}
              >
                <Plus size={15} /> Add time
              </button>
            </div>
          ))}
        </div>
      </section>
      {plan?.status === 'error' && (
        <div className="planner-notice" role="alert">
          <strong>Study plan unavailable</strong>
          <p>
            Some planning inputs have an invalid date, time, or estimate. Your saved data is unchanged. You
            can still manage your academic work.
          </p>
        </div>
      )}
      {plan?.status === 'conflict' && (
        <section className="planner-notice" role="alert">
          <h2>Schedule needs attention</h2>
          <p>
            Locked study intent cannot be honored. No study schedule has been generated. Lock customization
            will be available in a later update.
          </p>
          <ul>
            {plan.conflicts.map((conflict, index) => (
              <li key={index}>
                {data.assignments.find((item) => item.id === conflict.assignmentId)?.title ??
                  'Saved assignment'}
                : {conflictMessages[conflict.reason]}
                {'lockedMinutes' in conflict
                  ? ` ${conflict.lockedMinutes} locked minutes versus ${conflict.estimatedMinutes} estimated.`
                  : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
      {plan?.status === 'ok' && plan.unplacedAssignments.length > 0 && (
        <section className="panel unplaced-panel" aria-labelledby="unplaced-title">
          <h2 id="unplaced-title">Unscheduled work</h2>
          <p>Across all your saved study availability, this work still needs attention.</p>
          {plan.unplacedAssignments.map((item) => {
            const assignment = data.assignments.find((candidate) => candidate.id === item.assignmentId)
            return (
              <button
                key={item.assignmentId}
                className="unplaced-item"
                onClick={() => {
                  if (assignment) onEdit({ entity: 'assignment', item: assignment })
                }}
              >
                <strong>{assignment?.title ?? 'Assignment'}</strong>
                <span>{unplacedMessage(item)}</span>
              </button>
            )
          })}
        </section>
      )}
      <div className="week-grid">
        {Array.from({ length: 7 }, (_, index) => {
          const day = addDays(weekStart, index)
          const assignments = data.assignments.filter((item) => item.dueDate === day)
          const assessments = data.assessments.filter((item) => item.date === day)
          const commitments = data.commitments
            .filter((item) => item.date === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
          const sessions =
            plan?.status === 'ok' ? plan.scheduledBlocks.filter((block) => block.date === day) : []
          return (
            <div className={`day-column ${day === today ? 'is-today' : ''}`} key={day}>
              <div className="day-header">
                <span>{formatDate(day, { weekday: 'short' })}</span>
                <strong>{formatDate(day, { day: 'numeric' })}</strong>
              </div>
              <div className="day-events">
                {assignments.map((item) => (
                  <button
                    key={item.id}
                    className={`week-event assignment-event ${item.completed ? 'event-done' : ''}`}
                    onClick={() => onEdit({ entity: 'assignment', item })}
                  >
                    <span className="event-type">
                      ASSIGNMENT{item.dueTime ? ` · ${formatTime(item.dueTime)}` : ''}
                    </span>
                    <strong>{item.title}</strong>
                    <small>{classFor(data, item.classId)?.name || 'Class removed'}</small>
                  </button>
                ))}
                {assessments.map((item) => (
                  <button
                    key={item.id}
                    className="week-event assessment-event"
                    onClick={() => onEdit({ entity: 'assessment', item })}
                  >
                    <span className="event-type">
                      {item.kind.toUpperCase()}
                      {item.time ? ` · ${formatTime(item.time)}` : ''}
                    </span>
                    <strong>{item.title}</strong>
                    <small>{classFor(data, item.classId)?.name || 'Class removed'}</small>
                  </button>
                ))}
                {commitments.map((item) => (
                  <button
                    key={item.id}
                    className="week-event commitment-event"
                    onClick={() => onEdit({ entity: 'commitment', item })}
                  >
                    <span className="event-type">
                      {formatTime(item.startTime)} – {formatTime(item.endTime)}
                    </span>
                    <strong>{item.title}</strong>
                    <small>Commitment</small>
                  </button>
                ))}
                {sessions.map((block) => {
                  const assignment = data.assignments.find((item) => item.id === block.assignmentId)
                  if (!assignment) return null
                  const course = classFor(data, assignment.classId)
                  return (
                    <button
                      key={`${block.assignmentId}-${block.date}-${block.startTime}-${block.endTime}-${block.source}`}
                      className={`week-event study-event ${block.source === 'locked' ? 'locked-study' : ''}`}
                      style={{ borderLeftColor: course?.color }}
                      aria-label={`${block.source === 'locked' ? 'Locked study' : 'Study'}: ${assignment.title}, ${formatTime(block.startTime)}–${formatTime(block.endTime)}`}
                      onClick={() => onEdit({ entity: 'assignment', item: assignment })}
                    >
                      <span className="event-type">
                        {block.source === 'locked' ? 'LOCKED STUDY' : 'STUDY'} · {formatTime(block.startTime)}
                        –{formatTime(block.endTime)}
                      </span>
                      <strong>{assignment.title}</strong>
                      <small>
                        {course?.name || 'Class removed'} · {block.durationMinutes} min
                      </small>
                    </button>
                  )
                })}
                {!assignments.length && !assessments.length && !commitments.length && !sessions.length && (
                  <div className="day-empty">Nothing planned</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="week-note">
        Assignments appear on their due date; study sessions are recommendations. The plan stays stable until
        source data changes or you refresh it.
      </p>
      {plan && plan.status !== 'error' && plan.expiredLockedBlocks.length > 0 && (
        <p className="week-note">
          {plan.expiredLockedBlocks.length} past locked sessions are retained. They do not count as completed
          work.
        </p>
      )}
      {editor && (
        <PlanningWindowModal
          key={editor.item?.id ?? editor.date}
          date={editor.date}
          item={editor.item}
          saveError={saveError}
          onSave={planner.changeWindow}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  )
}

function windowConfirmDelete(): boolean {
  return window.confirm('Delete this study availability? Locked sessions and academic work will be kept.')
}
