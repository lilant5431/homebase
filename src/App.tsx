import { useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  CircleCheck,
  CalendarClock,
} from 'lucide-react'
import { APP_CONFIG } from './config'
import {
  addDays,
  classFor,
  demoData,
  formatDate,
  formatTime,
  isPlannerEmpty,
  localDate,
  mondayOf,
  removeEntity,
  upsertEntity,
  type AcademicData,
  type Assignment,
  type Assessment,
  type ClassItem,
  type Commitment,
  type Entity,
} from './domain'
import { loadData, saveData } from './storage'
import WeeklyPlanner from './WeeklyPlanner'
import { useAcademicPlanner } from './useAcademicPlanner'
import type { PriorityReference } from './priority'
import {
  Stat,
  PageHeader,
  EmptyState,
  QuickAction,
  AssignmentRow,
  ManagedAssignment,
  ManagedRow,
} from './AcademicUI'
import AppearanceSettings from './AppearanceSettings'
import EditorModal, { entityLabel, type Modal } from './EditorModal'

type View = 'overview' | 'week' | 'assignments' | 'assessments' | 'commitments' | 'classes'
const nav: { key: View; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'week', label: 'Weekly view', icon: CalendarDays },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'assessments', label: 'Assessments', icon: GraduationCap },
  { key: 'commitments', label: 'Commitments', icon: CalendarClock },
  { key: 'classes', label: 'Classes', icon: BookOpen },
]

