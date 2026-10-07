import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { addDays, classFor, formatDate, formatTime, mondayOf, type AcademicData } from './domain'
import { PageHeader } from './AcademicUI'
import type { Modal } from './EditorModal'
import type { StoredPlanningWindow } from './scheduleData'
import type { RegeneratedScheduleBlock } from './regeneration'
import LockedSessionModal from './LockedSessionModal'
import {
  conflictMessages,
  conflictLockIds,
  conflictKey,
  conflictAllowsAssignmentEdit,
} from './plannerMessages'
import type { UnplacedAssignment } from './placement'
import type { useAcademicPlanner } from './useAcademicPlanner'
import PlanningWindowModal from './PlanningWindowModal'

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
  const [lockEditor, setLockEditor] = useState<RegeneratedScheduleBlock | null>(null)
  const { scheduleLoad, plan, reference, saveError, lockError } = planner
  const ready = scheduleLoad.status === 'empty' || scheduleLoad.status === 'ok'
  const locks = ready ? scheduleLoad.data.lockedBlocks : []
  function openLockEditor(block: RegeneratedScheduleBlock) {
    if (!ready || plan?.status !== 'ok') return
    planner.clearLockError()
    setLockEditor(block)
  }
  function unlock(blockId: string): boolean {
    return (
      window.confirm(
        'Unlock this session? Its work returns to automatic scheduling and may be recommended at the same time again. This does not complete or delete the assignment.',
      ) && planner.unlockLockedBlock(blockId)
    )
  }
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
      {lockError && (!lockEditor || plan?.status !== 'ok') && (
        <div className="planner-notice" role="alert">
          {lockError.message}
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
            Locked study intent cannot be honored. No study schedule has been generated. Unlock the affected
            sessions below or edit related academic data. Resolve conflicts before customizing sessions.
          </p>
          <ul>
            {plan.conflicts.map((conflict) => {
              const assignment = data.assignments.find((item) => item.id === conflict.assignmentId)
              return (
                <li key={conflictKey(conflict)}>
                  {assignment?.title ?? 'Saved assignment'}: {conflictMessages[conflict.reason]}
                  {'lockedMinutes' in conflict
                    ? ` ${conflict.lockedMinutes} locked minutes versus ${conflict.estimatedMinutes} estimated.`
                    : ''}
                </li>
              )
            })}
          </ul>
          <div className="conflict-repair-actions">
            {Array.from(
              new Set(
                plan.conflicts.filter(conflictAllowsAssignmentEdit).map((conflict) => conflict.assignmentId),
              ),
            )
              .sort()
              .map((assignmentId) => {
                const assignment = data.assignments.find((item) => item.id === assignmentId)
                return assignment ? (
                  <button
                    key={assignmentId}
                    className="text-button conflict-action"
                    onClick={() => onEdit({ entity: 'assignment', item: assignment })}
                  >
                    Edit assignment: {assignment.title}
                  </button>
                ) : null
              })}
            {Array.from(new Set(plan.conflicts.flatMap(conflictLockIds)))
              .sort()
              .map((blockId) => {
                const block = locks.find((item) => item.blockId === blockId)
                if (!block) return null
                const title =
                  data.assignments.find((item) => item.id === block.assignmentId)?.title ?? 'Saved assignment'
                return (
                  <div className="conflict-session" key={blockId}>
                    <span>
                      {title} · {formatDate(block.date)} · {formatTime(block.startTime)}–
                      {formatTime(block.endTime)}
                    </span>
                    <button
                      className="outline-button"
                      data-testid={`unlock-${blockId}`}
                      aria-label={`Unlock session: ${title}, ${formatDate(block.date)}, ${block.startTime}–${block.endTime}`}
                      onClick={() => unlock(blockId)}
                    >
                      Unlock session
                    </button>
                  </div>
                )
              })}
          </div>
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
                    <div
                      key={
                        block.source === 'locked'
                          ? block.blockId
                          : `${block.assignmentId}-${block.date}-${block.startTime}-${block.endTime}`
                      }
                      className={`week-event study-event ${block.source === 'locked' ? 'locked-study' : ''}`}
                      style={{ borderLeftColor: course?.color }}
                    >
                      <button
                        className="study-details"
                        aria-label={`${block.source === 'locked' ? 'Locked study' : 'Study'}: ${assignment.title}, ${formatTime(block.startTime)}–${formatTime(block.endTime)}`}
                        onClick={() => onEdit({ entity: 'assignment', item: assignment })}
                      >
                        <span className="event-type">
                          {block.source === 'locked' ? 'LOCKED STUDY' : 'STUDY'} ·{' '}
                          {formatTime(block.startTime)}–{formatTime(block.endTime)}
                        </span>
                        <strong>{assignment.title}</strong>
                        <small>
                          {course?.name || 'Class removed'} · {block.durationMinutes} min
                        </small>
                      </button>
                      <small className="session-source">
                        {block.source === 'locked' ? 'Manual' : 'Recommended'}
                      </small>
                      <div className="session-actions">
                        <button
                          className="text-button"
                          aria-label={`${block.source === 'locked' ? 'Edit locked study' : 'Customize study'}: ${assignment.title}, ${block.startTime}–${block.endTime}`}
                          onClick={() => openLockEditor(block)}
                        >
                          {block.source === 'locked' ? 'Edit' : 'Customize'}
                        </button>
                        {block.source === 'locked' && (
                          <button
                            className="text-button"
                            data-testid={`unlock-${block.blockId}`}
                            aria-label={`Unlock session: ${assignment.title}, ${formatDate(block.date)}, ${block.startTime}–${block.endTime}`}
                            onClick={() => unlock(block.blockId)}
                          >
                            Unlock
                          </button>
                        )}
                      </div>
                    </div>
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
      {lockEditor &&
        ready &&
        plan?.status === 'ok' &&
        (() => {
          const assignment = data.assignments.find((item) => item.id === lockEditor.assignmentId)
          if (!assignment) return null
          return (
            <LockedSessionModal
              key={
                lockEditor.source === 'locked'
                  ? lockEditor.blockId
                  : `${lockEditor.assignmentId}-${lockEditor.date}-${lockEditor.startTime}`
              }
              block={lockEditor}
              assignment={assignment}
              className={classFor(data, assignment.classId)?.name || 'Class removed'}
              error={lockError}
              onSave={planner.changeLockedBlock}
              onUnlock={unlock}
              onClose={() => setLockEditor(null)}
              onEditAssignment={() => {
                setLockEditor(null)
                onEdit({ entity: 'assignment', item: assignment })
              }}
            />
          )
        })()}
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
