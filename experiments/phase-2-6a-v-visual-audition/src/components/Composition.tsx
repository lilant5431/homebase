import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { BorderBeam, MagicGlass, ShimmerButton } from './LibraryEffects'
import type { EffectId } from '../settings'

const assignments = [
  {
    title: 'The shape of a good argument',
    subject: 'English Literature',
    due: 'Tomorrow · 16:00',
    minutes: 45,
    color: 'sage',
  },
  {
    title: 'Explore exponential functions',
    subject: 'Mathematics',
    due: 'Wednesday · 09:00',
    minutes: 60,
    color: 'blue',
  },
  {
    title: 'Energy transfer lab reflection',
    subject: 'Physics',
    due: 'Thursday · 23:59',
    minutes: 90,
    color: 'amber',
  },
]
const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const sessions = [
  {
    day: 0,
    time: '16:00 — 16:45',
    title: 'Build your argument',
    label: 'Recommended',
    icon: Sparkles,
    color: 'sage',
  },
  {
    day: 1,
    time: '16:00 — 17:00',
    title: 'Exponential functions',
    label: 'Locked by you',
    icon: LockKeyhole,
    color: 'blue',
  },
  {
    day: 2,
    time: '15:30 — 16:30',
    title: 'Football practice',
    label: 'Fixed commitment',
    icon: CalendarDays,
    color: 'neutral',
  },
  {
    day: 3,
    time: '16:00 — 17:30',
    title: 'Lab reflection',
    label: 'Recommended',
    icon: Sparkles,
    color: 'amber',
  },
]