export default function App({ initialReference }: { initialReference?: PriorityReference } = {}) {
  const [data, setData] = useState<AcademicData>(loadData)
  const dataRef = useRef(data)
  const planner = useAcademicPlanner(data, initialReference)
  const [view, setView] = useState<View>('overview')
  const [modal, setModal] = useState<Modal | null>(null)
  const [weekStart, setWeekStart] = useState(() => mondayOf(localDate()))
  const [menuOpen, setMenuOpen] = useState(false)
  const [storageError, setStorageError] = useState(false)
  const today = localDate()
  const pending = useMemo(
    () =>
      data.assignments
        .filter((item) => !item.completed)
        .sort((a, b) =>
          `${a.dueDate}${a.dueTime || '23:59'}`.localeCompare(`${b.dueDate}${b.dueTime || '23:59'}`),
        ),
    [data.assignments],
  )
  const upcoming = data.assessments
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  const horizon = [
    ...upcoming.map((item) => ({
      id: item.id,
      date: item.date,
      title: item.title,
      detail: `${classFor(data, item.classId)?.name || 'Class removed'} · ${item.kind}`,
      entity: 'assessment' as const,
      item,
    })),
    ...data.commitments
      .filter((item) => item.date >= today)
      .map((item) => ({
        id: item.id,
        date: item.date,
        title: item.title,
        detail: `${formatTime(item.startTime)} – ${formatTime(item.endTime)} · Commitment`,
        entity: 'commitment' as const,
        item,
      })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  const dueSoon = pending.filter((item) => item.dueDate <= addDays(today, 7)).length
  const minutes = pending.reduce((sum, item) => sum + (item.estimatedMinutes || 0), 0)
  const sectionTitle = nav.find((item) => item.key === view)?.label || 'Overview'
  function commit(next: AcademicData) {
    dataRef.current = next
    const saved = saveData(next)
    setStorageError(!saved)
    if (saved) planner.refreshPlan()
    setData(next)
  }
  function update(entity: Entity, item: ClassItem | Assignment | Assessment | Commitment) {
    commit(upsertEntity(dataRef.current, entity, item))
  }
  function deleteItem(entity: Entity, id: string) {
    const message =
      entity === 'class'
        ? 'Delete this class and all its assignments and assessments? This cannot be undone.'
        : `Delete this ${entityLabel[entity]}? This cannot be undone.`
    if (window.confirm(message)) commit(removeEntity(dataRef.current, entity, id))
  }
  function toggleAssignment(item: Assignment) {
    update('assignment', { ...item, completed: !item.completed, updatedAt: new Date().toISOString() })
  }
  function openCreate(entity: Entity) {
    if ((entity === 'assignment' || entity === 'assessment') && !data.classes.length) {
      setModal({ entity: 'class' })
      return
    }
    setModal({ entity })
  }
  const navigate = (next: View) => {
    setView(next)
    setMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <span>h</span>
          </div>
          <div>
            <strong>{APP_CONFIG.name}</strong>
            <small>YOUR ACADEMIC SPACE</small>
          </div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              <item.icon size={18} strokeWidth={1.9} />
              {item.label}
            </button>
          ))}
        </nav>
        <AppearanceSettings />
        <div className="sidebar-bottom">
          <div className="sidebar-card">
            <div className="sidebar-card-icon">
              <Sparkles size={17} />
            </div>
            <strong>Make room for what matters.</strong>
            <p>Keep your schoolwork and the rest of your week in one clear place.</p>
          </div>
          <div className="sidebar-footer">A little clarity, every day.</div>
        </div>
      </aside>
      {menuOpen && (
        <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      )}
      <main className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{sectionTitle}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-pill">
              <CalendarDays size={15} />
              {formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
            <button className="top-add" onClick={() => openCreate('assignment')}>
              <Plus size={17} /> New assignment
            </button>
          </div>
        </header>
        {storageError && (
          <div className="storage-alert" role="alert">
            Your browser could not save changes. Check available storage before closing this tab.
          </div>
        )}
        <div className="page-content">
          {view === 'overview' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">YOUR HOMEBASE</div>
                  <h1>
                    Good to have you here<span className="heading-dot">.</span>
                  </h1>
                  <p>Here’s what your school week looks like, all in one place.</p>
                </div>
              </div>
              {!data.classes.length && !data.assignments.length && (
                <div className="welcome-banner">
                  <div>
                    <span className="mini-label">GET STARTED</span>
                    <h2>Start with your first class.</h2>
                    <p>
                      Add a class, then give it an assignment or assessment. Your plan will take shape here.
                    </p>
                    <div className="welcome-actions">
                      <button className="primary-button" onClick={() => openCreate('class')}>
                        <Plus size={17} /> Add a class
                      </button>
                      {isPlannerEmpty(data) && (
                        <button
                          className="text-button"
                          onClick={() => {
                            if (!isPlannerEmpty(dataRef.current)) return
                            if (
                              window.confirm('Add example classes and schoolwork to explore Homebase?') &&
                              isPlannerEmpty(dataRef.current)
                            )
                              commit(demoData())
                          }}
                        >
                          Explore with sample data <ChevronRight size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="welcome-art" aria-hidden="true">
                    <div className="art-ring ring-one" />
                    <div className="art-ring ring-two" />
                    <div className="art-card">
                      <Check size={20} />
                      <span>One step at a time</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="stats-grid">
                <Stat
                  icon={<ClipboardList size={20} />}
                  label="To do"
                  value={pending.length}
                  detail="assignments remaining"
                  tone="sage"
                />
                <Stat
                  icon={<Clock3 size={20} />}
                  label="Due soon"
                  value={dueSoon}
                  detail="next 7 days + overdue"
                  tone="peach"
                />
                <Stat
                  icon={<GraduationCap size={20} />}
                  label="Coming up"
                  value={upcoming.length}
                  detail="upcoming assessments"
                  tone="lavender"
                />
                <Stat
                  icon={<CircleCheck size={20} />}
                  label="Work estimated"
                  value={minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : '—'}
                  detail="for open assignments"
                  tone="blue"
                />
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <span className="section-kicker">STAY ON TRACK</span>
                      <h2>Assignments ahead</h2>
                    </div>
                    <button className="link-button" onClick={() => navigate('assignments')}>
                      View all <ChevronRight size={16} />
                    </button>
                  </div>
                  {pending.length ? (
                    <div className="task-list">
                      {pending.slice(0, 5).map((item) => (
                        <AssignmentRow
                          key={item.id}
                          item={item}
                          data={data}
                          today={today}
                          onToggle={() => toggleAssignment(item)}
                          onEdit={() => setModal({ entity: 'assignment', item })}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<ClipboardList size={24} />}
                      title="A clear desk"
                      text="Open assignments will show up here."
                      action="Add assignment"
                      onAction={() => openCreate('assignment')}
                    />
                  )}
                </section>
                <section className="panel side-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="section-kicker">LOOKING FORWARD</span>
                      <h2>On the horizon</h2>
                    </div>
                  </div>
                  {horizon.length ? (
                    <div className="horizon-list">
                      {horizon.slice(0, 4).map((entry) => (
                        <button
                          className="horizon-item"
                          key={entry.id}
                          onClick={() => setModal({ entity: entry.entity, item: entry.item })}
                        >
                          <span className="date-tile">
                            <b>{formatDate(entry.date, { day: 'numeric' })}</b>
                            <small>{formatDate(entry.date, { month: 'short' }).toUpperCase()}</small>
                          </span>
                          <span className="horizon-copy">
                            <strong>{entry.title}</strong>
                            <small>{entry.detail}</small>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={<GraduationCap size={24} />}
                      title="Nothing on the horizon"
                      text="Assessments and commitments will show up here."
                      action="Add assessment"
                      onAction={() => openCreate('assessment')}
                    />
                  )}
                  <button className="subtle-footer-button" onClick={() => navigate('week')}>
                    See your full week <ChevronRight size={16} />
                  </button>
                </section>
              </div>
              <section className="quick-section">
                <div>
                  <span className="section-kicker">BUILD YOUR PLAN</span>
                  <h2>Quick add</h2>
                </div>
                <div className="quick-actions">
                  <QuickAction
                    icon={<BookOpen size={19} />}
                    title="Class"
                    subtitle="Organize your courses"
                    onClick={() => openCreate('class')}
                  />
                  <QuickAction
                    icon={<ClipboardList size={19} />}
                    title="Assignment"
                    subtitle="Track what’s due"
                    onClick={() => openCreate('assignment')}
                  />
                  <QuickAction
                    icon={<GraduationCap size={19} />}
                    title="Assessment"
                    subtitle="Prepare for what’s next"
                    onClick={() => openCreate('assessment')}
                  />
                  <QuickAction
                    icon={<CalendarClock size={19} />}
                    title="Commitment"
                    subtitle="Protect your time"
                    onClick={() => openCreate('commitment')}
                  />
                </div>
              </section>
            </>
          )}
          {view === 'week' && (
            <WeeklyPlanner
              data={data}
              today={today}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              planner={planner}
              onEdit={setModal}
              onCreateCommitment={() => openCreate('commitment')}
            />
          )}
          {view === 'assignments' && (
            <>
              <PageHeader
                eyebrow="YOUR WORK"
                title="Assignments"
                subtitle="Everything on your plate, with space to mark progress."
                action="New assignment"
                onAction={() => openCreate('assignment')}
              />
              <div className="content-panel">
                <div className="list-section-heading">
                  <h2>
                    To do <span>{pending.length}</span>
                  </h2>
                </div>
                {pending.length ? (
                  pending.map((item) => (
                    <ManagedAssignment
                      key={item.id}
                      item={item}
                      data={data}
                      today={today}
                      onToggle={() => toggleAssignment(item)}
                      onEdit={() => setModal({ entity: 'assignment', item })}
                      onDelete={() => deleteItem('assignment', item.id)}
                    />
                  ))
                ) : (
                  <EmptyState
                    icon={<CircleCheck size={24} />}
                    title="All caught up"
                    text="Add an assignment when you have something to work on."
                    action="Add assignment"
                    onAction={() => openCreate('assignment')}
                  />
                )}
              </div>
              {data.assignments.some((item) => item.completed) && (
                <div className="content-panel completed-panel">
                  <div className="list-section-heading">
                    <h2>
                      Completed <span>{data.assignments.filter((item) => item.completed).length}</span>
                    </h2>
                  </div>
                  {data.assignments
                    .filter((item) => item.completed)
                    .map((item) => (
                      <ManagedAssignment
                        key={item.id}
                        item={item}
                        data={data}
                        today={today}
                        onToggle={() => toggleAssignment(item)}
                        onEdit={() => setModal({ entity: 'assignment', item })}
                        onDelete={() => deleteItem('assignment', item.id)}
                      />
                    ))}
                </div>
              )}
            </>
          )}
          {view === 'assessments' && (
            <>
              <PageHeader
                eyebrow="IMPORTANT DATES"
                title="Assessments"
                subtitle="Keep tests, quizzes, and projects in view."
                action="New assessment"
                onAction={() => openCreate('assessment')}
              />
              <div className="content-panel">
                <div className="list-section-heading">
                  <h2>
                    All assessments <span>{data.assessments.length}</span>
                  </h2>
                </div>
                {data.assessments.length ? (
                  [...data.assessments]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((item) => (
                      <ManagedRow
                        key={item.id}
                        icon={<GraduationCap size={19} />}
                        title={item.title}
                        subtitle={`${classFor(data, item.classId)?.name || 'Class removed'} · ${item.kind}`}
                        meta={`${formatDate(item.date)}${item.time ? ` · ${formatTime(item.time)}` : ''}`}
                        onEdit={() => setModal({ entity: 'assessment', item })}
                        onDelete={() => deleteItem('assessment', item.id)}
                      />
                    ))
                ) : (
                  <EmptyState
                    icon={<GraduationCap size={24} />}
                    title="No assessments yet"
                    text="Add your next test, quiz, or project."
                    action="Add assessment"
                    onAction={() => openCreate('assessment')}
                  />
                )}
              </div>
            </>
          )}
          {view === 'commitments' && (
            <>
              <PageHeader
                eyebrow="THE REST OF LIFE"
                title="Commitments"
                subtitle="School, activities, appointments, and time you’ve already promised."
                action="New commitment"
                onAction={() => openCreate('commitment')}
              />
              <div className="content-panel">
                <div className="list-section-heading">
                  <h2>
                    All commitments <span>{data.commitments.length}</span>
                  </h2>
                </div>
                {data.commitments.length ? (
                  [...data.commitments]
                    .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
                    .map((item) => (
                      <ManagedRow
                        key={item.id}
                        icon={<CalendarClock size={19} />}
                        title={item.title}
                        subtitle={item.notes || 'Fixed commitment'}
                        meta={`${formatDate(item.date)} · ${formatTime(item.startTime)} – ${formatTime(item.endTime)}`}
                        onEdit={() => setModal({ entity: 'commitment', item })}
                        onDelete={() => deleteItem('commitment', item.id)}
                      />
                    ))
                ) : (
                  <EmptyState
                    icon={<CalendarClock size={24} />}
                    title="No commitments yet"
                    text="Add fixed plans so your week reflects real life."
                    action="Add commitment"
                    onAction={() => openCreate('commitment')}
                  />
                )}
              </div>
            </>
          )}
          {view === 'classes' && (
            <>
              <PageHeader
                eyebrow="YOUR COURSES"
                title="Classes"
                subtitle="A home for each course and the work that belongs to it."
                action="New class"
                onAction={() => openCreate('class')}
              />
              <div className="class-grid">
                {data.classes.map((item) => (
                  <div className="class-card" key={item.id}>
                    <div className="class-card-icon" style={{ background: item.color }}>
                      <BookOpen size={21} />
                    </div>
                    <div>
                      <h2>{item.name}</h2>
                      <p>
                        {
                          data.assignments.filter((work) => work.classId === item.id && !work.completed)
                            .length
                        }{' '}
                        open assignments ·{' '}
                        {data.assessments.filter((work) => work.classId === item.id).length} assessments
                      </p>
                    </div>
                    <div className="class-card-actions">
                      <button
                        className="icon-button"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setModal({ entity: 'class', item })}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="icon-button danger-hover"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => deleteItem('class', item.id)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
                {!data.classes.length && (
                  <div className="content-panel full-width">
                    <EmptyState
                      icon={<BookOpen size={24} />}
                      title="Your classes start here"
                      text="Add a course to organize assignments and assessments."
                      action="Add class"
                      onAction={() => openCreate('class')}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      {modal && (
        <EditorModal
          key={`${modal.entity}-${modal.item?.id || 'new'}`}
          modal={modal}
          data={data}
          onClose={() => setModal(null)}
          onSave={(item) => {
            update(modal.entity, item)
            setModal(null)
          }}
        />
      )}
    </div>
  )
}
