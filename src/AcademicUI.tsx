import LightingButton from './LightingButton'
import type { ReactNode } from 'react'
import { Check, Plus, Pencil, Trash2 } from 'lucide-react'
import { classFor, dueLabel, type AcademicData, type Assignment } from './domain'

export function Stat({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode
  label: string
  value: string | number
  detail: string
  tone: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  onAction,
}: {
  eyebrow: string
  title: string
  subtitle: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="page-heading inner-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span className="heading-dot">.</span>
        </h1>
        <p>{subtitle}</p>
      </div>
      <LightingButton className="primary-button" onClick={onAction}>
        <Plus size={17} />
        {action}
      </LightingButton>
    </div>
  )
}
export function EmptyState({
  icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: ReactNode
  title: string
  text: string
  action: string
  onAction: () => void
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <strong>{title}</strong>
      <p>{text}</p>
      <button className="text-button" onClick={onAction}>
        <Plus size={16} />
        {action}
      </button>
    </div>
  )
}
export function QuickAction({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button className="quick-action" onClick={onClick}>
      <span className="quick-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <Plus size={18} className="quick-plus" />
    </button>
  )
}
export function AssignmentRow({
  item,
  data,
  today,
  onToggle,
  onEdit,
}: {
  item: Assignment
  data: AcademicData
  today: string
  onToggle: () => void
  onEdit: () => void
}) {
  const course = classFor(data, item.classId)
  return (
    <div className="task-row">
      <button
        className={`check-button ${item.completed ? 'checked' : ''}`}
        aria-label={`${item.completed ? 'Reopen' : 'Complete'} ${item.title}`}
        onClick={onToggle}
      >
        {item.completed && <Check size={14} />}
      </button>
      <button className="task-main" onClick={onEdit}>
        <strong className={item.completed ? 'strike' : ''}>{item.title}</strong>
        <span>
          <i style={{ background: course?.color || '#a0a0a0' }} />
          {course?.name || 'Class removed'}
          {item.estimatedMinutes ? ` · ${item.estimatedMinutes} min` : ''}
        </span>
      </button>
      <span className={`due-badge ${item.dueDate < today && !item.completed ? 'overdue' : ''}`}>
        {dueLabel(item.dueDate, today)}
      </span>
    </div>
  )
}
export function ManagedAssignment({
  item,
  data,
  today,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: Assignment
  data: AcademicData
  today: string
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="managed-row">
      <div className="managed-grow">
        <AssignmentRow item={item} data={data} today={today} onToggle={onToggle} onEdit={onEdit} />
      </div>
      <div className="row-actions">
        <button className="icon-button" aria-label={`Edit ${item.title}`} onClick={onEdit}>
          <Pencil size={17} />
        </button>
        <button className="icon-button danger-hover" aria-label={`Delete ${item.title}`} onClick={onDelete}>
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  )
}
export function ManagedRow({
  icon,
  title,
  subtitle,
  meta,
  onEdit,
  onDelete,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  meta: string
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="managed-row simple-row">
      <div className="row-icon">{icon}</div>
      <div className="row-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
      <span className="row-meta">{meta}</span>
      <div className="row-actions">
        <button className="icon-button" aria-label={`Edit ${title}`} onClick={onEdit}>
          <Pencil size={17} />
        </button>
        <button className="icon-button danger-hover" aria-label={`Delete ${title}`} onClick={onDelete}>
          <Trash2 size={17} />
        </button>
      </div>
    </div>
  )
}