export function Composition({
  effect,
  candidate,
  interactive,
  beamSupported,
  playCue,
  cueMessage,
  cueConfirmed,
}: {
  effect: EffectId
  candidate: boolean
  interactive: boolean
  beamSupported: boolean
  playCue: () => void
  cueMessage: string
  cueConfirmed: boolean
}) {
  const [view, setView] = useState<'overview' | 'week'>('overview')
  const [detail, setDetail] = useState<string | null>(null)
  return (
    <div className="composition" data-testid="composition">
      <MagicGlass interactive={interactive} cueTarget="navigation">
        <div className="navigation glass-material">
          {effect === 'beam' && <BorderBeam candidate={candidate} supported={beamSupported} />}
          <div className="brand">
            <span className="brand-mark">
              <GraduationCap size={22} />
            </span>
            <span>
              homebase<span className="brand-caption">A little more headspace.</span>
            </span>
          </div>
          <div className="nav-section-label">YOUR WORKSPACE</div>
          <nav aria-label="Illustrative workspace">
            <button
              className={view === 'overview' ? 'nav-item active' : 'nav-item'}
              aria-current={view === 'overview' ? 'page' : undefined}
              onClick={() => {
                setView('overview')
                setDetail(null)
              }}
            >
              <span aria-hidden="true" className="cue-clip">
                <span
                  className="lighting-cue control-cue"
                  data-cue-target={view === 'overview' ? 'active' : undefined}
                />
              </span>
              <LayoutDashboard size={18} />
              Overview
              <ChevronRight size={14} />
            </button>
            <button
              className={view === 'week' ? 'nav-item active' : 'nav-item'}
              aria-current={view === 'week' ? 'page' : undefined}
              onClick={() => {
                setView('week')
                setDetail(null)
              }}
            >
              <span aria-hidden="true" className="cue-clip">
                <span
                  className="lighting-cue control-cue"
                  data-cue-target={view === 'week' ? 'active' : undefined}
                />
              </span>
              <CalendarDays size={18} />
              Weekly Planner
              <ChevronRight size={14} />
            </button>
          </nav>
          <details className="preview-notes-menu">
            <summary>
              Preview notes
              <ChevronRight size={14} />
            </summary>
            <MagicGlass interactive={interactive} className="menu-glass">
              <div className="menu-plate">
                <strong>Read-only workspace</strong>
                <p>Illustrative academic records. Glass is limited to chrome; content stays solid.</p>
              </div>
            </MagicGlass>
          </details>
          <div className="nav-context">
            <BookOpen size={18} />
            <div>
              3 illustrative classes<span>No personal data connected</span>
            </div>
          </div>
          <div className="nav-bottom">
            <span className="status-dot" />
            Illustrative workspace<span>Explore the visual direction.</span>
          </div>
        </div>
      </MagicGlass>
      <main className="workspace" aria-label="Read-only illustrative planner">
        <div className="workspace-top">
          <span className="eyebrow">MONDAY, OCTOBER 12 · ILLUSTRATION</span>
          <span className="workspace-status">
            <span className="status-dot" />A clear week ahead
          </span>
        </div>
        <header className="workspace-header">
          <div>
            <h2>{view === 'overview' ? 'Make room for what matters.' : 'A week with breathing room.'}</h2>
            <p>
              {view === 'overview'
                ? 'Your next steps, with space to think.'
                : 'October 12–18 · A read-only schedule illustration.'}
            </p>
          </div>
          <MagicGlass interactive={interactive} className="action-glass" cueTarget="action">
            <div className="floating-action glass-material">
              {effect === 'shimmer' ? (
                <ShimmerButton candidate={candidate} onClick={playCue}>
                  <Sparkles size={17} />
                  Play light cue
                </ShimmerButton>
              ) : (
                <button className="primary-action light-sensitive" onClick={playCue}>
                  <span aria-hidden="true" className="cue-clip">
                    <span className="lighting-cue control-cue" data-cue-target="control" />
                  </span>
                  <Sparkles size={17} />
                  Play light cue
                </button>
              )}
            </div>
          </MagicGlass>
        </header>
        <div className="cue-status" role="status" data-confirmed={cueConfirmed}>
          {cueConfirmed && <Check size={13} />}
          {cueMessage}
        </div>
        <div className="environment-band" aria-hidden="true">
          <span className="alignment-ticks" />
          <span className="band-light" />
          <span className="band-marker" />
        </div>
        {view === 'overview' ? (
          <>
            <div className="metrics">
              <article>
                <span>WORK REMAINING</span>
                <strong>3h 15m</strong>
                <small>Across 3 assignments</small>
              </article>
              <article>
                <span>NEXT DEADLINE</span>
                <strong>Tomorrow</strong>
                <small>English · 16:00</small>
              </article>
              <article>
                <span>PLAN CAPACITY</span>
                <strong>5h 30m</strong>
                <small>Room for a real break</small>
              </article>
            </div>
            <div className="overview-grid">
              <section className="content-card priorities">
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">A USEFUL PLACE TO START</span>
                    <h3>Coming into focus</h3>
                  </div>
                  <BookOpen size={20} />
                </div>
                {assignments.map((assignment, index) => (
                  <div className="assignment-row" key={assignment.title}>
                    <span className={`subject-dot ${assignment.color}`} />
                    <div>
                      <span className="record-meta">{assignment.subject}</span>
                      <h4>{assignment.title}</h4>
                      <span className="record-meta">
                        <Clock3 size={13} />
                        {assignment.minutes} min<span className="meta-divider">·</span>
                        {assignment.due}
                      </span>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Inspect ${assignment.title}`}
                      onClick={() =>
                        setDetail(
                          `${assignment.title} · ${assignment.minutes} estimated minutes. Illustrative record ${index + 1}; no editing or real planner state.`,
                        )
                      }
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                ))}
                <button className="text-action" onClick={() => setView('week')}>
                  See where the work fits
                  <ChevronRight size={16} />
                </button>
              </section>
              <section className="content-card today-card">
                <span className="eyebrow">TODAY’S RHYTHM</span>
                <h3>One purposeful session.</h3>
                <div className="session-time">
                  16:00<span>—</span>16:45
                </div>
                <div className="session-summary">
                  <span className="badge">
                    <Sparkles size={13} />
                    Recommended
                  </span>
                  <h4>Build your argument</h4>
                  <p>
                    English Literature
                    <br />
                    45 minutes of focused work
                  </p>
                </div>
                <div className="breathing-room">
                  <Check size={16} />
                  <span>Evening left open</span>
                </div>
                <button
                  className="secondary-action"
                  onClick={() =>
                    setDetail(
                      'Recommended session · Monday 16:00–16:45. Illustrative only; no generation or lock operation is performed.',
                    )
                  }
                >
                  Inspect session
                  <ArrowUpRight size={16} />
                </button>
              </section>
            </div>
            <div className="bottom-note">
              <Plus size={16} />
              <p>A plan should give you perspective, not fill every minute.</p>
              <span>RECOMMENDATIONS, NOT COMMANDS</span>
            </div>
          </>
        ) : (
          <section className="content-card week-card">
            <div className="section-heading">
              <div>
                <span className="eyebrow">YOUR TIME, CLEARLY</span>
                <h3>Weekly Planner</h3>
              </div>
              <div className="legend">
                <span>
                  <Sparkles size={13} />
                  Recommended
                </span>
                <span>
                  <LockKeyhole size={13} />
                  Locked
                </span>
                <span>
                  <CalendarDays size={13} />
                  Commitment
                </span>
              </div>
            </div>
            <div className="week-grid">
              {week.map((day, index) => (
                <div className={`day-column ${index === 0 ? 'today-column' : ''}`} key={day}>
                  <div className="day-heading">
                    <span>{day}</span>
                    <strong>{12 + index}</strong>
                  </div>
                  {sessions
                    .filter((session) => session.day === index)
                    .map((session) => (
                      <button
                        key={session.title}
                        className={`session-block ${session.color}`}
                        onClick={() =>
                          setDetail(
                            `${session.title} · ${session.time} · ${session.label}. Read-only illustration.`,
                          )
                        }
                      >
                        <span className="session-label">
                          <session.icon size={13} />
                          {session.label}
                        </span>
                        <strong>{session.title}</strong>
                        <span>{session.time}</span>
                      </button>
                    ))}
                  {index > 3 && <div className="open-time">Room to breathe</div>}
                </div>
              ))}
            </div>
            <p className="week-footnote">
              Labels and icons distinguish user intent, recommendations and fixed commitments.
            </p>
          </section>
        )}
        {detail && (
          <aside className="detail-panel" aria-label="Illustrative record details">
            <div>
              <span className="eyebrow">READ-ONLY DETAIL</span>
              <p>{detail}</p>
            </div>
            <button className="icon-button" aria-label="Close details" onClick={() => setDetail(null)}>
              <X size={19} />
            </button>
          </aside>
        )}
      </main>
    </div>
  )
}
